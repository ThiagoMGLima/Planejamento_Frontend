import { useStore } from '../store/store.jsx'
import { rangeLabel } from '../lib/dates.js'
import { statusEfetivo } from '../lib/status.js'

/**
 * Topbar (52px) — store-driven (handoff §3). Segmented Dia/Semana/Mês, setas
 * ±1 dia/7 dias/1 mês + "Hoje", rótulo de período, pílula de Pendentes (só com
 * N>0, abre o painel) e ações. Concluir/Remarcar/Salvar agem sobre o evento
 * selecionado quando há um.
 */
const VIEWS = [
  { id: 'dia', label: 'Dia' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
]

export default function Topbar() {
  const store = useStore()
  const cursor = new Date(store.cursorISO)

  // Pendência derivada (status_efetivo) sobre instâncias da janela recente.
  const pendentes = store.pendingInstances().length

  const sel = store.selectedInstance
  const selStatus = sel ? statusEfetivo(sel, store.now) : undefined
  const selRastreavel = sel?.rastrear_conclusao && selStatus !== 'CONCLUIDO' && selStatus !== 'REMARCADO'

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__mark" aria-hidden="true" />
        <b>Planejador</b>
      </div>

      <div className="topbar__nav">
        <button className="iconbtn" type="button" aria-label="Anterior" onClick={() => store.step(-1)}>
          ◀
        </button>
        <button className="btn btn--ghost" type="button" onClick={store.goToday}>
          Hoje
        </button>
        <button className="iconbtn" type="button" aria-label="Próximo" onClick={() => store.step(1)}>
          ▶
        </button>
        <span className="topbar__range mono">{rangeLabel(cursor, store.view)}</span>

        <span className="seg" role="tablist" aria-label="Visualização">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={store.view === v.id}
              className={store.view === v.id ? 'seg__on' : ''}
              onClick={() => store.setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </span>
      </div>

      <div className="topbar__actions">
        {pendentes > 0 && (
          <button className="pill" type="button" onClick={store.openPendingPanel}>
            ⚠ Pendentes · {pendentes}
          </button>
        )}
        <button
          className="btn btn--done"
          type="button"
          disabled={!selRastreavel}
          onClick={() => sel && store.concluir(sel)}
        >
          ✓ Concluir
        </button>
        <button
          className="btn btn--ghost"
          type="button"
          disabled={!sel}
          onClick={() => sel && store.remarcar(sel)}
        >
          ↻ Remarcar
        </button>
        <button
          className="btn btn--ui"
          type="button"
          disabled={!sel}
          onClick={() => sel && store.openEventPanel(sel.eventoId, sel)}
        >
          Salvar
        </button>
      </div>
    </header>
  )
}
