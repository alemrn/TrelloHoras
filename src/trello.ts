// Utilities to interact with Trello API
// Requires environment variables (Vite): VITE_TRELLO_KEY and VITE_TRELLO_TOKEN
// Add to your .env (not committed):
// VITE_TRELLO_KEY=yourKey
// VITE_TRELLO_TOKEN=yourToken

const TRELLO_KEY = import.meta.env.VITE_TRELLO_KEY || '';
const TRELLO_TOKEN = import.meta.env.VITE_TRELLO_TOKEN || '';
const BOARD_ID = import.meta.env.VITE_BOARD_ID || '';

const API_BASE = 'https://api.trello.com/1';

// Debug: verify environment variables are loaded
console.log('Trello credentials loaded:', {
  keyExists: !!TRELLO_KEY,
  tokenExists: !!TRELLO_TOKEN,
  boardIdExists: !!BOARD_ID,
  keyLength: TRELLO_KEY?.length || 0,
  tokenLength: TRELLO_TOKEN?.length || 0,
});

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
  const url = buildUrl(`/cards/${encodeURIComponent(shortLink)}`);

  console.log('Fetching card details from URL:', url);
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!res.ok) {
    const text = await res.text();
    console.error('Trello API error:', {
      status: res.status,
      statusText: res.statusText,
      body: text,
      url: url,
    });
    throw new Error(`Trello get card failed: ${res.status} ${text}`);
  }

  const card = await res.json();
  return card;
}



export async function findChecklist(cardId: string, checklistName: string) {
  // Get checklists for card
  const url = buildUrl(`/cards/${cardId}/checklists`);
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trello get checklists failed: ${res.status} ${text}`);
  }
  const checklists = await res.json();
  const found = checklists.find((c: any) => String(c.name).toLowerCase() === checklistName.toLowerCase());
  if (found) return found.id;

  throw new Error(`No se encontró la checklist "${checklistName}" en la tarjeta. Por favor, créala primero en Trello.`);
}

export async function addChecklistItem(cardId: string, checklistId: string, itemName: string, date: string, memberId: string) {
  // 1. Crear el checkItem en la checklist
  const url = buildUrl(`/checklists/${checklistId}/checkItems`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: itemName,
      checked: true,
      pos: 'bottom'
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trello add check item failed: ${res.status} ${text}`);
  }
  const createdItem = await res.json();

  // 2. Actualizar el checkItem con la fecha de vencimiento y el miembro asignado en la tarjeta
  const updateUrl = buildUrl(`/cards/${cardId}/checkItem/${createdItem.id}`);
  const updateRes = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      due: date,
      idMember: memberId,
      state: 'complete'
    }),
  });
  if (!updateRes.ok) {
    const text = await updateRes.text();
    console.warn(`Trello update check item details failed: ${updateRes.status} ${text}`);
  }

  return createdItem;
}

import { TimeEntry } from './types';
import { formatHoursForDisplay } from './utils';

export async function addHoursToCard(entry: TimeEntry, user: string, dateISO?: string) {
  console.log('addHoursToCard called with:', { entry, dateISO });
  
  if (!TRELLO_KEY || !TRELLO_TOKEN) {
    throw new Error('Trello API credentials missing. Set VITE_TRELLO_KEY and VITE_TRELLO_TOKEN in your .env');
  }
  if (!BOARD_ID) {
    throw new Error('Board ID missing. Set VITE_BOARD_ID in your .env');
  }

  const card = await getCardDetailsByUrl(entry.cardUrl);
  if (!card || !card.id) throw new Error('Card not found');

  if (card.idBoard !== BOARD_ID) {
    throw new Error(`Card is not in the expected board (found '${card.idBoard}', expected '${BOARD_ID}')`);
  }

  // Resolver el Nick de Trello a un ID de miembro de 24 caracteres
  const membersUrl = buildUrl(`/boards/${BOARD_ID}/members`);
  const membersRes = await fetch(membersUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  let resolvedMemberId = '';
  if (membersRes.ok) {
    const members = await membersRes.json();
    const cleanUser = user.trim().toLowerCase();
    const foundMember = members.find((m: any) =>
      m.username.toLowerCase() === cleanUser ||
      m.fullName.toLowerCase() === cleanUser ||
      m.id === cleanUser
    );
    if (foundMember) {
      resolvedMemberId = foundMember.id;
    }
  }

  // Fallback: si no está en el tablero, intentar buscar el miembro en Trello de manera global
  if (!resolvedMemberId) {
    const userUrl = buildUrl(`/members/${encodeURIComponent(user.trim())}`);
    const userRes = await fetch(userUrl, { method: 'GET' });
    if (userRes.ok) {
      const uData = await userRes.json();
      resolvedMemberId = uData.id;
    }
  }

  if (!resolvedMemberId) {
    throw new Error(`No se encontró ningún miembro en Trello con el Nick "${user}". Verifica el nombre.`);
  }

  const checklistName = 'Horas invertidas';
  const checklistId = await findChecklist(card.id, checklistName);

  const targetDate = dateISO || entry.date || new Date().toISOString().split('T')[0];
  const hoursDisplay = formatHoursForDisplay(entry.hours);
  const typeChar = formatTypeOfHours(entry.imputedCategory);
  
  // Formato: {horas} {inicial} {comentario} (sin "h" y sin guiones)
  const commentsText = entry.comments && entry.comments.length > 0 ? ` ${entry.comments.join(', ')}` : '';
  const itemText = `${hoursDisplay} ${typeChar}${commentsText}`;

  const item = await addChecklistItem(card.id, checklistId, itemText, targetDate, resolvedMemberId);
  return { card, checklistId, item };
}
function formatTypeOfHours(imputedCategory: string | undefined) {
  if (!imputedCategory) return 'D'; // Fallback a Desarrollo
  const cat = imputedCategory.toLowerCase();
  if (cat.includes('dev') || cat.includes('desarrollo')) return 'D';
  if (cat.includes('gest')) return 'G';
  if (cat.includes('val')) return 'V';
  if (cat.includes('prod')) return 'P'; // Producción -> 'P'
  return 'D';
}

