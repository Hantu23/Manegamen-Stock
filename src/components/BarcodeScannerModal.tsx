import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, RefreshCw, AlertCircle } from 'lucide-react';

interface ScannerProps {
  title: string;
  subtitle?: string;
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<ScannerProps> = ({
  title,
  subtitle,
  onScanSuccess,
  onClose,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'mobile-barcode-reader';

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        setIsStarting(true);
        setErrorMsg(null);

        // Formats supported include 1D Barcode (Code128, EAN13, Code39, UPC) & 2D (QR Code, Data Matrix)
        const formatsToSupport = [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ];

        const html5QrCode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport,
          verbose: false,
        });
        html5QrCodeRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: { width: 260, height: 180 },
          aspectRatio: 1.0,
        };

        // Try environment camera (back camera on mobile)
        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (isMounted) {
              // Sound haptic feedback if available
              if (navigator.vibrate) {
                navigator.vibrate(100);
              }
              onScanSuccess(decodedText);
              stopScanner();
              onClose();
            }
          },
          () => {
            // Ignore scan parse frame misses
          }
        );

        if (isMounted) {
          setIsStarting(false);
        }
      } catch (err: any) {
        console.error('Scanner init error:', err);
        if (isMounted) {
          setErrorMsg(
            err?.message ||
              'Kamera tidak dapat diakses. Pastikan izin kamera telah diberikan atau gunakan input manual.'
          );
          setIsStarting(false);
        }
      }
    };

    const stopScanner = async () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        } catch (e) {
          console.warn('Error stopping scanner:', e);
        }
      }
    };

    // Small delay to ensure DOM element is ready
    const timer = setTimeout(() => {
      startScanner();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, []);

  return (
    <div
      id="scanner-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-between items-center p-4 backdrop-blur-xs"
    >
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between text-white pt-2 pb-3">
        <div>
          <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-400" />
            {title}
          </h3>
          <p className="text-xs text-neutral-300">{subtitle || 'Arahkan kamera ke Barcode / QR Code'}</p>
        </div>
        <button
          id="btn-close-scanner"
          onClick={onClose}
          className="p-2 bg-neutral-800/80 hover:bg-neutral-700 active:scale-95 text-white rounded-full transition"
          aria-label="Tutup Kamera"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Camera Viewport */}
      <div className="w-full max-w-sm flex-1 flex flex-col items-center justify-center relative">
        <div
          id={scannerContainerId}
          className="w-full aspect-square max-h-[380px] bg-black rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-2xl relative"
        >
          {isStarting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 text-neutral-300 p-4 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-400 mb-2" />
              <p className="text-sm font-medium">Menyiapkan kamera pemindai...</p>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs flex items-start gap-2 max-w-sm">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Gagal Mengakses Kamera</p>
              <p>{errorMsg}</p>
              <p className="mt-1 text-neutral-400">Anda tetap dapat mengetik kode secara manual.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Instruction */}
      <div className="w-full max-w-md pb-6 text-center">
        <p className="text-xs text-neutral-400 mb-3">
          Mendukung Barcode 1D (Code-128, EAN) dan QR Code lokasi / barang.
        </p>
        <button
          id="btn-cancel-scan-bottom"
          onClick={onClose}
          className="w-full py-3 px-6 bg-neutral-800 hover:bg-neutral-700 active:scale-98 text-white rounded-xl text-sm font-semibold transition"
        >
          Gunakan Input Manual
        </button>
      </div>
    </div>
  );
};
