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



export async function findOrCreateChecklist(cardId: string, checklistName: string) {
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

  // create checklist on card
  const createUrl = buildUrl(`/cards/${cardId}/checklists`);
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: checklistName }),
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Trello create checklist failed: ${createRes.status} ${text}`);
  }
  const created = await createRes.json();
  return created.id;
}

export async function addChecklistItem(checklistId: string, itemName: string, date: string, memberId: string) {
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
      due: date,
      idMember: memberId,
      pos: 'bottom'
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trello add check item failed: ${res.status} ${text}`);
  }
  return await res.json();
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

  //TODO: buscar los miembros del tablero y verificar que el usuario existe y obtener su id para asignar la tarea. Por ahora se asigna al usuario que hizo la petición
  //TODO: usar la siguiente url para obtener el id del miembro:   --url 'https://api.trello.com/1/boards/{id}/members?key=APIKey&token=APIToken'
  //TODO: mejorar el mensaje de las horas asignado si son de producción, desarrollo, gestión o validación. Por ahora se asigna solo el número de horas sin especificar el tipo de horas.

  const checklistName = 'Horas';
  const checklistId = await findOrCreateChecklist(card.id, checklistName);

  const today = dateISO || new Date().toISOString().split('T')[0];
  const hoursDisplay = formatHoursForDisplay(entry.hours);
  const itemText = `${hoursDisplay}h${formatTypeOfHours(entry.imputedCategory)}`;

  const item = await addChecklistItem(checklistId, itemText, today, user);
  return { card, checklistId, item };
}
function formatTypeOfHours(imputedCategory: string | undefined) {
  
  if (!imputedCategory) return '';
  if (imputedCategory.toLowerCase().includes('prod')) return '-P';
  if (imputedCategory.toLowerCase().includes('gest')) return '-G';
  if (imputedCategory.toLowerCase().includes('val')) return '-V';
  return '';

}

