import { useStore } from '../store/store.jsx'
import SidePanel from '../components/SidePanel.jsx'
import { formatTime, sameDay, WEEKDAYS_SHORT, MONTHS_SHORT } from '../lib/dates.js'

/**
 * Painel de Pendentes (handoff §4) — lista de itens que passaram do horário sem
 * ação, com data/hora em âmbar. Concluir encerra; Remarcar devolve ao Inbox.
 * Vazio mostra o estado "tudo resolvido".
 */
export default function PendingPanel() {
  const store = useStore()
  // Pendência DERIVADA (status_efetivo) — inclui eventos que venceram sozinhos
  // e ocorrências recorrentes pendentes na janela recente.
  const pendentes = store.pendingInstances()

  return (
    <SidePanel title="Pendentes" accent="var(--pend)" onClose={store.closePanel}>
      {pendentes.length === 0 ? (
        <p className="pending__empty">✓ Tudo resolvido — nada pendente.</p>
      ) : (
        <ul className="pending">
          {pendentes.map((inst) => {
            const classe = store.classeById(inst.classe)
            return (
              <li key={inst.id} className="pending__item">
                <span className="pending__acc" style={{ background: classe?.cor?.st }} />
                <div className="pending__body">
                  <div className="pending__title">{inst.titulo}</div>
                  <div className="pending__when mono">{formatWhen(inst.inicio, inst.fim, store.now)}</div>
                </div>
                <div className="pending__actions">
                  <button className="btn btn--done btn--sm" type="button" title="Concluir" onClick={() => store.concluir(inst)}>
                    ✓
                  </button>
                  <button className="btn btn--ghost btn--sm" type="button" title="Remarcar (volta ao Inbox)" onClick={() => store.remarcar(inst)}>
                    ↻
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </SidePanel>
  )
}

function formatWhen(inicio, fim, now) {
  const d = new Date(inicio)
  const hoje = sameDay(d, now)
  const data = hoje ? 'hoje' : `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
  return `${data} · ${formatTime(inicio)}–${formatTime(fim)}`
}
