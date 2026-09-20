import React, { useState } from 'react';
import {
  History,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { StockItem, SpreadsheetConfig } from '../types';

interface HistoryViewProps {
  syncedLogs: Array<{
    batchId: string;
    locationCode: string;
    timestamp: string;
    itemsCount: number;
    countedBy: string;
    items: StockItem[];
  }>;
  spreadsheetConfig: SpreadsheetConfig | null;
  onSelectLocationAgain: (loc: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  syncedLogs,
  spreadsheetConfig,
  onSelectLocationAgain,
}) => {
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  const totalSKUsCounted = syncedLogs.reduce((acc, batch) => acc + batch.itemsCount, 0);

  const filteredLogs = syncedLogs.filter(
    (log) =>
      log.locationCode.toLowerCase().includes(filterQuery.toLowerCase()) ||
      log.countedBy.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-2xl p-4 shadow-md border border-neutral-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              Rekapitulasi Stock Opname
            </span>
            <h3 className="text-base font-bold text-white">Aktivitas Tersinkronisasi</h3>
          </div>
          {spreadsheetConfig && (
            <a
              href={spreadsheetConfig.spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 rounded-xl text-xs font-semibold text-emerald-300 flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Buka Sheets</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-700/60">
          <div>
            <p className="text-[11px] text-neutral-400">Total Lokasi Dihitung</p>
            <p className="text-xl font-black text-amber-400">{syncedLogs.length} Rak / Bin</p>
          </div>
          <div>
            <p className="text-[11px] text-neutral-400">Total Baris SKU Masuk</p>
            <p className="text-xl font-black text-emerald-400">{totalSKUsCounted} SKU</p>
          </div>
        </div>
      </div>

      {/* Filter and List */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            Riwayat Pengiriman Batch
          </h4>
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Cari lokasi / petugas..."
            className="text-xs px-2.5 py-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-neutral-200 focus:outline-hidden"
          />
        </div>

        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400">
            Belum ada batch stock opname yang tersimpan pada sesi ini.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => {
              const isExpanded = selectedBatch === log.batchId;
              return (
                <div
                  key={log.batchId}
                  className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setSelectedBatch(isExpanded ? null : log.batchId)}
                    className="w-full text-left p-3 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold font-mono text-neutral-900 dark:text-white uppercase">
                          Lokasi: {log.locationCode}
                        </p>
                        <p className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {log.timestamp} • {log.countedBy}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {log.itemsCount} SKU
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-neutral-400 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {/* Expanded SKU details */}
                  {isExpanded && (
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border-t border-neutral-200 dark:border-neutral-700 text-xs space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-neutral-200 dark:border-neutral-800">
                        <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                          Rincian SKU yang Terkirim:
                        </span>
                        <button
                          onClick={() => onSelectLocationAgain(log.locationCode)}
                          className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
                        >
                          Hitung Lokasi Ini Lagi
                        </button>
                      </div>

                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {log.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-1.5 bg-white dark:bg-neutral-800 rounded-lg text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                                {item.sku}
                              </span>
                              {item.name && (
                                <span className="text-neutral-500 ml-1 truncate">({item.name})</span>
                              )}
                            </div>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                              {item.qty} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
