export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role?: string;
}

export interface StockItem {
  id: string;
  sku: string;
  name?: string;
  qty: number;
  unit: string;
  note?: string;
  timestamp: string;
  countedBy: string;
  synced?: boolean;
}

export interface LocationOpnameSession {
  locationCode: string;
  locationName?: string;
  startTime: string;
  items: StockItem[];
}

export interface SpreadsheetConfig {
  spreadsheetId: string;
  sheetName: string;
  spreadsheetTitle?: string;
  spreadsheetUrl?: string;
}

export interface ScanResult {
  text: string;
  format?: string;
}

export type StockStatus = 'Kurang' | 'Cukup' | 'Lebih';

export interface LocationBreakdown {
  locationCode: string;
  qty: number;
  lastUpdated?: string;
  countedBy?: string;
}

export interface StockReportItem {
  sku: string;
  name?: string;
  totalQty: number;
  unit: string;
  locationBreakdown: LocationBreakdown[];
  minStock: number;
  maxStock: number;
  status: StockStatus;
}
