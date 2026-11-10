import React, { useState } from 'react';
import {
  X,
  BookOpen,
  UserPlus,
  ClipboardCheck,
  Stethoscope,
  Calendar,
  Baby,
  Printer,
  Users,
  CloudCheck,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { NavSection } from './ClinicalModalsAndViews';
import {
  MacHomeIcon,
  MacNewPatientIcon,
  MacClipboardIcon,
  MacStethoscopeIcon,
  MacCalendarIcon,
  MacPediatricIcon,
  MacPillIcon,
  MacChartIcon,
} from './MacOSIcons';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToSection: (section: NavSection) => void;
  onOpenNewPatient: () => void;
}

interface TutorialStep {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ReactNode;
  description: string;
  actionsList: string[];
  tip: string;
  ctaLabel: string;
  targetSection?: NavSection;
  triggersNewPatient?: boolean;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'paso-1',
    stepNumber: 1,
    title: 'Inicio de Sesión con Google y Multi-Médico (Guardia)',
    subtitle: 'Acceso seguro con Firebase y cambio de médico activo en 1 clic',
    badge: 'Autenticación & Turnos',
    icon: <MacHomeIcon size="md" />,
    description:
      'Familia+ permite que múltiples médicos familiares trabajen en el mismo centro (UNAP / CPN) o consultorio. Cada médico inicia sesión con su cuenta de Google o selecciona su perfil en guardia.',
    actionsList: [
      'En la barra superior encontrarás el selector de médico activo (ej. Médico(a) Familiar de Guardia · Consultorio 101).',
      'Cuando cambias el médico en guardia, todas las notas SOAP, recetas, referencias y las 7 fichas clínicas llevan automáticamente tu nombre, Exequátur (Ley 42-01) y número del CMD.',
      'En "Configuración" puedes editar tu Exequátur, especialidad, tanda (Matutina/Vespertina) o registrar a otros médicos colegas del centro.',
    ],
    tip: 'Cada documento impreso actualiza automáticamente el membrete y el sello digital con las credenciales del médico activo.',
    ctaLabel: 'Ir a Configuración Médica',
    targetSection: 'Configuración',
  },
  {
    id: 'paso-2',
    stepNumber: 2,
    title: 'Registrar un Nuevo Paciente',
    subtitle: 'Creación limpia del expediente clínico individual',
    badge: 'Admisión',
    icon: <MacNewPatientIcon size="md" />,
    description:
      'Como el sistema está limpio para uso real, el primer paso al recibir un paciente es crear su expediente clínico.',
    actionsList: [
      'Haz clic en el botón "+ Nuevo Paciente" en la esquina superior derecha o en el acceso rápido del Panel del Día.',
      'Completa el nombre completo, edad, sexo, cédula dominicana (001-XXXXXXX-X), ARS (SENASA, Primera, Universal, Mapfre, etc.), tipo de sangre y teléfono.',
      'Registra sus signos vitales iniciales (TA, FC, Temperatura, Peso y Talla), alergias medicamentosas y antecedentes.',
      'Al guardar, el paciente queda seleccionado como "Paciente Activo" y se inicializan sus 7 Fichas Clínicas MSP en blanco.',
    ],
    tip: 'Usa el buscador superior (o el atajo Ctrl + K) para encontrar cualquier paciente por nombre, cédula o código CIE-10 al instante.',
    ctaLabel: '+ Registrar un Paciente Ahora',
    triggersNewPatient: true,
  },
  {
    id: 'paso-3',
    stepNumber: 3,
    title: 'Módulo de 7 Fichas Clínicas Oficiales (MSP)',
    subtitle: 'Estándar de Atención Primaria y Medicina Familiar en República Dominicana',
    badge: '7 Formularios MSP',
    icon: <MacClipboardIcon size="md" />,
    description:
      'El corazón clínico de Familia+ reúne en un centro unificado con pestañas las 7 fichas normativas del Ministerio de Salud Pública:',
    actionsList: [
      '1. Historia Clínica Individual: Datos filiatorios, antecedentes personales/familiares, hábitos tóxicos, alergias y examen físico regional.',
      '2. Consulta Médica: Motivo de consulta, enfermedad actual (HEA), signos vitales con cálculo automático de IMC, diagnóstico CIE-10 y plan.',
      '3. Ficha Familiar: Integrantes del hogar, parentesco, condiciones de la vivienda (agua, techo, piso, excretas), APGAR familiar y riesgos.',
      '4. Seguimiento de Crónicas: Metas de HTA, Diabetes (HbA1c, pie diabético), Obesidad, Dislipidemia y función renal (TFG).',
      '5. Fichas de Prevención: Esquema de vacunación PAI y tamizajes oncológicos/metabólicos (Papanicolaou, Mamografía, PSA, Colon).',
      '6. Fichas Especiales por Ciclo de Vida: Embarazo (CLAP), Puerperio, Niño Sano, Adolescente (HEEADSSS) y Adulto Mayor (Katz / Yesavage).',
      '7. Referencia y Contrarreferencia: Boleta oficial hacia hospitales de 2do/3er nivel (HGPS, CEDIMAT, Gautier, INCART, Maternidad).',
    ],
    tip: 'Todos los cambios tienen Guardado Automático en la nube (Firebase Firestore) y respaldo local instantáneo.',
    ctaLabel: 'Abrir las 7 Fichas Clínicas MSP',
    targetSection: 'Fichas Clínicas',
  },
  {
    id: 'paso-4',
    stepNumber: 4,
    title: 'Estación de Consulta SOAP, CIE-10 y Recetas (Ley 42-01)',
    subtitle: 'Evolución clínica ágil, órdenes de laboratorio y recetario médico',
    badge: 'Consulta & Recetario',
    icon: <MacStethoscopeIcon size="md" preset="indigo" />,
    description:
      'Para consultas rápidas de seguimiento, puedes usar tanto la "Estación SOAP" como la cabina interactiva del Panel del Día:',
    actionsList: [
      'Actualiza signos vitales en vivo (Presión Arterial, FC, Temperatura, Peso/IMC y Glucemia Capilar).',
      'Añade diagnósticos codificados con sugerencias CIE-10 (HTA I10, Diabetes E11, Dislipidemia E78, Dengue A97, etc.).',
      'Prescribe medicamentos en 1 clic desde el Cuadro Básico Esencial y solicita paneles de laboratorio (Hemograma, Perfil Lipídico, HbA1c, Orina).',
      'Redacta notas de evolución SOAP usando plantillas rápidas autocompletables.',
    ],
    tip: 'Haz clic en "Imprimir Receta (Ley 42-01)" para generar el recetario oficial con tu nombre, Exequátur, CMD y firma.',
    ctaLabel: 'Ir a Estación SOAP',
    targetSection: 'Consulta',
  },
  {
    id: 'paso-5',
    stepNumber: 5,
    title: 'Agenda del Día, Pediatría OMS y Vigilancia EPI-1',
    subtitle: 'Control integral del consultorio y reportes epidemiológicos',
    badge: 'Gestión & EPI-1',
    icon: <MacPediatricIcon size="md" />,
    description:
      'Completa la gestión diaria del consultorio con los módulos especializados del menú izquierdo:',
    actionsList: [
      'Agenda y Sala de Espera: Programa citas por hora, cambia el estado del turno ("Confirmada" → "En sala" → "En consulta" → "Completada").',
      'Pediatría & Vacunas PAI: Registra pacientes pediátricos, grafica su curva de peso para la edad (Percentiles OMS P3, P50, P97) y lleva el control de dosis aplicadas del PAI.',
      'Reportes & EPI-1 (DIGEPI): Visualiza en tiempo real las estadísticas de tus pacientes reales (crónicos controlados, vacunas aplicadas) y exporta el consolidado en CSV.',
      'Paletas de Color: Cambia en cualquier momento entre los temas "Esmeralda", "Índigo" y "Grafito" desde la barra superior.',
    ],
    tip: 'En "Fichas Clínicas" puedes imprimir tanto la ficha activa (ej. solo la Hoja de Referencia) como el Expediente Clínico Completo.',
    ctaLabel: 'Ir a Pediatría & Vacunas PAI',
    targetSection: 'Pediatría & Vacunas',
  },
  {
    id: 'paso-6',
    stepNumber: 6,
    title: 'Consulta a Domicilio y Terreno (UNAP / MSP)',
    subtitle: 'Ruta por sector/GPS, maletín médico, Barthel, UPP, Zarit y Acta Oficial',
    badge: 'Visita Domiciliaria',
    icon: <MacClipboardIcon size="md" />,
    description:
      'Disponible tanto en el menú lateral ("Visita Domiciliaria") como en la Pestaña 08 de las Fichas Clínicas MSP para atender pacientes encamados o en su hogar:',
    actionsList: [
      'Ruta por Sector / Barrio y GPS: Organiza las visitas del día con dirección exacta, punto de referencia dominicano, captura de coordenadas GPS y apertura en Google Maps.',
      'Check-list de Maletín Médico UNAP: Verifica esfigmomanómetro, glucómetro, oxímetro, kit de curas, sondas Foley, nebulizador y recetario antes de salir a terreno.',
      'Evaluación de Encamados y Cuidador: Calcula automáticamente el Índice de Barthel (0–100), clasifica Úlceras por Presión (Grados I–IV) y evalúa la sobrecarga del cuidador (Escala de Zarit).',
      'Inspección Ambiental y Procedimientos en Casa: Registra barreras de caídas, criaderos de vectores (Dengue), curas, recambio de sondas o nebulizaciones.',
    ],
    tip: 'Al finalizar la visita, pulsa "Acta MSP Imprimible" para emitir el documento oficial con firma del médico y del familiar/cuidador responsable.',
    ctaLabel: 'Abrir Visita Domiciliaria',
    targetSection: 'Visita Domiciliaria',
  },
];

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onNavigateToSection,
  onOpenNewPatient,
}) => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = TUTORIAL_STEPS[activeStepIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Top Header */}
        <div
          className="px-6 py-4 text-white flex items-center justify-between"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--sidebar-from), var(--sidebar-via), var(--sidebar-to))',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">
                  Tutorial Interactivo · Familia+ Medicina Familiar RD
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-teal-400/20 border border-teal-300/30 text-[10.5px] font-bold text-teal-200">
                  Guía Paso a Paso
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Aprende a utilizar los expedientes, las 7 Fichas Clínicas MSP, el recetario Ley 42-01 y el sistema multi-médico
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Cerrar tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center gap-2 overflow-x-auto">
          {TUTORIAL_STEPS.map((step, idx) => {
            const isActive = idx === activeStepIndex;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStepIndex(idx)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  isActive
                    ? 'bg-white text-slate-900 border-teal-500/60 shadow-2xs'
                    : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-200/60'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center ${
                    isActive
                      ? 'text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                  style={
                    isActive ? { backgroundColor: 'var(--brand-primary)' } : undefined
                  }
                >
                  {step.stepNumber}
                </span>
                <span>{step.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Body */}
        <div className="p-6 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-start gap-4">
              <div className="shrink-0">{currentStep.icon}</div>
              <div>
                <span
                  className="text-[11px] font-extrabold uppercase tracking-wider"
                  style={{ color: 'var(--brand-primary)' }}
                >
                  Paso {currentStep.stepNumber} de {TUTORIAL_STEPS.length} · {currentStep.badge}
                </span>
                <h3
                  className="text-lg sm:text-xl font-extrabold mt-0.5"
                  style={{ color: 'var(--brand-heading)' }}
                >
                  {currentStep.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {currentStep.subtitle}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                if (currentStep.triggersNewPatient) {
                  onOpenNewPatient();
                } else if (currentStep.targetSection) {
                  onNavigateToSection(currentStep.targetSection);
                }
              }}
              className="px-4 py-2.5 rounded-xl text-white text-xs font-extrabold flex items-center gap-2 shadow-sm hover:opacity-95 transition-opacity shrink-0 cursor-pointer self-start sm:self-center"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <span>{currentStep.ctaLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
            {currentStep.description}
          </p>

          {/* Detailed Bullet Points */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              ¿Cómo funciona paso a paso?
            </h4>
            <div className="space-y-2">
              {currentStep.actionsList.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-slate-800">
                  <CheckCircle2
                    className="w-4 h-4 shrink-0 mt-0.5"
                    style={{ color: 'var(--brand-primary)' }}
                  />
                  <span className="leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Tip Box */}
          <div
            className="rounded-2xl p-3.5 border flex items-center gap-3 text-xs"
            style={{
              backgroundColor: 'var(--brand-soft-bg)',
              borderColor: 'var(--brand-soft-border)',
            }}
          >
            <Sparkles
              className="w-5 h-5 shrink-0"
              style={{ color: 'var(--brand-primary)' }}
            />
            <div>
              <strong style={{ color: 'var(--brand-heading)' }}>
                Consejo Clínico Familia+:
              </strong>{' '}
              <span className="text-slate-700">{currentStep.tip}</span>
            </div>
          </div>

          {/* Quick Reference Grid of Modules */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CloudCheck className="w-4 h-4 text-emerald-600" />
              <span>
                Sincronización en la nube <strong>Firebase Firestore</strong> activa
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={activeStepIndex === 0}
                onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                ← Anterior
              </button>

              {activeStepIndex < TUTORIAL_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setActiveStepIndex((prev) =>
                      Math.min(TUTORIAL_STEPS.length - 1, prev + 1)
                    )
                  }
                  className="px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  Siguiente paso →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  ¡Entendido, comenzar a usar!
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
