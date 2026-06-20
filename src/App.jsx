import Topbar from './components/Topbar.jsx'
import Sidebar from './components/Sidebar.jsx'
import CalendarShell from './views/CalendarShell.jsx'
import SidePanelSlot from './panels/SidePanelSlot.jsx'
import './styles/shell.css'

/**
 * Shell de layout do Marco 1 (sem lógica): topbar 52px, sidebar 232px,
 * área de calendário e slot do painel lateral 380px. O store, os componentes
 * data-driven e as interações chegam nos Marcos 2–3.
 */
export default function App() {
  return (
    <div className="app">
      <Topbar />
      <div className="app__body">
        <Sidebar />
        <main className="app__main">
          <CalendarShell />
        </main>
        <SidePanelSlot open={false} />
      </div>
    </div>
  )
}
