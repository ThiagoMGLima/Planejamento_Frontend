import { DAY_START, DAY_END, HOUR_PX, decimalHour } from '../lib/dates.js'

/**
 * Linha do agora (handoff §3) — régua horizontal violeta 2px + ponto, posicionada
 * pela hora atual. Renderizada SÓ na coluna de hoje (a view decide quando montar).
 * Fica oculta se a hora atual está fora da faixa 06:00–23:30.
 */
export default function NowLine({ now = new Date() }) {
  const h = decimalHour(now)
  if (h < DAY_START || h > DAY_END) return null
  const top = (h - DAY_START) * HOUR_PX
  return (
    <div className="nowline" style={{ top: `${top}px` }} aria-hidden="true">
      <span className="nowline__dot" />
    </div>
  )
}
