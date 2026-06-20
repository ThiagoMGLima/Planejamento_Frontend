import { decimalHour, dateAtHour, DAY_END } from './dates.js'

/**
 * Solta uma tarefa do Inbox num horário (handoff §5): cria o Evento começando no
 * drop, com duração = esforço estimado (ou 1h), promove a tarefa e abre o painel
 * do novo evento. A herança de classe/rastreamento acontece no store (PROMOVER).
 *
 * @param {ReturnType<import('../store/store.jsx').useStore>} store
 * @param {string} tarefaId
 * @param {Date} inicio  Início (já com snap de 15min) na coluna do dia.
 */
export function scheduleTarefaDrop(store, tarefaId, inicio) {
  const tarefa = store.tarefas.find((t) => t.id === tarefaId)
  if (!tarefa) return
  const horas = tarefa.esforco_estimado ? tarefa.esforco_estimado / 60 : 1
  const fimH = Math.min(decimalHour(inicio) + horas, DAY_END)
  const fim = dateAtHour(inicio, fimH)
  const id = store.promoverTarefa(tarefaId, inicio, fim)
  store.openEventPanel(id)
}
