import { toDate, toISO, toDateISO, startOfDay, addDays, sameDay } from './dates.js'

/**
 * Expansão local de ocorrências (handoff §5/§6). Eventos sem regra geram uma
 * única instância; eventos recorrentes geram uma instância por dia da janela que
 * casa com a regra (semanal: dia da semana; mensal: dia do mês), respeitando
 * `ignorar_feriados` e `data_fim`. No Marco 4 esta expansão passa a vir do backend.
 *
 * Uma "instância" é o objeto concreto que a grade renderiza:
 *   { id, eventoId, occDateISO, titulo, classe, detalhes, inicio, fim,
 *     rastrear_conclusao, status, recorrente }
 * Para eventos não-recorrentes id === eventoId e occDateISO === null.
 */

/** Aplica a hora de `timeSource` (Date/ISO) sobre a data `day`. */
function atDay(day, timeSource) {
  const t = toDate(timeSource)
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), t.getHours(), t.getMinutes(), 0)
}

function ruleMatches(regra, day) {
  if (regra.tipo === 'MENSAL') return regra.dias.includes(day.getDate())
  // SEMANAL (padrão)
  return regra.dias.includes(day.getDay())
}

/**
 * @param {any[]} eventos
 * @param {{ feriados?: Set<string>, start: Date, end: Date }} opts
 *        start/end delimitam a janela (dias inclusivos).
 * @returns {any[]} instâncias dentro da janela.
 */
export function expandInstances(eventos, { feriados = new Set(), start, end }) {
  const s = startOfDay(start)
  const e = startOfDay(end)
  const out = []

  for (const evento of eventos) {
    const regra = evento.regra_recorrencia
    if (!regra || !Array.isArray(regra.dias) || regra.dias.length === 0) {
      // Não-recorrente: instância única, se cai na janela.
      const dia = startOfDay(evento.inicio)
      if (dia >= s && dia <= e) {
        out.push(instanceFrom(evento, null, evento.inicio, evento.fim, evento.status))
      }
      continue
    }

    const dataFim = regra.data_fim ? startOfDay(regra.data_fim) : null
    for (let day = new Date(s); day <= e; day = addDays(day, 1)) {
      if (dataFim && day > dataFim) break
      if (!ruleMatches(regra, day)) continue
      if (regra.ignorar_feriados && feriados.has(toDateISO(day))) continue
      const inicio = atDay(day, evento.inicio)
      const fim = atDay(day, evento.fim)
      const dateISO = toDateISO(day)
      const override = evento.ocorrencias?.[dateISO]
      const status = override?.status ?? evento.status ?? (evento.rastrear_conclusao ? 'AGENDADO' : undefined)
      // Ocorrências REMARCADO foram devolvidas ao Inbox; não as mostramos na grade.
      if (status === 'REMARCADO') continue
      out.push(instanceFrom(evento, dateISO, inicio, fim, status))
    }
  }
  return out
}

function instanceFrom(evento, occDateISO, inicio, fim, status) {
  return {
    id: occDateISO ? `${evento.id}@${occDateISO}` : evento.id,
    eventoId: evento.id,
    occDateISO,
    recorrente: !!occDateISO,
    titulo: evento.titulo,
    classe: evento.classe,
    detalhes: evento.detalhes,
    inicio: typeof inicio === 'string' ? inicio : toISO(inicio),
    fim: typeof fim === 'string' ? fim : toISO(fim),
    rastrear_conclusao: !!evento.rastrear_conclusao,
    status,
  }
}

/** Filtra instâncias de um dia específico. */
export function instancesOfDay(instances, day) {
  return instances.filter((i) => sameDay(i.inicio, day))
}
