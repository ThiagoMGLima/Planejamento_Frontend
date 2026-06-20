import { useStore } from '../store/store.jsx'
import DayColumn from '../components/DayColumn.jsx'
import { scheduleTarefaDrop } from '../lib/schedule.js'
import {
  rulerHours,
  formatHour,
  sameDay,
  toDateISO,
  WEEKDAYS_SHORT,
  MONTHS_SHORT,
  HOUR_PX,
} from '../lib/dates.js'

/**
 * Dia (handoff §4) — coluna única larga (máx. ~760px), foco em "o que faço
 * agora". Mesma faixa horária e cores de classe; linha do agora quando é hoje;
 * arrasto Inbox→horário ativo. Feriado vira etiqueta no cabeçalho.
 */
export default function DayView() {
  const store = useStore()
  const day = new Date(store.cursorISO)
  const hours = rulerHours()
  const today = store.now
  const isToday = sameDay(day, today)
  const bodyHeight = hours.length * HOUR_PX
  const instances = store.instancesInRange(day, day)
  const feriado = store.feriadoByDate(toDateISO(day))

  return (
    <div className="calendar calendar--day">
      <div className="calendar__head">
        <div className="calendar__corner" />
        <div className={`calendar__dayhead ${isToday ? 'is-today' : ''}`}>
          <div className="calendar__dayhead-main">
            <span className="calendar__dayname">{WEEKDAYS_SHORT[day.getDay()]}</span>
            <span className={`calendar__daynum mono ${isToday ? 'calendar__daynum--today' : ''}`}>
              {day.getDate()} {MONTHS_SHORT[day.getMonth()]}
            </span>
          </div>
          {feriado && (
            <span className="feriado-tag" title={feriado.nome}>
              FERIADO · {feriado.nome}
            </span>
          )}
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
          <DayColumn
            day={day}
            instances={instances}
            isToday={isToday}
            now={today}
            selectedId={store.selectedId}
            classeById={store.classeById}
            onOpen={(inst) => store.openEventPanel(inst.eventoId, inst)}
            onDropTarefa={(tarefaId, inicio) => scheduleTarefaDrop(store, tarefaId, inicio)}
            inset={6}
          />
        </div>
      </div>
    </div>
  )
}
