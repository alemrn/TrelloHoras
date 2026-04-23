import React from 'react';
import { TimeEntry } from '../types';
import { MessageSquare, Pencil, Plus, Trash2, ExternalLink, Calendar as CalendarIcon } from 'lucide-react';
import { motion } from 'motion/react';

type Props = {
  entry: TimeEntry;
  openCommentsEditor: (taskId: string, title: string) => void;
  openTaskEditor: (entry: TimeEntry) => void;
  openImputeModal: (entry: TimeEntry) => void;
  handleDeleteEntry: (id: string) => void;
  handleToggleImputed: (id: string) => void;
};

export default function EntryItem({ entry, openCommentsEditor, openTaskEditor, openImputeModal, handleDeleteEntry, handleToggleImputed }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="group rounded-xl border border-(--border-default) bg-(--bg-surface) p-4 shadow-sm transition-all hover:border-(--brand-primary)"
    >
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 gap-3">
          <label className="flex items-center justify-center cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={entry.imputed}
              onChange={() => handleToggleImputed(entry.id)}
              className="h-4 w-4 rounded border-(--border-strong) text-(--brand-primary) focus:ring-(--brand-primary)"
              aria-label={`Marcar ${entry.cardTitle} como imputada`}
            />
          </label>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h4 className="min-w-0 flex-1 pr-2 text-[15px] font-semibold leading-tight text-(--text-primary) wrap-break-word" title={entry.cardTitle}>
                {entry.cardTitle}
              </h4>
              <span className="text-lg font-bold text-(--brand-primary) whitespace-nowrap">{entry.hours}h</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap ${entry.cardUrl ? 'bg-(--info-soft) text-(--brand-primary-hover)' : 'bg-(--warning-soft) text-(--warning)'}`}>
                {entry.cardUrl ? 'Trello' : 'Provisional'}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap ${entry.imputed ? 'bg-(--success-soft) text-(--success)' : 'bg-(--danger-soft) text-(--danger)'}`}>
                {entry.imputed ? 'Imputada' : 'Sin imputar'}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-xs text-(--text-muted) flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {entry.date}
              </span>
              {entry.cardUrl ? (
                <a
                  href={entry.cardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-(--brand-primary) hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ver en Trello
                </a>
              ) : null}
            </div>
          </div>
        </div>
        <div className="ml-7 flex items-center justify-end gap-1 sm:gap-2">
          <button
            onClick={() => openCommentsEditor(entry.taskId, entry.cardTitle)}
            className="rounded-lg p-2 text-(--text-muted) transition-all hover:bg-(--bg-surface-muted)"
            aria-label={`Comentarios ${entry.cardTitle}`}
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => openTaskEditor(entry)}
            className="rounded-lg p-2 text-(--text-muted) transition-all hover:bg-(--bg-surface-muted)"
            aria-label={`Editar ${entry.cardTitle}`}
          >
            <Pencil className="w-4 h-4" />
          </button>
          {entry.cardUrl ? (
            <button
              onClick={() => openImputeModal(entry)}
              className="rounded-lg p-2 text-(--brand-primary) transition-all hover:bg-(--bg-surface-muted)"
              aria-label={`Imputar horas ${entry.cardTitle}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          ) : null}
          <button
            onClick={() => handleDeleteEntry(entry.id)}
            className="rounded-lg p-2 text-(--danger-action) transition-all hover:bg-(--danger-soft)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
