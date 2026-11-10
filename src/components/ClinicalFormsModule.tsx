import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Stethoscope,
  Users,
  Activity,
  ShieldCheck,
  HeartHandshake,
  ArrowLeftRight,
  Printer,
  CheckCircle2,
  Cloud,
  RefreshCw,
  Plus,
  Trash2,
  History,
  UserCheck,
  AlertTriangle,
  Sparkles,
  Check,
  X,
  Building2,
  ClipboardList,
  Calendar,
  Download,
  Calculator,
  Network,
  Home,
  MapPin,
} from 'lucide-react';
import { Patient, CIE10_SUGGESTIONS } from '../data/mockClinicalData';
import {
  ClinicalFormTabId,
  PatientClinicalRecordBundle,
  buildDefaultClinicalRecordForPatient,
  buildDefaultHomeVisitForPatient,
  ConsultationEncounterRecord,
  LifecycleStageType,
  HomeVisitRecord,
} from '../data/clinicalFormsData';
import {
  HomeVisitClinicalEditor,
  HomeVisitPrintableActModal,
} from './HomeVisitModule';
import {
  db,
  auth,
  googleProvider,
  doc,
  setDoc,
  onSnapshot,
  signInWithPopup,
  onAuthStateChanged,
  handleFirestoreError,
  OperationType,
  User,
} from '../firebase';
import { DominicanFlagIcon, FamiliaLogoEmblem } from './BrandVisuals';
import { DoctorProfile } from '../data/doctorsData';
import {
  scheduleBackgroundClinicalTextAnalysis,
  checkMedicationSafetyInBackground,
  evaluateVitalsRiskInBackground,
} from '../services/backgroundClinicalEngine';
import { FamiliogramaEcomapaCanvas } from './FamiliogramaEcomapaCanvas';

interface ClinicalFormsModuleProps {
  patients: Patient[];
  selectedPatient: Patient | null;
  activeDoctor: DoctorProfile;
  onSelectPatient: (patient: Patient) => void;
  onOpenNewPatient?: () => void;
  onUpdatePatientFromForms?: (
    patientId: string,
    updates: Partial<Patient>
  ) => void;
  onTriggerToast: (msg: string) => void;
  initialTab?: ClinicalFormTabId;
}

const EMPTY_PATIENT_FALLBACK: Patient = {
  id: 'empty-patient',
  code: '000001',
  name: 'Sin paciente seleccionado',
  initials: 'SP',
  age: 30,
  gender: 'Femenino',
  avatarBg: '#0d9488',
  avatarText: '#ffffff',
  conditions: [],
  allergies: ['Ninguna conocida'],
  vitals: {
    ta: '120 / 80',
    fc: '72',
    temp: '36.5 °C',
    weight: '70.0 kg',
    heightCm: 165,
    spo2: '98%',
    glucose: '95 mg/dL',
  },
  diagnoses: [],
  managementPlan: [],
  medications: [],
  indications: [],
  labOrders: [],
  cedula: '',
  phone: '',
  bloodType: 'O+',
  ars: 'ARS SENASA Contributivo',
  address: 'República Dominicana',
  lastVisit: '',
  nextFollowUp: '',
  notes: [],
};

const FORM_TABS: {
  id: ClinicalFormTabId;
  number: string;
  label: string;
  shortDesc: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'historia-individual',
    number: '01',
    label: 'Historia Clínica Individual',
    shortDesc: 'Filiación, antecedentes, alergias y examen físico',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: 'consulta-medica',
    number: '02',
    label: 'Consulta Médica',
    shortDesc: 'EA, signos vitales, CIE-10, plan e historial',
    icon: <Stethoscope className="w-4 h-4" />,
  },
  {
    id: 'ficha-familiar',
    number: '03',
    label: 'Ficha Familiar',
    shortDesc: 'Hogar, parentesco, vivienda y riesgos',
    icon: <Users className="w-4 h-4" />,
  },
  {
    id: 'enfermedades-cronicas',
    number: '04',
    label: 'Enfermedades Crónicas',
    shortDesc: 'HTA, diabetes, obesidad y dislipidemia',
    icon: <Activity className="w-4 h-4" />,
  },
  {
    id: 'prevencion-tamizaje',
    number: '05',
    label: 'Fichas de Prevención',
    shortDesc: 'Vacunación PAI, controles y tamizajes',
    icon: <ShieldCheck className="w-4 h-4" />,
  },
  {
    id: 'fichas-especiales',
    number: '06',
    label: 'Fichas Especiales',
    shortDesc: 'Embarazo, puerperio, niño, adolescente y adulto mayor',
    icon: <HeartHandshake className="w-4 h-4" />,
  },
  {
    id: 'referencia-contrarreferencia',
    number: '07',
    label: 'Referencia y Contrarreferencia',
    shortDesc: 'Derivación intercentros, resumen y retorno',
    icon: <ArrowLeftRight className="w-4 h-4" />,
  },
  {
    id: 'visita-domiciliaria',
    number: '08',
    label: 'Visita Domiciliaria',
    shortDesc: 'Ruta, Barthel/UPP, Zarit, vectores y acta en terreno',
    icon: <Home className="w-4 h-4" />,
  },
];

const LOCAL_STORAGE_KEY_PREFIX = 'familia_plus_clean_clinical_record_v3_';

export const ClinicalFormsModule: React.FC<ClinicalFormsModuleProps> = ({
  patients,
  selectedPatient: rawSelectedPatient,
  activeDoctor,
  onSelectPatient,
  onOpenNewPatient,
  onUpdatePatientFromForms,
  onTriggerToast,
  initialTab = 'historia-individual',
}) => {
  const selectedPatient = rawSelectedPatient || patients[0] || EMPTY_PATIENT_FALLBACK;
  const hasRealPatient = Boolean(rawSelectedPatient || patients.length > 0);
  const [activeTab, setActiveTab] = useState<ClinicalFormTabId>(initialTab);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'cloud-synced' | 'error'>(
    'saved'
  );
  const [lastSavedTime, setLastSavedTime] = useState<string>('Listo');
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printScope, setPrintScope] = useState<'active-tab' | 'full-dossier'>('active-tab');

  // Clinical Record State for Active Patient
  const [record, setRecord] = useState<PatientClinicalRecordBundle>(() => {
    const savedLocal = localStorage.getItem(
      `${LOCAL_STORAGE_KEY_PREFIX}${selectedPatient.id}`
    );
    if (savedLocal) {
      try {
        return JSON.parse(savedLocal);
      } catch {
        // Fallback to default
      }
    }
    return buildDefaultClinicalRecordForPatient(selectedPatient);
  });

  // Quick Add Member inputs (Form 3)
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRel, setNewMemberRel] = useState('Hijo(a)');
  const [newMemberAge, setNewMemberAge] = useState('14');
  const [newMemberSex, setNewMemberSex] = useState<'F' | 'M'>('F');
  const [newMemberHealth, setNewMemberHealth] = useState('Sano aparente');

  // Quick Add Medication inputs (Form 1)
  const [newMedHabitualName, setNewMedHabitualName] = useState('');
  const [newMedHabitualDose, setNewMedHabitualDose] = useState('1 tableta cada 12h');
  const [newMedHabitualInd, setNewMedHabitualInd] = useState('Control crónico');

  // Quick Add Vaccine inputs (Form 5)
  const [newVacName, setNewVacName] = useState('');
  const [newVacDose, setNewVacDose] = useState('Refuerzo');

  // Quick Add Screening inputs (Form 5)
  const [newScreenName, setNewScreenName] = useState('');
  const [newScreenResult, setNewScreenResult] = useState('Normal / Negativo');

  // Interactive APGAR Familiar (Smilkstein 0-2 points per item, 5 items = 0-10 pts)
  const [apgarScores, setApgarScores] = useState<{
    adaptacion: number;
    participacion: number;
    gradiente: number;
    afectividad: number;
    resolucion: number;
  }>({
    adaptacion: 2,
    participacion: 2,
    gradiente: 2,
    afectividad: 2,
    resolucion: 1,
  });

  const totalApgarScore =
    apgarScores.adaptacion +
    apgarScores.participacion +
    apgarScores.gradiente +
    apgarScores.afectividad +
    apgarScores.resolucion;

  const apgarInterpretation =
    totalApgarScore >= 7
      ? { label: 'Familia Funcional Normal (7–10 pts)', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' }
      : totalApgarScore >= 4
      ? { label: 'Disfunción Familiar Moderada (4–6 pts)', color: 'bg-amber-50 text-amber-800 border-amber-300' }
      : { label: 'Disfunción Familiar Severa (0–3 pts)', color: 'bg-rose-50 text-rose-800 border-rose-300' };

  // Live CKD-EPI GFR Calculator Helper
  const calculateCkdEpiTfg = (creatinineStr: string): { value: number; stage: string; badgeClass: string } => {
    const scr = parseFloat(creatinineStr);
    if (isNaN(scr) || scr <= 0) {
      return { value: 90, stage: 'Estadio G1 (Normal ≥ 90)', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }
    const isFemale = selectedPatient.gender === 'Femenino';
    const k = isFemale ? 0.7 : 0.9;
    const alpha = isFemale ? -0.241 : -0.302;
    const genderFactor = isFemale ? 1.012 : 1.0;
    const ratio = scr / k;
    const minPart = Math.pow(Math.min(ratio, 1), alpha);
    const maxPart = Math.pow(Math.max(ratio, 1), -1.2);
    const ageFactor = Math.pow(0.9938, selectedPatient.age);
    const eGfr = Math.round(142 * minPart * maxPart * ageFactor * genderFactor);

    if (eGfr >= 90) {
      return { value: eGfr, stage: 'Estadio G1 (Normal o elevado)', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    } else if (eGfr >= 60) {
      return { value: eGfr, stage: 'Estadio G2 (Descenso leve)', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200' };
    } else if (eGfr >= 45) {
      return { value: eGfr, stage: 'Estadio G3a (Descenso ligero-moderado)', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' };
    } else if (eGfr >= 30) {
      return { value: eGfr, stage: 'Estadio G3b (Descenso moderado-severo)', badgeClass: 'bg-orange-50 text-orange-800 border-orange-200' };
    } else {
      return { value: eGfr, stage: 'Estadio G4/G5 (Referir a Nefrología)', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200' };
    }
  };

  // Export Patient Dossier as JSON Backup
  const handleExportRecordJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(record, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `expediente_msp_${selectedPatient.code}_${selectedPatient.name.replace(/\s+/g, '_').toLowerCase()}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onTriggerToast(`Respaldo JSON descargado para ${selectedPatient.name}`);
  };

  const isRemoteUpdateRef = useRef(false);
  const autoSaveTimerRef = useRef<number | null>(null);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
    });
    return () => unsub();
  }, []);

  // Load patient record when selectedPatient changes & subscribe to Firestore if signed in
  useEffect(() => {
    if (!hasRealPatient || selectedPatient.id === 'empty-patient') return;
    const localKey = `${LOCAL_STORAGE_KEY_PREFIX}${selectedPatient.id}`;
    const savedLocal = localStorage.getItem(localKey);
    let initialBundle = buildDefaultClinicalRecordForPatient(selectedPatient);
    if (savedLocal) {
      try {
        initialBundle = JSON.parse(savedLocal);
      } catch {
        // ignore parse error
      }
    }
    isRemoteUpdateRef.current = true;
    setRecord(initialBundle);

    if (!firebaseUser) return;

    const docRef = doc(db, 'clinicalRecords', selectedPatient.id);
    const unsubSnapshot = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.payloadJson) {
            try {
              const parsed = JSON.parse(data.payloadJson) as PatientClinicalRecordBundle;
              isRemoteUpdateRef.current = true;
              setRecord(parsed);
              localStorage.setItem(localKey, data.payloadJson);
              setSaveStatus('cloud-synced');
            } catch {
              // ignore malformed payload
            }
          }
        } else {
          // Seed initial record to Firestore for this patient
          const payloadJson = JSON.stringify(initialBundle);
          setDoc(docRef, {
            patientId: selectedPatient.id,
            patientName: selectedPatient.name,
            updatedAt: new Date().toISOString(),
            updatedBy: `${activeDoctor.name} (Exeq. ${activeDoctor.exequatur})`,
            payloadJson,
          }).catch((err) =>
            handleFirestoreError(
              err,
              OperationType.WRITE,
              `clinicalRecords/${selectedPatient.id}`
            )
          );
        }
      },
      (err) => {
        handleFirestoreError(
          err,
          OperationType.GET,
          `clinicalRecords/${selectedPatient.id}`
        );
      }
    );

    return () => unsubSnapshot();
  }, [selectedPatient.id, firebaseUser]);

  // Debounced Auto-Save (Local + Firebase Cloud)
  useEffect(() => {
    if (!hasRealPatient || selectedPatient.id === 'empty-patient') return;
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    setSaveStatus('saving');
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(async () => {
      const updatedBundle: PatientClinicalRecordBundle = {
        ...record,
        patientId: selectedPatient.id,
        updatedAt: new Date().toISOString(),
      };
      const serialized = JSON.stringify(updatedBundle);
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY_PREFIX}${selectedPatient.id}`,
        serialized
      );

      const nowStr = new Date().toLocaleTimeString('es-DO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastSavedTime(nowStr);

      if (firebaseUser) {
        try {
          const docRef = doc(db, 'clinicalRecords', selectedPatient.id);
          await setDoc(docRef, {
            patientId: selectedPatient.id,
            patientName: selectedPatient.name,
            updatedAt: updatedBundle.updatedAt,
            updatedBy: `${activeDoctor.name} (Exeq. ${activeDoctor.exequatur})`,
            payloadJson: serialized,
          });
          setSaveStatus('cloud-synced');
        } catch (err) {
          handleFirestoreError(
            err,
            OperationType.WRITE,
            `clinicalRecords/${selectedPatient.id}`
          );
          setSaveStatus('error');
        }
      } else {
        setSaveStatus('saved');
      }
    }, 750);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [record, selectedPatient.id, selectedPatient.name, firebaseUser]);

  const handleConnectFirebaseCloud = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      onTriggerToast('Conectado a Firebase Cloud Firestore correctamente');
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      onTriggerToast('Guardado automático local activo en este navegador');
    }
  };

  const vitalsCheckTimerRef = useRef<number | null>(null);

  // Silent background CIE-10 detection and SOAP Plan auto-completion in Form 02 (Consulta Médica)
  useEffect(() => {
    if (!hasRealPatient || selectedPatient.id === 'empty-patient') return;
    const motivo = record.consultaActualBorrador.motivoConsulta || '';
    const hea = record.consultaActualBorrador.enfermedadActual || '';
    const examen = record.consultaActualBorrador.hallazgosExamenFisico || '';
    const combinedClinical = `${motivo} ${hea} ${examen}`.trim();
    if (combinedClinical.length < 18) return;

    scheduleBackgroundClinicalTextAnalysis(
      `form02-${selectedPatient.id}`,
      combinedClinical,
      {
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        conditions: selectedPatient.conditions,
      },
      (res) => {
        let didAutoFill = false;
        setRecord((prev) => {
          const currentDraft = prev.consultaActualBorrador;
          const nextDiag =
            !currentDraft.diagnosticoPrincipal.trim() && res.cie10Name
              ? res.cie10Name
              : currentDraft.diagnosticoPrincipal;
          const nextCode =
            !currentDraft.codigoCie10.trim() && res.cie10Code
              ? res.cie10Code
              : currentDraft.codigoCie10;
          const nextMedidas =
            !currentDraft.medidasNoFarmacologicas.trim() && res.suggestedPlan
              ? res.suggestedPlan
              : currentDraft.medidasNoFarmacologicas;

          if (
            nextDiag !== currentDraft.diagnosticoPrincipal ||
            nextCode !== currentDraft.codigoCie10 ||
            nextMedidas !== currentDraft.medidasNoFarmacologicas
          ) {
            didAutoFill = true;
          }

          return {
            ...prev,
            consultaActualBorrador: {
              ...currentDraft,
              diagnosticoPrincipal: nextDiag,
              codigoCie10: nextCode,
              medidasNoFarmacologicas: nextMedidas,
            },
          };
        });

        if (res.summaryNotification || didAutoFill) {
          onTriggerToast(
            res.summaryNotification ||
              `CIE-10 sugerido automáticamente: ${res.cie10Name}`
          );
        }
      }
    );
  }, [
    record.consultaActualBorrador.motivoConsulta,
    record.consultaActualBorrador.enfermedadActual,
    record.consultaActualBorrador.hallazgosExamenFisico,
    selectedPatient.id,
  ]);

  // Auto-calculate BMI when weight or height changes in Form 2 + silent background vitals check
  const updateConsultationVital = (
    field: keyof ConsultationEncounterRecord['signosVitales'],
    value: string
  ) => {
    setRecord((prev) => {
      const nextVitals = {
        ...prev.consultaActualBorrador.signosVitales,
        [field]: value,
      };
      const w = parseFloat(nextVitals.pesoKg);
      const hCm = parseFloat(nextVitals.tallaCm);
      if (!isNaN(w) && !isNaN(hCm) && hCm > 40) {
        const hM = hCm / 100;
        nextVitals.imc = (w / (hM * hM)).toFixed(1);
      }

      if (vitalsCheckTimerRef.current) {
        window.clearTimeout(vitalsCheckTimerRef.current);
      }
      vitalsCheckTimerRef.current = window.setTimeout(() => {
        evaluateVitalsRiskInBackground({
          ta: `${nextVitals.taSistolica || '120'} / ${nextVitals.taDiastolica || '80'}`,
          fc: nextVitals.frecuenciaCardiaca || '72',
          temp: `${nextVitals.temperatura || '36.5'} °C`,
          weight: `${nextVitals.pesoKg || '70'} kg`,
          spo2: `${nextVitals.saturacionO2 || '98'}%`,
          glucose: `${nextVitals.glucemiaCapilar || '95'} mg/dL`,
        }).then((safety) => {
          if (safety && safety.hasAlert && safety.alertMessage) {
            onTriggerToast(safety.alertMessage);
          }
        });
      }, 1500);

      return {
        ...prev,
        consultaActualBorrador: {
          ...prev.consultaActualBorrador,
          signosVitales: nextVitals,
        },
      };
    });
  };

  // Save current consultation draft into patient's chronological consultation history
  const handleRegisterConsultationInHistory = () => {
    const draft = record.consultaActualBorrador;
    const timestamp = new Date().toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newEntry: ConsultationEncounterRecord = {
      ...draft,
      id: `cons-${Date.now()}`,
      fechaHora: timestamp,
      medicoTratante: `${activeDoctor.name} (Exeq. ${activeDoctor.exequatur} · ${activeDoctor.consultorio})`,
    };

    setRecord((prev) => ({
      ...prev,
      historialConsultas: [newEntry, ...prev.historialConsultas],
    }));

    if (onUpdatePatientFromForms) {
      onUpdatePatientFromForms(selectedPatient.id, {
        vitals: {
          ta: `${draft.signosVitales.taSistolica} / ${draft.signosVitales.taDiastolica}`,
          fc: draft.signosVitales.frecuenciaCardiaca,
          temp: `${draft.signosVitales.temperatura} °C`,
          weight: `${draft.signosVitales.pesoKg} kg`,
          heightCm: parseFloat(draft.signosVitales.tallaCm) || selectedPatient.vitals.heightCm,
          spo2: `${draft.signosVitales.saturacionO2}%`,
          glucose: `${draft.signosVitales.glucemiaCapilar} mg/dL`,
        },
        lastVisit: new Date().toLocaleDateString('es-DO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        nextFollowUp: draft.proximaCita || selectedPatient.nextFollowUp,
      });
    }

    onTriggerToast(
      `Consulta médica registrada en el historial de ${selectedPatient.name}`
    );
  };

  const activeTabMeta =
    FORM_TABS.find((t) => t.id === activeTab) || FORM_TABS[0];

  const systolicNum =
    parseInt(record.consultaActualBorrador.signosVitales.taSistolica, 10) || 120;
  const diastolicNum =
    parseInt(record.consultaActualBorrador.signosVitales.taDiastolica, 10) || 80;
  const isBpElevated = systolicNum >= 140 || diastolicNum >= 90;

  if (!hasRealPatient) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 p-10 text-center max-w-2xl mx-auto my-6 space-y-4 shadow-2xs">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
          <FileText className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
            Módulo de 7 Fichas Clínicas Oficiales MSP
          </span>
          <h2 className="text-xl font-extrabold text-slate-900">
            Sin expedientes clínicos registrados aún
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            La base de datos está completamente limpia y lista para su consulta. Registre su primer paciente para habilitar sus 7 fichas clínicas (Historia Individual, Consulta Médica, Ficha Familiar, Crónicos, Prevención PAI, Ciclos de Vida y Referencia/Contrarreferencia).
          </p>
        </div>
        {onOpenNewPatient && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenNewPatient}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition-opacity hover:opacity-95 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Primer Paciente y Abrir Fichas MSP</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ==================== TOP PATIENT & AUTO-SAVE COMMAND HEADER ==================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Patient Identity & Selector */}
          <div className="flex items-center gap-3.5">
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center text-lg font-extrabold shrink-0 shadow-2xs"
              style={{
                backgroundColor: selectedPatient.avatarBg,
                color: selectedPatient.avatarText,
              }}
            >
              {selectedPatient.initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                  Módulo de Fichas Clínicas MSP
                </span>
                <span className="text-xs font-mono-clinical text-slate-500">
                  Carpeta #{selectedPatient.code}
                </span>
                <span className="text-xs font-mono-clinical text-slate-500">
                  · Cédula: {selectedPatient.cedula}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1">
                <select
                  value={selectedPatient.id}
                  onChange={(e) => {
                    const found = patients.find((p) => p.id === e.target.value);
                    if (found) onSelectPatient(found);
                  }}
                  aria-label="Seleccionar paciente para fichas clínicas"
                  className="text-base font-extrabold text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl px-3 py-1 cursor-pointer focus:outline-none focus:border-teal-600"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.age} años · {p.gender})
                    </option>
                  ))}
                </select>

                <span className="text-xs text-slate-600">
                  <strong>ARS:</strong> {selectedPatient.ars} ·{' '}
                  <strong>Sangre:</strong> {selectedPatient.bloodType}
                </span>

                {selectedPatient.allergies.length > 0 &&
                  !selectedPatient.allergies[0].toLowerCase().includes('ninguna') && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Alergia: {selectedPatient.allergies.join(', ')}
                    </span>
                  )}
              </div>
            </div>
          </div>

          {/* Right Status & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Auto-Save Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              {saveStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  <span className="font-semibold text-amber-700">
                    Guardando cambios...
                  </span>
                </>
              ) : saveStatus === 'cloud-synced' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold text-emerald-800">
                    Guardado en Firebase ({lastSavedTime})
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  <span className="font-semibold text-slate-700">
                    Guardado automático ({lastSavedTime})
                  </span>
                </>
              )}

              {!firebaseUser && (
                <button
                  type="button"
                  onClick={handleConnectFirebaseCloud}
                  className="ml-1 px-2 py-0.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                  title="Sincronizar con su cuenta de Firebase Cloud"
                >
                  Sincronizar Nube
                </button>
              )}
            </div>

            {/* Consultation History Drawer Button */}
            <button
              type="button"
              onClick={() => setShowHistoryDrawer((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <History className="w-4 h-4 text-teal-700" />
              <span>
                Historial de Consultas ({record.historialConsultas.length})
              </span>
            </button>

            {/* Export JSON Backup Button */}
            <button
              type="button"
              onClick={handleExportRecordJson}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              title="Descargar respaldo estructurado del expediente clínico (JSON)"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Respaldo JSON</span>
            </button>

            {/* Printable MSP Document Button */}
            <button
              type="button"
              onClick={() => {
                setPrintScope('active-tab');
                setShowPrintModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold transition-opacity hover:opacity-95 cursor-pointer shadow-2xs"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Ficha / Formato MSP</span>
            </button>
          </div>
        </div>

        {/* ==================== 7 CLINICAL FORMS NAVIGATION TABS ==================== */}
        <div className="pt-3.5 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2">
          {FORM_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'text-white shadow-sm border-transparent'
                    : 'bg-slate-50/80 hover:bg-slate-100/90 text-slate-700 border-slate-200/80'
                }`}
                style={
                  isActive
                    ? { backgroundColor: 'var(--sidebar-from)' }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className={`text-[10px] font-mono-clinical font-bold px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-white/20 text-teal-200'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    Ficha #{tab.number}
                  </span>
                  <span className={isActive ? 'text-teal-300' : 'text-slate-500'}>
                    {tab.icon}
                  </span>
                </div>
                <div className="mt-2">
                  <p className="text-xs font-extrabold leading-tight">
                    {tab.label}
                  </p>
                  <p
                    className={`text-[10px] mt-0.5 leading-tight line-clamp-1 ${
                      isActive ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {tab.shortDesc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================== COLLAPSIBLE CONSULTATION HISTORY TIMELINE ==================== */}
      {showHistoryDrawer && (
        <div className="bg-white rounded-2xl border border-teal-300/80 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-teal-700" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Historial Cronológico de Consultas — {selectedPatient.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowHistoryDrawer(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-4 h-4" /> Cerrar historial
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {record.historialConsultas.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between gap-2 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-clinical font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {item.fechaHora}
                    </span>
                    <span className="font-bold text-slate-600">
                      {item.tipoConsulta}
                    </span>
                  </div>
                  <p className="font-extrabold text-slate-900 mt-1">
                    Motivo: {item.motivoConsulta}
                  </p>
                  <p className="text-slate-600">{item.enfermedadActual}</p>
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono-clinical text-slate-700">
                    <span>
                      TA: {item.signosVitales.taSistolica}/{item.signosVitales.taDiastolica} mmHg
                    </span>
                    <span>· FC: {item.signosVitales.frecuenciaCardiaca} lpm</span>
                    <span>· Peso: {item.signosVitales.pesoKg} kg</span>
                    <span>· IMC: {item.signosVitales.imc}</span>
                  </div>
                  <p className="text-slate-800 pt-1">
                    <strong>Diagnóstico CIE-10:</strong> {item.diagnosticoPrincipal} ({item.tipoDiagnostico})
                  </p>
                  <p className="text-slate-700">
                    <strong>Tratamiento:</strong> {item.tratamientoFarmacologico}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                  <span className="text-[11px] text-slate-500">
                    {item.medicoTratante}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRecord((prev) => ({
                        ...prev,
                        consultaActualBorrador: {
                          ...item,
                          id: `cons-draft-${Date.now()}`,
                        },
                      }));
                      setActiveTab('consulta-medica');
                      setShowHistoryDrawer(false);
                      onTriggerToast('Consulta cargada en el editor activo');
                    }}
                    className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                  >
                    Cargar en Ficha de Consulta →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== FORM 1: HISTORIA CLÍNICA INDIVIDUAL ==================== */}
      {activeTab === 'historia-individual' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                Formulario Clínico #01 · Práctica de Medicina Familiar RD
              </span>
              <h3 className="text-lg font-extrabold text-slate-900">
                1. Historia Clínica Individual
              </h3>
              <p className="text-xs text-slate-500">
                Datos personales de filiación, antecedentes patológicos y heredofamiliares, alergias, medicamentos habituales y examen físico regional.
              </p>
            </div>
          </div>

          {/* Section 1.1: Datos Personales y Filiación */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-l-3 border-teal-600 pl-2.5">
              A. Datos Personales y Afiliación (Cédula / NSS / ARS)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nombre Completo del Paciente
                </label>
                <input
                  type="text"
                  value={selectedPatient.name}
                  readOnly
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Cédula de Identidad y Electoral
                </label>
                <input
                  type="text"
                  value={selectedPatient.cedula}
                  onChange={(e) =>
                    onUpdatePatientFromForms?.(selectedPatient.id, {
                      cedula: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Aseguradora de Riesgos de Salud (ARS)
                </label>
                <input
                  type="text"
                  value={selectedPatient.ars}
                  onChange={(e) =>
                    onUpdatePatientFromForms?.(selectedPatient.id, {
                      ars: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Número de Seguro Social (NSS / Afiliado)
                </label>
                <input
                  type="text"
                  value={record.historiaIndividual.nssAfiliado}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        nssAfiliado: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Estado Civil
                </label>
                <select
                  value={record.historiaIndividual.estadoCivil}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        estadoCivil: e.target.value as any,
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="Soltero(a)">Soltero(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Unión libre">Unión libre</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viudo(a)">Viudo(a)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Ocupación Actual
                </label>
                <input
                  type="text"
                  value={record.historiaIndividual.ocupacion}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        ocupacion: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Grado de Escolaridad
                </label>
                <select
                  value={record.historiaIndividual.escolaridad}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        escolaridad: e.target.value as any,
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="Primaria">Primaria</option>
                  <option value="Secundaria">Secundaria</option>
                  <option value="Técnico">Técnico Superior</option>
                  <option value="Universitaria">Universitaria</option>
                  <option value="Sin escolaridad">Sin escolaridad</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Teléfono y Dirección Residencial
                </label>
                <input
                  type="text"
                  value={`${selectedPatient.phone} · ${selectedPatient.address}`}
                  onChange={(e) =>
                    onUpdatePatientFromForms?.(selectedPatient.id, {
                      address: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Contacto de Emergencia (Nombre y Parentesco)
                </label>
                <input
                  type="text"
                  value={record.historiaIndividual.contactoEmergenciaNombre}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        contactoEmergenciaNombre: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Teléfono de Emergencia y Lugar de Nacimiento
                </label>
                <input
                  type="text"
                  value={`${record.historiaIndividual.contactoEmergenciaTelefono} · ${record.historiaIndividual.lugarNacimiento}`}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        contactoEmergenciaTelefono: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 1.2: Antecedentes Personales y Familiares */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-l-3 border-teal-600 pl-2.5">
              B. Antecedentes Personales Patológicos, Quirúrgicos y Heredofamiliares
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Antecedentes Personales Patológicos (Enfermedades Crónicas / Hospitalizaciones)
                </label>
                <textarea
                  rows={2}
                  value={record.historiaIndividual.antecedentesPatologicos}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        antecedentesPatologicos: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Antecedentes Quirúrgicos, Traumáticos y Transfusionales
                </label>
                <textarea
                  rows={2}
                  value={record.historiaIndividual.antecedentesQuirurgicos}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        antecedentesQuirurgicos: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Antecedentes Heredofamiliares (Padre, Madre, Hermanos)
                </label>
                <textarea
                  rows={2}
                  value={record.historiaIndividual.antecedentesFamiliares}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        antecedentesFamiliares: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Antecedentes Gineco-Obstétricos / Urológicos
                </label>
                <textarea
                  rows={2}
                  value={record.historiaIndividual.antecedentesGinecoObstetricos}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        antecedentesGinecoObstetricos: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 1.3: Alergias y Hábitos Psicobiológicos */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-l-3 border-rose-500 pl-2.5">
              C. Alergias y Hábitos Psicobiológicos (Estilo de Vida)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-rose-50/30 p-4 rounded-xl border border-rose-200/60">
              <div>
                <label className="block text-[11px] font-bold text-rose-800 mb-1">
                  Alergias a Medicamentos (RAM)
                </label>
                <input
                  type="text"
                  value={record.historiaIndividual.alergiasMedicamentosas}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        alergiasMedicamentosas: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-rose-300 bg-white text-xs font-bold text-rose-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Alergias Alimentarias o Ambientales
                </label>
                <input
                  type="text"
                  value={record.historiaIndividual.alergiasAlimentariasAmbientales}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        alergiasAlimentariasAmbientales: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tipo de Reacción Alérgica Documentada
                </label>
                <input
                  type="text"
                  value={record.historiaIndividual.reaccionAlergicaTipo}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        reaccionAlergicaTipo: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Hábito Tabáquico
                </label>
                <select
                  value={record.historiaIndividual.habitoTabaco}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        habitoTabaco: e.target.value as any,
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="No fumador">No fumador</option>
                  <option value="Exfumador">Exfumador</option>
                  <option value="Fumador activo">Fumador activo</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Consumo de Alcohol
                </label>
                <select
                  value={record.historiaIndividual.habitoAlcohol}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        habitoAlcohol: e.target.value as any,
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="No consume">No consume</option>
                  <option value="Ocasional">Social / Ocasional</option>
                  <option value="Frecuente">Frecuente</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nivel de Actividad Física
                </label>
                <select
                  value={record.historiaIndividual.actividadFisica}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        actividadFisica: e.target.value as any,
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="Sedentario">Sedentario</option>
                  <option value="Moderada (150 min/sem)">Moderada (150 min/sem)</option>
                  <option value="Intensa">Intensa / Deportista</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 1.4: Medicamentos Actuales */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-l-3 border-teal-600 pl-2.5">
                D. Medicamentos Habituales y Conciliación Terapéutica
              </h4>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="py-2.5 px-3">Medicamento / Principio Activo</th>
                    <th className="py-2.5 px-3">Dosis y Posología</th>
                    <th className="py-2.5 px-3">Indicación Clínica</th>
                    <th className="py-2.5 px-3">Adherencia</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {record.historiaIndividual.medicamentosHabituales.map((med) => (
                    <tr key={med.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {med.nombre}
                      </td>
                      <td className="py-2 px-3 text-slate-700">{med.dosis}</td>
                      <td className="py-2 px-3 text-slate-600">{med.indicacion}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                          {med.adherencia}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setRecord((prev) => ({
                              ...prev,
                              historiaIndividual: {
                                ...prev.historiaIndividual,
                                medicamentosHabituales:
                                  prev.historiaIndividual.medicamentosHabituales.filter(
                                    (m) => m.id !== med.id
                                  ),
                              },
                            }))
                          }
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick Add Habitual Medication */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <input
                type="text"
                placeholder="Nuevo medicamento (ej. Enalapril 20 mg)"
                value={newMedHabitualName}
                onChange={(e) => setNewMedHabitualName(e.target.value)}
                className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
              />
              <input
                type="text"
                placeholder="Dosis (ej. 1 tableta cada 12h)"
                value={newMedHabitualDose}
                onChange={(e) => setNewMedHabitualDose(e.target.value)}
                className="w-48 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
              />
              <input
                type="text"
                placeholder="Indicación (ej. HTA)"
                value={newMedHabitualInd}
                onChange={(e) => setNewMedHabitualInd(e.target.value)}
                className="w-44 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newMedHabitualName.trim()) return;
                  const medNameClean = newMedHabitualName.trim();
                  const medDoseClean = newMedHabitualDose.trim();
                  const currentList = record.historiaIndividual.medicamentosHabituales.map(
                    (m) => m.nombre
                  );
                  const allergyStr = record.historiaIndividual.alergiasMedicamentosas || '';

                  setRecord((prev) => ({
                    ...prev,
                    historiaIndividual: {
                      ...prev.historiaIndividual,
                      medicamentosHabituales: [
                        ...prev.historiaIndividual.medicamentosHabituales,
                        {
                          id: `med-h-${Date.now()}`,
                          nombre: medNameClean,
                          dosis: medDoseClean,
                          frecuencia: 'Diario',
                          indicacion: newMedHabitualInd.trim(),
                          adherencia: 'Alta',
                        },
                      ],
                    },
                  }));
                  setNewMedHabitualName('');

                  checkMedicationSafetyInBackground({
                    newMedicationName: medNameClean,
                    newMedicationDosage: medDoseClean,
                    patientAllergies: [
                      ...selectedPatient.allergies,
                      ...(allergyStr ? [allergyStr] : []),
                    ],
                    currentMedications: currentList,
                    patientConditions: selectedPatient.conditions,
                  }).then((safety) => {
                    if (safety && safety.hasAlert && safety.alertMessage) {
                      onTriggerToast(safety.alertMessage);
                    }
                  });
                }}
                className="px-3.5 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Agregar medicamento
              </button>
            </div>
          </div>

          {/* Section 1.5: Examen Físico por Sistemas */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-l-3 border-teal-600 pl-2.5">
              E. Examen Físico General y por Aparatos / Sistemas
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Aspecto General, Piel y Mucosas
                </label>
                <textarea
                  rows={2}
                  value={record.historiaIndividual.examenAspectoGeneral}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        examenAspectoGeneral: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Cabeza, ORL y Cuello
                </label>
                <textarea
                  rows={2}
                  value={record.historiaIndividual.examenCabezaCuello}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        examenCabezaCuello: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tórax, Cardiopulmonar y Mamas
                </label>
                <textarea
                  rows={2}
                  value={record.historiaIndividual.examenToraxCardiopulmonar}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        examenToraxCardiopulmonar: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Abdomen y Genitourinario
                </label>
                <textarea
                  rows={2}
                  value={record.historiaIndividual.examenAbdomen}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        examenAbdomen: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Extremidades, Osteomuscular y Vascular Periférico
                </label>
                <textarea
                  rows={2}
                  value={record.historiaIndividual.examenExtremidades}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        examenExtremidades: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Examen Neurológico y Estado Mental
                </label>
                <textarea
                  rows={2}
                  value={record.historiaIndividual.examenNeurologico}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      historiaIndividual: {
                        ...prev.historiaIndividual,
                        examenNeurologico: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== FORM 2: CONSULTA MÉDICA ==================== */}
      {activeTab === 'consulta-medica' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                Formulario Clínico #02 · Atención Ambulatoria y Evolución
              </span>
              <h3 className="text-lg font-extrabold text-slate-900">
                2. Consulta Médica y Registro de Evolución
              </h3>
              <p className="text-xs text-slate-500">
                Motivo de consulta, historia de la enfermedad actual (HEA), signos vitales con IMC automático, diagnóstico CIE-10, tratamiento y seguimiento.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRegisterConsultationInHistory}
              className="px-4 py-2.5 rounded-xl text-white text-xs font-extrabold flex items-center gap-2 shadow-sm hover:opacity-95 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar y Anexar al Historial de Consultas</span>
            </button>
          </div>

          {/* Motivo de Consulta & Enfermedad Actual */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tipo de Consulta Ambulatoria
              </label>
              <select
                value={record.consultaActualBorrador.tipoConsulta}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    consultaActualBorrador: {
                      ...prev.consultaActualBorrador,
                      tipoConsulta: e.target.value as any,
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
              >
                <option value="Primera vez">Consulta de Primera Vez</option>
                <option value="Seguimiento">Consulta de Seguimiento / Control</option>
                <option value="Preventiva">Consulta Preventiva / Chequeo</option>
                <option value="Control prenatal / puerperio">
                  Control Prenatal / Puerperio
                </option>
                <option value="Urgencia ambulatoria">
                  Atención de Urgencia Ambulatoria
                </option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Motivo de Consulta (Síntoma o razón principal)
              </label>
              <input
                type="text"
                value={record.consultaActualBorrador.motivoConsulta}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    consultaActualBorrador: {
                      ...prev.consultaActualBorrador,
                      motivoConsulta: e.target.value,
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Historia de la Enfermedad Actual (HEA — Inicio, evolución, semiología y síntomas asociados)
              </label>
              <textarea
                rows={3}
                value={record.consultaActualBorrador.enfermedadActual}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    consultaActualBorrador: {
                      ...prev.consultaActualBorrador,
                      enfermedadActual: e.target.value,
                    },
                  }))
                }
                className="w-full p-3 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          {/* Signos Vitales Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-l-3 border-teal-600 pl-2.5">
                Signos Vitales y Antropometría de la Consulta
              </h4>
              {isBpElevated && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Alerta Tensional: TA ≥ 140/90 mmHg
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  TA Sistólica
                </label>
                <input
                  type="text"
                  value={record.consultaActualBorrador.signosVitales.taSistolica}
                  onChange={(e) =>
                    updateConsultationVital('taSistolica', e.target.value)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  TA Diastólica
                </label>
                <input
                  type="text"
                  value={record.consultaActualBorrador.signosVitales.taDiastolica}
                  onChange={(e) =>
                    updateConsultationVital('taDiastolica', e.target.value)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  FC (lpm)
                </label>
                <input
                  type="text"
                  value={
                    record.consultaActualBorrador.signosVitales.frecuenciaCardiaca
                  }
                  onChange={(e) =>
                    updateConsultationVital('frecuenciaCardiaca', e.target.value)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  FR (rpm)
                </label>
                <input
                  type="text"
                  value={
                    record.consultaActualBorrador.signosVitales
                      .frecuenciaRespiratoria
                  }
                  onChange={(e) =>
                    updateConsultationVital(
                      'frecuenciaRespiratoria',
                      e.target.value
                    )
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Temp (°C)
                </label>
                <input
                  type="text"
                  value={record.consultaActualBorrador.signosVitales.temperatura}
                  onChange={(e) =>
                    updateConsultationVital('temperatura', e.target.value)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  SpO2 (%)
                </label>
                <input
                  type="text"
                  value={record.consultaActualBorrador.signosVitales.saturacionO2}
                  onChange={(e) =>
                    updateConsultationVital('saturacionO2', e.target.value)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Peso (kg)
                </label>
                <input
                  type="text"
                  value={record.consultaActualBorrador.signosVitales.pesoKg}
                  onChange={(e) =>
                    updateConsultationVital('pesoKg', e.target.value)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Talla (cm)
                </label>
                <input
                  type="text"
                  value={record.consultaActualBorrador.signosVitales.tallaCm}
                  onChange={(e) =>
                    updateConsultationVital('tallaCm', e.target.value)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-teal-700 mb-1">
                  IMC (kg/m²)
                </label>
                <input
                  type="text"
                  readOnly
                  value={record.consultaActualBorrador.signosVitales.imc}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-teal-200 bg-teal-50/70 text-xs font-mono-clinical font-extrabold text-teal-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Glucemia (mg/dL)
                </label>
                <input
                  type="text"
                  value={
                    record.consultaActualBorrador.signosVitales.glucemiaCapilar
                  }
                  onChange={(e) =>
                    updateConsultationVital('glucemiaCapilar', e.target.value)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                />
              </div>
            </div>
          </div>

          {/* Hallazgos Físicos & Diagnóstico CIE-10 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Hallazgos Positivos al Examen Físico Dirigido
              </label>
              <textarea
                rows={3}
                value={record.consultaActualBorrador.hallazgosExamenFisico}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    consultaActualBorrador: {
                      ...prev.consultaActualBorrador,
                      hallazgosExamenFisico: e.target.value,
                    },
                  }))
                }
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Diagnóstico Principal (CIE-10)
                  </label>
                  <input
                    type="text"
                    value={record.consultaActualBorrador.diagnosticoPrincipal}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        consultaActualBorrador: {
                          ...prev.consultaActualBorrador,
                          diagnosticoPrincipal: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Carácter Diagnóstico
                  </label>
                  <select
                    value={record.consultaActualBorrador.tipoDiagnostico}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        consultaActualBorrador: {
                          ...prev.consultaActualBorrador,
                          tipoDiagnostico: e.target.value as any,
                        },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                  >
                    <option value="Confirmado">Confirmado</option>
                    <option value="Presuntivo">Presuntivo / Sospecha</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Diagnósticos Secundarios o Asociados
                </label>
                <input
                  type="text"
                  value={record.consultaActualBorrador.diagnosticosSecundarios}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      consultaActualBorrador: {
                        ...prev.consultaActualBorrador,
                        diagnosticosSecundarios: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="flex flex-wrap gap-1 pt-0.5">
                {CIE10_SUGGESTIONS.slice(0, 5).map((cie) => (
                  <button
                    key={cie.code}
                    type="button"
                    onClick={() =>
                      setRecord((prev) => ({
                        ...prev,
                        consultaActualBorrador: {
                          ...prev.consultaActualBorrador,
                          diagnosticoPrincipal: cie.name,
                          codigoCie10: cie.code,
                        },
                      }))
                    }
                    className="text-[10.5px] px-2 py-0.5 rounded bg-slate-100 hover:bg-teal-50 text-slate-700 border border-slate-200 cursor-pointer"
                  >
                    + {cie.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tratamiento y Seguimiento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tratamiento Farmacológico Prescrito (Medicamento, concentración, pauta y duración)
              </label>
              <textarea
                rows={3}
                value={record.consultaActualBorrador.tratamientoFarmacologico}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    consultaActualBorrador: {
                      ...prev.consultaActualBorrador,
                      tratamientoFarmacologico: e.target.value,
                    },
                  }))
                }
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Medidas No Farmacológicas y Educación Sanitaria
              </label>
              <textarea
                rows={3}
                value={record.consultaActualBorrador.medidasNoFarmacologicas}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    consultaActualBorrador: {
                      ...prev.consultaActualBorrador,
                      medidasNoFarmacologicas: e.target.value,
                    },
                  }))
                }
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Exámenes de Laboratorio o Imágenes Solicitados
              </label>
              <input
                type="text"
                value={
                  record.consultaActualBorrador.examenesComplementariosSolicitados
                }
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    consultaActualBorrador: {
                      ...prev.consultaActualBorrador,
                      examenesComplementariosSolicitados: e.target.value,
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Próxima Cita de Seguimiento
                </label>
                <input
                  type="text"
                  value={record.consultaActualBorrador.proximaCita}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      consultaActualBorrador: {
                        ...prev.consultaActualBorrador,
                        proximaCita: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Signos de Alarma Explicados
                </label>
                <input
                  type="text"
                  value={record.consultaActualBorrador.signosAlarmaExplicados}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      consultaActualBorrador: {
                        ...prev.consultaActualBorrador,
                        signosAlarmaExplicados: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== FORM 3: FICHA FAMILIAR ==================== */}
      {activeTab === 'ficha-familiar' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
              Formulario Clínico #03 · Salud Familiar y Comunitaria (UNAP / CPN)
            </span>
            <h3 className="text-lg font-extrabold text-slate-900">
              3. Ficha Familiar e Integrantes del Hogar
            </h3>
            <p className="text-xs text-slate-500">
              Composición del núcleo familiar, parentesco, determinantes habitacionales, condiciones sanitarias de la vivienda y estratificación de riesgo familiar.
            </p>
          </div>

          {/* Datos de Ubicación y Carpeta Familiar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Código de Carpeta Familiar
              </label>
              <input
                type="text"
                value={record.fichaFamiliar.codigoCarpetaFamiliar}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    fichaFamiliar: {
                      ...prev.fichaFamiliar,
                      codigoCarpetaFamiliar: e.target.value,
                    },
                  }))
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Centro de Primer Nivel (CPN / UNAP)
              </label>
              <input
                type="text"
                value={record.fichaFamiliar.unapCentroPrimerNivel}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    fichaFamiliar: {
                      ...prev.fichaFamiliar,
                      unapCentroPrimerNivel: e.target.value,
                    },
                  }))
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tipo de Familia
              </label>
              <select
                value={record.fichaFamiliar.tipoFamilia}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    fichaFamiliar: {
                      ...prev.fichaFamiliar,
                      tipoFamilia: e.target.value as any,
                    },
                  }))
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
              >
                <option value="Nuclear">Nuclear</option>
                <option value="Extensa">Extensa</option>
                <option value="Monoparental">Monoparental</option>
                <option value="Ampliada">Ampliada</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Clasificación de Riesgo Familiar
              </label>
              <select
                value={record.fichaFamiliar.riesgoFamiliarGlobal}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    fichaFamiliar: {
                      ...prev.fichaFamiliar,
                      riesgoFamiliarGlobal: e.target.value as any,
                    },
                  }))
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-teal-900"
              >
                <option value="Riesgo Bajo (I)">Riesgo Bajo (Grupo I)</option>
                <option value="Riesgo Mediano (II)">Riesgo Mediano (Grupo II)</option>
                <option value="Riesgo Alto (III)">Riesgo Alto (Grupo III)</option>
              </select>
            </div>
          </div>

          {/* Tabla de Integrantes del Hogar */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-l-3 border-teal-600 pl-2.5">
              Integrantes del Hogar y Parentesco ({record.fichaFamiliar.integrantesHogar.length} miembros)
            </h4>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="py-2.5 px-3">Nombre Completo</th>
                    <th className="py-2.5 px-3">Parentesco</th>
                    <th className="py-2.5 px-3">Edad / Sexo</th>
                    <th className="py-2.5 px-3">Escolaridad / Ocupación</th>
                    <th className="py-2.5 px-3">Condición de Salud / Dispensarización</th>
                    <th className="py-2.5 px-3">PAI</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {record.fichaFamiliar.integrantesHogar.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {m.nombreCompleto}
                      </td>
                      <td className="py-2 px-3 text-slate-700">{m.parentesco}</td>
                      <td className="py-2 px-3 font-mono-clinical">
                        {m.edad} años · {m.sexo}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {m.ocupacionEscolaridad}
                      </td>
                      <td className="py-2 px-3 text-slate-800 font-medium">
                        {m.condicionSalud}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10.5px]">
                          {m.esquemaVacunacionAlDia ? 'Al día' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setRecord((prev) => ({
                              ...prev,
                              fichaFamiliar: {
                                ...prev.fichaFamiliar,
                                integrantesHogar:
                                  prev.fichaFamiliar.integrantesHogar.filter(
                                    (item) => item.id !== m.id
                                  ),
                              },
                            }))
                          }
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add family member row */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <input
                type="text"
                placeholder="Nombre del integrante familiar"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
              />
              <select
                value={newMemberRel}
                onChange={(e) => setNewMemberRel(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
              >
                <option value="Cónyuge">Cónyuge</option>
                <option value="Hijo(a)">Hijo(a)</option>
                <option value="Padre / Madre">Padre / Madre</option>
                <option value="Hermano(a)">Hermano(a)</option>
                <option value="Abuelo(a)">Abuelo(a)</option>
                <option value="Nieto(a)">Nieto(a)</option>
              </select>
              <input
                type="number"
                placeholder="Edad"
                value={newMemberAge}
                onChange={(e) => setNewMemberAge(e.target.value)}
                className="w-18 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical"
              />
              <select
                value={newMemberSex}
                onChange={(e) => setNewMemberSex(e.target.value as 'F' | 'M')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
              >
                <option value="F">Femenino (F)</option>
                <option value="M">Masculino (M)</option>
              </select>
              <input
                type="text"
                placeholder="Condición de salud (ej. HTA, Sano)"
                value={newMemberHealth}
                onChange={(e) => setNewMemberHealth(e.target.value)}
                className="w-48 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newMemberName.trim()) return;
                  setRecord((prev) => ({
                    ...prev,
                    fichaFamiliar: {
                      ...prev.fichaFamiliar,
                      integrantesHogar: [
                        ...prev.fichaFamiliar.integrantesHogar,
                        {
                          id: `fam-${Date.now()}`,
                          nombreCompleto: newMemberName.trim(),
                          parentesco: newMemberRel,
                          edad: parseInt(newMemberAge, 10) || 20,
                          sexo: newMemberSex,
                          ocupacionEscolaridad: 'Registrado en visita',
                          condicionSalud: newMemberHealth.trim() || 'Sano aparente',
                          esquemaVacunacionAlDia: true,
                        },
                      ],
                    },
                  }));
                  setNewMemberName('');
                }}
                className="px-3.5 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Añadir integrante
              </button>
            </div>
          </div>

          {/* Condiciones de Vivienda y Factores de Riesgo */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-l-3 border-teal-600 pl-2.5">
              Condiciones Sanitarias de la Vivienda y Factores de Riesgo Ambiental
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Material de Paredes
                </label>
                <select
                  value={record.fichaFamiliar.condicionesVivienda.materialParedes}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      fichaFamiliar: {
                        ...prev.fichaFamiliar,
                        condicionesVivienda: {
                          ...prev.fichaFamiliar.condicionesVivienda,
                          materialParedes: e.target.value as any,
                        },
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="Bloque / Concreto">Bloque / Concreto</option>
                  <option value="Madera">Madera</option>
                  <option value="Mixto">Mixto</option>
                  <option value="Zinc / Otro">Zinc / Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Material del Techo
                </label>
                <select
                  value={record.fichaFamiliar.condicionesVivienda.materialTecho}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      fichaFamiliar: {
                        ...prev.fichaFamiliar,
                        condicionesVivienda: {
                          ...prev.fichaFamiliar.condicionesVivienda,
                          materialTecho: e.target.value as any,
                        },
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="Concreto (Plato)">Concreto (Plato)</option>
                  <option value="Zinc">Zinc</option>
                  <option value="Asbesto / Otro">Asbesto / Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Abastecimiento de Agua
                </label>
                <select
                  value={
                    record.fichaFamiliar.condicionesVivienda.abastecimientoAgua
                  }
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      fichaFamiliar: {
                        ...prev.fichaFamiliar,
                        condicionesVivienda: {
                          ...prev.fichaFamiliar.condicionesVivienda,
                          abastecimientoAgua: e.target.value as any,
                        },
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="Acueducto intradomiciliario">
                    Acueducto intradomiciliario
                  </option>
                  <option value="Agua embotellada / Camión">
                    Agua embotellada / Camión cisterna
                  </option>
                  <option value="Pozo / Cisterna">Pozo tubular / Cisterna</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Disposición de Excretas y Desechos
                </label>
                <select
                  value={
                    record.fichaFamiliar.condicionesVivienda.disposicionExcretas
                  }
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      fichaFamiliar: {
                        ...prev.fichaFamiliar,
                        condicionesVivienda: {
                          ...prev.fichaFamiliar.condicionesVivienda,
                          disposicionExcretas: e.target.value as any,
                        },
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="Inodoro conectado a alcantarillado / séptico">
                    Inodoro conectado a alcantarillado / séptico
                  </option>
                  <option value="Letrina sanitaria">Letrina sanitaria</option>
                  <option value="Al aire libre">Al aire libre (Riesgo alto)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Control de Vectores (Dengue / Leptospirosis) y Entorno Ambiental
                </label>
                <textarea
                  rows={2}
                  value={
                    record.fichaFamiliar.condicionesVivienda
                      .vectoresRiesgoAmbiental
                  }
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      fichaFamiliar: {
                        ...prev.fichaFamiliar,
                        condicionesVivienda: {
                          ...prev.fichaFamiliar.condicionesVivienda,
                          vectoresRiesgoAmbiental: e.target.value,
                        },
                      },
                    }))
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Observaciones de Visita Domiciliaria y Dinámica Familiar
                </label>
                <textarea
                  rows={2}
                  value={record.fichaFamiliar.observacionesVisitasDomiciliarias}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      fichaFamiliar: {
                        ...prev.fichaFamiliar,
                        observacionesVisitasDomiciliarias: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>
          </div>

          {/* ==================== FAMILIOGRAMA GRÁFICO SVG & TEST DE APGAR FAMILIAR ==================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-slate-100">
            {/* Left 7 Cols: Dynamic SVG Familiograma (Genograma) */}
            <div className="lg:col-span-7 p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-teal-700" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Familiograma / Genograma Estructural (Tiempo Real)
                  </h4>
                </div>
                <div className="flex items-center gap-3 text-[10.5px] text-slate-600 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 border-2 border-teal-700 inline-block" /> Hombre (M)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-teal-700 inline-block" /> Mujer (F)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full ring-2 ring-amber-500 bg-teal-600 inline-block" /> Caso Índice
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3 overflow-x-auto">
                <svg
                  viewBox="0 0 680 215"
                  className="w-full h-48 min-w-[520px]"
                  role="img"
                  aria-label="Familiograma clínico del hogar"
                >
                  {/* Household boundary dashed ellipse */}
                  <rect
                    x="16"
                    y="12"
                    width="648"
                    height="190"
                    rx="22"
                    fill="#f8fafc"
                    stroke="#0d9488"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />
                  <text
                    x="32"
                    y="30"
                    fill="#0f766e"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    CONVIVENCIA BAJO EL MISMO TECHO · CARPETA {record.fichaFamiliar.codigoCarpetaFamiliar} ({record.fichaFamiliar.tipoFamilia.toUpperCase()})
                  </text>

                  {/* Horizontal family connection bar */}
                  <line
                    x1="90"
                    y1="72"
                    x2={Math.max(180, Math.min(600, 90 + record.fichaFamiliar.integrantesHogar.length * 125))}
                    y2="72"
                    stroke="#64748b"
                    strokeWidth="2"
                  />

                  {record.fichaFamiliar.integrantesHogar.slice(0, 5).map((member, index) => {
                    const cx = 90 + index * 125;
                    const cy = 118;
                    const isIndexPatient =
                      index === 0 ||
                      member.parentesco.toLowerCase().includes('jefe') ||
                      member.parentesco.toLowerCase().includes('paciente');
                    const isMale = member.sexo === 'M';

                    return (
                      <g key={member.id}>
                        {/* Vertical connector from family line */}
                        <line
                          x1={cx}
                          y1="72"
                          x2={cx}
                          y2={cy - 24}
                          stroke="#64748b"
                          strokeWidth="1.8"
                        />

                        {/* Double ring for Index Patient */}
                        {isIndexPatient &&
                          (isMale ? (
                            <rect
                              x={cx - 27}
                              y={cy - 27}
                              width="54"
                              height="54"
                              rx="6"
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="2.2"
                            />
                          ) : (
                            <circle
                              cx={cx}
                              cy={cy}
                              r="27"
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="2.2"
                            />
                          ))}

                        {/* Main Genogram Symbol: Square for Male, Circle for Female */}
                        {isMale ? (
                          <rect
                            x={cx - 21}
                            y={cy - 21}
                            width="42"
                            height="42"
                            rx="4"
                            fill={isIndexPatient ? '#ccfbf1' : '#ffffff'}
                            stroke="#0f766e"
                            strokeWidth="2.5"
                          />
                        ) : (
                          <circle
                            cx={cx}
                            cy={cy}
                            r="21"
                            fill={isIndexPatient ? '#ccfbf1' : '#ffffff'}
                            stroke="#0f766e"
                            strokeWidth="2.5"
                          />
                        )}

                        {/* Age inside symbol */}
                        <text
                          x={cx}
                          y={cy + 4}
                          textAnchor="middle"
                          fill="#0f172a"
                          fontSize="12"
                          fontWeight="bold"
                        >
                          {member.edad}a
                        </text>

                        {/* Member Name */}
                        <text
                          x={cx}
                          y={cy + 42}
                          textAnchor="middle"
                          fill="#0f172a"
                          fontSize="10.5"
                          fontWeight="bold"
                        >
                          {member.nombreCompleto.split(' ').slice(0, 2).join(' ')}
                        </text>

                        {/* Relationship & Condition */}
                        <text
                          x={cx}
                          y={cy + 55}
                          textAnchor="middle"
                          fill="#475569"
                          fontSize="9.5"
                        >
                          {member.parentesco}
                        </text>
                        <text
                          x={cx}
                          y={cy + 68}
                          textAnchor="middle"
                          fill="#0f766e"
                          fontSize="9"
                          fontWeight="bold"
                        >
                          {member.condicionSalud.slice(0, 20)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Right 5 Cols: Test de APGAR Familiar (Smilkstein) */}
            <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Test de APGAR Familiar (Smilkstein)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Evaluación de percepción de funcionalidad familiar (0 a 10 pts)
                  </p>
                </div>
                <span className="text-sm font-mono-clinical font-extrabold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-teal-900">
                  {totalApgarScore} / 10 pts
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {(
                  [
                    { key: 'adaptacion', label: 'A · Adaptación (Uso de recursos en crisis)' },
                    { key: 'participacion', label: 'P · Participación (Decisiones y responsabilidades)' },
                    { key: 'gradiente', label: 'G · Gradiente de crecimiento y maduración' },
                    { key: 'afectividad', label: 'A · Afectividad y expresión de cariño' },
                    { key: 'resolucion', label: 'R · Recursos resolutivos (Tiempo y espacio)' },
                  ] as const
                ).map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80"
                  >
                    <span className="font-semibold text-slate-700 text-[11.5px]">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {[
                        { val: 0, text: '0 Casi nunca' },
                        { val: 1, text: '1 A veces' },
                        { val: 2, text: '2 Casi siempre' },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() =>
                            setApgarScores((prev) => ({
                              ...prev,
                              [item.key]: opt.val,
                            }))
                          }
                          className={`px-2 py-0.5 rounded text-[10.5px] font-bold cursor-pointer transition-colors ${
                            apgarScores[item.key] === opt.val
                              ? 'bg-teal-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {opt.val}pt
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${apgarInterpretation.color}`}
              >
                <span>Interpretación Clínica:</span>
                <span>{apgarInterpretation.label}</span>
              </div>
            </div>
          </div>

          {/* Interactive 3-Generation Genogram & Community Ecomap Builder */}
          <div className="pt-4 border-t border-slate-100">
            <FamiliogramaEcomapaCanvas
              patientName={selectedPatient.name}
              patientAge={selectedPatient.age}
              patientGender={selectedPatient.gender}
              familyMembers={record.fichaFamiliar.integrantesHogar}
              onSaveSummaryToFamilyRecord={(summaryText) => {
                setRecord((prev) => ({
                  ...prev,
                  fichaFamiliar: {
                    ...prev.fichaFamiliar,
                    observacionesVisitasDomiciliarias: prev.fichaFamiliar
                      .observacionesVisitasDomiciliarias
                      ? `${prev.fichaFamiliar.observacionesVisitasDomiciliarias} | ${summaryText}`
                      : summaryText,
                  },
                }));
              }}
              onTriggerToast={onTriggerToast}
            />
          </div>
        </div>
      )}

      {/* ==================== FORM 4: SEGUIMIENTO DE ENFERMEDADES CRÓNICAS ==================== */}
      {activeTab === 'enfermedades-cronicas' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                Formulario Clínico #04 · Control Longitudinal de ECNT
              </span>
              <h3 className="text-lg font-extrabold text-slate-900">
                4. Seguimiento de Enfermedades Crónicas (HTA, Diabetes, Obesidad y Dislipidemia)
              </h3>
              <p className="text-xs text-slate-500">
                Monitoreo clínico y metabólico estructurado para prevención de complicaciones cardiovasculares, renales y microvasculares.
              </p>
            </div>

            {/* Active Chronic Conditions Checkboxes */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { key: 'hipertension', label: 'Hipertensión (HTA)' },
                  { key: 'diabetesMellitus', label: 'Diabetes Mellitus' },
                  { key: 'obesidadSobrepeso', label: 'Obesidad / Sobrepeso' },
                  { key: 'dislipidemia', label: 'Dislipidemia' },
                ] as const
              ).map((cond) => {
                const active =
                  record.seguimientoCronicas.condicionesActivas[cond.key];
                return (
                  <button
                    key={cond.key}
                    type="button"
                    onClick={() =>
                      setRecord((prev) => ({
                        ...prev,
                        seguimientoCronicas: {
                          ...prev.seguimientoCronicas,
                          condicionesActivas: {
                            ...prev.seguimientoCronicas.condicionesActivas,
                            [cond.key]: !active,
                          },
                        },
                      }))
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${
                      active
                        ? 'bg-teal-50 border-teal-400 text-teal-900'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 ${
                        active ? 'text-teal-700 opacity-100' : 'opacity-30'
                      }`}
                    />
                    <span>{cond.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4 Chronic Disease Panels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Panel 1: Hipertensión Arterial */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  1. Control de Hipertensión Arterial (HTA)
                </h4>
                <span className="text-[11px] font-mono-clinical font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded">
                  Meta: {record.seguimientoCronicas.hipertensionControl.metaPresionArterial}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                    Clasificación / Estadio HTA
                  </label>
                  <input
                    type="text"
                    value={
                      record.seguimientoCronicas.hipertensionControl
                        .estadioClasificacion
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        seguimientoCronicas: {
                          ...prev.seguimientoCronicas,
                          hipertensionControl: {
                            ...prev.seguimientoCronicas.hipertensionControl,
                            estadioClasificacion: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                    TA Promedio Domiciliaria (AMPA)
                  </label>
                  <input
                    type="text"
                    value={
                      record.seguimientoCronicas.hipertensionControl
                        .taPromedioDomiciliaria
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        seguimientoCronicas: {
                          ...prev.seguimientoCronicas,
                          hipertensionControl: {
                            ...prev.seguimientoCronicas.hipertensionControl,
                            taPromedioDomiciliaria: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                    Esquema Antihipertensivo y Evaluación de Órgano Blanco
                  </label>
                  <input
                    type="text"
                    value={
                      record.seguimientoCronicas.hipertensionControl
                        .tratamientoAntihipertensivo
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        seguimientoCronicas: {
                          ...prev.seguimientoCronicas,
                          hipertensionControl: {
                            ...prev.seguimientoCronicas.hipertensionControl,
                            tratamientoAntihipertensivo: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Panel 2: Diabetes Mellitus */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  2. Control de Diabetes Mellitus y Glucemia
                </h4>
                <span className="text-[11px] font-mono-clinical font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                  HbA1c: {record.seguimientoCronicas.diabetesControl.hba1cPorcentaje}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                    Glucemia Ayunas
                  </label>
                  <input
                    type="text"
                    value={
                      record.seguimientoCronicas.diabetesControl
                        .glucemiaAyunasMgDl
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        seguimientoCronicas: {
                          ...prev.seguimientoCronicas,
                          diabetesControl: {
                            ...prev.seguimientoCronicas.diabetesControl,
                            glucemiaAyunasMgDl: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                    Postprandial 2h
                  </label>
                  <input
                    type="text"
                    value={
                      record.seguimientoCronicas.diabetesControl
                        .glucemiaPostprandialMgDl
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        seguimientoCronicas: {
                          ...prev.seguimientoCronicas,
                          diabetesControl: {
                            ...prev.seguimientoCronicas.diabetesControl,
                            glucemiaPostprandialMgDl: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                    HbA1c (%)
                  </label>
                  <input
                    type="text"
                    value={
                      record.seguimientoCronicas.diabetesControl.hba1cPorcentaje
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        seguimientoCronicas: {
                          ...prev.seguimientoCronicas,
                          diabetesControl: {
                            ...prev.seguimientoCronicas.diabetesControl,
                            hba1cPorcentaje: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                    Evaluación de Pies (Monofilamento / Pulsos) y Fondo de Ojo
                  </label>
                  <input
                    type="text"
                    value={
                      record.seguimientoCronicas.diabetesControl
                        .examenPiesMonofilamento
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        seguimientoCronicas: {
                          ...prev.seguimientoCronicas,
                          diabetesControl: {
                            ...prev.seguimientoCronicas.diabetesControl,
                            examenPiesMonofilamento: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Panel 3: Obesidad y Antropometría */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  3. Obesidad, Peso y Perímetro Abdominal
                </h4>
                <span className="text-[11px] font-mono-clinical font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  IMC: {record.seguimientoCronicas.obesidadAntropometria.imcActual}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                    Peso Basal (kg)
                  </label>
                  <input
                    type="text"
                    value={
                      record.seguimientoCronicas.obesidadAntropometria
                        .pesoInicialKg
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        seguimientoCronicas: {
                          ...prev.seguimientoCronicas,
                          obesidadAntropometria: {
                            ...prev.seguimientoCronicas.obesidadAntropometria,
                            pesoInicialKg: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                    Peso Actual (kg)
                  </label>
                  <input
                    type="text"
                    value={
                      record.seguimientoCronicas.obesidadAntropometria
                        .pesoActualKg
                    }
                    onChange={(e) => {
                      const nextWeightVal = e.target.value;
                      const wNum = parseFloat(nextWeightVal);
                      const hM = (selectedPatient.vitals.heightCm || 165) / 100;
                      const nextImc =
                        !isNaN(wNum) && wNum > 10
                          ? (wNum / (hM * hM)).toFixed(1)
                          : record.seguimientoCronicas.obesidadAntropometria.imcActual;
                      const imcNumeric = parseFloat(nextImc);
                      const nextClass =
                        imcNumeric >= 35
                          ? 'Obesidad Grado II/III (OMS)'
                          : imcNumeric >= 30
                          ? 'Obesidad Grado I (OMS)'
                          : imcNumeric >= 25
                          ? 'Sobrepeso (OMS)'
                          : 'Normopeso (OMS)';
                      setRecord((prev) => ({
                        ...prev,
                        seguimientoCronicas: {
                          ...prev.seguimientoCronicas,
                          obesidadAntropometria: {
                            ...prev.seguimientoCronicas.obesidadAntropometria,
                            pesoActualKg: nextWeightVal,
                            imcActual: nextImc,
                            clasificacionOms: nextClass,
                          },
                        },
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                    Perímetro Abd.
                  </label>
                  <input
                    type="text"
                    value={
                      record.seguimientoCronicas.obesidadAntropometria
                        .perimetroAbdominalCm
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        seguimientoCronicas: {
                          ...prev.seguimientoCronicas,
                          obesidadAntropometria: {
                            ...prev.seguimientoCronicas.obesidadAntropometria,
                            perimetroAbdominalCm: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                    Meta Terapéutica de Peso y Nutrición
                  </label>
                  <input
                    type="text"
                    value={
                      record.seguimientoCronicas.obesidadAntropometria
                        .metaReduccionPeso
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        seguimientoCronicas: {
                          ...prev.seguimientoCronicas,
                          obesidadAntropometria: {
                            ...prev.seguimientoCronicas.obesidadAntropometria,
                            metaReduccionPeso: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Panel 4: Dislipidemia y Perfil Lipídico */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  4. Dislipidemia y Perfil Lipídico (mg/dL)
                </h4>
                <span className="text-[11px] font-mono-clinical font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded">
                  LDL: {record.seguimientoCronicas.dislipidemiaControl.ldlColesterolMgDl} mg/dL
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Col. Total
                  </label>
                  <input
                    type="text"
                    value={
                      record.seguimientoCronicas.dislipidemiaControl
                        .colesterolTotalMgDl
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        seguimientoCronicas: {
                          ...prev.seguimientoCronicas,
                          dislipidemiaControl: {
                            ...prev.seguimientoCronicas.dislipidemiaControl,
                            colesterolTotalMgDl: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    LDL-c
                  </label>
                  <input
                    type="text"
                    value={
                      record.seguimientoCronicas.dislipidemiaControl
                        .ldlColesterolMgDl
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        seguimientoCronicas: {
                          ...prev.seguimientoCronicas,
                          dislipidemiaControl: {
                            ...prev.seguimientoCronicas.dislipidemiaControl,
                            ldlColesterolMgDl: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    HDL-c
                  </label>
                  <input
                    type="text"
                    value={
                      record.seguimientoCronicas.dislipidemiaControl
                        .hdlColesterolMgDl
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        seguimientoCronicas: {
                          ...prev.seguimientoCronicas,
                          dislipidemiaControl: {
                            ...prev.seguimientoCronicas.dislipidemiaControl,
                            hdlColesterolMgDl: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Triglicéridos
                  </label>
                  <input
                    type="text"
                    value={
                      record.seguimientoCronicas.dislipidemiaControl
                        .trigliceridosMgDl
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        seguimientoCronicas: {
                          ...prev.seguimientoCronicas,
                          dislipidemiaControl: {
                            ...prev.seguimientoCronicas.dislipidemiaControl,
                            trigliceridosMgDl: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                    Terapia Hipolipemiante (Estatinas / Fibratos) y Dieta
                  </label>
                  <input
                    type="text"
                    value={
                      record.seguimientoCronicas.dislipidemiaControl
                        .tratamientoHipolipemiante
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        seguimientoCronicas: {
                          ...prev.seguimientoCronicas,
                          dislipidemiaControl: {
                            ...prev.seguimientoCronicas.dislipidemiaControl,
                            tratamientoHipolipemiante: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Función Renal, Riesgo Cardiovascular y Plan de Automanejo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Riesgo Cardiovascular Global (HEARTS / OMS)
              </label>
              <select
                value={record.seguimientoCronicas.riesgoCardiovascular}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    seguimientoCronicas: {
                      ...prev.seguimientoCronicas,
                      riesgoCardiovascular: e.target.value as any,
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
              >
                <option value="Bajo (<10%)">Bajo (&lt; 10%)</option>
                <option value="Moderado (10-19%)">Moderado (10% - 19%)</option>
                <option value="Alto (20-29%)">Alto (20% - 29%)</option>
                <option value="Muy Alto (≥30%)">Muy Alto (≥ 30%)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Calculadora de Filtrado Glomerular (Creatinina Sérica mg/dL → CKD-EPI)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.05"
                  value={record.seguimientoCronicas.funcionRenal.creatininaSericaMgDl}
                  onChange={(e) => {
                    const nextCr = e.target.value;
                    const calc = calculateCkdEpiTfg(nextCr);
                    setRecord((prev) => ({
                      ...prev,
                      seguimientoCronicas: {
                        ...prev.seguimientoCronicas,
                        funcionRenal: {
                          ...prev.seguimientoCronicas.funcionRenal,
                          creatininaSericaMgDl: nextCr,
                          tfgEstimadaMlMin: `${calc.value} mL/min/1.73m² (${calc.stage})`,
                        },
                      },
                    }));
                  }}
                  placeholder="Ej. 0.9"
                  className="w-24 px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                />
                {(() => {
                  const tfgInfo = calculateCkdEpiTfg(
                    record.seguimientoCronicas.funcionRenal.creatininaSericaMgDl
                  );
                  return (
                    <div
                      className={`flex-1 px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-between ${tfgInfo.badgeClass}`}
                    >
                      <span className="font-mono-clinical">
                        TFG: {tfgInfo.value} mL/min
                      </span>
                      <span className="text-[10.5px]">{tfgInfo.stage}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Adherencia Terapéutica (Escala Morisky-Green)
              </label>
              <select
                value={record.seguimientoCronicas.adherenciaFarmacologica}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    seguimientoCronicas: {
                      ...prev.seguimientoCronicas,
                      adherenciaFarmacologica: e.target.value as any,
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
              >
                <option value="Buena (Test Morisky-Green completo)">
                  Buena (Test Morisky-Green completo)
                </option>
                <option value="Regular (Olvidos ocasionales)">
                  Regular (Olvidos ocasionales)
                </option>
                <option value="Mala adherencia">Mala adherencia</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ==================== FORM 5: FICHAS DE PREVENCIÓN ==================== */}
      {activeTab === 'prevencion-tamizaje' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
              Formulario Clínico #05 · Promoción de la Salud y Prevención Primaria
            </span>
            <h3 className="text-lg font-extrabold text-slate-900">
              5. Fichas de Prevención: Vacunación (PAI), Controles Preventivos y Tamizajes
            </h3>
            <p className="text-xs text-slate-500">
              Registro de inmunizaciones del Programa Ampliado de Inmunización (PAI), consejería preventiva y tamizajes oportunos según edad y sexo.
            </p>
          </div>

          {/* Esquema de Vacunación */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-l-3 border-teal-600 pl-2.5">
              A. Esquema de Vacunación del Paciente (Referencia PAI)
            </h4>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="py-2.5 px-3">Biológico / Vacuna</th>
                    <th className="py-2.5 px-3">Dosis / Esquema</th>
                    <th className="py-2.5 px-3">Fecha de Aplicación</th>
                    <th className="py-2.5 px-3">Lote / Centro</th>
                    <th className="py-2.5 px-3">Estado (Clic para alternar)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {record.fichaPrevencion.esquemaVacunacion.map((vac) => (
                    <tr key={vac.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {vac.biologico}
                      </td>
                      <td className="py-2 px-3 text-slate-700">{vac.dosis}</td>
                      <td className="py-2 px-3 font-mono-clinical">
                        {vac.fechaAplicacion}
                      </td>
                      <td className="py-2 px-3 text-slate-500">
                        {vac.loteCentro}
                      </td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() =>
                            setRecord((prev) => ({
                              ...prev,
                              fichaPrevencion: {
                                ...prev.fichaPrevencion,
                                esquemaVacunacion:
                                  prev.fichaPrevencion.esquemaVacunacion.map(
                                    (item) =>
                                      item.id === vac.id
                                        ? {
                                            ...item,
                                            estado:
                                              item.estado === 'Aplicada'
                                                ? 'Pendiente'
                                                : 'Aplicada',
                                            fechaAplicacion:
                                              item.estado === 'Aplicada'
                                                ? 'Pendiente'
                                                : '02 Oct 2025',
                                          }
                                        : item
                                  ),
                              },
                            }))
                          }
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold cursor-pointer ${
                            vac.estado === 'Aplicada'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {vac.estado}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <input
                type="text"
                placeholder="Nueva vacuna (ej. Fiebre Amarilla, VPH, Td, SRP)"
                value={newVacName}
                onChange={(e) => setNewVacName(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
              />
              <input
                type="text"
                placeholder="Dosis (ej. 1ra Dosis / Refuerzo)"
                value={newVacDose}
                onChange={(e) => setNewVacDose(e.target.value)}
                className="w-48 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newVacName.trim()) return;
                  setRecord((prev) => ({
                    ...prev,
                    fichaPrevencion: {
                      ...prev.fichaPrevencion,
                      esquemaVacunacion: [
                        ...prev.fichaPrevencion.esquemaVacunacion,
                        {
                          id: `vac-${Date.now()}`,
                          biologico: newVacName.trim(),
                          dosis: newVacDose.trim(),
                          fechaAplicacion: '02 Oct 2025',
                          loteCentro: 'PAI · Cons. 101',
                          estado: 'Aplicada',
                        },
                      ],
                    },
                  }));
                  setNewVacName('');
                }}
                className="px-3.5 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Registrar vacuna
              </button>
            </div>
          </div>

          {/* Tamizajes Clínicos */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-l-3 border-teal-600 pl-2.5">
              B. Tamizajes Clínicos y Detección Temprana
            </h4>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="py-2.5 px-3">Tamizaje / Prueba Preventiva</th>
                    <th className="py-2.5 px-3">Criterio Clínico</th>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Resultado y Conducta</th>
                    <th className="py-2.5 px-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {record.fichaPrevencion.tamizajesOncologicosMetabolicos.map(
                    (scr) => (
                      <tr key={scr.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {scr.tamizajeControl}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {scr.criterioPoblacion}
                        </td>
                        <td className="py-2 px-3 font-mono-clinical">
                          {scr.fechaRealizacion}
                        </td>
                        <td className="py-2 px-3 text-slate-800">
                          {scr.resultadoConducta}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                            {scr.estado}
                          </span>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <input
                type="text"
                placeholder="Nuevo tamizaje (ej. Mamografía, Papanicolaou, PSA, VIH/VDRL, Densitometría)"
                value={newScreenName}
                onChange={(e) => setNewScreenName(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
              />
              <input
                type="text"
                placeholder="Resultado / Hallazgo"
                value={newScreenResult}
                onChange={(e) => setNewScreenResult(e.target.value)}
                className="w-56 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newScreenName.trim()) return;
                  setRecord((prev) => ({
                    ...prev,
                    fichaPrevencion: {
                      ...prev.fichaPrevencion,
                      tamizajesOncologicosMetabolicos: [
                        ...prev.fichaPrevencion.tamizajesOncologicosMetabolicos,
                        {
                          id: `tam-${Date.now()}`,
                          tamizajeControl: newScreenName.trim(),
                          criterioPoblacion: 'Tamizaje preventivo medicina familiar',
                          fechaRealizacion: '02 Oct 2025',
                          resultadoConducta: newScreenResult.trim(),
                          estado: 'Al día',
                        },
                      ],
                    },
                  }));
                  setNewScreenName('');
                }}
                className="px-3.5 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Añadir tamizaje
              </button>
            </div>
          </div>

          {/* Controles Preventivos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Salud Bucal / Odontología Preventiva
              </label>
              <input
                type="text"
                value={
                  record.fichaPrevencion.controlesPreventivos
                    .saludBucalOdontologia
                }
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    fichaPrevencion: {
                      ...prev.fichaPrevencion,
                      controlesPreventivos: {
                        ...prev.fichaPrevencion.controlesPreventivos,
                        saludBucalOdontologia: e.target.value,
                      },
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Agudeza Visual y Salud Ocular
              </label>
              <input
                type="text"
                value={record.fichaPrevencion.controlesPreventivos.agudezaVisual}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    fichaPrevencion: {
                      ...prev.fichaPrevencion,
                      controlesPreventivos: {
                        ...prev.fichaPrevencion.controlesPreventivos,
                        agudezaVisual: e.target.value,
                      },
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Salud Mental y Bienestar Emocional
              </label>
              <input
                type="text"
                value={
                  record.fichaPrevencion.controlesPreventivos.saludMentalTamizaje
                }
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    fichaPrevencion: {
                      ...prev.fichaPrevencion,
                      controlesPreventivos: {
                        ...prev.fichaPrevencion.controlesPreventivos,
                        saludMentalTamizaje: e.target.value,
                      },
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================== FORM 6: FICHAS ESPECIALES POR CICLO DE VIDA ==================== */}
      {activeTab === 'fichas-especiales' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                Formulario Clínico #06 · Atención Integral por Ciclo de Vida
              </span>
              <h3 className="text-lg font-extrabold text-slate-900">
                6. Fichas Especiales: Embarazo, Puerperio, Niño Sano, Adolescente y Adulto Mayor
              </h3>
              <p className="text-xs text-slate-500">
                Seleccione el programa de atención por ciclo de vida para documentar controles específicos normados.
              </p>
            </div>

            {/* Sub-navigation for the 5 Special Forms */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {(
                [
                  { id: 'embarazo', label: '1. Embarazo (Prenatal)' },
                  { id: 'puerperio', label: '2. Puerperio' },
                  { id: 'nino-sano', label: '3. Niño Sano' },
                  { id: 'adolescente', label: '4. Adolescente' },
                  { id: 'adulto-mayor', label: '5. Adulto Mayor' },
                ] as { id: LifecycleStageType; label: string }[]
              ).map((st) => {
                const isSelected =
                  record.fichasEspeciales.etapaSeleccionada === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          etapaSeleccionada: st.id,
                        },
                      }))
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6.1 Embarazo */}
          {record.fichasEspeciales.etapaSeleccionada === 'embarazo' && (
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-teal-800 border-l-3 border-teal-600 pl-2.5">
                Ficha de Control Prenatal (Seguimiento de Embarazo)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Fecha Última Menstruación (FUM)
                  </label>
                  <input
                    type="text"
                    value={record.fichasEspeciales.embarazo.fur}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          embarazo: {
                            ...prev.fichasEspeciales.embarazo,
                            fur: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Fecha Probable de Parto (FPP)
                  </label>
                  <input
                    type="text"
                    value={record.fichasEspeciales.embarazo.fpp}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          embarazo: {
                            ...prev.fichasEspeciales.embarazo,
                            fpp: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Edad Gestacional (Semanas)
                  </label>
                  <input
                    type="text"
                    value={
                      record.fichasEspeciales.embarazo.edadGestacionalSemanas
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          embarazo: {
                            ...prev.fichasEspeciales.embarazo,
                            edadGestacionalSemanas: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Fórmula Obstétrica (G P A C)
                  </label>
                  <input
                    type="text"
                    value={record.fichasEspeciales.embarazo.formulaObstetrica}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          embarazo: {
                            ...prev.fichasEspeciales.embarazo,
                            formulaObstetrica: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Altura Uterina (cm)
                  </label>
                  <input
                    type="text"
                    value={record.fichasEspeciales.embarazo.alturaUterinaCm}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          embarazo: {
                            ...prev.fichasEspeciales.embarazo,
                            alturaUterinaCm: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Frecuencia Cardíaca Fetal (FCF)
                  </label>
                  <input
                    type="text"
                    value={
                      record.fichasEspeciales.embarazo.frecuenciaCardiacaFetalLpm
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          embarazo: {
                            ...prev.fichasEspeciales.embarazo,
                            frecuenciaCardiacaFetalLpm: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Presentación y Movimientos Fetales
                  </label>
                  <input
                    type="text"
                    value={`${record.fichasEspeciales.embarazo.presentacionFetal} · Mov: ${record.fichasEspeciales.embarazo.movimientosFetales}`}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          embarazo: {
                            ...prev.fichasEspeciales.embarazo,
                            presentacionFetal: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Suplementación (Hierro / Ácido Fólico)
                  </label>
                  <input
                    type="text"
                    value={
                      record.fichasEspeciales.embarazo.suplementacionHierroFolato
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          embarazo: {
                            ...prev.fichasEspeciales.embarazo,
                            suplementacionHierroFolato: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tamizaje Prenatal (Tipificación, Hemograma, VDRL, VIH, HBsAg, EGO)
                  </label>
                  <textarea
                    rows={2}
                    value={
                      record.fichasEspeciales.embarazo.laboratoriosPrenatales
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          embarazo: {
                            ...prev.fichasEspeciales.embarazo,
                            laboratoriosPrenatales: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Signos de Alarma Obstétrica Explicados
                  </label>
                  <textarea
                    rows={2}
                    value={
                      record.fichasEspeciales.embarazo.signosAlarmaObstetrica
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          embarazo: {
                            ...prev.fichasEspeciales.embarazo,
                            signosAlarmaObstetrica: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6.2 Puerperio */}
          {record.fichasEspeciales.etapaSeleccionada === 'puerperio' && (
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-teal-800 border-l-3 border-teal-600 pl-2.5">
                Ficha de Seguimiento de Puerperio (Atención Postparto / Postcesárea)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Días Postparto / Tipo de Resolución Obstétrica
                  </label>
                  <input
                    type="text"
                    value={record.fichasEspeciales.puerperio.diasPostparto}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          puerperio: {
                            ...prev.fichasEspeciales.puerperio,
                            diasPostparto: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Involución Uterina y Características de Loquios
                  </label>
                  <input
                    type="text"
                    value={`${record.fichasEspeciales.puerperio.involucionUterina} · ${record.fichasEspeciales.puerperio.caracteristicasLoquios}`}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          puerperio: {
                            ...prev.fichasEspeciales.puerperio,
                            involucionUterina: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Evaluación de Mamas y Lactancia Materna Exclusiva
                  </label>
                  <textarea
                    rows={2}
                    value={
                      record.fichasEspeciales.puerperio.evaluacionMamasLactancia
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          puerperio: {
                            ...prev.fichasEspeciales.puerperio,
                            evaluacionMamasLactancia: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Estado Emocional y Planificación Familiar Post-Evento
                  </label>
                  <textarea
                    rows={2}
                    value={
                      record.fichasEspeciales.puerperio
                        .tamizajeDepresionPostparto
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          puerperio: {
                            ...prev.fichasEspeciales.puerperio,
                            tamizajeDepresionPostparto: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6.3 Niño Sano */}
          {record.fichasEspeciales.etapaSeleccionada === 'nino-sano' && (
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-teal-800 border-l-3 border-teal-600 pl-2.5">
                Ficha de Crecimiento y Desarrollo del Niño Sano
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Percentil Peso/Edad (OMS)
                  </label>
                  <input
                    type="text"
                    value={record.fichasEspeciales.ninoSano.pesoEdadPercentil}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          ninoSano: {
                            ...prev.fichasEspeciales.ninoSano,
                            pesoEdadPercentil: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Percentil Talla/Edad (OMS)
                  </label>
                  <input
                    type="text"
                    value={record.fichasEspeciales.ninoSano.tallaEdadPercentil}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          ninoSano: {
                            ...prev.fichasEspeciales.ninoSano,
                            tallaEdadPercentil: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Perímetro Cefálico
                  </label>
                  <input
                    type="text"
                    value={record.fichasEspeciales.ninoSano.perimetroCefalicoCm}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          ninoSano: {
                            ...prev.fichasEspeciales.ninoSano,
                            perimetroCefalicoCm: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Hitos del Desarrollo Psicomotor, Alimentación y Suplementación
                  </label>
                  <textarea
                    rows={3}
                    value={
                      record.fichasEspeciales.ninoSano.desarrolloPsicomotorHitos
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          ninoSano: {
                            ...prev.fichasEspeciales.ninoSano,
                            desarrolloPsicomotorHitos: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6.4 Adolescente */}
          {record.fichasEspeciales.etapaSeleccionada === 'adolescente' && (
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-teal-800 border-l-3 border-teal-600 pl-2.5">
                Ficha de Atención Integral al Adolescente (Evaluación Biopsicosocial HEEADSSS)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Hogar, Convivencia y Entorno Escolar
                  </label>
                  <input
                    type="text"
                    value={record.fichasEspeciales.adolescente.hogarConvivencia}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          adolescente: {
                            ...prev.fichasEspeciales.adolescente,
                            hogarConvivencia: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Desarrollo Puberal (Tanner) e Imagen Corporal
                  </label>
                  <input
                    type="text"
                    value={record.fichasEspeciales.adolescente.estadioTanner}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          adolescente: {
                            ...prev.fichasEspeciales.adolescente,
                            estadioTanner: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Prevención de Riesgos (Sustancias, Pantallas, Seguridad Vial)
                  </label>
                  <input
                    type="text"
                    value={
                      record.fichasEspeciales.adolescente
                        .consumoSustanciasRiesgos
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          adolescente: {
                            ...prev.fichasEspeciales.adolescente,
                            consumoSustanciasRiesgos: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Salud Sexual, Reproductiva y Estado de Ánimo
                  </label>
                  <input
                    type="text"
                    value={
                      record.fichasEspeciales.adolescente.saludSexualPrevencion
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          adolescente: {
                            ...prev.fichasEspeciales.adolescente,
                            saludSexualPrevencion: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6.5 Adulto Mayor */}
          {record.fichasEspeciales.etapaSeleccionada === 'adulto-mayor' && (
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-teal-800 border-l-3 border-teal-600 pl-2.5">
                Ficha de Valoración Geriátrica Integral (Adulto Mayor)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Funcionalidad Básica (Índice de Katz ABVD)
                  </label>
                  <select
                    value={record.fichasEspeciales.adultoMayor.indiceKatzABVD}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          adultoMayor: {
                            ...prev.fichasEspeciales.adultoMayor,
                            indiceKatzABVD: e.target.value as any,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                  >
                    <option value="Independiente (A)">Independiente (A)</option>
                    <option value="Dependencia parcial (B-D)">
                      Dependencia parcial (B-D)
                    </option>
                    <option value="Dependencia severa (E-G)">
                      Dependencia severa (E-G)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Actividades Instrumentales (Escala Lawton y Brody)
                  </label>
                  <input
                    type="text"
                    value={record.fichasEspeciales.adultoMayor.escalaLawtonAIVD}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          adultoMayor: {
                            ...prev.fichasEspeciales.adultoMayor,
                            escalaLawtonAIVD: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Riesgo de Caídas (Tinetti / Timed Up & Go)
                  </label>
                  <select
                    value={record.fichasEspeciales.adultoMayor.riesgoCaidas}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          adultoMayor: {
                            ...prev.fichasEspeciales.adultoMayor,
                            riesgoCaidas: e.target.value as any,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                  >
                    <option value="Bajo">Riesgo Bajo</option>
                    <option value="Moderado">Riesgo Moderado</option>
                    <option value="Alto (Requiere apoyo de marcha)">
                      Alto (Requiere apoyo de marcha)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Evaluación Cognitiva (Mini-Mental / Reloj)
                  </label>
                  <input
                    type="text"
                    value={
                      record.fichasEspeciales.adultoMayor
                        .evaluacionCognitivaMinimental
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          adultoMayor: {
                            ...prev.fichasEspeciales.adultoMayor,
                            evaluacionCognitivaMinimental: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Revisión de Polifarmacia y Conciliación
                  </label>
                  <input
                    type="text"
                    value={
                      record.fichasEspeciales.adultoMayor.revisionPolifarmacia
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          adultoMayor: {
                            ...prev.fichasEspeciales.adultoMayor,
                            revisionPolifarmacia: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Red de Apoyo y Cuidador Principal
                  </label>
                  <input
                    type="text"
                    value={
                      record.fichasEspeciales.adultoMayor
                        .redApoyoCuidadorPrincipal
                    }
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        fichasEspeciales: {
                          ...prev.fichasEspeciales,
                          adultoMayor: {
                            ...prev.fichasEspeciales.adultoMayor,
                            redApoyoCuidadorPrincipal: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== FORM 7: REFERENCIA Y CONTRARREFERENCIA ==================== */}
      {activeTab === 'referencia-contrarreferencia' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                Formulario Clínico #07 · Coordinación de Red de Servicios de Salud
              </span>
              <h3 className="text-lg font-extrabold text-slate-900">
                7. Hoja de Referencia y Contrarreferencia
              </h3>
              <p className="text-xs text-slate-500">
                Articulación entre Atención Primaria (Medicina Familiar) y niveles especializados: motivo, centro de destino, resumen clínico y retorno.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const newRef = {
                    id: `ref-${Date.now()}`,
                    fechaEmision: new Date().toLocaleDateString('es-DO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    }),
                    tipoFormato: 'Referencia' as const,
                    prioridad: 'Consulta Externa Especializada' as const,
                    centroOrigen: `${activeDoctor.unapCenter} (${activeDoctor.consultorio})`,
                    centroDestino: '',
                    servicioEspecialidadDestino: '',
                    motivoReferencia: '',
                    resumenClinicoHallazgos: selectedPatient
                      ? `Paciente de ${selectedPatient.age} años. Signos vitales actuales: TA ${selectedPatient.vitals.ta} mmHg, Peso ${selectedPatient.vitals.weight}.`
                      : '',
                    resultadosexamenesPrevios: '',
                    diagnosticoPresuntivoCie10:
                      selectedPatient?.diagnoses[0]?.name || '',
                    tratamientoRealizadoPrevio:
                      selectedPatient?.medications.map((m) => `${m.name} (${m.dosage})`).join('; ') ||
                      '',
                    estadoSeguimiento: 'Enviada' as const,
                    contrarreferenciaHallazgosEspecialista: '',
                    contrarreferenciaDiagnosticoDefinitivo: '',
                    contrarreferenciaConductaSeguimientoUnap: '',
                    medicoReferente: `${activeDoctor.name} (Exequátur ${activeDoctor.exequatur} · ${activeDoctor.cmd})`,
                  };
                  setRecord((prev) => ({
                    ...prev,
                    referencias: [newRef, ...prev.referencias],
                  }));
                  onTriggerToast('Nueva boleta de referencia nacional creada');
                }}
                className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Emitir Nueva Referencia</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrintScope('active-tab');
                  setShowPrintModal(true);
                }}
                className="px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Hoja de Referencia MSP</span>
              </button>
            </div>
          </div>

          {/* Quick Dominican Reference Hospitals Bar */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-600 mr-1">
              Centros Nacionales de Referencia (RD):
            </span>
            {[
              { name: 'Hospital General Plaza de la Salud (HGPS)', serv: 'Cardiología / Endocrinología' },
              { name: 'CEDIMAT · Plaza de la Salud', serv: 'Imágenes Diagnósticas / Cardiología' },
              { name: 'Hospital Dr. Salvador B. Gautier (SNS)', serv: 'Medicina Interna / Nefrología' },
              { name: 'INCART (Instituto Nacional del Cáncer)', serv: 'Oncología / Ginecología' },
              { name: 'Maternidad Nuestra Sra. de La Altagracia', serv: 'Alto Riesgo Obstétrico' },
            ].map((hosp) => (
              <button
                key={hosp.name}
                type="button"
                onClick={() => {
                  if (record.referencias.length === 0) return;
                  const firstId = record.referencias[0].id;
                  setRecord((prev) => ({
                    ...prev,
                    referencias: prev.referencias.map((r) =>
                      r.id === firstId
                        ? {
                            ...r,
                            centroDestino: hosp.name,
                            servicioEspecialidadDestino: hosp.serv,
                          }
                        : r
                    ),
                  }));
                  onTriggerToast(`Centro destino asignado: ${hosp.name}`);
                }}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 border border-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer transition-colors"
              >
                {hosp.name}
              </button>
            ))}
          </div>

          {record.referencias.map((refItem, idx) => (
            <div
              key={refItem.id}
              className="space-y-5 p-5 rounded-2xl bg-slate-50/70 border border-slate-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-700" />
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Boleta #{idx + 1} · {refItem.servicioEspecialidadDestino}
                  </h4>
                </div>
                <select
                  value={refItem.estadoSeguimiento}
                  onChange={(e) => {
                    const nextVal = e.target.value as any;
                    setRecord((prev) => ({
                      ...prev,
                      referencias: prev.referencias.map((r) =>
                        r.id === refItem.id
                          ? { ...r, estadoSeguimiento: nextVal }
                          : r
                      ),
                    }));
                  }}
                  className="px-3 py-1 rounded-lg bg-white border border-slate-300 text-xs font-bold text-teal-900"
                >
                  <option value="Enviada">Estado: Referencia Enviada</option>
                  <option value="Recibida en centro destino">
                    Estado: En Atención en Centro Destino
                  </option>
                  <option value="Contrarreferencia completada">
                    Estado: Contrarreferencia Recibida
                  </option>
                </select>
              </div>

              {/* Bloque I: Datos de Referencia */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Prioridad de la Referencia
                  </label>
                  <select
                    value={refItem.prioridad}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        referencias: prev.referencias.map((r) =>
                          r.id === refItem.id
                            ? { ...r, prioridad: e.target.value as any }
                            : r
                        ),
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                  >
                    <option value="Consulta Externa Especializada">
                      Consulta Externa Especializada
                    </option>
                    <option value="Urgencia">Urgencia / Emergencia</option>
                    <option value="Apoyo Diagnóstico">
                      Apoyo Diagnóstico / Imágenes
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Establecimiento de Origen (Que refiere)
                  </label>
                  <input
                    type="text"
                    value={refItem.centroOrigen}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        referencias: prev.referencias.map((r) =>
                          r.id === refItem.id
                            ? { ...r, centroOrigen: e.target.value }
                            : r
                        ),
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Centro de Salud de Destino (Receptor)
                  </label>
                  <input
                    type="text"
                    value={refItem.centroDestino}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        referencias: prev.referencias.map((r) =>
                          r.id === refItem.id
                            ? { ...r, centroDestino: e.target.value }
                            : r
                        ),
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Servicio o Especialidad de Destino
                  </label>
                  <input
                    type="text"
                    value={refItem.servicioEspecialidadDestino}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        referencias: prev.referencias.map((r) =>
                          r.id === refItem.id
                            ? {
                                ...r,
                                servicioEspecialidadDestino: e.target.value,
                              }
                            : r
                        ),
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Motivo de Referencia y Solicitud Clínica
                  </label>
                  <input
                    type="text"
                    value={refItem.motivoReferencia}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        referencias: prev.referencias.map((r) =>
                          r.id === refItem.id
                            ? { ...r, motivoReferencia: e.target.value }
                            : r
                        ),
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Resumen Clínico, Signos Vitales y Examen Físico Relevante
                  </label>
                  <textarea
                    rows={2}
                    value={refItem.resumenClinicoHallazgos}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        referencias: prev.referencias.map((r) =>
                          r.id === refItem.id
                            ? { ...r, resumenClinicoHallazgos: e.target.value }
                            : r
                        ),
                      }))
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Diagnóstico Presuntivo / Definitivo (CIE-10)
                  </label>
                  <textarea
                    rows={2}
                    value={refItem.diagnosticoPresuntivoCie10}
                    onChange={(e) =>
                      setRecord((prev) => ({
                        ...prev,
                        referencias: prev.referencias.map((r) =>
                          r.id === refItem.id
                            ? {
                                ...r,
                                diagnosticoPresuntivoCie10: e.target.value,
                              }
                            : r
                        ),
                      }))
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                  />
                </div>
              </div>

              {/* Bloque II: Contrarreferencia y Seguimiento */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <h5 className="text-xs font-extrabold uppercase tracking-wider text-teal-800">
                  Sección de Contrarreferencia (Respuesta del Nivel Especializado y Seguimiento)
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Hallazgos Clínicos y Diagnóstico del Especialista
                    </label>
                    <textarea
                      rows={2}
                      value={refItem.contrarreferenciaHallazgosEspecialista}
                      onChange={(e) =>
                        setRecord((prev) => ({
                          ...prev,
                          referencias: prev.referencias.map((r) =>
                            r.id === refItem.id
                              ? {
                                  ...r,
                                  contrarreferenciaHallazgosEspecialista:
                                    e.target.value,
                                }
                              : r
                          ),
                        }))
                      }
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Recomendaciones y Plan de Seguimiento en Medicina Familiar
                    </label>
                    <textarea
                      rows={2}
                      value={refItem.contrarreferenciaConductaSeguimientoUnap}
                      onChange={(e) =>
                        setRecord((prev) => ({
                          ...prev,
                          referencias: prev.referencias.map((r) =>
                            r.id === refItem.id
                              ? {
                                  ...r,
                                  contrarreferenciaConductaSeguimientoUnap:
                                    e.target.value,
                                }
                              : r
                          ),
                        }))
                      }
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== TAB 08: VISITA DOMICILIARIA (CONSULTA A DOMICILIO MSP) ==================== */}
      {activeTab === 'visita-domiciliaria' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-mono-clinical font-bold uppercase tracking-wider text-teal-700">
                Formulario Clínico 08 · Atención Primaria y Terreno UNAP
              </span>
              <h3
                className="text-base font-extrabold"
                style={{ color: 'var(--brand-heading)' }}
              >
                Ficha de Consulta a Domicilio y Visita en Terreno (MSP)
              </h3>
              <p className="text-xs text-slate-500">
                Valoración integral en el hogar: ruta por sector/GPS, encamados (Barthel / UPP), cuidador (Zarit), ambiente/vectores y procedimientos en casa.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const newVisit = buildDefaultHomeVisitForPatient(
                  selectedPatient,
                  activeDoctor.name,
                  activeDoctor.exequatur,
                  `${activeDoctor.unapCenter} (${activeDoctor.consultorio})`
                );
                setRecord((prev) => ({
                  ...prev,
                  visitasDomiciliarias: [
                    newVisit,
                    ...(prev.visitasDomiciliarias || []),
                  ],
                }));
                onTriggerToast(
                  `Nueva ficha de Visita Domiciliaria creada para ${selectedPatient.name}`
                );
              }}
              className="px-4 py-2 rounded-xl text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <Plus className="w-4 h-4" />
              <span>+ Nueva Visita Domiciliaria</span>
            </button>
          </div>

          {(!record.visitasDomiciliarias ||
            record.visitasDomiciliarias.length === 0) ? (
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-3">
              <Home className="w-8 h-8 text-teal-700 mx-auto" />
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-sm font-extrabold text-slate-900">
                  Sin visitas domiciliarias registradas para {selectedPatient.name}
                </h4>
                <p className="text-xs text-slate-500">
                  Inicie una ficha de consulta a domicilio para documentar signos vitales en casa, Índice de Barthel, úlceras por presión, escala de Zarit del cuidador, inspección de vectores y procedimientos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newVisit = buildDefaultHomeVisitForPatient(
                    selectedPatient,
                    activeDoctor.name,
                    activeDoctor.exequatur,
                    `${activeDoctor.unapCenter} (${activeDoctor.consultorio})`
                  );
                  setRecord((prev) => ({
                    ...prev,
                    visitasDomiciliarias: [newVisit],
                  }));
                  onTriggerToast('Visita domiciliaria inicializada');
                }}
                className="px-4 py-2 rounded-xl text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Plus className="w-4 h-4" />
                <span>Iniciar Primera Visita a Domicilio</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {record.visitasDomiciliarias.map((visitItem) => (
                <HomeVisitClinicalEditor
                  key={visitItem.id}
                  visit={visitItem}
                  onChangeVisit={(updatedVisit: HomeVisitRecord) => {
                    setRecord((prev) => ({
                      ...prev,
                      visitasDomiciliarias: (prev.visitasDomiciliarias || []).map(
                        (v) => (v.id === updatedVisit.id ? updatedVisit : v)
                      ),
                    }));
                  }}
                  onPrintVisit={() => {
                    setPrintScope('active-tab');
                    setShowPrintModal(true);
                  }}
                  onDeleteVisit={(visitId: string) => {
                    setRecord((prev) => ({
                      ...prev,
                      visitasDomiciliarias: (
                        prev.visitasDomiciliarias || []
                      ).filter((v) => v.id !== visitId),
                    }));
                    onTriggerToast('Visita domiciliaria eliminada del expediente');
                  }}
                  onTriggerToast={onTriggerToast}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== OFFICIAL MSP PRINTABLE DOCUMENT MODAL ==================== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print-only-container">
            {/* Non-Printable Toolbar */}
            <div className="px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-extrabold">
                  Vista Previa de Documento Clínico Imprimible (Formato MSP)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setPrintScope('active-tab')}
                    className={`px-2.5 py-1 rounded-md cursor-pointer ${
                      printScope === 'active-tab'
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-300'
                    }`}
                  >
                    Ficha Actual ({activeTabMeta.label})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintScope('full-dossier')}
                    className={`px-2.5 py-1 rounded-md cursor-pointer ${
                      printScope === 'full-dossier'
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-300'
                    }`}
                  >
                    Expediente Completo (7 Fichas)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Guardar PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Clinical Sheet Content */}
            <div className="p-8 overflow-y-auto space-y-6 text-slate-900 bg-white">
              {/* Official MSP / Clinic Letterhead */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <FamiliaLogoEmblem size={52} />
                  <div>
                    <div className="flex items-center gap-2">
                      <DominicanFlagIcon className="w-5 h-3.5" />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600">
                        República Dominicana · Práctica de Medicina Familiar
                      </span>
                    </div>
                    <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight mt-0.5">
                      Unidad de Atención Primaria y Medicina Familiar Familia+
                    </h2>
                    <p className="text-xs text-slate-600">
                      Formato Clínico Estandarizado de Referencia · Ministerio de Salud Pública (MSP)
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs font-mono-clinical">
                  <p className="font-bold text-slate-900">
                    EXPEDIENTE #{selectedPatient.code}
                  </p>
                  <p className="text-slate-600">
                    Carpeta: {record.fichaFamiliar.codigoCarpetaFamiliar}
                  </p>
                  <p className="text-slate-600">Fecha: 02 Oct 2025</p>
                </div>
              </div>

              {/* Patient Filiación Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Paciente
                  </span>
                  <strong className="text-slate-900">
                    {selectedPatient.name}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Cédula de Identidad
                  </span>
                  <strong className="font-mono-clinical">
                    {selectedPatient.cedula}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Edad / Sexo / Sangre
                  </span>
                  <strong>
                    {selectedPatient.age} años · {selectedPatient.gender} ·{' '}
                    {selectedPatient.bloodType}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Seguro ARS / NSS
                  </span>
                  <strong>
                    {selectedPatient.ars} ({record.historiaIndividual.nssAfiliado})
                  </strong>
                </div>
              </div>

              {/* Section 1 in Print */}
              {(printScope === 'full-dossier' ||
                activeTab === 'historia-individual') && (
                <div className="space-y-2 border-b border-slate-200 pb-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded border border-slate-300">
                    1. Historia Clínica Individual
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p>
                      <strong>Antecedentes Patológicos:</strong>{' '}
                      {record.historiaIndividual.antecedentesPatologicos}
                    </p>
                    <p>
                      <strong>Antecedentes Quirúrgicos:</strong>{' '}
                      {record.historiaIndividual.antecedentesQuirurgicos}
                    </p>
                    <p>
                      <strong>Antecedentes Familiares:</strong>{' '}
                      {record.historiaIndividual.antecedentesFamiliares}
                    </p>
                    <p>
                      <strong>Alergias:</strong>{' '}
                      {record.historiaIndividual.alergiasMedicamentosas}
                    </p>
                    <p className="col-span-2">
                      <strong>Examen Físico General y Regional:</strong>{' '}
                      {record.historiaIndividual.examenAspectoGeneral}{' '}
                      {record.historiaIndividual.examenToraxCardiopulmonar}
                    </p>
                  </div>
                </div>
              )}

              {/* Section 2 in Print */}
              {(printScope === 'full-dossier' ||
                activeTab === 'consulta-medica') && (
                <div className="space-y-2 border-b border-slate-200 pb-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded border border-slate-300">
                    2. Consulta Médica y Signos Vitales
                  </h3>
                  <div className="text-xs space-y-1.5">
                    <p>
                      <strong>Motivo de Consulta:</strong>{' '}
                      {record.consultaActualBorrador.motivoConsulta}
                    </p>
                    <p>
                      <strong>Enfermedad Actual (HEA):</strong>{' '}
                      {record.consultaActualBorrador.enfermedadActual}
                    </p>
                    <p className="font-mono-clinical bg-slate-50 p-2 rounded border border-slate-200">
                      <strong>Signos Vitales:</strong> TA{' '}
                      {record.consultaActualBorrador.signosVitales.taSistolica}/
                      {record.consultaActualBorrador.signosVitales.taDiastolica}{' '}
                      mmHg | FC{' '}
                      {
                        record.consultaActualBorrador.signosVitales
                          .frecuenciaCardiaca
                      }{' '}
                      lpm | FR{' '}
                      {
                        record.consultaActualBorrador.signosVitales
                          .frecuenciaRespiratoria
                      }{' '}
                      rpm | Temp{' '}
                      {record.consultaActualBorrador.signosVitales.temperatura}{' '}
                      °C | Peso{' '}
                      {record.consultaActualBorrador.signosVitales.pesoKg} kg |
                      IMC {record.consultaActualBorrador.signosVitales.imc}{' '}
                      kg/m²
                    </p>
                    <p>
                      <strong>Diagnóstico CIE-10:</strong>{' '}
                      {record.consultaActualBorrador.diagnosticoPrincipal} (
                      {record.consultaActualBorrador.tipoDiagnostico})
                    </p>
                    <p>
                      <strong>Tratamiento e Indicaciones:</strong>{' '}
                      {record.consultaActualBorrador.tratamientoFarmacologico}
                    </p>
                  </div>
                </div>
              )}

              {/* Section 3 in Print */}
              {(printScope === 'full-dossier' ||
                activeTab === 'ficha-familiar') && (
                <div className="space-y-2 border-b border-slate-200 pb-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded border border-slate-300">
                    3. Ficha Familiar ({record.fichaFamiliar.codigoCarpetaFamiliar})
                  </h3>
                  <p className="text-xs">
                    <strong>UNAP / CPN:</strong>{' '}
                    {record.fichaFamiliar.unapCentroPrimerNivel} ·{' '}
                    <strong>Tipo de Familia:</strong>{' '}
                    {record.fichaFamiliar.tipoFamilia} ·{' '}
                    <strong>Riesgo Familiar:</strong>{' '}
                    {record.fichaFamiliar.riesgoFamiliarGlobal}
                  </p>
                  <p className="text-xs">
                    <strong>Vivienda:</strong> Paredes{' '}
                    {record.fichaFamiliar.condicionesVivienda.materialParedes},
                    Techo{' '}
                    {record.fichaFamiliar.condicionesVivienda.materialTecho},
                    Agua{' '}
                    {
                      record.fichaFamiliar.condicionesVivienda
                        .abastecimientoAgua
                    }
                    .
                  </p>
                </div>
              )}

              {/* Section 4 in Print */}
              {(printScope === 'full-dossier' ||
                activeTab === 'enfermedades-cronicas') && (
                <div className="space-y-2 border-b border-slate-200 pb-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded border border-slate-300">
                    4. Seguimiento de Enfermedades Crónicas (ECNT)
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p>
                      <strong>Control HTA:</strong>{' '}
                      {
                        record.seguimientoCronicas.hipertensionControl
                          .estadioClasificacion
                      }{' '}
                      (Meta{' '}
                      {
                        record.seguimientoCronicas.hipertensionControl
                          .metaPresionArterial
                      }
                      )
                    </p>
                    <p>
                      <strong>Control Glucémico:</strong> Ayunas{' '}
                      {
                        record.seguimientoCronicas.diabetesControl
                          .glucemiaAyunasMgDl
                      }{' '}
                      mg/dL · HbA1c{' '}
                      {
                        record.seguimientoCronicas.diabetesControl
                          .hba1cPorcentaje
                      }
                    </p>
                    <p>
                      <strong>Perfil Lipídico:</strong> Colesterol{' '}
                      {
                        record.seguimientoCronicas.dislipidemiaControl
                          .colesterolTotalMgDl
                      }{' '}
                      mg/dL · LDL{' '}
                      {
                        record.seguimientoCronicas.dislipidemiaControl
                          .ldlColesterolMgDl
                      }{' '}
                      mg/dL
                    </p>
                    <p>
                      <strong>Riesgo Cardiovascular:</strong>{' '}
                      {record.seguimientoCronicas.riesgoCardiovascular}
                    </p>
                  </div>
                </div>
              )}

              {/* Section 5 in Print */}
              {(printScope === 'full-dossier' ||
                activeTab === 'prevencion-tamizaje') && (
                <div className="space-y-2 border-b border-slate-200 pb-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded border border-slate-300">
                    5. Fichas de Prevención, PAI y Tamizajes
                  </h3>
                  <p className="text-xs">
                    <strong>Vacunas Registradas:</strong>{' '}
                    {record.fichaPrevencion.esquemaVacunacion
                      .map((v) => `${v.biologico} (${v.estado})`)
                      .join(' · ')}
                  </p>
                  <p className="text-xs">
                    <strong>Tamizajes:</strong>{' '}
                    {record.fichaPrevencion.tamizajesOncologicosMetabolicos
                      .map((t) => `${t.tamizajeControl}: ${t.resultadoConducta}`)
                      .join(' | ')}
                  </p>
                </div>
              )}

              {/* Section 6 in Print */}
              {(printScope === 'full-dossier' ||
                activeTab === 'fichas-especiales') && (
                <div className="space-y-2 border-b border-slate-200 pb-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded border border-slate-300">
                    6. Fichas Especiales por Ciclo de Vida
                  </h3>
                  <p className="text-xs">
                    <strong>Valoración Adulto Mayor / Ciclo Activo:</strong>{' '}
                    Katz: {record.fichasEspeciales.adultoMayor.indiceKatzABVD} ·
                    Cognitivo:{' '}
                    {
                      record.fichasEspeciales.adultoMayor
                        .evaluacionCognitivaMinimental
                    }
                  </p>
                </div>
              )}

              {/* Section 7 in Print */}
              {(printScope === 'full-dossier' ||
                activeTab === 'referencia-contrarreferencia') &&
                record.referencias[0] && (
                  <div className="space-y-2 pb-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded border border-slate-300">
                      7. Referencia y Contrarreferencia
                    </h3>
                    <div className="text-xs space-y-1">
                      <p>
                        <strong>Centro Destino:</strong>{' '}
                        {record.referencias[0].centroDestino} —{' '}
                        <strong>Servicio:</strong>{' '}
                        {record.referencias[0].servicioEspecialidadDestino}
                      </p>
                      <p>
                        <strong>Motivo de Referencia:</strong>{' '}
                        {record.referencias[0].motivoReferencia}
                      </p>
                      <p>
                        <strong>Resumen Clínico:</strong>{' '}
                        {record.referencias[0].resumenClinicoHallazgos}
                      </p>
                      <p>
                        <strong>Contrarreferencia / Seguimiento:</strong>{' '}
                        {
                          record.referencias[0]
                            .contrarreferenciaConductaSeguimientoUnap
                        }
                      </p>
                    </div>
                  </div>
                )}

              {/* Section 8 in Print */}
              {(printScope === 'full-dossier' ||
                activeTab === 'visita-domiciliaria') &&
                record.visitasDomiciliarias &&
                record.visitasDomiciliarias[0] && (
                  <div className="space-y-2 pb-4 border-t border-slate-200 pt-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded border border-slate-300">
                      8. Acta de Consulta a Domicilio / Visita en Terreno (MSP)
                    </h3>
                    <div className="text-xs space-y-1">
                      <p>
                        <strong>Fecha y Estado:</strong>{' '}
                        {record.visitasDomiciliarias[0].fechaVisita} (
                        {record.visitasDomiciliarias[0].horaProgramada}) —{' '}
                        <strong>
                          {record.visitasDomiciliarias[0].estadoVisita}
                        </strong>
                      </p>
                      <p>
                        <strong>Sector y Dirección:</strong>{' '}
                        {record.visitasDomiciliarias[0].sectorBarrio} ·{' '}
                        {record.visitasDomiciliarias[0].direccionExacta} (Ref:{' '}
                        {record.visitasDomiciliarias[0].puntoReferencia || 'N/A'}
                        ) · GPS:{' '}
                        {record.visitasDomiciliarias[0].coordenadasGps || 'N/A'}
                      </p>
                      <p>
                        <strong>Signos Vitales en Domicilio:</strong> TA{' '}
                        {record.visitasDomiciliarias[0].signosVitales.ta} mmHg |
                        FC {record.visitasDomiciliarias[0].signosVitales.fc} lpm
                        | Temp{' '}
                        {record.visitasDomiciliarias[0].signosVitales.temp} |
                        SpO₂ {record.visitasDomiciliarias[0].signosVitales.spo2}{' '}
                        | Glucemia{' '}
                        {record.visitasDomiciliarias[0].signosVitales
                          .glucemiaCapilar || '—'}
                      </p>
                      <p>
                        <strong>Evaluación Encamado (Barthel / UPP):</strong>{' '}
                        {
                          record.visitasDomiciliarias[0].encamadoEvaluacion
                            .condicionMovilidad
                        }{' '}
                        · Barthel:{' '}
                        {
                          record.visitasDomiciliarias[0].encamadoEvaluacion
                            .indiceBarthelPuntaje
                        }
                        /100 (
                        {
                          record.visitasDomiciliarias[0].encamadoEvaluacion
                            .indiceBarthelNivel
                        }
                        ) · UPP:{' '}
                        {
                          record.visitasDomiciliarias[0].encamadoEvaluacion
                            .uppPresente
                        }
                      </p>
                      <p>
                        <strong>Cuidador Principal (Zarit):</strong>{' '}
                        {record.visitasDomiciliarias[0].cuidadorEvaluacion
                          .nombreCuidador || 'Familiar'}{' '}
                        —{' '}
                        {
                          record.visitasDomiciliarias[0].cuidadorEvaluacion
                            .escalaZaritNivel
                        }
                      </p>
                      <p>
                        <strong>Inspección Ambiental y Vectores:</strong>{' '}
                        Vectores:{' '}
                        {
                          record.visitasDomiciliarias[0].inspeccionAmbiental
                            .criaderosVectoresDengue
                        }{' '}
                        · Fármacos:{' '}
                        {
                          record.visitasDomiciliarias[0].inspeccionAmbiental
                            .almacenamientoMedicamentosHogar
                        }
                      </p>
                      <p>
                        <strong>Procedimientos y Plan en Casa:</strong>{' '}
                        {record.visitasDomiciliarias[0].procedimientosRealizados.join(
                          '; '
                        ) || 'Evaluación domiciliaria integral'}{' '}
                        —{' '}
                        {
                          record.visitasDomiciliarias[0]
                            .tratamientoIndicacionesDomicilio
                        }
                      </p>
                    </div>
                  </div>
                )}

              {/* Official Physician Signature & Seal Footer */}
              <div className="pt-8 mt-6 border-t border-slate-300 flex items-end justify-between text-xs">
                <div>
                  <p className="text-slate-500">
                    Documento generado electrónicamente en el Sistema Clínico Familia+
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {activeDoctor.unapCenter} · {activeDoctor.consultorio}
                  </p>
                </div>
                <div className="text-center w-64 border-t border-slate-900 pt-2">
                  <p className="font-extrabold text-slate-900">
                    {activeDoctor.name}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {activeDoctor.specialty} · Exequátur {activeDoctor.exequatur}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {activeDoctor.cmd} · Firma y Sello Médico
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
