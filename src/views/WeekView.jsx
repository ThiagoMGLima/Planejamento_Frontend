import { useStore } from '../store/store.jsx'
import DayColumn from '../components/DayColumn.jsx'
import { scheduleTarefaDrop } from '../lib/schedule.js'
import {
  weekDays,
  rulerHours,
  formatHour,
  sameDay,
  toDateISO,
  WEEKDAYS_SHORT,
  HOUR_PX,
} from '../lib/dates.js'

/**
 * Grade Semana (handoff §4) — 7 colunas, 06h→23h30; cor de cada bloco vinda da
 * classe; hoje destacado com a linha do agora. Arrasto Inbox→horário ativo em
 * cada coluna. Feriado aparece como etiqueta no cabeçalho, nunca como bloco.
 */
export default function WeekView() {
  const store = useStore()
  const days = weekDays(new Date(store.cursorISO))
  const hours = rulerHours()
  const today = store.now
  const bodyHeight = hours.length * HOUR_PX
  const instances = store.instancesInRange(days[0], days[6])

  return (
    <div className="calendar">
      <div className="calendar__head">
        <div className="calendar__corner" />
        {days.map((day) => {
          const isToday = sameDay(day, today)
          const feriado = store.feriadoByDate(toDateISO(day))
          return (
            <div key={day.toISOString()} className={`calendar__dayhead ${isToday ? 'is-today' : ''}`}>
              <div className="calendar__dayhead-main">
                <span className="calendar__dayname">{WEEKDAYS_SHORT[day.getDay()]}</span>
                <span className={`calendar__daynum mono ${isToday ? 'calendar__daynum--today' : ''}`}>
                  {day.getDate()}
                </span>
              </div>
              {feriado && (
                <span className="feriado-tag" title={feriado.nome}>
                  FERIADO
                </span>
              )}
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
          {days.map((day) => (
            <DayColumn
              key={day.toISOString()}
              day={day}
              instances={instances.filter((i) => sameDay(i.inicio, day))}
              isToday={sameDay(day, today)}
              now={today}
              selectedId={store.selectedId}
              classeById={store.classeById}
              onOpen={(inst) => store.openEventPanel(inst.eventoId, inst)}
              onDropTarefa={(tarefaId, inicio) => scheduleTarefaDrop(store, tarefaId, inicio)}
              inset={3}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
