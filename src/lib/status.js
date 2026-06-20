import { toDate } from './dates.js'

/**
 * status_efetivo — calculado SEMPRE no cliente, NUNCA persistido (handoff §6).
 * Só eventos que rastreiam conclusão têm status. A transição AGENDADO → PENDENTE
 * é derivada do tempo: quando `agora > fim` e o item ainda está AGENDADO.
 * CONCLUIDO/REMARCADO são estados explícitos (persistidos ou em override de
 * ocorrência) e têm precedência.
 *
 * @param {{ rastrear_conclusao?: boolean, status?: string, fim: string|Date }} item
 *        Evento ou instância de ocorrência (carrega rastrear_conclusao, status, fim).
 * @param {Date} now
 * @returns {string|undefined} AGENDADO | PENDENTE | CONCLUIDO | REMARCADO, ou undefined.
 */
export function statusEfetivo(item, now = new Date()) {
  if (!item.rastrear_conclusao) return undefined
  const base = item.status ?? 'AGENDADO'
  if (base === 'CONCLUIDO' || base === 'REMARCADO') return base
  if (base === 'AGENDADO' && toDate(item.fim).getTime() < now.getTime()) return 'PENDENTE'
  return base
}

/** True se o item está pendente agora (atalho para filtros). */
export function isPendente(item, now = new Date()) {
  return statusEfetivo(item, now) === 'PENDENTE'
}
