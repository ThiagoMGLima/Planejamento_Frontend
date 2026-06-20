import { rulerHours, formatHour, WEEKDAYS_SHORT } from '../lib/dates.js'

/**
 * Área de calendário — shell estático (Marco 1). Renderiza a estrutura da grade
 * Semana usando as medidas dos tokens (cabeçalho 46px, régua 50px, 1h = 38px,
 * faixa 06:00–23:30), sem nenhum evento. As views funcionais (Dia/Semana/Mês)
 * e os EventBlocks chegam no Marco 2.
 */
export default function CalendarShell() {
  const hours = rulerHours()
  // Rótulos de coluna fixos só para demonstrar a grade; o store data-driven vem depois.
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  return (
    <div className="calendar">
      {/* Cabeçalho de dias (46px) */}
      <div className="calendar__head">
        <div className="calendar__corner" />
        {days.map((d, i) => (
          <div key={i} className="calendar__dayhead">
            <span className="calendar__dayname">{d}</span>
            <span className="calendar__daynum mono">{15 + i}</span>
          </div>
        ))}
      </div>

      {/* Corpo: régua (50px) + 7 colunas com linhas horárias */}
      <div className="calendar__body">
        <div className="calendar__ruler">
          {hours.map((h) => (
            <div key={h} className="calendar__hourlabel mono">
              {formatHour(h)}
            </div>
          ))}
        </div>

        <div className="calendar__grid">
          {days.map((_, col) => (
            <div key={col} className="calendar__col">
              {hours.map((h) => (
                <div key={h} className="calendar__slot" />
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="calendar__hint mono" aria-hidden="true">
        {WEEKDAYS_SHORT.length === 7 ? 'grade 06:00–23:30 · 1h = 38px' : ''}
      </p>
    </div>
  )
}
