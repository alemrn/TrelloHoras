/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Plus, 
  Play, 
  Square, 
  Layout, 
  BarChart3, 
  History, 
  ExternalLink,
  Trash2,
  Calendar as CalendarIcon,
  Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TimeEntry, ActiveTimer } from './types';

const STORAGE_KEY = 'trello-time-entries';
const FALLBACK_CARD_TITLE = 'Trello Card';

const toTitleCase = (text: string) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const extractTitleFromUrl = (url: string) => {
  try {
    const { pathname } = new URL(url);
    const parts = pathname.split('/').filter(Boolean);
    const slug = parts.find(part => part.includes('-'));

    if (!slug) {
      return FALLBACK_CARD_TITLE;
    }

    const decodedSlug = decodeURIComponent(slug);
    const normalizedSlug = decodedSlug.replace(/^[^-]+-/, '').replace(/-/g, ' ').trim();

    return normalizedSlug ? toTitleCase(normalizedSlug) : FALLBACK_CARD_TITLE;
  } catch {
    return FALLBACK_CARD_TITLE;
  }
};

const normalizeEntries = (savedEntries: TimeEntry[]) =>
  savedEntries.map(entry => ({
    ...entry,
    cardTitle: extractTitleFromUrl(entry.cardUrl),
    imputed: Boolean(entry.imputed),
  }));

const formatISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentWeekdays = () => {
  const today = new Date();
  const currentDay = today.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() + diffToMonday);

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
};

const weekdayLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export default function App() {
  const [entries, setEntries] = useState<TimeEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeEntries(JSON.parse(saved)) : [];
  });
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [view, setView] = useState<'tracker' | 'summary'>('tracker');
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - activeTimer.startTime) / 1000));
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const roundToHalf = (hours: number) => {
    return Math.ceil(hours * 2) / 2;
  };

  const handleStartTimer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUrl) return;
    
    setActiveTimer({
      cardUrl: tempUrl,
      cardTitle: extractTitleFromUrl(tempUrl),
      startTime: Date.now()
    });
    setTempUrl('');
    setIsTimerModalOpen(false);
  };

  const handleStopTimer = () => {
    if (!activeTimer) return;
    
    const hours = elapsedSeconds / 3600;
    const roundedHours = roundToHalf(hours);
    
    const newEntry: TimeEntry = {
      id: crypto.randomUUID(),
      cardUrl: activeTimer.cardUrl,
      cardTitle: activeTimer.cardTitle,
      date: new Date().toISOString().split('T')[0],
      hours: Math.max(0.5, roundedHours), // Minimum 0.5 if started
      imputed: false,
    };

    setEntries(prev => [newEntry, ...prev]);
    setActiveTimer(null);
  };

  const handleManualAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const url = formData.get('url') as string;
    const hoursInput = parseFloat(formData.get('hours') as string);
    
    if (!url || isNaN(hoursInput)) return;

    const roundedHours = roundToHalf(hoursInput);

    const newEntry: TimeEntry = {
      id: crypto.randomUUID(),
      cardUrl: url,
      cardTitle: extractTitleFromUrl(url),
      date: new Date().toISOString().split('T')[0],
      hours: roundedHours,
      imputed: false,
    };

    setEntries(prev => [newEntry, ...prev]);
    setIsAddingManual(false);
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleToggleImputed = (id: string) => {
    setEntries(prev =>
      prev.map(entry =>
        entry.id === id ? { ...entry, imputed: !entry.imputed } : entry
      )
    );
  };

  // Summaries
  const dailySummary = useMemo(() => {
    const summary: Record<
      string,
      {
        total: number;
        imputedTotal: number;
        pendingTotal: number;
        imputedCards: Record<string, { title: string; hours: number; url: string }>;
        pendingCards: Record<string, { title: string; hours: number; url: string }>;
      }
    > = {};

    entries.forEach(e => {
      if (!summary[e.date]) {
        summary[e.date] = {
          total: 0,
          imputedTotal: 0,
          pendingTotal: 0,
          imputedCards: {},
          pendingCards: {},
        };
      }

      const daySummary = summary[e.date];
      daySummary.total += e.hours;

      if (e.imputed) {
        daySummary.imputedTotal += e.hours;
        if (!daySummary.imputedCards[e.cardUrl]) {
          daySummary.imputedCards[e.cardUrl] = { title: e.cardTitle, hours: 0, url: e.cardUrl };
        }
        daySummary.imputedCards[e.cardUrl].hours += e.hours;
      } else {
        daySummary.pendingTotal += e.hours;
        if (!daySummary.pendingCards[e.cardUrl]) {
          daySummary.pendingCards[e.cardUrl] = { title: e.cardTitle, hours: 0, url: e.cardUrl };
        }
        daySummary.pendingCards[e.cardUrl].hours += e.hours;
      }
    });

    return Object.entries(summary)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, daySummary]) => ({
        date,
        total: daySummary.total,
        imputedTotal: daySummary.imputedTotal,
        pendingTotal: daySummary.pendingTotal,
        imputedCards: Object.values(daySummary.imputedCards).sort((a, b) => b.hours - a.hours),
        pendingCards: Object.values(daySummary.pendingCards).sort((a, b) => b.hours - a.hours),
      }));
  }, [entries]);

  const weeklySummary = useMemo(() => {
    const summaryByDate = entries.reduce<Record<string, { imputed: number; pending: number }>>((acc, entry) => {
      if (!acc[entry.date]) {
        acc[entry.date] = { imputed: 0, pending: 0 };
      }

      if (entry.imputed) {
        acc[entry.date].imputed += entry.hours;
      } else {
        acc[entry.date].pending += entry.hours;
      }

      return acc;
    }, {});

    return getCurrentWeekdays().map((date, index) => {
      const isoDate = formatISODate(date);
      const totals = summaryByDate[isoDate] ?? { imputed: 0, pending: 0 };

      return {
        label: weekdayLabels[index],
        date: isoDate,
        imputedTotal: totals.imputed,
        pendingTotal: totals.pending,
        total: totals.imputed + totals.pending,
      };
    });
  }, [entries]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#172B4D] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-[#DFE1E6] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#0052CC] p-1.5 rounded-md">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#0052CC]">TrelloTime</h1>
          </div>
          
          <nav className="flex gap-1 bg-[#EBECF0] p-1 rounded-lg">
            <button 
              onClick={() => setView('tracker')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === 'tracker' ? 'bg-white shadow-sm text-[#0052CC]' : 'text-[#5E6C84] hover:bg-[#DFE1E6]'}`}
            >
              <Layout className="w-4 h-4" />
              Tracker
            </button>
            <button 
              onClick={() => setView('summary')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === 'summary' ? 'bg-white shadow-sm text-[#0052CC]' : 'text-[#5E6C84] hover:bg-[#DFE1E6]'}`}
            >
              <BarChart3 className="w-4 h-4" />
              Resumen
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {view === 'tracker' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Controls */}
            <div className="lg:col-span-1 space-y-6">
              {/* Active Timer Card */}
              <div className="bg-white rounded-xl border border-[#DFE1E6] p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-[#5E6C84] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  Cronómetro
                </h2>
                
                {activeTimer ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-mono font-bold text-[#172B4D] mb-1">
                        {formatTime(elapsedSeconds)}
                      </div>
                      <p className="text-sm text-[#5E6C84] truncate px-2" title={activeTimer.cardTitle}>
                        {activeTimer.cardTitle}
                      </p>
                    </div>
                    <button 
                      onClick={handleStopTimer}
                      className="w-full py-3 bg-[#EB5A46] hover:bg-[#CF513D] text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      Detener y Guardar
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsTimerModalOpen(true)}
                    className="w-full py-3 bg-[#0052CC] hover:bg-[#0747A6] text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Iniciar Tarea
                  </button>
                )}
              </div>

              {/* Timer Modal */}
              <AnimatePresence>
                {isTimerModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
                    >
                      <div className="p-6">
                        <h3 className="text-lg font-bold text-[#172B4D] mb-4">Nueva Tarea</h3>
                        <form onSubmit={handleStartTimer} className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-[#5E6C84] mb-1 uppercase">Enlace de la tarjeta de Trello</label>
                            <input 
                              autoFocus
                              required
                              value={tempUrl}
                              onChange={(e) => setTempUrl(e.target.value)}
                              placeholder="https://trello.com/c/..."
                              className="w-full px-3 py-2 bg-[#FAFBFC] border border-[#DFE1E6] rounded-md text-sm focus:ring-2 focus:ring-[#0052CC] focus:border-transparent outline-none"
                            />
                          </div>
                          <div className="flex gap-3 pt-2">
                            <button 
                              type="submit"
                              className="flex-1 py-2.5 bg-[#0052CC] text-white rounded-md font-bold hover:bg-[#0747A6] transition-colors"
                            >
                              Iniciar Cronómetro
                            </button>
                            <button 
                              type="button"
                              onClick={() => {
                                setIsTimerModalOpen(false);
                                setTempUrl('');
                              }}
                              className="px-4 py-2.5 bg-[#EBECF0] text-[#172B4D] rounded-md font-bold hover:bg-[#DFE1E6] transition-colors"
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
              <div className="bg-white rounded-xl border border-[#DFE1E6] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-[#5E6C84] uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Añadir Manual
                  </h2>
                </div>
                
                {!isAddingManual ? (
                  <button 
                    onClick={() => setIsAddingManual(true)}
                    className="w-full py-2 border-2 border-dashed border-[#DFE1E6] text-[#5E6C84] hover:border-[#0052CC] hover:text-[#0052CC] rounded-lg text-sm font-medium transition-all"
                  >
                    Registrar horas manualmente
                  </button>
                ) : (
                  <form onSubmit={handleManualAdd} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#5E6C84] mb-1">URL DE TRELLO</label>
                      <input 
                        name="url"
                        required
                        placeholder="https://trello.com/c/..."
                        className="w-full px-3 py-2 bg-[#FAFBFC] border border-[#DFE1E6] rounded-md text-sm focus:ring-2 focus:ring-[#0052CC] focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#5E6C84] mb-1">HORAS</label>
                      <input 
                        name="hours"
                        type="number"
                        step="0.5"
                        required
                        placeholder="Ej: 1.5"
                        className="w-full px-3 py-2 bg-[#FAFBFC] border border-[#DFE1E6] rounded-md text-sm focus:ring-2 focus:ring-[#0052CC] focus:border-transparent outline-none"
                      />
                      <p className="text-[10px] text-[#5E6C84] mt-1 italic">* Se redondeará al múltiplo de 0.5 superior</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="submit"
                        className="flex-1 py-2 bg-[#0052CC] text-white rounded-md text-sm font-bold hover:bg-[#0747A6]"
                      >
                        Guardar
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsAddingManual(false)}
                        className="px-4 py-2 bg-[#EBECF0] text-[#172B4D] rounded-md text-sm font-bold hover:bg-[#DFE1E6]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Right Column: List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <History className="w-5 h-5 text-[#0052CC]" />
                  Historial Reciente
                </h2>
                <span className="text-xs font-medium bg-[#DFE1E6] text-[#172B4D] px-2 py-1 rounded-full">
                  {entries.length} registros
                </span>
              </div>

              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {entries.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white rounded-xl border border-[#DFE1E6] p-12 text-center"
                    >
                      <div className="bg-[#EBECF0] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-[#5E6C84]" />
                      </div>
                      <h3 className="text-[#172B4D] font-bold">No hay registros aún</h3>
                      <p className="text-[#5E6C84] text-sm mt-1">Empieza a trackear tu tiempo en Trello.</p>
                    </motion.div>
                  ) : (
                    entries.map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-white rounded-xl border border-[#DFE1E6] p-4 flex items-center justify-between group hover:border-[#0052CC] transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-4 overflow-hidden">
                          <label className="flex items-center justify-center flex-shrink-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={entry.imputed}
                              onChange={() => handleToggleImputed(entry.id)}
                              className="h-4 w-4 rounded border-[#C1C7D0] text-[#0052CC] focus:ring-[#0052CC]"
                              aria-label={`Marcar ${entry.cardTitle} como imputada`}
                            />
                          </label>
                          <div className="bg-[#DEEBFF] text-[#0052CC] p-2.5 rounded-lg flex-shrink-0">
                            <Layout className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-[#172B4D] truncate pr-4" title={entry.cardTitle}>
                              {entry.cardTitle}
                            </h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-[#5E6C84] flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                {entry.date}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${entry.imputed ? 'bg-[#E3FCEF] text-[#006644]' : 'bg-[#FFEBE6] text-[#BF2600]'}`}>
                                {entry.imputed ? 'Imputada' : 'Sin imputar'}
                              </span>
                              <a 
                                href={entry.cardUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-[#0052CC] hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Ver en Trello
                              </a>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-lg font-bold text-[#0052CC]">{entry.hours}h</span>
                          </div>
                          <button 
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-2 text-[#EB5A46] hover:bg-[#FFEBE6] rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {weeklySummary.length > 0 && (
              <section className="bg-white rounded-lg border border-[#DFE1E6] shadow-sm overflow-hidden">
                <div className="px-4 py-2 border-b border-[#DFE1E6] bg-[#F4F5F7] flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-[#172B4D] leading-tight">Resumen semanal</h3>
                    <p className="text-xs text-[#5E6C84] leading-tight">Semana actual, lunes a viernes</p>
                  </div>
                  <span className="text-[11px] font-medium bg-[#DFE1E6] text-[#172B4D] px-2 py-1 rounded-full whitespace-nowrap">
                    {weeklySummary.reduce((total, day) => total + day.total, 0)}h totales
                  </span>
                </div>

                <div className="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-2 p-2.5">
                  {weeklySummary.map((day) => (
                    <article
                      key={day.date}
                      className="min-w-0 rounded-md border border-[#DFE1E6] bg-[#FAFBFC] p-2 flex flex-col gap-1.5"
                    >
                      <div className="pb-1.5 border-b border-[#DFE1E6]">
                        <p className="text-[13px] font-bold text-[#172B4D] leading-none truncate">{day.label}</p>
                        <p className="text-[10px] text-[#5E6C84] mt-1 leading-none truncate">{day.date}</p>
                      </div>

                      <div className="space-y-1">
                        <div className="rounded-md bg-[#DEEBFF] px-2 py-1.5">
                          <p className="text-[8px] font-bold uppercase tracking-wide text-[#0747A6] leading-none">Total</p>
                          <p className="text-sm font-bold text-[#0052CC] leading-none mt-1">{day.total}h</p>
                        </div>
                        <div className="rounded-md bg-[#F3FFF8] px-2 py-1.5">
                          <p className="text-[8px] font-bold uppercase tracking-wide text-[#006644] leading-none">Imputadas</p>
                          <p className="text-xs font-bold text-[#006644] leading-none mt-1">{day.imputedTotal}h</p>
                        </div>
                        <div className="rounded-md bg-[#FFF7F3] px-2 py-1.5">
                          <p className="text-[8px] font-bold uppercase tracking-wide text-[#BF2600] leading-none">Sin imputar</p>
                          <p className="text-xs font-bold text-[#BF2600] leading-none mt-1">{day.pendingTotal}h</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#0052CC]" />
                Resumen por Día
              </h2>
              <span className="text-xs font-medium bg-[#DFE1E6] text-[#172B4D] px-2 py-1 rounded-full">
                {dailySummary.length} días
              </span>
            </div>

            {dailySummary.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#DFE1E6] p-12 text-center shadow-sm">
                <div className="bg-[#EBECF0] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="w-8 h-8 text-[#5E6C84]" />
                </div>
                <h3 className="text-[#172B4D] font-bold">Sin datos disponibles</h3>
                <p className="text-[#5E6C84] text-sm mt-1">Añade registros para ver resumen diario.</p>
              </div>
            ) : (
              dailySummary.map((day) => (
                <section key={day.date} className="bg-white rounded-xl border border-[#DFE1E6] shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#DFE1E6] bg-[#F4F5F7] flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#172B4D] leading-tight">{day.date}</h3>
                      <p className="text-xs text-[#5E6C84] mt-1">Total {day.total}h</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-[#E3FCEF] text-[#006644] whitespace-nowrap">
                        Imputadas {day.imputedTotal}h
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-[#FFEBE6] text-[#BF2600] whitespace-nowrap">
                        Sin imputar {day.pendingTotal}h
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="p-4 border-b border-[#DFE1E6] lg:border-b-0 lg:border-r">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#006644]">Imputadas</h4>
                        <span className="text-xs font-bold text-[#006644]">{day.imputedTotal}h</span>
                      </div>

                      {day.imputedCards.length === 0 ? (
                        <p className="text-xs text-[#5E6C84]">Sin tarjetas imputadas.</p>
                      ) : (
                        <div className="space-y-2">
                          {day.imputedCards.map((card) => (
                            <div key={`imputed-${day.date}-${card.url}`} className="rounded-lg border border-[#E3FCEF] bg-[#F3FFF8] px-3 py-2 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-[#172B4D] truncate" title={card.title}>{card.title}</div>
                                <a href={card.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#0052CC] hover:underline">
                                  Ver enlace
                                </a>
                              </div>
                              <span className="text-xs font-bold text-[#006644] flex-shrink-0">{card.hours}h</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#BF2600]">Sin imputar</h4>
                        <span className="text-xs font-bold text-[#BF2600]">{day.pendingTotal}h</span>
                      </div>

                      {day.pendingCards.length === 0 ? (
                        <p className="text-xs text-[#5E6C84]">Sin tarjetas pendientes.</p>
                      ) : (
                        <div className="space-y-2">
                          {day.pendingCards.map((card) => (
                            <div key={`pending-${day.date}-${card.url}`} className="rounded-lg border border-[#FFEBE6] bg-[#FFF7F3] px-3 py-2 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-[#172B4D] truncate" title={card.title}>{card.title}</div>
                                <a href={card.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#0052CC] hover:underline">
                                  Ver enlace
                                </a>
                              </div>
                              <span className="text-xs font-bold text-[#BF2600] flex-shrink-0">{card.hours}h</span>
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
        )}
      </main>
    </div>
  );
}
