import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Clock } from 'lucide-react';
import EntryItem from './EntryItem';
import { TimeEntry } from '../types';

type Props = {
  entries: TimeEntry[];
  openCommentsEditor: (taskId: string, title: string) => void;
  openTaskEditor: (entry: TimeEntry) => void;
  openImputeModal: (entry: TimeEntry) => void;
  handleDeleteEntry: (id: string) => void;
  handleToggleImputed: (id: string) => void;
};

export default function EntriesList({ entries, openCommentsEditor, openTaskEditor, openImputeModal, handleDeleteEntry, handleToggleImputed }: Props) {
  return (
    <div className="lg:col-span-2 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-[var(--brand-primary)]" />
          Historial Reciente
        </h2>
        <span className="text-xs font-medium bg-[var(--border-default)] text-[var(--text-primary)] px-2 py-1 rounded-full">
          {entries.length} registros
        </span>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {entries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-12 text-center"
            >
              <div className="bg-[var(--bg-surface-muted)] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-[var(--text-primary)] font-bold">No hay registros aún</h3>
              <p className="text-[var(--text-muted)] text-sm mt-1">Empieza a trackear tu tiempo en Trello.</p>
            </motion.div>
          ) : (
            entries.map((entry, idx) => (
              <React.Fragment key={entry.id ?? `${entry.taskId}-${entry.date}-${idx}`}>
                <EntryItem
                  entry={entry}
                  openCommentsEditor={openCommentsEditor}
                  openTaskEditor={openTaskEditor}
                  openImputeModal={openImputeModal}
                  handleDeleteEntry={handleDeleteEntry}
                  handleToggleImputed={handleToggleImputed}
                />
              </React.Fragment>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
