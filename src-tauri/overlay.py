#!/usr/bin/env python3
"""Neon-blue dark overlay matching the Pardus Dikte app design."""
import gi, sys, signal, json, threading, math, time
gi.require_version('Gtk', '3.0')
gi.require_version('Gdk', '3.0')
from gi.repository import Gtk, Gdk, GLib

# ── Dark theme colors ──
BG_DARK = (0.106, 0.137, 0.200)          # #1b2333
BG_LIGHT = (0.96, 0.97, 0.98)            # slate-50
CYAN = (0.08, 0.71, 0.83)                # cyan-500
CYAN_LIGHT = (0.40, 0.85, 0.95)          # cyan-300
CYAN_DARK_TEXT = (0.05, 0.52, 0.62)      # cyan-700
EMERALD = (0.20, 0.78, 0.48)             # emerald-500
EMERALD_LIGHT = (0.42, 0.87, 0.60)       # emerald-300
SLATE = (0.38, 0.42, 0.50)              # slate-600
SLATE_DARK = (0.15, 0.18, 0.25)          # dark text
WHITE = (1, 1, 1)
BLACK = (0.1, 0.12, 0.15)

class RecordingOverlay(Gtk.Window):
    def __init__(self, position="bottom", theme="dark"):
        super().__init__(type=Gtk.WindowType.TOPLEVEL)
        self.theme = theme
        self.bg_color = BG_LIGHT if theme == 'light' else BG_DARK
        self.text_color = BLACK if theme == 'light' else WHITE
        self.border_alpha = 0.15 if theme == 'light' else 0.08
        
        self.set_accept_focus(False)
        self.set_focus_on_map(False)
        self.set_type_hint(Gdk.WindowTypeHint.NOTIFICATION)
        self.set_keep_above(True)
        self.set_skip_taskbar_hint(True)
        self.set_skip_pager_hint(True)
        self.set_decorated(False)
        self.set_resizable(False)
        self.set_default_size(280, 42)
        self.set_size_request(280, 42)
        self.set_app_paintable(True)
        
        screen = self.get_screen()
        visual = screen.get_rgba_visual()
        if visual:
            self.set_visual(visual)
        
        self.audio_level = 0.0
        self.status = "recording"
        self.bars = [0.0] * 12
        self.position = position
        self.start_time = time.time()
        
        self.drawing = Gtk.DrawingArea()
        self.drawing.connect("draw", self.on_draw)
        self.add(self.drawing)
        
        display = Gdk.Display.get_default()
        monitor = display.get_primary_monitor() or display.get_monitor(0)
        geom = monitor.get_geometry()
        scale = monitor.get_scale_factor()
        # On Wayland/HiDPI, geometry may be in scaled coords
        screen_w = geom.width
        screen_h = geom.height
        x = geom.x + (screen_w - 280) // 2
        # Place near bottom: 90% of screen height
        y = geom.y + int(screen_h * 0.92) if position != "top" else geom.y + 28
        self.move(x, y)
        self.resize(280, 42)
        print(f"[OVERLAY-PY] pos=({x},{y}) screen={screen_w}x{screen_h} scale={scale}", flush=True)
        
        GLib.timeout_add(40, self.animate)
        self.show_all()
    
    def animate(self):
        t = time.time()
        for i in range(len(self.bars)):
            target = self.audio_level
            wave = math.sin(t * 5.5 + i * 0.65) * 0.12
            spread = math.sin(t * 3.2 + i * 1.2) * 0.06
            target = max(0, min(1, target + wave + spread))
            diff = target - self.bars[i]
            speed = 0.45 if diff > 0 else 0.12
            self.bars[i] += diff * speed
        self.drawing.queue_draw()
        return True
    
    def on_draw(self, widget, cr):
        w = widget.get_allocated_width()
        h = widget.get_allocated_height()
        
        # ── Rounded rect background (#1b2333) ──
        r = 14
        self._rounded_rect(cr, 0, 0, w, h, r)
        cr.set_source_rgba(*self.bg_color, 0.95)
        cr.fill_preserve()
        # Border
        if self.theme == 'light':
            cr.set_source_rgba(0, 0, 0, 0.1)
        else:
            cr.set_source_rgba(1, 1, 1, 0.08)
        cr.set_line_width(1)
        cr.stroke()
        
        # ── Left: Mic icon circle ──
        cx, cy = 22, h / 2
        icon_r = 13
        
        if self.status == "recording":
            # Cyan glow
            pulse = (math.sin(time.time() * 3.5) + 1) / 2
            cr.set_source_rgba(*CYAN, 0.12 + pulse * 0.08)
            cr.arc(cx, cy, icon_r + 4, 0, 2 * math.pi)
            cr.fill()
            # Cyan circle
            cr.set_source_rgba(*CYAN, 1)
            cr.arc(cx, cy, icon_r, 0, 2 * math.pi)
            cr.fill()
        elif self.status == "analyzing":
            pulse = (math.sin(time.time() * 4) + 1) / 2
            cr.set_source_rgba(*EMERALD, 0.6 + pulse * 0.4)
            cr.arc(cx, cy, icon_r, 0, 2 * math.pi)
            cr.fill()
        else:
            cr.set_source_rgba(*SLATE, 1)
            cr.arc(cx, cy, icon_r, 0, 2 * math.pi)
            cr.fill()
        
        # Mic icon (white)
        self._draw_mic(cr, cx, cy)
        
        # ── Text ──
        text_x = cx + icon_r + 10
        # Title
        cr.select_font_face("Sans", 0, 1)
        cr.set_font_size(11)
        cr.set_source_rgba(*self.text_color, 0.95)
        cr.move_to(text_x, cy - 3)
        cr.show_text("Pardus Dikte")
        
        # Status subtitle
        cr.select_font_face("Sans", 0, 1)
        cr.set_font_size(7.5)
        if self.status == "recording":
            cr.set_source_rgba(*CYAN_LIGHT if self.theme == 'dark' else CYAN_DARK_TEXT, 0.9)
            label = "DİNLENİYOR..."
        elif self.status == "analyzing":
            cr.set_source_rgba(*EMERALD_LIGHT if self.theme == 'dark' else EMERALD, 0.9)
            label = "ANALİZ..."
        else:
            cr.set_source_rgba(*SLATE, 0.9)
            label = "HAZIR"
        cr.move_to(text_x, cy + 10)
        cr.show_text(label)
        
        # ── Right: Audio bars (only when recording) ──
        if self.status == "recording":
            bar_count = 12
            bar_w = 2.5
            bar_gap = 1.5
            total_bars_w = bar_count * bar_w + (bar_count - 1) * bar_gap
            bar_start = w - total_bars_w - 16
            
            for i in range(bar_count):
                level = self.bars[i]
                bh = max(2, level * 16)
                x = bar_start + i * (bar_w + bar_gap)
                y = cy - bh / 2
                
                self._rounded_rect(cr, x, y, bar_w, bh, 1.2)
                cr.set_source_rgba(*CYAN_LIGHT, max(0.25, level))
                cr.fill()
    
    def _draw_mic(self, cr, cx, cy):
        """Draw a small microphone icon."""
        cr.set_source_rgba(1, 1, 1, 0.95)
        cr.set_line_width(1.5)
        
        # Mic body (rounded rect)
        mw, mh = 5, 7
        mr = 2.5
        self._rounded_rect(cr, cx - mw/2, cy - mh/2 - 2, mw, mh, mr)
        cr.fill()
        
        # Mic arc (U shape below)
        cr.set_source_rgba(1, 1, 1, 0.9)
        cr.set_line_width(1.3)
        cr.arc(cx, cy - 1, 6, 0.15 * math.pi, 0.85 * math.pi)
        cr.stroke()
        
        # Stand line
        cr.move_to(cx, cy + 5)
        cr.line_to(cx, cy + 8)
        cr.stroke()
        
        # Base
        cr.move_to(cx - 3, cy + 8)
        cr.line_to(cx + 3, cy + 8)
        cr.stroke()
    
    def _rounded_rect(self, cr, x, y, w, h, r):
        r = min(r, w/2, h/2)
        cr.new_sub_path()
        cr.arc(x + w - r, y + r, r, -math.pi/2, 0)
        cr.arc(x + w - r, y + h - r, r, 0, math.pi/2)
        cr.arc(x + r, y + h - r, r, math.pi/2, math.pi)
        cr.arc(x + r, y + r, r, math.pi, 3*math.pi/2)
        cr.close_path()

def stdin_reader(overlay):
    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                if data.get("type") == "level":
                    GLib.idle_add(setattr, overlay, "audio_level", float(data.get("value", 0)))
                elif data.get("type") == "status":
                    GLib.idle_add(setattr, overlay, "status", data.get("value", "idle"))
                elif data.get("type") == "quit":
                    GLib.idle_add(Gtk.main_quit)
                    return
            except json.JSONDecodeError:
                pass
    except:
        pass
    GLib.idle_add(Gtk.main_quit)

if __name__ == "__main__":
    signal.signal(signal.SIGTERM, lambda *_: GLib.idle_add(Gtk.main_quit))
    signal.signal(signal.SIGINT, lambda *_: GLib.idle_add(Gtk.main_quit))
    
    pos = sys.argv[1] if len(sys.argv) > 1 else "bottom"
    theme = sys.argv[2] if len(sys.argv) > 2 else "dark"
    overlay = RecordingOverlay(pos, theme)
    
    t = threading.Thread(target=stdin_reader, args=(overlay,), daemon=True)
    t.start()
    
    Gtk.main()
