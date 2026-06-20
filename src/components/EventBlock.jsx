import { formatTime } from '../lib/dates.js'

/**
 * Bloco de evento (handoff §3). Regra inviolável: a COR vem sempre da classe; o
 * ESTADO é tratamento (borda/opacidade/ícone), nunca outra matiz.
 *
 * Estados:
 *  - agendado:   fundo + texto da classe
 *  - pendente:   borda 1.5px dashed âmbar + ⚠, sem sombra
 *  - concluído:  opacity .55 + ✓ + line-through
 *  - selecionado: borda 1.5px na cor da classe + sombra realçada
 *
 * @param {{ evento: any, classe: any, selected?: boolean, style?: object, onClick?: Function }} props
 */
export default function EventBlock({ evento, classe, selected = false, style, onClick }) {
  const status = evento.rastrear_conclusao ? evento.status : undefined
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
        {evento.titulo}
      </span>
      {showTime && (
        <span className="event__time mono">
          {formatTime(evento.inicio)}–{formatTime(evento.fim)}
        </span>
      )}
    </button>
  )
}
