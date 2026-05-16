import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Toggle, Select, SettingsGroup, NumberInput } from './UI';
import { t } from '../i18n';
import type { Settings } from './useSettings';

// ─── Shortcut Capture Component ─────────────────────────────────────────
function ShortcutCapture({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [capturing, setCapturing] = useState(false);

  const formatShortcut = (shortcut: string) => {
    return shortcut.split('+').map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' + ');
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const parts: string[] = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    if (e.metaKey) parts.push('super');

    const key = e.key.toLowerCase();
    // Ignore lone modifier keys
    if (['control', 'alt', 'shift', 'meta'].includes(key)) return;

    // Map special keys
    const keyMap: Record<string, string> = {
      ' ': 'space', 'arrowup': 'up', 'arrowdown': 'down',
      'arrowleft': 'left', 'arrowright': 'right', 'escape': 'esc',
    };
    parts.push(keyMap[key] || key);

    const combo = parts.join('+');
    onChange(combo);
    setCapturing(false);
  }, [onChange]);

  useEffect(() => {
    if (capturing) {
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [capturing, handleKeyDown]);

  return (
    <div className="py-3 px-4">
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.shortcut_label')}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('settings.shortcut_desc')}</div>
      <div className="mt-2 flex items-center gap-3">
        {capturing ? (
          <div className="bg-cyan-500 text-white px-4 py-2 rounded-lg font-mono text-sm animate-pulse">
            {t('settings.shortcut_press')}
          </div>
        ) : (
          <div className="bg-slate-800 text-cyan-400 px-4 py-2 rounded-lg font-mono text-sm">
            {formatShortcut(value)}
          </div>
        )}
        <button
          onClick={() => setCapturing(!capturing)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            capturing
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          {capturing ? t('record.cancel') : t('settings.shortcut_change')}
        </button>
      </div>
    </div>
  );
}

// ─── Main Settings ──────────────────────────────────────────────────────
export function GeneralSettings({ s, u }: { s: Settings; u: (p: Partial<Settings>) => void }) {
  const handleModelChange = async (model: string) => {
    u({ model });
    try { await invoke('set_model', { modelName: model }); } catch {}
  };

  // Use i18n keys for model and language options so they translate properly
  const MODELS = [
    { value: 'tiny', label: t('model.tiny') },
    { value: 'base', label: t('model.base') },
    { value: 'small', label: t('model.small') },
    { value: 'medium', label: t('model.medium') },
    { value: 'large-v3', label: t('model.large-v3') },
  ];

  const LANGUAGES = [
    { value: 'tr', label: t('dlang.tr') },
    { value: 'en', label: t('dlang.en') },
    { value: 'de', label: t('dlang.de') },
    { value: 'fr', label: t('dlang.fr') },
    { value: 'es', label: t('dlang.es') },
    { value: 'auto', label: t('dlang.auto') },
  ];

  const PASTE_METHODS = [
    { value: 'ctrl_v', label: t('paste.ctrl_v') },
    { value: 'ctrl_shift_v', label: t('paste.ctrl_shift_v') },
    { value: 'none', label: t('paste.none') },
  ];

  const OVERLAY_POS = [
    { value: 'bottom', label: t('overlay.bottom') },
    { value: 'top', label: t('overlay.top') },
    { value: 'none', label: t('overlay.off') },
  ];

  const THEMES = [
    { value: 'light', label: t('theme.light') },
    { value: 'dark', label: t('theme.dark') },
    { value: 'system', label: t('theme.system') },
  ];

  // UI language options — always use native names
  const UI_LANGS = [
    { value: 'tr', label: 'Türkçe' },
    { value: 'en', label: 'English' },
  ];

  return (
    <div className="space-y-1">
      <SettingsGroup title={t('settings.recognition')}>
        <Select value={s.model} onChange={handleModelChange} options={MODELS} label={t('settings.model')} desc={t('settings.model_desc')} />
        <Select value={s.language} onChange={v => u({ language: v })} options={LANGUAGES} label={t('settings.language')} desc={t('settings.language_desc')} />
      </SettingsGroup>

      <SettingsGroup title={t('settings.paste')}>
        <Select value={s.paste_method} onChange={v => u({ paste_method: v })} options={PASTE_METHODS} label={t('settings.paste_method')} desc={t('settings.paste_method_desc')} />
        <Toggle checked={s.auto_copy} onChange={v => u({ auto_copy: v })} label={t('settings.auto_copy')} desc={t('settings.auto_copy_desc')} />
      </SettingsGroup>

      <SettingsGroup title={t('settings.shortcut')}>
        <ShortcutCapture value={s.shortcut_key} onChange={v => u({ shortcut_key: v })} />
      </SettingsGroup>

      <SettingsGroup title={t('settings.appearance')}>
        <Select value={s.overlay_position} onChange={v => u({ overlay_position: v })} options={OVERLAY_POS} label={t('settings.overlay')} desc={t('settings.overlay_desc')} />
        <Select value={s.theme} onChange={v => u({ theme: v as 'light' | 'dark' | 'system' })} options={THEMES} label={t('settings.theme')} desc={t('settings.theme_desc')} />
        <Select value={s.ui_language} onChange={v => u({ ui_language: v as 'tr' | 'en' })} options={UI_LANGS} label={t('settings.ui_lang')} desc={t('settings.ui_lang_desc')} />
      </SettingsGroup>

      <SettingsGroup title={t('settings.audio')}>
        <Toggle checked={s.mute_while_recording} onChange={v => u({ mute_while_recording: v })} label={t('settings.mute')} desc={t('settings.mute_desc')} />
      </SettingsGroup>

      <SettingsGroup title={t('nav.history')}>
        <NumberInput value={s.history_limit} onChange={v => u({ history_limit: v })} label={t('settings.history_limit')} desc={t('settings.history_limit_desc')} min={1} max={500} />
      </SettingsGroup>
    </div>
  );
}
