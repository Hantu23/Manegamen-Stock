import React, { useState, useEffect } from 'react';
import {
  Layers,
  MapPin,
  Barcode,
  Package,
  Send,
  FileSpreadsheet,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  History,
  Settings,
  PlusCircle,
  ExternalLink,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import { initAuth, logOutUser, setAccessToken } from './lib/firebaseAuth';
import { saveLocationOpnameBatch } from './lib/googleSheets';
import { UserProfile, StockItem, SpreadsheetConfig } from './types';
import { LoginScreen } from './components/LoginScreen';
import { LocationSelector } from './components/LocationSelector';
import { SKUListManager } from './components/SKUListManager';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { SpreadsheetSelectorModal } from './components/SpreadsheetSelectorModal';
import { HistoryView } from './components/HistoryView';
import { StockReportView } from './components/StockReportView';

interface SyncedBatchLog {
  batchId: string;
  locationCode: string;
  timestamp: string;
  itemsCount: number;
  countedBy: string;
  items: StockItem[];
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Spreadsheet Configuration
  const [spreadsheetConfig, setSpreadsheetConfig] = useState<SpreadsheetConfig | null>(() => {
    const saved = localStorage.getItem('opname_spreadsheet_config');
    return saved ? JSON.parse(saved) : null;
  });

  // Current Working Session
  const [currentLocation, setCurrentLocation] = useState<string>('RAK-A1');
  const [locationItems, setLocationItems] = useState<StockItem[]>([]);
  const [recentLocations, setRecentLocations] = useState<string[]>(() => {
    const saved = localStorage.getItem('opname_recent_locations');
    return saved ? JSON.parse(saved) : ['RAK-A1', 'RAK-A2', 'RAK-B1'];
  });

  // Synced Logs
  const [syncedBatches, setSyncedBatches] = useState<SyncedBatchLog[]>(() => {
    const saved = localStorage.getItem('opname_synced_batches');
    return saved ? JSON.parse(saved) : [];
  });

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'opname' | 'report' | 'history'>('opname');
  const [scannedSkuToFill, setScannedSkuToFill] = useState<string | null>(null);

  // Modals & UI States
  const [scannerModal, setScannerModal] = useState<{
    isOpen: boolean;
    target: 'location' | 'sku';
  }>({ isOpen: false, target: 'location' });
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Check initial Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setAccessTokenState(token);
        setAccessToken(token);
        const savedProfile = localStorage.getItem('opname_user_profile');
        if (savedProfile) {
          setCurrentUser(JSON.parse(savedProfile));
        } else {
          setCurrentUser({
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'Operator',
            email: user.email,
            photoURL: user.photoURL,
            role: 'Counter / Operator',
          });
        }
        setIsInitializing(false);
      },
      () => {
        setIsInitializing(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleLoginSuccess = (user: UserProfile, token: string) => {
    setCurrentUser(user);
    setAccessTokenState(token);
    setAccessToken(token);
    localStorage.setItem('opname_user_profile', JSON.stringify(user));
    showToast(`Selamat datang, ${user.displayName}!`);
    if (!spreadsheetConfig) {
      setShowSheetModal(true);
    }
  };

  const handleLogout = async () => {
    if (locationItems.length > 0) {
      const confirmLogout = window.confirm(
        'Ada SKU yang belum disinkronkan ke Spreadsheet. Yakin ingin keluar?'
      );
      if (!confirmLogout) return;
    }
    await logOutUser();
    setCurrentUser(null);
    setAccessTokenState(null);
    localStorage.removeItem('opname_user_profile');
  };

  const handleSaveSpreadsheetConfig = (config: SpreadsheetConfig) => {
    setSpreadsheetConfig(config);
    localStorage.setItem('opname_spreadsheet_config', JSON.stringify(config));
    showToast(`Tersambung ke Google Spreadsheet: ${config.spreadsheetTitle || config.spreadsheetId}`);
  };

  const handleSetLocation = (newLoc: string) => {
    const clean = newLoc.trim().toUpperCase();
    if (!clean) return;

    if (locationItems.length > 0 && clean !== currentLocation) {
      const confirmSwitch = window.confirm(
        `Anda sedang menginput lokasi ${currentLocation} dengan ${locationItems.length} SKU yang belum dikirim. Beralih ke lokasi ${clean} tetap menyimpan daftar SKU saat ini? Tekan OK untuk beralih.`
      );
      if (!confirmSwitch) return;
    }

    setCurrentLocation(clean);
    if (!recentLocations.includes(clean)) {
      const updated = [clean, ...recentLocations.filter((l) => l !== clean)].slice(0, 8);
      setRecentLocations(updated);
      localStorage.setItem('opname_recent_locations', JSON.stringify(updated));
    }
    showToast(`Lokasi aktif diatur ke: ${clean}`, 'info');
  };

  const handleAddItem = (item: Omit<StockItem, 'id' | 'timestamp' | 'countedBy'>) => {
    const newItem: StockItem = {
      ...item,
      id: `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleString('id-ID'),
      countedBy: currentUser?.displayName || 'Petugas',
      synced: false,
    };

    // Check if SKU already exists in this location batch: offer auto accumulate
    const existingIndex = locationItems.findIndex(
      (i) => i.sku.toUpperCase() === newItem.sku.toUpperCase()
    );

    if (existingIndex >= 0) {
      const updated = [...locationItems];
      updated[existingIndex].qty += newItem.qty;
      updated[existingIndex].timestamp = newItem.timestamp;
      setLocationItems(updated);
      showToast(`Kuantitas SKU ${newItem.sku} ditambahkan (+${newItem.qty})`);
    } else {
      setLocationItems((prev) => [newItem, ...prev]);
      showToast(`SKU ${newItem.sku} berhasil dicatat.`);
    }
  };

  const handleDeleteItem = (id: string) => {
    setLocationItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Sync entire location batch to Google Spreadsheet
  const handleSyncBatchToSpreadsheet = async () => {
    if (!accessToken) {
      showToast('Sesi Google kadaluarsa. Silakan masuk kembali.', 'error');
      return;
    }

    if (!spreadsheetConfig?.spreadsheetId) {
      setShowSheetModal(true);
      showToast('Pilih Google Spreadsheet tujuan terlebih dahulu.', 'error');
      return;
    }

    if (locationItems.length === 0) {
      showToast('Belum ada SKU untuk disimpan.', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await saveLocationOpnameBatch(
        accessToken,
        spreadsheetConfig.spreadsheetId,
        spreadsheetConfig.sheetName || 'Stock_Opname',
        currentLocation,
        locationItems,
        currentUser?.displayName || currentUser?.email || 'Operator'
      );

      const newLog: SyncedBatchLog = {
        batchId: `BATCH-${Date.now()}`,
        locationCode: currentLocation,
        timestamp: new Date().toLocaleString('id-ID'),
        itemsCount: locationItems.length,
        countedBy: currentUser?.displayName || 'Operator',
        items: [...locationItems],
      };

      const updatedLogs = [newLog, ...syncedBatches];
      setSyncedBatches(updatedLogs);
      localStorage.setItem('opname_synced_batches', JSON.stringify(updatedLogs));

      showToast(
        `Sukses! ${res.count} SKU di lokasi ${currentLocation} tersimpan ke Spreadsheet.`,
        'success'
      );

      // Clear current items and prompt for next location
      setLocationItems([]);
    } catch (err: any) {
      console.error('Sync error:', err);
      showToast(
        err.message || 'Gagal menyimpan ke Google Spreadsheet. Periksa koneksi atau izin edit file.',
        'error'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm font-medium text-neutral-300">Memuat Sistem Stock Opname...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col pb-20 sm:pb-8">
      {/* Mobile-friendly Sticky Topbar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          {/* Brand & User Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black tracking-tight text-neutral-900 dark:text-white truncate">
                  Stock Opname
                </h1>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold px-1.5 py-0.2 rounded-sm uppercase">
                  Mobile
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                <UserCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="font-semibold text-neutral-700 dark:text-neutral-300 truncate">
                  {currentUser.displayName}
                </span>
                <span>•</span>
                <span className="truncate">{currentUser.role || 'Operator'}</span>
              </div>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Spreadsheet config pill */}
            <button
              id="btn-open-sheet-config"
              onClick={() => setShowSheetModal(true)}
              className={`text-xs px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition font-medium ${
                spreadsheetConfig
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 animate-pulse'
              }`}
              title="Konfigurasi Google Spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">
                {spreadsheetConfig ? 'Sheets Terhubung' : 'Pilih Sheets'}
              </span>
            </button>

            {/* Logout button */}
            <button
              id="btn-logout"
              onClick={handleLogout}
              className="p-2 text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
              title="Keluar / Ganti Petugas"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Alert if No Spreadsheet is connected */}
        {!spreadsheetConfig && (
          <div className="max-w-2xl mx-auto mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
              Database Spreadsheet belum diatur.
            </span>
            <button
              onClick={() => setShowSheetModal(true)}
              className="font-bold underline cursor-pointer ml-2"
            >
              Hubungkan Sekarang
            </button>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="max-w-2xl w-full mx-auto p-4 flex-1 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex bg-neutral-200 dark:bg-neutral-900 p-1 rounded-xl text-xs font-semibold gap-1">
          <button
            id="tab-opname"
            onClick={() => setActiveTab('opname')}
            className={`flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'opname'
                ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span className="truncate">Input Opname</span>
          </button>
          <button
            id="tab-report"
            onClick={() => setActiveTab('report')}
            className={`flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'report'
                ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="truncate font-bold">Laporan Stok</span>
          </button>
          <button
            id="tab-history"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'history'
                ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="truncate">Riwayat ({syncedBatches.length})</span>
          </button>
        </div>

        {activeTab === 'opname' ? (
          <div className="space-y-4">
            {/* Step 1: Location selection */}
            <LocationSelector
              currentLocation={currentLocation}
              onSetLocation={handleSetLocation}
              onOpenScanner={() => setScannerModal({ isOpen: true, target: 'location' })}
              recentLocations={recentLocations}
            />

            {/* Step 2: Multi-SKU item counter for this Location */}
            <SKUListManager
              locationCode={currentLocation}
              items={locationItems}
              onAddItem={handleAddItem}
              onDeleteItem={handleDeleteItem}
              onOpenScanner={() => setScannerModal({ isOpen: true, target: 'sku' })}
              isSyncing={isSyncing}
              scannedSku={scannedSkuToFill}
              onClearScannedSku={() => setScannedSkuToFill(null)}
            />
          </div>
        ) : activeTab === 'report' ? (
          <StockReportView
            accessToken={accessToken}
            spreadsheetConfig={spreadsheetConfig}
            localBatches={syncedBatches}
            currentDraftItems={locationItems}
            currentLocation={currentLocation}
            onSelectLocation={(loc) => {
              handleSetLocation(loc);
              setActiveTab('opname');
            }}
          />
        ) : (
          <HistoryView
            syncedLogs={syncedBatches}
            spreadsheetConfig={spreadsheetConfig}
            onSelectLocationAgain={(loc) => {
              handleSetLocation(loc);
              setActiveTab('opname');
            }}
          />
        )}
      </main>

      {/* Floating Bottom Action Bar for Current Location Batch */}
      {activeTab === 'opname' && locationItems.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-3 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 shadow-2xl">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                Lokasi:{' '}
                <span className="font-mono font-bold text-neutral-900 dark:text-white uppercase">
                  {currentLocation}
                </span>
              </p>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {locationItems.length} SKU siap dikirim ke Spreadsheet
              </p>
            </div>

            <button
              id="btn-sync-to-sheet"
              disabled={isSyncing}
              onClick={handleSyncBatchToSpreadsheet}
              className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Sheets...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim ke Spreadsheet</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-16 right-4 z-50 max-w-sm px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900/90 border-emerald-700 text-emerald-100'
              : toastMessage.type === 'error'
              ? 'bg-red-900/90 border-red-700 text-red-100'
              : 'bg-neutral-800/90 border-neutral-700 text-white'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Barcode / QR Camera Scanner Modal */}
      {scannerModal.isOpen && (
        <BarcodeScannerModal
          title={
            scannerModal.target === 'location'
              ? 'Scan Barcode / QR Lokasi Rak'
              : 'Scan Barcode / SKU Barang'
          }
          subtitle={
            scannerModal.target === 'location'
              ? 'Arahkan kamera ke label rak gudang'
              : 'Arahkan kamera ke barcode produk di rak'
          }
          onScanSuccess={(code) => {
            const cleanCode = code.trim().toUpperCase();
            if (scannerModal.target === 'location') {
              handleSetLocation(cleanCode);
              setScannerModal({ isOpen: false, target: 'location' });
            } else {
              // Direct auto fill into SKU input field
              setScannedSkuToFill(cleanCode);
              setScannerModal({ isOpen: false, target: 'sku' });
              showToast(`Barcode/QR terdeteksi: ${cleanCode}. Terisi di kolom input SKU!`, 'success');
            }
          }}
          onClose={() => setScannerModal({ isOpen: false, target: 'location' })}
        />
      )}

      {/* Google Spreadsheet Selector Modal */}
      {showSheetModal && accessToken && (
        <SpreadsheetSelectorModal
          accessToken={accessToken}
          currentConfig={spreadsheetConfig}
          onSaveConfig={handleSaveSpreadsheetConfig}
          onClose={() => setShowSheetModal(false)}
        />
      )}
    </div>
  );
}
