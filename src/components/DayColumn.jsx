import { useState } from 'react'
import EventBlock from './EventBlock.jsx'
import NowLine from './NowLine.jsx'
import {
  rulerHours,
  gridPosition,
  snapHourFromY,
  formatDecimalHour,
  dateAtHour,
  HOUR_PX,
  DAY_START,
} from '../lib/dates.js'

/**
 * Coluna de um dia na grade (compartilhada por Semana e Dia). Renderiza os slots
 * horários, as instâncias de evento posicionadas, a linha do agora (se hoje) e
 * trata o arrasto Inbox → horário: durante o drag mostra o FANTASMA (bloco
 * tracejado com o horário em snap de 15min); ao soltar, agenda no horário.
 *
 * @param {{
 *   day: Date, instances: any[], isToday?: boolean, now: Date,
 *   selectedId: string|null, classeById: Function,
 *   onOpen: (instance:any)=>void, onDropTarefa: (tarefaId:string, inicio:Date)=>void,
 *   inset?: number
 * }} props
 */
export default function DayColumn({
  day,
  instances,
  isToday = false,
  now,
  selectedId,
  classeById,
  onOpen,
  onDropTarefa,
  inset = 3,
}) {
  const hours = rulerHours()
  const [ghost, setGhost] = useState(null) // { top, label } | null

  function ghostFromEvent(e) {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    const h = snapHourFromY(y)
    return { top: (h - DAY_START) * HOUR_PX, label: formatDecimalHour(h), hour: h }
  }

  function onDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setGhost(ghostFromEvent(e))
  }

  function onDrop(e) {
    e.preventDefault()
    const tarefaId = e.dataTransfer.getData('text/plain')
    const { hour } = ghostFromEvent(e)
    setGhost(null)
    if (tarefaId) onDropTarefa(tarefaId, dateAtHour(day, hour))
  }

  return (
    <div
      className={`calendar__col ${isToday ? 'is-today' : ''}`}
      style={{ height: hours.length * HOUR_PX }}
      onDragOver={onDragOver}
      onDragLeave={() => setGhost(null)}
      onDrop={onDrop}
    >
      {hours.map((h) => (
        <div key={h} className="calendar__slot" />
      ))}

      {instances.map((inst) => {
        const { top, height } = gridPosition(inst.inicio, inst.fim)
        return (
          <EventBlock
            key={inst.id}
            instance={inst}
            classe={classeById(inst.classe)}
            now={now}
            selected={selectedId === inst.id}
            style={{ position: 'absolute', top, height, left: inset, right: inset }}
            onClick={() => onOpen(inst)}
          />
        )
      })}

      {ghost && (
        <div className="ghost" style={{ top: ghost.top, left: inset, right: inset }}>
          <span className="ghost__time mono">{ghost.label}</span>
        </div>
      )}

      {isToday && <NowLine now={now} />}
    </div>
  )
}
