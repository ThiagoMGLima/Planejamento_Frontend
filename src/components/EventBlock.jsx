import { formatTime } from '../lib/dates.js'
import { statusEfetivo } from '../lib/status.js'

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
export default function EventBlock({ instance, classe, now = new Date(), selected = false, style, onClick }) {
  const status = statusEfetivo(instance, now)
  const pendente = status === 'PENDENTE'
  const concluido = status === 'CONCLUIDO'
  const cor = classe?.cor ?? { bg: '#eee', st: '#ccc', tx: '#333' }

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
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={cls} style={blockStyle} onClick={onClick}>
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
