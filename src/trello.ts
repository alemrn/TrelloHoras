// Utilities to interact with Trello API
// Requires environment variables (Vite): VITE_TRELLO_KEY and VITE_TRELLO_TOKEN
// Add to your .env (not committed):
// VITE_TRELLO_KEY=yourKey
// VITE_TRELLO_TOKEN=yourToken

const TRELLO_KEY = (import.meta as any).env?.VITE_TRELLO_KEY || '';
const TRELLO_TOKEN = (import.meta as any).env?.VITE_TRELLO_TOKEN || '';

const API_BASE = 'https://api.trello.com/1';

function authQuery() {
  const params = new URLSearchParams();
  if (TRELLO_KEY) params.set('key', TRELLO_KEY);
  if (TRELLO_TOKEN) params.set('token', TRELLO_TOKEN);
  return params.toString() ? `?${params.toString()}` : '';
}

function buildUrl(path: string, extra: Record<string, string> = {}) {
  const url = new URL(`${API_BASE}${path}`);
  if (TRELLO_KEY) url.searchParams.set('key', TRELLO_KEY);
  if (TRELLO_TOKEN) url.searchParams.set('token', TRELLO_TOKEN);
  Object.entries(extra).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

export type TrelloCard = any; // minimal typing for now

export function parseCardShortLink(cardUrl: string): string | null {
  try {
    const u = new URL(cardUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    // Trello card URL forms: /c/{shortLink}/{slug}
    const cIndex = parts.indexOf('c');
    if (cIndex >= 0 && parts.length > cIndex + 1) {
      return parts[cIndex + 1];
    }
    // maybe the path is like /b/{board}/{shortLink}
    // fallback: take first path segment that looks like shortlink (alphanumeric)
    const candidate = parts.find(p => /^[a-zA-Z0-9]{4,}$/.test(p));
    return candidate || null;
  } catch (e) {
    return null;
  }
}

export async function getCardDetailsByUrl(cardUrl: string) {
  const shortLink = parseCardShortLink(cardUrl) || cardUrl;
  const url = buildUrl(`/cards/${encodeURIComponent(shortLink)}`, {
    fields: 'id,name,idBoard,shortLink,url,desc',
    checklists: 'all',
  });

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trello get card failed: ${res.status} ${text}`);
  }

  const card = await res.json();
  return card;
}

export async function getBoardName(boardId: string) {
  const url = buildUrl(`/boards/${boardId}`, { fields: 'name' });
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trello get board failed: ${res.status} ${text}`);
  }
  const board = await res.json();
  return board.name as string;
}

export async function findOrCreateChecklist(cardId: string, checklistName: string) {
  // Get checklists for card
  const url = buildUrl(`/cards/${cardId}/checklists`);
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trello get checklists failed: ${res.status} ${text}`);
  }
  const checklists = await res.json();
  const found = checklists.find((c: any) => String(c.name).toLowerCase() === checklistName.toLowerCase());
  if (found) return found.id;

  // create checklist on card
  const createUrl = buildUrl(`/cards/${cardId}/checklists`);
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: checklistName }),
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Trello create checklist failed: ${createRes.status} ${text}`);
  }
  const created = await createRes.json();
  return created.id;
}

export async function addChecklistItem(checklistId: string, itemName: string) {
  const url = buildUrl(`/checklists/${checklistId}/checkItems`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: itemName, pos: 'bottom' }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trello add check item failed: ${res.status} ${text}`);
  }
  return await res.json();
}

import { formatHoursForDisplay } from './utils';

export async function addHoursToCard(cardUrl: string, hours: number | string, user: string, dateISO?: string) {
  if (!TRELLO_KEY || !TRELLO_TOKEN) {
    throw new Error('Trello API credentials missing. Set VITE_TRELLO_KEY and VITE_TRELLO_TOKEN in your .env');
  }

  const card = await getCardDetailsByUrl(cardUrl);
  if (!card || !card.id) throw new Error('Card not found');

  const boardName = await getBoardName(card.idBoard);
  if (!boardName || boardName.toLowerCase() !== 'seguimiento') {
    throw new Error(`Card is not in board 'seguimiento' (found '${boardName}')`);
  }

  const checklistName = 'Horas invertidas';
  const checklistId = await findOrCreateChecklist(card.id, checklistName);

  const today = dateISO || new Date().toISOString().split('T')[0];
  const hoursDisplay = formatHoursForDisplay(hours);
  const itemText = `${hoursDisplay}h — ${user} — ${today}`;

  const item = await addChecklistItem(checklistId, itemText);
  return { card, checklistId, item };
}
