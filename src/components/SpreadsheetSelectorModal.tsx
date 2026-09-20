import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Database,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import {
  createStockOpnameSheet,
  verifySpreadsheetAccess,
  listRecentSpreadsheets,
} from '../lib/googleSheets';
import { SpreadsheetConfig } from '../types';

interface SpreadsheetModalProps {
  accessToken: string;
  currentConfig: SpreadsheetConfig | null;
  onSaveConfig: (config: SpreadsheetConfig) => void;
  onClose: () => void;
}

export const SpreadsheetSelectorModal: React.FC<SpreadsheetModalProps> = ({
  accessToken,
  currentConfig,
  onSaveConfig,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'existing' | 'recent'>('create');
  const [newTitle, setNewTitle] = useState(
    `Stock_Opname_Gudang_${new Date().toISOString().slice(0, 10)}`
  );
  const [existingInput, setExistingInput] = useState(currentConfig?.spreadsheetId || '');
  const [sheetName, setSheetName] = useState(currentConfig?.sheetName || 'Stock_Opname');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [recentSheets, setRecentSheets] = useState<
    Array<{ id: string; name: string; modifiedTime?: string }>
  >([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);

  useEffect(() => {
    if (activeTab === 'recent') {
      loadRecents();
    }
  }, [activeTab]);

  const loadRecents = async () => {
    setIsLoadingRecent(true);
    try {
      const sheets = await listRecentSpreadsheets(accessToken);
      setRecentSheets(sheets);
    } catch (e) {
      console.warn(e);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const handleCreateNew = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      const created = await createStockOpnameSheet(accessToken, newTitle.trim());
      const config: SpreadsheetConfig = {
        spreadsheetId: created.id,
        sheetName: 'Stock_Opname',
        spreadsheetTitle: created.name,
        spreadsheetUrl: created.url,
      };
      onSaveConfig(config);
      setStatusMsg({
        type: 'success',
        text: `Berhasil membuat Spreadsheet baru: ${created.name}`,
      });
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Gagal membuat Google Spreadsheet baru',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const extractSpreadsheetId = (input: string): string => {
    const trimmed = input.trim();
    // Matches https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
    const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
    return trimmed;
  };

  const handleConnectExisting = async (targetId?: string) => {
    const rawId = targetId || existingInput;
    const cleanId = extractSpreadsheetId(rawId);

    if (!cleanId) {
      setStatusMsg({ type: 'error', text: 'Masukkan link atau ID Google Spreadsheet.' });
      return;
    }

    setIsLoading(true);
    setStatusMsg(null);

    try {
      const verified = await verifySpreadsheetAccess(accessToken, cleanId);
      const chosenSheet =
        verified.sheetNames.find((s) => s.toLowerCase() === sheetName.toLowerCase()) ||
        verified.sheetNames[0] ||
        'Stock_Opname';

      const config: SpreadsheetConfig = {
        spreadsheetId: cleanId,
        sheetName: chosenSheet,
        spreadsheetTitle: verified.title,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
      };

      onSaveConfig(config);
      setStatusMsg({
        type: 'success',
        text: `Terhubung dengan: ${verified.title} (Sheet: ${chosenSheet})`,
      });
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Gagal memvalidasi spreadsheet ID.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Database Google Sheets
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Pilih atau buat sheet tujuan sinkronisasi stock opname
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-sm font-medium px-2 py-1"
          >
            Tutup
          </button>
        </div>

        {/* Current Connection Banner */}
        {currentConfig && (
          <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-emerald-950 dark:text-emerald-200">
                  {currentConfig.spreadsheetTitle || 'Spreadsheet Terhubung'}
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 ml-1">
                  ({currentConfig.sheetName})
                </span>
              </div>
            </div>
            <a
              href={currentConfig.spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 dark:text-emerald-300 font-semibold hover:underline flex items-center gap-1 shrink-0"
            >
              Buka <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 p-1 text-xs">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Buat Sheet Baru
          </button>
          <button
            onClick={() => setActiveTab('existing')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
              activeTab === 'existing'
                ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" /> Sambung ID / Link
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
              activeTab === 'recent'
                ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" /> Drive Terbaru
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Nama File Spreadsheet Baru
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="cth: Stock_Opname_Gudang_2026-09"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:text-white"
                />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Aplikasi akan otomatis menginisialisasi tabel berheader: 
                <strong className="text-neutral-700 dark:text-neutral-200 font-medium"> Timestamp, Lokasi, SKU, Nama Barang, Qty Fisik, Satuan, Petugas</strong>.
              </p>
              <button
                id="btn-confirm-create-sheet"
                disabled={isLoading || !newTitle.trim()}
                onClick={handleCreateNew}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition shadow-xs"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Membuat Spreadsheet...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Buat & Hubungkan Otomatis
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'existing' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  URL atau Spreadsheet ID
                </label>
                <input
                  type="text"
                  value={existingInput}
                  onChange={(e) => setExistingInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/... atau Spreadsheet ID"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Nama Tab / Sheet
                </label>
                <input
                  type="text"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder="Stock_Opname atau Sheet1"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:text-white"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Pastikan akun Google Anda memiliki hak Edit pada file ini.
                </p>
              </div>

              <button
                id="btn-confirm-connect-existing"
                disabled={isLoading || !existingInput.trim()}
                onClick={() => handleConnectExisting()}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition shadow-xs"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Menghubungkan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Verifikasi & Hubungkan
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'recent' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  File Spreadsheet Google Drive Anda
                </span>
                <button
                  onClick={loadRecents}
                  disabled={isLoadingRecent}
                  className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingRecent ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              {isLoadingRecent ? (
                <div className="py-8 text-center text-xs text-neutral-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
                  Mencari file Spreadsheet...
                </div>
              ) : recentSheets.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-400">
                  Belum ada file spreadsheet terbaru yang ditemukan di Drive. Silakan gunakan tab &quot;Buat Sheet Baru&quot;.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {recentSheets.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => {
                        setExistingInput(file.id);
                        handleConnectExisting(file.id);
                      }}
                      className="w-full text-left p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-neutral-800/60 transition flex items-center justify-between group"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-neutral-400 truncate">ID: {file.id}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
