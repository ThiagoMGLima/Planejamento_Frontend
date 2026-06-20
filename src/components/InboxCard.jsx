/**
 * Card do Inbox (handoff §3) — barra de acento esquerda = traço (st) da classe;
 * alça de pontos (drag handle); título + meta (mono). É `draggable`: o card
 * carrega o id da tarefa no dataTransfer, mas o FLUXO de soltar no horário (snap
 * + fantasma + criação do evento) chega no Marco 3. Aqui o arrasto é só o gancho.
 *
 * @param {{ tarefa: any, classe?: any, onClick?: Function }} props
 */
export default function InboxCard({ tarefa, classe, onClick }) {
  const acento = classe?.cor?.st ?? 'var(--hairline-strong)'

  const meta = []
  if (tarefa.deadline) meta.push(`deadline ${formatDeadline(tarefa.deadline)}`)
  else meta.push('sem deadline')
  if (tarefa.esforco_estimado) meta.push(`${formatEsforco(tarefa.esforco_estimado)}`)

  function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', tarefa.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      className="inboxcard"
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <span className="inboxcard__acc" style={{ background: acento }} />
      <span className="inboxcard__handle" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <div className="inboxcard__body">
        <div className="inboxcard__title">{tarefa.titulo}</div>
        <div className="inboxcard__meta mono">{meta.join(' · ')}</div>
      </div>
    </div>
  )
}

function formatDeadline(iso) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatEsforco(min) {
  if (min % 60 === 0) return `${min / 60}h`
  return `${min}min`
}
