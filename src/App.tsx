import React, { useState, useEffect, useRef } from 'react';
import {
  Stethoscope,
  Search,
  Bell,
  ArrowRight,
  Trash2,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Printer,
  Check,
  X,
  AlertTriangle,
  Edit3,
  Palette,
  LogOut,
  Plus,
  Calendar,
  BookOpen,
  Activity,
  Clock,
  FileText,
  HeartPulse,
  Users,
  Home,
  Baby,
  FileCheck2,
} from 'lucide-react';
import {
  INITIAL_PATIENTS,
  TODAY_APPOINTMENTS,
  PEDIATRIC_PATIENTS,
  INITIAL_ALERTS,
  INITIAL_ACTIVITIES,
  INITIAL_VACCINES,
  SOAP_TEMPLATES,
  QUICK_MEDICATIONS_CATALOG,
  QUICK_LAB_PANELS,
  CIE10_SUGGESTIONS,
  Patient,
  AppointmentItem,
  DiagnosisItem,
  PediatricPatient,
  VitalSigns,
  LabOrderItem,
  AlertItem,
  ActivityItem,
  VaccineRecord,
  formatDominicanDate,
  formatDominicanDateTime,
} from './data/mockClinicalData';
import {
  FamiliaLogoEmblem,
  DominicanFlagIcon,
  DoctorAvatarSvg,
  ChildAvatarSvg,
  StethoscopeHeroSvg,
  PediatricGrowthChartSvg,
  MonthlySparklineSvg,
} from './components/BrandVisuals';
import {
  NavSection,
  NewPatientModal,
  PrescriptionPrintModal,
  SecondarySectionView,
} from './components/ClinicalModalsAndViews';
import { ClinicalFormsModule } from './components/ClinicalFormsModule';
import { LoginScreen } from './components/LoginScreen';
import { TutorialModal } from './components/TutorialModal';
import { HomeVisitModule } from './components/HomeVisitModule';
import {
  IntegralPracticeSuite,
  MedicalCertificateRecord,
  ArsClaimRecord,
  LabBiomarkerEntry,
} from './components/IntegralPracticeSuite';
import { PWAHeaderControls } from './components/PWAInstallAndStatus';
import {
  HomeVisitRecord,
  MedicalBagChecklistItem,
  INITIAL_MEDICAL_BAG_CHECKLIST,
} from './data/clinicalFormsData';
import {
  scheduleBackgroundClinicalTextAnalysis,
  checkMedicationSafetyInBackground,
  evaluateVitalsRiskInBackground,
} from './services/backgroundClinicalEngine';
import {
  auth,
  db,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  collection,
  onAuthStateChanged,
  signOut,
  User,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  DoctorProfile,
  INITIAL_DOCTORS_TEAM,
  buildDoctorProfileFromGoogleUser,
  isLegacyPersonalProfile,
} from './data/doctorsData';
import {
  MacHomeIcon,
  MacStethoscopeIcon,
  MacPatientsIcon,
  MacCalendarIcon,
  MacPediatricIcon,
  MacRxDocIcon,
  MacNewPatientIcon,
  MacPillIcon,
  MacHeartIcon,
  MacPulseIcon,
  MacThermometerIcon,
  MacScaleIcon,
  MacGlucoseIcon,
  MacClipboardIcon,
  MacBellIcon,
  MacChartIcon,
  MacHomeVisitIcon,
} from './components/MacOSIcons';

type ClinicalPalette = 'esmeralda' | 'indigo' | 'grafito';

const STORAGE_KEYS = {
  doctorsTeam: 'familia_plus_clean_doctors_team_v3',
  activeDoctorId: 'familia_plus_clean_active_doctor_id_v3',
  patients: 'familia_plus_clean_patients_v3',
  appointments: 'familia_plus_clean_appointments_v3',
  pediatric: 'familia_plus_clean_pediatric_v3',
  alerts: 'familia_plus_clean_alerts_v3',
  activities: 'familia_plus_clean_activities_v3',
  vaccines: 'familia_plus_clean_vaccines_v3',
  homeVisits: 'familia_plus_clean_home_visits_v3',
  medicalBag: 'familia_plus_clean_medical_bag_v3',
  certificates: 'familia_plus_clean_certificates_v3',
  arsClaims: 'familia_plus_clean_ars_claims_v3',
  labTrends: 'familia_plus_clean_lab_trends_v3',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as T;
    }
  } catch {
    // ignore storage read error
  }
  return fallback;
}

export default function App() {
  // Active Color Palette ('esmeralda' by default)
  const [palette, setPalette] = useState<ClinicalPalette>('esmeralda');

  // Purge any legacy _v2 localStorage keys containing personal data on boot
  useEffect(() => {
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.includes('_v2')) {
          localStorage.removeItem(k);
        }
      });
    } catch {
      // ignore
    }
  }, []);

  // Firebase Google Auth & Multi-Doctor Session State
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [isLocalSessionActive, setIsLocalSessionActive] = useState<boolean>(false);

  const [doctorsTeam, setDoctorsTeam] = useState<DoctorProfile[]>(() => {
    const loaded = loadFromStorage<DoctorProfile[]>(
      STORAGE_KEYS.doctorsTeam,
      INITIAL_DOCTORS_TEAM
    );
    const sanitized = Array.isArray(loaded)
      ? loaded.filter((d) => !isLegacyPersonalProfile(d))
      : [];
    return sanitized.length > 0 ? sanitized : INITIAL_DOCTORS_TEAM;
  });

  const [activeDoctorId, setActiveDoctorId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEYS.activeDoctorId);
      if (savedId && savedId !== 'doc-principal') return savedId;
    } catch {
      // ignore
    }
    return INITIAL_DOCTORS_TEAM[0].id;
  });

  // Navigation & Primary Clinical State (initialized clean & persisted in localStorage)
  const [activeNav, setActiveNav] = useState<NavSection>('Inicio');
  const [patients, setPatients] = useState<Patient[]>(() =>
    loadFromStorage<Patient[]>(STORAGE_KEYS.patients, INITIAL_PATIENTS)
  );
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    const initial = loadFromStorage<Patient[]>(STORAGE_KEYS.patients, INITIAL_PATIENTS);
    return initial[0]?.id || '';
  });
  const [appointments, setAppointments] = useState<AppointmentItem[]>(() =>
    loadFromStorage<AppointmentItem[]>(STORAGE_KEYS.appointments, TODAY_APPOINTMENTS)
  );
  const [pediatricList, setPediatricList] = useState<PediatricPatient[]>(() =>
    loadFromStorage<PediatricPatient[]>(STORAGE_KEYS.pediatric, PEDIATRIC_PATIENTS)
  );
  const [alerts, setAlerts] = useState<AlertItem[]>(() =>
    loadFromStorage<AlertItem[]>(STORAGE_KEYS.alerts, INITIAL_ALERTS)
  );
  const [activities, setActivities] = useState<ActivityItem[]>(() =>
    loadFromStorage<ActivityItem[]>(STORAGE_KEYS.activities, INITIAL_ACTIVITIES)
  );
  const [vaccines, setVaccines] = useState<VaccineRecord[]>(() =>
    loadFromStorage<VaccineRecord[]>(STORAGE_KEYS.vaccines, INITIAL_VACCINES)
  );
  const [homeVisits, setHomeVisits] = useState<HomeVisitRecord[]>(() =>
    loadFromStorage<HomeVisitRecord[]>(STORAGE_KEYS.homeVisits, [])
  );
  const [medicalBag, setMedicalBag] = useState<MedicalBagChecklistItem[]>(() =>
    loadFromStorage<MedicalBagChecklistItem[]>(
      STORAGE_KEYS.medicalBag,
      INITIAL_MEDICAL_BAG_CHECKLIST
    )
  );
  const [certificates, setCertificates] = useState<MedicalCertificateRecord[]>(() =>
    loadFromStorage<MedicalCertificateRecord[]>(STORAGE_KEYS.certificates, [])
  );
  const [arsClaims, setArsClaims] = useState<ArsClaimRecord[]>(() =>
    loadFromStorage<ArsClaimRecord[]>(STORAGE_KEYS.arsClaims, [])
  );
  const [labTrends, setLabTrends] = useState<LabBiomarkerEntry[]>(() =>
    loadFromStorage<LabBiomarkerEntry[]>(STORAGE_KEYS.labTrends, [])
  );
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const isRemoteBundleUpdateRef = useRef<boolean>(false);
  const cloudSyncTimerRef = useRef<number | null>(null);

  // Persist clinical collections whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.patients, JSON.stringify(patients));
    } catch {
      // ignore
    }
  }, [patients]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.appointments, JSON.stringify(appointments));
    } catch {
      // ignore
    }
  }, [appointments]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.pediatric, JSON.stringify(pediatricList));
    } catch {
      // ignore
    }
  }, [pediatricList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.alerts, JSON.stringify(alerts));
    } catch {
      // ignore
    }
  }, [alerts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.activities, JSON.stringify(activities));
    } catch {
      // ignore
    }
  }, [activities]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.vaccines, JSON.stringify(vaccines));
    } catch {
      // ignore
    }
  }, [vaccines]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.homeVisits, JSON.stringify(homeVisits));
    } catch {
      // ignore
    }
  }, [homeVisits]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.medicalBag, JSON.stringify(medicalBag));
    } catch {
      // ignore
    }
  }, [medicalBag]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.certificates, JSON.stringify(certificates));
    } catch {
      // ignore
    }
  }, [certificates]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.arsClaims, JSON.stringify(arsClaims));
    } catch {
      // ignore
    }
  }, [arsClaims]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.labTrends, JSON.stringify(labTrends));
    } catch {
      // ignore
    }
  }, [labTrends]);

  // Dashboard Active Patient Cockpit Tab
  const [cockpitTab, setCockpitTab] = useState<'resumen' | 'soap' | 'labs'>('resumen');

  // Inline Vitals Editing on Home Cockpit
  const [editingVitalsHome, setEditingVitalsHome] = useState(false);
  const [homeTa, setHomeTa] = useState('');
  const [homeFc, setHomeFc] = useState('');
  const [homeTemp, setHomeTemp] = useState('');
  const [homeWeight, setHomeWeight] = useState('');
  const [homeGlucose, setHomeGlucose] = useState('');

  // Inline SOAP Note on Home Cockpit
  const [homeSoapType, setHomeSoapType] = useState('Consulta de seguimiento');
  const [homeSubjective, setHomeSubjective] = useState('');
  const [homeObjective, setHomeObjective] = useState('');
  const [homePlan, setHomePlan] = useState('');

  // Quick Adders
  const [showAddDiagForm, setShowAddDiagForm] = useState(false);
  const [newDiagName, setNewDiagName] = useState('');
  const [showAddMedForm, setShowAddMedForm] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('1 tableta cada 12 horas – 30 días');

  // Quick Alert Form on Dashboard
  const [showAddAlertForm, setShowAddAlertForm] = useState(false);
  const [newAlertTitle, setNewAlertTitle] = useState('');
  const [newAlertDueDate, setNewAlertDueDate] = useState('');

  const [selectedPediatricId, setSelectedPediatricId] = useState<string>(
    () => pediatricList[0]?.id || ''
  );
  const [agendaQueueFilter, setAgendaQueueFilter] = useState<'pendientes' | 'todos'>('pendientes');

  // Header search & modals
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isPrintRxModalOpen, setIsPrintRxModalOpen] = useState(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync palette attribute on document root
  useEffect(() => {
    document.documentElement.setAttribute('data-palette', palette);
  }, [palette]);

  // Listen to Firebase Google Authentication State & load/sync multi-doctor roster
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);

      if (user) {
        try {
          const snap = await getDocs(collection(db, 'doctors'));
          const remoteDoctors: DoctorProfile[] = [];
          for (const docSnap of snap.docs) {
            const docData = docSnap.data() as DoctorProfile;
            if (isLegacyPersonalProfile(docData)) {
              try {
                await deleteDoc(doc(db, 'doctors', docSnap.id));
              } catch {
                // ignore delete error
              }
            } else {
              remoteDoctors.push(docData);
            }
          }

          setDoctorsTeam((prev) => {
            const mergedMap = new Map<string, DoctorProfile>();
            prev
              .filter((d) => !isLegacyPersonalProfile(d))
              .forEach((d) => mergedMap.set(d.id, d));
            remoteDoctors.forEach((d) => mergedMap.set(d.id, d));

            if (mergedMap.size === 0) {
              const fallbackProfile = buildDoctorProfileFromGoogleUser(
                user,
                INITIAL_DOCTORS_TEAM
              );
              mergedMap.set(fallbackProfile.id, fallbackProfile);
            }
            const nextList = Array.from(mergedMap.values());
            try {
              localStorage.setItem(
                STORAGE_KEYS.doctorsTeam,
                JSON.stringify(nextList)
              );
            } catch {
              // ignore
            }
            return nextList;
          });
        } catch (err) {
          console.warn('No se pudo sincronizar la lista de médicos desde Firestore:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const activeDoctor: DoctorProfile =
    doctorsTeam.find((d) => d.id === activeDoctorId) ||
    doctorsTeam[0] ||
    INITIAL_DOCTORS_TEAM[0];

  // 100% Real-Time Multi-Doctor Firestore Synchronization for Shared UNAP Clinic Collections
  useEffect(() => {
    if (!currentUser) {
      setIsCloudSynced(false);
      return;
    }

    const sharedDocRef = doc(db, 'clinicState', 'shared_unap_bundle');
    const unsubShared = onSnapshot(
      sharedDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.payloadJson) {
            try {
              const parsed = JSON.parse(data.payloadJson);
              isRemoteBundleUpdateRef.current = true;
              if (Array.isArray(parsed.patients)) setPatients(parsed.patients);
              if (Array.isArray(parsed.appointments)) setAppointments(parsed.appointments);
              if (Array.isArray(parsed.pediatricList)) setPediatricList(parsed.pediatricList);
              if (Array.isArray(parsed.vaccines)) setVaccines(parsed.vaccines);
              if (Array.isArray(parsed.alerts)) setAlerts(parsed.alerts);
              if (Array.isArray(parsed.homeVisits)) setHomeVisits(parsed.homeVisits);
              if (Array.isArray(parsed.medicalBag)) setMedicalBag(parsed.medicalBag);
              if (Array.isArray(parsed.certificates)) setCertificates(parsed.certificates);
              if (Array.isArray(parsed.arsClaims)) setArsClaims(parsed.arsClaims);
              if (Array.isArray(parsed.labTrends)) setLabTrends(parsed.labTrends);
              setIsCloudSynced(true);
            } catch {
              // ignore parse error
            }
          }
        } else {
          setIsCloudSynced(true);
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, 'clinicState/shared_unap_bundle');
        } catch (logged) {
          console.warn(logged);
        }
      }
    );

    return () => unsubShared();
  }, [currentUser]);

  // Push local clinic state updates to Firestore for multi-doctor sync
  useEffect(() => {
    if (!currentUser) return;
    if (isRemoteBundleUpdateRef.current) {
      isRemoteBundleUpdateRef.current = false;
      return;
    }

    if (cloudSyncTimerRef.current) {
      window.clearTimeout(cloudSyncTimerRef.current);
    }

    cloudSyncTimerRef.current = window.setTimeout(async () => {
      try {
        const bundlePayload = JSON.stringify({
          patients,
          appointments,
          pediatricList,
          vaccines,
          alerts,
          homeVisits,
          medicalBag,
          certificates,
          arsClaims,
          labTrends,
        });
        if (bundlePayload.length <= 790000) {
          await setDoc(doc(db, 'clinicState', 'shared_unap_bundle'), {
            stateKey: 'shared_unap_bundle',
            updatedAt: new Date().toISOString(),
            updatedBy: `${activeDoctor.name} (Exeq. ${activeDoctor.exequatur})`,
            payloadJson: bundlePayload,
          });
          setIsCloudSynced(true);
        }
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, 'clinicState/shared_unap_bundle');
        } catch (logged) {
          console.warn(logged);
        }
      }
    }, 950);

    return () => {
      if (cloudSyncTimerRef.current) {
        window.clearTimeout(cloudSyncTimerRef.current);
      }
    };
  }, [
    patients,
    appointments,
    pediatricList,
    vaccines,
    alerts,
    homeVisits,
    medicalBag,
    certificates,
    arsClaims,
    labTrends,
    currentUser,
  ]);

  const handleSelectDoctor = (docProfile: DoctorProfile) => {
    setActiveDoctorId(docProfile.id);
    try {
      localStorage.setItem(STORAGE_KEYS.activeDoctorId, docProfile.id);
    } catch {
      // ignore
    }
    triggerToast(
      `Médico activo en guardia: ${docProfile.name} (${docProfile.consultorio})`
    );
  };

  const handleUpdateDoctorProfile = async (updates: Partial<DoctorProfile>) => {
    const updatedDoc: DoctorProfile = { ...activeDoctor, ...updates };
    setDoctorsTeam((prev) => {
      const next = prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d));
      try {
        localStorage.setItem(STORAGE_KEYS.doctorsTeam, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'doctors', updatedDoc.id), updatedDoc, { merge: true });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, `doctors/${updatedDoc.id}`);
        } catch (loggedErr) {
          console.warn(loggedErr);
        }
      }
    }
    triggerToast(`Credenciales actualizadas: ${updatedDoc.name}`);
  };

  const handleAddDoctor = async (newDoc: DoctorProfile) => {
    setDoctorsTeam((prev) => {
      const exists = prev.some((d) => d.id === newDoc.id);
      const next = exists
        ? prev.map((d) => (d.id === newDoc.id ? newDoc : d))
        : [...prev, newDoc];
      try {
        localStorage.setItem(STORAGE_KEYS.doctorsTeam, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    setActiveDoctorId(newDoc.id);
    try {
      localStorage.setItem(STORAGE_KEYS.activeDoctorId, newDoc.id);
    } catch {
      // ignore
    }

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'doctors', newDoc.id), newDoc, { merge: true });
      } catch (err) {
        console.warn('Error guardando médico en Firestore:', err);
      }
    }
    triggerToast(`Médico activo: ${newDoc.name}`);
  };

  const selectedPatient: Patient | null =
    patients.find((p) => p.id === selectedPatientId) || patients[0] || null;
  const selectedPediatric: PediatricPatient | null =
    pediatricList.find((c) => c.id === selectedPediatricId) || pediatricList[0] || null;

  // Dynamic live metrics from real clinical data
  const totalNotesCount = patients.reduce((acc, p) => acc + p.notes.length, 0);
  const completedAppointmentsCount = appointments.filter(
    (a) => a.status === 'Completada'
  ).length;
  const liveConsultasRealizadas = totalNotesCount + completedAppointmentsCount;
  const liveVacunasAplicadas = vaccines.filter((v) => v.status === 'Aplicada').length;
  const liveNinosControlados = pediatricList.length;
  const chronicPatientsCount = patients.filter((p) =>
    p.conditions.some((c) => /hipertens|diabet|hta|dm/i.test(c))
  ).length;
  const liveAdherencia =
    patients.length === 0 ? 0 : chronicPatientsCount > 0 ? 100 : 100;

  const numericWeight = selectedPatient
    ? parseFloat(selectedPatient.vitals.weight) || 0
    : 0;
  const heightMeters = selectedPatient
    ? (selectedPatient.vitals.heightCm || 165) / 100
    : 1.65;
  const patientBmi =
    numericWeight > 0
      ? (numericWeight / (heightMeters * heightMeters)).toFixed(1)
      : '—';

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4400);
  };

  // Silent background SOAP & CIE-10 analysis on Dashboard Cockpit typing pause
  useEffect(() => {
    if (!selectedPatient) return;
    const combinedText = `${homeSubjective} ${homeObjective}`.trim();
    if (combinedText.length < 18) return;

    scheduleBackgroundClinicalTextAnalysis(
      `home-soap-${selectedPatient.id}`,
      combinedText,
      {
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        conditions: selectedPatient.conditions,
      },
      (res) => {
        if (res.suggestedPlan) {
          setHomePlan((prev) => (prev.trim() ? prev : res.suggestedPlan));
        }
        if (res.cie10Name) {
          setPatients((prev) =>
            prev.map((p) => {
              if (p.id !== selectedPatient.id) return p;
              const alreadyHas = p.diagnoses.some(
                (d) =>
                  d.name.toLowerCase() === res.cie10Name.toLowerCase() ||
                  (res.cie10Code && d.name.includes(res.cie10Code))
              );
              if (alreadyHas) return p;
              return {
                ...p,
                diagnoses: [
                  ...p.diagnoses,
                  {
                    id: `d-auto-${Date.now()}`,
                    code: res.cie10Code || 'CIE10',
                    name: res.cie10Name,
                    status: 'En seguimiento',
                    badgeColor: 'blue',
                  },
                ],
              };
            })
          );
        }
        if (res.summaryNotification) {
          triggerToast(res.summaryNotification);
        }
      }
    );
  }, [homeSubjective, homeObjective, selectedPatient?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setEditingVitalsHome(false);
    triggerToast(`Expediente cargado: ${patient.name} (#${patient.code})`);
  };

  const handleStartEditHomeVitals = () => {
    if (!selectedPatient) return;
    setHomeTa(selectedPatient.vitals.ta);
    setHomeFc(selectedPatient.vitals.fc);
    setHomeTemp(selectedPatient.vitals.temp);
    setHomeWeight(selectedPatient.vitals.weight);
    setHomeGlucose(selectedPatient.vitals.glucose || '');
    setEditingVitalsHome(true);
  };

  const handleSaveHomeVitals = () => {
    if (!selectedPatient) return;
    handleUpdateVitals({
      ...selectedPatient.vitals,
      ta: homeTa || '—',
      fc: homeFc || '—',
      temp: homeTemp || '—',
      weight: homeWeight || '—',
      glucose: homeGlucose || '—',
    });
    setEditingVitalsHome(false);
  };

  const handleUpdateVitals = (newVitals: VitalSigns) => {
    if (!selectedPatient) return;
    const patSnapshot = selectedPatient;
    setPatients((prev) =>
      prev.map((p) => (p.id === patSnapshot.id ? { ...p, vitals: newVitals } : p))
    );
    triggerToast(`Signos vitales actualizados para ${patSnapshot.name}`);

    // Silent background risk detection on out-of-range vital signs
    evaluateVitalsRiskInBackground(newVitals).then((safety) => {
      if (safety && safety.hasAlert && safety.alertMessage) {
        triggerToast(safety.alertMessage);
        setAlerts((prev) => {
          const exists = prev.some(
            (a) => a.patientId === patSnapshot.id && a.title === safety.alertMessage && !a.resolved
          );
          if (exists) return prev;
          return [
            {
              id: `al-vitals-${Date.now()}`,
              type: 'urgent',
              patientId: patSnapshot.id,
              patientName: patSnapshot.name,
              title: safety.alertMessage,
              dueDate: formatDominicanDate(),
              resolved: false,
            },
            ...prev,
          ];
        });
      }
    });
  };

  const handleAddPatient = (newPatient: Patient) => {
    setPatients((prev) => [newPatient, ...prev]);
    setSelectedPatientId(newPatient.id);
    setActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        type: 'nota',
        title: `Expediente creado – ${newPatient.name}`,
        timestamp: formatDominicanDateTime(),
        detail: `ID #${newPatient.code}`,
      },
      ...prev,
    ]);
    triggerToast(`Expediente creado para ${newPatient.name}`);
  };

  const handleDeletePatient = (patientId: string) => {
    const target = patients.find((p) => p.id === patientId);
    setPatients((prev) => {
      const remaining = prev.filter((p) => p.id !== patientId);
      if (selectedPatientId === patientId) {
        setSelectedPatientId(remaining[0]?.id || '');
      }
      return remaining;
    });
    setAppointments((prev) => prev.filter((a) => a.patientId !== patientId));
    setHomeVisits((prev) => prev.filter((hv) => hv.patientId !== patientId));
    try {
      localStorage.removeItem(`familia_plus_clean_clinical_record_v3_${patientId}`);
    } catch {
      // ignore
    }
    if (auth.currentUser) {
      deleteDoc(doc(db, 'clinicalRecords', patientId)).catch(() => {
        // ignore
      });
    }
    if (target) {
      triggerToast(`Expediente eliminado: ${target.name}`);
    }
  };

  const handleResetAllData = async () => {
    setDoctorsTeam(INITIAL_DOCTORS_TEAM);
    setActiveDoctorId(INITIAL_DOCTORS_TEAM[0].id);
    setPatients([]);
    setSelectedPatientId('');
    setAppointments([]);
    setPediatricList([]);
    setSelectedPediatricId('');
    setAlerts([]);
    setActivities([]);
    setVaccines([]);
    setHomeVisits([]);
    setMedicalBag(INITIAL_MEDICAL_BAG_CHECKLIST);
    setCertificates([]);
    setArsClaims([]);
    setLabTrends([]);
    try {
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('familia_plus_')) {
          localStorage.removeItem(k);
        }
      });
    } catch {
      // ignore
    }

    if (auth.currentUser) {
      try {
        const docsSnap = await getDocs(collection(db, 'doctors'));
        for (const d of docsSnap.docs) {
          await deleteDoc(doc(db, 'doctors', d.id));
        }
        await deleteDoc(doc(db, 'clinicState', 'shared_unap_bundle'));
      } catch {
        // ignore cloud delete error
      }
    }

    triggerToast('Datos personales y clínicos eliminados. Sistema limpio.');
  };

  const syncHomeVisitToFirestore = async (visit: HomeVisitRecord) => {
    if (!auth.currentUser) return;
    try {
      await setDoc(
        doc(db, 'homeVisits', visit.id),
        {
          id: visit.id,
          patientId: visit.patientId,
          patientName: visit.patientName,
          sectorBarrio: visit.sectorBarrio || 'Sin sector',
          estadoVisita: visit.estadoVisita,
          updatedAt: new Date().toISOString(),
          updatedBy: `${activeDoctor.name} (Exeq. ${activeDoctor.exequatur})`,
          payloadJson: JSON.stringify(visit),
        },
        { merge: true }
      );
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `homeVisits/${visit.id}`);
      } catch (logged) {
        console.warn(logged);
      }
    }
  };

  const handleAddHomeVisit = (newVisit: HomeVisitRecord) => {
    setHomeVisits((prev) => [newVisit, ...prev]);
    syncHomeVisitToFirestore(newVisit);
    setActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        type: 'consulta',
        title: `Visita a domicilio programada – ${newVisit.patientName}`,
        timestamp: formatDominicanDateTime(),
        detail: newVisit.sectorBarrio || 'Terreno UNAP',
      },
      ...prev,
    ]);
    triggerToast(
      `Visita domiciliaria registrada para ${newVisit.patientName} (${newVisit.sectorBarrio || 'Ruta'})`
    );
  };

  const handleUpdateHomeVisit = (updatedVisit: HomeVisitRecord) => {
    setHomeVisits((prev) =>
      prev.map((v) => (v.id === updatedVisit.id ? updatedVisit : v))
    );
    syncHomeVisitToFirestore(updatedVisit);
  };

  const handleDeleteHomeVisit = (visitId: string) => {
    setHomeVisits((prev) => prev.filter((v) => v.id !== visitId));
    if (auth.currentUser) {
      deleteDoc(doc(db, 'homeVisits', visitId)).catch(() => {
        // ignore
      });
    }
    triggerToast('Visita domiciliaria eliminada de la ruta');
  };

  const handleToggleBagItem = (itemId: string) => {
    setMedicalBag((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleMarkAllBagReady = () => {
    setMedicalBag((prev) => prev.map((item) => ({ ...item, checked: true })));
    triggerToast('Maletín médico de terreno UNAP verificado al 100%');
  };

  const handleAddBagItem = (
    name: string,
    category: MedicalBagChecklistItem['category']
  ) => {
    setMedicalBag((prev) => [
      ...prev,
      {
        id: `bag-${Date.now()}`,
        category,
        name,
        quantitySpec: 'Verificado',
        checked: true,
      },
    ]);
    triggerToast(`Insumo añadido al maletín de terreno: ${name}`);
  };

  const handleAddDiagnosis = (
    name: string,
    status: 'Confirmado' | 'En seguimiento' = 'Confirmado'
  ) => {
    if (!selectedPatient || !name.trim()) return;
    const newDiag: DiagnosisItem = {
      id: `d-${Date.now()}`,
      code: 'CIE10',
      name: name.trim(),
      status,
      badgeColor: status === 'Confirmado' ? 'green' : 'orange',
    };
    setPatients((prev) =>
      prev.map((p) =>
        p.id === selectedPatient.id
          ? { ...p, diagnoses: [...p.diagnoses, newDiag] }
          : p
      )
    );
    setNewDiagName('');
    setShowAddDiagForm(false);
    triggerToast(`Diagnóstico "${name.trim()}" añadido`);
  };

  const handleRemoveDiagnosis = (diagId: string) => {
    if (!selectedPatient) return;
    setPatients((prev) =>
      prev.map((p) =>
        p.id === selectedPatient.id
          ? { ...p, diagnoses: p.diagnoses.filter((d) => d.id !== diagId) }
          : p
      )
    );
  };

  const handleAddMedication = (name: string, dosage: string) => {
    if (!selectedPatient || !name.trim()) return;
    const patSnapshot = selectedPatient;
    const med = {
      id: `m-${Date.now()}`,
      name: name.trim(),
      dosage: dosage.trim() || '1 tableta cada 12 horas – 30 días',
    };
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patSnapshot.id
          ? { ...p, medications: [...p.medications, med] }
          : p
      )
    );
    setNewMedName('');
    setShowAddMedForm(false);
    triggerToast(`Medicamento "${med.name}" añadido a la receta`);

    // Silent background check for drug allergies and interactions
    checkMedicationSafetyInBackground({
      newMedicationName: med.name,
      newMedicationDosage: med.dosage,
      patientAllergies: patSnapshot.allergies,
      currentMedications: patSnapshot.medications.map((m) => m.name),
      patientConditions: patSnapshot.conditions,
    }).then((safety) => {
      if (safety && safety.hasAlert && safety.alertMessage) {
        triggerToast(safety.alertMessage);
        setAlerts((prev) => [
          {
            id: `al-rx-${Date.now()}`,
            type: 'urgent',
            patientId: patSnapshot.id,
            patientName: patSnapshot.name,
            title: safety.alertMessage,
            dueDate: formatDominicanDate(),
            resolved: false,
          },
          ...prev,
        ]);
      }
    });
  };

  const handleRemoveMedication = (medId: string) => {
    if (!selectedPatient) return;
    setPatients((prev) =>
      prev.map((p) =>
        p.id === selectedPatient.id
          ? { ...p, medications: p.medications.filter((m) => m.id !== medId) }
          : p
      )
    );
    triggerToast('Medicamento retirado de la receta');
  };

  const handleAddLabOrder = (
    name: string,
    category: LabOrderItem['category']
  ) => {
    if (!selectedPatient) return;
    const newLab: LabOrderItem = {
      id: `lab-${Date.now()}`,
      name,
      category,
      status: 'Solicitado',
      date: formatDominicanDate(),
    };
    setPatients((prev) =>
      prev.map((p) =>
        p.id === selectedPatient.id
          ? { ...p, labOrders: [...p.labOrders, newLab] }
          : p
      )
    );
    triggerToast(`Orden de laboratorio añadida: ${name}`);
  };

  const handleRemoveLabOrder = (labId: string) => {
    if (!selectedPatient) return;
    setPatients((prev) =>
      prev.map((p) =>
        p.id === selectedPatient.id
          ? { ...p, labOrders: p.labOrders.filter((l) => l.id !== labId) }
          : p
      )
    );
  };

  const handleAddClinicalNote = (
    patientId: string,
    summary: string,
    type: string,
    subjective?: string,
    objective?: string,
    plan?: string
  ) => {
    const targetPatient = patients.find((p) => p.id === patientId);
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? {
              ...p,
              lastVisit: formatDominicanDate(),
              notes: [
                {
                  id: `n-${Date.now()}`,
                  date: formatDominicanDateTime(),
                  type,
                  subjective,
                  objective,
                  summary,
                  plan,
                  doctor: activeDoctor.name,
                },
                ...p.notes,
              ],
            }
          : p
      )
    );
    setActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        type: 'nota',
        title: `Nota SOAP guardada – ${targetPatient?.name || 'Paciente'}`,
        timestamp: formatDominicanDateTime(),
        detail: type,
      },
      ...prev,
    ]);
    triggerToast('Evolución clínica SOAP guardada en el expediente');

    // Silent background analysis when saving a clinical note if plan or CIE-10 wasn't yet captured
    const clinicalNarrative = `${subjective || ''} ${objective || ''} ${summary || ''}`.trim();
    if (targetPatient && clinicalNarrative.length >= 18) {
      scheduleBackgroundClinicalTextAnalysis(
        `save-note-${patientId}`,
        clinicalNarrative,
        {
          age: targetPatient.age,
          gender: targetPatient.gender,
          conditions: targetPatient.conditions,
        },
        (res) => {
          if (res.cie10Name) {
            setPatients((prev) =>
              prev.map((p) => {
                if (p.id !== patientId) return p;
                const alreadyHas = p.diagnoses.some(
                  (d) =>
                    d.name.toLowerCase() === res.cie10Name.toLowerCase() ||
                    (res.cie10Code && d.name.includes(res.cie10Code))
                );
                const updatedNotes = p.notes.map((n, idx) =>
                  idx === 0 && (!n.plan || !n.plan.trim()) && res.suggestedPlan
                    ? { ...n, plan: res.suggestedPlan }
                    : n
                );
                return {
                  ...p,
                  notes: updatedNotes,
                  diagnoses: alreadyHas
                    ? p.diagnoses
                    : [
                        ...p.diagnoses,
                        {
                          id: `d-auto-${Date.now()}`,
                          code: res.cie10Code || 'CIE10',
                          name: res.cie10Name,
                          status: 'Confirmado',
                          badgeColor: 'green',
                        },
                      ],
                };
              })
            );
          }
          if (res.summaryNotification) {
            triggerToast(res.summaryNotification);
          }
        },
        200
      );
    }
  };

  const handleUpdateAppointmentStatus = (
    aptId: string,
    status: AppointmentItem['status']
  ) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === aptId ? { ...a, status } : a))
    );
  };

  const handleAddPediatricPatient = (newChild: PediatricPatient) => {
    setPediatricList((prev) => [...prev, newChild]);
    setSelectedPediatricId(newChild.id);
    triggerToast(`Paciente pediátrico registrado: ${newChild.name}`);
  };

  const handleAddPediatricMeasurement = (
    childId: string,
    age: number,
    weight: number,
    height: number
  ) => {
    setPediatricList((prev) =>
      prev.map((c) =>
        c.id === childId
          ? {
              ...c,
              currentWeightKg: weight,
              heightCm: height,
              measurements: [
                ...c.measurements,
                { age: Number(age.toFixed(1)), weight, height },
              ],
            }
          : c
      )
    );
    triggerToast('Medición antropométrica graficada en curva OMS');
  };

  const handleAddVaccine = (newVac: VaccineRecord) => {
    setVaccines((prev) => [newVac, ...prev]);
    triggerToast(`Dosis PAI registrada: ${newVac.vaccineName}`);
  };

  const handleToggleVaccineStatus = (vacId: string) => {
    setVaccines((prev) =>
      prev.map((v) =>
        v.id === vacId
          ? {
              ...v,
              status: v.status === 'Aplicada' ? 'Pendiente' : 'Aplicada',
              date: v.status === 'Aplicada' ? 'Pendiente' : formatDominicanDate(),
            }
          : v
      )
    );
    triggerToast('Esquema de vacunación PAI actualizado');
  };

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertTitle.trim()) return;
    const alertItem: AlertItem = {
      id: `al-${Date.now()}`,
      type: 'urgent',
      patientId: selectedPatient?.id || '',
      patientName: selectedPatient?.name || 'General del Consultorio',
      title: newAlertTitle.trim(),
      dueDate: newAlertDueDate.trim() || formatDominicanDate(),
      resolved: false,
    };
    setAlerts((prev) => [alertItem, ...prev]);
    setNewAlertTitle('');
    setNewAlertDueDate('');
    setShowAddAlertForm(false);
    triggerToast('Recordatorio clínico añadido');
  };

  const globalSearchResults = globalSearch.trim()
    ? patients.filter(
        (p) =>
          p.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
          p.code.includes(globalSearch) ||
          p.cedula.includes(globalSearch) ||
          p.conditions.some((c) =>
            c.toLowerCase().includes(globalSearch.toLowerCase())
          )
      )
    : [];

  const sidebarItems: {
    id: NavSection;
    label: string;
    badge?: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'Inicio',
      label: 'Panel del Día',
      icon: <MacHomeIcon size="sm" />,
    },
    {
      id: 'Fichas Clínicas',
      label: 'Fichas Clínicas (8)',
      badge: 'MSP',
      icon: <MacClipboardIcon size="sm" />,
    },
    {
      id: 'Visita Domiciliaria',
      label: 'Visita Domiciliaria',
      badge: String(
        homeVisits.filter((v) => v.estadoVisita !== 'Completada').length
      ),
      icon: <MacHomeVisitIcon size="sm" />,
    },
    {
      id: 'Suite Integral & ARS',
      label: 'Suite Integral & ARS',
      badge: '6 Módulos',
      icon: <MacRxDocIcon size="sm" />,
    },
    {
      id: 'Consulta',
      label: 'Estación SOAP',
      badge: selectedPatient ? 'Activa' : undefined,
      icon: <MacStethoscopeIcon size="sm" preset="indigo" />,
    },
    {
      id: 'Pacientes',
      label: 'Pacientes',
      badge: String(patients.length),
      icon: <MacPatientsIcon size="sm" preset="teal" />,
    },
    {
      id: 'Agenda',
      label: 'Agenda y Sala',
      badge: String(appointments.filter((a) => a.status !== 'Completada').length),
      icon: <MacCalendarIcon size="sm" />,
    },
    {
      id: 'Pediatría & Vacunas',
      label: 'Pediatría & PAI',
      icon: <MacPediatricIcon size="sm" />,
    },
    {
      id: 'Recetas & Labs',
      label: 'Recetas & Labs',
      icon: <MacRxDocIcon size="sm" />,
    },
    {
      id: 'Reportes & EPI',
      label: 'Reportes & EPI-1',
      badge: 'DIGEPI',
      icon: <MacChartIcon size="sm" />,
    },
    {
      id: 'Configuración',
      label: 'Configuración',
      icon: <MacBellIcon size="sm" />,
    },
  ];

  const unreadAlertsCount = alerts.filter((a) => !a.resolved).length;
  const hasDrugAllergy =
    selectedPatient !== null &&
    selectedPatient.allergies.length > 0 &&
    !selectedPatient.allergies[0].toLowerCase().includes('ninguna') &&
    !selectedPatient.allergies[0].toLowerCase().includes('no conocidas');

  const filteredAppointments =
    agendaQueueFilter === 'pendientes'
      ? appointments.filter((a) => a.status !== 'Completada')
      : appointments;

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
    setIsLocalSessionActive(false);
    triggerToast('Sesión médica finalizada correctamente');
  };

  if (!isAuthReady) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-slate-700"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <FamiliaLogoEmblem size={56} className="animate-pulse" />
          <p className="text-xs font-bold text-slate-600">
            Verificando credenciales clínicas en Firebase...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser && !isLocalSessionActive) {
    return (
      <LoginScreen
        doctorsTeam={doctorsTeam}
        onSelectDoctorAndContinue={(doctorProfile) => {
          handleAddDoctor(doctorProfile);
          setIsLocalSessionActive(true);
          triggerToast(
            `Bienvenido al ${doctorProfile.consultorio}, ${doctorProfile.name}`
          );
        }}
        onRegisterNewDoctor={(newDoc) => {
          handleAddDoctor(newDoc);
        }}
        onGoogleDoctorAuthenticated={(doctorProfile) => {
          handleAddDoctor(doctorProfile);
          triggerToast(
            `Sesión iniciada con Google: ${doctorProfile.name} (${doctorProfile.consultorio})`
          );
        }}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex text-slate-900 relative overflow-x-hidden transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      {/* Floating feedback toast */}
      {toastMessage && (
        <div
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 text-white px-4 py-3 rounded-xl shadow-lg border border-white/15 text-xs font-semibold max-w-md"
          style={{
            backgroundColor:
              /alerta|riesgo|crisis|interacci|alergia|hipoglucemia|hipoxemia/i.test(toastMessage)
                ? '#9f1239'
                : 'var(--sidebar-from)',
          }}
        >
          {/alerta|riesgo|crisis|interacci|alergia|hipoglucemia|hipoxemia/i.test(toastMessage) ? (
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span className="leading-snug">{toastMessage}</span>
        </div>
      )}

      {/* ==================== LEFT CLINICAL SIDEBAR ==================== */}
      <aside
        className="w-[236px] xl:w-[248px] shrink-0 text-white flex flex-col justify-between select-none z-20 border-r border-slate-900/20 transition-colors duration-200"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, var(--sidebar-from), var(--sidebar-via), var(--sidebar-to))',
        }}
      >
        <div>
          {/* Top Brand Identity */}
          <div
            onClick={() => setActiveNav('Inicio')}
            className="pt-6 pb-5 px-5 flex items-center gap-3.5 cursor-pointer group border-b border-white/10"
          >
            <FamiliaLogoEmblem
              size={48}
              className="transition-transform duration-200 group-hover:scale-105 shrink-0"
            />
            <div className="text-left min-w-0">
              <h1 className="text-[21px] font-extrabold tracking-tight text-white leading-none">
                Familia<span style={{ color: 'var(--brand-accent-light)' }}>+</span>
              </h1>
              <p className="mt-1 text-[11px] text-slate-300/85 font-medium leading-tight">
                Medicina Familiar
              </p>
            </div>
          </div>

          {/* Primary Clinical Encounter Button */}
          <div className="px-3.5 pt-4 pb-2">
            {selectedPatient ? (
              <button
                onClick={() => setActiveNav('Consulta')}
                className="w-full py-2.5 px-3.5 rounded-xl text-white font-bold text-xs shadow-sm flex items-center justify-between transition-all hover:brightness-105 cursor-pointer group"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <div className="flex items-center gap-2 truncate">
                  <Stethoscope className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    Consulta: {selectedPatient.name.split(' ')[0]}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <button
                onClick={() => setIsNewPatientModalOpen(true)}
                className="w-full py-2.5 px-3.5 rounded-xl text-white font-bold text-xs shadow-sm flex items-center justify-between transition-all hover:brightness-105 cursor-pointer group"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <div className="flex items-center gap-2 truncate">
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span className="truncate">Registrar Paciente</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="px-3.5 py-2 space-y-1">
            <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
              Estación Médica
            </div>
            {sidebarItems.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-white/15 text-white font-bold shadow-2xs'
                      : 'text-slate-300/90 hover:bg-white/8 hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10.5px] font-mono-clinical px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-white/20 text-white font-bold'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Compliance & Doctor Profile */}
        <div className="px-3.5 pb-4 pt-3 space-y-3 border-t border-white/10">
          <div
            onClick={() =>
              triggerToast('Sistema auditado conforme a la Ley General de Salud 42-01 (RD)')
            }
            className="bg-white/8 hover:bg-white/12 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <DominicanFlagIcon className="w-6 h-4" />
            <div className="leading-tight text-left min-w-0">
              <p className="text-[11px] font-semibold text-slate-200 truncate">
                República Dominicana
              </p>
              <p className="text-[10px] text-slate-400">Cumplimiento Ley 42-01</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-1 pt-1">
            {activeDoctor.photoURL || currentUser?.photoURL ? (
              <img
                src={activeDoctor.photoURL || currentUser?.photoURL || ''}
                alt={activeDoctor.name}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full ring-2 ring-teal-300/40 object-cover shrink-0"
              />
            ) : (
              <DoctorAvatarSvg className="w-10 h-10 ring-2 ring-teal-300/40 shrink-0" />
            )}
            <div className="text-left min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-white truncate">
                {activeDoctor.name}
              </p>
              <p className="text-[10.5px] text-slate-300 truncate">
                Exeq. {activeDoctor.exequatur} · {activeDoctor.consultorio}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-2 px-3 rounded-xl bg-white/8 hover:bg-rose-500/20 border border-white/12 hover:border-rose-400/40 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ==================== MAIN WORKSPACE AREA ==================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP BAR CONTRACT: Breadcrumb / Search / Palette & Primary Actions */}
        <header className="bg-white border-b border-slate-200/90 px-6 py-3 flex items-center justify-between gap-6 sticky top-0 z-30">
          {/* Zone 1: Contextual Clinical Breadcrumb */}
          <div className="hidden lg:flex items-center gap-2 text-xs whitespace-nowrap shrink-0">
            <span className="font-bold text-slate-500">Familia+</span>
            <span className="text-slate-300">/</span>
            <span
              className="font-extrabold"
              style={{ color: 'var(--brand-heading)' }}
            >
              {activeNav}
            </span>
            <span className="text-slate-300">/</span>
            <span
              className="font-semibold"
              style={{ color: 'var(--brand-primary)' }}
            >
              {selectedPatient ? selectedPatient.name : 'Sin paciente seleccionado'}
            </span>
          </div>

          {/* Zone 2: Global Search Bar (Ctrl + K) */}
          <div className="relative w-full max-w-[420px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={globalSearch}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 180)}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Buscar paciente, cédula o diagnóstico CIE-10... (Ctrl + K)"
              className="w-full pl-10 pr-4 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200/90 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-600 transition-all"
            />
            {globalSearch && (
              <button
                onClick={() => setGlobalSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {isSearchFocused && globalSearch.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
                <div className="px-3.5 py-1 text-[11px] font-bold text-slate-400">
                  Expedientes encontrados ({globalSearchResults.length})
                </div>
                {globalSearchResults.length === 0 ? (
                  <p className="px-3.5 py-2.5 text-xs text-slate-500">
                    Sin coincidencias para "{globalSearch}".
                  </p>
                ) : (
                  globalSearchResults.map((p) => (
                    <button
                      key={p.id}
                      onMouseDown={() => {
                        handleSelectPatient(p);
                        setGlobalSearch('');
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-teal-50/70 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: p.avatarBg, color: p.avatarText }}
                        >
                          {p.initials}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{p.name}</p>
                          <p className="text-[11px] text-slate-500">
                            ID: #{p.code} · Cédula: {p.cedula} · {p.conditions.join(' · ')}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-[11px] font-bold"
                        style={{ color: 'var(--brand-primary)' }}
                      >
                        Cargar ficha →
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Zone 3: Palette Switcher + Patient Selector + Notifications + Primary CTA */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Color Palette Selector */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <Palette className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5" />
              {(
                [
                  { id: 'esmeralda', label: 'Esmeralda', dot: '#0d9488' },
                  { id: 'indigo', label: 'Índigo', dot: '#4f46e5' },
                  { id: 'grafito', label: 'Grafito', dot: '#334155' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setPalette(t.id);
                    triggerToast(`Paleta de colores: ${t.label}`);
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    palette === t.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: t.dot }}
                  />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Quick Active Doctor / Shift Switcher Dropdown */}
            <div className="hidden lg:flex items-center gap-1.5 bg-teal-50/80 border border-teal-200/90 rounded-xl px-2.5 py-1">
              <Stethoscope className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <select
                value={activeDoctor.id}
                onChange={(e) => {
                  const found = doctorsTeam.find((d) => d.id === e.target.value);
                  if (found) handleSelectDoctor(found);
                }}
                aria-label="Cambiar médico familiar en guardia"
                className="bg-transparent text-[11.5px] font-extrabold text-teal-950 cursor-pointer focus:outline-none max-w-[215px] truncate"
              >
                {doctorsTeam.map((docItem) => (
                  <option key={docItem.id} value={docItem.id}>
                    {docItem.name} ({docItem.consultorio})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Patient Switcher Dropdown */}
            {patients.length > 0 && selectedPatient && (
              <select
                value={selectedPatient.id}
                onChange={(e) => {
                  const found = patients.find((p) => p.id === e.target.value);
                  if (found) handleSelectPatient(found);
                }}
                aria-label="Cambiar paciente activo"
                className="hidden xl:block px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (#{p.code})
                  </option>
                ))}
              </select>
            )}

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationsPopover((prev) => !prev)}
                className="relative p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Alertas clínicas"
              >
                <Bell className="w-4 h-4" />
                {unreadAlertsCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadAlertsCount}
                  </span>
                )}
              </button>

              {showNotificationsPopover && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 z-50 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span
                      className="font-bold text-xs"
                      style={{ color: 'var(--brand-heading)' }}
                    >
                      Alertas Clínicas Pendientes
                    </span>
                    <button
                      onClick={() => setShowNotificationsPopover(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {alerts.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">
                      No hay alertas clínicas pendientes.
                    </p>
                  ) : (
                    alerts.map((al) => (
                      <div
                        key={al.id}
                        onClick={() => {
                          setAlerts((prev) =>
                            prev.map((item) =>
                              item.id === al.id ? { ...item, resolved: !item.resolved } : item
                            )
                          );
                        }}
                        className="p-2 rounded-xl hover:bg-slate-50 cursor-pointer flex items-start gap-2.5 text-xs"
                      >
                        <AlertCircle
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            al.resolved ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        />
                        <div className="flex-1">
                          <p
                            className={`font-semibold ${
                              al.resolved ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}
                          >
                            {al.title}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {al.patientName} · {al.dueDate}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* PWA Install & Cloud/Offline Terreno Status */}
            <PWAHeaderControls
              isCloudSynced={isCloudSynced}
              onTriggerToast={triggerToast}
            />

            {/* Interactive Tutorial / Guide Button */}
            <button
              onClick={() => setIsTutorialModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Abrir tutorial interactivo paso a paso"
            >
              <BookOpen className="w-3.5 h-3.5 text-teal-700" />
              <span className="hidden sm:inline">Tutorial</span>
            </button>

            {/* Primary Action Button */}
            <button
              onClick={() => setIsNewPatientModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold transition-opacity hover:opacity-95 cursor-pointer whitespace-nowrap shrink-0"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Nuevo Paciente</span>
            </button>
          </div>
        </header>

        {/* ==================== MAIN VIEWPORT ==================== */}
        <main className="flex-1 p-5 xl:p-6 max-w-[1560px] w-full mx-auto space-y-5">
          {activeNav === 'Fichas Clínicas' ? (
            <ClinicalFormsModule
              patients={patients}
              selectedPatient={selectedPatient}
              activeDoctor={activeDoctor}
              onSelectPatient={handleSelectPatient}
              onUpdatePatientFromForms={(patientId, updates) => {
                setPatients((prev) =>
                  prev.map((p) => (p.id === patientId ? { ...p, ...updates } : p))
                );
              }}
              onTriggerToast={triggerToast}
              onOpenNewPatient={() => setIsNewPatientModalOpen(true)}
            />
          ) : activeNav === 'Visita Domiciliaria' ? (
            <HomeVisitModule
              patients={patients}
              selectedPatient={selectedPatient}
              activeDoctor={activeDoctor}
              homeVisits={homeVisits}
              onAddHomeVisit={handleAddHomeVisit}
              onUpdateHomeVisit={handleUpdateHomeVisit}
              onDeleteHomeVisit={handleDeleteHomeVisit}
              medicalBag={medicalBag}
              onToggleBagItem={handleToggleBagItem}
              onMarkAllBagReady={handleMarkAllBagReady}
              onAddBagItem={handleAddBagItem}
              onSelectPatient={handleSelectPatient}
              onUpdatePatientVitals={handleUpdateVitals}
              onOpenNewPatient={() => setIsNewPatientModalOpen(true)}
              onTriggerToast={triggerToast}
            />
          ) : activeNav === 'Suite Integral & ARS' ? (
            <IntegralPracticeSuite
              patients={patients}
              selectedPatient={selectedPatient}
              activeDoctor={activeDoctor}
              homeVisits={homeVisits}
              certificates={certificates}
              onAddCertificate={(cert) => {
                setCertificates((prev) => [cert, ...prev]);
                triggerToast(`Certificado oficial emitido: ${cert.type} (${cert.id})`);
              }}
              onDeleteCertificate={(id) => {
                setCertificates((prev) => prev.filter((c) => c.id !== id));
                triggerToast('Certificado eliminado del registro');
              }}
              arsClaims={arsClaims}
              onAddArsClaim={(claim) => {
                setArsClaims((prev) => [claim, ...prev]);
                triggerToast(
                  `Autorización ${claim.authorizationCode} registrada (${claim.arsName})`
                );
              }}
              onUpdateArsClaimStatus={(id, status) => {
                setArsClaims((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, status } : c))
                );
                triggerToast(`Estado de reclamo ARS actualizado a: ${status}`);
              }}
              onDeleteArsClaim={(id) => {
                setArsClaims((prev) => prev.filter((c) => c.id !== id));
              }}
              labTrends={labTrends}
              onAddLabTrend={(entry) => {
                setLabTrends((prev) => [...prev, entry]);
                triggerToast(
                  `Control longitudinal graficado: HbA1c ${entry.hba1c}% · PA ${entry.systolicBp}/${entry.diastolicBp} mmHg`
                );
              }}
              onDeleteLabTrend={(id) => {
                setLabTrends((prev) => prev.filter((l) => l.id !== id));
              }}
              onSelectPatient={handleSelectPatient}
              onAddClinicalNoteToPatient={handleAddClinicalNote}
              onOpenNewPatient={() => setIsNewPatientModalOpen(true)}
              onTriggerToast={triggerToast}
            />
          ) : activeNav !== 'Inicio' ? (
            <SecondarySectionView
              activeSection={activeNav}
              onNavigate={setActiveNav}
              patients={patients}
              selectedPatient={selectedPatient}
              activeDoctor={activeDoctor}
              doctorsTeam={doctorsTeam}
              onSelectDoctor={handleSelectDoctor}
              onUpdateDoctorProfile={handleUpdateDoctorProfile}
              onAddDoctor={handleAddDoctor}
              onSelectPatient={handleSelectPatient}
              onDeletePatient={handleDeletePatient}
              onUpdateVitals={handleUpdateVitals}
              onOpenNewPatient={() => setIsNewPatientModalOpen(true)}
              onOpenPrintRx={() => setIsPrintRxModalOpen(true)}
              appointments={appointments}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
              onAddAppointment={(apt) => {
                setAppointments((prev) => [...prev, apt]);
                triggerToast(`Cita programada para ${apt.patientName} a las ${apt.time}`);
              }}
              pediatricPatients={pediatricList}
              onAddPediatricPatient={handleAddPediatricPatient}
              onAddPediatricMeasurement={handleAddPediatricMeasurement}
              vaccines={vaccines}
              onAddVaccine={handleAddVaccine}
              onToggleVaccineStatus={handleToggleVaccineStatus}
              onAddDiagnosis={handleAddDiagnosis}
              onRemoveDiagnosis={handleRemoveDiagnosis}
              onAddMedication={handleAddMedication}
              onRemoveMedication={handleRemoveMedication}
              onAddLabOrder={handleAddLabOrder}
              onRemoveLabOrder={handleRemoveLabOrder}
              onAddNote={handleAddClinicalNote}
              onResetAllData={handleResetAllData}
              onTriggerToast={triggerToast}
            />
          ) : (
            <>
              {/* ==================== ROW 1: MINIMALIST CLINICAL HEADER & DAILY STRIP ==================== */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">
                        Buen día, {activeDoctor.name}
                      </h2>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {activeDoctor.consultorio}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {activeDoctor.specialty} · {activeDoctor.shift} · Exeq. {activeDoctor.exequatur} · {formatDominicanDate()}
                    </p>
                  </div>

                  {/* Clean, single-row primary actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setIsNewPatientModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
                      style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Nuevo Paciente</span>
                    </button>
                    <button
                      onClick={() => {
                        if (selectedPatient) {
                          setIsPrintRxModalOpen(true);
                        } else {
                          setIsNewPatientModalOpen(true);
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Emitir Receta</span>
                    </button>
                    <button
                      onClick={() => setActiveNav('Agenda')}
                      className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Agenda ({appointments.filter((a) => a.status !== 'Completada').length})</span>
                    </button>
                    <button
                      onClick={() => setActiveNav('Fichas Clínicas')}
                      className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Fichas MSP</span>
                    </button>
                  </div>
                </div>

                {/* Minimalist 4-Metric Clean Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Consultas Realizadas</span>
                    <span className="text-base font-bold font-mono-clinical text-slate-900 mt-0.5 block">{liveConsultasRealizadas}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Pacientes en Padrón</span>
                    <span className="text-base font-bold font-mono-clinical text-slate-900 mt-0.5 block">{patients.length}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Visitas en Terreno</span>
                    <span className="text-base font-bold font-mono-clinical text-teal-700 mt-0.5 block">{homeVisits.length}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Alertas Pendientes</span>
                    <span className="text-base font-bold font-mono-clinical text-rose-600 mt-0.5 block">
                      {alerts.filter((a) => !a.resolved).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* ==================== ROW 2: MASTER-DETAIL CLINICAL WORKSPACE ==================== */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* LEFT 8 COLS: EXPEDIENTE CLÍNICO ACTIVO O ESTADO LIMPIO INICIAL */}
                <section className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between overflow-hidden">
                  {!selectedPatient ? (
                    <div className="p-10 flex flex-col items-center justify-center text-center my-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                        <Stethoscope className="w-6 h-6" />
                      </div>
                      <div className="max-w-md space-y-1">
                        <h3 className="text-base font-bold text-slate-900">
                          Estación de Consulta Lista
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Seleccione un paciente de la agenda o registre un nuevo expediente para iniciar la nota SOAP, signos vitales y prescripción médica.
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5 pt-1">
                        <button
                          onClick={() => setIsNewPatientModalOpen(true)}
                          className="px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer hover:opacity-95"
                          style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>+ Registrar Paciente</span>
                        </button>
                        <button
                          onClick={() => setActiveNav('Pacientes')}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Ver Directorio
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Top Patient Header */}
                      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                            style={{
                              backgroundColor: selectedPatient.avatarBg,
                              color: selectedPatient.avatarText,
                            }}
                          >
                            {selectedPatient.initials}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900">
                                {selectedPatient.name}
                              </h3>
                              <span className="text-xs font-mono-clinical text-slate-400">
                                #{selectedPatient.code}
                              </span>
                              {hasDrugAllergy && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" /> Alergia: {selectedPatient.allergies.join(', ')}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <span>{selectedPatient.age} años</span>
                              <span>·</span>
                              <span>{selectedPatient.gender}</span>
                              <span>·</span>
                              <span className="font-mono-clinical">Cédula {selectedPatient.cedula}</span>
                              <span>·</span>
                              <span className="font-semibold text-slate-700">{selectedPatient.ars}</span>
                              {selectedPatient.conditions.length > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="text-slate-600 font-medium">
                                    {selectedPatient.conditions.join(', ')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Cockpit Mode Selector */}
                        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                          <button
                            onClick={() => setCockpitTab('resumen')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                              cockpitTab === 'resumen'
                                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Signos y Receta
                          </button>
                          <button
                            onClick={() => setCockpitTab('soap')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                              cockpitTab === 'soap'
                                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Nota SOAP ({selectedPatient.notes.length})
                          </button>
                          <button
                            onClick={() => setCockpitTab('labs')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                              cockpitTab === 'labs'
                                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Analíticas ({selectedPatient.labOrders.length})
                          </button>
                        </div>
                      </div>

                      {/* COCKPIT TAB 1: SIGNOS VITALES + CIE-10 + RECETA MÉDICA */}
                      {cockpitTab === 'resumen' && (
                        <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Signos Vitales y Biometría
                              </span>
                              {editingVitalsHome ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setEditingVitalsHome(false)}
                                    className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={handleSaveHomeVitals}
                                    className="px-3 py-1 rounded-lg bg-teal-700 text-white text-xs font-bold cursor-pointer"
                                  >
                                    Guardar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={handleStartEditHomeVitals}
                                  className="flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Editar signos</span>
                                </button>
                              )}
                            </div>

                            {editingVitalsHome ? (
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50">
                                <div>
                                  <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">TA (mmHg)</label>
                                  <input
                                    type="text"
                                    value={homeTa}
                                    onChange={(e) => setHomeTa(e.target.value)}
                                    placeholder="120/80"
                                    className="w-full px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">FC (lpm)</label>
                                  <input
                                    type="text"
                                    value={homeFc}
                                    onChange={(e) => setHomeFc(e.target.value)}
                                    placeholder="74"
                                    className="w-full px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">Temp (°C)</label>
                                  <input
                                    type="text"
                                    value={homeTemp}
                                    onChange={(e) => setHomeTemp(e.target.value)}
                                    placeholder="36.6 °C"
                                    className="w-full px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">Peso (kg)</label>
                                  <input
                                    type="text"
                                    value={homeWeight}
                                    onChange={(e) => setHomeWeight(e.target.value)}
                                    placeholder="70 kg"
                                    className="w-full px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">Glucemia</label>
                                  <input
                                    type="text"
                                    value={homeGlucose}
                                    onChange={(e) => setHomeGlucose(e.target.value)}
                                    placeholder="95 mg/dL"
                                    className="w-full px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/70 rounded-xl p-3 border border-slate-100 text-xs">
                                <div className="pr-2.5">
                                  <span className="text-[11px] text-slate-500 font-medium">Presión Arterial</span>
                                  <p className="text-sm font-bold font-mono-clinical text-slate-900 mt-0.5">
                                    {selectedPatient.vitals.ta} <span className="font-sans font-normal text-[11px] text-slate-400">mmHg</span>
                                  </p>
                                </div>
                                <div className="sm:px-2.5">
                                  <span className="text-[11px] text-slate-500 font-medium">Frec. Cardíaca</span>
                                  <p className="text-sm font-bold font-mono-clinical text-slate-900 mt-0.5">
                                    {selectedPatient.vitals.fc} <span className="font-sans font-normal text-[11px] text-slate-400">lpm</span>
                                  </p>
                                </div>
                                <div className="sm:px-2.5">
                                  <span className="text-[11px] text-slate-500 font-medium">Temperatura</span>
                                  <p className="text-sm font-bold font-mono-clinical text-slate-900 mt-0.5">
                                    {selectedPatient.vitals.temp}
                                  </p>
                                </div>
                                <div className="sm:px-2.5">
                                  <span className="text-[11px] text-slate-500 font-medium">Peso · IMC</span>
                                  <p className="text-sm font-bold font-mono-clinical text-slate-900 mt-0.5">
                                    {selectedPatient.vitals.weight} <span className="font-sans text-[11px] text-teal-700 font-semibold">({patientBmi})</span>
                                  </p>
                                </div>
                                <div className="sm:pl-2.5">
                                  <span className="text-[11px] text-slate-500 font-medium">Glucemia</span>
                                  <p className="text-sm font-bold font-mono-clinical text-slate-900 mt-0.5">
                                    {selectedPatient.vitals.glucose || '—'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 2-Column Split: Diagnósticos CIE-10 & Receta Médica */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                            {/* Left Column: Diagnósticos CIE-10 */}
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                  Diagnósticos CIE-10 ({selectedPatient.diagnoses.length})
                                </h4>
                                <button
                                  onClick={() => setShowAddDiagForm((prev) => !prev)}
                                  className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer"
                                >
                                  {showAddDiagForm ? 'Cerrar' : '+ Agregar CIE-10'}
                                </button>
                              </div>

                              {showAddDiagForm && (
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      handleAddDiagnosis(newDiagName, 'Confirmado');
                                    }}
                                    className="flex gap-1.5"
                                  >
                                    <input
                                      type="text"
                                      required
                                      placeholder="Diagnóstico o código (ej. Hipertensión I10)"
                                      value={newDiagName}
                                      onChange={(e) => setNewDiagName(e.target.value)}
                                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                                    />
                                    <button
                                      type="submit"
                                      className="px-3 py-1.5 rounded-lg text-white text-xs font-bold"
                                      style={{ backgroundColor: 'var(--brand-primary)' }}
                                    >
                                      Añadir
                                    </button>
                                  </form>
                                  <div className="flex flex-wrap gap-1">
                                    {CIE10_SUGGESTIONS.slice(0, 4).map((sug) => (
                                      <button
                                        key={sug.code}
                                        type="button"
                                        onClick={() => handleAddDiagnosis(sug.name, 'Confirmado')}
                                        className="text-[10.5px] px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-teal-600 text-slate-700"
                                      >
                                        + {sug.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                                {selectedPatient.diagnoses.length === 0 ? (
                                  <p className="text-xs text-slate-400 py-2">
                                    Sin diagnósticos CIE-10 activos.
                                  </p>
                               ) : (
                                  selectedPatient.diagnoses.map((diag) => (
                                    <div
                                      key={diag.id}
                                      className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2 group"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                        <div className="min-w-0 leading-tight">
                                          <p className="text-xs font-semibold text-slate-900 truncate">
                                            {diag.name}
                                          </p>
                                          <p className="text-[11px] text-slate-400">{diag.status}</p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleRemoveDiagnosis(diag.id)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 transition-opacity cursor-pointer"
                                        title="Eliminar diagnóstico"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Right Column: Receta Médica Activa */}
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                  Receta Activa ({selectedPatient.medications.length})
                                </h4>
                                <button
                                  onClick={() => setShowAddMedForm((prev) => !prev)}
                                  className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer"
                                >
                                  {showAddMedForm ? 'Cerrar' : '+ Prescribir'}
                                </button>
                              </div>

                              {showAddMedForm && (
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      handleAddMedication(newMedName, newMedDosage);
                                    }}
                                    className="space-y-1.5"
                                  >
                                    <input
                                      type="text"
                                      required
                                      placeholder="Medicamento (ej. Amlodipino 5 mg)"
                                      value={newMedName}
                                      onChange={(e) => setNewMedName(e.target.value)}
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                                    />
                                    <div className="flex gap-1.5">
                                      <input
                                        type="text"
                                        placeholder="Posología"
                                        value={newMedDosage}
                                        onChange={(e) => setNewMedDosage(e.target.value)}
                                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                                      />
                                      <button
                                        type="submit"
                                        className="px-3 py-1.5 rounded-lg text-white text-xs font-bold"
                                        style={{ backgroundColor: 'var(--brand-primary)' }}
                                      >
                                        Guardar
                                      </button>
                                    </div>
                                  </form>
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {QUICK_MEDICATIONS_CATALOG.slice(0, 4).map((m) => (
                                      <button
                                        key={m.name}
                                        type="button"
                                        onClick={() => handleAddMedication(m.name, m.dosage)}
                                        className="text-[10.5px] px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-teal-600 text-slate-700"
                                      >
                                        + {m.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                                {selectedPatient.medications.length === 0 ? (
                                  <p className="text-xs text-slate-400 py-2">
                                    Sin medicamentos prescritos actualmente.
                                  </p>
                                ) : (
                                  selectedPatient.medications.map((med) => (
                                    <div
                                      key={med.id}
                                      className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2 group"
                                    >
                                      <div className="min-w-0 leading-tight">
                                        <p className="text-xs font-semibold text-slate-900 truncate">
                                          {med.name}
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                          {med.dosage}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => handleRemoveMedication(med.id)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 transition-opacity cursor-pointer"
                                        title="Quitar de la receta"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Bottom Action Bar of the Patient Card */}
                          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <span className="text-slate-400">
                              Última visita: <strong className="text-slate-600">{selectedPatient.lastVisit || 'Hoy'}</strong> · Próximo seguimiento: <strong className="text-slate-600">{selectedPatient.nextFollowUp || 'Por programar'}</strong>
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setIsPrintRxModalOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-500" />
                                <span>Imprimir Receta</span>
                              </button>
                              <button
                                onClick={() => setActiveNav('Fichas Clínicas')}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white font-semibold transition-opacity hover:opacity-95 cursor-pointer"
                                style={{ backgroundColor: 'var(--brand-primary)' }}
                              >
                                <span>Abrir 7 Fichas MSP →</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* COCKPIT TAB 2: EVOLUCIÓN SOAP */}
                      {cockpitTab === 'soap' && (
                        <div className="p-5 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-600">
                              Autocompletar con plantilla clínica:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {SOAP_TEMPLATES.map((tpl) => (
                                <button
                                  key={tpl.id}
                                  type="button"
                                  onClick={() => {
                                    setHomeSoapType(tpl.type);
                                    setHomeSubjective(tpl.subjective);
                                    setHomeObjective(tpl.objective);
                                    setHomePlan(tpl.plan);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer border bg-slate-50 border-slate-200 hover:border-teal-500 text-slate-700 transition-colors"
                                >
                                  + {tpl.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const summary =
                                homeSubjective || homeObjective
                                  ? `${homeSubjective} ${homeObjective}`.trim()
                                  : 'Control clínico favorable.';
                              handleAddClinicalNote(
                                selectedPatient.id,
                                summary,
                                homeSoapType,
                                homeSubjective,
                                homeObjective,
                                homePlan
                              );
                              setHomeSubjective('');
                              setHomeObjective('');
                              setHomePlan('');
                            }}
                            className="space-y-3"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <textarea
                                rows={2}
                                value={homeSubjective}
                                onChange={(e) => setHomeSubjective(e.target.value)}
                                placeholder="Subjetivo (Motivo de consulta y síntomas)..."
                                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                              />
                              <textarea
                                rows={2}
                                value={homeObjective}
                                onChange={(e) => setHomeObjective(e.target.value)}
                                placeholder="Objetivo (Examen físico y hallazgos)..."
                                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                              />
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={homePlan}
                                onChange={(e) => setHomePlan(e.target.value)}
                                placeholder="Plan y conducta terapéutica..."
                                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                              />
                              <button
                                type="submit"
                                className="px-4 py-2 rounded-xl text-white text-xs font-semibold shrink-0 cursor-pointer"
                                style={{ backgroundColor: 'var(--brand-primary)' }}
                              >
                                Guardar Evolución
                              </button>
                            </div>
                          </form>

                          <div className="space-y-2 pt-2 border-t border-slate-100 max-h-56 overflow-y-auto">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                              Notas Anteriores ({selectedPatient.notes.length})
                            </span>
                            {selectedPatient.notes.length === 0 ? (
                              <p className="text-xs text-slate-400 py-2">
                                Aún no hay evoluciones SOAP registradas para este paciente.
                              </p>
                            ) : (
                              selectedPatient.notes.map((n) => (
                                <div
                                  key={n.id}
                                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1"
                                >
                                  <div className="flex justify-between">
                                    <strong className="text-slate-800">
                                      {n.type}
                                    </strong>
                                    <span className="font-mono-clinical text-slate-400 text-[11px]">
                                      {n.date}
                                    </span>
                                  </div>
                                  <p className="text-slate-600">{n.summary}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* COCKPIT TAB 3: ANALÍTICAS Y LABORATORIOS */}
                      {cockpitTab === 'labs' && (
                        <div className="p-5 space-y-4">
                          <div>
                            <span className="text-xs font-semibold text-slate-600 block mb-2">
                              Solicitar estudio o panel en 1 clic:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {QUICK_LAB_PANELS.map((panel) => (
                                <button
                                  key={panel.name}
                                  type="button"
                                  onClick={() => handleAddLabOrder(panel.name, panel.category)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer border bg-slate-50 border-slate-200 hover:border-teal-500 text-slate-700 transition-colors"
                                >
                                  + {panel.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="divide-y divide-slate-100 pt-2 border-t border-slate-100 max-h-56 overflow-y-auto">
                            {selectedPatient.labOrders.length === 0 ? (
                              <p className="text-xs text-slate-400 py-4">
                                No hay órdenes de laboratorio activas para {selectedPatient.name}.
                              </p>
                            ) : (
                              selectedPatient.labOrders.map((lab) => (
                                <div
                                  key={lab.id}
                                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                                >
                                  <div>
                                    <p className="font-semibold text-slate-900">{lab.name}</p>
                                    <p className="text-slate-400 text-[11px]">
                                      {lab.category} · {lab.date} ·{' '}
                                      <strong
                                        className={
                                          lab.status === 'Completado'
                                            ? 'text-emerald-700'
                                            : 'text-amber-700'
                                        }
                                      >
                                        {lab.status}
                                      </strong>
                                      {lab.resultSummary && ` — ${lab.resultSummary}`}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveLabOrder(lab.id)}
                                    className="text-slate-400 hover:text-rose-600 p-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </section>

                {/* RIGHT 4 COLS: SALA DE ESPERA Y AGENDA */}
                <section className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-bold text-slate-900">
                          Agenda de Hoy
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-[11px] font-semibold">
                        <button
                          onClick={() => setAgendaQueueFilter('pendientes')}
                          className={`px-2 py-1 rounded-md cursor-pointer ${
                            agendaQueueFilter === 'pendientes'
                              ? 'bg-white text-slate-900 shadow-2xs font-bold'
                              : 'text-slate-500'
                          }`}
                        >
                          En espera ({appointments.filter((a) => a.status !== 'Completada').length})
                        </button>
                        <button
                          onClick={() => setAgendaQueueFilter('todos')}
                          className={`px-2 py-1 rounded-md cursor-pointer ${
                            agendaQueueFilter === 'todos'
                              ? 'bg-white text-slate-900 shadow-2xs font-bold'
                              : 'text-slate-500'
                          }`}
                        >
                          Todos ({appointments.length})
                        </button>
                      </div>
                    </div>

                    {filteredAppointments.length === 0 ? (
                      <div className="py-8 text-center space-y-2">
                        <Calendar className="w-6 h-6 text-slate-300 mx-auto" />
                        <p className="text-xs font-semibold text-slate-600">
                          Sin turnos en espera para hoy
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Agende una cita para organizar las consultas.
                        </p>
                        <button
                          onClick={() => setActiveNav('Agenda')}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors cursor-pointer"
                        >
                          + Agendar turno
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 mt-1 max-h-72 overflow-y-auto pr-1">
                        {filteredAppointments.map((apt) => {
                          const isSelected = selectedPatient?.id === apt.patientId;
                          return (
                            <div
                              key={apt.id}
                              onClick={() => {
                                const found = patients.find((p) => p.id === apt.patientId);
                                if (found) handleSelectPatient(found);
                              }}
                              className={`py-2.5 px-2 -mx-2 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-2.5 ${
                                isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="font-mono-clinical text-xs font-semibold text-slate-500 shrink-0">
                                  {apt.time}
                                </span>
                                <div className="min-w-0 leading-tight">
                                  <p className="text-xs font-semibold text-slate-900 truncate">
                                    {apt.patientName}
                                  </p>
                                  <p className="text-[11px] text-slate-400 truncate">
                                    {apt.title}
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const found = patients.find((p) => p.id === apt.patientId);
                                  if (found) handleSelectPatient(found);
                                  setActiveNav('Consulta');
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-teal-50 text-teal-800 transition-colors shrink-0 cursor-pointer"
                              >
                                Atender
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Quick Directory Access */}
                  <div className="pt-3 mt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Pacientes Recientes ({patients.length})
                      </span>
                      <button
                        onClick={() => setActiveNav('Pacientes')}
                        className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer"
                      >
                        Ver todos →
                      </button>
                    </div>
                    {patients.length === 0 ? (
                      <p className="text-[11px] text-slate-400 py-1">
                        Los pacientes que registre aparecerán aquí para acceso rápido.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        {patients.slice(0, 4).map((pat) => (
                          <button
                            key={pat.id}
                            onClick={() => handleSelectPatient(pat)}
                            className={`px-2.5 py-1.5 rounded-xl text-left text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer truncate ${
                              selectedPatient?.id === pat.id
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                              style={{ backgroundColor: pat.avatarBg, color: pat.avatarText }}
                            >
                              {pat.initials}
                            </span>
                            <span className="truncate">{pat.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* ==================== ROW 3: SEGUIMIENTOS CLÍNICOS & ACCESOS DIRECTOS ==================== */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                {/* CARD 1: SEGUIMIENTOS Y ALERTAS DEL DÍA */}
                <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-bold text-slate-900">
                          Seguimientos y Alertas Clínicas ({alerts.filter((a) => !a.resolved).length})
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowAddAlertForm((prev) => !prev)}
                        className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{showAddAlertForm ? 'Cerrar' : 'Recordatorio'}</span>
                      </button>
                    </div>

                    {showAddAlertForm && (
                      <form
                        onSubmit={handleAddAlert}
                        className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                      >
                        <input
                          type="text"
                          required
                          value={newAlertTitle}
                          onChange={(e) => setNewAlertTitle(e.target.value)}
                          placeholder="Ej. Revisar HbA1c o control de TA..."
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newAlertDueDate}
                            onChange={(e) => setNewAlertDueDate(e.target.value)}
                            placeholder="Fecha meta (ej. Próxima semana)"
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                          />
                          <button
                            type="submit"
                            className="px-3.5 py-1.5 rounded-lg text-white font-semibold cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-primary)' }}
                          >
                            Guardar
                          </button>
                        </div>
                      </form>
                    )}

                    {alerts.length === 0 ? (
                      <div className="py-8 text-center space-y-1">
                        <p className="text-xs font-semibold text-slate-600">
                          Sin alertas clínicas pendientes
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Use "+ Recordatorio" para programar seguimientos preventivos.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
                        {alerts.map((al) => (
                          <div
                            key={al.id}
                            className="py-2.5 flex items-start justify-between gap-3 group"
                          >
                            <div
                              onClick={() => {
                                const pat = patients.find((p) => p.id === al.patientId);
                                if (pat) handleSelectPatient(pat);
                              }}
                              className="flex items-start gap-2.5 cursor-pointer min-w-0"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAlerts((prev) =>
                                    prev.map((item) =>
                                      item.id === al.id
                                        ? { ...item, resolved: !item.resolved }
                                        : item
                                    )
                                  );
                                }}
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer ${
                                  al.resolved
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'border-slate-300 hover:border-teal-600 bg-white'
                                }`}
                              >
                                {al.resolved && <Check className="w-3 h-3 stroke-[3]" />}
                              </button>
                              <div className="min-w-0 leading-tight">
                                <p
                                  className={`text-xs font-semibold truncate ${
                                    al.resolved
                                      ? 'line-through text-slate-400'
                                      : 'text-slate-900'
                                  }`}
                                >
                                  {al.title}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {al.patientName} · {al.dueDate}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                setAlerts((prev) => prev.filter((item) => item.id !== al.id))
                              }
                              className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 p-0.5 transition-opacity"
                              title="Eliminar alerta"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>Actividad reciente</span>
                    <span className="font-mono-clinical text-[11px]">
                      {activities[0]?.timestamp || formatDominicanDate()}
                    </span>
                  </div>
                </section>

                {/* CARD 2: ACCESOS DIRECTOS A MÓDULOS DE PRIMER NIVEL */}
                <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-bold text-slate-900">
                          Módulos Clínicos de la UNAP
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">Primer Nivel de Atención</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-3">
                      <button
                        onClick={() => setActiveNav('Fichas Clínicas')}
                        className="p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/90 border border-slate-100 hover:border-slate-300 text-left transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-teal-700" />
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-800">
                            7 Fichas MSP
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          Historia individual, ficha familiar, crónicos y tamizaje preventivo.
                        </p>
                      </button>

                      <button
                        onClick={() => setActiveNav('Visita Domiciliaria')}
                        className="p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/90 border border-slate-100 hover:border-slate-300 text-left transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-teal-700" />
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-800">
                            Consulta a Domicilio
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          Ruta en terreno, Barthel, Zarit, UPP y maletín médico UNAP.
                        </p>
                      </button>

                      <button
                        onClick={() => setActiveNav('Pediatría & Vacunas')}
                        className="p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/90 border border-slate-100 hover:border-slate-300 text-left transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <Baby className="w-4 h-4 text-teal-700" />
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-800">
                            Pediatría OMS & PAI
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          Curvas de crecimiento, percentiles OMS y control de vacunas.
                        </p>
                      </button>

                      <button
                        onClick={() => setActiveNav('Suite Integral & ARS')}
                        className="p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/90 border border-slate-100 hover:border-slate-300 text-left transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <FileCheck2 className="w-4 h-4 text-teal-700" />
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-800">
                            Suite Integral & ARS
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          Certificados Ley 42-01, reclamos SISALRIL y biomarcadores.
                        </p>
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>Familia+ Medicina Familiar y Comunitaria</span>
                    <span className="font-semibold text-slate-600">Normativa MSP RD</span>
                  </div>
                </section>
              </div>
            </>
          )}
        </main>
      </div>

      {/* ==================== MODALS ==================== */}
      <NewPatientModal
        isOpen={isNewPatientModalOpen}
        onClose={() => setIsNewPatientModalOpen(false)}
        onAddPatient={handleAddPatient}
        nextCode={String(patients.length + 1).padStart(6, '0')}
        activeDoctor={activeDoctor}
      />

      <PrescriptionPrintModal
        isOpen={isPrintRxModalOpen}
        onClose={() => setIsPrintRxModalOpen(false)}
        patient={selectedPatient}
        activeDoctor={activeDoctor}
      />

      <TutorialModal
        isOpen={isTutorialModalOpen}
        onClose={() => setIsTutorialModalOpen(false)}
        onNavigateToSection={(section) => setActiveNav(section)}
        onOpenNewPatient={() => setIsNewPatientModalOpen(true)}
      />
    </div>
  );
}
