export interface TimeEntry {
  id: string;
  cardUrl: string;
  cardTitle: string;
  date: string; // ISO date string (YYYY-MM-DD)
  hours: number;
}

export interface ActiveTimer {
  cardUrl: string;
  cardTitle: string;
  startTime: number; // timestamp
}
