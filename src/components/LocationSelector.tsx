import React, { useState } from 'react';
import {
  MapPin,
  Barcode,
  ArrowRight,
  History,
  CheckCircle2,
  Box,
  Layers,
  Sparkles,
} from 'lucide-react';

interface LocationSelectorProps {
  currentLocation: string;
  onSetLocation: (locationCode: string) => void;
  onOpenScanner: () => void;
  recentLocations: string[];
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  currentLocation,
  onSetLocation,
  onOpenScanner,
  recentLocations,
}) => {
  const [typedLocation, setTypedLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = typedLocation.trim().toUpperCase();
    if (clean) {
      onSetLocation(clean);
      setTypedLocation('');
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
            <MapPin className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            Pilih / Scan Lokasi Rak
          </h3>
        </div>
        {currentLocation && (
          <span className="text-[11px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-amber-500" /> {currentLocation}
          </span>
        )}
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
        Pindai QR/Barcode rak gudang atau ketik kode rak/bin (misal: <strong className="font-mono text-neutral-700 dark:text-neutral-200">A-01-04</strong> atau <strong className="font-mono text-neutral-700 dark:text-neutral-200">GUDANG-B2</strong>).
      </p>

      {/* Input & Scan Buttons */}
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="input-location-code"
              type="text"
              value={typedLocation}
              onChange={(e) => setTypedLocation(e.target.value)}
              placeholder="Tulis kode lokasi (cth: RAK-A1)..."
              className="w-full text-sm font-mono uppercase pl-3 pr-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 focus:bg-white dark:focus:bg-neutral-950 focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white transition"
            />
          </div>

          <button
            type="submit"
            disabled={!typedLocation.trim()}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
          >
            <span>Terapkan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Big camera scanner CTA */}
        <button
          type="button"
          id="btn-scan-location-camera"
          onClick={onOpenScanner}
          className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-700 dark:hover:bg-neutral-600 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
        >
          <Barcode className="w-4 h-4 text-amber-400" />
          <span>Scan Barcode / QR Code Lokasi dengan Kamera</span>
        </button>
      </form>

      {/* Quick recent locations */}
      {recentLocations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700/60">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400 mb-2">
            <History className="w-3 h-3" />
            <span>Lokasi Terakhir Dihitung:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentLocations.map((loc) => (
              <button
                key={loc}
                onClick={() => onSetLocation(loc)}
                className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition ${
                  currentLocation === loc
                    ? 'bg-amber-500 text-white border-amber-600 font-bold'
                    : 'bg-neutral-100 dark:bg-neutral-700/60 border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:border-amber-400'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
