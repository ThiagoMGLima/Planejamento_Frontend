import { useStore } from './store/store.jsx'
import { usePlanejamento } from './store/planejamento.jsx'
import Topbar from './components/Topbar.jsx'
import Sidebar from './components/Sidebar.jsx'
import WeekView from './views/WeekView.jsx'
import DayView from './views/DayView.jsx'
import MonthView from './views/MonthView.jsx'
import EventPanel from './panels/EventPanel.jsx'
import PendingPanel from './panels/PendingPanel.jsx'
import ConcluirDialog from './components/ConcluirDialog.jsx'
import AgentePanel from './components/AgentePanel.jsx'
import PlanoResumoBar from './components/PlanoResumoBar.jsx'
import GeracaoOverlay from './components/GeracaoOverlay.jsx'
import ComparadorCenarios from './components/ComparadorCenarios.jsx'
import ReplanejarPanel from './components/ReplanejarPanel.jsx'
import BootScreen from './components/BootScreen.jsx'
import EdgeNav from './components/EdgeNav.jsx'
import { useEditar } from './store/editar.jsx'
import './styles/shell.css'

/**
 * Composição do app (Marco 2): topbar + sidebar + a view ativa, com o painel
 * lateral (evento / pendentes) renderizado por cima quando aberto. Tudo lê do
 * store; nenhuma cor vem de fora da classe/UI tokens.
 */
export default function App() {
  const store = useStore()
  const plan = usePlanejamento()
  const { editando } = useEditar()

  return (
    <div className={`app ${editando ? 'app--editando' : ''}`}>
      <Topbar />
      <div className="app__body">
        <Sidebar />
        <main className="app__main">
          {store.view === 'dia' && <DayView />}
          {store.view === 'semana' && <WeekView />}
          {store.view === 'mes' && <MonthView />}
          {plan.modoPlanejar && plan.geracao.status !== 'pronto' && <PlanoResumoBar />}
          {plan.geracao.status === 'pronto' && <ComparadorCenarios />}
        </main>

        {store.panel?.type === 'evento' && <EventPanel eventId={store.panel.eventId} />}
        {store.panel?.type === 'pendentes' && <PendingPanel />}
        {store.panel?.type === 'concluir' && <ConcluirDialog instance={store.panel.instance} />}
        {store.panel?.type === 'agente' && <AgentePanel />}

        <ReplanejarPanel />
        <GeracaoOverlay />
        <EdgeNav />
        {editando && (
          <div className="editbar" role="status">
            <span className="editbar__dot" aria-hidden="true" />
            Modo edição — arraste tarefas e eventos; segure numa borda para mudar de período
          </div>
        )}
      </div>
      <BootScreen />
    </div>
  )
}
