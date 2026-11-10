import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  googleProvider,
  signInWithPopup,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  DoctorProfile,
  buildDoctorProfileFromGoogleUser,
} from '../data/doctorsData';
import { FamiliaLogoEmblem } from './BrandVisuals';

interface LoginScreenProps {
  doctorsTeam: DoctorProfile[];
  onSelectDoctorAndContinue: (doctor: DoctorProfile) => void;
  onRegisterNewDoctor: (doctor: DoctorProfile) => void;
  onGoogleDoctorAuthenticated: (doctor: DoctorProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  doctorsTeam,
  onSelectDoctorAndContinue,
  onRegisterNewDoctor,
  onGoogleDoctorAuthenticated,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRoster, setShowRoster] = useState(false);
  const [showNewDoctorForm, setShowNewDoctorForm] = useState(false);

  // Formulario rápido para registro manual
  const [newDocName, setNewDocName] = useState('');
  const [newDocExequatur, setNewDocExequatur] = useState('');
  const [newDocCmd, setNewDocCmd] = useState('');
  const [newDocConsultorio, setNewDocConsultorio] = useState('Consultorio 101');

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      const docRef = doc(db, 'doctors', fbUser.uid);
      let doctorProfile = buildDoctorProfileFromGoogleUser({
        uid: fbUser.uid,
        displayName: fbUser.displayName,
        email: fbUser.email,
        photoURL: fbUser.photoURL,
      });

      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          doctorProfile = {
            ...doctorProfile,
            name: data.name || doctorProfile.name,
            email: data.email || doctorProfile.email,
            exequatur: data.exequatur || doctorProfile.exequatur,
            cmd: data.cmd || doctorProfile.cmd,
            specialty: data.specialty || doctorProfile.specialty,
            consultorio: data.consultorio || doctorProfile.consultorio,
            unapCenter: data.unapCenter || doctorProfile.unapCenter,
            shift: data.shift || doctorProfile.shift,
          };
        } else {
          await setDoc(docRef, {
            id: doctorProfile.id,
            name: doctorProfile.name,
            email: doctorProfile.email,
            exequatur: doctorProfile.exequatur,
            cmd: doctorProfile.cmd,
            specialty: doctorProfile.specialty,
            consultorio: doctorProfile.consultorio,
            unapCenter: doctorProfile.unapCenter,
            shift: doctorProfile.shift,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `doctors/${fbUser.uid}`);
      }

      onGoogleDoctorAuthenticated(doctorProfile);
    } catch (error: any) {
      console.error('Error al iniciar sesión con Google:', error);
      if (error?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Inicio de sesión cancelado.');
      } else if (error?.code === 'auth/popup-blocked') {
        setErrorMessage('La ventana emergente fue bloqueada por el navegador.');
      } else {
        setErrorMessage('No se pudo conectar con Google. Intente nuevamente.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCreateDoctorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;
    const formattedName =
      newDocName.trim().toLowerCase().startsWith('dr')
        ? newDocName.trim()
        : `Dr(a). ${newDocName.trim()}`;
    const cleanParts = newDocName
      .replace(/dr\(a\)\.|dra\.|dr\./gi, '')
      .trim()
      .split(/\s+/);
    const initials =
      cleanParts.length >= 2
        ? `${cleanParts[0][0]}${cleanParts[1][0]}`.toUpperCase()
        : cleanParts[0].slice(0, 2).toUpperCase();

    const createdDoctor: DoctorProfile = {
      id: `doc-${Date.now()}`,
      name: formattedName,
      initials,
      email: 'medico.familiar@familiaplus.do',
      exequatur: newDocExequatur.trim() || 'Pendiente',
      cmd: newDocCmd.trim() || 'Pendiente',
      specialty: 'Médico Familiar y Comunitario',
      consultorio: newDocConsultorio.trim() || 'Consultorio 101',
      unapCenter: 'UNAP Familia+',
      shift: 'Matutino',
      avatarBg: '#0d9488',
      updatedAt: new Date().toISOString(),
    };

    onRegisterNewDoctor(createdDoctor);
    onSelectDoctorAndContinue(createdDoctor);
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Brand header simple & clean */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <FamiliaLogoEmblem size={44} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Familia<span style={{ color: 'var(--brand-accent)' }}>+</span>
          </h1>
          <p className="text-xs text-slate-500">
            Sistema de Medicina Familiar y Comunitaria
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Botón principal de Google */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full h-11 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 20.9 7.4 24 12 24z"
              />
            </svg>
            <span>
              {isSigningIn ? 'Iniciando sesión...' : 'Continuar con Google'}
            </span>
          </button>
        </div>

        {/* Separador minimalista */}
        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-slate-200" />
          <span className="absolute bg-white px-2.5 text-[11px] text-slate-400">
            o
          </span>
        </div>

        {/* Acceso por perfil de guardia */}
        <div>
          <button
            type="button"
            onClick={() => {
              setShowRoster(!showRoster);
              setShowNewDoctorForm(false);
            }}
            className="w-full py-2 text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Seleccionar médico de guardia</span>
            {showRoster ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showRoster && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
              {!showNewDoctorForm ? (
                <>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {doctorsTeam.map((docItem) => (
                      <button
                        key={docItem.id}
                        type="button"
                        onClick={() => onSelectDoctorAndContinue(docItem)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded-lg text-white font-bold text-[11px] flex items-center justify-center shrink-0"
                            style={{ backgroundColor: docItem.avatarBg }}
                          >
                            {docItem.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {docItem.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {docItem.consultorio}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-600 shrink-0" />
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowNewDoctorForm(true)}
                    className="w-full py-2 text-[11px] font-semibold text-teal-700 hover:text-teal-800 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Agregar médico</span>
                  </button>
                </>
              ) : (
                <form
                  onSubmit={handleCreateDoctorSubmit}
                  className="space-y-2.5 text-xs pt-1"
                >
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Nombre del médico
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Dr. Juan Pérez"
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        Exequátur
                      </label>
                      <input
                        type="text"
                        placeholder="000-00"
                        value={newDocExequatur}
                        onChange={(e) => setNewDocExequatur(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        CMD
                      </label>
                      <input
                        type="text"
                        placeholder="CMD 0000"
                        value={newDocCmd}
                        onChange={(e) => setNewDocCmd(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Consultorio
                    </label>
                    <input
                      type="text"
                      value={newDocConsultorio}
                      onChange={(e) => setNewDocConsultorio(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowNewDoctorForm(false)}
                      className="w-1/2 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Pie mínimo */}
        <p className="text-[11px] text-center text-slate-400 pt-2">
          Atención Primaria · Confidencialidad Ley 42-01
        </p>
      </div>
    </div>
  );
};
