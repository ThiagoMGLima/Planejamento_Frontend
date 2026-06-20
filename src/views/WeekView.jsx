import { useStore } from '../store/store.jsx'
import EventBlock from '../components/EventBlock.jsx'
import NowLine from '../components/NowLine.jsx'
import {
  weekDays,
  rulerHours,
  formatHour,
  sameDay,
  gridPosition,
  WEEKDAYS_SHORT,
  HOUR_PX,
} from '../lib/dates.js'

/**
 * Grade Semana (handoff §4) — 7 colunas, 06h→23h30; cor de cada bloco vinda da
 * classe; hoje destacado com a linha do agora. Clicar num evento o seleciona e
 * abre o painel.
 */
export default function WeekView() {
  const store = useStore()
  const days = weekDays(new Date(store.cursorISO))
  const hours = rulerHours()
  const today = new Date()
  const bodyHeight = hours.length * HOUR_PX // alinha régua e colunas aos slots

  return (
    <div className="calendar">
      <div className="calendar__head">
        <div className="calendar__corner" />
        {days.map((day) => {
          const isToday = sameDay(day, today)
          return (
            <div key={day.toISOString()} className={`calendar__dayhead ${isToday ? 'is-today' : ''}`}>
              <span className="calendar__dayname">{WEEKDAYS_SHORT[day.getDay()]}</span>
              <span className={`calendar__daynum mono ${isToday ? 'calendar__daynum--today' : ''}`}>
                {day.getDate()}
              </span>
            </div>
          )
        })}
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
          {days.map((day) => {
            const isToday = sameDay(day, today)
            const eventos = store.eventos.filter((e) => sameDay(e.inicio, day))
            return (
              <div key={day.toISOString()} className={`calendar__col ${isToday ? 'is-today' : ''}`} style={{ height: bodyHeight }}>
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
                      style={{ position: 'absolute', top, height, left: 3, right: 3 }}
                      onClick={() => store.openEventPanel(e.id)}
                    />
                  )
                })}
                {isToday && <NowLine now={today} />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
