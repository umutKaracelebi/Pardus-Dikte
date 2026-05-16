import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { CopyIcon } from './Icons';
import { t } from '../i18n';

interface HistoryItem { id: number; date: string; title: string; text: string; }

export function HistorySettings({ history, setHistory }: { history: HistoryItem[]; setHistory: (h: HistoryItem[]) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center mb-3 px-1">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('history.title')}</h3>
        {history.length > 0 && <button onClick={() => setHistory([])} className="text-xs font-medium text-red-500 hover:text-red-600">{t('history.delete_all')}</button>}
      </div>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden isolate">
        {history.length === 0 ? (
          <div className="text-slate-400 text-center py-12 text-sm">{t('history.empty')}</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {history.map(item => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.date}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => writeText(item.text)} className="p-1 text-slate-400 hover:text-cyan-500 transition-colors" title="Kopyala">
                      <CopyIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => setHistory(history.filter(h => h.id !== item.id))} className="p-1 text-slate-400 hover:text-red-500 transition-colors" title="Sil">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed select-text cursor-text whitespace-pre-wrap break-words">{item.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
