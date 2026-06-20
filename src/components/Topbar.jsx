/**
 * Topbar (52px) — shell sem lógica (Marco 1). Estrutura os controles do
 * handoff §3: marca, navegação (segmented Dia/Semana/Mês + Hoje + setas),
 * pílula de Pendentes (só com N>0) e ações. A interação chega nos Marcos 2–3.
 */
export default function Topbar() {
  const view = 'semana' // estático nesta etapa; o store assume no Marco 2
  const pendentes = 0

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__mark" aria-hidden="true" />
        <b>Planejador</b>
      </div>

      <div className="topbar__nav">
        <button className="iconbtn" type="button" aria-label="Anterior" disabled>
          ◀
        </button>
        <button className="btn btn--ghost" type="button" disabled>
          Hoje
        </button>
        <button className="iconbtn" type="button" aria-label="Próximo" disabled>
          ▶
        </button>

        <span className="seg" role="tablist" aria-label="Visualização">
          <span className={view === 'dia' ? 'seg__on' : ''}>Dia</span>
          <span className={view === 'semana' ? 'seg__on' : ''}>Semana</span>
          <span className={view === 'mes' ? 'seg__on' : ''}>Mês</span>
        </span>
      </div>

      <div className="topbar__actions">
        {pendentes > 0 && (
          <span className="pill">⚠ Pendentes · {pendentes}</span>
        )}
        <button className="btn btn--done" type="button" disabled>
          ✓ Concluir
        </button>
        <button className="btn btn--ghost" type="button" disabled>
          ↻ Remarcar
        </button>
        <button className="btn btn--ui" type="button" disabled>
          Salvar
        </button>
      </div>
    </header>
  )
}
