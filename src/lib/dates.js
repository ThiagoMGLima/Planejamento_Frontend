/**
 * Helpers de tempo/grade. Datas trafegam como ISO (igual à API). As funções de
 * janela (semana/dia/mês) e de posição na grade alimentam as views do Marco 2.
 * O cálculo de hora por arrasto/snap chega no Marco 3.
 */

/** Início da faixa horária da grade (06:00). @type {number} */
export const DAY_START = 6
/** Fim da faixa horária da grade (23:30). @type {number} */
export const DAY_END = 23.5
/** Altura de 1h na grade, em px (token --hour-h). @type {number} */
export const HOUR_PX = 38
/** Snap do arrasto, em horas (15min = 0.25h). @type {number} */
export const SNAP_HOURS = 0.25

/** Dias da semana em pt-BR, abreviados (índice 0 = domingo). @type {string[]} */
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
/** Meses em pt-BR, abreviados (índice 0 = janeiro). @type {string[]} */
export const MONTHS_SHORT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

/**
 * Lista de horas cheias exibidas na régua (06h … 23h), inclusiva no início.
 * @returns {number[]}
 */
export function rulerHours() {
  const hours = []
  for (let h = Math.ceil(DAY_START); h <= Math.floor(DAY_END); h++) hours.push(h)
  return hours
}

/** Formata uma hora cheia como rótulo da régua (mono): 6 → "06:00". */
export function formatHour(h) {
  return `${String(h).padStart(2, '0')}:00`
}

/** Formata um Date como "HH:MM". */
export function formatTime(date) {
  const d = toDate(date)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Aceita Date ou string ISO e devolve sempre um Date. */
export function toDate(value) {
  return value instanceof Date ? value : new Date(value)
}

/** ISO local "YYYY-MM-DDTHH:mm:ss" (sem timezone), como a API espera. */
export function toISO(date) {
  const d = toDate(date)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`
}

/** ISO só de data "YYYY-MM-DD" (âncora de navegação). */
export function toDateISO(date) {
  const d = toDate(date)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Meia-noite local do dia de `date` (não muta o original). */
export function startOfDay(date) {
  const d = toDate(date)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** `date` + n dias (novo Date). */
export function addDays(date, n) {
  const d = startOfDay(date)
  d.setDate(d.getDate() + n)
  return d
}

/** `date` + n meses (novo Date, dia 1). */
export function addMonths(date, n) {
  const d = startOfDay(date)
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

/** Segunda-feira da semana que contém `date` (semana Seg→Dom, como no handoff). */
export function startOfWeek(date) {
  const d = startOfDay(date)
  const dow = d.getDay() // 0=dom … 6=sáb
  const diff = (dow + 6) % 7 // dias desde segunda
  return addDays(d, -diff)
}

/** Os 7 dias (Seg→Dom) da semana que contém `date`. @returns {Date[]} */
export function weekDays(date) {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Mesma data-calendário (ignora horário). */
export function sameDay(a, b) {
  const x = toDate(a)
  const y = toDate(b)
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  )
}

/** Hora decimal local de um Date (13:30 → 13.5). */
export function decimalHour(date) {
  const d = toDate(date)
  return d.getHours() + d.getMinutes() / 60
}

/**
 * Posição vertical de um evento na grade horária (top/height em px), recortada
 * à faixa visível 06:00–23:30. Usada por Week/Day.
 * @returns {{ top: number, height: number }}
 */
export function gridPosition(inicio, fim) {
  const start = Math.max(decimalHour(inicio), DAY_START)
  const end = Math.min(decimalHour(fim), DAY_END)
  const top = (start - DAY_START) * HOUR_PX
  const height = Math.max((end - start) * HOUR_PX, 16) // altura mínima legível
  return { top, height }
}

/**
 * Converte um Y (px, relativo ao topo da coluna) em hora decimal com snap de
 * 15min, recortada à faixa 06:00–23:30 (handoff §5).
 * @returns {number} hora decimal (ex.: 13.25 = 13:15).
 */
export function snapHourFromY(y) {
  const raw = DAY_START + y / HOUR_PX
  const snapped = Math.round(raw / SNAP_HOURS) * SNAP_HOURS
  return Math.min(Math.max(snapped, DAY_START), DAY_END)
}

/** Hora decimal → "HH:MM" (13.25 → "13:15"). */
export function formatDecimalHour(h) {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** Aplica uma hora decimal a um dia, devolvendo um Date. */
export function dateAtHour(day, decimalH) {
  const d = toDate(day)
  const hh = Math.floor(decimalH)
  const mm = Math.round((decimalH - hh) * 60)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0)
}

/**
 * Matriz de semanas (Seg→Dom) que cobre o mês de `date`, para a grade do Mês.
 * @returns {Date[][]}
 */
export function monthGrid(date) {
  const d = toDate(date)
  const first = new Date(d.getFullYear(), d.getMonth(), 1)
  const gridStart = startOfWeek(first)
  const weeks = []
  let cursor = gridStart
  for (let w = 0; w < 6; w++) {
    const row = Array.from({ length: 7 }, (_, i) => addDays(cursor, i))
    weeks.push(row)
    cursor = addDays(cursor, 7)
    // para se a próxima semana já passou do mês
    if (cursor.getMonth() !== d.getMonth() && w >= 3 && row.some((x) => x.getMonth() !== d.getMonth())) break
  }
  return weeks
}

/** Rótulo curto de navegação conforme a view (ex.: "16–22 jun · 2026"). */
export function rangeLabel(cursorDate, view) {
  const d = toDate(cursorDate)
  if (view === 'dia') {
    return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} · ${d.getFullYear()}`
  }
  if (view === 'mes') {
    return `${MONTHS_SHORT[d.getMonth()]} · ${d.getFullYear()}`
  }
  const days = weekDays(d)
  const a = days[0]
  const b = days[6]
  const mesA = MONTHS_SHORT[a.getMonth()]
  const mesB = MONTHS_SHORT[b.getMonth()]
  const right = mesA === mesB ? `${b.getDate()} ${mesB}` : `${b.getDate()} ${mesB}`
  return `${a.getDate()} ${mesA} – ${right} · ${b.getFullYear()}`
}
