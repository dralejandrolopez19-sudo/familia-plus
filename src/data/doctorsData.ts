export interface DoctorProfile {
  id: string;
  name: string;
  initials: string;
  email: string;
  photoURL?: string;
  exequatur: string;
  cmd: string;
  specialty: string;
  consultorio: string;
  unapCenter: string;
  shift: string;
  avatarBg: string;
  updatedAt: string;
}

export const INITIAL_DOCTORS_TEAM: DoctorProfile[] = [
  {
    id: 'doc-guardia',
    name: 'Médico(a) Familiar de Guardia',
    initials: 'MF',
    email: 'medico@familiaplus.do',
    exequatur: '000-00',
    cmd: 'CMD 00000',
    specialty: 'Médico Familiar y Comunitario',
    consultorio: 'Consultorio 101',
    unapCenter: 'UNAP / Centro de Medicina Familiar Familia+',
    shift: 'Matutino (8:00 a.m. – 2:00 p.m.)',
    avatarBg: '#0d9488',
    updatedAt: new Date().toISOString(),
  },
];

export function isLegacyPersonalProfile(doc?: Partial<DoctorProfile> | null): boolean {
  if (!doc) return false;
  const nameLower = (doc.name || '').toLowerCase();
  const emailLower = (doc.email || '').toLowerCase();
  const exeq = (doc.exequatur || '').trim();
  const cmd = (doc.cmd || '').trim();
  return (
    nameLower.includes('alejandro l') ||
    emailLower.includes('alejandrolopez') ||
    exeq === '482-19' ||
    cmd === 'CMD 14902' ||
    doc.id === 'doc-principal'
  );
}

export function buildDoctorProfileFromGoogleUser(
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  },
  existingTeam: DoctorProfile[] = INITIAL_DOCTORS_TEAM
): DoctorProfile {
  const matchedPreset = existingTeam.find((d) => d.id === user.uid);
  if (matchedPreset && !isLegacyPersonalProfile(matchedPreset)) {
    return matchedPreset;
  }

  return {
    ...INITIAL_DOCTORS_TEAM[0],
    updatedAt: new Date().toISOString(),
  };
}
