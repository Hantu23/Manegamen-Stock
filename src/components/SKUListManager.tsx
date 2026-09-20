import React, { useState } from 'react';
import {
  Barcode,
  Plus,
  Trash2,
  Edit2,
  Package,
  Layers,
  ChevronDown,
  Check,
  Search,
} from 'lucide-react';
import { StockItem } from '../types';

interface SKUListManagerProps {
  locationCode: string;
  items: StockItem[];
  onAddItem: (item: Omit<StockItem, 'id' | 'timestamp' | 'countedBy'>) => void;
  onDeleteItem: (id: string) => void;
  onOpenScanner: () => void;
  isSyncing: boolean;
  scannedSku?: string | null;
  onClearScannedSku?: () => void;
}

const COMMON_UNITS = ['PCS', 'BOX', 'PACK', 'CTN', 'ROLL', 'SET', 'KG', 'MTR'];

export const SKUListManager: React.FC<SKUListManagerProps> = ({
  locationCode,
  items,
  onAddItem,
  onDeleteItem,
  onOpenScanner,
  isSyncing,
  scannedSku,
  onClearScannedSku,
}) => {
  const [skuInput, setSkuInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [qtyInput, setQtyInput] = useState('1');
  const [unitInput, setUnitInput] = useState('PCS');
  const [noteInput, setNoteInput] = useState('');
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [justScanned, setJustScanned] = useState(false);

  // When a barcode or QR code is scanned, auto-fill the SKU input field immediately
  React.useEffect(() => {
    if (scannedSku && scannedSku.trim()) {
      setSkuInput(scannedSku.trim().toUpperCase());
      setJustScanned(true);
      const timer = setTimeout(() => setJustScanned(false), 3000);
      if (onClearScannedSku) onClearScannedSku();
      return () => clearTimeout(timer);
    }
  }, [scannedSku]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSku = skuInput.trim().toUpperCase();
    const numQty = parseFloat(qtyInput);

    if (!cleanSku) return;
    if (isNaN(numQty) || numQty < 0) return;

    onAddItem({
      sku: cleanSku,
      name: nameInput.trim() || undefined,
      qty: numQty,
      unit: unitInput,
      note: noteInput.trim() || undefined,
    });

    // Reset inputs for fast continuous typing/scanning
    setSkuInput('');
    setNameInput('');
    setQtyInput('1');
    setNoteInput('');
  };

  const filteredItems = items.filter(
    (item) =>
      item.sku.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (item.name && item.name.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (item.note && item.note.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const totalQtyInLocation = items.reduce((acc, curr) => acc + curr.qty, 0);

  return (
    <div className="space-y-4">
      {/* Input Box Card */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Package className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Input SKU di Lokasi <span className="text-emerald-600 dark:text-emerald-400 font-mono">{locationCode}</span>
            </h3>
          </div>
          <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-full font-medium">
            {items.length} SKU terdata
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* SKU Field with Scan Button */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                Barcode / SKU Barang *
              </label>
              {justScanned && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800 animate-pulse flex items-center gap-1">
                  <Check className="w-3 h-3" /> Hasil scan terisi otomatis
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                id="input-sku-code"
                type="text"
                required
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                placeholder="Scan barcode atau ketik SKU (cth: SKU-8821)"
                className={`flex-1 text-sm font-mono uppercase px-3.5 py-2.5 rounded-xl border bg-neutral-50 dark:bg-neutral-900 focus:bg-white dark:focus:bg-neutral-950 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden dark:text-white transition ${
                  justScanned
                    ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-2 ring-emerald-400'
                    : 'border-neutral-300 dark:border-neutral-700'
                }`}
              />
              <button
                type="button"
                id="btn-scan-sku-camera"
                onClick={onOpenScanner}
                className="px-3.5 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-white dark:bg-neutral-700 dark:hover:bg-neutral-600 rounded-xl flex items-center gap-1.5 text-xs font-semibold shrink-0 transition cursor-pointer"
                title="Aktifkan Kamera Scan Barcode / QR Code"
              >
                <Barcode className="w-4 h-4 text-amber-400" />
                <span className="font-bold">Scan SKU</span>
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">
              Ketuk tombol &quot;Scan SKU&quot; untuk mengaktifkan kamera pemindai barcode / QR code produk.
            </p>
          </div>

          {/* Qty & Unit Row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                Jumlah Fisik (Qty) *
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(qtyInput) || 0;
                    if (val > 1) setQtyInput(String(val - 1));
                  }}
                  className="w-9 h-10 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-l-xl font-bold text-neutral-700 dark:text-neutral-200 flex items-center justify-center select-none"
                >
                  -
                </button>
                <input
                  id="input-sku-qty"
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={qtyInput}
                  onChange={(e) => setQtyInput(e.target.value)}
                  className="w-full text-center text-sm font-bold h-10 border-y border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(qtyInput) || 0;
                    setQtyInput(String(val + 1));
                  }}
                  className="w-9 h-10 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-r-xl font-bold text-neutral-700 dark:text-neutral-200 flex items-center justify-center select-none"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                Satuan
              </label>
              <select
                id="select-sku-unit"
                value={unitInput}
                onChange={(e) => setUnitInput(e.target.value)}
                className="w-full h-10 text-xs font-semibold px-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Collapsible item name & note */}
          <div>
            <button
              type="button"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center gap-1 font-medium transition py-1"
            >
              <span>{showMoreDetails ? 'Sembunyikan' : '+ Tambah'} Nama Barang & Catatan</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transform transition-transform ${
                  showMoreDetails ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showMoreDetails && (
              <div className="space-y-2 pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-700">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-300 mb-0.5">
                    Nama Deskripsi Produk
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="cth: Minyak Goreng 2L Pouch"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-300 mb-0.5">
                    Catatan Kondisi / Batch / Expired
                  </label>
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="cth: Kondisi box robek 1, Exp Des 2026"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Add to list button */}
          <button
            type="submit"
            id="btn-add-sku-to-location"
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Masukkan SKU ke Lokasi {locationCode}
          </button>
        </form>
      </div>

      {/* List of Scanned Items for this Location */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Daftar SKU di Rak/Lokasi Ini ({items.length})
            </h4>
            <p className="text-[11px] text-neutral-400">
              Total kuantiti fisik:{' '}
              <span className="font-bold text-neutral-800 dark:text-neutral-200">
                {totalQtyInLocation} unit
              </span>
            </p>
          </div>

          {items.length > 5 && (
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-2 text-neutral-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Cari SKU..."
                className="text-[11px] pl-6 pr-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-hidden"
              />
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="bg-neutral-50 dark:bg-neutral-800/40 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl p-8 text-center">
            <Package className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-60" />
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              Belum ada SKU yang dihitung di lokasi ini
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5 max-w-xs mx-auto">
              Scan barcode barang atau ketik kode SKU pada formulir di atas. Satu lokasi dapat menampung 10 SKU atau lebih sekaligus.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-0.5">
            {filteredItems.map((item, index) => (
              <div
                key={item.id}
                className="bg-white dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-600 transition"
              >
                {/* Index & SKU info */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white uppercase tracking-wider">
                        {item.sku}
                      </span>
                      {item.unit && (
                        <span className="text-[10px] bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.2 rounded font-medium">
                          {item.unit}
                        </span>
                      )}
                    </div>
                    {item.name && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 truncate">
                        {item.name}
                      </p>
                    )}
                    {item.note && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 italic truncate">
                        Catatan: {item.note}
                      </p>
                    )}
                    <span className="text-[10px] text-neutral-400 block">
                      Oleh: {item.countedBy} • {item.timestamp}
                    </span>
                  </div>
                </div>

                {/* Qty Badge & Action */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-right">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {item.qty}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-1">
                      {item.unit}
                    </span>
                  </div>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition"
                    title="Hapus item ini dari lokasi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
