import { t } from '../i18n';

export function AboutSettings({ shortcutKey }: { shortcutKey: string }) {
  return (
    <div className="space-y-5">
      {/* App Info */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">{t('about.app_info')}</h3>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
          <div className="py-5 px-4 flex flex-col items-center text-center">
            <img src="/pardus-dikte.png" alt="Pardus Dikte" className="w-16 h-16 rounded-2xl mb-3 shadow-lg" />
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100">Pardus Dikte</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('about.subtitle')}</div>
            <div className="mt-2 px-3 py-1 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-full text-xs font-semibold">v1.0.0</div>
          </div>
        </div>
      </div>

      {/* Developer */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">{t('about.developer')}</h3>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
          <div className="py-3 px-4 space-y-2">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('about.team')}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('about.competition')}
            </div>
            <div className="flex flex-col gap-1.5 pt-1">
              <a
                href="https://inoturk.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 font-medium transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                inoturk.netlify.app
              </a>
              <a
                href="mailto:inoturkteknolojitakimi@gmail.com"
                className="inline-flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 font-medium transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                inoturkteknolojitakimi@gmail.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Open Source */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">{t('about.open_source')}</h3>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
          <div className="py-3 px-4">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('about.source_code')}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('about.source_desc')}</div>
            <a
              href="https://github.com/umutKaracelebi/Pardus-Dikte"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 font-medium transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6.02 0c2.3-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.82.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
              github.com/umutKaracelebi/Pardus-Dikte
            </a>
          </div>
        </div>
      </div>

      {/* Shortcut Info */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">{t('about.shortcut_info')}</h3>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
          <div className="py-3 px-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t('about.shortcut_info_desc')}</div>
            <div className="bg-slate-800 dark:bg-slate-900 text-cyan-400 px-3 py-2 rounded-lg font-mono text-xs">
              {shortcutKey.split('+').map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' + ')} → {t('about.shortcut_action')}
            </div>
          </div>
        </div>
      </div>

      {/* License */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">{t('about.license')}</h3>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
          <div className="py-3 px-4">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">GNU General Public License v3.0</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('about.license_text')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
