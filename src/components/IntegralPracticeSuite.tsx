import React, { useState } from 'react';
import {
  FileCheck2,
  Receipt,
  TrendingUp,
  Calculator,
  MapPin,
  Network,
  Printer,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Stethoscope,
  X,
} from 'lucide-react';
import { Patient, formatDominicanDate } from '../data/mockClinicalData';
import { HomeVisitRecord } from '../data/clinicalFormsData';
import { DoctorProfile } from '../data/doctorsData';
import { DominicanFlagIcon, FamiliaLogoEmblem } from './BrandVisuals';
import { FamiliogramaEcomapaCanvas } from './FamiliogramaEcomapaCanvas';

export interface MedicalCertificateRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientCedula: string;
  patientAge: number;
  type:
    | 'Licencia / Incapacidad Médica'
    | 'Certificado Médico de Salud y Aptitud'
    | 'Consentimiento Informado de Procedimiento'
    | 'Constancia de Asistencia a Consulta';
  dateIssued: string;
  diagnosisCie10: string;
  restDays: string;
  clinicalSummaryAndFindings: string;
  destinationEntity: string;
  doctorName: string;
  doctorExequatur: string;
  doctorCmd: string;
  unapCenter: string;
}

export interface ArsClaimRecord {
  id: string;
  date: string;
  patientId: string;
  patientName: string;
  patientCedula: string;
  arsName: string;
  nssNumber: string;
  authorizationCode: string;
  serviceCodeSimon: string;
  serviceDescription: string;
  diagnosisCie10: string;
  arsCoveredAmountDop: number;
  patientCopayDop: number;
  status: 'Autorizado' | 'Facturado a ARS' | 'Pagado';
  doctorName: string;
}

export interface LabBiomarkerEntry {
  id: string;
  patientId: string;
  date: string;
  hba1c: number;
  systolicBp: number;
  diastolicBp: number;
  fastingGlucose: number;
  ldlCholesterol: number;
  egfr: number;
  imagingOrEkgSummary: string;
}

interface IntegralPracticeSuiteProps {
  patients: Patient[];
  selectedPatient: Patient | null;
  activeDoctor: DoctorProfile;
  homeVisits: HomeVisitRecord[];
  certificates: MedicalCertificateRecord[];
  onAddCertificate: (cert: MedicalCertificateRecord) => void;
  onDeleteCertificate: (id: string) => void;
  arsClaims: ArsClaimRecord[];
  onAddArsClaim: (claim: ArsClaimRecord) => void;
  onUpdateArsClaimStatus: (id: string, status: ArsClaimRecord['status']) => void;
  onDeleteArsClaim: (id: string) => void;
  labTrends: LabBiomarkerEntry[];
  onAddLabTrend: (entry: LabBiomarkerEntry) => void;
  onDeleteLabTrend: (id: string) => void;
  onSelectPatient: (patient: Patient) => void;
  onAddClinicalNoteToPatient: (
    patientId: string,
    summary: string,
    type: string,
    subjective?: string,
    objective?: string,
    plan?: string
  ) => void;
  onOpenNewPatient: () => void;
  onTriggerToast: (msg: string) => void;
}

const SIMON_PROCEDURES_CATALOG = [
  {
    code: '890201',
    name: 'Consulta Ambulatoria de Medicina Familiar',
    arsTariff: 1000,
    copay: 300,
  },
  {
    code: '890105',
    name: 'Consulta y Atención Médica a Domicilio (UNAP)',
    arsTariff: 1500,
    copay: 350,
  },
  {
    code: '930001',
    name: 'Electrocardiograma de 12 Derivaciones (EKG)',
    arsTariff: 850,
    copay: 200,
  },
  {
    code: '946400',
    name: 'Terapia Respiratoria / Nebulización en Consultorio',
    arsTariff: 450,
    copay: 100,
  },
  {
    code: '110420',
    name: 'Cura Avanzada de Herida / Úlcera por Presión',
    arsTariff: 780,
    copay: 150,
  },
  {
    code: '881410',
    name: 'Toma de Citología Cervical (Papanicolaou)',
    arsTariff: 650,
    copay: 100,
  },
];

export const IntegralPracticeSuite: React.FC<IntegralPracticeSuiteProps> = ({
  patients,
  selectedPatient,
  activeDoctor,
  homeVisits,
  certificates,
  onAddCertificate,
  onDeleteCertificate,
  arsClaims,
  onAddArsClaim,
  onUpdateArsClaimStatus,
  onDeleteArsClaim,
  labTrends,
  onAddLabTrend,
  onDeleteLabTrend,
  onSelectPatient,
  onAddClinicalNoteToPatient,
  onOpenNewPatient,
  onTriggerToast,
}) => {
  const [activeSuiteTab, setActiveSuiteTab] = useState<
    'certificados' | 'ars' | 'evolucion-labs' | 'calculadoras' | 'sectorizacion' | 'familiograma'
  >('certificados');

  const activePat = selectedPatient || patients[0] || null;

  // ==========================================================================
  // 1. CERTIFICADOS MÉDICO-LEGALES (LEY 42-01) STATE
  // ==========================================================================
  const [certType, setCertType] = useState<MedicalCertificateRecord['type']>(
    'Licencia / Incapacidad Médica'
  );
  const [certDiagnosis, setCertDiagnosis] = useState(
    activePat?.diagnoses[0]?.name || 'Hipertensión esencial (I10)'
  );
  const [certRestDays, setCertRestDays] = useState('3 días (72 horas)');
  const [certDestination, setCertDestination] = useState(
    'A quien pueda interesar / Departamento de Recursos Humanos'
  );
  const [certFindings, setCertFindings] = useState(
    'Paciente evaluado clínicamente en este centro de Medicina Familiar. Se indica reposo médico y seguimiento ambulatorio.'
  );
  const [printCertificateModal, setPrintCertificateModal] =
    useState<MedicalCertificateRecord | null>(null);

  const handleIssueCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    const newCert: MedicalCertificateRecord = {
      id: `CERT-${Date.now().toString().slice(-6)}`,
      patientId: activePat?.id || 'general',
      patientName: activePat?.name || 'Paciente General',
      patientCedula: activePat?.cedula || 'Sin registrar',
      patientAge: activePat?.age || 35,
      type: certType,
      dateIssued: formatDominicanDate(),
      diagnosisCie10: certDiagnosis,
      restDays: certRestDays,
      clinicalSummaryAndFindings: certFindings,
      destinationEntity: certDestination,
      doctorName: activeDoctor.name,
      doctorExequatur: activeDoctor.exequatur,
      doctorCmd: activeDoctor.cmd,
      unapCenter: `${activeDoctor.unapCenter} (${activeDoctor.consultorio})`,
    };
    onAddCertificate(newCert);
    setPrintCertificateModal(newCert);
  };

  // ==========================================================================
  // 2. AUTORIZACIONES ARS & FACTURACIÓN SISALRIL STATE
  // ==========================================================================
  const [arsNss, setArsNss] = useState('101-0092837-1');
  const [arsAuthCode, setArsAuthCode] = useState(
    () => `AUT-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [arsSimonCode, setArsSimonCode] = useState(SIMON_PROCEDURES_CATALOG[0].code);
  const [arsServiceDesc, setArsServiceDesc] = useState(SIMON_PROCEDURES_CATALOG[0].name);
  const [arsCoveredDop, setArsCoveredDop] = useState(
    String(SIMON_PROCEDURES_CATALOG[0].arsTariff)
  );
  const [arsCopayDop, setArsCopayDop] = useState(
    String(SIMON_PROCEDURES_CATALOG[0].copay)
  );
  const [arsDiag, setArsDiag] = useState(
    activePat?.diagnoses[0]?.name || 'Consulta Medicina Familiar (Z00.0)'
  );

  const handleCreateArsClaim = (e: React.FormEvent) => {
    e.preventDefault();
    const claim: ArsClaimRecord = {
      id: `ARS-${Date.now().toString().slice(-6)}`,
      date: formatDominicanDate(),
      patientId: activePat?.id || 'general',
      patientName: activePat?.name || 'Paciente Ambulatorio',
      patientCedula: activePat?.cedula || '—',
      arsName: activePat?.ars || 'ARS SENASA Contributivo',
      nssNumber: arsNss.trim() || 'Sin NSS',
      authorizationCode: arsAuthCode.trim() || `AUT-${Date.now().toString().slice(-5)}`,
      serviceCodeSimon: arsSimonCode,
      serviceDescription: arsServiceDesc,
      diagnosisCie10: arsDiag,
      arsCoveredAmountDop: Number(arsCoveredDop) || 0,
      patientCopayDop: Number(arsCopayDop) || 0,
      status: 'Autorizado',
      doctorName: activeDoctor.name,
    };
    onAddArsClaim(claim);
    setArsAuthCode(`AUT-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const totalArsCovered = arsClaims.reduce((acc, c) => acc + c.arsCoveredAmountDop, 0);
  const totalCopays = arsClaims.reduce((acc, c) => acc + c.patientCopayDop, 0);

  // ==========================================================================
  // 3. EVOLUCIÓN GRÁFICA DE LABORATORIOS Y BIOMARCADORES STATE
  // ==========================================================================
  const [labDate, setLabDate] = useState(formatDominicanDate());
  const [labHba1c, setLabHba1c] = useState('6.8');
  const [labSys, setLabSys] = useState('128');
  const [labDia, setLabDia] = useState('80');
  const [labGluc, setLabGluc] = useState('102');
  const [labLdl, setLabLdl] = useState('98');
  const [labEgfr, setLabEgfr] = useState('88');
  const [labImaging, setLabImaging] = useState(
    'EKG: Ritmo sinusal normal, FC 74 lpm, sin alteraciones del segmento ST.'
  );
  const [selectedMetricChart, setSelectedMetricChart] = useState<
    'hba1c' | 'systolicBp' | 'fastingGlucose' | 'ldlCholesterol'
  >('hba1c');

  const patientLabEntries = labTrends.filter(
    (entry) => !activePat || entry.patientId === activePat.id
  );

  const handleSaveLabBiomarker = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: LabBiomarkerEntry = {
      id: `lb-${Date.now()}`,
      patientId: activePat?.id || 'general',
      date: labDate.trim() || formatDominicanDate(),
      hba1c: parseFloat(labHba1c) || 6.5,
      systolicBp: parseInt(labSys, 10) || 120,
      diastolicBp: parseInt(labDia, 10) || 80,
      fastingGlucose: parseInt(labGluc, 10) || 95,
      ldlCholesterol: parseInt(labLdl, 10) || 100,
      egfr: parseInt(labEgfr, 10) || 90,
      imagingOrEkgSummary: labImaging.trim(),
    };
    onAddLabTrend(newEntry);
  };

  // ==========================================================================
  // 4. CALCULADORAS CLÍNICAS DE PRIMER NIVEL (HEARTS, OBSTÉTRICA, PHQ-9, FINDRISC)
  // ==========================================================================
  // HEARTS Cardiovascular Risk
  const [cvAge, setCvAge] = useState(String(activePat?.age || 54));
  const [cvSmoker, setCvSmoker] = useState(false);
  const [cvDiabetic, setCvDiabetic] = useState(false);
  const [cvSystolic, setCvSystolic] = useState('138');
  const [cvCholesterol, setCvCholesterol] = useState('205');

  const computeHeartsScore = () => {
    let score = 2;
    const ageNum = parseInt(cvAge, 10) || 45;
    const sysNum = parseInt(cvSystolic, 10) || 120;
    const cholNum = parseInt(cvCholesterol, 10) || 180;
    if (ageNum >= 50) score += 3;
    if (ageNum >= 65) score += 5;
    if (cvSmoker) score += 5;
    if (cvDiabetic) score += 6;
    if (sysNum >= 140) score += 4;
    if (sysNum >= 160) score += 5;
    if (cholNum >= 200) score += 2;
    if (cholNum >= 240) score += 3;
    const riskPct = Math.min(35, Math.max(1, score));
    const level =
      riskPct < 5
        ? 'Riesgo Bajo (<5%)'
        : riskPct < 10
        ? 'Riesgo Moderado (5% - 9%)'
        : riskPct < 20
        ? 'Riesgo Alto (10% - 19% — Iniciar estatina y control estricto PA)'
        : 'Riesgo Muy Alto (≥20% — Prevención intensiva HEARTS)';
    return { riskPct, level };
  };

  // Obstetric Gestational Age & FPP Calculator (FUM)
  const [fumDate, setFumDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 140); // ~20 weeks ago
    return d.toISOString().split('T')[0];
  });

  const computeObstetricData = () => {
    const fum = new Date(fumDate);
    if (isNaN(fum.getTime())) {
      return { weeks: 0, days: 0, fpp: '—', trimester: '—' };
    }
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - fum.getTime());
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(totalDays / 7);
    const days = totalDays % 7;

    const fppDate = new Date(fum.getTime() + 280 * 24 * 60 * 60 * 1000);
    const fppStr = fppDate.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const trimester =
      weeks < 14
        ? '1er Trimestre (<14 sem)'
        : weeks < 28
        ? '2do Trimestre (14–27 sem)'
        : '3er Trimestre (≥28 sem)';
    return { weeks, days, fpp: fppStr, trimester };
  };

  // PHQ-9 & GAD-7 Mental Health & FINDRISC Diabetes Screening
  const [phq9Score, setPhq9Score] = useState(4);
  const [gad7Score, setGad7Score] = useState(3);
  const [findriscScore, setFindriscScore] = useState(8);

  const phq9Level =
    phq9Score <= 4
      ? 'Mínima o ausente (0-4)'
      : phq9Score <= 9
      ? 'Depresión leve (5-9)'
      : phq9Score <= 14
      ? 'Depresión moderada (10-14)'
      : 'Depresión moderada-severa (≥15 — Interconsulta Salud Mental)';

  const gad7Level =
    gad7Score <= 4
      ? 'Ansiedad mínima (0-4)'
      : gad7Score <= 9
      ? 'Ansiedad leve (5-9)'
      : gad7Score <= 14
      ? 'Ansiedad moderada (10-14)'
      : 'Ansiedad severa (≥15)';

  const findriscLevel =
    findriscScore < 7
      ? 'Riesgo bajo (1% a 10 años)'
      : findriscScore <= 11
      ? 'Riesgo ligeramente elevado (4%)'
      : findriscScore <= 14
      ? 'Riesgo moderado (17% — Tamizaje glucemia/HbA1c)'
      : 'Riesgo alto/muy alto (≥33% — Intervención intensiva)';

  const hearts = computeHeartsScore();
  const obs = computeObstetricData();

  // ==========================================================================
  // 5. SECTORIZACIÓN TERRITORIAL Y CROQUIS SANITARIO (ASIS / UNAP)
  // ==========================================================================
  const sectorMap = new Map<
    string,
    {
      sector: string;
      patientsCount: number;
      chronicCount: number;
      pregnantOrPostpartumCount: number;
      bedriddenCount: number;
      zaritOverloadCount: number;
      vectorRiskCount: number;
      visitsCount: number;
    }
  >();

  // Aggregate from patients
  patients.forEach((p) => {
    const sec = p.address?.trim() || 'Sector General UNAP';
    const current = sectorMap.get(sec) || {
      sector: sec,
      patientsCount: 0,
      chronicCount: 0,
      pregnantOrPostpartumCount: 0,
      bedriddenCount: 0,
      zaritOverloadCount: 0,
      vectorRiskCount: 0,
      visitsCount: 0,
    };
    current.patientsCount += 1;
    if (p.conditions.some((c) => /hipertens|diabet|hta|dm/i.test(c))) {
      current.chronicCount += 1;
    }
    if (p.conditions.some((c) => /embaraz|gestante|prenatal|puerper/i.test(c))) {
      current.pregnantOrPostpartumCount += 1;
    }
    sectorMap.set(sec, current);
  });

  // Aggregate from homeVisits
  homeVisits.forEach((hv) => {
    const sec = hv.sectorBarrio?.trim() || 'Sector General UNAP';
    const current = sectorMap.get(sec) || {
      sector: sec,
      patientsCount: 0,
      chronicCount: 0,
      pregnantOrPostpartumCount: 0,
      bedriddenCount: 0,
      zaritOverloadCount: 0,
      vectorRiskCount: 0,
      visitsCount: 0,
    };
    current.visitsCount += 1;
    if (hv.encamadoEvaluacion.indiceBarthelPuntaje < 60) {
      current.bedriddenCount += 1;
    }
    if (hv.cuidadorEvaluacion.escalaZaritNivel.includes('intensa')) {
      current.zaritOverloadCount += 1;
    }
    if (!hv.inspeccionAmbiental.criaderosVectoresDengue.includes('Sin criaderos')) {
      current.vectorRiskCount += 1;
    }
    if (hv.prioridad === 'Puerperio / Recién Nacido') {
      current.pregnantOrPostpartumCount += 1;
    }
    sectorMap.set(sec, current);
  });

  const sectorStatsList = Array.from(sectorMap.values());

  return (
    <div className="space-y-5">
      {/* ==================== TOP HEADER & PATIENT SELECTOR ==================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold shadow-xs"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
              Suite Clínica, Legal, ARS y Comunitaria · Ley 42-01 & SISALRIL
            </span>
            <h2 className="text-lg font-extrabold text-slate-900">
              Gestión Integral de Medicina Familiar y Comunitaria
            </h2>
            <p className="text-xs text-slate-500">
              Certificados médicos, autorizaciones ARS, curvas de biomarcadores, calculadoras HEARTS/Obstétrica, Familiograma y ASIS.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {patients.length > 0 ? (
            <select
              value={activePat?.id || ''}
              onChange={(e) => {
                const found = patients.find((p) => p.id === e.target.value);
                if (found) onSelectPatient(found);
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-extrabold text-slate-800 cursor-pointer"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  Paciente activo: {p.name} (#{p.code})
                </option>
              ))}
            </select>
          ) : (
            <button
              type="button"
              onClick={onOpenNewPatient}
              className="px-3.5 py-2 rounded-xl text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Paciente</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================== 6 SUITE NAVIGATION TABS ==================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 flex items-center gap-1.5 overflow-x-auto">
        {(
          [
            {
              id: 'certificados',
              label: '1. Certificados Médicos (Ley 42-01)',
              icon: <FileCheck2 className="w-4 h-4" />,
            },
            {
              id: 'ars',
              label: '2. Autorizaciones ARS & Copagos',
              icon: <Receipt className="w-4 h-4" />,
            },
            {
              id: 'evolucion-labs',
              label: '3. Curvas de Labs e Imagen',
              icon: <TrendingUp className="w-4 h-4" />,
            },
            {
              id: 'calculadoras',
              label: '4. Calculadoras (HEARTS / FPP / PHQ-9)',
              icon: <Calculator className="w-4 h-4" />,
            },
            {
              id: 'familiograma',
              label: '5. Familiograma y Ecomapa',
              icon: <Network className="w-4 h-4" />,
            },
            {
              id: 'sectorizacion',
              label: '6. Sectorización y Mapa ASIS',
              icon: <MapPin className="w-4 h-4" />,
            },
          ] as const
        ).map((tab) => {
          const isAct = activeSuiteTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSuiteTab(tab.id)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isAct
                  ? 'text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              style={isAct ? { backgroundColor: 'var(--brand-primary)' } : undefined}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: CERTIFICADOS Y DOCUMENTOS MÉDICO-LEGALES (LEY 42-01)          */}
      {/* ==================================================================== */}
      {activeSuiteTab === 'certificados' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
                Emisión Oficial con Exequátur y CMD
              </span>
              <h3 className="text-base font-extrabold text-slate-900">
                Emitir Certificado o Documento Médico-Legal
              </h3>
            </div>

            <form onSubmit={handleIssueCertificate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Tipo de Documento Oficial (Ley 42-01)
                </label>
                <select
                  value={certType}
                  onChange={(e) => {
                    const nextType = e.target.value as MedicalCertificateRecord['type'];
                    setCertType(nextType);
                    if (nextType === 'Licencia / Incapacidad Médica') {
                      setCertFindings(
                        'Luego de evaluación clínica en consulta de Medicina Familiar, se recomienda reposo médico físico y laboral por el período indicado.'
                      );
                    } else if (nextType === 'Certificado Médico de Salud y Aptitud') {
                      setCertFindings(
                        'Al examen físico general y evaluación cardiopulmonar se encuentra en condiciones clínicas satisfactorias, sin signos de enfermedad infectocontagiosa activa.'
                      );
                    } else if (nextType === 'Consentimiento Informado de Procedimiento') {
                      setCertFindings(
                        'Se explica detalladamente al paciente/familiar la naturaleza, beneficios y posibles riesgos del procedimiento ambulatorio/domiciliario, otorgando su autorización libre y voluntaria.'
                      );
                    } else {
                      setCertFindings(
                        'Se hace constar que el(la) paciente acudió puntualmente a evaluación médica en este consultorio de Medicina Familiar en la fecha indicada.'
                      );
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-extrabold text-slate-800"
                >
                  <option value="Licencia / Incapacidad Médica">
                    1. Certificado de Incapacidad / Licencia Médica
                  </option>
                  <option value="Certificado Médico de Salud y Aptitud">
                    2. Certificado Médico de Salud (Laboral / Escolar / Prenupcial)
                  </option>
                  <option value="Consentimiento Informado de Procedimiento">
                    3. Consentimiento Informado para Procedimiento Clínico
                  </option>
                  <option value="Constancia de Asistencia a Consulta">
                    4. Constancia de Asistencia a Consulta Médica
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    Diagnóstico Clínico CIE-10 / Motivo
                  </label>
                  <input
                    type="text"
                    value={certDiagnosis}
                    onChange={(e) => setCertDiagnosis(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    Días de Reposo / Vigencia
                  </label>
                  <input
                    type="text"
                    value={certRestDays}
                    onChange={(e) => setCertRestDays(e.target.value)}
                    placeholder="Ej. 3 días (72 horas) / Vigencia 30 días"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Dirigido a (Institución / Empleador / Centro Educativo)
                </label>
                <input
                  type="text"
                  value={certDestination}
                  onChange={(e) => setCertDestination(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Cuerpo Clínico y Recomendaciones Médicas
                </label>
                <textarea
                  rows={3}
                  value={certFindings}
                  onChange={(e) => setCertFindings(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 leading-relaxed"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl text-white font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Printer className="w-4 h-4" />
                <span>Generar e Imprimir Certificado Oficial</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Historial de Certificados Emitidos ({certificates.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Respaldados con folio único y firma del médico actuante
                </p>
              </div>
            </div>

            {certificates.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No se han emitido certificados médicos aún. Utilice el formulario izquierdo para generar e imprimir el primero.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto">
                {certificates.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-mono-clinical font-bold text-[10.5px]">
                          {c.id}
                        </span>
                        <strong className="text-slate-900">{c.type}</strong>
                      </div>
                      <p className="text-slate-700">
                        Paciente: <strong>{c.patientName}</strong> · Cédula: {c.patientCedula}
                      </p>
                      <p className="text-slate-500">
                        Diagnóstico: {c.diagnosisCie10} · Reposo/Vigencia: {c.restDays} · Fecha:{' '}
                        {c.dateIssued}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPrintCertificateModal(c)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-teal-600 text-teal-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimir</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCertificate(c.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: AUTORIZACIONES ARS, COPAGOS Y PRODUCCIÓN (SDSS / SISALRIL)    */}
      {/* ==================================================================== */}
      {activeSuiteTab === 'ars' && (
        <div className="space-y-5">
          {/* Top Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90">
              <span className="text-[11px] font-bold text-slate-500 block">
                Prestaciones Autorizadas ARS
              </span>
              <span className="text-2xl font-extrabold font-mono-clinical text-slate-900">
                {arsClaims.length}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90">
              <span className="text-[11px] font-bold text-slate-500 block">
                Monto Cubierto por ARS (RD$)
              </span>
              <span className="text-2xl font-extrabold font-mono-clinical text-emerald-700">
                RD$ {totalArsCovered.toLocaleString('es-DO')}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90">
              <span className="text-[11px] font-bold text-slate-500 block">
                Total Copagos / Diferencia (RD$)
              </span>
              <span className="text-2xl font-extrabold font-mono-clinical text-teal-800">
                RD$ {totalCopays.toLocaleString('es-DO')}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">
                  Producción Bruta Total
                </span>
                <span className="text-2xl font-extrabold font-mono-clinical text-slate-900">
                  RD$ {(totalArsCovered + totalCopays).toLocaleString('es-DO')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Relación</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Form: Register ARS Authorization */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
                  Catálogo PDSS / SIMON (SISALRIL)
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Registrar Autorización ARS y Copago
                </h3>
              </div>

              <form onSubmit={handleCreateArsClaim} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    Prestación del Plan Básico de Salud (Código SIMON)
                  </label>
                  <select
                    value={arsSimonCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setArsSimonCode(code);
                      const found = SIMON_PROCEDURES_CATALOG.find((p) => p.code === code);
                      if (found) {
                        setArsServiceDesc(found.name);
                        setArsCoveredDop(String(found.arsTariff));
                        setArsCopayDop(String(found.copay));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    {SIMON_PROCEDURES_CATALOG.map((item) => (
                      <option key={item.code} value={item.code}>
                        [{item.code}] {item.name} — RD$ {item.arsTariff}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">
                      No. Afiliado / NSS
                    </label>
                    <input
                      type="text"
                      value={arsNss}
                      onChange={(e) => setArsNss(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono-clinical"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">
                      No. Autorización ARS
                    </label>
                    <input
                      type="text"
                      value={arsAuthCode}
                      onChange={(e) => setArsAuthCode(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono-clinical font-bold text-teal-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">
                      Cobertura ARS (RD$)
                    </label>
                    <input
                      type="number"
                      value={arsCoveredDop}
                      onChange={(e) => setArsCoveredDop(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono-clinical font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">
                      Copago Paciente (RD$)
                    </label>
                    <input
                      type="number"
                      value={arsCopayDop}
                      onChange={(e) => setArsCopayDop(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono-clinical font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    Diagnóstico CIE-10 del Reclamo
                  </label>
                  <input
                    type="text"
                    value={arsDiag}
                    onChange={(e) => setArsDiag(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl text-white font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Reclamo ARS para {activePat?.name || 'Paciente'}</span>
                </button>
              </form>
            </div>

            {/* Right Table: ARS Claims List */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 space-y-3">
              <h3 className="text-base font-extrabold text-slate-900">
                Relación de Autorizaciones y Reclamos por Aseguradora (ARS)
              </h3>
              {arsClaims.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Sin autorizaciones ARS registradas hoy. Registre la primera prestación a la izquierda.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold text-slate-500 uppercase">
                        <th className="py-2.5 px-3">Autorización / Fecha</th>
                        <th className="py-2.5 px-3">Paciente / ARS</th>
                        <th className="py-2.5 px-3">Servicio (SIMON)</th>
                        <th className="py-2.5 px-3">ARS / Copago</th>
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {arsClaims.map((cl) => (
                        <tr key={cl.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono-clinical">
                            <strong className="text-teal-800 block">
                              {cl.authorizationCode}
                            </strong>
                            <span className="text-[10.5px] text-slate-400">{cl.date}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <strong className="text-slate-900 block">{cl.patientName}</strong>
                            <span className="text-[11px] text-slate-500">
                              {cl.arsName} · NSS {cl.nssNumber}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-800 block">
                              [{cl.serviceCodeSimon}] {cl.serviceDescription}
                            </span>
                            <span className="text-[10.5px] text-slate-500">
                              {cl.diagnosisCie10}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono-clinical">
                            <strong className="text-emerald-700 block">
                              RD$ {cl.arsCoveredAmountDop}
                            </strong>
                            <span className="text-[10.5px] text-slate-500">
                              Copago: RD$ {cl.patientCopayDop}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={cl.status}
                              onChange={(e) =>
                                onUpdateArsClaimStatus(
                                  cl.id,
                                  e.target.value as ArsClaimRecord['status']
                                )
                              }
                              className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold"
                            >
                              <option value="Autorizado">Autorizado</option>
                              <option value="Facturado a ARS">Facturado a ARS</option>
                              <option value="Pagado">Pagado</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => onDeleteArsClaim(cl.id)}
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: EVOLUCIÓN GRÁFICA DE LABORATORIOS Y ESTUDIOS DE IMAGEN        */}
      {/* ==================================================================== */}
      {activeSuiteTab === 'evolucion-labs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Form: Add Numeric Biomarker / Imaging Result */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
                Seguimiento Longitudinal de Crónicos
              </span>
              <h3 className="text-base font-extrabold text-slate-900">
                Registrar Control de Laboratorio e Imagen
              </h3>
            </div>

            <form onSubmit={handleSaveLabBiomarker} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Fecha Control</label>
                  <input
                    type="text"
                    value={labDate}
                    onChange={(e) => setLabDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono-clinical"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    HbA1c (%) — Meta &lt;7.0%
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={labHba1c}
                    onChange={(e) => setLabHba1c(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono-clinical font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    PA Sistólica (mmHg)
                  </label>
                  <input
                    type="number"
                    value={labSys}
                    onChange={(e) => setLabSys(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono-clinical font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    PA Diastólica (mmHg)
                  </label>
                  <input
                    type="number"
                    value={labDia}
                    onChange={(e) => setLabDia(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono-clinical font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    Glucemia Ayunas (mg/dL)
                  </label>
                  <input
                    type="number"
                    value={labGluc}
                    onChange={(e) => setLabGluc(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono-clinical font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    Colesterol LDL (mg/dL)
                  </label>
                  <input
                    type="number"
                    value={labLdl}
                    onChange={(e) => setLabLdl(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono-clinical font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Reporte de Estudios de Imagen / EKG / Sonografía
                </label>
                <textarea
                  rows={2}
                  value={labImaging}
                  onChange={(e) => setLabImaging(e.target.value)}
                  placeholder="Ej. Rx de Tórax PA: Índice cardiotorácico normal; EKG sinusal..."
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl text-white font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Plus className="w-4 h-4" />
                <span>Guardar Control y Graficar Tendencia</span>
              </button>
            </form>
          </div>

          {/* Right Chart & History */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Curva Evolutiva de Biomarcadores — {activePat?.name || 'Paciente'}
                </h3>
                <p className="text-xs text-slate-500">
                  Comparación frente a metas terapéuticas del protocolo HEARTS / MSP
                </p>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {(
                  [
                    { id: 'hba1c', label: 'HbA1c (%)' },
                    { id: 'systolicBp', label: 'PA Sistólica' },
                    { id: 'fastingGlucose', label: 'Glucemia' },
                    { id: 'ldlCholesterol', label: 'LDL' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMetricChart(m.id)}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                      selectedMetricChart === m.id
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive SVG Trend Chart */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
              {patientLabEntries.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Aún no hay mediciones seriadas registradas para este paciente. Agregue el primer control a la izquierda para visualizar la curva evolutiva.
                </div>
              ) : (
                <svg viewBox="0 0 540 190" className="w-full h-44">
                  <line
                    x1={40}
                    y1={150}
                    x2={510}
                    y2={150}
                    stroke="#cbd5e1"
                    strokeWidth={1.5}
                  />
                  <line
                    x1={40}
                    y1={45}
                    x2={510}
                    y2={45}
                    stroke="#10b981"
                    strokeDasharray="5 4"
                    strokeWidth={1.5}
                  />
                  <text x={45} y={38} className="text-[9.5px] font-bold fill-emerald-700">
                    Umbral Meta MSP ({selectedMetricChart === 'hba1c' ? '< 7.0%' : selectedMetricChart === 'systolicBp' ? '< 130 mmHg' : '< 100 mg/dL'})
                  </text>

                  {patientLabEntries.map((pt, idx, arr) => {
                    const rawVal = pt[selectedMetricChart];
                    const maxRef =
                      selectedMetricChart === 'hba1c'
                        ? 14
                        : selectedMetricChart === 'systolicBp'
                        ? 200
                        : 260;
                    const minRef =
                      selectedMetricChart === 'hba1c'
                        ? 4
                        : selectedMetricChart === 'systolicBp'
                        ? 80
                        : 50;
                    const norm = Math.min(
                      1,
                      Math.max(0, (rawVal - minRef) / (maxRef - minRef))
                    );
                    const x =
                      arr.length === 1
                        ? 275
                        : 65 + (idx / (arr.length - 1)) * 410;
                    const y = 145 - norm * 110;

                    const nextPt = arr[idx + 1];
                    let nextCoords: { x: number; y: number } | null = null;
                    if (nextPt) {
                      const nextNorm = Math.min(
                        1,
                        Math.max(
                          0,
                          (nextPt[selectedMetricChart] - minRef) / (maxRef - minRef)
                        )
                      );
                      nextCoords = {
                        x: 65 + ((idx + 1) / (arr.length - 1)) * 410,
                        y: 145 - nextNorm * 110,
                      };
                    }

                    return (
                      <g key={pt.id}>
                        {nextCoords && (
                          <line
                            x1={x}
                            y1={y}
                            x2={nextCoords.x}
                            y2={nextCoords.y}
                            stroke="#0f766e"
                            strokeWidth={2.8}
                          />
                        )}
                        <circle cx={x} cy={y} r={5.5} fill="#0f766e" stroke="#ffffff" strokeWidth={2} />
                        <text
                          x={x}
                          y={y - 10}
                          textAnchor="middle"
                          className="text-[10.5px] font-extrabold fill-slate-900"
                        >
                          {rawVal}
                        </text>
                        <text
                          x={x}
                          y={168}
                          textAnchor="middle"
                          className="text-[9.5px] fill-slate-500"
                        >
                          {pt.date}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            {/* List of Recorded Biomarkers & Imaging */}
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {patientLabEntries.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-mono-clinical font-bold text-slate-900">
                      {item.date} · HbA1c: {item.hba1c}% · PA: {item.systolicBp}/{item.diastolicBp}{' '}
                      mmHg · Glucemia: {item.fastingGlucose} mg/dL · LDL: {item.ldlCholesterol}{' '}
                      mg/dL
                    </div>
                    {item.imagingOrEkgSummary && (
                      <p className="text-slate-600">{item.imagingOrEkgSummary}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteLabTrend(item.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: CALCULADORAS CLÍNICAS DE PRIMER NIVEL                         */}
      {/* ==================================================================== */}
      {activeSuiteTab === 'calculadoras' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Riesgo Cardiovascular HEARTS (OPS/OMS) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
                Iniciativa HEARTS en las Américas (OPS / MSP)
              </span>
              <h3 className="text-base font-extrabold text-slate-900">
                1. Calculadora de Riesgo Cardiovascular a 10 Años
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Edad (años)</label>
                <input
                  type="number"
                  value={cvAge}
                  onChange={(e) => setCvAge(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono-clinical font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  PA Sistólica (mmHg)
                </label>
                <input
                  type="number"
                  value={cvSystolic}
                  onChange={(e) => setCvSystolic(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono-clinical font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Colesterol Total (mg/dL)
                </label>
                <input
                  type="number"
                  value={cvCholesterol}
                  onChange={(e) => setCvCholesterol(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono-clinical font-bold"
                />
              </div>
              <label className="flex items-center gap-2 font-bold text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={cvSmoker}
                  onChange={(e) => setCvSmoker(e.target.checked)}
                />
                <span>Fumador activo</span>
              </label>
              <label className="flex items-center gap-2 font-bold text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={cvDiabetic}
                  onChange={(e) => setCvDiabetic(e.target.checked)}
                />
                <span>Diabetes Mellitus</span>
              </label>
            </div>

            <div className="p-3.5 rounded-xl bg-teal-50/80 border border-teal-200 flex items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-slate-500 block">Estimación HEARTS a 10 años:</span>
                <strong className="text-base font-extrabold text-teal-950">
                  {hearts.riskPct}% — {hearts.level}
                </strong>
              </div>
              {activePat && (
                <button
                  type="button"
                  onClick={() => {
                    onAddClinicalNoteToPatient(
                      activePat.id,
                      `Estratificación Cardiovascular HEARTS (OPS/OMS): Riesgo a 10 años estimado en ${hearts.riskPct}% (${hearts.level}). PA Sistólica ${cvSystolic} mmHg, Colesterol ${cvCholesterol} mg/dL.`,
                      'Estratificación HEARTS'
                    );
                  }}
                  className="px-3 py-1.5 rounded-xl text-white text-xs font-bold cursor-pointer shrink-0"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  Anexar a SOAP
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Calculadora Obstétrica (FUM, Edad Gestacional y FPP Naegele) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
                Control Prenatal de Bajo Riesgo (MSP)
              </span>
              <h3 className="text-base font-extrabold text-slate-900">
                2. Calculadora Obstétrica (Edad Gestacional y FPP)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Fecha de Última Menstruación (FUM)
                </label>
                <input
                  type="date"
                  value={fumDate}
                  onChange={(e) => setFumDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono-clinical font-bold"
                />
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10.5px] text-slate-500 block">
                  Trimestre de Gestación
                </span>
                <strong className="text-xs font-extrabold text-slate-900">
                  {obs.trimester}
                </strong>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-slate-500 block">
                  Edad Gestacional Actual y Fecha Probable de Parto (Naegele):
                </span>
                <strong className="text-base font-extrabold text-emerald-950">
                  {obs.weeks} semanas + {obs.days} días · FPP: {obs.fpp}
                </strong>
              </div>
              {activePat && (
                <button
                  type="button"
                  onClick={() => {
                    onAddClinicalNoteToPatient(
                      activePat.id,
                      `Control Prenatal: FUM ${fumDate}, Edad Gestacional actual de ${obs.weeks} semanas y ${obs.days} días (${obs.trimester}). Fecha Probable de Parto (FPP): ${obs.fpp}.`,
                      'Control Prenatal MSP'
                    );
                  }}
                  className="px-3 py-1.5 rounded-xl text-white text-xs font-bold cursor-pointer shrink-0"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  Anexar a SOAP
                </button>
              )}
            </div>
          </div>

          {/* Card 3: Tamizaje de Salud Mental en Atención Primaria (PHQ-9 & GAD-7) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
                Salud Mental Comunitaria (mhGAP / OPS)
              </span>
              <h3 className="text-base font-extrabold text-slate-900">
                3. Tamizaje PHQ-9 (Depresión) y GAD-7 (Ansiedad)
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Puntaje PHQ-9 (0 a 27 pts)
                </label>
                <input
                  type="number"
                  min={0}
                  max={27}
                  value={phq9Score}
                  onChange={(e) => setPhq9Score(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono-clinical font-bold"
                />
                <span className="text-[11px] text-teal-800 font-semibold mt-1 block">
                  {phq9Level}
                </span>
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Puntaje GAD-7 (0 a 21 pts)
                </label>
                <input
                  type="number"
                  min={0}
                  max={21}
                  value={gad7Score}
                  onChange={(e) => setGad7Score(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono-clinical font-bold"
                />
                <span className="text-[11px] text-teal-800 font-semibold mt-1 block">
                  {gad7Level}
                </span>
              </div>
            </div>

            {activePat && (
              <button
                type="button"
                onClick={() => {
                  onAddClinicalNoteToPatient(
                    activePat.id,
                    `Tamizaje de Salud Mental en Atención Primaria: PHQ-9 = ${phq9Score} pts (${phq9Level}); GAD-7 = ${gad7Score} pts (${gad7Level}).`,
                    'Tamizaje Salud Mental'
                  );
                }}
                className="w-full py-2 rounded-xl text-white text-xs font-bold cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                Guardar Tamizaje PHQ-9 / GAD-7 en Evolución SOAP
              </button>
            )}
          </div>

          {/* Card 4: Test de FINDRISC (Tamizaje de Riesgo de Diabetes Tipo 2) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
                Prevención Primaria de Diabetes Mellitus
              </span>
              <h3 className="text-base font-extrabold text-slate-900">
                4. Escala FINDRISC (Riesgo de DM2 a 10 años)
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-bold text-slate-600">
                Puntaje Total FINDRISC (0 a 26 puntos — Edad, IMC, Cintura, Ejercicio, Antecedente familiar)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={26}
                  value={findriscScore}
                  onChange={(e) => setFindriscScore(Number(e.target.value) || 0)}
                  className="w-28 px-3 py-1.5 rounded-xl border border-slate-300 font-mono-clinical font-bold"
                />
                <span className="font-extrabold text-teal-900">{findriscLevel}</span>
              </div>
            </div>

            {activePat && (
              <button
                type="button"
                onClick={() => {
                  onAddClinicalNoteToPatient(
                    activePat.id,
                    `Tamizaje FINDRISC de Diabetes Mellitus Tipo 2: ${findriscScore} puntos (${findriscLevel}).`,
                    'Tamizaje Preventivo'
                  );
                }}
                className="w-full py-2 rounded-xl text-white text-xs font-bold cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                Guardar Resultado FINDRISC en Evolución SOAP
              </button>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: FAMILIOGRAMA (GENOGRAMA) Y ECOMAPA COMUNITARIO                */}
      {/* ==================================================================== */}
      {activeSuiteTab === 'familiograma' && (
        <FamiliogramaEcomapaCanvas
          patientName={activePat?.name || 'Familia Adscrita UNAP'}
          patientAge={activePat?.age || 38}
          patientGender={activePat?.gender || 'Femenino'}
          familyMembers={[]}
          onTriggerToast={onTriggerToast}
        />
      )}

      {/* ==================================================================== */}
      {/* TAB 6: SECTORIZACIÓN TERRITORIAL Y CROQUIS SANITARIO (ASIS / UNAP)   */}
      {/* ==================================================================== */}
      {activeSuiteTab === 'sectorizacion' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
                Análisis de Situación de Salud (ASIS) · Primer Nivel de Atención
              </span>
              <h3 className="text-base font-extrabold text-slate-900">
                Censo de Sectorización Territorial y Mapa de Riesgo Comunitario
              </h3>
              <p className="text-xs text-slate-500">
                Consolidado en vivo por sector/barrio de familias adscritas, crónicos (HTA/DM2), gestantes, encamados y focos de Aedes aegypti.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Croquis ASIS</span>
            </button>
          </div>

          {sectorStatsList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Aún no hay sectores con pacientes o visitas domiciliarias registradas. Al registrar pacientes o visitas en terreno, el mapa epidemiológico por barrio se poblará automáticamente.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sectorStatsList.map((sec) => {
                const isHighRisk =
                  sec.vectorRiskCount > 0 ||
                  sec.bedriddenCount > 0 ||
                  sec.zaritOverloadCount > 0;
                return (
                  <div
                    key={sec.sector}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isHighRisk
                        ? 'bg-amber-50/40 border-amber-300'
                        : 'bg-slate-50/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {sec.sector}
                        </h4>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10.5px] font-extrabold border ${
                          isHighRisk
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {isHighRisk ? 'Prioridad Sanitaria' : 'Bajo Control'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono-clinical">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] font-sans text-slate-500 block">
                          Pacientes / Familias
                        </span>
                        <strong className="text-sm text-slate-900">
                          {sec.patientsCount}
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] font-sans text-slate-500 block">
                          Crónicos (HTA / DM2)
                        </span>
                        <strong className="text-sm text-teal-800">
                          {sec.chronicCount}
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] font-sans text-slate-500 block">
                          Encamados (Barthel &lt;60)
                        </span>
                        <strong className="text-sm text-amber-800">
                          {sec.bedriddenCount}
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] font-sans text-slate-500 block">
                          Focos Vectores (Dengue)
                        </span>
                        <strong className="text-sm text-rose-700">
                          {sec.vectorRiskCount}
                        </strong>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span>Visitas a domicilio: <strong>{sec.visitsCount}</strong></span>
                      <span>Gestantes/Puerperio: <strong>{sec.pregnantOrPostpartumCount}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== PRINTABLE OFFICIAL CERTIFICATE MODAL ==================== */}
      {printCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div
              className="px-6 py-4 text-white flex items-center justify-between print:hidden"
              style={{ backgroundColor: 'var(--sidebar-from)' }}
            >
              <div className="flex items-center gap-3">
                <DominicanFlagIcon className="w-6 h-4" />
                <h3 className="text-sm font-extrabold">
                  {printCertificateModal.type} · Ley General de Salud 42-01
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Documento</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintCertificateModal(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 text-slate-900 text-xs leading-relaxed">
              <div className="border-b-2 border-slate-800 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <FamiliaLogoEmblem size={50} />
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                      República Dominicana · Ministerio de Salud Pública (MSP) · CMD
                    </p>
                    <h1 className="text-base font-extrabold uppercase text-slate-900">
                      {printCertificateModal.type}
                    </h1>
                    <p className="text-xs font-semibold text-teal-800">
                      {printCertificateModal.unapCenter}
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono-clinical text-[11px]">
                  <p>
                    <strong>Folio:</strong> {printCertificateModal.id}
                  </p>
                  <p>
                    <strong>Fecha:</strong> {printCertificateModal.dateIssued}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm leading-relaxed">
                <p>
                  <strong>Dirigido a:</strong> {printCertificateModal.destinationEntity}
                </p>
                <p>
                  Quien suscribe, <strong>{printCertificateModal.doctorName}</strong>, Médico
                  Familiar y Comunitario, provisto del Exequátur del Poder Ejecutivo No.{' '}
                  <strong>{printCertificateModal.doctorExequatur}</strong> y Colegiatura CMD No.{' '}
                  <strong>{printCertificateModal.doctorCmd}</strong>, certifica haber evaluado
                  clínicamente a:
                </p>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <p className="text-sm font-extrabold text-slate-900">
                    {printCertificateModal.patientName}
                  </p>
                  <p>
                    <strong>Edad:</strong> {printCertificateModal.patientAge} años ·{' '}
                    <strong>Cédula de Identidad:</strong> {printCertificateModal.patientCedula}
                  </p>
                  <p>
                    <strong>Diagnóstico Clínico (CIE-10):</strong>{' '}
                    {printCertificateModal.diagnosisCie10}
                  </p>
                  <p>
                    <strong>Reposo Médico / Vigencia:</strong>{' '}
                    <span className="font-bold text-teal-900">
                      {printCertificateModal.restDays}
                    </span>
                  </p>
                </div>

                <p className="text-xs text-slate-800 leading-relaxed">
                  <strong>Resumen Clínico y Recomendaciones:</strong>{' '}
                  {printCertificateModal.clinicalSummaryAndFindings}
                </p>

                <p className="text-xs text-slate-600">
                  Se expide el presente documento en cumplimiento de la Ley General de Salud
                  No. 42-01 de la República Dominicana, para los fines correspondientes.
                </p>
              </div>

              <div className="pt-10 flex items-center justify-between border-t border-slate-200">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <DominicanFlagIcon className="w-5 h-3.5" />
                  <span>Documento Médico-Legal Oficial · Familia+</span>
                </div>
                <div className="text-center">
                  <p
                    className="font-script text-2xl leading-none"
                    style={{ color: 'var(--brand-heading)' }}
                  >
                    {printCertificateModal.doctorName}
                  </p>
                  <div className="w-56 border-t border-slate-400 mt-1 pt-1 text-[11px] text-slate-600">
                    Exeq. {printCertificateModal.doctorExequatur} · CMD{' '}
                    {printCertificateModal.doctorCmd} · Firma y Sello
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
