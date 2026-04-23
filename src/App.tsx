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
import { TimeEntry, ActiveTimer } from './types';

const STORAGE_KEY = 'trello-time-entries';
const ROUNDING_MODE_KEY = 'trello-time-rounding-mode';
const THEME_MODE_KEY = 'trello-time-theme-mode';
const FALLBACK_CARD_TITLE = 'Trello Card';
const FALLBACK_TASK_TITLE = 'Tarea sin nombre';

type TaskInputMode = 'url' | 'name';

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
    const normalizedSlug = decodedSlug.replace(/-/g, ' ').trim();

    return normalizedSlug ? toTitleCase(normalizedSlug) : FALLBACK_CARD_TITLE;
  } catch {
    return FALLBACK_CARD_TITLE;
  }
};

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const normalizeTaskTitle = (title?: string | null) => {
  const trimmedTitle = title?.replace(/\s+/g, ' ').trim();
  return trimmedTitle || FALLBACK_TASK_TITLE;
};

const normalizeTaskIdentity = (title?: string | null) =>
  normalizeTaskTitle(title)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();

const buildTaskKey = (cardUrl?: string | null, cardTitle?: string | null) => {
  if (cardUrl?.trim()) {
    return `url:${cardUrl.trim()}`;
  }

  return `title:${normalizeTaskIdentity(cardTitle)}`;
};

const buildLegacyTaskId = (entry: Partial<TimeEntry>) => {
  const rawKey = entry.cardUrl?.trim() || entry.cardTitle?.trim() || crypto.randomUUID();
  return `legacy:${rawKey}`;
};

const normalizeEntries = (savedEntries: TimeEntry[]) =>
  savedEntries.reduce<TimeEntry[]>((acc, entry) => {
    const cardUrl = entry.cardUrl?.trim() || null;
    const cardTitle = cardUrl ? extractTitleFromUrl(cardUrl) : normalizeTaskTitle(entry.cardTitle);
    const taskKey = buildTaskKey(cardUrl, cardTitle);
    const sharedTaskId = acc.find(savedEntry => buildTaskKey(savedEntry.cardUrl, savedEntry.cardTitle) === taskKey)?.taskId;
    const sharedComments = acc.find(savedEntry => (sharedTaskId || entry.taskId) === savedEntry.taskId)?.comments ?? [];
    const ownComments = Array.isArray(entry.comments)
      ? entry.comments.filter(comment => typeof comment === 'string').map(comment => comment.trim()).filter(Boolean)
      : [];

    acc.push({
      ...entry,
      taskId: sharedTaskId || entry.taskId || buildLegacyTaskId(entry),
      cardUrl,
      cardTitle,
      comments: ownComments.length > 0 ? ownComments : sharedComments,
      imputed: Boolean(entry.imputed),
    });

    return acc;
  }, []);

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

  const roundHours = (hours: number) => {
    const step = isRoundModeEnabled ? 0.25 : 0.5;
    return Math.ceil(hours / step) * step;
  };

  const roundingStep = isRoundModeEnabled ? 0.25 : 0.5;

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
    const taskId = findTaskId(nextCardUrl, nextCardTitle) || crypto.randomUUID();
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
    const roundedHours = roundHours(hours);
    
    const newEntry: TimeEntry = {
      id: crypto.randomUUID(),
      taskId: activeTimer.taskId,
      cardUrl: activeTimer.cardUrl,
      cardTitle: activeTimer.cardTitle,
      comments: activeTimer.comments ?? getTaskComments(activeTimer.taskId),
      date: new Date().toISOString().split('T')[0],
      hours: Math.max(roundingStep, roundedHours),
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

    const roundedHours = roundHours(hoursInput);
    const cardUrl = mode === 'url' ? taskValue : null;
    const cardTitle = mode === 'url' ? extractTitleFromUrl(taskValue) : normalizeTaskTitle(taskValue);
    const taskId = findTaskId(cardUrl, cardTitle) || crypto.randomUUID();
    const comments = buildNextTaskComments(taskId, [commentInput]);

    if (comments.length > 0) {
      syncTaskComments(taskId, comments);
    }

    const newEntry: TimeEntry = {
      id: crypto.randomUUID(),
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
    const roundedHours = roundHours(hoursInput);
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
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] font-sans transition-colors">
      {/* Header */}
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border-default)] sticky top-0 z-10 transition-colors">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="bg-[var(--brand-primary)] p-1.5 rounded-md transition-colors">
                <Clock className="w-5 h-5 text-[var(--text-inverse)]" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--brand-primary)]">TrelloTime</h1>
            </div>
            <button
              type="button"
              onClick={() => setIsDarkMode(prev => !prev)}
              className="flex h-10 items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-muted)] px-3 text-sm font-medium text-[var(--text-muted)] transition-all hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
              aria-pressed={isDarkMode}
              aria-label={`Modo oscuro ${isDarkMode ? 'activado' : 'desactivado'}`}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="hidden sm:inline">{isDarkMode ? 'Claro' : 'Oscuro'}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex gap-1 bg-[var(--bg-surface-muted)] p-1 rounded-lg transition-colors">
              <button 
                onClick={() => setView('tracker')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === 'tracker' ? 'bg-[var(--bg-surface)] shadow-sm text-[var(--brand-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--border-default)]'}`}
              >
                <Layout className="w-4 h-4" />
                Tracker
              </button>
              <button 
                onClick={() => setView('summary')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === 'summary' ? 'bg-[var(--bg-surface)] shadow-sm text-[var(--brand-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--border-default)]'}`}
              >
                <BarChart3 className="w-4 h-4" />
                Resumen
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {view === 'tracker' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Controls */}
            <div className="lg:col-span-1 space-y-6">
              {/* Active Timer Card */}
              <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div className="flex min-w-max flex-1 items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
                      <Timer className="w-4 h-4" />
                      Cronómetro
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsRoundModeEnabled(prev => !prev)}
                      className="flex items-center gap-2"
                      aria-pressed={isRoundModeEnabled}
                      aria-label={`Modo Amaia ${isRoundModeEnabled ? 'activado' : 'desactivado'}`}
                    >
                      <span
                        className={`relative h-6 w-10 rounded-full transition-colors ${isRoundModeEnabled ? 'bg-[var(--brand-primary)]' : 'bg-[var(--border-strong)]'}`}
                      >
                        <span
                          className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[var(--bg-surface)] shadow-sm transition-all ${isRoundModeEnabled ? 'left-5' : 'left-1'}`}
                        />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                        {isRoundModeEnabled ? '0.25' : '0.5'}
                      </span>
                    </button>
                  </div>
                  {!activeTimer ? (
                    <button 
                      onClick={() => setIsTimerModalOpen(true)}
                      className="min-w-[11rem] flex-1 px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--text-inverse)] rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Iniciar tarea
                    </button>
                  ) : null}
                </div>
                
                {activeTimer ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-mono font-bold text-[var(--text-primary)] mb-1">
                        {formatTime(elapsedSeconds)}
                      </div>
                      <p className="text-sm text-[var(--text-muted)] truncate px-2" title={activeTimer.cardTitle}>
                        {activeTimer.cardTitle}
                      </p>
                    </div>
                    <button 
                      onClick={handleStopTimer}
                      className="w-full py-3 bg-[var(--danger-action)] hover:bg-[var(--danger-action-hover)] text-[var(--text-inverse)] rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      Detener y Guardar
                    </button>
                  </div>
                ) : null}
              </div>

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
                            <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">
                              Comentario
                            </label>
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
                  <button 
                    onClick={() => setIsAddingManual(true)}
                    className="w-full py-2 border-2 border-dashed border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] rounded-lg text-sm font-medium transition-all"
                  >
                    Registrar horas manualmente
                  </button>
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
                        <input 
                          name="url"
                          placeholder="https://trello.com/c/..."
                          className="w-full px-3 py-2 bg-[var(--bg-surface-soft)] border border-[var(--border-default)] rounded-md text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">NOMBRE TAREA PROVISIONAL</label>
                        <input 
                          name="title"
                          placeholder="Ej: Revisión backlog sprint"
                          className="w-full px-3 py-2 bg-[var(--bg-surface-soft)] border border-[var(--border-default)] rounded-md text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">HORAS</label>
                      <input 
                        name="hours"
                        type="number"
                        step={roundingStep}
                        min={roundingStep}
                        required
                        placeholder="Ej: 1.5"
                        className="w-full px-3 py-2 bg-[var(--bg-surface-soft)] border border-[var(--border-default)] rounded-md text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none"
                      />
                      <p className="text-[10px] text-[var(--text-muted)] mt-1 italic">* Redondeo al múltiplo superior {roundingStep}.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">COMENTARIO</label>
                      <textarea
                        name="comment"
                        rows={3}
                        placeholder="Ej: Reunión, cambios copy, bug login"
                        className="w-full px-3 py-2 bg-[var(--bg-surface-soft)] border border-[var(--border-default)] rounded-md text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none resize-y"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="submit"
                        className="flex-1 py-2 bg-[var(--brand-primary)] text-[var(--text-inverse)] rounded-md text-sm font-bold hover:bg-[var(--brand-primary-hover)]"
                      >
                        Guardar
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsAddingManual(false)}
                        className="px-4 py-2 bg-[var(--bg-surface-muted)] text-[var(--text-primary)] rounded-md text-sm font-bold hover:bg-[var(--border-default)]"
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
                    entries.map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="group rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-sm transition-all hover:border-[var(--brand-primary)]"
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex min-w-0 gap-3">
                            <label className="flex items-center justify-center flex-shrink-0 cursor-pointer pt-1">
                              <input
                                type="checkbox"
                                checked={entry.imputed}
                                onChange={() => handleToggleImputed(entry.id)}
                                className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                                aria-label={`Marcar ${entry.cardTitle} como imputada`}
                              />
                            </label>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="min-w-0 flex-1 pr-2 text-[15px] font-semibold leading-tight text-[var(--text-primary)] break-words" title={entry.cardTitle}>
                                  {entry.cardTitle}
                                </h4>
                                <span className="text-lg font-bold text-[var(--brand-primary)] whitespace-nowrap">{entry.hours}h</span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap ${entry.cardUrl ? 'bg-[var(--info-soft)] text-[var(--brand-primary-hover)]' : 'bg-[var(--warning-soft)] text-[var(--warning)]'}`}>
                                  {entry.cardUrl ? 'Trello' : 'Provisional'}
                                </span>
                                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap ${entry.imputed ? 'bg-[var(--success-soft)] text-[var(--success)]' : 'bg-[var(--danger-soft)] text-[var(--danger)]'}`}>
                                  {entry.imputed ? 'Imputada' : 'Sin imputar'}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                  <CalendarIcon className="w-3 h-3" />
                                  {entry.date}
                                </span>
                                {entry.cardUrl ? (
                                  <a 
                                    href={entry.cardUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1"
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
                                className="rounded-lg p-2 text-[var(--text-muted)] transition-all hover:bg-[var(--bg-surface-muted)]"
                                aria-label={`Comentarios ${entry.cardTitle}`}
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => openTaskEditor(entry)}
                                className="rounded-lg p-2 text-[var(--text-muted)] transition-all hover:bg-[var(--bg-surface-muted)]"
                                aria-label={`Editar ${entry.cardTitle}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="rounded-lg p-2 text-[var(--danger-action)] transition-all hover:bg-[var(--danger-soft)]"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
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
              <span className="text-xs font-medium bg-[var(--border-default)] text-[var(--text-primary)] px-2 py-1 rounded-full">
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
                      <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-[var(--success-soft)] text-[var(--success)] whitespace-nowrap">
                        Imputadas {day.imputedTotal}h
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-[var(--danger-soft)] text-[var(--danger)] whitespace-nowrap">
                        Sin imputar {day.pendingTotal}h
                      </span>
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
                          {day.imputedCards.map((card) => (
                            <div key={`imputed-${day.date}-${card.taskId}`} className="rounded-lg border border-[var(--success-soft)] bg-[var(--success-soft-alt)] px-3 py-2 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-[var(--text-primary)] truncate" title={card.title}>{card.title}</div>
                                <div className="flex items-center gap-3 mt-1">
                                  {card.url ? (
                                    <a href={card.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--brand-primary)] hover:underline">
                                      Ver enlace
                                    </a>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => openCommentsEditor(card.taskId, card.title)}
                                    className="text-[11px] text-[var(--success)] hover:underline"
                                  >
                                    Comentarios {card.comments.length > 0 ? `(${card.comments.length})` : ''}
                                  </button>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-[var(--success)] flex-shrink-0">{card.hours}h</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--danger)]">Sin imputar</h4>
                        <span className="text-xs font-bold text-[var(--danger)]">{day.pendingTotal}h</span>
                      </div>

                      {day.pendingCards.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)]">Sin tarjetas pendientes.</p>
                      ) : (
                        <div className="space-y-2">
                          {day.pendingCards.map((card) => (
                            <div key={`pending-${day.date}-${card.taskId}`} className="rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft-alt)] px-3 py-2 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-[var(--text-primary)] truncate" title={card.title}>{card.title}</div>
                                <div className="flex items-center gap-3 mt-1">
                                  {card.url ? (
                                    <a href={card.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--brand-primary)] hover:underline">
                                      Ver enlace
                                    </a>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => openCommentsEditor(card.taskId, card.title)}
                                    className="text-[11px] text-[var(--danger)] hover:underline"
                                  >
                                    Comentarios {card.comments.length > 0 ? `(${card.comments.length})` : ''}
                                  </button>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-[var(--danger)] flex-shrink-0">{card.hours}h</span>
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

      <AnimatePresence>
        {commentTaskId ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[var(--border-default)] flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Comentarios tarea</h3>
                  <p className="text-sm text-[var(--text-muted)] truncate mt-1" title={commentTaskTitle}>{commentTaskTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={closeCommentsEditor}
                  className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-surface-muted)] rounded-lg"
                  aria-label="Cerrar comentarios"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveComments} className="p-6 space-y-4">
                <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
                  {commentDrafts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-surface-soft)] px-4 py-6 text-sm text-[var(--text-muted)] text-center">
                      Sin comentarios. Añade uno.
                    </div>
                  ) : (
                    commentDrafts.map((comment, index) => (
                      <div key={`${commentTaskId}-${index}`} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-soft)] p-3 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Comentario {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteCommentDraft(index)}
                            className="text-xs font-bold text-[var(--danger-action)] hover:underline"
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
                          className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none resize-y"
                        />
                      </div>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddCommentDraft}
                  className="w-full py-2 border-2 border-dashed border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] rounded-lg text-sm font-medium transition-all"
                >
                  Añadir comentario
                </button>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[var(--brand-primary)] text-[var(--text-inverse)] rounded-md font-bold hover:bg-[var(--brand-primary-hover)] transition-colors"
                  >
                    Guardar comentarios
                  </button>
                  <button
                    type="button"
                    onClick={closeCommentsEditor}
                    className="px-4 py-2.5 bg-[var(--bg-surface-muted)] text-[var(--text-primary)] rounded-md font-bold hover:bg-[var(--border-default)] transition-colors"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Editar tarea</h3>
                <form onSubmit={handleSaveTaskEdit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--bg-surface-muted)] p-1">
                    <button
                      type="button"
                      onClick={() => setEditingMode('url')}
                      className={`rounded-md px-3 py-2 text-sm font-bold transition-colors ${editingMode === 'url' ? 'bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}
                    >
                      URL Trello
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMode('name')}
                      className={`rounded-md px-3 py-2 text-sm font-bold transition-colors ${editingMode === 'name' ? 'bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}
                    >
                      Tarea provisional
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">
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
                      className="w-full px-3 py-2 bg-[var(--bg-surface-soft)] border border-[var(--border-default)] rounded-md text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none"
                    />
                    <p className="text-[10px] text-[var(--text-muted)] mt-1 italic">* Cambio aplica a todos registros misma tarea.</p>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Horas registro</label>
                    <input
                      type="number"
                      step={roundingStep}
                      min={roundingStep}
                      required
                      value={editingHours}
                      onChange={(e) => setEditingHours(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-surface-soft)] border border-[var(--border-default)] rounded-md text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none"
                    />
                    <p className="text-[10px] text-[var(--text-muted)] mt-1 italic">* Horas solo cambian este registro. Redondeo {roundingStep} arriba.</p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-[var(--brand-primary)] text-[var(--text-inverse)] rounded-md font-bold hover:bg-[var(--brand-primary-hover)] transition-colors"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEntryId(null);
                        setEditingTaskId(null);
                        setEditingMode('name');
                        setEditingUrlValue('');
                        setEditingNameValue('');
                        setEditingHours('');
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
        ) : null}
      </AnimatePresence>
    </div>
  );
}
