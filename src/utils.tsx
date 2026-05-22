import { TimeEntry } from './types';

export const STORAGE_KEY = 'trello-time-entries';
export const ROUNDING_MODE_KEY = 'trello-time-rounding-mode';
export const THEME_MODE_KEY = 'trello-time-theme-mode';
export const FALLBACK_CARD_TITLE = 'Trello Card';
export const FALLBACK_TASK_TITLE = 'Tarea sin nombre';

// Generador de UUID con fallback
export const generateUUID = (): string => {
  try {
    // @ts-ignore
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
      // @ts-ignore
      return (crypto as any).randomUUID();
    }

    // @ts-ignore
    if (typeof crypto !== 'undefined' && typeof (crypto as any).getRandomValues === 'function') {
      const arr = new Uint8Array(16);
      // @ts-ignore
      crypto.getRandomValues(arr);
      arr[6] = (arr[6] & 0x0f) | 0x40; // version 4
      arr[8] = (arr[8] & 0x3f) | 0x80; // variant
      const hex = [...arr].map(b => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }
  } catch (e) {
    // fallthrough
  }

  // Fallback menos seguro
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const toTitleCase = (text: string) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const extractTitleFromUrl = (url: string) => {
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

export const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const normalizeTaskTitle = (title?: string | null) => {
  const trimmedTitle = title?.replace(/\s+/g, ' ').trim();
  return trimmedTitle || FALLBACK_TASK_TITLE;
};

export const normalizeTaskIdentity = (title?: string | null) =>
  normalizeTaskTitle(title)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();

export const buildTaskKey = (cardUrl?: string | null, cardTitle?: string | null) => {
  if (cardUrl?.trim()) {
    return `url:${cardUrl.trim()}`;
  }

  return `title:${normalizeTaskIdentity(cardTitle)}`;
};

export const buildLegacyTaskId = (entry: Partial<TimeEntry>) => {
  const rawKey = entry.cardUrl?.trim() || entry.cardTitle?.trim() || generateUUID();
  return `legacy:${rawKey}`;
};

export const normalizeEntries = (savedEntries: TimeEntry[]) =>
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

export const formatISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCurrentWeekdays = () => {
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

export const weekdayLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// Valor por defecto para redondeo (múltiplo superior)
export const DEFAULT_ROUNDING_STEP = 0.25;

// roundHours ahora acepta step opcional y usa DEFAULT_ROUNDING_STEP si no se pasa
export const roundHours = (hours: number, step: number = DEFAULT_ROUNDING_STEP) => Math.ceil(hours / step) * step;

// Convierte y normaliza horas pasadas como número o cadena
export function normalizeHours(hours: number | string): number {
  if (typeof hours === 'number') {
    return Number.isFinite(hours) ? hours : NaN;
  }
  if (typeof hours === 'string') {
    const cleaned = hours.replace(',', '.').replace(/[^0-9.\-]/g, '').trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

// Formatea horas para mostrar en UI o enviar a Trello
export function formatHoursForDisplay(hours: number | string): string {
  const n = normalizeHours(hours);
  if (!Number.isFinite(n)) return '0';
  if (Number.isInteger(n)) return String(n);
  return Number(Math.round(n * 100) / 100).toString();
}
