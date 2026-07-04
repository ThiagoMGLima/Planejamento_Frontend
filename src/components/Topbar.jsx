import { useStore } from '../store/store.jsx'
import { usePlanejamento } from '../store/planejamento.jsx'
import { rangeLabel, fromDateISO } from '../lib/dates.js'
import { useTheme } from '../lib/theme.jsx'
import { useEditar } from '../store/editar.jsx'
import {
  IconAlert,
  IconChevronLeft,
  IconChevronRight,
  IconLogo,
  IconMoon,
  IconPencil,
  IconRotate,
  IconSparkles,
  IconSun,
  IconX,
} from './Icons.jsx'

/**
 * Topbar (52px) — store-driven (handoff §3). Segmented Dia/Semana/Mês, setas
 * ±1 dia/7 dias/1 mês + "Hoje", rótulo de período, pílula de Pendentes (só com
 * N>0, abre o painel) e ações GLOBAIS. As ações por evento (Concluir/Remarcar/
 * Salvar/Excluir) vivem no painel que abre ao clicar no evento — não aqui.
 */
const VIEWS = [
  { id: 'dia', label: 'Dia' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
]

export default function Topbar() {
  const store = useStore()
  const plan = usePlanejamento()
  const { theme, toggleTheme } = useTheme()
  const { editando, toggleEditar, setEditando } = useEditar()
  const cursor = fromDateISO(store.cursorISO)

  // Editar e Planejar são modos mutuamente exclusivos: ligar um desliga o outro.
  const onEditar = () => {
    if (plan.modoPlanejar) plan.togglePlanejar()
    toggleEditar()
  }
  const onPlanejar = () => {
    if (editando) setEditando(false)
    plan.togglePlanejar()
  }

  // Pendência derivada (status_efetivo) sobre instâncias da janela recente.
  const pendentes = store.pendingInstances().length

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__logo" aria-hidden="true">
          <IconLogo size={17} />
        </span>
        <span className="topbar__wordmark">
          Planejador<span className="topbar__wordmark-dot">.</span>
        </span>
      </div>

      <div className="topbar__nav">
        <button
          className="iconbtn"
          type="button"
          aria-label="Anterior"
          onClick={() => store.step(-1)}
        >
          <IconChevronLeft />
        </button>
        <button className="btn btn--ghost" type="button" onClick={store.goToday}>
          Hoje
        </button>
        <button
          className="iconbtn"
          type="button"
          aria-label="Próximo"
          onClick={() => store.step(1)}
        >
          <IconChevronRight />
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
        <button
          className="iconbtn"
          type="button"
          onClick={toggleTheme}
          aria-pressed={theme === 'dark'}
          title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
        {pendentes > 0 && (
          <button className="pill" type="button" onClick={store.openPendingPanel}>
            <IconAlert size={12} /> Pendentes · {pendentes}
          </button>
        )}
        <button
          className="btn btn--ghost"
          type="button"
          title="Assistente (preview)"
          onClick={store.openAgente}
        >
          <IconSparkles size={13} /> Assistente
        </button>
        <button
          className="btn btn--ghost"
          type="button"
          disabled={plan.modoPlanejar}
          onClick={() => plan.replanejar([])}
        >
          <IconRotate size={13} /> Replanejar
        </button>
        <button
          className={editando ? 'btn btn--ui btn--planejar-on' : 'btn btn--ghost'}
          type="button"
          aria-pressed={editando}
          title="Arrastar tarefas e eventos; segure numa borda para mudar de período"
          onClick={onEditar}
        >
          {editando ? (
            <>
              Editando <IconX size={13} />
            </>
          ) : (
            <>
              <IconPencil size={13} /> Editar
            </>
          )}
        </button>
        <button
          className={plan.modoPlanejar ? 'btn btn--ui btn--planejar-on' : 'btn btn--ui'}
          type="button"
          aria-pressed={plan.modoPlanejar}
          onClick={onPlanejar}
        >
          {plan.modoPlanejar ? (
            <>
              Planejando <IconX size={13} />
            </>
          ) : (
            <>
              Planejar <IconChevronRight size={13} />
            </>
          )}
        </button>
      </div>
    </header>
  )
}
