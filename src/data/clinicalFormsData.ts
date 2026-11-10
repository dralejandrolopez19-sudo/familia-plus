import { Patient } from './mockClinicalData';

export type ClinicalFormTabId =
  | 'historia-individual'
  | 'consulta-medica'
  | 'ficha-familiar'
  | 'enfermedades-cronicas'
  | 'prevencion-tamizaje'
  | 'fichas-especiales'
  | 'referencia-contrarreferencia'
  | 'visita-domiciliaria';

// 1. Historia Clínica Individual
export interface IndividualHistoryForm {
  fechaApertura: string;
  estadoCivil: 'Soltero(a)' | 'Casado(a)' | 'Unión libre' | 'Divorciado(a)' | 'Viudo(a)';
  ocupacion: string;
  escolaridad: 'Primaria' | 'Secundaria' | 'Universitaria' | 'Técnico' | 'Sin escolaridad';
  lugarNacimiento: string;
  nssAfiliado: string;
  contactoEmergenciaNombre: string;
  contactoEmergenciaParentesco: string;
  contactoEmergenciaTelefono: string;
  antecedentesPatologicos: string;
  antecedentesQuirurgicos: string;
  antecedentesTraumaticos: string;
  antecedentesTransfusionales: string;
  antecedentesGinecoObstetricos: string;
  antecedentesFamiliares: string;
  alergiasMedicamentosas: string;
  alergiasAlimentariasAmbientales: string;
  reaccionAlergicaTipo: string;
  habitoTabaco: 'No fumador' | 'Exfumador' | 'Fumador activo';
  habitoAlcohol: 'No consume' | 'Ocasional' | 'Frecuente';
  actividadFisica: 'Sedentario' | 'Moderada (150 min/sem)' | 'Intensa';
  patronAlimentario: string;
  medicamentosHabituales: {
    id: string;
    nombre: string;
    dosis: string;
    frecuencia: string;
    indicacion: string;
    adherencia: 'Alta' | 'Media' | 'Baja';
  }[];
  examenAspectoGeneral: string;
  examenCabezaCuello: string;
  examenToraxCardiopulmonar: string;
  examenAbdomen: string;
  examenExtremidades: string;
  examenNeurologico: string;
}

// 2. Consulta Médica e Historial de Consultas
export interface ConsultationEncounterRecord {
  id: string;
  fechaHora: string;
  tipoConsulta: 'Primera vez' | 'Seguimiento' | 'Control prenatal / puerperio' | 'Urgencia ambulatoria' | 'Preventiva';
  motivoConsulta: string;
  enfermedadActual: string;
  signosVitales: {
    taSistolica: string;
    taDiastolica: string;
    frecuenciaCardiaca: string;
    frecuenciaRespiratoria: string;
    temperatura: string;
    saturacionO2: string;
    pesoKg: string;
    tallaCm: string;
    imc: string;
    glucemiaCapilar: string;
  };
  hallazgosExamenFisico: string;
  diagnosticoPrincipal: string;
  codigoCie10: string;
  tipoDiagnostico: 'Presuntivo' | 'Confirmado';
  diagnosticosSecundarios: string;
  tratamientoFarmacologico: string;
  medidasNoFarmacologicas: string;
  examenesComplementariosSolicitados: string;
  planSeguimiento: string;
  proximaCita: string;
  signosAlarmaExplicados: string;
  medicoTratante: string;
}

// 3. Ficha Familiar (Salud Familiar y Comunitaria)
export interface HouseholdMemberItem {
  id: string;
  nombreCompleto: string;
  parentesco: string;
  edad: number;
  sexo: 'F' | 'M';
  ocupacionEscolaridad: string;
  condicionSalud: string;
  esquemaVacunacionAlDia: boolean;
}

export interface FamilyHealthRecordForm {
  codigoCarpetaFamiliar: string;
  unapCentroPrimerNivel: string;
  sectorComunidad: string;
  municipioProvincia: string;
  tipoFamilia: 'Nuclear' | 'Extensa' | 'Monoparental' | 'Ampliada';
  cicloVitalFamiliar: 'Formación' | 'Expansión' | 'Dispersión' | 'Contracción';
  integrantesHogar: HouseholdMemberItem[];
  condicionesVivienda: {
    tenencia: 'Propia' | 'Alquilada' | 'Cedida / Familiar';
    materialParedes: 'Bloque / Concreto' | 'Madera' | 'Mixto' | 'Zinc / Otro';
    materialTecho: 'Concreto (Plato)' | 'Zinc' | 'Asbesto / Otro';
    materialPiso: 'Cerámica / Granito' | 'Cemento' | 'Tierra';
    dormitorios: number;
    hacinamiento: 'No' | 'Sí (>3 personas/dormitorio)';
    abastecimientoAgua: 'Acueducto intradomiciliario' | 'Agua embotellada / Camión' | 'Pozo / Cisterna';
    disposicionExcretas: 'Inodoro conectado a alcantarillado / séptico' | 'Letrina sanitaria' | 'Al aire libre';
    manejoBasura: 'Recogida municipal (Ayuntamiento)' | 'Quema' | 'Vertedero improvisado';
    vectoresRiesgoAmbiental: string;
  };
  factoresRiesgoBiopsicosocial: string[];
  riesgoFamiliarGlobal: 'Riesgo Bajo (I)' | 'Riesgo Mediano (II)' | 'Riesgo Alto (III)';
  observacionesVisitasDomiciliarias: string;
}

// 4. Seguimiento de Enfermedades Crónicas (HTA, Diabetes, Obesidad, Dislipidemia)
export interface ChronicDiseaseFollowUpForm {
  condicionesActivas: {
    hipertension: boolean;
    diabetesMellitus: boolean;
    obesidadSobrepeso: boolean;
    dislipidemia: boolean;
  };
  fechaUltimaEvaluacion: string;
  riesgoCardiovascular: 'Bajo (<10%)' | 'Moderado (10-19%)' | 'Alto (20-29%)' | 'Muy Alto (≥30%)';
  hipertensionControl: {
    estadioClasificacion: string;
    metaPresionArterial: string;
    taPromedioDomiciliaria: string;
    tratamientoAntihipertensivo: string;
    lesionOrganoBlanco: string;
  };
  diabetesControl: {
    tipoDiabetes: 'No aplica' | 'DM Tipo 2' | 'DM Tipo 1' | 'Prediabetes';
    glucemiaAyunasMgDl: string;
    glucemiaPostprandialMgDl: string;
    hba1cPorcentaje: string;
    fechaHba1c: string;
    examenPiesMonofilamento: string;
    fondoDeOjoAnual: string;
    hipoglucemiasRecientes: 'No' | 'Sí, leves' | 'Sí, severas';
  };
  obesidadAntropometria: {
    pesoInicialKg: string;
    pesoActualKg: string;
    tallaCm: string;
    imcActual: string;
    perimetroAbdominalCm: string;
    metaReduccionPeso: string;
  };
  dislipidemiaControl: {
    colesterolTotalMgDl: string;
    ldlColesterolMgDl: string;
    hdlColesterolMgDl: string;
    trigliceridosMgDl: string;
    tratamientoHipolipemiante: string;
  };
  funcionRenal: {
    creatininaSericaMgDl: string;
    tfgEstimadaMlMin: string;
    albuminuriaOrina: string;
  };
  adherenciaFarmacologica: 'Buena (Test Morisky-Green completo)' | 'Regular (Olvidos ocasionales)' | 'Mala adherencia';
  planEducacionAutomanejo: string;
}

// 5. Fichas de Prevención (Vacunación, Controles Preventivos y Tamizajes)
export interface PreventionVaccineEntry {
  id: string;
  biologico: string;
  dosis: string;
  fechaAplicacion: string;
  loteCentro: string;
  estado: 'Aplicada' | 'Pendiente' | 'Próximo refuerzo';
}

export interface ScreeningControlEntry {
  id: string;
  tamizajeControl: string;
  criterioPoblacion: string;
  fechaRealizacion: string;
  resultadoConducta: string;
  estado: 'Al día' | 'Pendiente' | 'Seguimiento requerido';
}

export interface PreventionAndScreeningForm {
  esquemaVacunacion: PreventionVaccineEntry[];
  controlesPreventivos: {
    saludBucalOdontologia: string;
    agudezaVisual: string;
    consejeriaNutricional: string;
    prevencionDengueVectores: string;
    saludSexualReproductiva: string;
    saludMentalTamizaje: string;
  };
  tamizajesOncologicosMetabolicos: ScreeningControlEntry[];
  recomendacionesPreventivas: string;
}

// 6. Fichas Especiales por Ciclo de Vida (Embarazo, Puerperio, Niño Sano, Adolescente, Adulto Mayor)
export type LifecycleStageType =
  | 'embarazo'
  | 'puerperio'
  | 'nino-sano'
  | 'adolescente'
  | 'adulto-mayor';

export interface SpecialLifecycleForms {
  etapaSeleccionada: LifecycleStageType;
  embarazo: {
    aplica: boolean;
    fur: string;
    fpp: string;
    edadGestacionalSemanas: string;
    formulaObstetrica: string; // e.g. G2 P1 A0 C0
    numeroControlesPrenatales: string;
    alturaUterinaCm: string;
    frecuenciaCardiacaFetalLpm: string;
    movimientosFetales: string;
    presentacionFetal: string;
    vacunaTdTdapGestante: string;
    suplementacionHierroFolato: string;
    laboratoriosPrenatales: string;
    signosAlarmaObstetrica: string;
  };
  puerperio: {
    diasPostparto: string;
    tipoParto: 'Eutócico vaginal' | 'Cesárea' | 'No aplica actualmente';
    involucionUterina: string;
    caracteristicasLoquios: string;
    evaluacionMamasLactancia: string;
    heridaQuirurgicaEpisiotomia: string;
    tamizajeDepresionPostparto: string;
    metodoPlanificacionFamiliar: string;
  };
  ninoSano: {
    pesoEdadPercentil: string;
    tallaEdadPercentil: string;
    perimetroCefalicoCm: string;
    tipoAlimentacionLactancia: string;
    desarrolloPsicomotorHitos: string;
    suplementacionVitaminaAHierro: string;
    desparasitacionFecha: string;
    orientacionCrianzaSegura: string;
  };
  adolescente: {
    estadioTanner: string;
    hogarConvivencia: string;
    educacionRendimiento: string;
    alimentacionImagenCorporal: string;
    actividadesTiempoLibre: string;
    consumoSustanciasRiesgos: string;
    saludSexualPrevencion: string;
    estadoAnimoSaludMental: string;
  };
  adultoMayor: {
    indiceKatzABVD: 'Independiente (A)' | 'Dependencia parcial (B-D)' | 'Dependencia severa (E-G)';
    escalaLawtonAIVD: string;
    evaluacionCognitivaMinimental: string;
    tamizajeDepresionYesavage: string;
    riesgoCaidas: 'Bajo' | 'Moderado' | 'Alto (Requiere apoyo de marcha)';
    revisionPolifarmacia: string;
    audicionVisionContinencia: string;
    redApoyoCuidadorPrincipal: string;
  };
}

// 7. Referencia y Contrarreferencia
export interface ReferralRecordItem {
  id: string;
  fechaEmision: string;
  tipoFormato: 'Referencia' | 'Contrarreferencia';
  prioridad: 'Urgencia' | 'Consulta Externa Especializada' | 'Apoyo Diagnóstico';
  centroOrigen: string;
  centroDestino: string;
  servicioEspecialidadDestino: string;
  motivoReferencia: string;
  resumenClinicoHallazgos: string;
  resultadosexamenesPrevios: string;
  diagnosticoPresuntivoCie10: string;
  tratamientoRealizadoPrevio: string;
  estadoSeguimiento: 'Enviada' | 'Recibida en centro destino' | 'Contrarreferencia completada';
  contrarreferenciaHallazgosEspecialista: string;
  contrarreferenciaDiagnosticoDefinitivo: string;
  contrarreferenciaConductaSeguimientoUnap: string;
  medicoReferente: string;
}

// 8. Consulta a Domicilio / Visita Domiciliaria (MSP / UNAP)
export type HomeVisitStatus =
  | 'Programada'
  | 'En traslado'
  | 'En domicilio'
  | 'Completada';

export type HomeVisitPriority =
  | 'Urgencia Domiciliaria'
  | 'Seguimiento Encamado'
  | 'Puerperio / Recién Nacido'
  | 'Crónico Descompensado'
  | 'Control Preventivo / Paliativo';

export interface HomeVisitRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientCedula: string;
  patientArs: string;
  fechaVisita: string;
  horaProgramada: string;
  estadoVisita: HomeVisitStatus;
  prioridad: HomeVisitPriority;
  // Logística y Ruta por Sector/Barrio + GPS
  sectorBarrio: string;
  direccionExacta: string;
  puntoReferencia: string;
  telefonoContactoHogar: string;
  coordenadasGps: string;
  // Clínica y Signos Vitales en Casa
  motivoVisita: string;
  signosVitales: {
    ta: string;
    fc: string;
    fr: string;
    temp: string;
    spo2: string;
    glucemiaCapilar: string;
    dolorEva: string; // 0-10
  };
  hallazgosClinicosSoap: string;
  diagnosticoCie10: string;
  // 1. Evaluación de Encamados, Barthel y Úlceras por Presión (UPP)
  encamadoEvaluacion: {
    condicionMovilidad:
      | 'Ambulatorio con apoyo'
      | 'Silla de ruedas'
      | 'Encamado parcial'
      | 'Encamado total (Postrado)';
    indiceBarthelPuntaje: number; // 0-100
    indiceBarthelNivel:
      | 'Independiente (100)'
      | 'Dependencia leve (60-95)'
      | 'Dependencia moderada (40-55)'
      | 'Dependencia severa (20-35)'
      | 'Dependencia total (<20)';
    integridadPiel: 'Íntegra sin lesiones' | 'Eritema / Riesgo UPP' | 'Úlcera por presión activa';
    uppPresente: 'No' | 'Sí - Grado I' | 'Sí - Grado II' | 'Sí - Grado III' | 'Sí - Grado IV';
    uppLocalizacion: string;
    frecuenciaCambiosPosturales: string;
    usoColchonAntiescaras: 'Sí' | 'No' | 'Gestionado / Recomendado';
  };
  // 2. Evaluación del Cuidador Principal y Sobrecarga Zarit
  cuidadorEvaluacion: {
    nombreCuidador: string;
    parentesco: string;
    telefonoCuidador: string;
    horasCuidadoDiario: string;
    escalaZaritPuntaje: string;
    escalaZaritNivel:
      | 'Ausencia de sobrecarga (≤46)'
      | 'Sobrecarga leve (47-55)'
      | 'Sobrecarga intensa (≥56)';
    capacitacionEnCuidados: string;
    redApoyoFamiliarComunitaria: string;
  };
  // 3. Inspección Ambiental del Hogar, Vectores y Riesgos
  inspeccionAmbiental: {
    barrerasArquitectonicasCaidas: string;
    iluminacionVentilacion: 'Adecuada' | 'Deficiente' | 'Hacinamiento crítico';
    aguaPotableSaneamiento: string;
    criaderosVectoresDengue: 'Sin criaderos' | 'Criaderos eliminados / Abatizados' | 'Riesgo activo Aedes aegypti';
    almacenamientoMedicamentosHogar: 'Seguro y organizado' | 'Inadecuado / Requiere pastillero';
    intervencionEducativaAmbiental: string;
  };
  // 4. Procedimientos Realizados en Casa y Plan
  procedimientosRealizados: string[];
  detalleProcedimientos: string;
  tratamientoIndicacionesDomicilio: string;
  proximoSeguimientoDomiciliario: string;
  medicoResponsable: string;
  exequaturMedico: string;
  consultorioUnap: string;
}

export interface MedicalBagChecklistItem {
  id: string;
  category: 'Diagnóstico' | 'Procedimientos y Curas' | 'Fármacos y PAI' | 'Documentación MSP';
  name: string;
  quantitySpec: string;
  checked: boolean;
}

export const INITIAL_MEDICAL_BAG_CHECKLIST: MedicalBagChecklistItem[] = [
  {
    id: 'bag-1',
    category: 'Diagnóstico',
    name: 'Esfigmomanómetro aneroide/digital y Estetoscopio',
    quantitySpec: '1 set adulto/pediátrico',
    checked: true,
  },
  {
    id: 'bag-2',
    category: 'Diagnóstico',
    name: 'Glucómetro capilar, lancetas y tiras reactivas',
    quantitySpec: '1 kit (>25 tiras)',
    checked: true,
  },
  {
    id: 'bag-3',
    category: 'Diagnóstico',
    name: 'Oxímetro de pulso, Termómetro digital y Cinta métrica',
    quantitySpec: '1 set completo',
    checked: true,
  },
  {
    id: 'bag-4',
    category: 'Diagnóstico',
    name: 'Linterna clínica, Otoscopio portátil y Depresores linguales',
    quantitySpec: 'Baterías cargadas',
    checked: true,
  },
  {
    id: 'bag-5',
    category: 'Procedimientos y Curas',
    name: 'Kit de curas estériles (Gasas, Clorhexidina, Solución Salina 0.9%, Guantes)',
    quantitySpec: '5 paquetes estériles',
    checked: true,
  },
  {
    id: 'bag-6',
    category: 'Procedimientos y Curas',
    name: 'Sondas vesicales (Foley #14/#16/#18), bolsa colectora y lubricante estéril',
    quantitySpec: '2 sets recambio',
    checked: true,
  },
  {
    id: 'bag-7',
    category: 'Procedimientos y Curas',
    name: 'Nebulizador portátil, mascarillas y solución para nebulizar',
    quantitySpec: '1 equipo portátil',
    checked: true,
  },
  {
    id: 'bag-8',
    category: 'Fármacos y PAI',
    name: 'Botiquín de urgencia domiciliaria (Captopril SL, Diclofenac IM, Dexametasona, SRO)',
    quantitySpec: 'Verificado vigente',
    checked: true,
  },
  {
    id: 'bag-9',
    category: 'Fármacos y PAI',
    name: 'Termo PAI con pilas frías para vacunación en terreno (si aplica)',
    quantitySpec: 'Cadena de frío +2°C a +8°C',
    checked: false,
  },
  {
    id: 'bag-10',
    category: 'Documentación MSP',
    name: 'Actas de Visita Domiciliaria MSP, Recetario Ley 42-01 y Sello Médico',
    quantitySpec: 'Sello Exequátur/CMD',
    checked: true,
  },
];

export const HOME_VISIT_PROCEDURES_CATALOG: string[] = [
  'Cura aséptica de úlcera por presión / herida crónica',
  'Cambio o permeabilización de sonda vesical (Foley)',
  'Revisión / cuidado de sonda nasogástrica (SNG) o gastrostomía',
  'Toma de glucemia capilar en ayunas / postprandial',
  'Nebulización broncodilatadora en domicilio',
  'Administración de medicamento parenteral (IM / SC)',
  'Organización de pastillero semanal y conciliación terapéutica',
  'Vacunación domiciliaria PAI (Influenza / Neumococo / Td)',
  'Retiro de puntos de sutura / curación postquirúrgica',
  'Inspección y abatización de criaderos de vectores (Dengue)',
];

export interface PatientClinicalRecordBundle {
  patientId: string;
  updatedAt: string;
  historiaIndividual: IndividualHistoryForm;
  consultaActualBorrador: ConsultationEncounterRecord;
  historialConsultas: ConsultationEncounterRecord[];
  fichaFamiliar: FamilyHealthRecordForm;
  seguimientoCronicas: ChronicDiseaseFollowUpForm;
  fichaPrevencion: PreventionAndScreeningForm;
  fichasEspeciales: SpecialLifecycleForms;
  referencias: ReferralRecordItem[];
  visitasDomiciliarias: HomeVisitRecord[];
}

export function buildDefaultHomeVisitForPatient(
  patient: Patient,
  doctorName: string = 'Médico(a) Familiar de Guardia',
  doctorExequatur: string = '000-00',
  consultorioUnap: string = 'UNAP / Centro de Medicina Familiar Familia+'
): HomeVisitRecord {
  const todayFormatted = new Date().toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return {
    id: `hv-${Date.now()}`,
    patientId: patient.id,
    patientName: patient.name,
    patientAge: patient.age,
    patientCedula: patient.cedula,
    patientArs: patient.ars,
    fechaVisita: todayFormatted,
    horaProgramada: '09:00 AM',
    estadoVisita: 'Programada',
    prioridad: patient.age >= 65 ? 'Seguimiento Encamado' : 'Crónico Descompensado',
    sectorBarrio: patient.address || '',
    direccionExacta: patient.address || '',
    puntoReferencia: '',
    telefonoContactoHogar: patient.phone || '',
    coordenadasGps: '',
    motivoVisita: '',
    signosVitales: {
      ta: patient.vitals.ta || '120 / 80',
      fc: patient.vitals.fc || '74',
      fr: '16',
      temp: patient.vitals.temp || '36.6 °C',
      spo2: patient.vitals.spo2 || '98%',
      glucemiaCapilar: patient.vitals.glucose || '',
      dolorEva: '0 / 10',
    },
    hallazgosClinicosSoap: '',
    diagnosticoCie10: patient.diagnoses[0]?.name || patient.conditions[0] || '',
    encamadoEvaluacion: {
      condicionMovilidad: 'Ambulatorio con apoyo',
      indiceBarthelPuntaje: 85,
      indiceBarthelNivel: 'Dependencia leve (60-95)',
      integridadPiel: 'Íntegra sin lesiones',
      uppPresente: 'No',
      uppLocalizacion: 'Sin lesiones',
      frecuenciaCambiosPosturales: 'Cada 2 horas con almohadas de descarga',
      usoColchonAntiescaras: 'No',
    },
    cuidadorEvaluacion: {
      nombreCuidador: '',
      parentesco: '',
      telefonoCuidador: patient.phone || '',
      horasCuidadoDiario: '8 horas/día',
      escalaZaritPuntaje: '32',
      escalaZaritNivel: 'Ausencia de sobrecarga (≤46)',
      capacitacionEnCuidados: '',
      redApoyoFamiliarComunitaria: '',
    },
    inspeccionAmbiental: {
      barrerasArquitectonicasCaidas: '',
      iluminacionVentilacion: 'Adecuada',
      aguaPotableSaneamiento: 'Acueducto intradomiciliario',
      criaderosVectoresDengue: 'Sin criaderos',
      almacenamientoMedicamentosHogar: 'Seguro y organizado',
      intervencionEducativaAmbiental: '',
    },
    procedimientosRealizados: [],
    detalleProcedimientos: '',
    tratamientoIndicacionesDomicilio: patient.medications
      .map((m) => `${m.name}: ${m.dosage}`)
      .join('\n'),
    proximoSeguimientoDomiciliario: 'En 15 días según evolución',
    medicoResponsable: doctorName,
    exequaturMedico: doctorExequatur,
    consultorioUnap,
  };
}

export function buildDefaultClinicalRecordForPatient(
  patient: Patient
): PatientClinicalRecordBundle {
  const numericWeight = parseFloat(patient.vitals.weight) || 70;
  const heightCm = patient.vitals.heightCm || 165;
  const imcCalculado = (
    numericWeight /
    ((heightCm / 100) * (heightCm / 100))
  ).toFixed(1);
  const [taSis = '120', taDia = '80'] = (patient.vitals.ta || '120 / 80')
    .split('/')
    .map((s) => s.trim());

  const hasHTA = patient.conditions.some(
    (c) =>
      c.toLowerCase().includes('hipertens') || c.toLowerCase().includes('hta')
  );
  const hasDM = patient.conditions.some(
    (c) =>
      c.toLowerCase().includes('dm') || c.toLowerCase().includes('diabet')
  );
  const hasDislip = patient.conditions.some(
    (c) =>
      c.toLowerCase().includes('dislipid') ||
      c.toLowerCase().includes('colesterol')
  );
  const hasObes =
    parseFloat(imcCalculado) >= 25 ||
    patient.conditions.some((c) => c.toLowerCase().includes('sobrepeso'));

  const defaultStage: LifecycleStageType =
    patient.age >= 60
      ? 'adulto-mayor'
      : patient.age < 12
      ? 'nino-sano'
      : patient.age < 19
      ? 'adolescente'
      : 'embarazo';

  const todayFormatted = new Date().toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const nowFormatted = `${todayFormatted} · ${new Date().toLocaleTimeString(
    'es-DO',
    {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }
  )}`;

  return {
    patientId: patient.id,
    updatedAt: new Date().toISOString(),
    historiaIndividual: {
      fechaApertura: todayFormatted,
      estadoCivil: 'Soltero(a)',
      ocupacion: '',
      escolaridad: 'Secundaria',
      lugarNacimiento: patient.address || 'República Dominicana',
      nssAfiliado: '',
      contactoEmergenciaNombre: '',
      contactoEmergenciaParentesco: '',
      contactoEmergenciaTelefono: '',
      antecedentesPatologicos: patient.conditions.join(', '),
      antecedentesQuirurgicos: '',
      antecedentesTraumaticos: '',
      antecedentesTransfusionales: '',
      antecedentesGinecoObstetricos:
        patient.gender === 'Femenino' ? '' : 'No aplica',
      antecedentesFamiliares: '',
      alergiasMedicamentosas: patient.allergies.join(', ') || 'Ninguna conocida',
      alergiasAlimentariasAmbientales: '',
      reaccionAlergicaTipo: '',
      habitoTabaco: 'No fumador',
      habitoAlcohol: 'No consume',
      actividadFisica: 'Moderada (150 min/sem)',
      patronAlimentario: '',
      medicamentosHabituales: patient.medications.map((m) => ({
        id: m.id,
        nombre: m.name,
        dosis: m.dosage.split('–')[0]?.trim() || m.dosage,
        frecuencia: 'Según prescripción',
        indicacion: patient.conditions[0] || 'Tratamiento habitual',
        adherencia: 'Alta',
      })),
      examenAspectoGeneral: '',
      examenCabezaCuello: '',
      examenToraxCardiopulmonar: '',
      examenAbdomen: '',
      examenExtremidades: '',
      examenNeurologico: '',
    },
    consultaActualBorrador: {
      id: `cons-draft-${patient.id}`,
      fechaHora: nowFormatted,
      tipoConsulta: 'Primera vez',
      motivoConsulta: '',
      enfermedadActual: '',
      signosVitales: {
        taSistolica: taSis,
        taDiastolica: taDia,
        frecuenciaCardiaca: patient.vitals.fc || '72',
        frecuenciaRespiratoria: '16',
        temperatura: (patient.vitals.temp || '36.5').replace('°C', '').trim(),
        saturacionO2: (patient.vitals.spo2 || '98%').replace('%', '').trim(),
        pesoKg: String(numericWeight),
        tallaCm: String(heightCm),
        imc: imcCalculado,
        glucemiaCapilar: (patient.vitals.glucose || '')
          .replace('mg/dL', '')
          .trim(),
      },
      hallazgosExamenFisico: '',
      diagnosticoPrincipal: patient.diagnoses[0]?.name || '',
      codigoCie10: patient.diagnoses[0]?.code || '',
      tipoDiagnostico: 'Confirmado',
      diagnosticosSecundarios: patient.diagnoses
        .slice(1)
        .map((d) => d.name)
        .join(', '),
      tratamientoFarmacologico: patient.medications
        .map((m) => `${m.name}: ${m.dosage}`)
        .join('\n'),
      medidasNoFarmacologicas: patient.managementPlan.join('\n'),
      examenesComplementariosSolicitados: patient.labOrders
        .map((l) => l.name)
        .join(', '),
      planSeguimiento: '',
      proximaCita: patient.nextFollowUp || '',
      signosAlarmaExplicados: '',
      medicoTratante: '',
    },
    historialConsultas: [],
    fichaFamiliar: {
      codigoCarpetaFamiliar: `CF-${patient.code}`,
      unapCentroPrimerNivel: 'UNAP / Centro de Medicina Familiar Familia+',
      sectorComunidad: patient.address || '',
      municipioProvincia: 'República Dominicana',
      tipoFamilia: 'Nuclear',
      cicloVitalFamiliar: 'Expansión',
      integrantesHogar: [
        {
          id: `fam-${patient.id}-1`,
          nombreCompleto: patient.name,
          parentesco: 'Jefe(a) de familia (Paciente índice)',
          edad: patient.age,
          sexo: patient.gender === 'Femenino' ? 'F' : 'M',
          ocupacionEscolaridad: '',
          condicionSalud: patient.conditions.join(', ') || 'Sano aparente',
          esquemaVacunacionAlDia: true,
        },
      ],
      condicionesVivienda: {
        tenencia: 'Propia',
        materialParedes: 'Bloque / Concreto',
        materialTecho: 'Concreto (Plato)',
        materialPiso: 'Cerámica / Granito',
        dormitorios: 2,
        hacinamiento: 'No',
        abastecimientoAgua: 'Acueducto intradomiciliario',
        disposicionExcretas: 'Inodoro conectado a alcantarillado / séptico',
        manejoBasura: 'Recogida municipal (Ayuntamiento)',
        vectoresRiesgoAmbiental: '',
      },
      factoresRiesgoBiopsicosocial: [],
      riesgoFamiliarGlobal: 'Riesgo Bajo (I)',
      observacionesVisitasDomiciliarias: '',
    },
    seguimientoCronicas: {
      condicionesActivas: {
        hipertension: hasHTA,
        diabetesMellitus: hasDM,
        obesidadSobrepeso: hasObes,
        dislipidemia: hasDislip,
      },
      fechaUltimaEvaluacion: todayFormatted,
      riesgoCardiovascular: 'Bajo (<10%)',
      hipertensionControl: {
        estadioClasificacion: '',
        metaPresionArterial: '< 130 / 80 mmHg',
        taPromedioDomiciliaria: patient.vitals.ta ? `${patient.vitals.ta} mmHg` : '',
        tratamientoAntihipertensivo: patient.medications[0]?.name || '',
        lesionOrganoBlanco: '',
      },
      diabetesControl: {
        tipoDiabetes: hasDM ? 'DM Tipo 2' : 'No aplica',
        glucemiaAyunasMgDl: (patient.vitals.glucose || '')
          .replace('mg/dL', '')
          .trim(),
        glucemiaPostprandialMgDl: '',
        hba1cPorcentaje: '',
        fechaHba1c: '',
        examenPiesMonofilamento: '',
        fondoDeOjoAnual: '',
        hipoglucemiasRecientes: 'No',
      },
      obesidadAntropometria: {
        pesoInicialKg: String(numericWeight),
        pesoActualKg: String(numericWeight),
        tallaCm: String(heightCm),
        imcActual: `${imcCalculado} kg/m²`,
        perimetroAbdominalCm: '',
        metaReduccionPeso: '',
      },
      dislipidemiaControl: {
        colesterolTotalMgDl: '',
        ldlColesterolMgDl: '',
        hdlColesterolMgDl: '',
        trigliceridosMgDl: '',
        tratamientoHipolipemiante: '',
      },
      funcionRenal: {
        creatininaSericaMgDl: '',
        tfgEstimadaMlMin: '',
        albuminuriaOrina: '',
      },
      adherenciaFarmacologica: 'Buena (Test Morisky-Green completo)',
      planEducacionAutomanejo: '',
    },
    fichaPrevencion: {
      esquemaVacunacion: [],
      controlesPreventivos: {
        saludBucalOdontologia: '',
        agudezaVisual: '',
        consejeriaNutricional: '',
        prevencionDengueVectores: '',
        saludSexualReproductiva: '',
        saludMentalTamizaje: '',
      },
      tamizajesOncologicosMetabolicos: [],
      recomendacionesPreventivas: '',
    },
    fichasEspeciales: {
      etapaSeleccionada: defaultStage,
      embarazo: {
        aplica: false,
        fur: '',
        fpp: '',
        edadGestacionalSemanas: '',
        formulaObstetrica: '',
        numeroControlesPrenatales: '',
        alturaUterinaCm: '',
        frecuenciaCardiacaFetalLpm: '',
        movimientosFetales: '',
        presentacionFetal: '',
        vacunaTdTdapGestante: '',
        suplementacionHierroFolato: '',
        laboratoriosPrenatales: '',
        signosAlarmaObstetrica: '',
      },
      puerperio: {
        diasPostparto: '',
        tipoParto: 'No aplica actualmente',
        involucionUterina: '',
        caracteristicasLoquios: '',
        evaluacionMamasLactancia: '',
        heridaQuirurgicaEpisiotomia: '',
        tamizajeDepresionPostparto: '',
        metodoPlanificacionFamiliar: '',
      },
      ninoSano: {
        pesoEdadPercentil: '',
        tallaEdadPercentil: '',
        perimetroCefalicoCm: '',
        tipoAlimentacionLactancia: '',
        desarrolloPsicomotorHitos: '',
        suplementacionVitaminaAHierro: '',
        desparasitacionFecha: '',
        orientacionCrianzaSegura: '',
      },
      adolescente: {
        estadioTanner: '',
        hogarConvivencia: '',
        educacionRendimiento: '',
        alimentacionImagenCorporal: '',
        actividadesTiempoLibre: '',
        consumoSustanciasRiesgos: '',
        saludSexualPrevencion: '',
        estadoAnimoSaludMental: '',
      },
      adultoMayor: {
        indiceKatzABVD: 'Independiente (A)',
        escalaLawtonAIVD: '',
        evaluacionCognitivaMinimental: '',
        tamizajeDepresionYesavage: '',
        riesgoCaidas: 'Bajo',
        revisionPolifarmacia: '',
        audicionVisionContinencia: '',
        redApoyoCuidadorPrincipal: '',
      },
    },
    referencias: [],
    visitasDomiciliarias: [],
  };
}

