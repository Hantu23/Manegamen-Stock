import { StockItem } from '../types';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

export interface SheetInfo {
  id: string;
  name: string;
  url: string;
}

export async function createStockOpnameSheet(accessToken: string, title?: string): Promise<SheetInfo> {
  const finalTitle = title || `Stock_Opname_Gudang_${new Date().toISOString().slice(0, 10)}`;
  
  const response = await fetch(SHEETS_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: finalTitle,
      },
      sheets: [
        {
          properties: {
            title: 'Stock_Opname',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Gagal membuat spreadsheet (${response.status})`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Insert initial Header row
  const headers = [
    [
      'Timestamp',
      'Lokasi',
      'SKU',
      'Nama Barang',
      'Qty Fisik',
      'Satuan',
      'Petugas / User',
      'Catatan',
      'Session ID',
    ],
  ];

  await appendRowsToSheet(accessToken, spreadsheetId, 'Stock_Opname', headers);

  return {
    id: spreadsheetId,
    name: finalTitle,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

export async function appendRowsToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rows: (string | number)[][]
): Promise<any> {
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(
    sheetName
  )}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Gagal menyimpan data ke spreadsheet (${response.status})`
    );
  }

  return response.json();
}

export async function saveLocationOpnameBatch(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  locationCode: string,
  items: StockItem[],
  userIdentifier: string
): Promise<{ count: number; updatedRange: string }> {
  if (items.length === 0) return { count: 0, updatedRange: '' };

  const rows = items.map((item) => [
    item.timestamp || new Date().toLocaleString('id-ID'),
    locationCode.trim().toUpperCase(),
    item.sku.trim().toUpperCase(),
    item.name || '-',
    item.qty,
    item.unit || 'PCS',
    item.countedBy || userIdentifier,
    item.note || '',
    item.id,
  ]);

  const res = await appendRowsToSheet(accessToken, spreadsheetId, sheetName, rows);
  return {
    count: items.length,
    updatedRange: res.updates?.updatedRange || '',
  };
}

export async function verifySpreadsheetAccess(
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheetNames: string[] }> {
  const url = `${SHEETS_API_BASE}/${spreadsheetId}?fields=properties.title,sheets.properties.title`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || 'Tidak dapat membuka spreadsheet. Periksa kembali ID atau hak akses.'
    );
  }

  const data = await response.json();
  const title = data.properties?.title || 'Untitled Spreadsheet';
  const sheetNames = (data.sheets || []).map((s: any) => s.properties?.title as string);

  return { title, sheetNames };
}

export async function listRecentSpreadsheets(
  accessToken: string
): Promise<Array<{ id: string; name: string; modifiedTime?: string }>> {
  try {
    const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const url = `${DRIVE_API_BASE}/files?q=${query}&orderBy=modifiedTime desc&pageSize=10&fields=files(id,name,modifiedTime)`;
    
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.warn('Gagal memuat daftar spreadsheet dari Drive:', err);
    return [];
  }
}

export async function fetchSpreadsheetRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<string[][]> {
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z10000`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Gagal mengambil data dari spreadsheet (${res.status})`);
  }

  const data = await res.json();
  return data.values || [];
}
