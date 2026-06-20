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
  const pendentes = store.eventos.filter(
    (e) => e.rastrear_conclusao && e.status === 'PENDENTE',
  )

  return (
    <SidePanel title="Pendentes" accent="var(--pend)" onClose={store.closePanel}>
      {pendentes.length === 0 ? (
        <p className="pending__empty">✓ Tudo resolvido — nada pendente.</p>
      ) : (
        <ul className="pending">
          {pendentes.map((e) => {
            const classe = store.classeById(e.classe)
            return (
              <li key={e.id} className="pending__item">
                <span className="pending__acc" style={{ background: classe?.cor?.st }} />
                <div className="pending__body">
                  <div className="pending__title">{e.titulo}</div>
                  <div className="pending__when mono">{formatWhen(e.inicio, e.fim)}</div>
                </div>
                <div className="pending__actions">
                  <button className="btn btn--done btn--sm" type="button" onClick={() => store.concluir(e.id)}>
                    ✓
                  </button>
                  <button className="btn btn--ghost btn--sm" type="button" onClick={() => store.remarcar(e.id)}>
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

function formatWhen(inicio, fim) {
  const d = new Date(inicio)
  const hoje = sameDay(d, new Date())
  const data = hoje ? 'hoje' : `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
  return `${data} · ${formatTime(inicio)}–${formatTime(fim)}`
}
