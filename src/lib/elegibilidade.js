/**
 * Elegibilidade de uma tarefa para o montador de rotina (handoff §5 / W1). O
 * solver precisa dos três dados para alocar uma tarefa no calendário: **prazo**,
 * **esforço estimado** e **classe**. Sem qualquer um deles a tarefa é
 * inelegível — a UI a mostra esmaecida, sem checkbox, com o motivo inline e o
 * link "completar ›".
 *
 * Função pura: `elegivel` controla o checkbox; `motivo` alimenta a pílula âmbar.
 * A ordem dos testes define qual motivo único aparece quando falta mais de um.
 *
 * @param {{ classe?: string, deadline?: string, esforco_estimado?: number }} tarefa
 * @returns {{ elegivel: boolean, motivo: string | null }}
 */
export function elegibilidadeTarefa(tarefa) {
  if (!tarefa?.deadline) return { elegivel: false, motivo: 'sem prazo definido' }
  if (!tarefa?.esforco_estimado) return { elegivel: false, motivo: 'sem esforço estimado' }
  if (!tarefa?.classe) return { elegivel: false, motivo: 'sem classe' }
  return { elegivel: true, motivo: null }
}

/** Atalho booleano para quando o motivo não importa. */
export function tarefaElegivel(tarefa) {
  return elegibilidadeTarefa(tarefa).elegivel
}

/** Tarefas ainda no Inbox (fonte da seleção de plano). */
export function tarefasDoInbox(tarefas) {
  return (tarefas ?? []).filter((t) => t.status === 'INBOX')
}
