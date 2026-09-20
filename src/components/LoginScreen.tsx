import React, { useState } from 'react';
import { LogIn, ShieldCheck, Database, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { googleSignIn } from '../lib/firebaseAuth';
import { UserProfile } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile, token: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [operatorName, setOperatorName] = useState('');
  const [role, setRole] = useState<'Counter / Operator' | 'Supervisor Gudang' | 'Admin Logistik'>(
    'Counter / Operator'
  );
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const authResult = await googleSignIn();
      if (authResult) {
        const userProfile: UserProfile = {
          uid: authResult.user.uid,
          displayName:
            operatorName.trim() ||
            authResult.user.displayName ||
            authResult.user.email?.split('@')[0] ||
            'Operator Gudang',
          email: authResult.user.email,
          photoURL: authResult.user.photoURL,
          role: role,
        };
        onLoginSuccess(userProfile, authResult.accessToken);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(
        err?.message || 'Gagal masuk akun Google. Pastikan popup tidak diblokir oleh browser.'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Brand */}
      <div className="max-w-md w-full mx-auto pt-6 pb-2 text-center">
        <div className="inline-flex items-center justify-center p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-3 shadow-inner">
          <Layers className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white">Stock Opname Mobile</h1>
        <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
          Scan barcode lokasi gudang, hitung multi-SKU (10+ item per rak), otomatis rekap ke Google Spreadsheet.
        </p>
      </div>

      {/* Main Card */}
      <div className="max-w-md w-full mx-auto bg-neutral-800/90 border border-neutral-700/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
        <div className="mb-5">
          <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-full">
            Multi-User & Warehouse Mode
          </span>
          <h2 className="text-lg font-bold text-white mt-2.5">Masuk Petugas Gudang</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Setiap opname SKU akan otomatis diberi stempel nama petugas dan waktu fisik.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Otentikasi Gagal</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* User identification inputs */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Nama Petugas / Alias (Opsional)
            </label>
            <input
              id="input-operator-name"
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="cth: Budi (Shift Pagi) atau Rak 3B Team"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-700 bg-neutral-900/90 text-white placeholder-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              Jika dikosongkan, nama profil akun Google Anda yang akan digunakan.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Peran / Jabatan
            </label>
            <select
              id="select-operator-role"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-700 bg-neutral-900/90 text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
            >
              <option value="Counter / Operator">Petugas Hitung (Counter / Operator)</option>
              <option value="Supervisor Gudang">Supervisor / Verifikator Gudang</option>
              <option value="Admin Logistik">Admin Logistik & Inventori</option>
            </select>
          </div>
        </div>

        {/* Google Workspace Sign-In Button */}
        <div className="pt-2 border-t border-neutral-700/60">
          <p className="text-[11px] text-neutral-400 text-center mb-3">
            Diperlukan otorisasi Google untuk menulis langsung ke Spreadsheet:
          </p>

          <button
            id="btn-google-sign-in"
            disabled={isSigningIn}
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-neutral-100 active:scale-98 text-neutral-800 font-semibold text-sm py-3 px-4 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            {/* Google SVG standard icon */}
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>{isSigningIn ? 'Menghubungkan Akun...' : 'Masuk dengan Google'}</span>
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="mt-5 grid grid-cols-2 gap-2 text-[11px] text-neutral-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Multi-petugas simultan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Scan 1D & 2D Barcode</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>1 Lokasi &gt; 10 SKU</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Live Sync Spreadsheet</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center py-4 text-xs text-neutral-500 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Keamanan OAuth Terverifikasi Google Cloud</span>
      </div>
    </div>
  );
};
