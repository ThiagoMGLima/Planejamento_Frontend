import { useStore } from '../store/store.jsx'
import { monthGrid, sameDay, toDateISO, WEEKDAYS_SHORT } from '../lib/dates.js'

/**
 * Mês (handoff §4) — panorama com densidade por TOM NEUTRO (quanto mais cheio o
 * dia, mais forte o cinza; sinal neutro, nunca cor de classe) e chips só para
 * ÂNCORAS: deadlines (âmbar ◆) e FERIADOS (etiqueta vermelha). Rotina (inclusive
 * recorrente) entra só na densidade, não é listada. Clicar num dia abre o Dia.
 */
export default function MonthView() {
  const store = useStore()
  const cursor = new Date(store.cursorISO)
  const today = store.now
  const weeks = monthGrid(cursor)
  const flat = weeks.flat()
  // Expande ocorrências em toda a janela do mês de uma vez (densidade).
  const instances = store.instancesInRange(flat[0], flat[flat.length - 1])

  function densityLevel(day) {
    const n = instances.filter((i) => sameDay(i.inicio, day)).length
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
        {flat.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth()
          const isToday = sameDay(day, today)
          const lvl = densityLevel(day)
          const dls = deadlines(day)
          const feriado = store.feriadoByDate(toDateISO(day))
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
                {feriado && (
                  <span className="chip chip--feriado mono" title={feriado.nome}>
                    {feriado.nome}
                  </span>
                )}
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
