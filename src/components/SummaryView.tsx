import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { formatISODate } from '../utils';
import { TimeEntry } from '../types';

type DaySummary = {
  label: string;
  date: string;
  imputedTotal: number;
  pendingTotal: number;
  total: number;
  imputedCards: Array<{ taskId: string; title: string; hours: number; url: string | null; comments: string[] }>;
  pendingCards: Array<{ taskId: string; title: string; hours: number; url: string | null; comments: string[] }>;
};

type Props = {
  weeklySummary: Array<{ label: string; date: string; imputedTotal: number; pendingTotal: number; total: number }>;
  dailySummary: Array<{ date: string; total: number; imputedTotal: number; pendingTotal: number; imputedCards: any[]; pendingCards: any[] }>;
  openCommentsEditor: (taskId: string, title: string) => void;
};

export default function SummaryView({ weeklySummary, dailySummary, openCommentsEditor }: Props) {
  return (
    <div className="space-y-4">
      {weeklySummary.length > 0 && (
        <section className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-[var(--border-default)] bg-[var(--bg-app)] flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] leading-tight">Resumen semanal</h3>
              <p className="text-xs text-[var(--text-muted)] leading-tight">Semana actual, lunes a viernes</p>
            </div>
            <span className="text-[11px] font-medium bg-[var(--border-default)] text-[var(--text-primary)] px-2 py-1 rounded-full whitespace-nowrap">
              {weeklySummary.reduce((total, day) => total + day.total, 0)}h totales
            </span>
          </div>

          <div className="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-2 p-2.5">
            {weeklySummary.map((day) => (
              <article
                key={day.date}
                className="min-w-0 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface-soft)] p-2 flex flex-col gap-1.5"
              >
                <div className="pb-1.5 border-b border-[var(--border-default)]">
                  <p className="text-[13px] font-bold text-[var(--text-primary)] leading-none truncate">{day.label}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-none truncate">{day.date}</p>
                </div>

                <div className="space-y-1">
                  <div className="rounded-md bg-[var(--info-soft)] px-2 py-1.5">
                    <p className="text-[8px] font-bold uppercase tracking-wide text-[var(--brand-primary-hover)] leading-none">Total</p>
                    <p className="text-sm font-bold text-[var(--brand-primary)] leading-none mt-1">{day.total}h</p>
                  </div>
                  <div className="rounded-md bg-[var(--success-soft-alt)] px-2 py-1.5">
                    <p className="text-[8px] font-bold uppercase tracking-wide text-[var(--success)] leading-none">Imputadas</p>
                    <p className="text-xs font-bold text-[var(--success)] leading-none mt-1">{day.imputedTotal}h</p>
                  </div>
                  <div className="rounded-md bg-[var(--danger-soft-alt)] px-2 py-1.5">
                    <p className="text-[8px] font-bold uppercase tracking-wide text-[var(--danger)] leading-none">Sin imputar</p>
                    <p className="text-xs font-bold text-[var(--danger)] leading-none mt-1">{day.pendingTotal}h</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-[var(--brand-primary)]" />
          Resumen por Día
        </h2>
        <span className="text-xs font-medium bg-[var(--border-default)] text-[var,--text-primary)] px-2 py-1 rounded-full">
          {dailySummary.length} días
        </span>
      </div>

      {dailySummary.length === 0 ? (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-12 text-center shadow-sm">
          <div className="bg-[var(--bg-surface-muted)] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-[var(--text-primary)] font-bold">Sin datos disponibles</h3>
          <p className="text-[var(--text-muted)] text-sm mt-1">Añade registros para ver resumen diario.</p>
        </div>
      ) : (
        dailySummary.map((day) => (
          <section key={day.date} className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-app)] flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] leading-tight">{day.date}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">Total {day.total}h</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-[var(--success-soft)] text-[var(--success)] whitespace-nowrap">Imputadas {day.imputedTotal}h</span>
                <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-[var(--danger-soft)] text-[var(--danger)] whitespace-nowrap">Sin imputar {day.pendingTotal}h</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-4 border-b border-[var(--border-default)] lg:border-b-0 lg:border-r">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--success)]">Imputadas</h4>
                  <span className="text-xs font-bold text-[var(--success)]">{day.imputedTotal}h</span>
                </div>

                {day.imputedCards.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">Sin tarjetas imputadas.</p>
                ) : (
                  <div className="space-y-2">
                    {day.imputedCards.map((card: any) => (
                      <div key={`imputed-${day.date}-${card.taskId}`} className="rounded-lg border border-[var(--success-soft)] bg-[var(--success-soft-alt)] px-3 py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[var(--text-primary)] truncate" title={card.title}>{card.title}</div>
                          <div className="flex items-center gap-3 mt-1">
                            {card.url ? (
                              <a href={card.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--brand-primary)] hover:underline">Ver enlace</a>
                            ) : null}
                            <button type="button" onClick={() => openCommentsEditor(card.taskId, card.title)} className="text-[11px] text-[var(--success)] hover:underline">Comentarios {card.comments.length > 0 ? `(${card.comments.length})` : ''}</button>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[var,--success)] flex-shrink-0">{card.hours}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--danger)]">Sin imputar</h4>
                  <span className="text-xs font-bold text-[var,--danger)]">{day.pendingTotal}h</span>
                </div>

                {day.pendingCards.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">Sin tarjetas pendientes.</p>
                ) : (
                  <div className="space-y-2">
                    {day.pendingCards.map((card: any) => (
                      <div key={`pending-${day.date}-${card.taskId}`} className="rounded-lg border border-[var(--danger-soft)] bg-[var,--danger-soft-alt)] px-3 py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[var(--text-primary)] truncate" title={card.title}>{card.title}</div>
                          <div className="flex items-center gap-3 mt-1">
                            {card.url ? (
                              <a href={card.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--brand-primary)] hover:underline">Ver enlace</a>
                            ) : null}
                            <button type="button" onClick={() => openCommentsEditor(card.taskId, card.title)} className="text-[11px] text-[var,--danger)] hover:underline">Comentarios {card.comments.length > 0 ? `(${card.comments.length})` : ''}</button>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[var,--danger)] flex-shrink-0">{card.hours}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
