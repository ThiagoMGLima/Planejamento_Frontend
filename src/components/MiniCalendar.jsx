import { useStore } from '../store/store.jsx'
import {
  monthGrid,
  sameDay,
  startOfWeek,
  toDateISO,
  MONTHS_SHORT,
  WEEKDAYS_SHORT,
} from '../lib/dates.js'

/**
 * Mini-calendário (handoff §3) — dias em mono; HOJE preenchido de violeta;
 * SEMANA atual em tint; FERIADO em vermelho. Clicar num dia navega o cursor.
 * Some na view Mês (decisão do App, que não o renderiza nesse caso).
 */
export default function MiniCalendar() {
  const store = useStore()
  const cursor = new Date(store.cursorISO)
  const today = store.now
  const weeks = monthGrid(cursor)
  const cursorWeekStart = startOfWeek(cursor)

  return (
    <div className="minical">
      <div className="minical__head">
        <span className="minical__month">
          {MONTHS_SHORT[cursor.getMonth()]} {cursor.getFullYear()}
        </span>
      </div>
      <div className="minical__dow">
        {WEEKDAYS_SHORT.map((d, i) => (
          <span key={i} className="minical__dowcell mono">
            {d[0]}
          </span>
        ))}
      </div>
      <div className="minical__grid">
        {weeks.flat().map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth()
          const isToday = sameDay(day, today)
          const inCursorWeek = sameDay(startOfWeek(day), cursorWeekStart)
          const feriado = store.feriadoByDate(toDateISO(day))
          const cls = [
            'minical__cell mono',
            !inMonth && 'minical__cell--out',
            inCursorWeek && 'minical__cell--week',
            feriado && !isToday && 'minical__cell--feriado',
            isToday && 'minical__cell--today',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={toDateISO(day)}
              type="button"
              className={cls}
              title={feriado ? feriado.nome : undefined}
              onClick={() => store.setCursor(toDateISO(day))}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
