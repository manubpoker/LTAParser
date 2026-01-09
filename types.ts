
export interface Tournament {
  id: string;
  title: string;
  gender: string;
  eventType: string;
  grade: string;
  venue: string;
  postcode: string;
  ltaCode: string;
  date: string;
  month: string;
  category: string;
  organiserEmail: string;
  deadlineCD: string;
  deadlineWD: string;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success' | 'warning';
}

export enum AppTab {
  WELCOME = 'welcome',
  TOURNAMENTS = 'tournaments',
  MAP = 'map',
  VISUALIZATION = 'visualization'
}
