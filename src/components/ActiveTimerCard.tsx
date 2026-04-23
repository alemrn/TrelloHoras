import React from 'react';
import { Timer, Play, Square } from 'lucide-react';
import Button, { IconButton } from './Button';
import { ActiveTimer } from '../types';

type Props = {
  activeTimer: ActiveTimer | null;
  elapsedSeconds: number;
  onOpenTimerModal: () => void;
  onStopTimer: () => void;
  isRoundModeEnabled: boolean;
  onToggleRoundMode: () => void;
  formatTime: (s: number) => string;
};

export default function ActiveTimerCard({ activeTimer, elapsedSeconds, onOpenTimerModal, onStopTimer, isRoundModeEnabled, onToggleRoundMode, formatTime }: Props) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex min-w-max flex-1 items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
            <Timer className="w-4 h-4" />
            Cronómetro
          </h2>
          <button
            type="button"
            onClick={onToggleRoundMode}
            className="flex items-center gap-2"
            aria-pressed={isRoundModeEnabled}
            aria-label={`Modo redondeo ${isRoundModeEnabled ? '0.25' : '0.5'}`}
          >
            <span className={`relative h-6 w-10 rounded-full transition-colors ${isRoundModeEnabled ? 'bg-[var(--brand-primary)]' : 'bg-[var(--border-strong)]'}`}>
              <span className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[var(--bg-surface)] shadow-sm transition-all ${isRoundModeEnabled ? 'left-5' : 'left-1'}`} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{isRoundModeEnabled ? '0.25' : '0.5'}</span>
          </button>
        </div>
        {!activeTimer ? (
          <Button onClick={onOpenTimerModal} className="min-w-[11rem] flex-1 px-4 py-2 text-sm flex items-center justify-center gap-2 shadow-sm">
            <Play className="w-4 h-4 fill-current" />
            Iniciar tarea
          </Button>
        ) : null}
      </div>

      {activeTimer ? (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-mono font-bold text-[var(--text-primary)] mb-1">{formatTime(elapsedSeconds)}</div>
            <p className="text-sm text-[var(--text-muted)] truncate px-2" title={activeTimer.cardTitle}>{activeTimer.cardTitle}</p>
          </div>
          <Button variant="danger" onClick={onStopTimer} className="w-full py-3 flex items-center justify-center gap-2 shadow-md active:scale-95">
            <Square className="w-4 h-4 fill-current" />
            Detener y Guardar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
