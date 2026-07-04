import { useState } from 'react'
import { useStore } from '../store/store.jsx'
import { usePlanejamento } from '../store/planejamento.jsx'
import MiniCalendar from './MiniCalendar.jsx'
import InboxCard from './InboxCard.jsx'
import NovaTarefaForm from './NovaTarefaForm.jsx'

/**
 * Sidebar (232px) — mini-calendário (oculto na view Mês, handoff §4) + Inbox de
 * tarefas. Em modo normal os cards arrastam para o horário; em **modo Planejar**
 * (Rotina Inteligente, W1) o Inbox vira seletor: chip "selecionar p/ plano" no
 * título e cada card com checkbox (elegível) ou motivo de inelegibilidade.
 */
export default function Sidebar() {
  const store = useStore()
  const plan = usePlanejamento()
  const [criando, setCriando] = useState(false)
  const showMini = store.view !== 'mes'
  const selecao = plan.modoPlanejar

  return (
    <aside className="sidebar">
      {showMini && (
        <section className="sidebar__block">
          <MiniCalendar />
        </section>
      )}

      <section className="sidebar__block sidebar__block--grow">
        <h2 className="sidebar__title">
          Inbox
          {selecao && (
            <>
              <span className="sidebar__chip mono">selecionar p/ plano</span>
              {plan.elegiveisCount > 0 && (
                <button
                  type="button"
                  className="sidebar__selall"
                  onClick={plan.todasSelecionadas ? plan.limparSelecao : plan.selecionarTodas}
                >
                  {plan.todasSelecionadas ? 'Limpar' : `Todas (${plan.elegiveisCount})`}
                </button>
              )}
            </>
          )}
          {!selecao && (
            <button
              type="button"
              className="sidebar__add"
              onClick={() => setCriando((v) => !v)}
              aria-label="Nova tarefa"
              aria-expanded={criando}
            >
              {criando ? '✕' : '+ Nova'}
            </button>
          )}
        </h2>
        {!selecao && criando && <NovaTarefaForm onClose={() => setCriando(false)} />}
        {plan.inbox.length === 0 ? (
          <p className="sidebar__empty">Tudo agendado — Inbox vazio.</p>
        ) : (
          <div className="inbox">
            {plan.inbox.map(({ tarefa, elegivel, motivo }) => (
              <InboxCard
                key={tarefa.id}
                tarefa={tarefa}
                classe={store.classeById(tarefa.classe)}
                modo={selecao ? 'selecao' : 'normal'}
                elegivel={elegivel}
                motivo={motivo}
                selecionada={plan.estaSelecionada(tarefa.id)}
                onToggle={plan.toggleTarefa}
              />
            ))}
          </div>
        )}
      </section>
    </aside>
  )
}
