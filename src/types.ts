export interface TimeEntry {
  id: string;
  taskId: string;
  cardUrl?: string | null;
  cardTitle: string;
  comments?: string[];
  date: string; // ISO date string (YYYY-MM-DD)
  hours: number;
  imputed: boolean;
}

export interface ActiveTimer {
  cardUrl?: string | null;
  cardTitle: string;
  comments?: string[];
  taskId: string;
  startTime: number; // timestamp
}
