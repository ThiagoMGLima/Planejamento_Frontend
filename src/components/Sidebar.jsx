import { useStore } from '../store/store.jsx'
import MiniCalendar from './MiniCalendar.jsx'
import InboxCard from './InboxCard.jsx'

/**
 * Sidebar (232px) — mini-calendário (oculto na view Mês, decisão do handoff §4)
 * + Inbox de tarefas (cards a partir do store). O arrasto card → horário chega
 * no Marco 3; aqui clicar num card abre o painel do evento futuro (placeholder
 * via seleção) — por ora os cards só listam.
 */
export default function Sidebar() {
  const store = useStore()
  const inbox = store.tarefas.filter((t) => t.status === 'INBOX')
  const showMini = store.view !== 'mes'

  return (
    <aside className="sidebar">
      {showMini && (
        <section className="sidebar__block">
          <MiniCalendar />
        </section>
      )}

      <section className="sidebar__block sidebar__block--grow">
        <h2 className="sidebar__title">Inbox</h2>
        {inbox.length === 0 ? (
          <p className="sidebar__empty">Tudo agendado — Inbox vazio.</p>
        ) : (
          <div className="inbox">
            {inbox.map((t) => (
              <InboxCard key={t.id} tarefa={t} classe={store.classeById(t.classe)} />
            ))}
          </div>
        )}
      </section>
    </aside>
  )
}
