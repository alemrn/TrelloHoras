import React, { useState } from 'react';
import { Clock, Layout, BarChart3, Moon, Sun } from 'lucide-react';
import Button, { IconButton } from './Button';

type Props = {
  // Valores iniciales opcionales — si se pasan, los usará como estado inicial
  initialView?: 'tracker' | 'summary';
  onViewChange?: (v: 'tracker' | 'summary') => void;
  initialIsDarkMode?: boolean;
  onThemeChange?: (b: boolean) => void;
};

export default function Header({ initialView = 'tracker', onViewChange, initialIsDarkMode, onThemeChange }: Props) {
  const [view, setView] = useState<'tracker' | 'summary'>(initialView);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof initialIsDarkMode === 'boolean') return initialIsDarkMode;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const handleToggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      onThemeChange?.(next);
      return next;
    });
  };

  const handleSetView = (v: 'tracker' | 'summary') => {
    setView(v);
    onViewChange?.(v);
  };

  return (
    <header className="bg-(--bg-surface) border-b border-(--border-default) sticky top-0 z-10 transition-colors">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-(--brand-primary) p-1.5 rounded-md transition-colors">
              <Clock className="w-5 h-5 text-(--text-inverse)" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-(--brand-primary)">TrelloTime</h1>
          </div>
          <IconButton
            type="button"
            onClick={handleToggleTheme}
            aria-pressed={isDarkMode}
            aria-label={`Modo oscuro ${isDarkMode ? 'activado' : 'desactivado'}`}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="hidden sm:inline ml-2">{isDarkMode ? 'Claro' : 'Oscuro'}</span>
          </IconButton>
        </div>

        <div className="flex items-center gap-2">
          <nav className="flex gap-1 bg-(--bg-surface-muted) p-1 rounded-lg transition-colors">
            <button
              onClick={() => handleSetView('tracker')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === 'tracker' ? 'bg-(--bg-surface) shadow-sm text-(--brand-primary)' : 'text-(--text-muted) hover:bg-(--border-default)'}`}
            >
              <Layout className="w-4 h-4" />
              Tracker
            </button>
            <button
              onClick={() => handleSetView('summary')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === 'summary' ? 'bg-(--bg-surface) shadow-sm text-(--brand-primary)' : 'text-(--text-muted) hover:bg-(--border-default)'}`}
            >
              <BarChart3 className="w-4 h-4" />
              Resumen
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
