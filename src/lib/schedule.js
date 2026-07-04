import { decimalHour, dateAtHour, toISO, DAY_END } from './dates.js'

/** Tipo de dataTransfer para mover um evento já agendado (modo Editar). O
 *  arrasto de tarefa do Inbox continua usando `text/plain` = id da tarefa. */
export const EVENTO_DND_MIME = 'application/x-planner-evento'

/**
 * Solta uma tarefa do Inbox num horário (handoff §5): cria o Evento começando no
 * drop, com duração = esforço estimado (ou 1h), promove a tarefa e abre o painel
 * do novo evento. A herança de classe/rastreamento acontece no store (PROMOVER).
 *
 * @param {ReturnType<import('../store/store.jsx').useStore>} store
 * @param {string} tarefaId
 * @param {Date} inicio  Início (já com snap de 15min) na coluna do dia.
 */
export async function scheduleTarefaDrop(store, tarefaId, inicio) {
  const tarefa = store.tarefas.find((t) => t.id === tarefaId)
  if (!tarefa) return
  const horas = tarefa.esforco_estimado ? tarefa.esforco_estimado / 60 : 1
  const fimH = Math.min(decimalHour(inicio) + horas, DAY_END)
  const fim = dateAtHour(inicio, fimH)
  // promoverTarefa é síncrono no store local e assíncrono no store da API:
  // await cobre ambos (await de um valor não-Promise devolve o próprio valor).
  const id = await store.promoverTarefa(tarefaId, inicio, fim)
  if (id) store.openEventPanel(id)
}

/**
 * Move um evento já agendado (modo Editar) para um novo início, preservando a
 * duração (`durMin`) e recortando ao fim da janela do dia. Para eventos simples
 * atualiza a série (updateEvento); para uma OCORRÊNCIA de série recorrente
 * (`occDateISO` presente), grava só o override daquele dia (`moverOcorrencia`),
 * sem afetar as demais ocorrências.
 *
 * @param {ReturnType<import('../store/store.jsx').useStore>} store
 * @param {{eventoId: string, durMin: number, occDateISO?: string|null}} payload
 * @param {Date} inicio  Novo início (snap de 15min) na coluna do dia de destino.
 */
export async function moverEventoDrop(store, payload, inicio) {
  const { eventoId, durMin, occDateISO } = payload ?? {}
  if (!eventoId) return
  const horas = durMin ? durMin / 60 : 1
  const fimH = Math.min(decimalHour(inicio) + horas, DAY_END)
  const fim = dateAtHour(inicio, fimH)
  if (occDateISO) {
    await store.moverOcorrencia(eventoId, occDateISO, inicio, fim)
  } else {
    await store.updateEvento({ id: eventoId, inicio: toISO(inicio), fim: toISO(fim) })
  }
}
