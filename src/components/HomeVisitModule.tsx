import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  BriefcaseMedical,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HeartPulse,
  UserCheck,
  ShieldAlert,
  Stethoscope,
  Trash2,
  Check,
  X,
  UserPlus,
  ExternalLink,
  CloudCheck,
  Sparkles,
  Home,
} from 'lucide-react';
import { Patient, VitalSigns, formatDominicanDate } from '../data/mockClinicalData';
import {
  HomeVisitRecord,
  HomeVisitStatus,
  HomeVisitPriority,
  MedicalBagChecklistItem,
  HOME_VISIT_PROCEDURES_CATALOG,
  buildDefaultHomeVisitForPatient,
} from '../data/clinicalFormsData';
import { DoctorProfile } from '../data/doctorsData';
import { DominicanFlagIcon, FamiliaLogoEmblem } from './BrandVisuals';
import { MacHomeVisitIcon, MacClipboardIcon } from './MacOSIcons';
import {
  scheduleBackgroundClinicalTextAnalysis,
  evaluateVitalsRiskInBackground,
} from '../services/backgroundClinicalEngine';

const DOMINICAN_SECTORS_SUGGESTIONS = [
  'Gazcue, D.N.',
  'Villa Juana, D.N.',
  'Los Mina, SDE',
  'Alma Rosa I, SDE',
  'Herrera, SDO',
  'Sabana Perdida, SDN',
  'Bella Vista, D.N.',
  'Santiago Centro',
];

function computeBarthelLevel(
  score: number
): HomeVisitRecord['encamadoEvaluacion']['indiceBarthelNivel'] {
  if (score >= 100) return 'Independiente (100)';
  if (score >= 60) return 'Dependencia leve (60-95)';
  if (score >= 40) return 'Dependencia moderada (40-55)';
  if (score >= 20) return 'Dependencia severa (20-35)';
  return 'Dependencia total (<20)';
}

function computeZaritLevel(
  scoreStr: string
): HomeVisitRecord['cuidadorEvaluacion']['escalaZaritNivel'] {
  const num = parseInt(scoreStr, 10);
  if (isNaN(num) || num <= 46) return 'Ausencia de sobrecarga (≤46)';
  if (num <= 55) return 'Sobrecarga leve (47-55)';
  return 'Sobrecarga intensa (≥56)';
}

// ============================================================================
// ACTA OFICIAL IMPRIMIBLE DE VISITA DOMICILIARIA MSP (LEY 42-01)
// ============================================================================
interface HomeVisitPrintableModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: HomeVisitRecord | null;
  activeDoctor: DoctorProfile;
}

export const HomeVisitPrintableActModal: React.FC<HomeVisitPrintableModalProps> = ({
  isOpen,
  onClose,
  visit,
  activeDoctor,
}) => {
  if (!isOpen || !visit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Top Action Bar (hidden when printing) */}
        <div
          className="px-6 py-4 text-white flex items-center justify-between print:hidden"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--sidebar-from), var(--sidebar-via), var(--sidebar-to))',
          }}
        >
          <div className="flex items-center gap-3">
            <DominicanFlagIcon className="w-7 h-5 rounded-xs shadow-xs" />
            <div>
              <h3 className="text-sm font-extrabold">
                Acta Oficial de Consulta a Domicilio · Formato MSP (Ley 42-01)
              </h3>
              <p className="text-[11px] text-slate-300">
                Documento clínico de terreno con firma del médico familiar y conformidad del cuidador
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Acta Oficial</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Official Document Body */}
        <div className="p-6 sm:p-8 space-y-5 text-slate-900 text-xs leading-relaxed">
          {/* Official MSP Header */}
          <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <FamiliaLogoEmblem size={52} />
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                  República Dominicana · Ministerio de Salud Pública (MSP)
                </p>
                <h1 className="text-base font-extrabold text-slate-900 uppercase">
                  Formulario de Visita Domiciliaria y Atención en Terreno (UNAP)
                </h1>
                <p className="text-xs font-semibold text-teal-800">
                  {visit.consultorioUnap || activeDoctor.unapCenter} · {activeDoctor.consultorio}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right font-mono-clinical text-[11px] bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
              <div>
                <strong>Acta No.:</strong> {visit.id.toUpperCase()}
              </div>
              <div>
                <strong>Fecha:</strong> {visit.fechaVisita} · {visit.horaProgramada}
              </div>
              <div>
                <strong>Estado:</strong> {visit.estadoVisita}
              </div>
            </div>
          </div>

          {/* 1. Datos del Paciente y Ubicación Geográfica del Hogar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                I. Identificación del Paciente Visitado
              </span>
              <p className="text-sm font-extrabold text-slate-900">{visit.patientName}</p>
              <p>
                <strong>Edad:</strong> {visit.patientAge} años · <strong>Cédula:</strong>{' '}
                <span className="font-mono-clinical">{visit.patientCedula}</span>
              </p>
              <p>
                <strong>Seguro ARS:</strong> {visit.patientArs} · <strong>Prioridad:</strong>{' '}
                {visit.prioridad}
              </p>
              <p>
                <strong>Diagnóstico CIE-10:</strong>{' '}
                {visit.diagnosticoCie10 || 'Evaluación domiciliaria integral'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                II. Ubicación del Domicilio y Coordenadas
              </span>
              <p>
                <strong>Sector / Barrio:</strong> {visit.sectorBarrio || 'No especificado'}
              </p>
              <p>
                <strong>Dirección Exacta:</strong> {visit.direccionExacta || 'No especificada'}
              </p>
              <p>
                <strong>Punto de Referencia:</strong> {visit.puntoReferencia || 'Sin referencia'}
              </p>
              <p>
                <strong>Teléfono Hogar:</strong> {visit.telefonoContactoHogar || '—'} ·{' '}
                <strong>GPS:</strong>{' '}
                <span className="font-mono-clinical">
                  {visit.coordenadasGps || 'No registrado'}
                </span>
              </p>
            </div>
          </div>

          {/* 2. Signos Vitales en Terreno y Evolución SOAP */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-teal-900 border-b border-slate-200 pb-1">
              III. Signos Vitales en Domicilio y Hallazgos Clínicos (SOAP)
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 font-mono-clinical bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
              <div>
                <span className="text-[10px] text-slate-500 block font-sans">TA (mmHg)</span>
                <strong>{visit.signosVitales.ta || '—'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-sans">FC (lpm)</span>
                <strong>{visit.signosVitales.fc || '—'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-sans">FR (rpm)</span>
                <strong>{visit.signosVitales.fr || '—'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-sans">Temp</span>
                <strong>{visit.signosVitales.temp || '—'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-sans">SpO₂</span>
                <strong>{visit.signosVitales.spo2 || '—'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-sans">Glucemia</span>
                <strong>{visit.signosVitales.glucemiaCapilar || '—'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-sans">Dolor EVA</span>
                <strong>{visit.signosVitales.dolorEva || '0/10'}</strong>
              </div>
            </div>
            <p>
              <strong>Motivo de la Visita Domiciliaria:</strong>{' '}
              {visit.motivoVisita || 'Control y seguimiento domiciliario programado.'}
            </p>
            <p>
              <strong>Nota Clínica y Examen Físico en Casa:</strong>{' '}
              {visit.hallazgosClinicosSoap || 'Paciente evaluado en su domicilio.'}
            </p>
          </div>

          {/* 3. Evaluación de Encamados (Barthel / UPP) y Cuidador (Zarit) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-teal-900 pb-1 border-b border-slate-100">
                IV. Evaluación de Encamado, Barthel y Piel (UPP)
              </h4>
              <p>
                <strong>Condición de Movilidad:</strong>{' '}
                {visit.encamadoEvaluacion.condicionMovilidad}
              </p>
              <p>
                <strong>Índice de Barthel:</strong>{' '}
                <span className="font-mono-clinical font-bold">
                  {visit.encamadoEvaluacion.indiceBarthelPuntaje}/100 pts
                </span>{' '}
                ({visit.encamadoEvaluacion.indiceBarthelNivel})
              </p>
              <p>
                <strong>Integridad Cutánea / UPP:</strong>{' '}
                {visit.encamadoEvaluacion.integridadPiel} · Úlceras:{' '}
                <strong>{visit.encamadoEvaluacion.uppPresente}</strong> (
                {visit.encamadoEvaluacion.uppLocalizacion || 'N/A'})
              </p>
              <p>
                <strong>Cambios Posturales / Colchón:</strong>{' '}
                {visit.encamadoEvaluacion.frecuenciaCambiosPosturales} · Colchón antiescaras:{' '}
                {visit.encamadoEvaluacion.usoColchonAntiescaras}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-teal-900 pb-1 border-b border-slate-100">
                V. Evaluación del Cuidador Principal (Escala Zarit)
              </h4>
              <p>
                <strong>Cuidador Principal:</strong>{' '}
                {visit.cuidadorEvaluacion.nombreCuidador || 'No registrado'} (
                {visit.cuidadorEvaluacion.parentesco || 'Familiar'})
              </p>
              <p>
                <strong>Teléfono / Dedicación:</strong>{' '}
                {visit.cuidadorEvaluacion.telefonoCuidador || '—'} ·{' '}
                {visit.cuidadorEvaluacion.horasCuidadoDiario}
              </p>
              <p>
                <strong>Escala de Zarit:</strong>{' '}
                <span className="font-mono-clinical font-bold">
                  {visit.cuidadorEvaluacion.escalaZaritPuntaje} pts
                </span>{' '}
                — <strong>{visit.cuidadorEvaluacion.escalaZaritNivel}</strong>
              </p>
              <p>
                <strong>Capacitación y Red de Apoyo:</strong>{' '}
                {visit.cuidadorEvaluacion.capacitacionEnCuidados ||
                  'Orientación general brindada.'}
              </p>
            </div>
          </div>

          {/* 4. Inspección Ambiental y Procedimientos Realizados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-teal-900 pb-1 border-b border-slate-100">
                VI. Inspección Ambiental del Hogar y Vectores
              </h4>
              <p>
                <strong>Riesgo de Caídas / Barreras:</strong>{' '}
                {visit.inspeccionAmbiental.barrerasArquitectonicasCaidas ||
                  'Sin barreras críticas reportadas'}
              </p>
              <p>
                <strong>Iluminación / Agua:</strong>{' '}
                {visit.inspeccionAmbiental.iluminacionVentilacion} ·{' '}
                {visit.inspeccionAmbiental.aguaPotableSaneamiento}
              </p>
              <p>
                <strong>Control de Vectores (Dengue):</strong>{' '}
                <strong>{visit.inspeccionAmbiental.criaderosVectoresDengue}</strong>
              </p>
              <p>
                <strong>Almacenamiento de Fármacos:</strong>{' '}
                {visit.inspeccionAmbiental.almacenamientoMedicamentosHogar}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-teal-900 pb-1 border-b border-slate-100">
                VII. Procedimientos y Conducta en Domicilio
              </h4>
              <p>
                <strong>Procedimientos ejecutados:</strong>{' '}
                {visit.procedimientosRealizados.length > 0
                  ? visit.procedimientosRealizados.join('; ')
                  : 'Evaluación médica domiciliaria y control de signos vitales.'}
              </p>
              {visit.detalleProcedimientos && (
                <p>
                  <strong>Detalle técnico:</strong> {visit.detalleProcedimientos}
                </p>
              )}
              <p>
                <strong>Tratamiento e Indicaciones en Casa:</strong>{' '}
                {visit.tratamientoIndicacionesDomicilio || 'Continuar esquema indicado.'}
              </p>
              <p>
                <strong>Próximo Seguimiento Domiciliario:</strong>{' '}
                <strong>{visit.proximoSeguimientoDomiciliario}</strong>
              </p>
            </div>
          </div>

          {/* Signatures Block */}
          <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center">
            <div className="border-t border-slate-400 pt-2">
              <p className="font-extrabold text-slate-900">
                {visit.medicoResponsable || activeDoctor.name}
              </p>
              <p className="text-[11px] text-slate-600">
                {activeDoctor.specialty} · Exequátur:{' '}
                {visit.exequaturMedico || activeDoctor.exequatur} · CMD: {activeDoctor.cmd}
              </p>
              <p className="text-[10px] text-slate-400">
                Firma y Sello del Médico Familiar Actuante (Ley 42-01)
              </p>
            </div>

            <div className="border-t border-slate-400 pt-2">
              <p className="font-extrabold text-slate-900">
                {visit.cuidadorEvaluacion.nombreCuidador ||
                  visit.patientName ||
                  'Familiar / Cuidador Responsable'}
              </p>
              <p className="text-[11px] text-slate-600">
                Parentesco: {visit.cuidadorEvaluacion.parentesco || 'Paciente / Familiar'} ·
                Tel: {visit.cuidadorEvaluacion.telefonoCuidador || visit.telefonoContactoHogar || '—'}
              </p>
              <p className="text-[10px] text-slate-400">
                Firma de Conformidad de Recepción de la Visita en el Hogar
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// FORMULARIO CLÍNICO REUTILIZABLE DE EVALUACIÓN EN DOMICILIO
// (Usado tanto en la vista lateral "Visita Domiciliaria" como en la Pestaña 8 MSP)
// ============================================================================
interface HomeVisitClinicalEditorProps {
  visit: HomeVisitRecord;
  onChangeVisit: (updated: HomeVisitRecord) => void;
  onSyncVitalsToPatient?: (vitals: VitalSigns) => void;
  onPrintVisit: (visit: HomeVisitRecord) => void;
  onDeleteVisit?: (visitId: string) => void;
  onTriggerToast: (msg: string) => void;
}

export const HomeVisitClinicalEditor: React.FC<HomeVisitClinicalEditorProps> = ({
  visit,
  onChangeVisit,
  onSyncVitalsToPatient,
  onPrintVisit,
  onDeleteVisit,
  onTriggerToast,
}) => {
  const [activeSubSection, setActiveSubSection] = useState<
    'logistica' | 'soap' | 'encamado' | 'cuidador' | 'ambiente'
  >('logistica');
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const visitRef = useRef(visit);
  visitRef.current = visit;

  // Silent background CIE-10 & home treatment suggestions on typing pause during Home Visit
  useEffect(() => {
    const combined = `${visit.motivoVisita || ''} ${visit.hallazgosClinicosSoap || ''}`.trim();
    if (combined.length < 18) return;

    scheduleBackgroundClinicalTextAnalysis(
      `home-visit-${visit.id}`,
      combined,
      {
        age: visit.patientAge,
        conditions: [],
      },
      (res) => {
        const current = visitRef.current;
        const nextCie =
          !current.diagnosticoCie10.trim() && res.cie10Name
            ? res.cie10Name
            : current.diagnosticoCie10;
        const nextPlan =
          !current.tratamientoIndicacionesDomicilio.trim() && res.suggestedPlan
            ? res.suggestedPlan
            : current.tratamientoIndicacionesDomicilio;

        if (
          nextCie !== current.diagnosticoCie10 ||
          nextPlan !== current.tratamientoIndicacionesDomicilio
        ) {
          onChangeVisit({
            ...current,
            diagnosticoCie10: nextCie,
            tratamientoIndicacionesDomicilio: nextPlan,
          });
        }
        if (res.summaryNotification) {
          onTriggerToast(res.summaryNotification);
        }
      }
    );
  }, [visit.motivoVisita, visit.hallazgosClinicosSoap, visit.id]);

  // Silent background vital signs risk detection in the patient's home
  useEffect(() => {
    const timer = window.setTimeout(() => {
      evaluateVitalsRiskInBackground({
        ta: visit.signosVitales.ta,
        fc: visit.signosVitales.fc,
        temp: visit.signosVitales.temp,
        weight: '70 kg',
        spo2: visit.signosVitales.spo2,
        glucose: visit.signosVitales.glucemiaCapilar,
      }).then((safety) => {
        if (safety && safety.hasAlert && safety.alertMessage) {
          onTriggerToast(safety.alertMessage);
        }
      });
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [
    visit.signosVitales.ta,
    visit.signosVitales.fc,
    visit.signosVitales.temp,
    visit.signosVitales.spo2,
    visit.signosVitales.glucemiaCapilar,
  ]);

  const handleCaptureGps = () => {
    if (!('geolocation' in navigator)) {
      onTriggerToast('Geolocalización no soportada en este navegador');
      return;
    }
    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        onChangeVisit({
          ...visit,
          coordenadasGps: coords,
        });
        setIsCapturingGps(false);
        onTriggerToast(`Coordenadas GPS capturadas: ${coords}`);
      },
      () => {
        setIsCapturingGps(false);
        onTriggerToast(
          'No se pudo obtener el GPS automático; puede escribir las coordenadas o dirección manualmente.'
        );
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  const toggleProcedure = (procName: string) => {
    const exists = visit.procedimientosRealizados.includes(procName);
    const nextList = exists
      ? visit.procedimientosRealizados.filter((p) => p !== procName)
      : [...visit.procedimientosRealizados, procName];
    onChangeVisit({
      ...visit,
      procedimientosRealizados: nextList,
    });
  };

  const googleMapsHref = visit.coordenadasGps.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        visit.coordenadasGps.trim()
      )}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${visit.direccionExacta} ${visit.sectorBarrio} República Dominicana`.trim()
      )}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden space-y-0">
      {/* Top Active Visit Banner */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono-clinical font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
              {visit.fechaVisita} · {visit.horaProgramada}
            </span>
            <h3 className="text-base font-extrabold text-slate-900">
              Visita a Domicilio: {visit.patientName}
            </h3>
            <span className="text-xs text-slate-500">
              ({visit.patientAge} años · Cédula {visit.patientCedula})
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span>
              <strong>Sector:</strong> {visit.sectorBarrio || 'Por definir'} ·{' '}
              <strong>Dirección:</strong> {visit.direccionExacta || 'Por definir'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={visit.estadoVisita}
            onChange={(e) => {
              const nextStatus = e.target.value as HomeVisitStatus;
              onChangeVisit({ ...visit, estadoVisita: nextStatus });
              onTriggerToast(`Estado de visita domiciliaria: ${nextStatus}`);
            }}
            aria-label="Cambiar estado de la visita domiciliaria"
            className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-extrabold text-slate-800 cursor-pointer"
          >
            <option value="Programada">Estado: Programada</option>
            <option value="En traslado">Estado: En traslado al hogar</option>
            <option value="En domicilio">Estado: En domicilio atendiendo</option>
            <option value="Completada">Estado: Completada</option>
          </select>

          <button
            type="button"
            onClick={() => onPrintVisit(visit)}
            className="px-3.5 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Acta MSP Imprimible</span>
          </button>

          {onDeleteVisit && (
            <button
              type="button"
              onClick={() => onDeleteVisit(visit.id)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Eliminar registro de visita"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sub-navigation Tabs for the 5 Comprehensive Home Visit Evaluation Areas */}
      <div className="px-4 sm:px-5 py-2.5 bg-white border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
        {(
          [
            { id: 'logistica', label: '1. Ruta, Sector y GPS' },
            { id: 'soap', label: '2. Signos Vitales y SOAP' },
            { id: 'encamado', label: '3. Encamados, Barthel y UPP' },
            { id: 'cuidador', label: '4. Cuidador y Escala Zarit' },
            { id: 'ambiente', label: '5. Hogar, Vectores y Procedimientos' },
          ] as const
        ).map((tab) => {
          const isAct = activeSubSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubSection(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isAct
                  ? 'text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
              style={isAct ? { backgroundColor: 'var(--brand-primary)' } : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: LOGÍSTICA, SECTOR/BARRIO Y GPS */}
      {activeSubSection === 'logistica' && (
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4
                className="text-sm font-extrabold"
                style={{ color: 'var(--brand-heading)' }}
              >
                Logística de Traslado, Sector/Barrio y Geolocalización GPS
              </h4>
              <p className="text-xs text-slate-500">
                Ubicación comunitaria para visitas en terreno de la UNAP / Consultorio
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCaptureGps}
                disabled={isCapturingGps}
                className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>
                  {isCapturingGps ? 'Capturando GPS...' : 'Capturar GPS Actual'}
                </span>
              </button>

              <a
                href={googleMapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir en Google Maps</span>
              </a>
            </div>
          </div>

          {/* Quick Dominican Sector Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-semibold mr-1">Sectores frecuentes:</span>
            {DOMINICAN_SECTORS_SUGGESTIONS.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => onChangeVisit({ ...visit, sectorBarrio: sec })}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 text-[11px] font-medium cursor-pointer"
              >
                {sec}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Fecha de la Visita
              </label>
              <input
                type="text"
                value={visit.fechaVisita}
                onChange={(e) =>
                  onChangeVisit({ ...visit, fechaVisita: e.target.value })
                }
                placeholder="Ej. 08 Nov 2026"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono-clinical"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Hora Programada / Llegada
              </label>
              <input
                type="text"
                value={visit.horaProgramada}
                onChange={(e) =>
                  onChangeVisit({ ...visit, horaProgramada: e.target.value })
                }
                placeholder="Ej. 09:30 AM"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono-clinical"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Prioridad de Visita Domiciliaria
              </label>
              <select
                value={visit.prioridad}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    prioridad: e.target.value as HomeVisitPriority,
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
              >
                <option value="Urgencia Domiciliaria">Urgencia Domiciliaria</option>
                <option value="Seguimiento Encamado">Seguimiento Encamado</option>
                <option value="Puerperio / Recién Nacido">Puerperio / Recién Nacido</option>
                <option value="Crónico Descompensado">Crónico Descompensado</option>
                <option value="Control Preventivo / Paliativo">
                  Control Preventivo / Paliativo
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Sector / Barrio / Comunidad
              </label>
              <input
                type="text"
                value={visit.sectorBarrio}
                onChange={(e) =>
                  onChangeVisit({ ...visit, sectorBarrio: e.target.value })
                }
                placeholder="Ej. Los Mina Norte, Santo Domingo Este"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Dirección Exacta (Calle, No. de Casa / Apartamento)
              </label>
              <input
                type="text"
                value={visit.direccionExacta}
                onChange={(e) =>
                  onChangeVisit({ ...visit, direccionExacta: e.target.value })
                }
                placeholder="Ej. Calle Marcos del Rosario #42, 2do nivel"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Punto de Referencia Comunitario
              </label>
              <input
                type="text"
                value={visit.puntoReferencia}
                onChange={(e) =>
                  onChangeVisit({ ...visit, puntoReferencia: e.target.value })
                }
                placeholder="Ej. Frente al Colmado La Bendición, casa verde"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Teléfono de Contacto en el Hogar
              </label>
              <input
                type="text"
                value={visit.telefonoContactoHogar}
                onChange={(e) =>
                  onChangeVisit({ ...visit, telefonoContactoHogar: e.target.value })
                }
                placeholder="Ej. 809-555-0192"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono-clinical"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Coordenadas GPS (Latitud, Longitud)
              </label>
              <input
                type="text"
                value={visit.coordenadasGps}
                onChange={(e) =>
                  onChangeVisit({ ...visit, coordenadasGps: e.target.value })
                }
                placeholder="Ej. 18.48605, -69.93121"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono-clinical"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: SIGNOS VITALES EN TERRENO Y EVOLUCIÓN SOAP */}
      {activeSubSection === 'soap' && (
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4
                className="text-sm font-extrabold"
                style={{ color: 'var(--brand-heading)' }}
              >
                Signos Vitales en Domicilio y Evolución Clínica SOAP
              </h4>
              <p className="text-xs text-slate-500">
                Biometría tomada con el maletín médico en el hogar del paciente
              </p>
            </div>

            {onSyncVitalsToPatient && (
              <button
                type="button"
                onClick={() => {
                  onSyncVitalsToPatient({
                    ta: visit.signosVitales.ta,
                    fc: visit.signosVitales.fc,
                    temp: visit.signosVitales.temp,
                    weight: '70.0 kg',
                    spo2: visit.signosVitales.spo2,
                    glucose: visit.signosVitales.glucemiaCapilar,
                  });
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold cursor-pointer"
              >
                Sincronizar signos al expediente principal
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                TA (mmHg)
              </label>
              <input
                type="text"
                value={visit.signosVitales.ta}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    signosVitales: { ...visit.signosVitales, ta: e.target.value },
                  })
                }
                placeholder="130/80"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                FC (lpm)
              </label>
              <input
                type="text"
                value={visit.signosVitales.fc}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    signosVitales: { ...visit.signosVitales, fc: e.target.value },
                  })
                }
                placeholder="76"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                FR (rpm)
              </label>
              <input
                type="text"
                value={visit.signosVitales.fr}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    signosVitales: { ...visit.signosVitales, fr: e.target.value },
                  })
                }
                placeholder="18"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                Temp (°C)
              </label>
              <input
                type="text"
                value={visit.signosVitales.temp}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    signosVitales: { ...visit.signosVitales, temp: e.target.value },
                  })
                }
                placeholder="36.6 °C"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                SpO₂ (%)
              </label>
              <input
                type="text"
                value={visit.signosVitales.spo2}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    signosVitales: { ...visit.signosVitales, spo2: e.target.value },
                  })
                }
                placeholder="97%"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                Glucemia
              </label>
              <input
                type="text"
                value={visit.signosVitales.glucemiaCapilar}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    signosVitales: {
                      ...visit.signosVitales,
                      glucemiaCapilar: e.target.value,
                    },
                  })
                }
                placeholder="110 mg/dL"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                Dolor (EVA)
              </label>
              <select
                value={visit.signosVitales.dolorEva}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    signosVitales: { ...visit.signosVitales, dolorEva: e.target.value },
                  })
                }
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-clinical font-bold"
              >
                <option value="0 / 10">0 / 10 (Sin dolor)</option>
                <option value="2 / 10">2 / 10 (Leve)</option>
                <option value="4 / 10">4 / 10 (Moderado)</option>
                <option value="6 / 10">6 / 10 (Moderado-Fuerte)</option>
                <option value="8 / 10">8 / 10 (Intenso)</option>
                <option value="10 / 10">10 / 10 (Insoportable)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Motivo Principal de la Consulta a Domicilio
              </label>
              <input
                type="text"
                value={visit.motivoVisita}
                onChange={(e) =>
                  onChangeVisit({ ...visit, motivoVisita: e.target.value })
                }
                placeholder="Ej. Paciente postrado por ACV isquémico, control de HTA y cura sacral"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Diagnóstico Clínico CIE-10 en Visita
              </label>
              <input
                type="text"
                value={visit.diagnosticoCie10}
                onChange={(e) =>
                  onChangeVisit({ ...visit, diagnosticoCie10: e.target.value })
                }
                placeholder="Ej. Secuelas de infarto cerebral (I69.3) / Úlcera por decúbito (L89)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Evolución Clínica Domiciliaria (Subjetivo, Examen Físico en Cama y Valoración)
            </label>
            <textarea
              rows={4}
              value={visit.hallazgosClinicosSoap}
              onChange={(e) =>
                onChangeVisit({ ...visit, hallazgosClinicosSoap: e.target.value })
              }
              placeholder="Describa el estado general del paciente en su hogar, hidratación, auscultación cardiopulmonar, estado neurológico y respuesta al tratamiento..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* SECTION 3: EVALUACIÓN DE ENCAMADOS, ÍNDICE DE BARTHEL Y ÚLCERAS POR PRESIÓN (UPP) */}
      {activeSubSection === 'encamado' && (
        <div className="p-5 space-y-4">
          <div>
            <h4
              className="text-sm font-extrabold"
              style={{ color: 'var(--brand-heading)' }}
            >
              Evaluación Funcional de Encamados (Índice de Barthel) y Úlceras por Presión (UPP)
            </h4>
            <p className="text-xs text-slate-500">
              Valoración de actividades básicas de la vida diaria (ABVD), grado de postración y prevención de escaras
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Condición de Movilidad en el Hogar
              </label>
              <select
                value={visit.encamadoEvaluacion.condicionMovilidad}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    encamadoEvaluacion: {
                      ...visit.encamadoEvaluacion,
                      condicionMovilidad: e.target
                        .value as HomeVisitRecord['encamadoEvaluacion']['condicionMovilidad'],
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
              >
                <option value="Ambulatorio con apoyo">
                  Ambulatorio con apoyo (Bastón / Andador)
                </option>
                <option value="Silla de ruedas">Silla de ruedas</option>
                <option value="Encamado parcial">
                  Encamado parcial (Se sienta con ayuda)
                </option>
                <option value="Encamado total (Postrado)">
                  Encamado total (Postrado en cama)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Puntaje Índice de Barthel (0 a 100 pts)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={visit.encamadoEvaluacion.indiceBarthelPuntaje}
                  onChange={(e) => {
                    const raw = Math.min(
                      100,
                      Math.max(0, Number(e.target.value) || 0)
                    );
                    onChangeVisit({
                      ...visit,
                      encamadoEvaluacion: {
                        ...visit.encamadoEvaluacion,
                        indiceBarthelPuntaje: raw,
                        indiceBarthelNivel: computeBarthelLevel(raw),
                      },
                    });
                  }}
                  className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono-clinical font-extrabold"
                />
                <span className="text-xs font-bold text-teal-800">
                  {visit.encamadoEvaluacion.indiceBarthelNivel}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Integridad de la Piel
              </label>
              <select
                value={visit.encamadoEvaluacion.integridadPiel}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    encamadoEvaluacion: {
                      ...visit.encamadoEvaluacion,
                      integridadPiel: e.target
                        .value as HomeVisitRecord['encamadoEvaluacion']['integridadPiel'],
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
              >
                <option value="Íntegra sin lesiones">Íntegra sin lesiones</option>
                <option value="Eritema / Riesgo UPP">
                  Eritema no blanqueable / Riesgo de UPP
                </option>
                <option value="Úlcera por presión activa">
                  Úlcera por presión (UPP) activa
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Estadio de Úlcera por Presión (UPP)
              </label>
              <select
                value={visit.encamadoEvaluacion.uppPresente}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    encamadoEvaluacion: {
                      ...visit.encamadoEvaluacion,
                      uppPresente: e.target
                        .value as HomeVisitRecord['encamadoEvaluacion']['uppPresente'],
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
              >
                <option value="No">Sin úlceras por presión</option>
                <option value="Sí - Grado I">
                  Grado I (Eritema cutáneo con piel íntegra)
                </option>
                <option value="Sí - Grado II">
                  Grado II (Pérdida parcial de epidermis/dermis)
                </option>
                <option value="Sí - Grado III">
                  Grado III (Pérdida completa hasta tejido subcutáneo)
                </option>
                <option value="Sí - Grado IV">
                  Grado IV (Exposición de músculo, hueso o tendón)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Localización Anatómica de UPP / Puntos de Apoyo
              </label>
              <input
                type="text"
                value={visit.encamadoEvaluacion.uppLocalizacion}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    encamadoEvaluacion: {
                      ...visit.encamadoEvaluacion,
                      uppLocalizacion: e.target.value,
                    },
                  })
                }
                placeholder="Ej. Región sacra, trocánter derecho, talones"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Uso de Colchón Antiescaras / Superficie Especial
              </label>
              <select
                value={visit.encamadoEvaluacion.usoColchonAntiescaras}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    encamadoEvaluacion: {
                      ...visit.encamadoEvaluacion,
                      usoColchonAntiescaras: e.target
                        .value as HomeVisitRecord['encamadoEvaluacion']['usoColchonAntiescaras'],
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
              >
                <option value="Sí">Sí (Colchón de aire alternante activo)</option>
                <option value="No">No dispone</option>
                <option value="Gestionado / Recomendado">
                  Recomendado y en gestión familiar
                </option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Pauta de Cambios Posturales y Cuidados de la Piel
              </label>
              <input
                type="text"
                value={visit.encamadoEvaluacion.frecuenciaCambiosPosturales}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    encamadoEvaluacion: {
                      ...visit.encamadoEvaluacion,
                      frecuenciaCambiosPosturales: e.target.value,
                    },
                  })
                }
                placeholder="Ej. Movilización programada cada 2 horas (decúbito supino, lateral izquierdo y derecho), hidratación cutánea y almohadas en talones."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: EVALUACIÓN DEL CUIDADOR PRINCIPAL Y SOBRECARGA ZARIT */}
      {activeSubSection === 'cuidador' && (
        <div className="p-5 space-y-4">
          <div>
            <h4
              className="text-sm font-extrabold"
              style={{ color: 'var(--brand-heading)' }}
            >
              Evaluación del Cuidador Principal y Escala de Sobrecarga de Zarit
            </h4>
            <p className="text-xs text-slate-500">
              Identificación del responsable directo del paciente en casa y prevención del síndrome de desgaste del cuidador
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Nombre Completo del Cuidador Principal
              </label>
              <input
                type="text"
                value={visit.cuidadorEvaluacion.nombreCuidador}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    cuidadorEvaluacion: {
                      ...visit.cuidadorEvaluacion,
                      nombreCuidador: e.target.value,
                    },
                  })
                }
                placeholder="Ej. Carmen Rodríguez"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Parentesco / Relación con el Paciente
              </label>
              <input
                type="text"
                value={visit.cuidadorEvaluacion.parentesco}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    cuidadorEvaluacion: {
                      ...visit.cuidadorEvaluacion,
                      parentesco: e.target.value,
                    },
                  })
                }
                placeholder="Ej. Hija mayor / Cónyuge / Enfermera domiciliaria"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Teléfono Directo del Cuidador
              </label>
              <input
                type="text"
                value={visit.cuidadorEvaluacion.telefonoCuidador}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    cuidadorEvaluacion: {
                      ...visit.cuidadorEvaluacion,
                      telefonoCuidador: e.target.value,
                    },
                  })
                }
                placeholder="Ej. 829-555-0144"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono-clinical"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Horas de Cuidado Diario Dedicadas
              </label>
              <input
                type="text"
                value={visit.cuidadorEvaluacion.horasCuidadoDiario}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    cuidadorEvaluacion: {
                      ...visit.cuidadorEvaluacion,
                      horasCuidadoDiario: e.target.value,
                    },
                  })
                }
                placeholder="Ej. 12 horas/día o Tiempo completo (24h)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Puntaje Escala de Zarit (22 a 110 pts)
              </label>
              <input
                type="number"
                min={22}
                max={110}
                value={visit.cuidadorEvaluacion.escalaZaritPuntaje}
                onChange={(e) => {
                  const val = e.target.value;
                  onChangeVisit({
                    ...visit,
                    cuidadorEvaluacion: {
                      ...visit.cuidadorEvaluacion,
                      escalaZaritPuntaje: val,
                      escalaZaritNivel: computeZaritLevel(val),
                    },
                  });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono-clinical font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Interpretación Sobrecarga de Zarit
              </label>
              <select
                value={visit.cuidadorEvaluacion.escalaZaritNivel}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    cuidadorEvaluacion: {
                      ...visit.cuidadorEvaluacion,
                      escalaZaritNivel: e.target
                        .value as HomeVisitRecord['cuidadorEvaluacion']['escalaZaritNivel'],
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
              >
                <option value="Ausencia de sobrecarga (≤46)">
                  Ausencia de sobrecarga (≤46)
                </option>
                <option value="Sobrecarga leve (47-55)">
                  Sobrecarga leve (47-55)
                </option>
                <option value="Sobrecarga intensa (≥56)">
                  Sobrecarga intensa (≥56 - Riesgo claudicación)
                </option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Capacitación Impartida al Cuidador (Alimentación, Higiene, Sonda, Signos de Alarma)
              </label>
              <input
                type="text"
                value={visit.cuidadorEvaluacion.capacitacionEnCuidados}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    cuidadorEvaluacion: {
                      ...visit.cuidadorEvaluacion,
                      capacitacionEnCuidados: e.target.value,
                    },
                  })
                }
                placeholder="Ej. Se entrena en movilización en bloque, alimentación con cabecera a 45° para evitar broncoaspiración y lavado de sonda."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Red de Apoyo Familiar / Relevos
              </label>
              <input
                type="text"
                value={visit.cuidadorEvaluacion.redApoyoFamiliarComunitaria}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    cuidadorEvaluacion: {
                      ...visit.cuidadorEvaluacion,
                      redApoyoFamiliarComunitaria: e.target.value,
                    },
                  })
                }
                placeholder="Ej. Turnos de fin de semana con hermanos"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: INSPECCIÓN AMBIENTAL, VECTORES Y PROCEDIMIENTOS EN CASA */}
      {activeSubSection === 'ambiente' && (
        <div className="p-5 space-y-5">
          <div>
            <h4
              className="text-sm font-extrabold"
              style={{ color: 'var(--brand-heading)' }}
            >
              Inspección Ambiental del Hogar, Control de Vectores y Procedimientos Realizados
            </h4>
            <p className="text-xs text-slate-500">
              Evaluación de riesgos intradomiciliarios, prevención de Dengue y registro de intervenciones de enfermería/medicina en casa
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Iluminación y Ventilación de la Habitación
              </label>
              <select
                value={visit.inspeccionAmbiental.iluminacionVentilacion}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    inspeccionAmbiental: {
                      ...visit.inspeccionAmbiental,
                      iluminacionVentilacion: e.target
                        .value as HomeVisitRecord['inspeccionAmbiental']['iluminacionVentilacion'],
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
              >
                <option value="Adecuada">Adecuada y ventilada</option>
                <option value="Deficiente">Iluminación o ventilación deficiente</option>
                <option value="Hacinamiento crítico">Hacinamiento crítico</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Vigilancia de Vectores (Criaderos Aedes aegypti / Dengue)
              </label>
              <select
                value={visit.inspeccionAmbiental.criaderosVectoresDengue}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    inspeccionAmbiental: {
                      ...visit.inspeccionAmbiental,
                      criaderosVectoresDengue: e.target
                        .value as HomeVisitRecord['inspeccionAmbiental']['criaderosVectoresDengue'],
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
              >
                <option value="Sin criaderos">
                  Patio y tanques limpios (Sin criaderos)
                </option>
                <option value="Criaderos eliminados / Abatizados">
                  Criaderos eliminados y tanques clorados / abatizados hoy
                </option>
                <option value="Riesgo activo Aedes aegypti">
                  Riesgo activo de Aedes aegypti (Requiere jornada UNAP)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Almacenamiento de Medicamentos en el Hogar
              </label>
              <select
                value={visit.inspeccionAmbiental.almacenamientoMedicamentosHogar}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    inspeccionAmbiental: {
                      ...visit.inspeccionAmbiental,
                      almacenamientoMedicamentosHogar: e.target
                        .value as HomeVisitRecord['inspeccionAmbiental']['almacenamientoMedicamentosHogar'],
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
              >
                <option value="Seguro y organizado">
                  Seguro, fresco y organizado por horarios
                </option>
                <option value="Inadecuado / Requiere pastillero">
                  Inadecuado / Se rotula y organiza pastillero hoy
                </option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Barreras Arquitectónicas y Riesgos de Caídas en el Hogar
              </label>
              <input
                type="text"
                value={visit.inspeccionAmbiental.barrerasArquitectonicasCaidas}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    inspeccionAmbiental: {
                      ...visit.inspeccionAmbiental,
                      barrerasArquitectonicasCaidas: e.target.value,
                    },
                  })
                }
                placeholder="Ej. Escalones sin pasamanos, piso de baño resbaladizo (se recomienda barra de apoyo y alfombra antideslizante)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Agua Potable y Saneamiento
              </label>
              <input
                type="text"
                value={visit.inspeccionAmbiental.aguaPotableSaneamiento}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    inspeccionAmbiental: {
                      ...visit.inspeccionAmbiental,
                      aguaPotableSaneamiento: e.target.value,
                    },
                  })
                }
                placeholder="Ej. Agua de botellón / cisterna clorada"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Procedimientos Realizados en Casa */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <label className="block text-xs font-extrabold text-slate-800">
              Procedimientos Clínicos Ejecutados en el Domicilio ({visit.procedimientosRealizados.length} marcados):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HOME_VISIT_PROCEDURES_CATALOG.map((proc) => {
                const isChecked = visit.procedimientosRealizados.includes(proc);
                return (
                  <button
                    key={proc}
                    type="button"
                    onClick={() => toggleProcedure(proc)}
                    className={`p-2.5 rounded-xl border text-left text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-teal-50/90 border-teal-400 text-teal-950 font-bold'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                        isChecked
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <span className="truncate">{proc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Detalle Técnico de Procedimientos (Sonda, Curas, Nebulización)
              </label>
              <textarea
                rows={2}
                value={visit.detalleProcedimientos}
                onChange={(e) =>
                  onChangeVisit({ ...visit, detalleProcedimientos: e.target.value })
                }
                placeholder="Ej. Recambio de sonda Foley #16 sin complicaciones, balón con 10 ml de agua destilada; cura con solución salina 0.9%."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tratamiento e Indicaciones Dejadas en el Hogar
              </label>
              <textarea
                rows={2}
                value={visit.tratamientoIndicacionesDomicilio}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    tratamientoIndicacionesDomicilio: e.target.value,
                  })
                }
                placeholder="Medicamentos ajustados, dieta e indicaciones escritas para la familia..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Próximo Seguimiento Domiciliario
              </label>
              <input
                type="text"
                value={visit.proximoSeguimientoDomiciliario}
                onChange={(e) =>
                  onChangeVisit({
                    ...visit,
                    proximoSeguimientoDomiciliario: e.target.value,
                  })
                }
                placeholder="Ej. En 7 días para reevaluar úlcera"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs mb-2"
              />
              <button
                type="button"
                onClick={() => onPrintVisit(visit)}
                className="w-full py-2 px-3 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Generar Acta Oficial MSP</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// VISTA PRINCIPAL DEL MÓDULO LATERAL: "VISITA DOMICILIARIA"
// (Ruta por Sector/Barrio + Check-list de Maletín UNAP + Estación en Domicilio)
// ============================================================================
interface HomeVisitModuleProps {
  patients: Patient[];
  selectedPatient: Patient | null;
  activeDoctor: DoctorProfile;
  homeVisits: HomeVisitRecord[];
  onAddHomeVisit: (newVisit: HomeVisitRecord) => void;
  onUpdateHomeVisit: (updatedVisit: HomeVisitRecord) => void;
  onDeleteHomeVisit: (visitId: string) => void;
  medicalBag: MedicalBagChecklistItem[];
  onToggleBagItem: (itemId: string) => void;
  onMarkAllBagReady: () => void;
  onAddBagItem: (name: string, category: MedicalBagChecklistItem['category']) => void;
  onSelectPatient: (patient: Patient) => void;
  onUpdatePatientVitals: (vitals: VitalSigns) => void;
  onOpenNewPatient: () => void;
  onTriggerToast: (msg: string) => void;
}

export const HomeVisitModule: React.FC<HomeVisitModuleProps> = ({
  patients,
  selectedPatient,
  activeDoctor,
  homeVisits,
  onAddHomeVisit,
  onUpdateHomeVisit,
  onDeleteHomeVisit,
  medicalBag,
  onToggleBagItem,
  onMarkAllBagReady,
  onAddBagItem,
  onSelectPatient,
  onUpdatePatientVitals,
  onOpenNewPatient,
  onTriggerToast,
}) => {
  const [selectedVisitId, setSelectedVisitId] = useState<string>(
    () => homeVisits[0]?.id || ''
  );
  const [routeFilter, setRouteFilter] = useState<'todas' | 'pendientes' | 'completadas'>(
    'todas'
  );
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showMedicalBagPanel, setShowMedicalBagPanel] = useState(false);
  const [printModalVisit, setPrintModalVisit] = useState<HomeVisitRecord | null>(null);

  // Schedule New Home Visit Form State
  const [targetPatientId, setTargetPatientId] = useState<string>(
    selectedPatient?.id || patients[0]?.id || ''
  );
  const [schedSector, setSchedSector] = useState('');
  const [schedAddress, setSchedAddress] = useState('');
  const [schedReference, setSchedReference] = useState('');
  const [schedTime, setSchedTime] = useState('09:00 AM');
  const [schedPriority, setSchedPriority] =
    useState<HomeVisitPriority>('Seguimiento Encamado');
  const [schedReason, setSchedReason] = useState('');

  // Custom Bag Item Input
  const [newBagItemName, setNewBagItemName] = useState('');
  const [newBagItemCat, setNewBagItemCat] =
    useState<MedicalBagChecklistItem['category']>('Diagnóstico');

  const activeVisit: HomeVisitRecord | null =
    homeVisits.find((v) => v.id === selectedVisitId) || homeVisits[0] || null;

  const filteredVisits = homeVisits.filter((v) => {
    if (routeFilter === 'pendientes') return v.estadoVisita !== 'Completada';
    if (routeFilter === 'completadas') return v.estadoVisita === 'Completada';
    return true;
  });

  const bagReadyCount = medicalBag.filter((b) => b.checked).length;
  const bagReadyPct =
    medicalBag.length > 0 ? Math.round((bagReadyCount / medicalBag.length) * 100) : 100;

  const handleCreateScheduledVisit = (e: React.FormEvent) => {
    e.preventDefault();
    const pat =
      patients.find((p) => p.id === targetPatientId) ||
      selectedPatient ||
      patients[0];
    if (!pat) {
      onOpenNewPatient();
      return;
    }

    const baseVisit = buildDefaultHomeVisitForPatient(
      pat,
      activeDoctor.name,
      activeDoctor.exequatur,
      `${activeDoctor.unapCenter} (${activeDoctor.consultorio})`
    );
    const created: HomeVisitRecord = {
      ...baseVisit,
      horaProgramada: schedTime || '09:00 AM',
      prioridad: schedPriority,
      sectorBarrio: schedSector.trim() || pat.address || 'Sector Comunitario',
      direccionExacta: schedAddress.trim() || pat.address || '',
      puntoReferencia: schedReference.trim(),
      motivoVisita:
        schedReason.trim() || 'Consulta médica domiciliaria programada',
    };

    onAddHomeVisit(created);
    setSelectedVisitId(created.id);
    setShowScheduleForm(false);
    setSchedSector('');
    setSchedAddress('');
    setSchedReference('');
    setSchedReason('');
  };

  return (
    <div className="space-y-5">
      {/* TOP HEADER BANNER */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <MacHomeVisitIcon size="lg" className="shrink-0" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className="text-lg sm:text-xl font-extrabold tracking-tight"
                style={{ color: 'var(--brand-heading)' }}
              >
                Consulta a Domicilio y Terreno (UNAP / MSP)
              </h2>
              <span className="text-xs text-slate-500">
                · {activeDoctor.name} ({activeDoctor.consultorio})
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Ruta comunitaria por sector/barrio, check-list de maletín médico, valoración de encamados (Barthel / UPP), cuidador (Zarit) y Acta Oficial MSP imprimible.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowMedicalBagPanel((prev) => !prev)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-extrabold flex items-center gap-2 transition-colors cursor-pointer ${
              bagReadyPct === 100
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            <BriefcaseMedical className="w-4 h-4" />
            <span>
              Maletín UNAP: {bagReadyCount}/{medicalBag.length} ({bagReadyPct}%)
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (patients.length === 0) {
                onOpenNewPatient();
              } else {
                setTargetPatientId(selectedPatient?.id || patients[0].id);
                setShowScheduleForm((prev) => !prev);
              }
            }}
            className="px-4 py-2 rounded-xl text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <Plus className="w-4 h-4" />
            <span>+ Programar Visita a Domicilio</span>
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90">
          <span className="text-xs text-slate-500 block">
            Total Visitas en Ruta
          </span>
          <span
            className="text-2xl font-extrabold font-mono-clinical mt-0.5 block"
            style={{ color: 'var(--brand-heading)' }}
          >
            {homeVisits.length}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90">
          <span className="text-xs text-slate-500 block">
            En Traslado / En Hogar
          </span>
          <span className="text-2xl font-extrabold font-mono-clinical text-amber-600 mt-0.5 block">
            {
              homeVisits.filter(
                (v) =>
                  v.estadoVisita === 'En traslado' ||
                  v.estadoVisita === 'En domicilio'
              ).length
            }
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90">
          <span className="text-xs text-slate-500 block">
            Visitas Completadas
          </span>
          <span className="text-2xl font-extrabold font-mono-clinical text-emerald-700 mt-0.5 block">
            {homeVisits.filter((v) => v.estadoVisita === 'Completada').length}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90">
          <span className="text-xs text-slate-500 block">
            Maletín Médico de Terreno
          </span>
          <span
            className="text-2xl font-extrabold font-mono-clinical mt-0.5 block"
            style={{ color: 'var(--brand-primary)' }}
          >
            {bagReadyPct}% listo
          </span>
        </div>
      </div>

      {/* COLLAPSIBLE CHECK-LIST DE MALETÍN MÉDICO PARA TERRENO UNAP */}
      {showMedicalBagPanel && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3
                className="text-sm font-extrabold flex items-center gap-2"
                style={{ color: 'var(--brand-heading)' }}
              >
                <BriefcaseMedical className="w-4 h-4 text-teal-700" />
                <span>
                  Check-list de Maletín Médico para Visita Domiciliaria (UNAP / MSP)
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Verifique sus equipos diagnósticos, insumos de curas/sondas, medicamentos de urgencia y formularios antes de salir al sector.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onMarkAllBagReady}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                Marcar Todo Listo (100%)
              </button>
              <button
                type="button"
                onClick={() => setShowMedicalBagPanel(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cerrar maletín
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {medicalBag.map((item) => (
              <div
                key={item.id}
                onClick={() => onToggleBagItem(item.id)}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  item.checked
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                      item.checked
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-slate-300'
                    }`}
                  >
                    {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold truncate ${
                        item.checked ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      {item.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {item.category} · {item.quantitySpec}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Custom Item to Bag */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newBagItemName.trim()) return;
              onAddBagItem(newBagItemName.trim(), newBagItemCat);
              setNewBagItemName('');
            }}
            className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100"
          >
            <input
              type="text"
              value={newBagItemName}
              onChange={(e) => setNewBagItemName(e.target.value)}
              placeholder="Añadir insumo adicional al maletín (ej. Sonda nasogástrica #14)..."
              className="flex-1 min-w-[220px] px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
            />
            <select
              value={newBagItemCat}
              onChange={(e) =>
                setNewBagItemCat(
                  e.target.value as MedicalBagChecklistItem['category']
                )
              }
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
            >
              <option value="Diagnóstico">Diagnóstico</option>
              <option value="Procedimientos y Curas">Procedimientos y Curas</option>
              <option value="Fármacos y PAI">Fármacos y PAI</option>
              <option value="Documentación MSP">Documentación MSP</option>
            </select>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl text-white text-xs font-bold cursor-pointer"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              + Añadir al Maletín
            </button>
          </form>
        </div>
      )}

      {/* INLINE FORM TO SCHEDULE A NEW HOME VISIT */}
      {showScheduleForm && (
        <form
          onSubmit={handleCreateScheduledVisit}
          className="bg-white rounded-2xl p-5 border border-teal-300 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3
              className="text-sm font-extrabold"
              style={{ color: 'var(--brand-heading)' }}
            >
              Programar Nueva Consulta a Domicilio en la Ruta
            </h3>
            <button
              type="button"
              onClick={() => setShowScheduleForm(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Paciente a Visitar
              </label>
              <select
                value={targetPatientId}
                onChange={(e) => {
                  const pid = e.target.value;
                  setTargetPatientId(pid);
                  const found = patients.find((p) => p.id === pid);
                  if (found) {
                    setSchedSector(found.address || '');
                    setSchedAddress(found.address || '');
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-bold"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.age} años · #{p.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Hora Estimada de Visita
              </label>
              <input
                type="text"
                value={schedTime}
                onChange={(e) => setSchedTime(e.target.value)}
                placeholder="Ej. 10:00 AM"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono-clinical"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Prioridad Clínica
              </label>
              <select
                value={schedPriority}
                onChange={(e) =>
                  setSchedPriority(e.target.value as HomeVisitPriority)
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
              >
                <option value="Seguimiento Encamado">Seguimiento Encamado</option>
                <option value="Urgencia Domiciliaria">Urgencia Domiciliaria</option>
                <option value="Crónico Descompensado">Crónico Descompensado</option>
                <option value="Puerperio / Recién Nacido">Puerperio / Recién Nacido</option>
                <option value="Control Preventivo / Paliativo">
                  Control Preventivo / Paliativo
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Sector / Barrio
              </label>
              <input
                type="text"
                required
                value={schedSector}
                onChange={(e) => setSchedSector(e.target.value)}
                placeholder="Ej. Villa Juana / Los Mina / Gazcue"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Dirección Exacta (Calle y Número)
              </label>
              <input
                type="text"
                required
                value={schedAddress}
                onChange={(e) => setSchedAddress(e.target.value)}
                placeholder="Ej. Calle 14 #28, casa blanca"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Punto de Referencia
              </label>
              <input
                type="text"
                value={schedReference}
                onChange={(e) => setSchedReference(e.target.value)}
                placeholder="Ej. Al lado de la Farmacia San Miguel"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Motivo de la Visita Domiciliaria
              </label>
              <input
                type="text"
                value={schedReason}
                onChange={(e) => setSchedReason(e.target.value)}
                placeholder="Ej. Paciente encamado para cambio de sonda vesical, control de TA y evaluación de UPP..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="flex items-end justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowScheduleForm(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-white text-xs font-extrabold cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                Crear Visita en Ruta
              </button>
            </div>
          </div>
        </form>
      )}

      {/* MAIN 2-COLUMN WORKSPACE: LEFT 4 COLS ROUTE LIST | RIGHT 8 COLS CLINICAL HOME VISIT STATION */}
      {patients.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-slate-200/90 text-center space-y-4">
          <MacHomeVisitIcon size="lg" className="mx-auto" />
          <div className="max-w-md mx-auto space-y-1.5">
            <h3
              className="text-base font-extrabold"
              style={{ color: 'var(--brand-heading)' }}
            >
              Registre primero un paciente para iniciar las Consultas a Domicilio
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Una vez registrado el paciente, podrá programar su visita por sector/barrio, capturar coordenadas GPS, evaluar encamados (Barthel / UPP), cuidador (Zarit) e imprimir el Acta Oficial MSP.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenNewPatient}
            className="px-5 py-2.5 rounded-xl text-white text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Registrar Primer Paciente</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT 4 COLS: RUTA POR SECTOR / BARRIO */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3
                  className="text-sm font-extrabold"
                  style={{ color: 'var(--brand-heading)' }}
                >
                  Ruta por Sector / Barrio
                </h3>
                <p className="text-[11px] text-slate-500">
                  {filteredVisits.length} domicilios en lista
                </p>
              </div>

              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-[11px] font-bold">
                {(
                  [
                    { id: 'todas', label: 'Todas' },
                    { id: 'pendientes', label: 'Activas' },
                    { id: 'completadas', label: 'Listas' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setRouteFilter(f.id)}
                    className={`px-2 py-1 rounded-md cursor-pointer ${
                      routeFilter === f.id
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredVisits.length === 0 ? (
              <div className="py-8 text-center space-y-2.5">
                <MapPin className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  No hay visitas domiciliarias en esta vista
                </p>
                <p className="text-[11px] text-slate-500">
                  Programe una visita para organizar la salida a terreno de hoy.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPatient) {
                      const instantVisit = buildDefaultHomeVisitForPatient(
                        selectedPatient,
                        activeDoctor.name,
                        activeDoctor.exequatur,
                        `${activeDoctor.unapCenter} (${activeDoctor.consultorio})`
                      );
                      onAddHomeVisit(instantVisit);
                      setSelectedVisitId(instantVisit.id);
                    } else {
                      setShowScheduleForm(true);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer"
                  style={{
                    backgroundColor: 'var(--brand-soft-bg)',
                    color: 'var(--brand-primary)',
                  }}
                >
                  + Crear Visita para {selectedPatient?.name.split(' ')[0] || 'Paciente'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredVisits.map((v) => {
                  const isSelected = activeVisit?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        setSelectedVisitId(v.id);
                        const pat = patients.find((p) => p.id === v.patientId);
                        if (pat) onSelectPatient(pat);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'bg-teal-50/70 border-teal-400 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-clinical text-[11px] font-bold text-slate-500">
                          {v.fechaVisita} · {v.horaProgramada}
                        </span>
                        <span
                          className={`text-[10.5px] font-extrabold ${
                            v.estadoVisita === 'Completada'
                              ? 'text-emerald-700'
                              : v.estadoVisita === 'En domicilio'
                              ? 'text-teal-700'
                              : v.estadoVisita === 'En traslado'
                              ? 'text-amber-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {v.estadoVisita}
                        </span>
                      </div>

                      <p className="text-xs font-extrabold text-slate-900">
                        {v.patientName} ({v.patientAge} a)
                      </p>

                      <p className="text-[11px] text-slate-600 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-teal-700 shrink-0" />
                        <span className="truncate">
                          {v.sectorBarrio || 'Sin sector'} — {v.direccionExacta || 'Sin dirección'}
                        </span>
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[10.5px] text-slate-500">
                        <span>{v.prioridad}</span>
                        <span>
                          Barthel: <strong>{v.encamadoEvaluacion.indiceBarthelPuntaje}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT 8 COLS: ESTACIÓN DE EVALUACIÓN EN DOMICILIO */}
          <div className="lg:col-span-8">
            {!activeVisit ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200/90 text-center space-y-3">
                <MacClipboardIcon size="lg" className="mx-auto" />
                <h3
                  className="text-base font-extrabold"
                  style={{ color: 'var(--brand-heading)' }}
                >
                  Seleccione o cree una visita domiciliaria en la columna izquierda
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Podrá completar los signos vitales en terreno, la escala de Barthel, úlceras por presión, sobrecarga del cuidador (Zarit), inspección ambiental y procedimientos realizados.
                </p>
                {selectedPatient && (
                  <button
                    type="button"
                    onClick={() => {
                      const created = buildDefaultHomeVisitForPatient(
                        selectedPatient,
                        activeDoctor.name,
                        activeDoctor.exequatur,
                        `${activeDoctor.unapCenter} (${activeDoctor.consultorio})`
                      );
                      onAddHomeVisit(created);
                      setSelectedVisitId(created.id);
                    }}
                    className="px-4 py-2 rounded-xl text-white text-xs font-extrabold cursor-pointer"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    + Iniciar Visita a Domicilio para {selectedPatient.name}
                  </button>
                )}
              </div>
            ) : (
              <HomeVisitClinicalEditor
                visit={activeVisit}
                onChangeVisit={onUpdateHomeVisit}
                onSyncVitalsToPatient={onUpdatePatientVitals}
                onPrintVisit={(v) => setPrintModalVisit(v)}
                onDeleteVisit={onDeleteHomeVisit}
                onTriggerToast={onTriggerToast}
              />
            )}
          </div>
        </div>
      )}

      {/* Printable Official MSP Home Visit Act Modal */}
      <HomeVisitPrintableActModal
        isOpen={printModalVisit !== null}
        onClose={() => setPrintModalVisit(null)}
        visit={printModalVisit}
        activeDoctor={activeDoctor}
      />
    </div>
  );
};
