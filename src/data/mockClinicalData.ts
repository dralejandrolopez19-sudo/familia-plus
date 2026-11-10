export interface VitalSigns {
  ta: string; // e.g. "120 / 80"
  fc: string; // e.g. "72"
  temp: string; // e.g. "36.5 °C"
  weight: string; // e.g. "70.0 kg"
  heightCm?: number; // e.g. 165
  spo2?: string; // e.g. "98%"
  glucose?: string; // e.g. "95 mg/dL"
}

export interface DiagnosisItem {
  id: string;
  code: string;
  name: string;
  status: 'Confirmado' | 'En seguimiento' | 'Sospecha';
  badgeColor: 'green' | 'blue' | 'orange';
}

export interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  duration?: string;
}

export interface ClinicalNote {
  id: string;
  date: string;
  type: string;
  subjective?: string;
  objective?: string;
  summary: string;
  plan?: string;
  doctor: string;
}

export interface LabOrderItem {
  id: string;
  name: string;
  category: 'Hematología' | 'Química Clínica' | 'Orina / Heces' | 'Cardiología / Imagen';
  status: 'Solicitado' | 'Completado';
  resultSummary?: string;
  date: string;
}

export interface Patient {
  id: string;
  code: string;
  name: string;
  initials: string;
  age: number;
  gender: 'Femenino' | 'Masculino';
  avatarBg: string;
  avatarText: string;
  conditions: string[];
  allergies: string[];
  vitals: VitalSigns;
  diagnoses: DiagnosisItem[];
  managementPlan: string[];
  medications: MedicationItem[];
  indications: string[];
  labOrders: LabOrderItem[];
  cedula: string;
  phone: string;
  bloodType: string;
  ars: string; // Seguro médico en RD (SENASA, Primera, Universal, Mapfre)
  address: string;
  lastVisit: string;
  nextFollowUp: string;
  notes: ClinicalNote[];
}

export interface AppointmentItem {
  id: string;
  time: string;
  dateLabel: string;
  dayNumber: string;
  monthShort: string;
  weekdayShort: string;
  title: string;
  reason: string;
  patientName: string;
  patientId: string;
  dotColor: 'blue' | 'green' | 'purple' | 'orange';
  status: 'En sala' | 'En consulta' | 'Confirmada' | 'Completada';
  room: string;
}

export interface PediatricPatient {
  id: string;
  name: string;
  ageYears: number;
  gender: 'Masculino' | 'Femenino';
  guardianName: string;
  currentWeightKg: number;
  percentile: number;
  heightCm: number;
  bmi: number;
  lastCheck: string;
  nutritionStatus: string;
  measurements: { age: number; weight: number; height: number }[];
}

export interface AlertItem {
  id: string;
  type: 'urgent' | 'vaccine' | 'info';
  title: string;
  patientName: string;
  patientId: string;
  dueDate: string;
  resolved: boolean;
}

export interface ActivityItem {
  id: string;
  type: 'consulta' | 'receta' | 'nota';
  title: string;
  timestamp: string;
  detail: string;
}

export interface MonthlyStatsData {
  monthLabel: string;
  consultas: number;
  adherencia: number;
  vacunas: number;
  ninosControlados: number;
  trendPoints: number[];
}

export interface VaccineRecord {
  id: string;
  vaccineName: string;
  patientName: string;
  ageGroup: string;
  dose: string;
  date: string;
  status: 'Aplicada' | 'Pendiente' | 'Próxima';
  lot: string;
}

export interface SoapTemplate {
  id: string;
  label: string;
  type: string;
  subjective: string;
  objective: string;
  plan: string;
}

export function formatDominicanDate(date: Date = new Date()): string {
  return date.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDominicanDateTime(date: Date = new Date()): string {
  const datePart = formatDominicanDate(date);
  const timePart = date.toLocaleTimeString('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart} · ${timePart}`;
}

export const SOAP_TEMPLATES: SoapTemplate[] = [
  {
    id: 'tpl-hta',
    label: 'Control HTA / Metabólico',
    type: 'Control de Crónicos (HTA / DM2)',
    subjective:
      'Paciente acude a control periódico. Refiere buena adherencia al tratamiento farmacológico. Niega cefalea, mareos, dolor torácico, disnea o visión borrosa.',
    objective:
      'Consciente, orientado, hidratado. Ruidos cardíacos regulares sin soplos. Campos pulmonares limpios y bien ventilados. Miembros inferiores sin edema.',
    plan:
      'Continuar esquema antihipertensivo e hipoglucemiante actual. Dieta hiposódica, caminata 30 min/día y control de laboratorios en 3 meses.',
  },
  {
    id: 'tpl-prev',
    label: 'Chequeo Preventivo Anual',
    type: 'Evaluación Preventiva Familiar',
    subjective:
      'Acude asintomático para evaluación médica preventiva anual y actualización de analíticas de rutina.',
    objective:
      'Buen estado general. Examen cardiopulmonar y abdominal dentro de parámetros normales. Peso e IMC estables.',
    plan:
      'Se solicita hemograma, perfil lipídico, glucemia basal, creatinina y examen general de orina. Educación en hábitos saludables.',
  },
  {
    id: 'tpl-ira',
    label: 'Infección Respiratoria Alta',
    type: 'Consulta Aguda Respiratoria',
    subjective:
      'Inicia cuadro clínico con rinorrea hialina, odinofagia moderada y malestar general sin disnea.',
    objective:
      'Orofaringe hiperémica sin exudados purulentos. Otoscopia bilateral normal. Campos pulmonares sin estertores ni sibilancias. SpO2 98%.',
    plan:
      'Tratamiento sintomático, hidratación abundante, lavado nasal con solución salina y signos de alarma explicados.',
  },
];

export const QUICK_MEDICATIONS_CATALOG: { name: string; dosage: string }[] = [
  { name: 'Losartán 50 mg', dosage: '1 tableta cada 12 horas – 30 días' },
  { name: 'Metformina 850 mg', dosage: '1 tableta con desayuno y cena – 30 días' },
  { name: 'Atorvastatina 20 mg', dosage: '1 tableta cada noche – 30 días' },
  { name: 'Amlodipino 5 mg', dosage: '1 tableta cada mañana – 30 días' },
  { name: 'Enalapril 20 mg', dosage: '1 tableta cada 12 horas – 30 días' },
  { name: 'Empagliflozina 10 mg', dosage: '1 tableta en ayunas – 30 días' },
  { name: 'Omeprazol 20 mg', dosage: '1 cápsula en ayunas – 14 días' },
  { name: 'Acetaminofén 500 mg', dosage: '1 tableta cada 8 horas si hay dolor o fiebre – 5 días' },
  { name: 'Amoxicilina + Ác. Clavulánico 875/125 mg', dosage: '1 tableta cada 12 horas – 7 días' },
];

export const QUICK_LAB_PANELS: {
  name: string;
  category: LabOrderItem['category'];
}[] = [
  { name: 'Hemograma Completo', category: 'Hematología' },
  { name: 'Hemoglobina Glucosilada (HbA1c)', category: 'Química Clínica' },
  { name: 'Glucemia en Ayunas', category: 'Química Clínica' },
  { name: 'Perfil Lipídico Completo (Colesterol, LDL, HDL, Triglicéridos)', category: 'Química Clínica' },
  { name: 'Creatinina Sérica + TFG + Microalbuminuria', category: 'Química Clínica' },
  { name: 'Perfil Tiroideo (TSH, T4 Libre)', category: 'Química Clínica' },
  { name: 'Examen General de Orina (EGO)', category: 'Orina / Heces' },
  { name: 'Electrocardiograma en Reposo (12 derivaciones)', category: 'Cardiología / Imagen' },
];

export const CIE10_SUGGESTIONS: {
  code: string;
  name: string;
  defaultColor: 'green' | 'blue' | 'orange';
}[] = [
  { code: 'I10', name: 'HTA esencial (I10)', defaultColor: 'green' },
  { code: 'E11', name: 'Diabetes Mellitus tipo 2 (E11)', defaultColor: 'blue' },
  { code: 'E78', name: 'Dislipidemia (E78)', defaultColor: 'orange' },
  { code: 'J45', name: 'Asma bronquial (J45)', defaultColor: 'blue' },
  { code: 'E66', name: 'Obesidad y sobrepeso (E66)', defaultColor: 'orange' },
  { code: 'E03', name: 'Hipotiroidismo (E03.9)', defaultColor: 'blue' },
  { code: 'K21', name: 'Enfermedad por reflujo gastroesofágico (K21)', defaultColor: 'orange' },
  { code: 'M54', name: 'Lumbago no especificado (M54.5)', defaultColor: 'green' },
  { code: 'J06', name: 'Infección aguda de vías respiratorias superiores (J06.9)', defaultColor: 'green' },
  { code: 'N39', name: 'Infección de vías urinarias (N39.0)', defaultColor: 'orange' },
  { code: 'Z00', name: 'Examen médico general (Z00.0)', defaultColor: 'green' },
];

// Estado inicial limpio (sin pacientes ni datos ficticios) para uso real en el consultorio
export const INITIAL_PATIENTS: Patient[] = [];

export const TODAY_APPOINTMENTS: AppointmentItem[] = [];

export const UPCOMING_APPOINTMENTS: AppointmentItem[] = [];

export const PEDIATRIC_PATIENTS: PediatricPatient[] = [];

export const INITIAL_ALERTS: AlertItem[] = [];

export const INITIAL_ACTIVITIES: ActivityItem[] = [];

export const INITIAL_VACCINES: VaccineRecord[] = [];

export const MONTHLY_STATS_BY_PERIOD: Record<string, MonthlyStatsData> = {
  'Mes Actual': {
    monthLabel: 'Mes Actual',
    consultas: 0,
    adherencia: 100,
    vacunas: 0,
    ninosControlados: 0,
    trendPoints: [0, 0, 0, 0, 0, 0, 0, 0],
  },
};
