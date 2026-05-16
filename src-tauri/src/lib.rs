#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::process::{Command, Stdio, Child, ChildStdin};
use std::sync::{Arc, Mutex};
use std::io::{BufRead, BufReader, Write};
use std::thread;
use std::path::PathBuf;
use tauri::{command, Emitter, State, AppHandle, Manager};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::image::Image;
use serde::{Deserialize, Serialize};



// ─── Settings ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AppSettings {
    model: String,
    language: String,
    auto_copy: bool,
    paste_method: String,
    mute_while_recording: bool,
    overlay_position: String, // "bottom", "top", "none"
    show_tray_icon: bool,
    auto_submit: bool,
    auto_submit_key: String,
    history_limit: u32,
    shortcut_key: String,
    theme: String,
    ui_language: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            model: "small".into(),
            language: "tr".into(),
            auto_copy: true,
            paste_method: "ctrl_v".into(),
            mute_while_recording: false,
            overlay_position: "bottom".into(),
            show_tray_icon: true,
            auto_submit: false,
            auto_submit_key: "enter".into(),
            history_limit: 50,
            shortcut_key: "ctrl+shift+r".into(),
            theme: "light".into(),
            ui_language: "tr".into(),
        }
    }
}

fn settings_path() -> PathBuf {
    let config_dir = dirs_next().unwrap_or_else(|| PathBuf::from("."));
    config_dir.join("pardus-stt-settings.json")
}

fn dirs_next() -> Option<PathBuf> {
    if let Ok(home) = std::env::var("HOME") {
        let p = PathBuf::from(home).join(".config").join("pardus-stt");
        let _ = std::fs::create_dir_all(&p);
        Some(p)
    } else {
        None
    }
}

fn load_settings() -> AppSettings {
    let path = settings_path();
    if path.exists() {
        if let Ok(data) = std::fs::read_to_string(&path) {
            if let Ok(s) = serde_json::from_str(&data) {
                return s;
            }
        }
    }
    AppSettings::default()
}

fn save_settings(settings: &AppSettings) {
    let path = settings_path();
    if let Ok(data) = serde_json::to_string_pretty(settings) {
        let _ = std::fs::write(&path, data);
    }
}

// ─── State ──────────────────────────────────────────────────────────────

struct AppState {
    process: Arc<Mutex<Option<Child>>>,
    stdin: Arc<Mutex<Option<ChildStdin>>>,
    is_recording: Arc<Mutex<bool>>,
    settings: Arc<Mutex<AppSettings>>,
    last_transcript: Arc<Mutex<String>>,
    overlay_process: Arc<Mutex<Option<Child>>>,
    overlay_stdin: Arc<Mutex<Option<ChildStdin>>>,
    model_ready: Arc<Mutex<bool>>,
}

// ─── Commands ───────────────────────────────────────────────────────────

#[command]
fn start_recording(_app: AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    println!("[REC] start_recording called, is_recording={}", *state.is_recording.lock().unwrap());
    let mut stdin_guard = state.stdin.lock().unwrap();
    if let Some(stdin) = stdin_guard.as_mut() {
        println!("[REC] Writing 'start' to Python stdin...");
        if let Err(e) = writeln!(stdin, "start") {
            println!("[REC] ERROR: Failed to write: {}", e);
            return Err(format!("Failed to write to stdin: {}", e));
        }
        let _ = stdin.flush();
        println!("[REC] 'start' sent and flushed OK");
        *state.is_recording.lock().unwrap() = true;
        // Mute speakers if setting enabled
        if state.settings.lock().unwrap().mute_while_recording {
            let _ = Command::new("pactl").args(["set-sink-mute", "@DEFAULT_SINK@", "1"]).output();
        }
        // Show overlay (separate GTK process, non-focus-stealing)
        let overlay_pos = state.settings.lock().unwrap().overlay_position.clone();
        if overlay_pos != "none" {
            spawn_overlay(&state, &overlay_pos);
        }
        return Ok("Recording started".to_string());
    }
    println!("[REC] ERROR: Python stdin is None!");
    Err("Python process is not running".to_string())
}

#[command]
fn stop_recording(_app: AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    let mut stdin_guard = state.stdin.lock().unwrap();
    if let Some(stdin) = stdin_guard.as_mut() {
        if let Err(e) = writeln!(stdin, "stop") {
            return Err(format!("Failed to write to stdin: {}", e));
        }
        let _ = stdin.flush();
        *state.is_recording.lock().unwrap() = false;
        // Unmute speakers
        let _ = Command::new("pactl").args(["set-sink-mute", "@DEFAULT_SINK@", "0"]).output();
        // Tell overlay to show "analyzing" state
        overlay_send(&state, r#"{"type":"status","value":"analyzing"}"#);
        return Ok("Recording stopped, analyzing...".to_string());
    }
    Err("Python process is not running".to_string())
}

#[command]
fn cancel_recording(_app: AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    let mut stdin_guard = state.stdin.lock().unwrap();
    if let Some(stdin) = stdin_guard.as_mut() {
        if let Err(e) = writeln!(stdin, "cancel") {
            return Err(format!("Failed to write to stdin: {}", e));
        }
        let _ = stdin.flush();
        *state.is_recording.lock().unwrap() = false;
        // Unmute speakers
        let _ = Command::new("pactl").args(["set-sink-mute", "@DEFAULT_SINK@", "0"]).output();
        kill_overlay(&state);
        return Ok("Recording cancelled".to_string());
    }
    Err("Python process is not running".to_string())
}

#[command]
fn set_model(state: State<'_, AppState>, model_name: String) -> Result<String, String> {
    let mut stdin_guard = state.stdin.lock().unwrap();
    if let Some(stdin) = stdin_guard.as_mut() {
        if let Err(e) = writeln!(stdin, "set_model:{}", model_name) {
            return Err(format!("Failed to write to stdin: {}", e));
        }
        let _ = stdin.flush();
        let mut settings = state.settings.lock().unwrap();
        settings.model = model_name;
        save_settings(&settings);
        return Ok("Model change requested".to_string());
    }
    Err("Python process is not running".to_string())
}

#[command]
fn cancel_download(state: State<'_, AppState>) -> Result<String, String> {
    let mut stdin_guard = state.stdin.lock().unwrap();
    if let Some(stdin) = stdin_guard.as_mut() {
        if let Err(e) = writeln!(stdin, "cancel_download") {
            return Err(format!("Failed to write to stdin: {}", e));
        }
        let _ = stdin.flush();
        return Ok("Download cancel requested".to_string());
    }
    Err("Python process is not running".to_string())
}

#[command]
fn get_engine_status(state: State<'_, AppState>) -> String {
    let ready = *state.model_ready.lock().unwrap();
    if ready { "ready".to_string() } else { "loading".to_string() }
}

#[command]
fn paste_text(text: String, method: String) -> Result<(), String> {
    println!("[PASTE] method={}, text_len={}", method, text.len());
    
    // Run paste in background thread to avoid blocking UI
    thread::spawn(move || {
        let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok();
        
        // Step 1: Copy text to clipboard
        if is_wayland {
            if let Err(e) = Command::new("wl-copy").arg(&text).output() {
                println!("[PASTE] wl-copy failed: {}", e);
                copy_via_xclip(&text);
            } else {
                println!("[PASTE] Copied via wl-copy");
            }
        } else {
            copy_via_xclip(&text);
        }

        // Step 2: Wait for clipboard
        thread::sleep(std::time::Duration::from_millis(200));
        
        // Step 3: Simulate paste
        match method.as_str() {
            "direct" => {
                if is_wayland {
                    match Command::new("wtype").arg("--").arg(&text).output() {
                        Ok(o) => println!("[PASTE] wtype: {}", String::from_utf8_lossy(&o.stderr)),
                        Err(e) => println!("[PASTE] wtype failed: {}", e),
                    }
                } else {
                    let _ = Command::new("xdotool").args(["type", "--clearmodifiers", "--", &text]).output();
                }
            },
            "ctrl_shift_v" => simulate_paste_keys(is_wayland, true),
            "ctrl_v" | _ => simulate_paste_keys(is_wayland, false),
        }
        println!("[PASTE] Done");
    });
    
    Ok(())
}

fn copy_via_xclip(text: &str) {
    match Command::new("xclip").args(["-selection", "clipboard"]).stdin(Stdio::piped()).spawn() {
        Ok(mut child) => {
            if let Some(ref mut stdin) = child.stdin {
                let _ = stdin.write_all(text.as_bytes());
            }
            let _ = child.wait();
            println!("[PASTE] Copied via xclip");
        },
        Err(e) => println!("[PASTE] xclip failed: {}", e),
    }
}

fn simulate_paste_keys(is_wayland: bool, with_shift: bool) {
    if is_wayland {
        // Use paste_helper.py which writes to /dev/uinput (works on GNOME Wayland)
        let exe_dir = std::env::current_exe()
            .unwrap_or_default()
            .parent()
            .unwrap_or(std::path::Path::new("."))
            .to_path_buf();
        
        let candidates = vec![
            exe_dir.join("../../paste_helper.py"),
            exe_dir.join("../paste_helper.py"),
            exe_dir.join("paste_helper.py"),
            std::path::PathBuf::from("paste_helper.py"),
            std::path::PathBuf::from("src-tauri/paste_helper.py"),
        ];
        
        let script_path = candidates.iter().find(|p| p.exists())
            .cloned()
            .unwrap_or_else(|| {
                // Fallback: write helper script to /tmp
                let tmp = std::path::PathBuf::from("/tmp/pardus-stt-paste.py");
                let script = include_str!("../paste_helper.py");
                let _ = std::fs::write(&tmp, script);
                println!("[PASTE] Wrote fallback paste helper to {:?}", tmp);
                tmp
            });
        
        println!("[PASTE] Using helper: {:?}", script_path);
        
        let mut args = vec![script_path.to_string_lossy().to_string()];
        if with_shift {
            args.push("--shift".to_string());
        }
        
        match Command::new("python3").args(&args).output() {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                if stdout.contains("OK") {
                    println!("[PASTE] uinput paste OK");
                } else {
                    println!("[PASTE] uinput failed: stdout={} stderr={}", stdout.trim(), stderr.trim());
                }
            },
            Err(e) => {
                println!("[PASTE] python3 error: {}", e);
            },
        }
    } else {
        let key = if with_shift { "ctrl+shift+v" } else { "ctrl+v" };
        match Command::new("xdotool").args(["key", "--clearmodifiers", key]).output() {
            Ok(_) => println!("[PASTE] xdotool paste OK"),
            Err(e) => println!("[PASTE] xdotool paste failed: {}", e),
        }
    }
}

#[command]
fn get_settings(state: State<'_, AppState>) -> Result<String, String> {
    let settings = state.settings.lock().unwrap();
    serde_json::to_string(&*settings).map_err(|e| e.to_string())
}

#[command]
fn update_settings(state: State<'_, AppState>, settings_json: String) -> Result<String, String> {
    let new_settings: AppSettings = serde_json::from_str(&settings_json).map_err(|e| e.to_string())?;
    let mut current = state.settings.lock().unwrap();
    let old_shortcut = current.shortcut_key.clone();
    *current = new_settings;
    save_settings(&current);
    // Re-register GNOME shortcut if it changed
    if current.shortcut_key != old_shortcut {
        let binding = shortcut_to_gnome_binding(&current.shortcut_key);
        println!("[SHORTCUT] Shortcut changed: {} -> {}", old_shortcut, current.shortcut_key);
        drop(current);
        register_gnome_shortcut(&binding);
    }
    Ok("Settings updated".to_string())
}

#[command]
fn get_last_transcript(state: State<'_, AppState>) -> Result<String, String> {
    let transcript = state.last_transcript.lock().unwrap();
    Ok(transcript.clone())
}

// ─── Overlay (separate GTK3 process, no focus steal) ────────────────────

fn find_overlay_script() -> PathBuf {
    // Try next to the binary first
    let exe_dir = std::env::current_exe().ok().and_then(|p| p.parent().map(|p| p.to_path_buf()));
    if let Some(dir) = &exe_dir {
        let p = dir.join("overlay.py");
        if p.exists() { return p; }
        // dev mode: binary is in target/debug
        let p = dir.join("../../overlay.py");
        if p.exists() { return p; }
    }
    // Fallback: write embedded script to /tmp
    let tmp = PathBuf::from("/tmp/pardus-stt-overlay.py");
    let script = include_str!("../overlay.py");
    let _ = std::fs::write(&tmp, script);
    tmp
}

fn spawn_overlay(state: &AppState, position: &str) {
    // Kill existing overlay if any
    kill_overlay(state);
    
    let script = find_overlay_script();
    let theme = state.settings.lock().unwrap().theme.clone();
    println!("[OVERLAY] Spawning: {:?} {} theme={}", script, position, theme);
    
    match Command::new("python3")
        .arg(&script)
        .arg(position)
        .arg(&theme)
        .env("GDK_BACKEND", "x11")  // Force X11: Wayland ignores window.move()
        .stdin(Stdio::piped())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
    {
        Ok(mut child) => {
            let stdin = child.stdin.take();
            *state.overlay_process.lock().unwrap() = Some(child);
            *state.overlay_stdin.lock().unwrap() = stdin;
            println!("[OVERLAY] Process started");
        }
        Err(e) => println!("[OVERLAY] Failed to start: {}", e),
    }
}

fn overlay_send(state: &AppState, msg: &str) {
    if let Some(ref mut stdin) = *state.overlay_stdin.lock().unwrap() {
        let _ = writeln!(stdin, "{}", msg);
        let _ = stdin.flush();
    }
}

fn kill_overlay(state: &AppState) {
    if let Some(mut child) = state.overlay_process.lock().unwrap().take() {
        let _ = child.kill();
        let _ = child.wait();
        println!("[OVERLAY] Process killed");
    }
    *state.overlay_stdin.lock().unwrap() = None;
}


// ─── Main ───────────────────────────────────────────────────────────────

/// Convert our shortcut format (ctrl+shift+r) to GNOME binding format (<Control><Shift>r)
fn shortcut_to_gnome_binding(shortcut: &str) -> String {
    let mut result = String::new();
    let parts: Vec<&str> = shortcut.split('+').collect();
    for part in &parts {
        match part.to_lowercase().as_str() {
            "ctrl" => result.push_str("<Control>"),
            "alt" => result.push_str("<Alt>"),
            "shift" => result.push_str("<Shift>"),
            "super" => result.push_str("<Super>"),
            key => result.push_str(key),
        }
    }
    result
}

/// Auto-register custom keyboard shortcut via gsettings
fn register_gnome_shortcut(binding: &str) {
    let record_cmd = "touch /tmp/pardus-stt-record";
    let shortcut_path = "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/pardus-stt/";
    let schema = "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding";

    // Get existing custom keybindings
    let existing = Command::new("gsettings")
        .args(["get", "org.gnome.settings-daemon.plugins.media-keys", "custom-keybindings"])
        .output();
    
    let mut bindings: Vec<String> = vec![];
    if let Ok(output) = existing {
        let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !raw.contains(shortcut_path) {
            // Add our path to existing ones
            let clean = raw.replace("@as ", "").replace("[", "").replace("]", "").replace("'", "");
            for s in clean.split(',') {
                let trimmed = s.trim().to_string();
                if !trimmed.is_empty() {
                    bindings.push(format!("'{}'", trimmed));
                }
            }
            bindings.push(format!("'{}'", shortcut_path));
        }
    }

    if !bindings.is_empty() {
        let bindings_str = format!("[{}]", bindings.join(", "));
        let _ = Command::new("gsettings")
            .args(["set", "org.gnome.settings-daemon.plugins.media-keys", "custom-keybindings", &bindings_str])
            .output();
    }

    // Set name
    let _ = Command::new("gsettings")
        .args(["set", &format!("{}:{}", schema, shortcut_path), "name", "Pardus Dikte Kayıt"])
        .output();
    // Set command
    let _ = Command::new("gsettings")
        .args(["set", &format!("{}:{}", schema, shortcut_path), "command", &record_cmd])
        .output();
    // Set binding (dynamic, from user settings)
    let _ = Command::new("gsettings")
        .args(["set", &format!("{}:{}", schema, shortcut_path), "binding", binding])
        .output();

    println!("[SHORTCUT] GNOME shortcut registered: {} -> {}", binding, record_cmd);
}

/// Ensure /dev/uinput is accessible for auto-paste on Wayland.
/// Uses pkexec for graphical password prompt if needed.
fn setup_uinput_access() {
    use std::fs;
    
    // Check if we can already access /dev/uinput
    if fs::metadata("/dev/uinput").is_ok() {
        // Try to open it
        if std::fs::OpenOptions::new().write(true).open("/dev/uinput").is_ok() {
            println!("[UINPUT] /dev/uinput accessible ✓");
            return;
        }
    }
    
    println!("[UINPUT] /dev/uinput not accessible, setting up permissions...");
    
    // Create a setup script
    let setup_script = "/tmp/pardus-stt-uinput-setup.sh";
    let script_content = r#"#!/bin/bash
# Pardus Dikte - uinput setup for auto-paste on Wayland
chmod 0666 /dev/uinput
echo 'KERNEL=="uinput", MODE="0666"' > /etc/udev/rules.d/99-pardus-stt-uinput.rules
udevadm control --reload-rules 2>/dev/null
echo "OK"
"#;
    
    if let Err(e) = fs::write(setup_script, script_content) {
        println!("[UINPUT] Failed to write setup script: {}", e);
        return;
    }
    let _ = Command::new("chmod").args(["+x", setup_script]).output();
    
    // Run with pkexec (shows graphical password dialog)
    println!("[UINPUT] Requesting admin permission for auto-paste setup...");
    match Command::new("pkexec").args(["bash", setup_script]).output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if stdout.contains("OK") {
                println!("[UINPUT] Setup complete ✓");
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                println!("[UINPUT] Setup may have failed: {}", stderr.trim());
            }
        },
        Err(e) => {
            println!("[UINPUT] pkexec failed: {}. Auto-paste won't work.", e);
            println!("[UINPUT] Run manually: sudo chmod 0666 /dev/uinput");
        },
    }
    
    let _ = fs::remove_file(setup_script);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Fix: Wayland CSD window controls (close/min/max) not responding initially
    // This is a known WebKitGTK bug on Wayland
    if std::env::var("WAYLAND_DISPLAY").is_ok() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
    
    let initial_settings = load_settings();

    // On Wayland+GNOME, auto-register a system keyboard shortcut via gsettings
    // This is the only reliable way to get global shortcuts on Wayland
    if std::env::var("WAYLAND_DISPLAY").is_ok() {
        println!("[INFO] Wayland detected, registering system shortcut via gsettings...");
        let binding = shortcut_to_gnome_binding(&initial_settings.shortcut_key);
        register_gnome_shortcut(&binding);
        setup_uinput_access();
    }

    let app_state = AppState {
        process: Arc::new(Mutex::new(None)),
        stdin: Arc::new(Mutex::new(None)),
        is_recording: Arc::new(Mutex::new(false)),
        settings: Arc::new(Mutex::new(initial_settings)),
        last_transcript: Arc::new(Mutex::new(String::new())),
        overlay_process: Arc::new(Mutex::new(None)),
        overlay_stdin: Arc::new(Mutex::new(None)),
        model_ready: Arc::new(Mutex::new(false)),
    };

    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            println!("[SINGLE-INSTANCE] Received args: {:?}", args);
            if args.iter().any(|a| a == "--record") {
                println!("[SINGLE-INSTANCE] --record flag detected, toggling recording");
                let state_res = app.try_state::<AppState>();
                if let Some(state) = state_res {
                    let is_rec = *state.is_recording.lock().unwrap();
                    if is_rec {
                        let _ = stop_recording(app.clone(), state);
                        let _ = app.emit("shortcut_stop", ());
                    } else {
                        let _ = start_recording(app.clone(), state);
                        let _ = app.emit("shortcut_start", ());
                    }
                }
            } else {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }))
        .setup(move |app| {
            // ── System Tray ──
            let icon = Image::from_bytes(include_bytes!("../icons/128x128.png")).expect("failed to load tray icon");

            let quit_i = MenuItem::with_id(app, "quit", "✕ Çıkış", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[
                &quit_i,
            ])?;

            let _tray = TrayIconBuilder::with_id("main_tray")
                .icon(icon)
                .menu(&menu)
                .tooltip("Pardus Dikte v1.0.0")
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { .. } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .on_menu_event(move |app_handle, event| {
                    if event.id().as_ref() == "quit" {
                        if let Some(state) = app_handle.try_state::<AppState>() {
                            if let Some(mut child) = state.process.lock().unwrap().take() {
                                let _ = child.kill();
                            }
                        }
                        app_handle.exit(0);
                    }
                })
                .build(app)?;

            // ── Window setup: close to tray ──
            if let Some(window) = app.get_webview_window("main") {
                let win_icon = Image::from_bytes(include_bytes!("../icons/128x128.png")).expect("icon");
                let _ = window.set_icon(win_icon);
                
                // Wayland CSD fix: maximize then unmaximize to force decoration button initialization
                // This mimics the double-click workaround
                let w_fix = window.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(600));
                    let _ = w_fix.maximize();
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    let _ = w_fix.unmaximize();
                });
                
                let w = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = w.hide();
                    }
                });
            }



            // ── Python STT Engine ──
            let state: State<AppState> = app.state();
            
            // Path resolution for both dev mode and installed .deb mode
            // Dev mode: CWD = src-tauri/, scripts in CWD, venv in CWD/venv
            // Installed: binary in /usr/bin/, scripts in /usr/lib/pardus-dikte/, venv needs creation
            let cwd = std::env::current_dir().unwrap_or_default();
            let exe_dir = std::env::current_exe().unwrap_or_default()
                .parent().unwrap_or(std::path::Path::new(".")).to_path_buf();
            
            // Tauri resource dir (for installed .deb: /usr/lib/pardus-dikte/)
            let resource_dir = app.path().resource_dir().unwrap_or(exe_dir.clone());
            
            // User data dir for venv storage
            let data_dir = dirs_next()
                .unwrap_or_else(|| std::path::PathBuf::from("."))
                .join("pardus-dikte");
            
            println!("[STT] CWD: {:?}", cwd);
            println!("[STT] exe_dir: {:?}", exe_dir);
            println!("[STT] resource_dir: {:?}", resource_dir);
            println!("[STT] data_dir: {:?}", data_dir);
            
            // ── Find venv python ──
            let venv_search = [
                cwd.join("venv/bin/python3"),                    // dev: src-tauri/venv/
                cwd.join("src-tauri/venv/bin/python3"),           // dev: project root
                resource_dir.join("venv/bin/python3"),            // installed: resource dir
                data_dir.join("venv/bin/python3"),                // user data dir
            ];
            
            let mut venv_python = venv_search.iter()
                .find(|p| p.exists())
                .cloned();
            
            // If no venv found, auto-create one
            if venv_python.is_none() {
                let target_venv = data_dir.join("venv");
                println!("[STT] No venv found, creating at: {:?}", target_venv);
                let _ = std::fs::create_dir_all(&data_dir);
                
                let venv_ok = Command::new("python3")
                    .args(["-m", "venv", &target_venv.to_string_lossy()])
                    .output()
                    .map(|o| o.status.success())
                    .unwrap_or(false);
                
                if venv_ok {
                    venv_python = Some(target_venv.join("bin/python3"));
                } else {
                    println!("[STT] Failed to create venv, falling back to system python3");
                }
            }
            
            let python_path = venv_python.unwrap_or_else(|| std::path::PathBuf::from("python3"));
            
            // ── Ensure dependencies are installed ──
            let deps_ok = Command::new(&python_path)
                .args(["-c", "import faster_whisper, sounddevice, numpy"])
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false);
            
            if !deps_ok {
                println!("[STT] Dependencies missing, installing...");
                // Find pip in same venv
                let pip_path = python_path.parent()
                    .map(|p| p.join("pip"))
                    .unwrap_or_else(|| std::path::PathBuf::from("pip3"));
                
                // Find requirements.txt
                let req_search = [
                    resource_dir.join("requirements.txt"),
                    cwd.join("requirements.txt"),
                    cwd.join("src-tauri/requirements.txt"),
                ];
                
                if let Some(req) = req_search.iter().find(|p| p.exists()) {
                    println!("[STT] Using requirements: {:?}", req);
                    let pip_out = Command::new(&pip_path)
                        .args(["install", "-r", &req.to_string_lossy()])
                        .output();
                    match pip_out {
                        Ok(o) if o.status.success() => println!("[STT] Dependencies installed OK"),
                        Ok(o) => println!("[STT] pip failed: {}", String::from_utf8_lossy(&o.stderr)),
                        Err(e) => println!("[STT] pip error: {}", e),
                    }
                } else {
                    println!("[STT] No requirements.txt found, installing manually...");
                    let _ = Command::new(&pip_path)
                        .args(["install", "faster-whisper", "sounddevice", "numpy"])
                        .output();
                }
            } else {
                println!("[STT] Dependencies OK");
            }
            
            // ── Find stt_engine.py ──
            let script_search = [
                cwd.join("stt_engine.py"),                       // dev: src-tauri/
                cwd.join("src-tauri/stt_engine.py"),             // dev: project root
                resource_dir.join("stt_engine.py"),              // installed: /usr/lib/pardus-dikte/
            ];
            let script_path = script_search.iter()
                .find(|p| p.exists())
                .cloned()
                .unwrap_or_else(|| { println!("[STT] WARNING: stt_engine.py not found!"); std::path::PathBuf::from("stt_engine.py") });
            
            println!("[STT] Python: {:?}", python_path);
            println!("[STT] Script: {:?}", script_path);
            
            // Handle command line args for first instance
            if std::env::args().any(|a| a == "--record") {
                let app_handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(1000));
                    let state_clone = app_handle.state::<AppState>();
                    let is_rec = *state_clone.is_recording.lock().unwrap();
                    if is_rec {
                        let _ = stop_recording(app_handle.clone(), state_clone);
                        let _ = app_handle.emit("shortcut_stop", ());
                    } else {
                        let _ = start_recording(app_handle.clone(), state_clone);
                        let _ = app_handle.emit("shortcut_start", ());
                    }
                });
            }

            let mut child = Command::new(&python_path)
                .arg(&script_path)
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .expect("Failed to spawn python STT engine");

            let stdout = child.stdout.take().unwrap();
            let stderr = child.stderr.take().unwrap();
            let stdin = child.stdin.take().unwrap();

            *state.process.lock().unwrap() = Some(child);
            *state.stdin.lock().unwrap() = Some(stdin);

            let app_clone = app.handle().clone();
            thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines() {
                    if let Ok(line_str) = line {
                        // Don't spam logs with audio level events
                        if !line_str.contains("\"audio_level\"") {
                            println!("STT STDOUT: {}", line_str);
                        }
                        let _ = app_clone.emit("stt_result", line_str.clone());
                        
                        // Track model ready state
                        if line_str.contains("\"ready\"") {
                            if let Some(state) = app_clone.try_state::<AppState>() {
                                *state.model_ready.lock().unwrap() = true;
                            }
                        } else if line_str.contains("\"loading_model\"") || line_str.contains("\"downloading_model\"") {
                            if let Some(state) = app_clone.try_state::<AppState>() {
                                *state.model_ready.lock().unwrap() = false;
                            }
                        }
                        
                        // Forward audio levels to overlay process
                        if line_str.contains("\"audio_level\"") {
                            if let Some(state) = app_clone.try_state::<AppState>() {
                                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&line_str) {
                                    if let Some(level) = parsed.get("level").and_then(|v| v.as_f64()) {
                                        let msg = format!(r#"{{"type":"level","value":{}}}"#, level);
                                        overlay_send(&state, &msg);
                                    }
                                }
                            }
                        }
                        
                        // Handle final transcript
                        if line_str.contains("\"type\": \"final\"") {
                            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&line_str) {
                                if let Some(text) = parsed.get("text").and_then(|v| v.as_str()) {
                                    let text_str = text.to_string();
                                    if let Some(state) = app_clone.try_state::<AppState>() {
                                        *state.last_transcript.lock().unwrap() = text_str.clone();
                                        
                                        let paste_method = state.settings.lock().unwrap().paste_method.clone();
                                        
                                        // Kill overlay immediately
                                        kill_overlay(&state);
                                        
                                        // Copy + paste in background
                                        if !text_str.trim().is_empty() {
                                            let t = text_str.clone();
                                            thread::spawn(move || {
                                                // Use xclip (works via XWayland, no focus needed)
                                                copy_via_xclip(&t);
                                                println!("[AUTO-PASTE] Copied to clipboard via xclip");
                                                
                                                // Paste after delay for focus to settle
                                                if paste_method != "none" {
                                                    thread::sleep(std::time::Duration::from_millis(500));
                                                    let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok();
                                                    simulate_paste_keys(is_wayland, paste_method == "ctrl_shift_v");
                                                    println!("[AUTO-PASTE] Pasted via {}", paste_method);
                                                }
                                            });
                                        }
                                    }
                                }
                            }
                            thread::sleep(std::time::Duration::from_millis(100));
                        }
                    }
                }
            });

            thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                    if let Ok(line_str) = line {
                        println!("STT STDERR: {}", line_str);
                    }
                }
            });

            // ── Global Shortcut (Ctrl+Shift+R) ──
            // IBus note: Ctrl+Space conflicts with IBus input method switching on Linux
            let app_handle_gs = app.handle().clone();
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            match app.global_shortcut().on_shortcut("ctrl+shift+r", move |_app, _shortcut, event| {
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    if let Some(state) = app_handle_gs.try_state::<AppState>() {
                        let is_rec = *state.is_recording.lock().unwrap();
                        if is_rec {
                            let _ = stop_recording(app_handle_gs.clone(), state);
                            let _ = app_handle_gs.emit("shortcut_stop", ());
                        } else {
                            let _ = start_recording(app_handle_gs.clone(), state);
                            let _ = app_handle_gs.emit("shortcut_start", ());
                        }
                    }
                }
            }) {
                Ok(_) => println!("[SHORTCUT] Ctrl+Shift+R registered via global-shortcut plugin OK"),
                Err(e) => {
                    println!("[SHORTCUT] global-shortcut plugin FAILED: {:?}", e);
                    println!("[SHORTCUT] Falling back to rdev listener...");
                    // Fallback: use rdev
                    let app_rdev = app.handle().clone();
                    thread::spawn(move || {
                        use rdev::{listen, Event, EventType, Key as RdevKey};
                        let ctrl_held = Arc::new(Mutex::new(false));
                        let ctrl_c = ctrl_held.clone();
                        let active = Arc::new(Mutex::new(false));
                        let active_c = active.clone();

                        let callback = move |event: Event| {
                            match event.event_type {
                                EventType::KeyPress(RdevKey::ControlLeft) | EventType::KeyPress(RdevKey::ControlRight) => {
                                    *ctrl_c.lock().unwrap() = true;
                                },
                                EventType::KeyRelease(RdevKey::ControlLeft) | EventType::KeyRelease(RdevKey::ControlRight) => {
                                    *ctrl_c.lock().unwrap() = false;
                                },
                                EventType::KeyPress(RdevKey::Space) => {
                                    if !*ctrl_c.lock().unwrap() { return; }
                                    let mut a = active_c.lock().unwrap();
                                    if *a { return; }
                                    *a = true;
                                    drop(a);
                                    println!("[SHORTCUT] Ctrl+Shift+R pressed via rdev");
                                    if let Some(state) = app_rdev.try_state::<AppState>() {
                                        let is_rec = *state.is_recording.lock().unwrap();
                                        if is_rec {
                                            let _ = stop_recording(app_rdev.clone(), state);
                                            let _ = app_rdev.emit("shortcut_stop", ());
                                        } else {
                                            let _ = start_recording(app_rdev.clone(), state);
                                            let _ = app_rdev.emit("shortcut_start", ());
                                        }
                                    }
                                },
                                EventType::KeyRelease(RdevKey::Space) => {
                                    *active_c.lock().unwrap() = false;
                                },
                                _ => {}
                            }
                        };
                        if let Err(e) = listen(callback) {
                            println!("[SHORTCUT] rdev listen error: {:?}", e);
                        }
                    });
                }
            }

            // ── File-based shortcut signal (most reliable on Wayland) ──
            // GNOME shortcut runs: touch /tmp/pardus-stt-record
            // We poll for this file and toggle recording when found
            // Clean up stale signal from previous session
            let _ = std::fs::remove_file("/tmp/pardus-stt-record");
            
            let app_file_watcher = app.handle().clone();
            thread::spawn(move || {
                let signal_path = std::path::Path::new("/tmp/pardus-stt-record");
                let mut last_signal = std::time::Instant::now() - std::time::Duration::from_secs(5);
                loop {
                    thread::sleep(std::time::Duration::from_millis(200));
                    if signal_path.exists() {
                        // Remove signal file immediately
                        let _ = std::fs::remove_file(signal_path);

                        // Debounce: ignore signals within 600ms of each other (key repeat)
                        let now = std::time::Instant::now();
                        if now.duration_since(last_signal).as_millis() < 600 {
                            println!("[SHORTCUT] File signal debounced (too fast)");
                            continue;
                        }
                        last_signal = now;

                        println!("[SHORTCUT] File signal detected!");
                        if let Some(state) = app_file_watcher.try_state::<AppState>() {
                            // Don't start recording if model isn't ready yet
                            let model_ready = *state.model_ready.lock().unwrap();
                            if !model_ready {
                                println!("[SHORTCUT] Model not ready, ignoring signal");
                                continue;
                            }
                            
                            let is_rec = *state.is_recording.lock().unwrap();
                            if is_rec {
                                let _ = stop_recording(app_file_watcher.clone(), state);
                                let _ = app_file_watcher.emit("shortcut_stop", ());
                                println!("[SHORTCUT] Recording stopped");
                            } else {
                                let _ = start_recording(app_file_watcher.clone(), state);
                                let _ = app_file_watcher.emit("shortcut_start", ());
                                println!("[SHORTCUT] Recording started");
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            start_recording,
            stop_recording,
            cancel_recording,
            cancel_download,
            get_engine_status,
            set_model,
            paste_text,
            get_settings,
            update_settings,
            get_last_transcript
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
