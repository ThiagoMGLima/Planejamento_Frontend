import { useStore } from './store/store.jsx'
import Topbar from './components/Topbar.jsx'
import Sidebar from './components/Sidebar.jsx'
import WeekView from './views/WeekView.jsx'
import DayView from './views/DayView.jsx'
import MonthView from './views/MonthView.jsx'
import EventPanel from './panels/EventPanel.jsx'
import PendingPanel from './panels/PendingPanel.jsx'
import './styles/shell.css'

/**
 * Composição do app (Marco 2): topbar + sidebar + a view ativa, com o painel
 * lateral (evento / pendentes) renderizado por cima quando aberto. Tudo lê do
 * store; nenhuma cor vem de fora da classe/UI tokens.
 */
export default function App() {
  const store = useStore()

  return (
    <div className="app">
      <Topbar />
      <div className="app__body">
        <Sidebar />
        <main className="app__main">
          {store.view === 'dia' && <DayView />}
          {store.view === 'semana' && <WeekView />}
          {store.view === 'mes' && <MonthView />}
        </main>

        {store.panel?.type === 'evento' && <EventPanel eventId={store.panel.eventId} />}
        {store.panel?.type === 'pendentes' && <PendingPanel />}
      </div>
    </div>
  )
}
