import { useStore } from '../store/store.jsx'
import EventBlock from '../components/EventBlock.jsx'
import NowLine from '../components/NowLine.jsx'
import {
  rulerHours,
  formatHour,
  sameDay,
  gridPosition,
  WEEKDAYS_SHORT,
  MONTHS_SHORT,
  HOUR_PX,
} from '../lib/dates.js'

/**
 * Dia (handoff §4) — coluna única larga (máx. ~760px), foco em "o que faço
 * agora". Mesma faixa horária e cores de classe; linha do agora quando é hoje.
 */
export default function DayView() {
  const store = useStore()
  const day = new Date(store.cursorISO)
  const hours = rulerHours()
  const today = new Date()
  const isToday = sameDay(day, today)
  const bodyHeight = hours.length * HOUR_PX // alinha régua e colunas aos slots
  const eventos = store.eventos.filter((e) => sameDay(e.inicio, day))

  return (
    <div className="calendar calendar--day">
      <div className="calendar__head">
        <div className="calendar__corner" />
        <div className={`calendar__dayhead ${isToday ? 'is-today' : ''}`}>
          <span className="calendar__dayname">{WEEKDAYS_SHORT[day.getDay()]}</span>
          <span className={`calendar__daynum mono ${isToday ? 'calendar__daynum--today' : ''}`}>
            {day.getDate()} {MONTHS_SHORT[day.getMonth()]}
          </span>
        </div>
      </div>

      <div className="calendar__body">
        <div className="calendar__ruler" style={{ height: bodyHeight }}>
          {hours.map((h) => (
            <div key={h} className="calendar__hourlabel mono">
              {formatHour(h)}
            </div>
          ))}
        </div>

        <div className="calendar__grid">
          <div className={`calendar__col ${isToday ? 'is-today' : ''}`} style={{ height: bodyHeight }}>
            {hours.map((h) => (
              <div key={h} className="calendar__slot" />
            ))}
            {eventos.map((e) => {
              const { top, height } = gridPosition(e.inicio, e.fim)
              return (
                <EventBlock
                  key={e.id}
                  evento={e}
                  classe={store.classeById(e.classe)}
                  selected={store.selectedId === e.id}
                  style={{ position: 'absolute', top, height, left: 6, right: 6 }}
                  onClick={() => store.openEventPanel(e.id)}
                />
              )
            })}
            {isToday && <NowLine now={today} />}
          </div>
        </div>
      </div>
    </div>
  )
}
