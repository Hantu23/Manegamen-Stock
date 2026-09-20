import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Search,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Package,
  ChevronDown,
  ChevronRight,
  Sliders,
  Download,
  ExternalLink,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { StockReportItem, StockStatus, SpreadsheetConfig, StockItem } from '../types';
import { fetchSpreadsheetRows } from '../lib/googleSheets';

interface StockReportViewProps {
  accessToken: string | null;
  spreadsheetConfig: SpreadsheetConfig | null;
  localBatches: Array<{
    batchId: string;
    locationCode: string;
    timestamp: string;
    itemsCount: number;
    countedBy: string;
    items: StockItem[];
  }>;
  currentDraftItems: StockItem[];
  currentLocation: string;
  onSelectLocation?: (loc: string) => void;
}

export const StockReportView: React.FC<StockReportViewProps> = ({
  accessToken,
  spreadsheetConfig,
  localBatches,
  currentDraftItems,
  currentLocation,
  onSelectLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StockStatus>('ALL');
  const [viewMode, setViewMode] = useState<'bySku' | 'byLocation'>('bySku');
  const [expandedSkus, setExpandedSkus] = useState<Record<string, boolean>>({});
  const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({});
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [sheetRawRows, setSheetRawRows] = useState<string[][]>([]);
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string | null>(null);

  // Configurable thresholds for stock status
  const [minThreshold, setMinThreshold] = useState<number>(15);
  const [maxThreshold, setMaxThreshold] = useState<number>(100);
  const [showThresholdConfig, setShowThresholdConfig] = useState(false);

  // Fetch from Google Spreadsheet if connected
  const loadDataFromSpreadsheet = async () => {
    if (!accessToken || !spreadsheetConfig?.spreadsheetId) return;
    setIsLoadingSheet(true);
    try {
      const rows = await fetchSpreadsheetRows(
        accessToken,
        spreadsheetConfig.spreadsheetId,
        spreadsheetConfig.sheetName || 'Stock_Opname'
      );
      // Skip header row if present
      const dataRows = rows.length > 0 && rows[0][0]?.toLowerCase().includes('time') ? rows.slice(1) : rows;
      setSheetRawRows(dataRows);
      setLastRefreshedTime(new Date().toLocaleTimeString('id-ID'));
    } catch (err) {
      console.warn('Gagal memuat data live dari Spreadsheet:', err);
    } finally {
      setIsLoadingSheet(false);
    }
  };

  useEffect(() => {
    if (accessToken && spreadsheetConfig?.spreadsheetId) {
      loadDataFromSpreadsheet();
    }
  }, [accessToken, spreadsheetConfig?.spreadsheetId]);

  // Aggregate data from both Google Spreadsheet (if available) and Local/Draft items
  const aggregatedReport = useMemo(() => {
    // Map of SKU -> { sku, name, unit, locations: { [loc]: qty } }
    const skuMap: Record<
      string,
      {
        sku: string;
        name?: string;
        unit: string;
        locations: Record<string, { qty: number; lastUpdated?: string; countedBy?: string }>;
      }
    > = {};

    // 1. Process Google Spreadsheet rows
    if (sheetRawRows.length > 0) {
      sheetRawRows.forEach((row) => {
        // [0: Timestamp, 1: Lokasi, 2: SKU, 3: Nama, 4: Qty, 5: Satuan, 6: User]
        const timestamp = row[0] || '';
        const location = (row[1] || 'GUDANG').trim().toUpperCase();
        const sku = (row[2] || '').trim().toUpperCase();
        const name = row[3] && row[3] !== '-' ? row[3].trim() : undefined;
        const qty = parseFloat(row[4]) || 0;
        const unit = (row[5] || 'PCS').trim().toUpperCase();
        const countedBy = row[6] || 'Operator';

        if (!sku) return;

        if (!skuMap[sku]) {
          skuMap[sku] = { sku, name, unit, locations: {} };
        }
        if (name && !skuMap[sku].name) {
          skuMap[sku].name = name;
        }

        if (!skuMap[sku].locations[location]) {
          skuMap[sku].locations[location] = { qty: 0, lastUpdated: timestamp, countedBy };
        }
        skuMap[sku].locations[location].qty += qty;
      });
    } else {
      // 2. Process local synced batches if sheet is empty or not yet loaded
      localBatches.forEach((batch) => {
        const loc = batch.locationCode.trim().toUpperCase();
        batch.items.forEach((item) => {
          const sku = item.sku.trim().toUpperCase();
          if (!sku) return;

          if (!skuMap[sku]) {
            skuMap[sku] = {
              sku,
              name: item.name,
              unit: item.unit || 'PCS',
              locations: {},
            };
          }
          if (item.name && !skuMap[sku].name) {
            skuMap[sku].name = item.name;
          }

          if (!skuMap[sku].locations[loc]) {
            skuMap[sku].locations[loc] = {
              qty: 0,
              lastUpdated: item.timestamp,
              countedBy: item.countedBy,
            };
          }
          skuMap[sku].locations[loc].qty += item.qty;
        });
      });
    }

    // 3. Merge active draft items in current location (if any)
    if (currentDraftItems.length > 0) {
      const loc = currentLocation.trim().toUpperCase();
      currentDraftItems.forEach((item) => {
        const sku = item.sku.trim().toUpperCase();
        if (!sku) return;

        if (!skuMap[sku]) {
          skuMap[sku] = {
            sku,
            name: item.name,
            unit: item.unit || 'PCS',
            locations: {},
          };
        }
        if (!skuMap[sku].locations[loc]) {
          skuMap[sku].locations[loc] = {
            qty: 0,
            lastUpdated: item.timestamp,
            countedBy: item.countedBy,
          };
        }
        skuMap[sku].locations[loc].qty += item.qty;
      });
    }

    // Convert map to list of StockReportItem
    const reportList: StockReportItem[] = Object.values(skuMap).map((entry) => {
      const locationBreakdown = Object.entries(entry.locations).map(([locCode, data]) => ({
        locationCode: locCode,
        qty: data.qty,
        lastUpdated: data.lastUpdated,
        countedBy: data.countedBy,
      }));

      const totalQty = locationBreakdown.reduce((sum, b) => sum + b.qty, 0);

      // Determine stock status: Kurang, Cukup, Lebih
      let status: StockStatus = 'Cukup';
      if (totalQty < minThreshold) {
        status = 'Kurang';
      } else if (totalQty > maxThreshold) {
        status = 'Lebih';
      }

      return {
        sku: entry.sku,
        name: entry.name,
        totalQty,
        unit: entry.unit,
        locationBreakdown,
        minStock: minThreshold,
        maxStock: maxThreshold,
        status,
      };
    });

    // Sort descending by total quantity
    return reportList.sort((a, b) => b.totalQty - a.totalQty);
  }, [sheetRawRows, localBatches, currentDraftItems, currentLocation, minThreshold, maxThreshold]);

  // Location-centric grouping
  const locationGroups = useMemo(() => {
    const locMap: Record<
      string,
      {
        locationCode: string;
        items: Array<{
          sku: string;
          name?: string;
          qty: number;
          unit: string;
          status: StockStatus;
        }>;
        totalQty: number;
      }
    > = {};

    aggregatedReport.forEach((skuItem) => {
      skuItem.locationBreakdown.forEach((loc) => {
        if (!locMap[loc.locationCode]) {
          locMap[loc.locationCode] = {
            locationCode: loc.locationCode,
            items: [],
            totalQty: 0,
          };
        }
        locMap[loc.locationCode].items.push({
          sku: skuItem.sku,
          name: skuItem.name,
          qty: loc.qty,
          unit: skuItem.unit,
          status: skuItem.status,
        });
        locMap[loc.locationCode].totalQty += loc.qty;
      });
    });

    return Object.values(locMap).sort((a, b) => a.locationCode.localeCompare(b.locationCode));
  }, [aggregatedReport]);

  // Summary counts
  const summaryStats = useMemo(() => {
    const totalSkus = aggregatedReport.length;
    const totalQty = aggregatedReport.reduce((acc, item) => acc + item.totalQty, 0);
    const kurangCount = aggregatedReport.filter((item) => item.status === 'Kurang').length;
    const cukupCount = aggregatedReport.filter((item) => item.status === 'Cukup').length;
    const lebihCount = aggregatedReport.filter((item) => item.status === 'Lebih').length;
    const totalLocations = locationGroups.length;

    return {
      totalSkus,
      totalQty,
      kurangCount,
      cukupCount,
      lebihCount,
      totalLocations,
    };
  }, [aggregatedReport, locationGroups]);

  // Filtered SKUs
  const filteredReport = useMemo(() => {
    return aggregatedReport.filter((item) => {
      const matchQuery =
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.locationBreakdown.some((loc) =>
          loc.locationCode.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [aggregatedReport, searchQuery, statusFilter]);

  // Filtered Locations
  const filteredLocations = useMemo(() => {
    return locationGroups.filter((loc) => {
      const matchQuery =
        loc.locationCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.items.some((item) =>
          item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase()))
        );

      const matchStatus =
        statusFilter === 'ALL' || loc.items.some((item) => item.status === statusFilter);

      return matchQuery && matchStatus;
    });
  }, [locationGroups, searchQuery, statusFilter]);

  const toggleSkuExpand = (sku: string) => {
    setExpandedSkus((prev) => ({ ...prev, [sku]: !prev[sku] }));
  };

  const toggleLocationExpand = (loc: string) => {
    setExpandedLocations((prev) => ({ ...prev, [loc]: !prev[loc] }));
  };

  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case 'Kurang':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300 border border-red-200 dark:border-red-800">
            <AlertTriangle className="w-3 h-3" /> Kurang (&lt;{minThreshold})
          </span>
        );
      case 'Lebih':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <TrendingUp className="w-3 h-3" /> Lebih (&gt;{maxThreshold})
          </span>
        );
      case 'Cukup':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Cukup
          </span>
        );
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['SKU', 'Nama Barang', 'Total Qty', 'Satuan', 'Status', 'Rincian Lokasi'];
    const rows = aggregatedReport.map((item) => {
      const locStr = item.locationBreakdown
        .map((loc) => `${loc.locationCode}: ${loc.qty} ${item.unit}`)
        .join('; ');
      return [
        `"${item.sku}"`,
        `"${item.name || '-'}"`,
        item.totalQty,
        `"${item.unit}"`,
        `"${item.status}"`,
        `"${locStr}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Stok_Opname_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Refresh */}
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-850 to-neutral-900 border border-neutral-700/80 rounded-3xl p-5 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-700/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Laporan Stok Opname
              </h2>
              <p className="text-xs text-neutral-400">
                Total kuantitas per SKU, breakdown lokasi rak, dan indikator status stok
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {spreadsheetConfig && (
              <button
                id="btn-refresh-sheet-data"
                onClick={loadDataFromSpreadsheet}
                disabled={isLoadingSheet}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-xs font-semibold text-neutral-200 rounded-xl border border-neutral-700 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                title="Tarik data terbaru dari Google Spreadsheet"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoadingSheet ? 'animate-spin' : ''}`} />
                <span>{isLoadingSheet ? 'Sinkronisasi...' : 'Tarik Data Sheets'}</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              disabled={aggregatedReport.length === 0}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Unduh Laporan ke CSV / Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Highlight Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
          <div className="bg-neutral-800/60 border border-neutral-700/50 p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1">
              Total SKU Terdata
            </span>
            <span className="text-xl font-black text-white">{summaryStats.totalSkus}</span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">
              Di {summaryStats.totalLocations} lokasi rak
            </span>
          </div>

          <div className="bg-neutral-800/60 border border-neutral-700/50 p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1">
              Total Kuantitas Fisik
            </span>
            <span className="text-xl font-black text-amber-400">{summaryStats.totalQty}</span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Unit barang terhitung</span>
          </div>

          <div className="bg-neutral-800/60 border border-neutral-700/50 p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 block mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-400" /> Stok Kurang
            </span>
            <span className="text-xl font-black text-red-400">{summaryStats.kurangCount}</span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">
              SKU di bawah {minThreshold} unit
            </span>
          </div>

          <div className="bg-neutral-800/60 border border-neutral-700/50 p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Stok Cukup
            </span>
            <span className="text-xl font-black text-emerald-400">{summaryStats.cukupCount}</span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">
              {summaryStats.lebihCount} SKU berstatus Lebih
            </span>
          </div>
        </div>

        {lastRefreshedTime && (
          <p className="text-[10px] text-neutral-400 mt-3 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Data disinkronkan dari Google Sheets pada {lastRefreshedTime}
          </p>
        )}
      </div>

      {/* Filter & View Controls */}
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 shadow-xs space-y-3">
        {/* Search Bar & View Mode Toggle */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
            <input
              id="input-search-report"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode SKU, nama barang, atau lokasi rak..."
              className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 focus:bg-white dark:focus:bg-neutral-950 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden dark:text-white transition"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle View Mode: by SKU or by Location */}
            <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl text-xs font-semibold shrink-0">
              <button
                onClick={() => setViewMode('bySku')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  viewMode === 'bySku'
                    ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                <Package className="w-3.5 h-3.5" /> Per SKU
              </button>
              <button
                onClick={() => setViewMode('byLocation')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  viewMode === 'byLocation'
                    ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" /> Per Lokasi
              </button>
            </div>

            {/* Threshold Settings Toggle */}
            <button
              onClick={() => setShowThresholdConfig(!showThresholdConfig)}
              className={`p-2 rounded-xl border transition ${
                showThresholdConfig
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-750'
              }`}
              title="Atur Batas Status Stok (Kurang/Cukup/Lebih)"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Threshold Adjuster */}
        {showThresholdConfig && (
          <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-neutral-800 dark:text-neutral-200">
              <span>Pengaturan Ambang Batas Status Stok:</span>
              <button
                onClick={() => {
                  setMinThreshold(15);
                  setMaxThreshold(100);
                }}
                className="text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 underline"
              >
                Reset Default (15 & 100)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] text-neutral-600 dark:text-neutral-400 mb-1">
                  Batas Bawah &quot;Kurang&quot; (&lt; Unit)
                </label>
                <input
                  type="number"
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-600 dark:text-neutral-400 mb-1">
                  Batas Atas &quot;Lebih&quot; (&gt; Unit)
                </label>
                <input
                  type="number"
                  value={maxThreshold}
                  onChange={(e) => setMaxThreshold(Math.max(minThreshold + 1, parseInt(e.target.value) || 20))}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>
            </div>
            <p className="text-[10px] text-neutral-400">
              * Stok Kurang: total unit &lt; {minThreshold}. Stok Cukup: {minThreshold} s/d {maxThreshold}. Stok Lebih: &gt; {maxThreshold}.
            </p>
          </div>
        )}

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-semibold text-neutral-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-full font-semibold transition shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
            }`}
          >
            Semua ({summaryStats.totalSkus})
          </button>
          <button
            onClick={() => setStatusFilter('Kurang')}
            className={`px-3 py-1 rounded-full font-semibold transition shrink-0 ${
              statusFilter === 'Kurang'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            Kurang ({summaryStats.kurangCount})
          </button>
          <button
            onClick={() => setStatusFilter('Cukup')}
            className={`px-3 py-1 rounded-full font-semibold transition shrink-0 ${
              statusFilter === 'Cukup'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            Cukup ({summaryStats.cukupCount})
          </button>
          <button
            onClick={() => setStatusFilter('Lebih')}
            className={`px-3 py-1 rounded-full font-semibold transition shrink-0 ${
              statusFilter === 'Lebih'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}
          >
            Lebih ({summaryStats.lebihCount})
          </button>
        </div>
      </div>

      {/* Main Report List */}
      {viewMode === 'bySku' ? (
        <div className="space-y-2">
          {filteredReport.length === 0 ? (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-8 text-center">
              <Package className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Tidak ada data stok yang cocok
              </p>
              <p className="text-[11px] text-neutral-400 mt-1 max-w-xs mx-auto">
                Silakan lakukan opname pada menu &quot;Input Opname Rak&quot; atau periksa filter pencarian Anda.
              </p>
            </div>
          ) : (
            filteredReport.map((item) => {
              const isExpanded = !!expandedSkus[item.sku];
              return (
                <div
                  key={item.sku}
                  className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden shadow-xs hover:border-neutral-300 dark:hover:border-neutral-600 transition"
                >
                  {/* SKU Header Card */}
                  <div
                    onClick={() => toggleSkuExpand(item.sku)}
                    className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50/70 dark:hover:bg-neutral-750 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl shrink-0 font-bold">
                        <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-sm text-neutral-900 dark:text-white uppercase tracking-wider">
                            {item.sku}
                          </span>
                          {getStatusBadge(item.status)}
                        </div>
                        {item.name && (
                          <p className="text-xs text-neutral-600 dark:text-neutral-300 truncate mt-0.5">
                            {item.name}
                          </p>
                        )}
                        <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-500" />
                          <span>Tersebar di {item.locationBreakdown.length} lokasi rak</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <span className="text-base font-black text-neutral-900 dark:text-white block leading-tight">
                          {item.totalQty}
                        </span>
                        <span className="text-[10px] font-semibold text-neutral-400 block uppercase">
                          {item.unit}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-neutral-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expanded: Breakdown Kuantitas per Lokasi */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-neutral-50/90 dark:bg-neutral-900/60 border-t border-neutral-100 dark:border-neutral-700/60 text-xs space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-neutral-200/80 dark:border-neutral-800">
                        <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-amber-500" />
                          Kuantitas di Masing-masing Lokasi:
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {item.locationBreakdown.length} Titik Rak
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto">
                        {item.locationBreakdown.map((loc) => (
                          <div
                            key={loc.locationCode}
                            className="p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-lg">
                                {loc.locationCode}
                              </span>
                              {loc.countedBy && (
                                <span className="text-[10px] text-neutral-400 truncate">
                                  Petugas: {loc.countedBy}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-bold text-neutral-900 dark:text-white">
                                {loc.qty} {item.unit}
                              </span>
                              {onSelectLocation && (
                                <button
                                  onClick={() => onSelectLocation(loc.locationCode)}
                                  className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                                >
                                  Buka Rak
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* View by Location */
        <div className="space-y-2">
          {filteredLocations.length === 0 ? (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-8 text-center">
              <MapPin className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Tidak ada lokasi yang cocok
              </p>
            </div>
          ) : (
            filteredLocations.map((loc) => {
              const isExpanded = !!expandedLocations[loc.locationCode];
              return (
                <div
                  key={loc.locationCode}
                  className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden shadow-xs hover:border-neutral-300 dark:hover:border-neutral-600 transition"
                >
                  <div
                    onClick={() => toggleLocationExpand(loc.locationCode)}
                    className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50/70 dark:hover:bg-neutral-750 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl shrink-0 font-bold">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-mono font-black text-sm text-neutral-900 dark:text-white uppercase">
                          Lokasi: {loc.locationCode}
                        </h4>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Menampung {loc.items.length} SKU berbeda
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <span className="text-base font-black text-neutral-900 dark:text-white block leading-tight">
                          {loc.totalQty}
                        </span>
                        <span className="text-[10px] font-semibold text-neutral-400 block uppercase">
                          Total Unit
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-neutral-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expanded: SKU items in this location */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-neutral-50/90 dark:bg-neutral-900/60 border-t border-neutral-100 dark:border-neutral-700/60 text-xs space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-neutral-200/80 dark:border-neutral-800">
                        <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                          Daftar SKU di Rak {loc.locationCode}:
                        </span>
                        {onSelectLocation && (
                          <button
                            onClick={() => onSelectLocation(loc.locationCode)}
                            className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                          >
                            Tambah/Opname Rak Ini
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto">
                        {loc.items.map((skuItem, i) => (
                          <div
                            key={i}
                            className="p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-neutral-900 dark:text-white">
                                  {skuItem.sku}
                                </span>
                                {getStatusBadge(skuItem.status)}
                              </div>
                              {skuItem.name && (
                                <p className="text-[11px] text-neutral-500 truncate">
                                  {skuItem.name}
                                </p>
                              )}
                            </div>

                            <span className="text-xs font-bold text-neutral-900 dark:text-white shrink-0">
                              {skuItem.qty} {skuItem.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
