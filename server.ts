import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';

interface ClinicalAssistRequest {
  task: 'soap-cie10' | 'medication-check' | 'vitals-check';
  clinicalText?: string;
  patientAge?: number;
  patientGender?: string;
  patientConditions?: string[];
  patientAllergies?: string[];
  currentMedications?: string[];
  newMedicationName?: string;
  newMedicationDosage?: string;
  vitals?: {
    ta?: string;
    fc?: string;
    temp?: string;
    spo2?: string;
    glucose?: string;
    weight?: string;
  };
}

function localFallbackAssist(body: ClinicalAssistRequest) {
  if (body.task === 'vitals-check' && body.vitals) {
    const warnings: string[] = [];
    const taParts = (body.vitals.ta || '').split('/').map((n) => parseFloat(n.trim()));
    const sys = taParts[0] || 0;
    const dia = taParts[1] || 0;
    const fc = parseFloat(body.vitals.fc || '') || 0;
    const temp = parseFloat((body.vitals.temp || '').replace('°C', '').trim()) || 0;
    const spo2 = parseFloat((body.vitals.spo2 || '').replace('%', '').trim()) || 0;
    const glu = parseFloat((body.vitals.glucose || '').replace('mg/dL', '').trim()) || 0;

    if (sys >= 180 || dia >= 110) {
      warnings.push(
        `Crisis hipertensiva detectada (${sys}/${dia} mmHg). Evaluar daño a órgano blanco e iniciar protocolo MSP.`
      );
    } else if (sys >= 140 || dia >= 90) {
      warnings.push(
        `Presión arterial fuera de meta (${sys}/${dia} mmHg). Verificar adherencia antihipertensiva.`
      );
    } else if (sys > 0 && sys < 90) {
      warnings.push(`Hipotensión arterial detectada (${sys}/${dia} mmHg).`);
    }

    if (glu >= 250) {
      warnings.push(
        `Hiperglucemia significativa (${glu} mg/dL). Descartar descompensación metabólica e hidratar.`
      );
    } else if (glu > 0 && glu < 70) {
      warnings.push(
        `Hipoglucemia clínica (${glu} mg/dL). Administrar carga rápida de carbohidratos.`
      );
    }

    if (temp >= 38.0) {
      warnings.push(
        `Fiebre activa (${temp} °C). En contexto epidemiológico RD vigilar signos de alarma de Dengue.`
      );
    }

    if (spo2 > 0 && spo2 < 93) {
      warnings.push(`Hipoxemia detectada (SpO₂ ${spo2}%). Evaluar oxigenoterapia.`);
    }

    if (fc >= 110) {
      warnings.push(`Taquicardia en reposo (${fc} lpm).`);
    } else if (fc > 0 && fc < 50) {
      warnings.push(`Bradicardia detectada (${fc} lpm).`);
    }

    return {
      hasAlert: warnings.length > 0,
      severity: sys >= 180 || glu >= 250 || (spo2 > 0 && spo2 < 93) ? 'alta' : 'media',
      alertMessage: warnings[0] || '',
      allWarnings: warnings,
    };
  }

  if (body.task === 'medication-check') {
    const med = (body.newMedicationName || '').toLowerCase();
    const allergies = (body.patientAllergies || []).map((a) => a.toLowerCase());
    const currentMeds = (body.currentMedications || []).map((m) => m.toLowerCase());
    const conditions = (body.patientConditions || []).map((c) => c.toLowerCase());

    const hasPenicillinAllergy = allergies.some(
      (a) => a.includes('penicilin') || a.includes('amoxicilin') || a.includes('betalactam')
    );
    const isPenicillinGroup =
      med.includes('amoxicilin') ||
      med.includes('ampicilin') ||
      med.includes('penicilin') ||
      med.includes('piperacilin');

    if (hasPenicillinAllergy && isPenicillinGroup) {
      return {
        hasAlert: true,
        severity: 'alta',
        alertMessage: `Alerta farmacológica: El paciente registra alergia a Penicilinas y se prescribió ${body.newMedicationName}. Considere macrólido (Azitromicina).`,
      };
    }

    const hasNsaidAllergy = allergies.some(
      (a) =>
        a.includes('aine') ||
        a.includes('ibuprofen') ||
        a.includes('diclofenac') ||
        a.includes('aspirina')
    );
    const isNsaid =
      med.includes('ibuprofen') ||
      med.includes('diclofenac') ||
      med.includes('naproxen') ||
      med.includes('ketorolac') ||
      med.includes('meloxicam');

    if (hasNsaidAllergy && isNsaid) {
      return {
        hasAlert: true,
        severity: 'alta',
        alertMessage: `Alerta de alergia: Paciente con hipersensibilidad a AINEs ante prescripción de ${body.newMedicationName}.`,
      };
    }

    const hasHta = conditions.some((c) => c.includes('hipertens') || c.includes('hta'));
    if (hasHta && isNsaid) {
      return {
        hasAlert: true,
        severity: 'media',
        alertMessage: `Precaución clínica: ${body.newMedicationName} (AINE) puede elevar la presión arterial y reducir eficacia de antihipertensivos.`,
      };
    }

    const takesIecaOrAra2 = currentMeds.some(
      (m) =>
        m.includes('losart') ||
        m.includes('enalapril') ||
        m.includes('lisinopril') ||
        m.includes('valsart') ||
        m.includes('candesart')
    );
    const isAlsoIecaOrAra2 =
      med.includes('losart') ||
      med.includes('enalapril') ||
      med.includes('lisinopril') ||
      med.includes('valsart') ||
      med.includes('candesart');

    if (takesIecaOrAra2 && isAlsoIecaOrAra2) {
      return {
        hasAlert: true,
        severity: 'media',
        alertMessage: `Interacción farmacológica: Evitar doble bloqueo del sistema renina-angiotensina (IECA + ARA-II) con ${body.newMedicationName}.`,
      };
    }

    return { hasAlert: false, severity: 'baja', alertMessage: '' };
  }

  // Default: soap-cie10
  const text = (body.clinicalText || '').toLowerCase();
  if (
    text.includes('presion') ||
    text.includes('presión') ||
    text.includes('cefalea occipital') ||
    text.includes('hipertens') ||
    text.includes('ta elevada')
  ) {
    return {
      cie10Code: 'I10',
      cie10Name: 'Hipertensión esencial (primaria) (I10)',
      suggestedPlan:
        'Dieta hiposódica DASH, control diario de TA en domicilio (AM/PM), adherencia antihipertensiva y perfil renal/lipídico de control.',
      summaryNotification:
        'CIE-10 detectado en segundo plano: I10 · Hipertensión esencial (primaria)',
    };
  }
  if (
    text.includes('poliuria') ||
    text.includes('polidipsia') ||
    text.includes('glucosa') ||
    text.includes('glucemia') ||
    text.includes('diabet') ||
    text.includes('hba1c')
  ) {
    return {
      cie10Code: 'E11',
      cie10Name: 'Diabetes mellitus tipo 2 (E11)',
      suggestedPlan:
        'Plan nutricional sin azúcares refinados, caminata 30 min/día, automonitoreo glucémico, revisión de pies y control de HbA1c trimestral.',
      summaryNotification:
        'CIE-10 detectado en segundo plano: E11 · Diabetes mellitus tipo 2',
    };
  }
  if (
    text.includes('fiebre') &&
    (text.includes('mialgia') ||
      text.includes('retroocular') ||
      text.includes('plaqueta') ||
      text.includes('dengue') ||
      text.includes('artralgia'))
  ) {
    return {
      cie10Code: 'A97',
      cie10Name: 'Dengue (vigilancia epidemiológica) (A97)',
      suggestedPlan:
        'Hidratación oral abundante (SRO), Acetaminofén exclusivo (evitar AINEs y AAS), hemograma seriado cada 24-48h, vigilancia estricta de signos de alarma y notificación EPI-1.',
      summaryNotification:
        'CIE-10 detectado en segundo plano: A97 · Sospecha de Dengue (Protocolo MSP)',
    };
  }
  if (
    text.includes('tos') ||
    text.includes('odinofagia') ||
    text.includes('rinorrea') ||
    text.includes('faring') ||
    text.includes('gripe')
  ) {
    return {
      cie10Code: 'J06.9',
      cie10Name: 'Infección aguda de las vías respiratorias superiores (J06.9)',
      suggestedPlan:
        'Hidratación oral abundante, manejo sintomático antipirético, lavado nasal con solución salina y reevaluación si persiste fiebre >72 horas.',
      summaryNotification:
        'CIE-10 detectado en segundo plano: J06.9 · Infección respiratoria superior aguda',
    };
  }
  if (
    text.includes('disuria') ||
    text.includes('polaquiuria') ||
    text.includes('orina') ||
    text.includes('lumbar') ||
    text.includes('infeccion urinaria') ||
    text.includes('infección urinaria')
  ) {
    return {
      cie10Code: 'N39.0',
      cie10Name: 'Infección de vías urinarias, sitio no especificado (N39.0)',
      suggestedPlan:
        'Examen general de orina y urocultivo, ingesta hídrica >2 L/día, antibioticoterapia empírica según protocolo MSP y control en 7 días.',
      summaryNotification:
        'CIE-10 detectado en segundo plano: N39.0 · Infección de vías urinarias',
    };
  }
  if (
    text.includes('ulcera') ||
    text.includes('úlcera') ||
    text.includes('escara') ||
    text.includes('postrado') ||
    text.includes('encamado')
  ) {
    return {
      cie10Code: 'L89',
      cie10Name: 'Úlcera por decúbito y área de presión (L89)',
      suggestedPlan:
        'Cura aséptica con solución salina 0.9%, cambios posturales programados cada 2 horas, descarga de presión con almohadas y educación al cuidador.',
      summaryNotification:
        'CIE-10 detectado en segundo plano: L89 · Úlcera por presión / Encamado',
    };
  }

  return {
    cie10Code: '',
    cie10Name: '',
    suggestedPlan: '',
    summaryNotification: '',
  };
}

async function callDeepSeekClinicalEngine(body: ClinicalAssistRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'MY_DEEPSEEK_API_KEY') {
    return localFallbackAssist(body);
  }

  let systemPrompt =
    'Eres un motor clínico silencioso de Medicina Familiar en República Dominicana (normas del Ministerio de Salud Pública - MSP y Ley 42-01). Responde SIEMPRE únicamente con un objeto JSON válido sin bloques markdown.';
  let userPrompt = '';

  if (body.task === 'soap-cie10') {
    userPrompt = `Analiza el siguiente texto clínico escrito por el médico familiar: "${body.clinicalText || ''}".
Edad del paciente: ${body.patientAge || 40} años. Antecedentes: ${(body.patientConditions || []).join(', ')}.
Devuelve exactamente este JSON:
{
  "cie10Code": "código CIE-10 más probable (ej. I10, E11, J06.9, A97, N39.0, M54.5)",
  "cie10Name": "Nombre oficial CIE-10 en español con su código entre paréntesis, ej. Hipertensión esencial (primaria) (I10)",
  "suggestedPlan": "Plan terapéutico y medidas no farmacológicas concisas (máximo 220 caracteres) según protocolo MSP de República Dominicana",
  "summaryNotification": "Breve aviso de 1 línea indicando el código CIE-10 detectado automáticamente"
}`;
  } else if (body.task === 'medication-check') {
    userPrompt = `El médico familiar acaba de prescribir: "${body.newMedicationName} (${body.newMedicationDosage || ''})".
Alergias del paciente: ${(body.patientAllergies || []).join(', ') || 'Ninguna'}.
Medicamentos actuales del paciente: ${(body.currentMedications || []).join(', ') || 'Ninguno'}.
Condiciones del paciente: ${(body.patientConditions || []).join(', ') || 'Ninguna'}.
Evalúa si existe alergia directa/cruzada o interacción clínica importante. Devuelve exactamente este JSON:
{
  "hasAlert": true o false,
  "severity": "alta" o "media" o "baja",
  "alertMessage": "Si hasAlert es true, mensaje clínico claro y conciso en español (máximo 160 caracteres) explicando la alergia o interacción; si es false, cadena vacía"
}`;
  } else if (body.task === 'vitals-check') {
    userPrompt = `Analiza estos signos vitales recién registrados: TA=${body.vitals?.ta || ''}, FC=${body.vitals?.fc || ''}, Temp=${body.vitals?.temp || ''}, SpO2=${body.vitals?.spo2 || ''}, Glucemia=${body.vitals?.glucose || ''}.
Evalúa si hay algún signo vital fuera de rango o crítico. Devuelve exactamente este JSON:
{
  "hasAlert": true o false,
  "severity": "alta" o "media" o "baja",
  "alertMessage": "Si hasAlert es true, aviso clínico conciso en español con el valor alterado y conducta inmediata MSP (máximo 160 caracteres); si todos son normales, cadena vacía"
}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);

  try {
    const response = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 240,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return localFallbackAssist(body);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const rawContent = data.choices?.[0]?.message?.content?.trim();
    if (!rawContent) {
      return localFallbackAssist(body);
    }

    const cleaned = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    clearTimeout(timeout);
    return localFallbackAssist(body);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Silent Background Clinical Assist Proxy Route
  app.post('/api/clinical-assist', async (req, res) => {
    try {
      const body = req.body as ClinicalAssistRequest;
      if (!body || !body.task) {
        res.status(400).json({ error: 'Missing clinical task' });
        return;
      }
      const result = await callDeepSeekClinicalEngine(body);
      res.json(result);
    } catch {
      res.json(localFallbackAssist(req.body || { task: 'soap-cie10' }));
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Familia+ server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
