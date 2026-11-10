import { VitalSigns } from '../data/mockClinicalData';

export interface SoapCie10AssistResult {
  cie10Code: string;
  cie10Name: string;
  suggestedPlan: string;
  summaryNotification: string;
}

export interface SafetyAlertResult {
  hasAlert: boolean;
  severity: 'alta' | 'media' | 'baja';
  alertMessage: string;
}

const textAnalysisCache = new Map<string, SoapCie10AssistResult>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleBackgroundClinicalTextAnalysis(
  contextKey: string,
  clinicalText: string,
  patientMeta: {
    age?: number;
    gender?: string;
    conditions?: string[];
  },
  onResult: (result: SoapCie10AssistResult) => void,
  delayMs: number = 1750
): void {
  const existingTimer = debounceTimers.get(contextKey);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const trimmed = clinicalText.trim();
  if (trimmed.length < 18) {
    return;
  }

  const cacheKey = `${trimmed.toLowerCase()}::${(patientMeta.conditions || []).join(',')}`;
  const cached = textAnalysisCache.get(cacheKey);
  if (cached) {
    return;
  }

  const timer = setTimeout(async () => {
    try {
      const response = await fetch('/api/clinical-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'soap-cie10',
          clinicalText: trimmed,
          patientAge: patientMeta.age,
          patientGender: patientMeta.gender,
          patientConditions: patientMeta.conditions,
        }),
      });

      if (!response.ok) return;
      const data = (await response.json()) as SoapCie10AssistResult;
      if (data && (data.cie10Code || data.cie10Name || data.suggestedPlan)) {
        textAnalysisCache.set(cacheKey, data);
        onResult(data);
      }
    } catch {
      // Silent background failure — never interrupt the physician
    }
  }, delayMs);

  debounceTimers.set(contextKey, timer);
}

export async function checkMedicationSafetyInBackground(params: {
  newMedicationName: string;
  newMedicationDosage: string;
  patientAllergies: string[];
  currentMedications: string[];
  patientConditions: string[];
}): Promise<SafetyAlertResult | null> {
  try {
    const response = await fetch('/api/clinical-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'medication-check',
        ...params,
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as SafetyAlertResult;
    if (data && data.hasAlert && data.alertMessage) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function evaluateVitalsRiskInBackground(
  vitals: VitalSigns
): Promise<SafetyAlertResult | null> {
  try {
    const response = await fetch('/api/clinical-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'vitals-check',
        vitals,
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as SafetyAlertResult;
    if (data && data.hasAlert && data.alertMessage) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}
