import { corParaTema } from '../lib/colors.js'
import { useTheme } from '../lib/theme.jsx'

/**
 * Card do Inbox (handoff §3) — barra de acento esquerda = traço (st) da classe;
 * alça de pontos (drag handle); título + meta (mono). É `draggable`: o card
 * carrega o id da tarefa no dataTransfer; o fluxo de soltar no horário vive nas
 * views.
 *
 * Modo **seleção** (feature Rotina Inteligente, W1): quando `modo="selecao"` o
 * card deixa de arrastar e vira alvo de checkbox. Tarefas **elegíveis** ganham um
 * checkbox violeta (accent `--ui`); **inelegíveis** ficam esmaecidas, sem
 * checkbox, com a pílula âmbar do `motivo` e o link "completar ›".
 *
 * @param {{
 *   tarefa: any, classe?: any, onClick?: Function,
 *   modo?: 'normal' | 'selecao',
 *   elegivel?: boolean, motivo?: string | null,
 *   selecionada?: boolean, onToggle?: Function, onCompletar?: Function,
 * }} props
 */
export default function InboxCard({
  tarefa,
  classe,
  onClick,
  modo = 'normal',
  elegivel = true,
  motivo = null,
  selecionada = false,
  onToggle,
  onCompletar,
}) {
  const { theme } = useTheme()
  const acento = classe?.cor ? corParaTema(classe.cor, theme).st : 'var(--hairline-strong)'
  const selecao = modo === 'selecao'
  const inelegivel = selecao && !elegivel

  const meta = []
  if (tarefa.deadline) meta.push(`prazo ${formatDeadline(tarefa.deadline)}`)
  else meta.push('sem prazo')
  if (tarefa.esforco_estimado) meta.push(formatEsforco(tarefa.esforco_estimado))
  meta.push(classe?.nome ?? 'sem classe')

  function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', tarefa.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  // Em seleção, o card inteiro toggla (elegível) ou chama "completar" (inelegível).
  function handleClick() {
    if (!selecao) return onClick?.()
    if (elegivel) onToggle?.(tarefa.id)
    else onCompletar?.(tarefa)
  }

  const className = [
    'inboxcard',
    selecao && 'inboxcard--selecao',
    selecionada && 'inboxcard--on',
    inelegivel && 'inboxcard--inelegivel',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      draggable={!selecao}
      onDragStart={selecao ? undefined : handleDragStart}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-pressed={selecao && elegivel ? selecionada : undefined}
    >
      <span className="inboxcard__acc" style={{ background: acento }} />
      {!selecao && (
        <span className="inboxcard__handle" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
      <div className="inboxcard__body">
        <div className="inboxcard__title">{tarefa.titulo}</div>
        <div className="inboxcard__meta mono">{meta.join(' · ')}</div>
        {inelegivel && (
          <span className="inboxcard__motivo">
            {motivo}
            {onCompletar && <span className="inboxcard__completar"> · completar ›</span>}
          </span>
        )}
      </div>
      {selecao && elegivel && (
        <input
          type="checkbox"
          className="inboxcard__check"
          checked={selecionada}
          onChange={() => onToggle?.(tarefa.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Selecionar ${tarefa.titulo} para o plano`}
        />
      )}
    </div>
  )
}

function formatDeadline(iso) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatEsforco(min) {
  if (min % 60 === 0) return `${min / 60}h`
  if (min > 60) return `${Math.floor(min / 60)}h${min % 60}min`
  return `${min}min`
}
