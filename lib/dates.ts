// Centralized local-calendar date helpers. All scoring/recurrence logic must
// use these — never raw UTC conversions — so occurrences stay aligned with the
// user's local calendar day.

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Parse YYYY-MM-DD into a local-midnight Date. */
export function parseLocalDate(iso: string): Date {
  return new Date(iso + 'T00:00:00')
}

/** Whole calendar days between two ISO dates (b - a). */
export function daysBetween(aIso: string, bIso: string): number {
  const a = parseLocalDate(aIso)
  const b = parseLocalDate(bIso)
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

/** Whole calendar weeks between the Mondays of two ISO dates (b - a). */
export function weeksBetween(aIso: string, bIso: string): number {
  return Math.round(daysBetween(getWeekStart(aIso), getWeekStart(bIso)) / 7)
}

/** Monday of the week containing the given date, as YYYY-MM-DD. */
export function getWeekStart(dateIso: string): string {
  const d = parseLocalDate(dateIso)
  const day = d.getDay() // 0=Sun..6=Sat
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diffToMonday)
  return getLocalDateString(monday)
}

/** Sunday of the week containing the given date, as YYYY-MM-DD. */
export function getWeekEnd(dateIso: string): string {
  const start = parseLocalDate(getWeekStart(dateIso))
  start.setDate(start.getDate() + 6)
  return getLocalDateString(start)
}

/** ISO date shifted by n days. */
export function addDays(iso: string, n: number): string {
  const d = parseLocalDate(iso)
  d.setDate(d.getDate() + n)
  return getLocalDateString(d)
}

/** Last day of the given month, as its day number (28/29/30/31). */
export function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/** Inclusive list of every ISO date from startIso to endIso. */
export function eachDay(startIso: string, endIso: string): string[] {
  const out: string[] = []
  let cur = startIso
  while (cur <= endIso) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

export interface WeekDayInfo {
  dateStr: string
  label: string
  dayName: string
}

/** The seven days of the Monday-Sunday week containing referenceDate. */
export function getDaysOfWeek(referenceDate: Date | string = new Date()): WeekDayInfo[] {
  const refIso = typeof referenceDate === 'string' ? referenceDate : getLocalDateString(referenceDate)
  const start = parseLocalDate(getWeekStart(refIso))
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  const result: WeekDayInfo[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    result.push({
      dateStr: getLocalDateString(d),
      label: days[i],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
    })
  }
  return result
}
