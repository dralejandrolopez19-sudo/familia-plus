import React, { useState, useEffect } from 'react';
import { Download, Wifi, WifiOff, Cloud, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}

interface PWAHeaderControlsProps {
  isCloudSynced: boolean;
  onTriggerToast: (msg: string) => void;
}

export const PWAHeaderControls: React.FC<PWAHeaderControlsProps> = ({
  isCloudSynced,
  onTriggerToast,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showInstallModal, setShowInstallModal] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Online / Offline + Cloud Sync Pill */}
        <div
          title={
            isOnline
              ? isCloudSynced
                ? 'Conectado: Sincronización multimédico en Firestore activa'
                : 'Conectado: Guardado local y respaldo listos'
              : 'Modo Offline Terreno UNAP: Los cambios se guardan localmente y se sincronizarán al recuperar señal'
          }
          className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-colors ${
            isOnline
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}
        >
          {isOnline ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{isCloudSynced ? 'Nube UNAP' : 'En línea'}</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
              <span>Modo Terreno Offline</span>
            </>
          )}
        </div>

        {/* In-App PWA Install Button */}
        {!isInstalled && (
          <button
            type="button"
            onClick={async () => {
              if (isInstallable) {
                const ok = await install();
                if (ok) {
                  onTriggerToast('Familia+ instalada correctamente en este dispositivo');
                }
              } else {
                setShowInstallModal(true);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 text-[11px] font-extrabold transition-colors cursor-pointer whitespace-nowrap"
            title="Instalar Familia+ como aplicación (PWA) para uso en consultorio y terreno"
          >
            <Download className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span className="hidden xl:inline">Instalar App</span>
          </button>
        )}
      </div>

      {/* Floating Offline Banner when disconnected in the field */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-lg border border-white/20">
          <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
          <span>
            Modo Terreno Offline activo — Sus fichas, visitas y recetas se guardan en el dispositivo y sincronizarán al volver la señal.
          </span>
        </div>
      )}

      {/* Guided Installation Modal (for iOS Safari / Desktop browsers when prompt isn't immediate) */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div
              className="px-5 py-4 text-white flex items-center justify-between"
              style={{ backgroundColor: 'var(--sidebar-from)' }}
            >
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-extrabold">
                  Instalar Familia+ (Modo App y Terreno Offline)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-700 leading-relaxed">
              <p className="font-semibold text-slate-900">
                Familia+ cumple con el estándar de Aplicación Web Progresiva (PWA) para trabajar en el consultorio y durante visitas domiciliarias sin señal:
              </p>

              {isIOS ? (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <p className="font-extrabold text-teal-900">En iPhone o iPad (Safari):</p>
                  <p>1. Toque el botón <strong>Compartir</strong> en la barra de Safari.</p>
                  <p>2. Deslice hacia abajo y seleccione <strong>"Agregar a pantalla de inicio"</strong>.</p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <p className="font-extrabold text-teal-900">
                    En Computadora (Chrome / Edge) o Tableta Android:
                  </p>
                  <p>
                    1. Haga clic en el icono de <strong>Instalar Familia+</strong> en el extremo derecho de la barra de direcciones del navegador (o en el menú ⋮ → <strong>Instalar aplicación</strong>).
                  </p>
                  <p>
                    2. La aplicación se abrirá en ventana independiente y conservará en caché las fichas clínicas para visitas domiciliarias en terreno.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl font-bold">
                <Wifi className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Service Worker activo: Caché offline y sincronización Firestore habilitados.</span>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowInstallModal(false)}
                  className="px-4 py-2 rounded-xl text-white text-xs font-extrabold cursor-pointer"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
