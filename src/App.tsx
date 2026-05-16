import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { MicIcon, SettingsIcon, HistoryIcon, InfoIcon } from './components/Icons';
import { useSettings } from './components/useSettings';
import { GeneralSettings } from './components/GeneralSettings';
import { HistorySettings } from './components/HistorySettings';
import { AboutSettings } from './components/AboutSettings';
import { t, setLanguage } from './i18n';

const currentWindow = getCurrentWindow();
const isOverlay = currentWindow.label === 'recording_overlay';

type Section = 'record' | 'general' | 'history' | 'about';
type Status = 'idle' | 'recording' | 'analyzing' | 'loading_model' | 'paused' | 'downloading';

// ─── OVERLAY ────────────────────────────────────────────────────────────
function OverlayApp() {
  const [status, setStatus] = useState<'idle' | 'recording' | 'analyzing'>('recording');
  const [levels, setLevels] = useState<number[]>(Array(12).fill(0));

  // Set transparent body for overlay window
  useEffect(() => {
    document.body.classList.add('overlay-mode');
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    const root = document.getElementById('root');
    if (root) root.style.background = 'transparent';
    return () => { document.body.classList.remove('overlay-mode'); };
  }, []);

  useEffect(() => {
    const u1 = listen('stt_result', (event) => {
      try {
        const data = JSON.parse(event.payload as string);
        if (data.type === 'status') {
          if (data.message === 'recording_started') setStatus('recording');
          else if (data.message === 'recording_cancelled' || data.message === 'ready') setStatus('idle');
        } else if (data.type === 'final') setStatus('idle');
        else if (data.type === 'audio_level') {
          // Real mic level from Python STT engine
          const level = data.level as number;
          // Generate 12 bars with natural variation from single level
          setLevels(Array(12).fill(0).map((_, i) => {
            const variation = Math.sin(Date.now() / 80 + i * 0.7) * 0.15;
            return Math.max(0, Math.min(1, level + variation));
          }));
        }
      } catch {}
    });
    const u2 = listen('shortcut_start', () => setStatus('recording'));
    const u3 = listen('shortcut_stop', () => setStatus('analyzing'));
    const u4 = listen('stt_paste_done', async () => {
      // Hide overlay so focus returns to target app for auto-paste
      try { await currentWindow.hide(); } catch {}
    });
    return () => { u1.then(f => f()); u2.then(f => f()); u3.then(f => f()); u4.then(f => f()); };
  }, []);

  // Reset levels when not recording
  useEffect(() => {
    if (status !== 'recording') setLevels(Array(12).fill(0));
  }, [status]);

  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'transparent' }}>
      <div className="w-full h-full bg-[#1b2333] rounded-2xl border border-white/10 shadow-2xl flex items-center justify-between px-5 text-white overflow-hidden" data-tauri-drag-region>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${status === 'recording' ? 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]' : status === 'analyzing' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}>
            <MicIcon className="w-4 h-4 text-white" glow={status === 'recording'} />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold tracking-wide">Pardus Dikte</span>
            <span className={`text-[10px] font-medium tracking-widest ${status === 'recording' ? 'text-cyan-300' : status === 'analyzing' ? 'text-emerald-300' : 'text-slate-400'}`}>
              {status === 'recording' ? 'DİNLENİYOR...' : status === 'analyzing' ? 'ANALİZ...' : 'HAZIR'}
            </span>
          </div>
        </div>
        {/* Real Mic Level Bars from Python */}
        {status === 'recording' && (
          <div className="flex items-center gap-[2px] h-7">
            {levels.map((v, i) => (
              <div key={i} className="w-[3px] bg-cyan-400 rounded-full transition-all duration-100" style={{ height: `${Math.max(3, v * 24)}px`, opacity: Math.max(0.2, v) }} />
            ))}
          </div>
        )}
        {/* Cancel button */}
        {status === 'recording' && (
          <div onClick={() => invoke('cancel_recording').catch(() => {})} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-white/70"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SIDEBAR ────────────────────────────────────────────────────────────
const SECTIONS: { id: Section; labelKey: string; Icon: React.FC<{className?: string}> }[] = [
  { id: 'record', labelKey: 'nav.record', Icon: MicIcon },
  { id: 'general', labelKey: 'nav.settings', Icon: SettingsIcon },
  { id: 'history', labelKey: 'nav.history', Icon: HistoryIcon },
  { id: 'about', labelKey: 'nav.about', Icon: InfoIcon },
];

// ─── MAIN ───────────────────────────────────────────────────────────────
function MainApp() {
  const [section, setSection] = useState<Section>('record');
  const [status, setStatus] = useState<Status>('loading_model');
  const [text, setText] = useState('');
  const [history, setHistory] = useState<{id: number; date: string; title: string; text: string}[]>([]);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(12).fill(0));
  const [downloadProgress, setDownloadProgress] = useState<{model: string; percent: number; totalBytes: number} | null>(null);
  const { settings, update, loaded } = useSettings();

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('stt_history');
    if (saved) try { setHistory(JSON.parse(saved)); } catch {}
  }, []);
  useEffect(() => { localStorage.setItem('stt_history', JSON.stringify(history)); }, [history]);

  // STT events - useRef so event listeners always read latest values
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Create event listeners ONCE (no dependency on settings)
  useEffect(() => {
    const u1 = listen('stt_result', async (event) => {
      try {
        const data = JSON.parse(event.payload as string);
        if (data.type === 'status') {
          if (data.message === 'recording_started') setStatus('recording');
          else if (data.message === 'recording_cancelled') { setStatus('idle'); setText(''); }
          else if (data.message === 'ready') { setStatus('idle'); setDownloadProgress(null); }
          else if (data.message.startsWith('loading_model')) setStatus('loading_model');
          else if (data.message.startsWith('downloading_model')) setStatus('downloading');
        } else if (data.type === 'download') {
          if (data.status === 'progress') {
            setDownloadProgress({ model: data.model, percent: data.percent ?? -1, totalBytes: data.total_bytes ?? 0 });
          } else if (data.status === 'complete' || data.status === 'cancelled' || data.status === 'error') {
            setDownloadProgress(null);
            if (data.status !== 'complete') setStatus('idle');
          }
        } else if (data.type === 'final') {
          const txt = data.text;
          // If paused, keep paused state (don't auto-close)
          if (statusRef.current !== 'paused') {
            setStatus('idle');
          }
          if (txt && txt.trim()) {
            setText(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + txt);
            setHistory(prev => {
              const limit = settingsRef.current.history_limit || 50;
              const next = [{ id: Date.now(), date: new Date().toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' }), title: `Kayıt #${prev.length + 1}`, text: txt }, ...prev];
              return next.slice(0, limit);
            });
          }
        } else if (data.type === 'audio_level') {
          const level = data.level as number;
          setAudioLevels(Array(12).fill(0).map((_, i) => {
            const variation = Math.sin(Date.now() / 80 + i * 0.7) * 0.15;
            return Math.max(0, Math.min(1, level + variation));
          }));
        }
      } catch {}
    });
    const u2 = listen('shortcut_start', () => setStatus('recording'));
    const u3 = listen('shortcut_stop', () => setStatus('analyzing'));
    const u4 = listen('copy_last_transcript', (event) => { writeText(event.payload as string); });
    return () => { u1.then(f => f()); u2.then(f => f()); u3.then(f => f()); u4.then(f => f()); };
  }, []);

  // Check engine status on mount (in case ready event was missed)
  useEffect(() => {
    const check = async () => {
      try {
        const s = await invoke<string>('get_engine_status');
        if (s === 'ready') setStatus(prev => prev === 'loading_model' || prev === 'downloading' ? 'idle' : prev);
      } catch {}
    };
    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, []);

  // Dynamic history trimming when limit changes
  useEffect(() => {
    if (settings.history_limit && history.length > settings.history_limit) {
      setHistory(prev => prev.slice(0, settings.history_limit));
    }
  }, [settings.history_limit]);

  // Reset audio levels when not recording
  useEffect(() => {
    if (status !== 'recording') setAudioLevels(Array(12).fill(0));
  }, [status]);

  // Apply theme + language synchronously BEFORE render
  // (useEffect runs AFTER render which causes off-by-one visual glitches)
  const root = document.documentElement;
  if (settings.theme === 'dark') {
    root.classList.add('dark');
  } else if (settings.theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', isDark);
  } else {
    root.classList.remove('dark');
  }
  setLanguage(settings.ui_language);

  if (!loaded) return <div className="h-screen flex items-center justify-center text-slate-400">Yükleniyor...</div>;

  const statusLabel = status === 'idle' ? t('status.ready') : status === 'loading_model' ? t('status.loading') : status === 'recording' ? t('status.recording') : t('status.analyzing');

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-[160px] bg-[#0f1522] flex flex-col h-full text-white shrink-0">
        <div className="p-4 flex flex-col items-center gap-1.5 border-b border-white/10">
          <img src="/pardus-dikte.png" alt="" className="w-14 h-14 rounded-xl" />
          <span className="font-bold text-xs tracking-tight opacity-80">Pardus Dikte</span>
        </div>
        <div className="flex-1 flex flex-col gap-0.5 p-2 pt-3">
          {SECTIONS.map(({ id, labelKey, Icon }) => (
            <div key={id} onClick={() => setSection(id)} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${section === id ? 'bg-cyan-500/80 font-semibold' : 'hover:bg-white/10 opacity-80'}`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{t(labelKey)}</span>
            </div>
          ))}
        </div>
        {/* Footer - status */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status === 'idle' ? 'bg-emerald-400' : status === 'recording' ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
            <span className="text-[11px] text-slate-400">{statusLabel}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Model: {settings.model} • v1.0.0</div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            {section === 'record' && (
              <div className="h-full flex flex-col">
                {/* Editable Text Area */}
                <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm mb-4 flex flex-col min-h-[280px]">
                  {text || status === 'recording' || status === 'paused' || status === 'analyzing' ? (
                    <textarea
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder={status === 'recording' ? t('status.recording') : status === 'analyzing' ? t('record.analyzing_text') : t('record.edit_placeholder')}
                      className="flex-1 p-5 text-[15px] text-slate-700 dark:text-slate-200 leading-relaxed resize-none bg-transparent focus:outline-none w-full"
                    />
                  ) : (
                    <div className="flex-1 p-5 flex flex-col items-center justify-center opacity-40">
                      <MicIcon className="w-10 h-10 mb-3 text-slate-400" />
                      <p className="text-base">{t('record.press_mic')}</p>
                      <div className="mt-3 bg-slate-800 text-cyan-400 px-3 py-1.5 rounded-lg font-mono text-[11px]">{settings.shortcut_key.split('+').map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' + ')}</div>
                      {status === 'loading_model' && <p className="text-sm mt-2 text-cyan-600 animate-pulse">{t('status.loading')}</p>}
                    </div>
                  )}
                  <div className="h-10 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between px-4 shrink-0">
                    <div className="flex items-center gap-2">
                      {status === 'recording' ? (
                        /* Real audio waveform bars */
                        <div className="flex items-center gap-[2px] h-5">
                          {audioLevels.map((v, i) => (
                            <div key={i} className="w-[2.5px] bg-cyan-400 rounded-full transition-all duration-100" style={{ height: `${Math.max(2, v * 18)}px`, opacity: Math.max(0.25, v) }} />
                          ))}
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          {[1,2,3,4,5,6,7].map(i => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${status === 'paused' ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-600'}`} />
                          ))}
                        </div>
                      )}
                      {status === 'paused' && <span className="text-[10px] text-amber-500 font-semibold">{t('record.paused_label')}</span>}
                      {status === 'recording' && <span className="text-[10px] text-cyan-500 font-semibold animate-pulse">{t('record.listening')}</span>}
                    </div>
                  </div>
                </div>
                {/* Controls */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex items-center justify-center py-8">
                  {(status === 'downloading' || (status === 'loading_model' && downloadProgress)) ? (
                    /* Model indiriliyor/yükleniyor */
                    <div className="flex flex-col items-center gap-4 px-8 w-full max-w-sm">
                      <div className="w-16 h-16 rounded-full bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
                        <svg className="w-8 h-8 text-cyan-500 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="50 20" /></svg>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {status === 'downloading' ? t('status.downloading') : t('status.loading')}
                        </div>
                        {downloadProgress && (
                          <div className="text-xs text-slate-400 mt-1">
                            {downloadProgress.model} modeli
                            {downloadProgress.totalBytes > 0 && ` • ${(downloadProgress.totalBytes / 1024 / 1024).toFixed(0)} MB`}
                          </div>
                        )}
                      </div>
                      {downloadProgress && downloadProgress.percent >= 0 && (
                        <div className="w-full">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${downloadProgress.percent}%` }} />
                          </div>
                          <div className="text-xs text-slate-400 text-center mt-1.5">{`%${downloadProgress.percent}`}</div>
                        </div>
                      )}
                      {status === 'downloading' && (
                        <button onClick={() => invoke('cancel_download')} className="text-xs text-red-500 hover:text-red-600 font-medium cursor-pointer transition-colors">
                          {t('record.cancel')}
                        </button>
                      )}
                    </div>
                  ) : (status === 'idle' || status === 'loading_model') && !text ? (
                    /* Kayıt öncesi: sadece mikrofon */
                    <div className="flex flex-col items-center gap-3">
                      <button onClick={async () => { setStatus('recording'); try { await invoke('start_recording'); } catch(e) { console.error('start_recording failed:', e); setStatus('idle'); } }} disabled={status === 'loading_model'} className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all shadow-lg ${status === 'loading_model' ? 'bg-slate-400 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 hover:scale-105 cursor-pointer hover:shadow-cyan-400/40 hover:shadow-xl'}`}>
                        <MicIcon className="w-8 h-8" />
                      </button>
                      <span className="text-xs text-slate-400 font-medium">{status === 'loading_model' ? t('status.loading') : t('record.start')}</span>
                    </div>
                  ) : (status === 'idle' || status === 'loading_model') && text ? (
                    /* Metin var ama kayıt yok: devam et veya yeni kayıt */
                    <div className="flex items-center gap-8">
                      <button onClick={() => setText('')} className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-red-500 cursor-pointer transition-all">
                        <div className="w-11 h-11 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-red-400 flex items-center justify-center bg-white dark:bg-slate-700 shadow-sm transition-colors">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">{t('record.clear')}</span>
                      </button>
                      <button onClick={async () => { setStatus('recording'); try { await invoke('start_recording'); } catch(e) { console.error('start_recording failed:', e); setStatus('idle'); } }} className="flex flex-col items-center gap-2">
                        <div className="w-20 h-20 rounded-full bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center text-white transition-all shadow-lg hover:scale-105 cursor-pointer hover:shadow-cyan-400/40 hover:shadow-xl">
                          <MicIcon className="w-8 h-8" />
                        </div>
                        <span className="text-xs text-slate-400 font-medium">{t('record.continue')}</span>
                      </button>
                      <button onClick={() => { writeText(text); }} className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-cyan-500 cursor-pointer transition-all">
                        <div className="w-11 h-11 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-cyan-400 flex items-center justify-center bg-white dark:bg-slate-700 shadow-sm transition-colors">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">{t('record.copy')}</span>
                      </button>
                    </div>
                  ) : status === 'recording' ? (
                    /* Kayıt sırasında: İptal + Bitir(ortada) + Duraklat */
                    <div className="flex items-center gap-8">
                      <button onClick={async () => { setStatus('idle'); setText(''); await invoke('cancel_recording'); }} className="flex flex-col items-center gap-1.5 text-slate-500 hover:text-red-500 cursor-pointer transition-all">
                        <div className="w-12 h-12 rounded-full border-2 border-red-300 hover:border-red-500 flex items-center justify-center bg-white dark:bg-slate-700 shadow-sm transition-colors">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">İptal</span>
                      </button>
                      <button onClick={async () => { setStatus('analyzing'); await invoke('stop_recording'); }} className="flex flex-col items-center gap-2">
                        <div className="relative">
                          <div className="absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-20" />
                          <div className="relative w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-white transition-all shadow-lg cursor-pointer hover:scale-105">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                          </div>
                        </div>
                        <span className="text-xs text-emerald-600 font-semibold">Bitir</span>
                      </button>
                      <button onClick={async () => { setStatus('paused'); await invoke('stop_recording'); }} className="flex flex-col items-center gap-1.5 text-slate-500 hover:text-amber-500 cursor-pointer transition-all">
                        <div className="w-12 h-12 rounded-full border-2 border-amber-300 hover:border-amber-500 flex items-center justify-center bg-white dark:bg-slate-700 shadow-sm transition-colors">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Duraklat</span>
                      </button>
                    </div>
                  ) : status === 'paused' ? (
                    /* Duraklatılmış: İptal + Devam(ortada) + Bitir */
                    <div className="flex items-center gap-8">
                      <button onClick={() => { setText(''); setStatus('idle'); }} className="flex flex-col items-center gap-1.5 text-slate-500 hover:text-red-500 cursor-pointer transition-all">
                        <div className="w-12 h-12 rounded-full border-2 border-red-300 hover:border-red-500 flex items-center justify-center bg-white dark:bg-slate-700 shadow-sm transition-colors">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">İptal</span>
                      </button>
                      <button onClick={async () => { setStatus('recording'); try { await invoke('start_recording'); } catch(e) { console.error('start_recording failed:', e); setStatus('paused'); } }} className="flex flex-col items-center gap-2">
                        <div className="w-20 h-20 rounded-full bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center text-white transition-all shadow-lg cursor-pointer hover:scale-105 hover:shadow-cyan-400/40">
                          <MicIcon className="w-8 h-8" />
                        </div>
                        <span className="text-xs text-cyan-600 font-semibold">Devam Et</span>
                      </button>
                      <button onClick={() => { setStatus('idle'); }} className="flex flex-col items-center gap-1.5 text-slate-500 hover:text-emerald-500 cursor-pointer transition-all">
                        <div className="w-12 h-12 rounded-full border-2 border-emerald-300 hover:border-emerald-500 flex items-center justify-center bg-white dark:bg-slate-700 shadow-sm transition-colors">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Tamam</span>
                      </button>
                    </div>
                  ) : (
                    /* Analiz */
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg animate-pulse">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-8 h-8 animate-spin"><circle cx="12" cy="12" r="10" strokeDasharray="30 60" /></svg>
                      </div>
                      <span className="text-xs text-emerald-600 font-semibold">Analiz ediliyor...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {section === 'general' && <GeneralSettings s={settings} u={update} />}
            {section === 'history' && <HistorySettings history={history} setHistory={setHistory} />}
            {section === 'about' && <AboutSettings shortcutKey={settings.shortcut_key} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  if (isOverlay) return <OverlayApp />;
  return <MainApp />;
}
