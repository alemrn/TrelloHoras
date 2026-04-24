/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Timer,
  Pencil,
  MessageSquare,
  X,
  Moon,
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Button, { IconButton } from './components/Button';
import ActiveTimerCard from './components/ActiveTimerCard';
import EntriesList from './components/EntriesList';
import TrackerView from './components/TrackerView';
import SummaryView from './components/SummaryView';
import ImputeModal from './components/ImputeModal';
import Header from './components/Header';
import { TimeEntry, ActiveTimer } from './types';
import {
  STORAGE_KEY,
  ROUNDING_MODE_KEY,
  THEME_MODE_KEY,
  FALLBACK_CARD_TITLE,
  FALLBACK_TASK_TITLE,
  generateUUID,
  toTitleCase,
  extractTitleFromUrl,
  isValidHttpUrl,
  normalizeTaskTitle,
  normalizeTaskIdentity,
  buildTaskKey,
  buildLegacyTaskId,
  normalizeEntries,
  formatISODate,
  getCurrentWeekdays,
  weekdayLabels,
  roundHours,
} from './utils';

type TaskInputMode = 'url' | 'name';

export default function App() {
  const [entries, setEntries] = useState<TimeEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeEntries(JSON.parse(saved)) : [];
  });
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [view, setView] = useState<'tracker' | 'summary'>('tracker');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_MODE_KEY);

    if (savedTheme) {
      return savedTheme === 'dark';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isRoundModeEnabled, setIsRoundModeEnabled] = useState(() => {
    const savedMode = localStorage.getItem(ROUNDING_MODE_KEY);
    return savedMode ? savedMode === 'true' : true;
  });
  // Paso de redondeo activo: 0.25 si está activado el modo 'round', 0.5 si no
  const roundingStep = isRoundModeEnabled ? 0.25 : 0.5;
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [timerInputMode, setTimerInputMode] = useState<TaskInputMode>('url');
  const [tempTaskValue, setTempTaskValue] = useState('');
  const [tempTimerComment, setTempTimerComment] = useState('');
  const [manualInputMode, setManualInputMode] = useState<TaskInputMode>('url');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingMode, setEditingMode] = useState<TaskInputMode>('name');
  const [editingUrlValue, setEditingUrlValue] = useState('');
  const [editingNameValue, setEditingNameValue] = useState('');
  const [editingHours, setEditingHours] = useState('');
  const [commentTaskId, setCommentTaskId] = useState<string | null>(null);
  const [commentTaskTitle, setCommentTaskTitle] = useState('');
  const [commentDrafts, setCommentDrafts] = useState<string[]>([]);
  const commentInputRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const pendingCommentFocusIndex = useRef<number | null>(null);

  // Estado para el modal de imputar horas
  const [imputeEntryId, setImputeEntryId] = useState<string | null>(null);
  const [imputeNick, setImputeNick] = useState<string>('');
  const [imputeCategory, setImputeCategory] = useState<'Desarrollo' | 'Gestion' | 'Validación' | 'Producción'>('Desarrollo');
  // Estado de envío y error para la llamada a Trello
  const [isImputing, setIsImputing] = useState(false);
  const [imputeError, setImputeError] = useState<string | null>(null);

  const imputeEntry = useMemo(() => imputeEntryId ? entries.find(e => e.id === imputeEntryId) ?? null : null, [entries, imputeEntryId]);

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem(ROUNDING_MODE_KEY, String(isRoundModeEnabled));
  }, [isRoundModeEnabled]);

  useEffect(() => {
    localStorage.setItem(THEME_MODE_KEY, isDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

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

  const findTaskId = (cardUrl?: string | null, cardTitle?: string | null, excludedTaskId?: string | null) => {
    const taskKey = buildTaskKey(cardUrl, cardTitle);

    return entries.find(entry => (
      entry.taskId !== excludedTaskId &&
      buildTaskKey(entry.cardUrl, entry.cardTitle) === taskKey
    ))?.taskId;
  };

  const getTaskComments = (taskId?: string | null) =>
    taskId
      ? entries.find(entry => entry.taskId === taskId)?.comments ?? []
      : [];

  const normalizeComments = (comments: string[]) =>
    comments.map(comment => comment.trim()).filter(Boolean);

  const buildNextTaskComments = (taskId: string, newComments: string[] = []) =>
    normalizeComments([...getTaskComments(taskId), ...newComments]);

  const syncTaskComments = (taskId: string, comments: string[]) => {
    setEntries(prev =>
      prev.map(entry =>
        entry.taskId === taskId
          ? { ...entry, comments }
          : entry
      )
    );
  };

  const handleStartTimer = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedValue = tempTaskValue.trim();
    if (!trimmedValue) return;
    if (timerInputMode === 'url' && !isValidHttpUrl(trimmedValue)) return;

    const nextCardUrl = timerInputMode === 'url' ? trimmedValue : null;
    const nextCardTitle = timerInputMode === 'url'
      ? extractTitleFromUrl(trimmedValue)
      : normalizeTaskTitle(trimmedValue);
    const taskId = findTaskId(nextCardUrl, nextCardTitle) || generateUUID();
    const nextComments = buildNextTaskComments(taskId, [tempTimerComment]);

    if (nextComments.length > 0) {
      syncTaskComments(taskId, nextComments);
    }
    
    setActiveTimer({
      taskId,
      cardUrl: nextCardUrl,
      cardTitle: nextCardTitle,
      comments: nextComments,
      startTime: Date.now()
    });
    setTempTaskValue('');
    setTempTimerComment('');
    setTimerInputMode('url');
    setIsTimerModalOpen(false);
  };

  const handleStopTimer = () => {
    if (!activeTimer) return;
    
    const hours = elapsedSeconds / 3600;
    const roundedHours = roundHours(hours, roundingStep);
    
    const newEntry: TimeEntry = {
      id: generateUUID(),
      taskId: activeTimer.taskId,
      cardUrl: activeTimer.cardUrl,
      cardTitle: activeTimer.cardTitle,
      comments: activeTimer.comments ?? getTaskComments(activeTimer.taskId),
      date: new Date().toISOString().split('T')[0],
      hours: Math.max(0.25, roundedHours),
      imputed: false,
    };

    setEntries(prev => [newEntry, ...prev]);
    setActiveTimer(null);
  };

  const handleManualAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const mode = formData.get('taskMode') as TaskInputMode;
    const taskValue = (formData.get(mode === 'url' ? 'url' : 'title') as string)?.trim();
    const hoursInput = parseFloat(formData.get('hours') as string);
    const commentInput = (formData.get('comment') as string)?.trim() ?? '';
    
    if (!taskValue || isNaN(hoursInput)) return;
    if (mode === 'url' && !isValidHttpUrl(taskValue)) return;

    const roundedHours = roundHours(hoursInput, roundingStep);
    const cardUrl = mode === 'url' ? taskValue : null;
    const cardTitle = mode === 'url' ? extractTitleFromUrl(taskValue) : normalizeTaskTitle(taskValue);
    const taskId = findTaskId(cardUrl, cardTitle) || generateUUID();
    const comments = buildNextTaskComments(taskId, [commentInput]);

    if (comments.length > 0) {
      syncTaskComments(taskId, comments);
    }

    const newEntry: TimeEntry = {
      id: generateUUID(),
      taskId,
      cardUrl,
      cardTitle,
      comments,
      date: new Date().toISOString().split('T')[0],
      hours: roundedHours,
      imputed: false,
    };

    setEntries(prev => [newEntry, ...prev]);
    setIsAddingManual(false);
  };

  const openTaskEditor = (entry: TimeEntry) => {
    setEditingEntryId(entry.id);
    setEditingTaskId(entry.taskId);
    setEditingMode(entry.cardUrl ? 'url' : 'name');
    setEditingUrlValue(entry.cardUrl || '');
    setEditingNameValue(entry.cardUrl ? '' : entry.cardTitle || '');
    setEditingHours(entry.hours.toString());
  };

  const handleSaveTaskEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTaskId || !editingEntryId) return;

    const trimmedValue = (editingMode === 'url' ? editingUrlValue : editingNameValue).trim();
    if (!trimmedValue) return;
    if (editingMode === 'url' && !isValidHttpUrl(trimmedValue)) return;

    const hoursInput = parseFloat(editingHours);
    if (isNaN(hoursInput) || hoursInput <= 0) return;

    const nextCardUrl = editingMode === 'url' ? trimmedValue : null;
    const nextCardTitle = editingMode === 'url'
      ? extractTitleFromUrl(trimmedValue)
      : normalizeTaskTitle(trimmedValue);
    const nextTaskId = findTaskId(nextCardUrl, nextCardTitle, editingTaskId) || editingTaskId;
    const roundedHours = roundHours(hoursInput, roundingStep);
    const nextComments = nextTaskId === editingTaskId
      ? getTaskComments(editingTaskId)
      : getTaskComments(nextTaskId);

    setEntries(prev =>
      prev.map(entry =>
        entry.taskId === editingTaskId || entry.id === editingEntryId
          ? {
              ...entry,
              ...(entry.taskId === editingTaskId ? {
                taskId: nextTaskId,
                cardUrl: nextCardUrl,
                cardTitle: nextCardTitle,
                comments: nextComments,
              } : {}),
              ...(entry.id === editingEntryId ? {
                hours: roundedHours,
              } : {}),
            }
          : entry
      )
    );

    setEditingEntryId(null);
    setEditingTaskId(null);
    setEditingMode('name');
    setEditingUrlValue('');
    setEditingNameValue('');
    setEditingHours('');
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

  // Abrir modal de imputar: precargar nick si existe en localStorage
  const openImputeModal = (entry: TimeEntry) => {
    const savedNick = localStorage.getItem('trello-nick') || '';
    setImputeNick(savedNick);
    setImputeCategory('Desarrollo');
    setImputeEntryId(entry.id);
  };

  const closeImputeModal = () => {
    setImputeEntryId(null);
    setImputeNick('');
    setImputeCategory('Desarrollo');
  };

  const handleImputeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!imputeEntryId) return;
    const nick = imputeNick.trim();
    if (!nick) return;

    // Persistir nick para próximas veces
    localStorage.setItem('trello-nick', nick);

    setIsImputing(true);
    setImputeError(null);

    try {
      const entry = entries.find(en => en.id === imputeEntryId);
      if (entry && entry.cardUrl) {
        // push to Trello: may throw on network or validation errors
        //await addHoursToCard(entry.cardUrl, entry.hours, nick);
      }

      setEntries(prev =>
        prev.map(entry =>
          entry.id === imputeEntryId
            ? { ...entry, imputed: true, imputedBy: nick, imputedCategory: imputeCategory }
            : entry
        )
      );

      closeImputeModal();
    } catch (err) {
      setImputeError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsImputing(false);
    }
  };

  const openCommentsEditor = (taskId: string, title: string) => {
    setCommentTaskId(taskId);
    setCommentTaskTitle(title);
    setCommentDrafts(getTaskComments(taskId));
  };

  const closeCommentsEditor = () => {
    setCommentTaskId(null);
    setCommentTaskTitle('');
    setCommentDrafts([]);
  };

  const handleCommentDraftChange = (index: number, value: string) => {
    setCommentDrafts(prev => prev.map((comment, commentIndex) => commentIndex === index ? value : comment));
  };

  const handleAddCommentDraft = () => {
    setCommentDrafts(prev => {
      pendingCommentFocusIndex.current = prev.length;
      return [...prev, ''];
    });
  };

  const handleDeleteCommentDraft = (index: number) => {
    setCommentDrafts(prev => prev.filter((_, commentIndex) => commentIndex !== index));
  };

  const handleSaveComments = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!commentTaskId) return;

    const nextComments = normalizeComments(commentDrafts);

    setEntries(prev =>
      prev.map(entry =>
        entry.taskId === commentTaskId
          ? { ...entry, comments: nextComments }
          : entry
      )
    );

    closeCommentsEditor();
  };

  useEffect(() => {
    if (pendingCommentFocusIndex.current === null) return;

    const nextInput = commentInputRefs.current[pendingCommentFocusIndex.current];
    if (nextInput) {
      nextInput.focus();
      pendingCommentFocusIndex.current = null;
    }
  }, [commentDrafts]);

  // Summaries
  const dailySummary = useMemo(() => {
    const summary: Record<
      string,
      {
        total: number;
        imputedTotal: number;
        pendingTotal: number;
        imputedCards: Record<string, { taskId: string; title: string; hours: number; url: string | null; comments: string[] }>;
        pendingCards: Record<string, { taskId: string; title: string; hours: number; url: string | null; comments: string[] }>;
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
        if (!daySummary.imputedCards[e.taskId]) {
          daySummary.imputedCards[e.taskId] = { taskId: e.taskId, title: e.cardTitle, hours: 0, url: e.cardUrl ?? null, comments: e.comments ?? [] };
        }
        daySummary.imputedCards[e.taskId].hours += e.hours;
      } else {
        daySummary.pendingTotal += e.hours;
        if (!daySummary.pendingCards[e.taskId]) {
          daySummary.pendingCards[e.taskId] = { taskId: e.taskId, title: e.cardTitle, hours: 0, url: e.cardUrl ?? null, comments: e.comments ?? [] };
        }
        daySummary.pendingCards[e.taskId].hours += e.hours;
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
    <div className="min-h-screen bg-(--bg-app) text-(--text-primary) font-sans transition-colors">
      {/* Header */}
      <Header
        initialView={view}
        onViewChange={setView}
        initialIsDarkMode={isDarkMode}
        onThemeChange={setIsDarkMode}
      />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {view === 'tracker' ? (
          <TrackerView
            entries={entries}
            activeTimer={activeTimer}
            elapsedSeconds={elapsedSeconds}
            isTimerModalOpen={isTimerModalOpen}
            setIsTimerModalOpen={setIsTimerModalOpen}
            timerInputMode={timerInputMode}
            setTimerInputMode={setTimerInputMode}
            tempTaskValue={tempTaskValue}
            setTempTaskValue={setTempTaskValue}
            tempTimerComment={tempTimerComment}
            setTempTimerComment={setTempTimerComment}
            isAddingManual={isAddingManual}
            setIsAddingManual={setIsAddingManual}
            manualInputMode={manualInputMode}
            setManualInputMode={setManualInputMode}
            handleStartTimer={handleStartTimer}
            handleStopTimer={handleStopTimer}
            handleManualAdd={handleManualAdd}
            isRoundModeEnabled={isRoundModeEnabled}
            onToggleRoundMode={() => setIsRoundModeEnabled(prev => !prev)}
            formatTime={formatTime}
            openCommentsEditor={openCommentsEditor}
            openTaskEditor={openTaskEditor}
            openImputeModal={openImputeModal}
            handleDeleteEntry={handleDeleteEntry}
            handleToggleImputed={handleToggleImputed}
          />
        ) : (
          <SummaryView
            weeklySummary={weeklySummary}
            dailySummary={dailySummary}
            openCommentsEditor={openCommentsEditor}
          />
        )}
      </main>

      <AnimatePresence>
        {commentTaskId ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-(--overlay) backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-(--bg-surface) rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-(--border-default) flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-(--text-primary)">Comentarios tarea</h3>
                  <p className="text-sm text-(--text-muted) truncate mt-1" title={commentTaskTitle}>{commentTaskTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={closeCommentsEditor}
                  className="p-2 text-(--text-muted) hover:bg-(--bg-surface-muted) rounded-lg"
                  aria-label="Cerrar comentarios"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveComments} className="p-6 space-y-4">
                <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
                  {commentDrafts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-(--border-default) bg-(--bg-surface-soft) px-4 py-6 text-sm text-(--text-muted) text-center">
                      Sin comentarios. Añade uno.
                    </div>
                  ) : (
                    commentDrafts.map((comment, index) => (
                      <div key={`${commentTaskId}-${index}`} className="rounded-lg border border-(--border-default) bg-(--bg-surface-soft) p-3 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold uppercase tracking-wide text-(--text-muted)">Comentario {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteCommentDraft(index)}
                            className="text-xs font-bold text-(--danger-action) hover:underline"
                          >
                            Borrar
                          </button>
                        </div>
                        <textarea
                          ref={element => {
                            commentInputRefs.current[index] = element;
                          }}
                          value={comment}
                          onChange={(e) => handleCommentDraftChange(index, e.target.value)}
                          rows={3}
                          placeholder="Escribe comentario"
                          className="w-full px-3 py-2 bg-(--bg-surface) border border-(--border-default) rounded-md text-sm focus:ring-2 focus:ring-(--brand-primary) focus:border-transparent outline-none resize-y"
                        />
                      </div>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddCommentDraft}
                  className="w-full py-2 border-2 border-dashed border-(--border-default) text-(--text-muted) hover:border-(--brand-primary) hover:text-(--brand-primary) rounded-lg text-sm font-medium transition-all"
                >
                  Añadir comentario
                </button>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-(--brand-primary) text-(--text-inverse) rounded-md font-bold hover:bg-(--brand-primary-hover) transition-colors"
                  >
                    Guardar comentarios
                  </button>
                  <button
                    type="button"
                    onClick={closeCommentsEditor}
                    className="px-4 py-2.5 bg-(--bg-surface-muted) text-(--text-primary) rounded-md font-bold hover:bg-(--border-default) transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {editingTaskId ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-(--overlay) backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-(--bg-surface) rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-bold text-(--text-primary) mb-4">Editar tarea</h3>
                <form onSubmit={handleSaveTaskEdit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-(--bg-surface-muted) p-1">
                    <button
                      type="button"
                      onClick={() => setEditingMode('url')}
                      className={`rounded-md px-3 py-2 text-sm font-bold transition-colors ${editingMode === 'url' ? 'bg-(--bg-surface) text-(--brand-primary) shadow-sm' : 'text-(--text-muted)'}`}
                    >
                      URL Trello
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMode('name')}
                      className={`rounded-md px-3 py-2 text-sm font-bold transition-colors ${editingMode === 'name' ? 'bg-(--bg-surface) text-(--brand-primary) shadow-sm' : 'text-(--text-muted)'}`}
                    >
                      Tarea provisional
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-(--text-muted) mb-1 uppercase">
                      {editingMode === 'url' ? 'Nueva URL Trello' : 'Nombre tarea'}
                    </label>
                    <input
                      autoFocus
                      required
                      value={editingMode === 'url' ? editingUrlValue : editingNameValue}
                      onChange={(e) => editingMode === 'url'
                        ? setEditingUrlValue(e.target.value)
                        : setEditingNameValue(e.target.value)}
                      placeholder={editingMode === 'url' ? 'https://trello.com/c/...' : 'Ej: Revisión backlog sprint'}
                      className="w-full px-3 py-2 bg-(--bg-surface-soft) border border-(--border-default) rounded-md text-sm focus:ring-2 focus:ring-(--brand-primary) focus:border-transparent outline-none"
                    />
                    <p className="text-[10px] text-(--text-muted) mt-1 italic">* Cambio aplica a todos registros misma tarea.</p>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-(--text-muted) mb-1 uppercase">Horas registro</label>
                    <input
                      type="number"
                      step={0.25}
                      min={0.25}
                      required
                      value={editingHours}
                      onChange={(e) => setEditingHours(e.target.value)}
                      className="w-full px-3 py-2 bg-(--bg-surface-soft) border border-(--border-default) rounded-md text-sm focus:ring-2 focus:ring-(--brand-primary) focus:border-transparent outline-none"
                    />
                    <p className="text-[10px] text-(--text-muted) mt-1 italic">* Horas solo cambian este registro. Redondeo {roundingStep} arriba.</p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="submit" className="flex-1 py-2 text-sm">Guardar</Button>
                    <Button variant="secondary" type="button" onClick={() => {
                       setEditingEntryId(null);
                       setEditingTaskId(null);
                       setEditingMode('name');
                       setEditingUrlValue('');
                       setEditingNameValue('');
                       setEditingHours('');
                     }} className="px-4 py-2 text-sm">Cancelar</Button>
                   </div>
                </form>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {/* Modal Imputar Horas */}
      <AnimatePresence>
        {imputeEntryId ? (
          <ImputeModal
            imputeEntryTitle={imputeEntry?.cardTitle ?? ''}
            imputeNick={imputeNick}
            setImputeNick={setImputeNick}
            imputeCategory={imputeCategory}
            setImputeCategory={setImputeCategory}
            handleImputeSubmit={handleImputeSubmit}
            closeImputeModal={closeImputeModal}
            isSubmitting={isImputing}
            error={imputeError}
          />
        ) : null}
      </AnimatePresence>

    </div>
  );
}
