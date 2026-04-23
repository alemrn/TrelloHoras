import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Clock } from 'lucide-react';
import Button from './Button';
import ActiveTimerCard from './ActiveTimerCard';
import EntriesList from './EntriesList';
import { TimeEntry, ActiveTimer } from '../types';

type TaskInputMode = 'url' | 'name';

type Props = {
  entries: TimeEntry[];
  activeTimer: ActiveTimer | null;
  elapsedSeconds: number;
  isTimerModalOpen: boolean;
  setIsTimerModalOpen: (v: boolean) => void;
  timerInputMode: TaskInputMode;
  setTimerInputMode: (m: TaskInputMode) => void;
  tempTaskValue: string;
  setTempTaskValue: (v: string) => void;
  tempTimerComment: string;
  setTempTimerComment: (v: string) => void;
  isAddingManual: boolean;
  setIsAddingManual: (b: boolean) => void;
  manualInputMode: TaskInputMode;
  setManualInputMode: (m: TaskInputMode) => void;
  handleStartTimer: (e: React.FormEvent) => void;
  handleStopTimer: () => void;
  handleManualAdd: (e: React.FormEvent<HTMLFormElement>) => void;
  isRoundModeEnabled: boolean;
  onToggleRoundMode: () => void;
  formatTime: (s: number) => string;
  openCommentsEditor: (taskId: string, title: string) => void;
  openTaskEditor: (entry: TimeEntry) => void;
  openImputeModal: (entry: TimeEntry) => void;
  handleDeleteEntry: (id: string) => void;
  handleToggleImputed: (id: string) => void;
};

export default function TrackerView(props: Props) {
  const {
    entries,
    activeTimer,
    elapsedSeconds,
    isTimerModalOpen,
    setIsTimerModalOpen,
    timerInputMode,
    setTimerInputMode,
    tempTaskValue,
    setTempTaskValue,
    tempTimerComment,
    setTempTimerComment,
    isAddingManual,
    setIsAddingManual,
    manualInputMode,
    setManualInputMode,
    handleStartTimer,
    handleStopTimer,
    handleManualAdd,
    isRoundModeEnabled,
    onToggleRoundMode,
    formatTime,
    openCommentsEditor,
    openTaskEditor,
    openImputeModal,
    handleDeleteEntry,
    handleToggleImputed,
  } = props;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Controls */}
      <div className="lg:col-span-1 space-y-6">
        <ActiveTimerCard
          activeTimer={activeTimer}
          elapsedSeconds={elapsedSeconds}
          onOpenTimerModal={() => setIsTimerModalOpen(true)}
          onStopTimer={handleStopTimer}
          isRoundModeEnabled={isRoundModeEnabled}
          onToggleRoundMode={onToggleRoundMode}
          formatTime={formatTime}
        />

        {/* Timer Modal */}
        <AnimatePresence>
          {isTimerModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6">
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Nueva Tarea</h3>
                  <form onSubmit={handleStartTimer} className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--bg-surface-muted)] p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setTimerInputMode('url');
                          setTempTaskValue('');
                        }}
                        className={`rounded-md px-3 py-2 text-sm font-bold transition-colors ${timerInputMode === 'url' ? 'bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}
                      >
                        URL Trello
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTimerInputMode('name');
                          setTempTaskValue('');
                        }}
                        className={`rounded-md px-3 py-2 text-sm font-bold transition-colors ${timerInputMode === 'name' ? 'bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}
                      >
                        Tarea provisional
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">
                        {timerInputMode === 'url' ? 'Enlace de la tarjeta de Trello' : 'Nombre de la tarea'}
                      </label>
                      <input
                        autoFocus
                        required
                        value={tempTaskValue}
                        onChange={(e) => setTempTaskValue(e.target.value)}
                        placeholder={timerInputMode === 'url' ? 'https://trello.com/c/...' : 'Ej: Refinar propuesta cliente'}
                        className="w-full px-3 py-2 bg-[var(--bg-surface-soft)] border border-[var(--border-default)] rounded-md text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Comentario</label>
                      <textarea
                        value={tempTimerComment}
                        onChange={(e) => setTempTimerComment(e.target.value)}
                        rows={3}
                        placeholder="Ej: Llamada cliente, dudas scope"
                        className="w-full px-3 py-2 bg-[var(--bg-surface-soft)] border border-[var(--border-default)] rounded-md text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none resize-y"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-[var(--brand-primary)] text-[var(--text-inverse)] rounded-md font-bold hover:bg-[var(--brand-primary-hover)] transition-colors"
                      >
                        Iniciar Cronómetro
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsTimerModalOpen(false);
                          setTempTaskValue('');
                          setTempTimerComment('');
                          setTimerInputMode('url');
                        }}
                        className="px-4 py-2.5 bg-[var(--bg-surface-muted)] text-[var(--text-primary)] rounded-md font-bold hover:bg-[var(--border-default)] transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Manual Add Card */}
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Añadir Manual
            </h2>
          </div>

          {!isAddingManual ? (
            <Button variant="ghost" onClick={() => setIsAddingManual(true)} className="w-full py-2 text-sm">
              Registrar horas manualmente
            </Button>
          ) : (
            <form onSubmit={handleManualAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--bg-surface-muted)] p-1">
                <label className="cursor-pointer rounded-md h-full">
                  <input
                    type="radio"
                    name="taskMode"
                    value="url"
                    checked={manualInputMode === 'url'}
                    onChange={() => setManualInputMode('url')}
                    className="sr-only peer"
                  />
                  <span className="flex min-h-[72px] items-center justify-center rounded-md px-3 py-2 text-center text-sm font-bold text-[var(--text-muted)] transition-colors peer-checked:bg-[var(--bg-surface)] peer-checked:text-[var(--brand-primary)] peer-checked:shadow-sm">
                    URL Trello
                  </span>
                </label>
                <label className="cursor-pointer rounded-md h-full">
                  <input
                    type="radio"
                    name="taskMode"
                    value="name"
                    checked={manualInputMode === 'name'}
                    onChange={() => setManualInputMode('name')}
                    className="sr-only peer"
                  />
                  <span className="flex min-h-[72px] items-center justify-center rounded-md px-3 py-2 text-center text-sm font-bold text-[var(--text-muted)] transition-colors peer-checked:bg-[var(--bg-surface)] peer-checked:text-[var(--brand-primary)] peer-checked:shadow-sm">
                    Tarea provisional
                  </span>
                </label>
              </div>
              {manualInputMode === 'url' ? (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">URL DE TRELLO</label>
                  <input name="url" placeholder="https://trello.com/c/..." className="w-full px-3 py-2 bg-[var(--bg-surface-soft)] border border-[var(--border-default)] rounded-md text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none" />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">NOMBRE TAREA PROVISIONAL</label>
                  <input name="title" placeholder="Ej: Revisión backlog sprint" className="w-full px-3 py-2 bg-[var(--bg-surface-soft)] border border-[var(--border-default)] rounded-md text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none" />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">HORAS</label>
                <input name="hours" type="number" step={0.25} min={0.25} required placeholder="Ej: 1.5" className="w-full px-3 py-2 bg-[var(--bg-surface-soft)] border border-[var(--border-default)] rounded-md text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none" />
                <p className="text-[10px] text-[var(--text-muted)] mt-1 italic">* Redondeo al múltiplo superior 0.25.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">COMENTARIO</label>
                <textarea name="comment" rows={3} placeholder="Ej: Reunión, cambios copy, bug login" className="w-full px-3 py-2 bg-[var(--bg-surface-soft)] border border-[var(--border-default)] rounded-md text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none resize-y" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 py-2 text-sm">Guardar</Button>
                <Button variant="secondary" type="button" onClick={() => setIsAddingManual(false)} className="px-4 py-2 text-sm">Cancelar</Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Right Column: List */}
      <EntriesList
        entries={entries}
        openCommentsEditor={openCommentsEditor}
        openTaskEditor={openTaskEditor}
        openImputeModal={openImputeModal}
        handleDeleteEntry={handleDeleteEntry}
        handleToggleImputed={handleToggleImputed}
      />
    </div>
  );
}
