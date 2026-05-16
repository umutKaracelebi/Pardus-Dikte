import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface Settings {
  model: string; language: string; auto_copy: boolean; paste_method: string;
  mute_while_recording: boolean;
  overlay_position: string; show_tray_icon: boolean;
  auto_submit: boolean; auto_submit_key: string;
  history_limit: number; shortcut_key: string;
  theme: 'light' | 'dark' | 'system';
  ui_language: 'tr' | 'en';
}

const DEFAULTS: Settings = {
  model: 'small', language: 'tr', auto_copy: true, paste_method: 'ctrl_v',
  mute_while_recording: false,
  overlay_position: 'bottom', show_tray_icon: true,
  auto_submit: false, auto_submit_key: 'enter',
  history_limit: 50, shortcut_key: 'ctrl+shift+r',
  theme: 'light',
  ui_language: 'tr',
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    invoke<string>('get_settings').then(json => {
      try {
        const parsed = JSON.parse(json);
        // Merge with defaults to handle missing keys from old saves
        setSettings({ ...DEFAULTS, ...parsed });
      } catch {}
      setLoaded(true);
    }).catch(() => {
      const saved = localStorage.getItem('pardus_stt_settings');
      if (saved) try { setSettings({ ...DEFAULTS, ...JSON.parse(saved) }); } catch {}
      setLoaded(true);
    });
  }, []);

  const update = async (partial: Partial<Settings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    localStorage.setItem('pardus_stt_settings', JSON.stringify(next));
    try { await invoke('update_settings', { settingsJson: JSON.stringify(next) }); } catch {}
  };

  return { settings, update, loaded };
}
