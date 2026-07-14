const API_KEY = import.meta.env.VITE_TRELLO_KEY;
const TOKEN = import.meta.env.VITE_TRELLO_TOKEN;
const BOARD_ID = 'rJvXfU7D';

export interface TrelloMember {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface TrelloList {
  id: string;
  name: string;
}

export interface TrelloCustomFieldItem {
  id: string;
  idCustomField: string;
  idValue?: string;
  value?: {
    text?: string;
    number?: string;
    checked?: string;
    date?: string;
  };
}

export interface TrelloCustomField {
  id: string;
  name: string;
  type: string;
}

export interface TrelloCard {
  id: string;
  idShort?: number;
  url?: string;
  name: string;
  idList: string;
  idMembers: string[];
  customFieldItems: TrelloCustomFieldItem[];
}

const fetchTrello = async (endpoint: string, params: Record<string, string> = {}) => {
  if (!API_KEY || !TOKEN) {
    throw new Error(`Faltan credenciales de Trello. API_KEY: ${API_KEY ? 'OK' : 'Falta'}, TOKEN: ${TOKEN ? 'OK' : 'Falta'}`);
  }

  const url = new URL(`https://api.trello.com/1${endpoint}`);
  url.searchParams.append('key', API_KEY);
  url.searchParams.append('token', TOKEN);
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Trello API error ${response.status}: ${errorText || response.statusText}`);
  }
  return response.json();
};

export const getBoardMembers = (): Promise<TrelloMember[]> => fetchTrello(`/boards/${BOARD_ID}/members`);
export const getBoardLists = (): Promise<TrelloList[]> => fetchTrello(`/boards/${BOARD_ID}/lists`);
export const getBoardCustomFields = (): Promise<TrelloCustomField[]> => fetchTrello(`/boards/${BOARD_ID}/customFields`);
export const getListCards = (listId: string): Promise<TrelloCard[]> => fetchTrello(`/lists/${listId}/cards`, { customFieldItems: 'true' });
