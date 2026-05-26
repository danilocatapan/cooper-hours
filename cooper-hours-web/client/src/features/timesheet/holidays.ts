export interface NationalHoliday {
  date: string;
  name: string;
}

const fixedNationalHolidays: Record<string, string> = {
  "01-01": "Confraternização Universal",
  "04-21": "Tiradentes",
  "05-01": "Dia Mundial do Trabalho",
  "09-07": "Independência do Brasil",
  "10-12": "Nossa Senhora Aparecida",
  "11-02": "Finados",
  "11-15": "Proclamação da República",
  "11-20": "Dia Nacional de Zumbi e da Consciência Negra",
  "12-25": "Natal",
};

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

function toLocalIsoDate(date: Date): string {
  return formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function getNationalHolidaysForYear(year: number): NationalHoliday[] {
  const holidays = Object.entries(fixedNationalHolidays).map(([monthDay, name]) => ({
    date: `${year}-${monthDay}`,
    name,
  }));

  const goodFriday = getEasterDate(year);
  goodFriday.setDate(goodFriday.getDate() - 2);
  holidays.push({
    date: toLocalIsoDate(goodFriday),
    name: "Paixão de Cristo",
  });

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

export function getNationalHoliday(date: string): NationalHoliday | null {
  const year = Number(date.slice(0, 4));
  if (!Number.isFinite(year)) return null;

  return getNationalHolidaysForYear(year).find((holiday) => holiday.date === date) ?? null;
}

export function isNationalHoliday(date: string): boolean {
  return getNationalHoliday(date) !== null;
}

export function getNationalHolidaysForMonth(month: string): NationalHoliday[] {
  const year = Number(month.slice(0, 4));
  if (!Number.isFinite(year)) return [];

  return getNationalHolidaysForYear(year).filter((holiday) => holiday.date.startsWith(`${month}-`));
}
