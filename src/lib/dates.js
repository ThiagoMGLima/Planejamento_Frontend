/**
 * Helpers de tempo/grade. Nesta etapa cobrem apenas o que o shell precisa
 * (régua de horas). O cálculo de posição por arrasto/snap chega no Marco 3.
 */

/** Início da faixa horária da grade (06:00). @type {number} */
export const DAY_START = 6
/** Fim da faixa horária da grade (23:30). @type {number} */
export const DAY_END = 23.5

/**
 * Lista de horas cheias exibidas na régua (06h … 23h), inclusiva no início.
 * @returns {number[]}
 */
export function rulerHours() {
  const hours = []
  for (let h = Math.ceil(DAY_START); h <= Math.floor(DAY_END); h++) hours.push(h)
  return hours
}

/**
 * Formata uma hora cheia como rótulo da régua (mono): 6 → "06:00".
 * @param {number} h
 * @returns {string}
 */
export function formatHour(h) {
  return `${String(h).padStart(2, '0')}:00`
}

/** Dias da semana em pt-BR, abreviados (índice 0 = domingo). @type {string[]} */
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
