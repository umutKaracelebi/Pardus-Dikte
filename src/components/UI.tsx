import React from 'react';

// Toggle Switch
export const Toggle = ({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) => (
  <div className="flex items-center justify-between py-3 px-4">
    <div className="flex-1 min-w-0 mr-4">
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</div>
      {desc && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</div>}
    </div>
    <div onClick={() => onChange(!checked)} className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors shrink-0 ${checked ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${checked ? 'left-6' : 'left-1'}`} />
    </div>
  </div>
);

// Dropdown Select — dark mode handled via Tailwind classes only (no inline style)
export const Select = ({ value, onChange, options, label, desc }: { value: string; onChange: (v: string) => void; options: {value: string; label: string}[]; label: string; desc?: string }) => (
  <div className="py-3 px-4">
    <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</div>
    {desc && <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{desc}</div>}
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full max-w-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-100 focus:outline-none focus:border-cyan-500 [color-scheme:light] dark:[color-scheme:dark]"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// Settings Group Card
export const SettingsGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-5">
    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">{title}</h3>
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
      {children}
    </div>
  </div>
);

// Number Input — allows empty field, commits on blur or Enter
export const NumberInput = ({ value, onChange, label, desc, min = 0, max = 1000 }: { value: number; onChange: (v: number) => void; label: string; desc?: string; min?: number; max?: number }) => {
  const [localValue, setLocalValue] = React.useState(String(value));
  React.useEffect(() => { setLocalValue(String(value)); }, [value]);

  const commit = () => {
    const v = parseInt(localValue);
    if (!isNaN(v) && v >= min && v <= max) {
      onChange(v);
    } else {
      setLocalValue(String(value)); // revert
    }
  };

  return (
    <div className="flex items-center justify-between py-3 px-4">
      <div className="flex-1 min-w-0 mr-4">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</div>
        {desc && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</div>}
      </div>
      <input
        type="number"
        min={min}
        max={max}
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); }}
        className="w-20 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm text-center text-slate-700 dark:text-slate-100 focus:outline-none focus:border-cyan-500 [color-scheme:light] dark:[color-scheme:dark]"
      />
    </div>
  );
};
