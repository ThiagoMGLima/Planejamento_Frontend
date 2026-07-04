import { useState } from 'react'
import EventBlock from './EventBlock.jsx'
import NowLine from './NowLine.jsx'
import { EVENTO_DND_MIME } from '../lib/schedule.js'
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
 *   inset?: number, ghosts?: {key:string, inicio:Date, fim:Date, titulo:string}[]
 * }} props
 *
 * `ghosts` (opcional): sessões PROPOSTAS por um cenário (Rotina Inteligente, W3),
 * desenhadas com opacidade reduzida (padrão "ghost") — preview, não eventos reais.
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
  onMoveEvento,
  inset = 3,
  ghosts = [],
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
    const { hour } = ghostFromEvent(e)
    setGhost(null)
    // Mover evento agendado (modo Editar) tem prioridade sobre agendar tarefa.
    const eventoRaw = e.dataTransfer.getData(EVENTO_DND_MIME)
    if (eventoRaw) {
      try {
        onMoveEvento?.(JSON.parse(eventoRaw), dateAtHour(day, hour))
      } catch {
        /* payload inválido — ignora */
      }
      return
    }
    const tarefaId = e.dataTransfer.getData('text/plain')
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

      {ghosts.map((g) => {
        const { top, height } = gridPosition(g.inicio, g.fim)
        return (
          <div
            key={g.key}
            className="sessao-ghost"
            style={{ position: 'absolute', top, height, left: inset, right: inset }}
            title={g.titulo}
          >
            <span className="sessao-ghost__t">{g.titulo}</span>
          </div>
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
