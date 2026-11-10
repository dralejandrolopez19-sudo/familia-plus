import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Printer,
  CheckCircle2,
  Calendar,
  FileText,
  Pill,
  UserPlus,
  Syringe,
  Search,
  Activity,
  Trash2,
  Stethoscope,
  AlertTriangle,
  Edit3,
  Baby,
} from 'lucide-react';
import {
  Patient,
  AppointmentItem,
  PediatricPatient,
  VaccineRecord,
  AlertItem,
  SOAP_TEMPLATES,
  QUICK_MEDICATIONS_CATALOG,
  QUICK_LAB_PANELS,
  CIE10_SUGGESTIONS,
  VitalSigns,
} from '../data/mockClinicalData';
import {
  DominicanFlagIcon,
  PediatricGrowthChartSvg,
  ChildAvatarSvg,
  FamiliaLogoEmblem,
} from './BrandVisuals';
import { DoctorProfile } from '../data/doctorsData';
import {
  MacNewPatientIcon,
  MacPillIcon,
  MacPulseIcon,
  MacStethoscopeIcon,
  MacCalendarIcon,
  MacPediatricIcon,
  MacSyringeIcon,
  MacRxDocIcon,
} from './MacOSIcons';
import { scheduleBackgroundClinicalTextAnalysis } from '../services/backgroundClinicalEngine';

export type NavSection =
  | 'Inicio'
  | 'Fichas Clínicas'
  | 'Visita Domiciliaria'
  | 'Suite Integral & ARS'
  | 'Consulta'
  | 'Pacientes'
  | 'Agenda'
  | 'Pediatría & Vacunas'
  | 'Recetas & Labs'
  | 'Reportes & EPI'
  | 'Configuración';

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPatient: (patient: Patient) => void;
  nextCode: string;
  activeDoctor: DoctorProfile;
}

export const NewPatientModal: React.FC<NewPatientModalProps> = ({
  isOpen,
  onClose,
  onAddPatient,
  nextCode,
  activeDoctor,
}) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Femenino' | 'Masculino'>('Femenino');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [ars, setArs] = useState('ARS SENASA Contributivo');
  const [allergiesInput, setAllergiesInput] = useState('');
  const [conditionsInput, setConditionsInput] = useState('');
  const [ta, setTa] = useState('');
  const [weight, setWeight] = useState('');
  const [heightCm, setHeightCm] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const parts = name.trim().split(' ');
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();

    const todayStr = new Date().toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const parsedConditions = conditionsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedAllergies = allergiesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newPatient: Patient = {
      id: `p-${Date.now()}`,
      code: nextCode,
      name: name.trim(),
      initials,
      age: parseInt(age, 10) || 30,
      gender,
      avatarBg: '#0d9488',
      avatarText: '#ffffff',
      conditions: parsedConditions.length > 0 ? parsedConditions : ['Consulta general'],
      allergies: parsedAllergies.length > 0 ? parsedAllergies : ['Ninguna conocida'],
      vitals: {
        ta: ta.trim() || '120 / 80',
        fc: '72',
        temp: '36.5 °C',
        weight: weight.trim()
          ? weight.trim().toLowerCase().includes('kg')
            ? weight.trim()
            : `${weight.trim()} kg`
          : '70.0 kg',
        heightCm: parseInt(heightCm, 10) || 165,
        spo2: '98%',
        glucose: '95 mg/dL',
      },
      diagnoses: [],
      managementPlan: [],
      medications: [],
      indications: [],
      labOrders: [],
      cedula: cedula.trim() || 'Sin registrar',
      phone: phone.trim() || 'Sin registrar',
      bloodType,
      ars,
      address: 'República Dominicana',
      lastVisit: todayStr,
      nextFollowUp: 'Por programar',
      notes: [
        {
          id: `n-${Date.now()}`,
          date: todayStr,
          type: 'Apertura de expediente clínico',
          summary: `Apertura de carpeta clínica para ${name.trim()} conforme a la Ley 42-01.`,
          doctor: `${activeDoctor.name} (${activeDoctor.consultorio})`,
        },
      ],
    };

    onAddPatient(newPatient);
    setName('');
    setAge('');
    setCedula('');
    setPhone('');
    setAllergiesInput('');
    setConditionsInput('');
    setTa('');
    setWeight('');
    setHeightCm('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        <div
          className="flex items-center justify-between px-6 py-4 text-white"
          style={{ backgroundColor: 'var(--sidebar-from)' }}
        >
          <div className="flex items-center gap-3">
            <MacNewPatientIcon size="sm" />
            <h3 className="font-bold text-base">Apertura Rápida de Expediente</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nombre completo del paciente *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Elena Rodríguez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Edad (años) *</label>
              <input
                type="number"
                required
                min="0"
                max="120"
                placeholder="Ej. 38"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Sexo</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'Femenino' | 'Masculino')}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
              >
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Cédula (RD)
              </label>
              <input
                type="text"
                placeholder="001-0000000-0"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Seguro Médico (ARS)
              </label>
              <select
                value={ars}
                onChange={(e) => setArs(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
              >
                <option value="ARS SENASA Contributivo">ARS SENASA Contributivo</option>
                <option value="ARS SENASA Subsidiado">ARS SENASA Subsidiado</option>
                <option value="ARS Primera">ARS Primera</option>
                <option value="ARS Universal">ARS Universal</option>
                <option value="ARS Mapfre Salud">ARS Mapfre Salud</option>
                <option value="Privado / Sin ARS">Privado / Sin ARS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Alergias a medicamentos
              </label>
              <input
                type="text"
                placeholder="Ej. Ninguna conocida, Penicilina..."
                value={allergiesInput}
                onChange={(e) => setAllergiesInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Condiciones / Motivo
              </label>
              <input
                type="text"
                placeholder="Ej. Hipertensión, Chequeo anual..."
                value={conditionsInput}
                onChange={(e) => setConditionsInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                TA inicial (mmHg)
              </label>
              <input
                type="text"
                placeholder="120 / 80"
                value={ta}
                onChange={(e) => setTa(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Peso (kg)
                </label>
                <input
                  type="text"
                  placeholder="70.0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Talla (cm)
                </label>
                <input
                  type="number"
                  placeholder="165"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-white font-semibold shadow-xs transition-opacity hover:opacity-95 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Registrar e Iniciar Consulta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface PrescriptionPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  activeDoctor: DoctorProfile;
}

export const PrescriptionPrintModal: React.FC<PrescriptionPrintModalProps> = ({
  isOpen,
  onClose,
  patient,
  activeDoctor,
}) => {
  if (!isOpen || !patient) return null;

  const todayFormatted = new Date().toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden">
        <div
          className="flex items-center justify-between px-6 py-4 text-white"
          style={{ backgroundColor: 'var(--sidebar-from)' }}
        >
          <div className="flex items-center gap-3">
            <MacPillIcon size="sm" preset="amber" />
            <h3 className="font-bold text-base">
              Receta y Orden Médica Oficial — Ley General de Salud 42-01
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <FamiliaLogoEmblem size={48} />
              <div>
                <h4
                  className="font-extrabold text-lg"
                  style={{ color: 'var(--brand-heading)' }}
                >
                  Familia+ Centro de Medicina Familiar
                </h4>
                <p className="text-xs text-slate-500">
                  {activeDoctor.name} • Exequátur: {activeDoctor.exequatur} • {activeDoctor.cmd}
                </p>
                <p className="text-xs text-slate-500">
                  {activeDoctor.unapCenter} ({activeDoctor.consultorio})
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p className="font-semibold text-slate-700">Fecha: {todayFormatted}</p>
              <p>Expediente: #{patient.code}</p>
              <p>Cédula: {patient.cedula}</p>
              <p className="font-semibold" style={{ color: 'var(--brand-primary)' }}>
                {patient.ars}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs border border-slate-200/80">
            <div>
              <span className="text-slate-500">Paciente: </span>
              <span className="font-bold text-slate-800 text-sm">{patient.name}</span>
              <span className="text-slate-500 ml-2">
                ({patient.age} años • {patient.gender})
              </span>
            </div>
            <div>
              <span className="text-slate-500">Diagnósticos CIE-10: </span>
              <span className="font-semibold" style={{ color: 'var(--brand-primary)' }}>
                {patient.diagnoses.map((d) => d.name).join(' · ') || 'Consulta general'}
              </span>
            </div>
          </div>

          <div>
            <div
              className="flex items-center gap-2 font-bold text-sm mb-2.5"
              style={{ color: 'var(--brand-primary)' }}
            >
              <span className="text-lg font-extrabold">℞</span>
              <span>Prescripción Farmacológica</span>
            </div>
            {patient.medications.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Sin medicamentos prescritos en esta consulta.
              </p>
            ) : (
              <div className="space-y-2">
                {patient.medications.map((m, i) => (
                  <div
                    key={m.id}
                    className="flex items-start justify-between p-3 rounded-xl bg-[#f8fafc] border border-slate-200/80"
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-sm">
                        {i + 1}. {m.name}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">Posología: {m.dosage}</p>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      Dispensación autorizada
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {patient.labOrders.length > 0 && (
            <div>
              <h5 className="text-xs font-bold text-slate-700 mb-1.5">
                Estudios y Analíticas Solicitadas
              </h5>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                {patient.labOrders.map((lab) => (
                  <li key={lab.id}>
                    <span className="font-semibold text-slate-800">{lab.name}</span> ({lab.category})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h5 className="text-xs font-bold text-slate-700 mb-1.5">
              Indicaciones No Farmacológicas y Signos de Alarma
            </h5>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
              {patient.indications.map((ind, idx) => (
                <li key={idx}>{ind}</li>
              ))}
            </ul>
          </div>

          <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <DominicanFlagIcon />
              <span>Documento válido conforme a la Ley General de Salud 42-01</span>
            </div>
            <div className="text-center">
              <p
                className="font-script text-2xl leading-none"
                style={{ color: 'var(--brand-heading)' }}
              >
                {activeDoctor.name}
              </p>
              <div className="w-48 border-t border-slate-300 mt-1 pt-0.5 text-[11px] text-slate-500">
                Exeq. {activeDoctor.exequatur} · {activeDoctor.cmd} · Firma y Sello
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cerrar
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-95 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <Printer className="w-4 h-4" />
              Imprimir Receta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SectionViewProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  patients: Patient[];
  selectedPatient: Patient | null;
  onSelectPatient: (patient: Patient) => void;
  onDeletePatient?: (patientId: string) => void;
  onUpdateVitals: (vitals: VitalSigns) => void;
  onOpenNewPatient: () => void;
  onOpenPrintRx: () => void;
  appointments: AppointmentItem[];
  onUpdateAppointmentStatus: (aptId: string, status: AppointmentItem['status']) => void;
  onAddAppointment: (apt: AppointmentItem) => void;
  pediatricPatients: PediatricPatient[];
  onAddPediatricPatient?: (child: PediatricPatient) => void;
  onAddPediatricMeasurement: (childId: string, age: number, weight: number, height: number) => void;
  vaccines: VaccineRecord[];
  onAddVaccine?: (vac: VaccineRecord) => void;
  onToggleVaccineStatus: (id: string) => void;
  onAddDiagnosis: (name: string, status: 'Confirmado' | 'En seguimiento') => void;
  onRemoveDiagnosis: (id: string) => void;
  onAddMedication: (name: string, dosage: string) => void;
  onRemoveMedication: (id: string) => void;
  onAddLabOrder: (
    name: string,
    category: 'Hematología' | 'Química Clínica' | 'Orina / Heces' | 'Cardiología / Imagen'
  ) => void;
  onRemoveLabOrder: (id: string) => void;
  onAddNote: (
    patientId: string,
    summary: string,
    type: string,
    subjective?: string,
    objective?: string,
    plan?: string
  ) => void;
  activeDoctor: DoctorProfile;
  doctorsTeam: DoctorProfile[];
  onSelectDoctor: (doc: DoctorProfile) => void;
  onUpdateDoctorProfile: (updates: Partial<DoctorProfile>) => void;
  onAddDoctor: (doc: DoctorProfile) => void;
  onResetAllData?: () => void;
  onTriggerToast?: (msg: string) => void;
}

const SAFE_EMPTY_PATIENT: Patient = {
  id: 'empty',
  code: '000001',
  name: 'Sin paciente registrado',
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

export const SecondarySectionView: React.FC<SectionViewProps> = ({
  activeSection,
  onNavigate,
  patients,
  selectedPatient: rawSelectedPatient,
  onSelectPatient,
  onDeletePatient,
  onUpdateVitals,
  onOpenNewPatient,
  onOpenPrintRx,
  appointments,
  onUpdateAppointmentStatus,
  onAddAppointment,
  pediatricPatients,
  onAddPediatricPatient,
  onAddPediatricMeasurement,
  vaccines,
  onAddVaccine,
  onToggleVaccineStatus,
  onAddDiagnosis,
  onRemoveDiagnosis,
  onAddMedication,
  onRemoveMedication,
  onAddLabOrder,
  onRemoveLabOrder,
  onAddNote,
  activeDoctor,
  doctorsTeam,
  onSelectDoctor,
  onUpdateDoctorProfile,
  onAddDoctor,
  onResetAllData,
  onTriggerToast,
}) => {
  const selectedPatient = rawSelectedPatient || patients[0] || SAFE_EMPTY_PATIENT;
  const hasRealPatient = Boolean(rawSelectedPatient || patients.length > 0);

  const [noteType, setNoteType] = useState('Consulta de seguimiento');
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [planText, setPlanText] = useState('');

  // Silent background CIE-10 detection and SOAP Plan auto-completion in Estación SOAP
  useEffect(() => {
    if (!hasRealPatient || selectedPatient.id === 'empty') return;
    const combined = `${subjective} ${objective}`.trim();
    if (combined.length < 18) return;

    scheduleBackgroundClinicalTextAnalysis(
      `estacion-soap-${selectedPatient.id}`,
      combined,
      {
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        conditions: selectedPatient.conditions,
      },
      (res) => {
        if (res.suggestedPlan) {
          setPlanText((prev) => (prev.trim() ? prev : res.suggestedPlan));
        }
        if (res.cie10Name) {
          const alreadyHas = selectedPatient.diagnoses.some(
            (d) =>
              d.name.toLowerCase() === res.cie10Name.toLowerCase() ||
              (res.cie10Code && d.name.includes(res.cie10Code))
          );
          if (!alreadyHas) {
            onAddDiagnosis(res.cie10Name, 'Confirmado');
          }
        }
        if (res.summaryNotification && onTriggerToast) {
          onTriggerToast(res.summaryNotification);
        }
      }
    );
  }, [subjective, objective, selectedPatient.id]);

  const [isEditingVitals, setIsEditingVitals] = useState(false);
  const [vTa, setVTa] = useState(selectedPatient.vitals.ta);
  const [vFc, setVFc] = useState(selectedPatient.vitals.fc);
  const [vTemp, setVTemp] = useState(selectedPatient.vitals.temp);
  const [vWeight, setVWeight] = useState(selectedPatient.vitals.weight);
  const [vGlucose, setVGlucose] = useState(selectedPatient.vitals.glucose || '95 mg/dL');

  const [consultRightTab, setConsultRightTab] = useState<'rx' | 'cie10' | 'labs'>('rx');
  const [customMedName, setCustomMedName] = useState('');
  const [customMedDose, setCustomMedDose] = useState('1 tableta cada 12 horas – 30 días');
  const [cieSearch, setCieSearch] = useState('');

  const [searchFilter, setSearchFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState<'Todos' | 'HTA' | 'DM2'>('Todos');

  const [aptTitle, setAptTitle] = useState('Consulta de Medicina Familiar');
  const [aptReason, setAptReason] = useState('');
  const [aptTime, setAptTime] = useState('09:00 a.m.');
  const [aptPatientId, setAptPatientId] = useState(selectedPatient.id);

  const [selectedChildId, setSelectedChildId] = useState(pediatricPatients[0]?.id || '');
  const [newPedWeight, setNewPedWeight] = useState('');
  const [newPedHeight, setNewPedHeight] = useState('');

  // Quick Add Pediatric Patient Form
  const [newChildName, setNewChildName] = useState('');
  const [newChildAge, setNewChildAge] = useState('');
  const [newChildGender, setNewChildGender] = useState<'Masculino' | 'Femenino'>('Femenino');
  const [newChildGuardian, setNewChildGuardian] = useState('');
  const [newChildInitWeight, setNewChildInitWeight] = useState('');
  const [newChildInitHeight, setNewChildInitHeight] = useState('');

  // Quick Add PAI Vaccine Form
  const [newVacNameInput, setNewVacNameInput] = useState('');
  const [newVacPatientInput, setNewVacPatientInput] = useState('');
  const [newVacDoseInput, setNewVacDoseInput] = useState('1ra Dosis');

  // New Doctor Form in Configuración (clean blank inputs)
  const [newTeamDocName, setNewTeamDocName] = useState('');
  const [newTeamDocExeq, setNewTeamDocExeq] = useState('');
  const [newTeamDocCmd, setNewTeamDocCmd] = useState('');
  const [newTeamDocCons, setNewTeamDocCons] = useState('Consultorio 102');
  const [newTeamDocSpec, setNewTeamDocSpec] = useState('Médico Familiar y Comunitario');

  const selectedChild =
    pediatricPatients.find((c) => c.id === selectedChildId) || pediatricPatients[0] || null;

  const numericWeight = parseFloat(selectedPatient.vitals.weight) || 70;
  const heightMeters = (selectedPatient.vitals.heightCm || 165) / 100;
  const calculatedBmi = (numericWeight / (heightMeters * heightMeters)).toFixed(1);

  const handleApplyTemplate = (tplId: string) => {
    const found = SOAP_TEMPLATES.find((t) => t.id === tplId);
    if (!found) return;
    setNoteType(found.type);
    setSubjective(found.subjective);
    setObjective(found.objective);
    setPlanText(found.plan);
  };

  const handleSaveSoapEncounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasRealPatient) return;
    const combinedSummary =
      subjective || objective
        ? `${subjective} ${objective}`.trim()
        : 'Evolución clínica favorable, signos vitales verificados y plan actualizado.';
    onAddNote(
      selectedPatient.id,
      combinedSummary,
      noteType,
      subjective,
      objective,
      planText
    );
    setSubjective('');
    setObjective('');
    setPlanText('');
  };

  const filteredPatients = patients.filter((p) => {
    const matchesText =
      p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.code.includes(searchFilter) ||
      p.cedula.includes(searchFilter) ||
      p.conditions.some((c) => c.toLowerCase().includes(searchFilter.toLowerCase()));
    if (!matchesText) return false;
    if (conditionFilter === 'HTA') {
      return p.conditions.some((c) => c.toLowerCase().includes('hipertens') || c.includes('HTA'));
    }
    if (conditionFilter === 'DM2') {
      return p.conditions.some((c) => c.toLowerCase().includes('diabet') || c.includes('DM2'));
    }
    return true;
  });

  const hasDrugAllergy =
    selectedPatient.allergies.length > 0 &&
    !selectedPatient.allergies[0].toLowerCase().includes('ninguna');

  const todayDisplay = new Date().toLocaleDateString('es-DO', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* ==================== 1. ESTACIÓN DE CONSULTA MÉDICA ==================== */}
      {activeSection === 'Consulta' && !hasRealPatient && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-10 text-center max-w-xl mx-auto my-6 space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
            <Stethoscope className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">
            Estación de Consulta SOAP Lista
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            No hay pacientes registrados todavía. Cree el primer expediente clínico para registrar signos vitales, notas de evolución SOAP, diagnósticos CIE-10 y recetas médicas Ley 42-01.
          </p>
          <button
            type="button"
            onClick={onOpenNewPatient}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs cursor-pointer"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Primer Paciente</span>
          </button>
        </div>
      )}
      {activeSection === 'Consulta' && hasRealPatient && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-extrabold shrink-0 shadow-xs"
                style={{
                  backgroundColor: selectedPatient.avatarBg,
                  color: selectedPatient.avatarText,
                }}
              >
                {selectedPatient.initials}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2
                    className="text-xl font-extrabold"
                    style={{ color: 'var(--brand-heading)' }}
                  >
                    {selectedPatient.name}
                  </h2>
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedPatient.age} años · {selectedPatient.gender} · ID: #{selectedPatient.code}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1">
                  <span>Cédula: <strong className="tabular-nums">{selectedPatient.cedula}</strong></span>
                  <span>·</span>
                  <span>
                    Seguro:{' '}
                    <strong style={{ color: 'var(--brand-primary)' }}>
                      {selectedPatient.ars}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>Sangre: <strong>{selectedPatient.bloodType}</strong></span>
                  {hasDrugAllergy && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Alergia: {selectedPatient.allergies.join(', ')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={selectedPatient.id}
                onChange={(e) => {
                  const found = patients.find((p) => p.id === e.target.value);
                  if (found) {
                    onSelectPatient(found);
                    setVTa(found.vitals.ta);
                    setVFc(found.vitals.fc);
                    setVTemp(found.vitals.temp);
                    setVWeight(found.vitals.weight);
                    setVGlucose(found.vitals.glucose || '100 mg/dL');
                  }
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-xs font-bold text-slate-700 border border-slate-200 cursor-pointer focus:outline-none"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    Cambiar paciente: {p.name}
                  </option>
                ))}
              </select>

              <button
                onClick={onOpenPrintRx}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition-opacity hover:opacity-95 cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Printer className="w-4 h-4" />
                <span>Emitir Receta / Orden</span>
              </button>
            </div>
          </div>

          {/* Interactive Vitals Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <MacPulseIcon size="xs" />
                <h3
                  className="text-xs font-extrabold uppercase tracking-wider"
                  style={{ color: 'var(--brand-heading)' }}
                >
                  Signos Vitales y Antropometría de la Consulta
                </h3>
              </div>
              {isEditingVitals ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditingVitals(false)}
                    className="px-3 py-1 rounded-lg text-xs text-slate-500 hover:bg-slate-100 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      onUpdateVitals({
                        ...selectedPatient.vitals,
                        ta: vTa,
                        fc: vFc,
                        temp: vTemp,
                        weight: vWeight,
                        glucose: vGlucose,
                      });
                      setIsEditingVitals(false);
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    Guardar Signos
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setVTa(selectedPatient.vitals.ta);
                    setVFc(selectedPatient.vitals.fc);
                    setVTemp(selectedPatient.vitals.temp);
                    setVWeight(selectedPatient.vitals.weight);
                    setVGlucose(selectedPatient.vitals.glucose || '104 mg/dL');
                    setIsEditingVitals(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold hover:underline cursor-pointer"
                  style={{ color: 'var(--brand-primary)' }}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Actualizar signos vitales</span>
                </button>
              )}
            </div>

            {isEditingVitals ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                    TA (mmHg)
                  </label>
                  <input
                    type="text"
                    value={vTa}
                    onChange={(e) => setVTa(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-teal-400 text-sm font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                    FC (lpm)
                  </label>
                  <input
                    type="text"
                    value={vFc}
                    onChange={(e) => setVFc(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-teal-400 text-sm font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                    Temperatura
                  </label>
                  <input
                    type="text"
                    value={vTemp}
                    onChange={(e) => setVTemp(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-teal-400 text-sm font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                    Peso (kg)
                  </label>
                  <input
                    type="text"
                    value={vWeight}
                    onChange={(e) => setVWeight(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-teal-400 text-sm font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                    Glucemia Capilar
                  </label>
                  <input
                    type="text"
                    value={vGlucose}
                    onChange={(e) => setVGlucose(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-teal-400 text-sm font-bold tabular-nums"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80">
                <div className="pr-3 py-1">
                  <span className="text-[11px] text-slate-500 block">Presión Arterial (TA)</span>
                  <span className="text-base font-extrabold text-slate-900 tabular-nums">
                    {selectedPatient.vitals.ta}{' '}
                    <small className="font-normal text-slate-500">mmHg</small>
                  </span>
                </div>
                <div className="sm:px-3 py-1">
                  <span className="text-[11px] text-slate-500 block">Frec. Cardíaca (FC)</span>
                  <span className="text-base font-extrabold text-slate-900 tabular-nums">
                    {selectedPatient.vitals.fc}{' '}
                    <small className="font-normal text-slate-500">lpm</small>
                  </span>
                </div>
                <div className="sm:px-3 py-1">
                  <span className="text-[11px] text-slate-500 block">Temperatura</span>
                  <span className="text-base font-extrabold text-slate-900 tabular-nums">
                    {selectedPatient.vitals.temp}
                  </span>
                </div>
                <div className="sm:px-3 py-1">
                  <span className="text-[11px] text-slate-500 block">Peso / Talla</span>
                  <span className="text-base font-extrabold text-slate-900 tabular-nums">
                    {selectedPatient.vitals.weight}{' '}
                    <small className="font-normal text-slate-500">
                      · {selectedPatient.vitals.heightCm || 165} cm
                    </small>
                  </span>
                </div>
                <div className="sm:px-3 py-1">
                  <span className="text-[11px] text-slate-500 block">IMC Calculado</span>
                  <span
                    className="text-base font-extrabold tabular-nums"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    {calculatedBmi} <small className="font-normal text-slate-500">kg/m²</small>
                  </span>
                </div>
                <div className="sm:pl-3 py-1">
                  <span className="text-[11px] text-slate-500 block">Glucemia / SpO2</span>
                  <span className="text-base font-extrabold text-emerald-700 tabular-nums">
                    {selectedPatient.vitals.glucose || '104 mg/dL'}{' '}
                    <small className="font-normal text-slate-500">
                      · {selectedPatient.vitals.spo2 || '98%'}
                    </small>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2-Column Clinical Workbench */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <MacStethoscopeIcon size="sm" preset="indigo" />
                  <h3
                    className="font-extrabold text-base"
                    style={{ color: 'var(--brand-heading)' }}
                  >
                    Nota de Evolución Clínica (SOAP)
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-semibold mr-1">
                    Plantillas rápidas:
                  </span>
                  {SOAP_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl.id)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      style={{
                        backgroundColor: 'var(--brand-soft-bg)',
                        color: 'var(--brand-primary)',
                      }}
                    >
                      + {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSaveSoapEncounter} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipo de encuentro
                    </label>
                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50/70"
                    >
                      <option value="Consulta de seguimiento">Consulta de seguimiento</option>
                      <option value="Control de Crónicos (HTA / DM2)">
                        Control de Crónicos (HTA / DM2)
                      </option>
                      <option value="Evaluación Preventiva Familiar">
                        Evaluación Preventiva Familiar
                      </option>
                      <option value="Consulta Aguda Respiratoria">
                        Consulta Aguda Respiratoria
                      </option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <p className="text-[11.5px] text-slate-500 pb-2">
                      Usa una plantilla rápida arriba para autocompletar en 1 clic.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    S — Subjetivo (Motivo de consulta y síntomas actuales)
                  </label>
                  <textarea
                    rows={2}
                    value={subjective}
                    onChange={(e) => setSubjective(e.target.value)}
                    placeholder="¿Qué refiere el paciente hoy? Adherencia, síntomas, evolución..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    O — Objetivo (Hallazgos positivos al examen físico)
                  </label>
                  <textarea
                    rows={2}
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Auscultación cardiopulmonar, examen abdominal, neurológico..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    P — Plan y Conducta Médica
                  </label>
                  <textarea
                    rows={2}
                    value={planText}
                    onChange={(e) => setPlanText(e.target.value)}
                    placeholder="Ajustes farmacológicos, recomendaciones de estilo de vida y próximo control..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Firma electrónica: <strong>{activeDoctor.name}</strong> (Exeq. {activeDoctor.exequatur} · {activeDoctor.consultorio})
                  </span>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs transition-opacity hover:opacity-95 cursor-pointer"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    Guardar Nota en Expediente
                  </button>
                </div>
              </form>

              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <h4 className="text-xs font-extrabold text-slate-700">
                  Historial de Consultas Previas ({selectedPatient.notes.length})
                </h4>
                {selectedPatient.notes.map((n) => (
                  <div
                    key={n.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className="font-bold"
                        style={{ color: 'var(--brand-heading)' }}
                      >
                        {n.type}
                      </span>
                      <span className="text-slate-500 tabular-nums">
                        {n.date} · <strong>{n.doctor}</strong>
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{n.summary}</p>
                    {n.plan && (
                      <p
                        className="text-[11.5px] font-medium mt-1"
                        style={{ color: 'var(--brand-primary)' }}
                      >
                        Plan: {n.plan}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: Unified Rx + CIE-10 + Labs (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
              <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setConsultRightTab('rx')}
                  className={`py-2 rounded-lg transition-all cursor-pointer ${
                    consultRightTab === 'rx'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Receta ({selectedPatient.medications.length})
                </button>
                <button
                  onClick={() => setConsultRightTab('cie10')}
                  className={`py-2 rounded-lg transition-all cursor-pointer ${
                    consultRightTab === 'cie10'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  CIE-10 ({selectedPatient.diagnoses.length})
                </button>
                <button
                  onClick={() => setConsultRightTab('labs')}
                  className={`py-2 rounded-lg transition-all cursor-pointer ${
                    consultRightTab === 'labs'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Analíticas ({selectedPatient.labOrders.length})
                </button>
              </div>

              {consultRightTab === 'rx' && (
                <div className="space-y-3.5">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 mb-1.5">
                      Vademécum rápido (1 clic para prescribir):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_MEDICATIONS_CATALOG.slice(0, 6).map((item) => {
                        const alreadyAdded = selectedPatient.medications.some(
                          (m) => m.name === item.name
                        );
                        return (
                          <button
                            key={item.name}
                            type="button"
                            disabled={alreadyAdded}
                            onClick={() => onAddMedication(item.name, item.dosage)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                              alreadyAdded
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-teal-50/80 hover:bg-teal-100/80 text-teal-800 border border-teal-200/80 cursor-pointer'
                            }`}
                          >
                            + {item.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold text-slate-700">
                      Medicamentos en la receta actual
                    </h4>
                    {selectedPatient.medications.map((med) => (
                      <div
                        key={med.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-800">{med.name}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">{med.dosage}</p>
                        </div>
                        <button
                          onClick={() => onRemoveMedication(med.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!customMedName.trim()) return;
                      onAddMedication(customMedName.trim(), customMedDose.trim());
                      setCustomMedName('');
                    }}
                    className="pt-2 border-t border-slate-100 space-y-2"
                  >
                    <p className="text-[11px] font-bold text-slate-600">
                      Agregar otro medicamento personalizado:
                    </p>
                    <input
                      type="text"
                      placeholder="Nombre y concentración (ej. Pregabalina 75 mg)"
                      value={customMedName}
                      onChange={(e) => setCustomMedName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Posología"
                        value={customMedDose}
                        onChange={(e) => setCustomMedDose(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-lg text-white text-xs font-bold shrink-0 cursor-pointer"
                        style={{ backgroundColor: 'var(--brand-primary)' }}
                      >
                        Añadir
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {consultRightTab === 'cie10' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={cieSearch}
                      onChange={(e) => setCieSearch(e.target.value)}
                      placeholder="Buscar código o diagnóstico CIE-10..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-500">
                      Diagnósticos activos del paciente:
                    </p>
                    {selectedPatient.diagnoses.map((d) => (
                      <div
                        key={d.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-slate-800">{d.name}</p>
                            <p className="text-[10.5px] text-slate-500">{d.status}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => onRemoveDiagnosis(d.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-500 mb-1.5">
                      Sugerencias CIE-10 frecuentes (clic para añadir):
                    </p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {CIE10_SUGGESTIONS.filter((c) =>
                        c.name.toLowerCase().includes(cieSearch.toLowerCase())
                      ).map((item) => (
                        <button
                          key={item.code}
                          onClick={() => onAddDiagnosis(item.name, 'Confirmado')}
                          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-teal-50 text-xs text-slate-700 flex items-center justify-between transition-colors"
                        >
                          <span>{item.name}</span>
                          <Plus className="w-3.5 h-3.5" style={{ color: 'var(--brand-primary)' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {consultRightTab === 'labs' && (
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 mb-1.5">
                      Solicitar analíticas frecuentes (1 clic):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_LAB_PANELS.map((panel) => (
                        <button
                          key={panel.name}
                          type="button"
                          onClick={() => onAddLabOrder(panel.name, panel.category)}
                          className="px-2.5 py-1 rounded-lg bg-teal-50/80 hover:bg-teal-100 text-teal-800 border border-teal-200/70 text-[11px] font-semibold text-left cursor-pointer"
                        >
                          + {panel.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-extrabold text-slate-700">
                      Estudios solicitados / resultados
                    </h4>
                    {selectedPatient.labOrders.map((lab) => (
                      <div
                        key={lab.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-2"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">{lab.name}</p>
                          <p className="text-[11px] text-slate-500">
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
                          </p>
                        </div>
                        <button
                          onClick={() => onRemoveLabOrder(lab.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. DIRECTORIO DE PACIENTES ==================== */}
      {activeSection === 'Pacientes' && (
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative w-full max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Buscar por nombre, ID, cédula o condición..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                {(['Todos', 'HTA', 'DM2'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setConditionFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      conditionFilter === tab
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'Todos'
                      ? `Todos (${patients.length})`
                      : tab === 'HTA'
                      ? 'Hipertensión'
                      : 'Diabetes DM2'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={onOpenNewPatient}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold transition-opacity hover:opacity-95 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <Plus className="w-4 h-4" />
              Nuevo paciente
            </button>
          </div>

          {patients.length === 0 ? (
            <div className="py-12 text-center space-y-3 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <p className="text-sm font-extrabold text-slate-800">
                Directorio de Pacientes Vacío
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Aún no se han registrado pacientes en el consultorio. Haga clic en «Nuevo paciente» para abrir el primer expediente clínico.
              </p>
              <button
                type="button"
                onClick={onOpenNewPatient}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Primer Paciente</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatients.map((p) => {
                const isSelected = p.id === selectedPatient.id;
                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/30 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shrink-0"
                            style={{ backgroundColor: p.avatarBg, color: p.avatarText }}
                          >
                            {p.initials}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-slate-900 truncate">{p.name}</h3>
                            <p className="text-xs text-slate-500">
                              {p.age} años · {p.gender} · ID: #{p.code}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {p.ars} · Cédula: {p.cedula}
                            </p>
                          </div>
                        </div>
                        {onDeletePatient && (
                          <button
                            type="button"
                            onClick={() => onDeletePatient(p.id)}
                            title="Eliminar expediente"
                            className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="mt-3 text-xs text-slate-600">
                        <span className="text-slate-400">Condiciones: </span>
                        <span
                          className="font-semibold"
                          style={{ color: 'var(--brand-heading)' }}
                        >
                          {p.conditions.join(' · ')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-slate-600">
                        TA: <strong className="tabular-nums">{p.vitals.ta}</strong> · Peso:{' '}
                        <strong className="tabular-nums">{p.vitals.weight}</strong>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            onSelectPatient(p);
                            onNavigate('Fichas Clínicas');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 font-bold transition-colors cursor-pointer"
                        >
                          Fichas MSP (7)
                        </button>
                        <button
                          onClick={() => {
                            onSelectPatient(p);
                            onNavigate('Consulta');
                          }}
                          className="px-3 py-1.5 rounded-lg text-white font-bold transition-opacity hover:opacity-95 cursor-pointer"
                          style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                          Atender →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== 3. AGENDA Y SALA DE ESPERA ==================== */}
      {activeSection === 'Agenda' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 space-y-4">
            <h3
              className="font-extrabold text-base flex items-center gap-2.5"
              style={{ color: 'var(--brand-heading)' }}
            >
              <MacCalendarIcon size="sm" />
              Agendar Cita Rápida
            </h3>
            {patients.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2.5">
                <p>Registre primero un paciente para poder asignarle una cita en la agenda.</p>
                <button
                  type="button"
                  onClick={onOpenNewPatient}
                  className="w-full py-2 rounded-xl text-white font-bold cursor-pointer"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  + Registrar Nuevo Paciente
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const pat = patients.find((p) => p.id === aptPatientId) || selectedPatient;
                  const now = new Date();
                  onAddAppointment({
                    id: `apt-${Date.now()}`,
                    time: aptTime,
                    dateLabel: now.toLocaleDateString('es-DO', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    }),
                    dayNumber: String(now.getDate()).padStart(2, '0'),
                    monthShort: now.toLocaleDateString('es-DO', { month: 'short' }),
                    weekdayShort: now.toLocaleDateString('es-DO', { weekday: 'short' }),
                    title: aptTitle,
                    reason: aptReason || 'Consulta programada',
                    patientName: pat.name,
                    patientId: pat.id,
                    dotColor: 'green',
                    status: 'En sala',
                    room: activeDoctor.consultorio,
                  });
                  setAptReason('');
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Paciente</label>
                  <select
                    value={aptPatientId}
                    onChange={(e) => setAptPatientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (ID: {p.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Tipo de consulta</label>
                  <input
                    type="text"
                    value={aptTitle}
                    onChange={(e) => setAptTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Motivo / Notas</label>
                  <input
                    type="text"
                    placeholder="Motivo de la cita..."
                    value={aptReason}
                    onChange={(e) => setAptReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Hora asignada</label>
                  <input
                    type="text"
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 tabular-nums"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-white font-bold transition-opacity hover:opacity-95 cursor-pointer"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  Agregar a la Agenda de Hoy
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-8 bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3
                  className="font-extrabold text-base capitalize"
                  style={{ color: 'var(--brand-heading)' }}
                >
                  Sala de Espera y Flujo del Día — {todayDisplay}
                </h3>
                <p className="text-xs text-slate-500">
                  Haz clic en "Pasar a Consulta" para abrir el expediente del paciente directamente.
                </p>
              </div>
            </div>

            {appointments.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl bg-slate-50/40">
                No hay citas agendadas para hoy. Use el formulario de la izquierda para programar una consulta.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="py-3.5 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/80 px-3 rounded-xl transition-colors"
                  >
                    <div className="flex items-start gap-3.5">
                      <span
                        className="font-extrabold text-xs tabular-nums w-20 pt-0.5"
                        style={{ color: 'var(--brand-heading)' }}
                      >
                        {apt.time}
                      </span>
                      <div>
                        <p className="font-extrabold text-sm text-slate-900">
                          {apt.patientName}{' '}
                          <span className="font-medium text-xs text-slate-500">· {apt.title}</span>
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">{apt.reason}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Estado actual: <strong className="text-slate-700">{apt.status}</strong> · {apt.room}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {apt.status !== 'Completada' && (
                        <button
                          onClick={() => {
                            onUpdateAppointmentStatus(apt.id, 'En consulta');
                            const pat = patients.find((p) => p.id === apt.patientId);
                            if (pat) onSelectPatient(pat);
                            onNavigate('Consulta');
                          }}
                          className="px-3.5 py-1.5 rounded-xl text-white text-xs font-bold transition-opacity hover:opacity-95 cursor-pointer"
                          style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                          Pasar a Consulta →
                        </button>
                      )}
                      <button
                        onClick={() =>
                          onUpdateAppointmentStatus(
                            apt.id,
                            apt.status === 'Completada' ? 'En sala' : 'Completada'
                          )
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                          apt.status === 'Completada'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {apt.status === 'Completada' ? '✓ Atendido' : 'Marcar Atendido'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 4. PEDIATRÍA & VACUNAS PAI ==================== */}
      {activeSection === 'Pediatría & Vacunas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <MacPediatricIcon size="sm" />
                <div>
                  <h3
                    className="font-extrabold text-base"
                    style={{ color: 'var(--brand-heading)' }}
                  >
                    Control de Crecimiento Infantil (Curvas OMS)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedChild
                      ? `Tutor responsable: ${selectedChild.guardianName}`
                      : 'Registre un paciente pediátrico para graficar su curva OMS'}
                  </p>
                </div>
              </div>

              {pediatricPatients.length > 0 && (
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                  {pediatricPatients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedChildId(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        selectedChild && c.id === selectedChild.id
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {c.name} ({c.ageYears}a)
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedChild ? (
              <>
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-slate-800">
                      Curva OMS: Peso para la edad (0 a 10 años)
                    </span>
                    <span className="text-xs text-emerald-700 font-semibold">
                      {selectedChild.nutritionStatus}
                    </span>
                  </div>
                  <PediatricGrowthChartSvg measurements={selectedChild.measurements} />
                  <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-200/70 text-xs">
                    <div>
                      <span className="text-slate-500 block">Peso actual</span>
                      <strong className="text-base text-slate-900 tabular-nums">
                        {selectedChild.currentWeightKg} kg
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Talla actual</span>
                      <strong className="text-base text-slate-900 tabular-nums">
                        {selectedChild.heightCm} cm
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Percentil OMS</span>
                      <strong
                        className="text-base tabular-nums"
                        style={{ color: 'var(--brand-primary)' }}
                      >
                        Percentil {selectedChild.percentile}
                      </strong>
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const w = parseFloat(newPedWeight);
                    const h = parseFloat(newPedHeight);
                    if (!w || !h) return;
                    onAddPediatricMeasurement(
                      selectedChild.id,
                      selectedChild.ageYears,
                      w,
                      h
                    );
                    setNewPedWeight('');
                    setNewPedHeight('');
                  }}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-end justify-between gap-3"
                >
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Registrar nuevo Peso (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ej. 18.5"
                      value={newPedWeight}
                      onChange={(e) => setNewPedWeight(e.target.value)}
                      className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Nueva Talla (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ej. 105"
                      value={newPedHeight}
                      onChange={(e) => setNewPedHeight(e.target.value)}
                      className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold tabular-nums"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    + Graficar Medición en Curva
                  </button>
                </form>
              </>
            ) : (
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-dashed border-slate-200 text-center space-y-2">
                <p className="text-xs font-bold text-slate-700">
                  Sin pacientes pediátricos registrados aún
                </p>
                <p className="text-[11px] text-slate-500">
                  Agregue un niño o niña debajo para iniciar su seguimiento antropométrico OMS.
                </p>
              </div>
            )}

            {/* Formulario para agregar nuevo paciente pediátrico */}
            {onAddPediatricPatient && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newChildName.trim()) return;
                  const ageNum = parseFloat(newChildAge) || 2;
                  const wNum = parseFloat(newChildInitWeight) || 12.5;
                  const hNum = parseFloat(newChildInitHeight) || 86;
                  const bmiNum = Number(((wNum / ((hNum / 100) * (hNum / 100))) || 16).toFixed(1));
                  const createdChild: PediatricPatient = {
                    id: `ped-${Date.now()}`,
                    name: newChildName.trim(),
                    ageYears: ageNum,
                    gender: newChildGender,
                    guardianName: newChildGuardian.trim() || 'Padre / Madre / Tutor',
                    currentWeightKg: wNum,
                    percentile: 50,
                    heightCm: hNum,
                    bmi: bmiNum,
                    lastCheck: new Date().toLocaleDateString('es-DO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    }),
                    nutritionStatus: 'Eutrófico (Seguimiento OMS activo)',
                    measurements: [{ age: ageNum, weight: wNum, height: hNum }],
                  };
                  onAddPediatricPatient(createdChild);
                  setSelectedChildId(createdChild.id);
                  setNewChildName('');
                  setNewChildAge('');
                  setNewChildGuardian('');
                  setNewChildInitWeight('');
                  setNewChildInitHeight('');
                }}
                className="p-4 rounded-2xl bg-teal-50/40 border border-teal-200/80 space-y-3 text-xs"
              >
                <span className="font-extrabold text-teal-950 block">
                  + Registrar Niño(a) en Control Pediátrico OMS
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    required
                    placeholder="Nombre del niño(a) *"
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Edad en años (ej. 4)"
                    value={newChildAge}
                    onChange={(e) => setNewChildAge(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Madre / Padre / Tutor"
                    value={newChildGuardian}
                    onChange={(e) => setNewChildGuardian(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                  <select
                    value={newChildGender}
                    onChange={(e) => setNewChildGender(e.target.value as 'Masculino' | 'Femenino')}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Femenino">Femenino</option>
                    <option value="Masculino">Masculino</option>
                  </select>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Peso inicial kg (ej. 16.5)"
                    value={newChildInitWeight}
                    onChange={(e) => setNewChildInitWeight(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Talla inicial cm (ej. 102)"
                    value={newChildInitHeight}
                    onChange={(e) => setNewChildInitHeight(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white font-bold cursor-pointer"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  Guardar Paciente Pediátrico
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <MacSyringeIcon size="sm" />
              <div>
                <h3
                  className="font-extrabold text-base"
                  style={{ color: 'var(--brand-heading)' }}
                >
                  Esquema de Vacunación (PAI - RD)
                </h3>
                <p className="text-xs text-slate-500">
                  Control de dosis aplicadas y pendientes de la familia.
                </p>
              </div>
            </div>

            {onAddVaccine && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newVacNameInput.trim()) return;
                  onAddVaccine({
                    id: `vac-${Date.now()}`,
                    vaccineName: newVacNameInput.trim(),
                    patientName:
                      newVacPatientInput.trim() ||
                      selectedChild?.name ||
                      (hasRealPatient ? selectedPatient.name : 'Paciente UNAP'),
                    ageGroup: selectedChild ? `${selectedChild.ageYears} años` : 'Esquema PAI',
                    dose: newVacDoseInput,
                    date: new Date().toLocaleDateString('es-DO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    }),
                    status: 'Aplicada',
                    lot: 'PAI-RD',
                  });
                  setNewVacNameInput('');
                  setNewVacPatientInput('');
                }}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
              >
                <span className="font-bold text-slate-700 block">
                  + Registrar Biológico / Vacuna PAI
                </span>
                <input
                  type="text"
                  required
                  placeholder="Biológico (ej. Pentavalente, SRP, Influenza, Td)"
                  value={newVacNameInput}
                  onChange={(e) => setNewVacNameInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nombre del paciente"
                    value={newVacPatientInput}
                    onChange={(e) => setNewVacPatientInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Dosis"
                    value={newVacDoseInput}
                    onChange={(e) => setNewVacDoseInput(e.target.value)}
                    className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg text-white font-bold cursor-pointer"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    Añadir
                  </button>
                </div>
              </form>
            )}

            {vaccines.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Sin registros de vacunación PAI cargados. Utilice el formulario superior para registrar una dosis.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {vaccines.map((v) => (
                  <div key={v.id} className="py-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-xs text-slate-900">{v.vaccineName}</p>
                        <p className="text-[11px] text-slate-500">
                          {v.patientName} ({v.ageGroup}) · {v.dose} · {v.date}
                        </p>
                      </div>
                      <button
                        onClick={() => onToggleVaccineStatus(v.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer shrink-0 ${
                          v.status === 'Aplicada'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {v.status === 'Aplicada' ? '✓ Aplicada' : 'Registrar Dosis'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 5. RECETAS Y ÓRDENES DE LABORATORIO ==================== */}
      {activeSection === 'Recetas & Labs' && !hasRealPatient && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-10 text-center max-w-xl mx-auto my-6 space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
            <Pill className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">
            Recetario Oficial Ley 42-01 y Órdenes de Laboratorio
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Registre un paciente para emitir recetas médicas firmadas con su Exequátur y órdenes de analíticas clínicas.
          </p>
          <button
            type="button"
            onClick={onOpenNewPatient}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs cursor-pointer"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Primer Paciente</span>
          </button>
        </div>
      )}
      {activeSection === 'Recetas & Labs' && hasRealPatient && (
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3
                className="font-extrabold text-base"
                style={{ color: 'var(--brand-heading)' }}
              >
                Centro de Recetas y Analíticas — {selectedPatient.name}
              </h3>
              <p className="text-xs text-slate-500">
                Documento oficial listo para firma y sello bajo Ley General de Salud 42-01.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('Consulta')}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Editar en Estación de Consulta
              </button>
              <button
                onClick={onOpenPrintRx}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Printer className="w-4 h-4" />
                Vista Previa e Imprimir (Ley 42-01)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <h4 className="text-xs font-extrabold text-slate-700">
                Medicamentos Prescritos ({selectedPatient.medications.length})
              </h4>
              {selectedPatient.medications.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">
                  Sin medicamentos prescritos actualmente.
                </p>
              ) : (
                selectedPatient.medications.map((med) => (
                  <div
                    key={med.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{med.name}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{med.dosage}</p>
                    </div>
                    <button
                      onClick={() => onRemoveMedication(med.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-extrabold text-slate-700">
                Órdenes de Laboratorio y Gabinete ({selectedPatient.labOrders.length})
              </h4>
              {selectedPatient.labOrders.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">
                  Sin estudios de laboratorio activos.
                </p>
              ) : (
                selectedPatient.labOrders.map((lab) => (
                  <div
                    key={lab.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{lab.name}</p>
                      <p className="text-xs text-slate-500">
                        {lab.category} · {lab.status}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemoveLabOrder(lab.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 6. REPORTES EPIDEMIOLÓGICOS (EPI-1) Y ESTADÍSTICAS UNAP ==================== */}
      {activeSection === 'Reportes & EPI' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                SINAVE / Dirección General de Epidemiología (DIGEPI - MSP)
              </span>
              <h3
                className="font-extrabold text-lg"
                style={{ color: 'var(--brand-heading)' }}
              >
                Vigilancia Epidemiológica (EPI-1) y Producción Mensual UNAP
              </h3>
              <p className="text-xs text-slate-500">
                Consolidado estadístico de morbilidad, control de crónicos (HEARTS), cobertura PAI y distribución por ARS.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const csvRows = [
                    ['Codigo', 'Paciente', 'Edad', 'Sexo', 'Cedula', 'ARS', 'TA', 'Condiciones'],
                    ...patients.map((p) => [
                      p.code,
                      p.name,
                      String(p.age),
                      p.gender,
                      p.cedula,
                      p.ars,
                      p.vitals.ta,
                      p.conditions.join(' / '),
                    ]),
                  ];
                  const csvContent =
                    'data:text/csv;charset=utf-8,' +
                    encodeURIComponent(csvRows.map((r) => r.join(',')).join('\n'));
                  const a = document.createElement('a');
                  a.href = csvContent;
                  a.download = 'reporte_produccion_unap_familia_plus.csv';
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 cursor-pointer"
              >
                Exportar Consolidado CSV
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Boleta EPI-1</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80">
              <span className="text-[11px] font-bold uppercase text-slate-400">
                Población Adscrita Activa
              </span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                {patients.length} familias
              </p>
              <span className="text-xs text-emerald-700 font-semibold">
                100% con Ficha Familiar MSP
              </span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80">
              <span className="text-[11px] font-bold uppercase text-slate-400">
                Cohorte Hipertensión (CIE-10 I10)
              </span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                {
                  patients.filter((p) =>
                    p.conditions.some((c) => c.toLowerCase().includes('hipertens'))
                  ).length
                }{' '}
                pacientes
              </p>
              <span className="text-xs text-teal-700 font-semibold">
                Iniciativa HEARTS · Control TA &lt;140/90
              </span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80">
              <span className="text-[11px] font-bold uppercase text-slate-400">
                Cohorte Diabetes DM2 (CIE-10 E11)
              </span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                {
                  patients.filter((p) =>
                    p.conditions.some(
                      (c) =>
                        c.toLowerCase().includes('diabet') ||
                        c.toLowerCase().includes('dm2')
                    )
                  ).length
                }{' '}
                pacientes
              </p>
              <span className="text-xs text-teal-700 font-semibold">
                Monitoreo HbA1c y Pie Diabético
              </span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80">
              <span className="text-[11px] font-bold uppercase text-slate-400">
                Cobertura Vacunación PAI
              </span>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1 tabular-nums">
                {Math.round(
                  (vaccines.filter((v) => v.status === 'Aplicada').length /
                    Math.max(1, vaccines.length)) *
                    100
                )}
                %
              </p>
              <span className="text-xs text-slate-500">
                {vaccines.filter((v) => v.status === 'Aplicada').length} de{' '}
                {vaccines.length} dosis al día
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Notificación Semanal EPI-1 */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-l-3 border-teal-600 pl-2.5">
                Eventos de Notificación Obligatoria Semanal (Formulario EPI-1 · DIGEPI)
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="py-2.5 px-3">Evento / Síndrome Vigilado</th>
                      <th className="py-2.5 px-3">Código CIE-10</th>
                      <th className="py-2.5 px-3">Casos Semana</th>
                      <th className="py-2.5 px-3">Estado Epidemiológico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        Síndrome Febril Agudo / Sospecha de Dengue
                      </td>
                      <td className="py-2 px-3 font-mono-clinical">A97 / R50</td>
                      <td className="py-2 px-3 font-mono-clinical font-bold">0 casos</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                          Vigilancia activa negativa
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        Infección Respiratoria Aguda (IRA Alta / Gripe)
                      </td>
                      <td className="py-2 px-3 font-mono-clinical">J00 - J06</td>
                      <td className="py-2 px-3 font-mono-clinical font-bold">
                        {
                          patients.filter((p) =>
                            p.diagnoses.some((d) => d.code.startsWith('J'))
                          ).length
                        }{' '}
                        casos
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-bold text-[11px]">
                          Vigilancia activa
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        Enfermedad Diarreica Aguda (EDA)
                      </td>
                      <td className="py-2 px-3 font-mono-clinical">A09</td>
                      <td className="py-2 px-3 font-mono-clinical font-bold">0 casos</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                          Sin casos reportados
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        Hipertensión Arterial en Seguimiento
                      </td>
                      <td className="py-2 px-3 font-mono-clinical">I10</td>
                      <td className="py-2 px-3 font-mono-clinical font-bold">
                        {
                          patients.filter((p) =>
                            p.conditions.some((c) =>
                              c.toLowerCase().includes('hipertens')
                            )
                          ).length
                        }{' '}
                        casos
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold text-[11px]">
                          Cohorte HEARTS
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Distribución por Seguro Médico ARS */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-l-3 border-teal-600 pl-2.5">
                Distribución de Cartera por Seguro Médico (ARS - SDSS)
              </h4>
              <div className="space-y-2.5 text-xs">
                {[
                  {
                    name: 'ARS SENASA Contributivo / Subsidiado',
                    count: patients.filter((p) => p.ars.includes('SENASA')).length,
                  },
                  {
                    name: 'ARS Primera (Humano)',
                    count: patients.filter((p) => p.ars.includes('Primera')).length,
                  },
                  {
                    name: 'ARS Universal',
                    count: patients.filter((p) => p.ars.includes('Universal')).length,
                  },
                  {
                    name: 'ARS Mapfre / Privado / Otros',
                    count: patients.filter(
                      (p) =>
                        !p.ars.includes('SENASA') &&
                        !p.ars.includes('Primera') &&
                        !p.ars.includes('Universal')
                    ).length,
                  },
                ].map((arsItem) => {
                  const pct =
                    patients.length > 0
                      ? Math.round((arsItem.count / patients.length) * 100)
                      : 0;
                  return (
                    <div key={arsItem.name} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{arsItem.name}</span>
                        <span className="font-mono-clinical text-slate-500">
                          {arsItem.count} pacientes ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: 'var(--brand-primary)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 7. CONFIGURACIÓN DEL EQUIPO MÉDICO FAMILIAR Y CONSULTORIOS ==================== */}
      {activeSection === 'Configuración' && (
        <div className="space-y-5">
          {/* Active Physician Credentials Editor */}
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                  Credenciales del Médico Activo en Guardia (Sincronizadas en Firebase)
                </span>
                <h3
                  className="font-extrabold text-lg"
                  style={{ color: 'var(--brand-heading)' }}
                >
                  Perfil Profesional: {activeDoctor.name} ({activeDoctor.consultorio})
                </h3>
                <p className="text-xs text-slate-500">
                  Sus datos aparecen automáticamente en el membrete y firma de todas las recetas Ley 42-01, evoluciones SOAP y las 7 fichas clínicas MSP que emita.
                </p>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-extrabold">
                Médico en Turno Activo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Médico Familiar
                </label>
                <input
                  type="text"
                  value={activeDoctor.name}
                  onChange={(e) => onUpdateDoctorProfile({ name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Exequátur Poder Ejecutivo (RD)
                </label>
                <input
                  type="text"
                  value={activeDoctor.exequatur}
                  onChange={(e) => onUpdateDoctorProfile({ exequatur: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono-clinical font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Colegio Médico Dominicano (CMD)
                </label>
                <input
                  type="text"
                  value={activeDoctor.cmd}
                  onChange={(e) => onUpdateDoctorProfile({ cmd: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono-clinical"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Consultorio Asignado
                </label>
                <input
                  type="text"
                  value={activeDoctor.consultorio}
                  onChange={(e) => onUpdateDoctorProfile({ consultorio: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Especialidad / Programa en la UNAP
                </label>
                <input
                  type="text"
                  value={activeDoctor.specialty}
                  onChange={(e) => onUpdateDoctorProfile({ specialty: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Unidad de Atención Primaria (UNAP / CPN)
                </label>
                <input
                  type="text"
                  value={activeDoctor.unapCenter}
                  onChange={(e) => onUpdateDoctorProfile({ unapCenter: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Multi-Doctor Team Roster & Quick Switcher */}
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-base text-slate-900">
                  Equipo de Médicos Familiares del Centro ({doctorsTeam.length} médico{doctorsTeam.length === 1 ? '' : 's'} registrado{doctorsTeam.length === 1 ? '' : 's'})
                </h4>
                <p className="text-xs text-slate-500">
                  Cambie de médico en 1 clic durante el cambio de guardia o registre un nuevo especialista de medicina familiar.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {doctorsTeam.map((docMember) => {
                const isCurrent = docMember.id === activeDoctor.id;
                return (
                  <div
                    key={docMember.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      isCurrent
                        ? 'bg-teal-50/50 border-teal-600 shadow-2xs'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-xl text-white font-extrabold text-sm flex items-center justify-center shrink-0"
                        style={{ backgroundColor: docMember.avatarBg }}
                      >
                        {docMember.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-extrabold text-slate-900 truncate">
                            {docMember.name}
                          </p>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-600 text-white">
                              En turno
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 truncate">
                          {docMember.specialty}
                        </p>
                        <p className="text-[11px] font-mono-clinical text-slate-500 mt-0.5">
                          Exeq. {docMember.exequatur} · {docMember.cmd} · {docMember.consultorio}
                        </p>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => onSelectDoctor(docMember)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50 border border-slate-300 text-xs font-bold text-slate-800 shrink-0 cursor-pointer"
                      >
                        Activar guardia
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Another Family Physician Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTeamDocName.trim()) return;
                const formatted =
                  newTeamDocName.trim().toLowerCase().startsWith('dr')
                    ? newTeamDocName.trim()
                    : `Dr(a). ${newTeamDocName.trim()}`;
                const cleanParts = newTeamDocName
                  .replace(/dr\(a\)\.|dra\.|dr\./gi, '')
                  .trim()
                  .split(/\s+/);
                const initials =
                  cleanParts.length >= 2
                    ? `${cleanParts[0][0]}${cleanParts[1][0]}`.toUpperCase()
                    : cleanParts[0].slice(0, 2).toUpperCase();

                onAddDoctor({
                  id: `doc-${Date.now()}`,
                  name: formatted,
                  initials,
                  email: `${cleanParts[0].toLowerCase()}@familiaplus.do`,
                  exequatur: newTeamDocExeq.trim() || 'Pendiente',
                  cmd: newTeamDocCmd.trim() || 'Pendiente',
                  specialty: newTeamDocSpec,
                  consultorio: newTeamDocCons,
                  unapCenter: activeDoctor.unapCenter,
                  shift: 'Matutino (8:00 a.m. – 2:00 p.m.)',
                  avatarBg: '#0f766e',
                  updatedAt: new Date().toISOString(),
                });
                setNewTeamDocName('');
                setNewTeamDocExeq('');
                setNewTeamDocCmd('');
              }}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-end gap-3 text-xs"
            >
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Agregar Nuevo Médico Familiar al Equipo
                </label>
                <input
                  type="text"
                  placeholder="Nombre completo del médico(a)"
                  value={newTeamDocName}
                  onChange={(e) => setNewTeamDocName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div className="w-28">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Exequátur
                </label>
                <input
                  type="text"
                  placeholder="Ej. 512-20"
                  value={newTeamDocExeq}
                  onChange={(e) => setNewTeamDocExeq(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono-clinical"
                />
              </div>
              <div className="w-28">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  CMD
                </label>
                <input
                  type="text"
                  placeholder="Ej. CMD 15400"
                  value={newTeamDocCmd}
                  onChange={(e) => setNewTeamDocCmd(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono-clinical"
                />
              </div>
              <div className="w-36">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Consultorio
                </label>
                <input
                  type="text"
                  value={newTeamDocCons}
                  onChange={(e) => setNewTeamDocCons(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-white font-bold flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Incorporar Médico</span>
              </button>
            </form>
          </div>

          {/* Clean / Reset Workspace Section */}
          {onResetAllData && (
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-rose-200/80 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">
                  Mantenimiento y Limpieza de Datos del Consultorio
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Limpia todas las listas locales de pacientes, citas, pediatría, vacunas y alertas para dejar el sistema en cero.
                </p>
              </div>
              <button
                type="button"
                onClick={onResetAllData}
                className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Dejar Sistema en Blanco (Limpiar Datos)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


