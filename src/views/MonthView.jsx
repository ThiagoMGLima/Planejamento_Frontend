import { useStore } from '../store/store.jsx'
import { monthGrid, sameDay, toDateISO, WEEKDAYS_SHORT } from '../lib/dates.js'

/**
 * Mês (handoff §4) — panorama com densidade por TOM NEUTRO (quanto mais cheio o
 * dia, mais forte o cinza; sinal neutro, nunca cor de classe) e chips só para
 * ÂNCORAS: deadlines (âmbar ◆). Feriados (etiqueta vermelha) chegam no Marco 3.
 * Rotina não é listada. Clicar num dia abre a view Dia naquele dia.
 */
export default function MonthView() {
  const store = useStore()
  const cursor = new Date(store.cursorISO)
  const today = new Date()
  const weeks = monthGrid(cursor)

  function densityLevel(day) {
    const n = store.eventos.filter((e) => sameDay(e.inicio, day)).length
    if (n === 0) return 0
    if (n <= 1) return 1
    if (n <= 3) return 2
    return 3
  }

  function deadlines(day) {
    return store.tarefas.filter((t) => t.deadline && sameDay(t.deadline, day))
  }

  function openDay(day) {
    store.setCursor(toDateISO(day))
    store.setView('dia')
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
        {weeks.flat().map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth()
          const isToday = sameDay(day, today)
          const lvl = densityLevel(day)
          const dls = deadlines(day)
          const cls = [
            'month__cell',
            `month__cell--d${lvl}`,
            !inMonth && 'month__cell--out',
            isToday && 'month__cell--today',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button key={toDateISO(day)} type="button" className={cls} onClick={() => openDay(day)}>
              <span className={`month__num mono ${isToday ? 'month__num--today' : ''}`}>
                {day.getDate()}
              </span>
              <span className="month__chips">
                {dls.map((t) => (
                  <span key={t.id} className="chip chip--deadline mono" title={`deadline · ${t.titulo}`}>
                    ◆ {t.titulo}
                  </span>
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
