export const HIRA_SPECIALTIES = [
  { code: '01', name: '내과',          icon: '🩺' },
  { code: '02', name: '신경과',         icon: '🧠' },
  { code: '03', name: '정신건강의학과',  icon: '💭' },
  { code: '04', name: '외과',          icon: '🔪' },
  { code: '05', name: '정형외과',       icon: '🦴' },
  { code: '06', name: '신경외과',       icon: '⚡' },
  { code: '07', name: '흉부외과',       icon: '🫀' },
  { code: '08', name: '성형외과',       icon: '✨' },
  { code: '10', name: '산부인과',       icon: '🌸' },
  { code: '11', name: '소아청소년과',   icon: '👶' },
  { code: '12', name: '안과',          icon: '👁️' },
  { code: '13', name: '이비인후과',     icon: '👂' },
  { code: '14', name: '피부과',         icon: '🧴' },
  { code: '15', name: '비뇨의학과',     icon: '💊' },
  { code: '20', name: '재활의학과',     icon: '🏃' },
  { code: '22', name: '가정의학과',     icon: '🏥' },
  { code: '23', name: '응급의학과',     icon: '🚨' },
  { code: '26', name: '치과',          icon: '🦷' },
  { code: '27', name: '한방내과',       icon: '🌿' },
  { code: '28', name: '한방외과',       icon: '🌱' },
] as const;

export type HiraCode = typeof HIRA_SPECIALTIES[number]['code'];

export const SYMPTOM_SPECIALTY_MAP: Record<string, string[]> = {
  headache:    ['02', '01'],
  fever:       ['01', '11'],
  cough:       ['01', '13'],
  stomachache: ['01'],
  toothache:   ['26'],
  skin:        ['14'],
  eyes:        ['12', '13'],
  bone:        ['05', '20'],
  mental:      ['03'],
  womens:      ['10'],
  kids:        ['11'],
  heart:       ['23', '01'],
};

export function getSpecialtyName(code: string): string {
  return HIRA_SPECIALTIES.find(s => s.code === code)?.name ?? code;
}

export function getSpecialtyIcon(code: string): string {
  return HIRA_SPECIALTIES.find(s => s.code === code)?.icon ?? '🏥';
}
