import { useState } from 'react'
import { useStore } from '../store/store.jsx'
import { useTheme } from '../lib/theme.jsx'
import { corParaTema } from '../lib/colors.js'
import { scheduleTarefaDrop, moverEventoDrop, EVENTO_DND_MIME } from '../lib/schedule.js'
import {
  monthGrid,
  sameDay,
  toDateISO,
  fromDateISO,
  formatTime,
  dateAtHour,
  WEEKDAYS_SHORT,
} from '../lib/dates.js'

/**
 * Mês (handoff §4) — panorama do mês no mesmo idioma visual do resto do app:
 * cada dia lista até 3 eventos como chips COLORIDOS pela classe (adaptados ao
 * tema), com "+N" de estouro; deadlines (âmbar ◆) e feriados (etiqueta vermelha)
 * seguem como âncoras. Fim de semana ganha um leve tom; hoje é destacado em
 * violeta. Clicar num dia abre a vista Dia.
 */
const MAX_CHIPS = 3
const DROP_HORA_PADRAO = 8 // hora default ao soltar num dia do mês (sem grade horária)

export default function MonthView() {
  const store = useStore()
  const { theme } = useTheme()
  const [dropISO, setDropISO] = useState(null)
  const cursor = fromDateISO(store.cursorISO)
  const today = store.now
  const weeks = monthGrid(cursor)
  const flat = weeks.flat()
  // Expande ocorrências em toda a janela do mês de uma vez.
  const instances = store.instancesInRange(flat[0], flat[flat.length - 1])

  // Agrupa instâncias por dia (ISO) e ordena por horário — feito uma vez.
  const porDia = new Map()
  for (const inst of instances) {
    const key = toDateISO(inst.inicio)
    if (!porDia.has(key)) porDia.set(key, [])
    porDia.get(key).push(inst)
  }
  for (const lista of porDia.values()) {
    lista.sort((a, b) => new Date(a.inicio) - new Date(b.inicio))
  }

  function deadlines(day) {
    return store.tarefas.filter((t) => t.deadline && sameDay(t.deadline, day))
  }

  function openDay(day) {
    store.setCursor(toDateISO(day))
    store.setView('dia')
  }

  function onDropDia(e, day) {
    e.preventDefault()
    setDropISO(null)
    // Mover evento agendado preservando a hora original; senão, agendar tarefa.
    const eventoRaw = e.dataTransfer.getData(EVENTO_DND_MIME)
    if (eventoRaw) {
      try {
        const payload = JSON.parse(eventoRaw)
        const orig = payload.inicioISO ? new Date(payload.inicioISO) : null
        const inicio = dateAtHour(
          day,
          orig ? orig.getHours() + orig.getMinutes() / 60 : DROP_HORA_PADRAO,
        )
        moverEventoDrop(store, payload, inicio)
      } catch {
        /* payload inválido — ignora */
      }
      return
    }
    const tarefaId = e.dataTransfer.getData('text/plain')
    if (tarefaId) scheduleTarefaDrop(store, tarefaId, dateAtHour(day, DROP_HORA_PADRAO))
  }

  return (
    <div className="month">
      <div className="month__dow">
        {WEEKDAYS_SHORT.map((d) => (
          <span key={d} className="month__dowcell">
            {d}
          </span>
        ))}
      </div>
      <div className="month__grid">
        {flat.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth()
          const isToday = sameDay(day, today)
          const dow = day.getDay()
          const isWeekend = dow === 0 || dow === 6
          const eventos = porDia.get(toDateISO(day)) ?? []
          const visiveis = eventos.slice(0, MAX_CHIPS)
          const resto = eventos.length - visiveis.length
          const dls = deadlines(day)
          const feriado = store.feriadoByDate(toDateISO(day))
          const iso = toDateISO(day)
          const cls = [
            'month__cell',
            !inMonth && 'month__cell--out',
            isWeekend && 'month__cell--wknd',
            isToday && 'month__cell--today',
            dropISO === iso && 'month__cell--drop',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={iso}
              type="button"
              className={cls}
              onClick={() => openDay(day)}
              onDragOver={(e) => {
                e.preventDefault()
                if (dropISO !== iso) setDropISO(iso)
              }}
              onDragLeave={() => setDropISO((cur) => (cur === iso ? null : cur))}
              onDrop={(e) => onDropDia(e, day)}
            >
              <span className="month__cellhead">
                <span className={`month__num mono ${isToday ? 'month__num--today' : ''}`}>
                  {day.getDate()}
                </span>
                {eventos.length > 0 && (
                  <span className="month__load mono" aria-hidden="true">
                    {eventos.length}
                  </span>
                )}
              </span>

              <span className="month__events">
                {feriado && (
                  <span className="chip chip--feriado mono" title={feriado.nome}>
                    {feriado.nome}
                  </span>
                )}
                {dls.map((t) => (
                  <span
                    key={t.id}
                    className="chip chip--deadline mono"
                    title={`deadline · ${t.titulo}`}
                  >
                    ◆ {t.titulo}
                  </span>
                ))}
                {visiveis.map((inst) => {
                  const cor = corParaTema(store.classeById(inst.classe)?.cor, theme)
                  return (
                    <span
                      key={inst.id}
                      className="month__ev"
                      style={
                        cor
                          ? { background: cor.bg, color: cor.tx, borderColor: cor.st }
                          : undefined
                      }
                      title={`${formatTime(inst.inicio)} · ${inst.titulo}`}
                    >
                      <span className="month__ev-time mono">{formatTime(inst.inicio)}</span>
                      <span className="month__ev-tit">{inst.titulo}</span>
                    </span>
                  )
                })}
                {resto > 0 && <span className="month__more">+{resto} mais</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
