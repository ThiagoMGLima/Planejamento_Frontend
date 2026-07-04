import { formatTime } from '../lib/dates.js'
import { statusEfetivo } from '../lib/status.js'
import { corParaTema } from '../lib/colors.js'
import { useTheme } from '../lib/theme.jsx'
import { useEditar } from '../store/editar.jsx'
import { EVENTO_DND_MIME } from '../lib/schedule.js'

/**
 * Bloco de evento (handoff §3). Regra inviolável: a COR vem sempre da classe; o
 * ESTADO é tratamento (borda/opacidade/ícone), nunca outra matiz. O status é
 * DERIVADO no cliente (status_efetivo): PENDENTE aparece sozinho ao vencer.
 *
 * Estados: agendado · pendente (dashed âmbar + ⚠, sem sombra) · concluído
 * (opacity .55 + ✓ + line-through) · selecionado (borda cor-da-classe + sombra).
 *
 * @param {{ instance: any, classe: any, now?: Date, selected?: boolean, style?: object, onClick?: Function }} props
 */
export default function EventBlock({
  instance,
  classe,
  now = new Date(),
  selected = false,
  style,
  onClick,
}) {
  const { theme } = useTheme()
  const { editando } = useEditar()
  const status = statusEfetivo(instance, now)
  const pendente = status === 'PENDENTE'
  const concluido = status === 'CONCLUIDO'
  const cor = corParaTema(classe?.cor ?? { bg: '#eee', st: '#ccc', tx: '#333' }, theme)

  // No modo Editar todo evento é movível: simples atualiza a série; ocorrência
  // recorrente grava só o override daquele dia (não afeta as demais).
  const arrastavel = editando

  const blockStyle = {
    ...style,
    background: cor.bg,
    color: cor.tx,
    borderColor: pendente ? 'var(--pend)' : selected ? cor.tx : 'transparent',
  }

  const showTime = !style || style.height === undefined || parseFloat(style.height) > 30

  const cls = [
    'event',
    pendente && 'event--pend',
    concluido && 'event--done',
    selected && 'event--selected',
    arrastavel && 'event--arrastavel',
  ]
    .filter(Boolean)
    .join(' ')

  function onDragStart(e) {
    const durMin = Math.round((new Date(instance.fim) - new Date(instance.inicio)) / 60000)
    e.dataTransfer.setData(
      EVENTO_DND_MIME,
      JSON.stringify({
        eventoId: instance.eventoId,
        durMin,
        inicioISO: instance.inicio,
        occDateISO: instance.occDateISO ?? null,
      }),
    )
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <button
      type="button"
      className={cls}
      style={blockStyle}
      onClick={onClick}
      draggable={arrastavel}
      onDragStart={arrastavel ? onDragStart : undefined}
    >
      <span className="event__title">
        {pendente && '⚠ '}
        {concluido && '✓ '}
        {instance.titulo}
      </span>
      {showTime && (
        <span className="event__time mono">
          {formatTime(instance.inicio)}–{formatTime(instance.fim)}
        </span>
      )}
    </button>
  )
}
