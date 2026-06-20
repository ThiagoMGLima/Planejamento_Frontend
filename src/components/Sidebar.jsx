import { CLASSES_PADRAO } from '../store/seed.js'

/**
 * Sidebar (232px) — mini-calendário + Inbox em placeholder (Marco 1). O
 * mini-calendário funcional e os InboxCards draggable chegam nos Marcos 2–3.
 * Mostramos as 5 classes padrão seedadas como legenda, provando que o estado
 * inicial existe e que cada cor vem da classe.
 */
export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Mini-calendário — placeholder de grade (handoff §3) */}
      <section className="sidebar__block">
        <h2 className="sidebar__title mono">jun 2026</h2>
        <div className="minical" aria-hidden="true">
          {Array.from({ length: 35 }, (_, i) => (
            <span key={i} className="minical__cell mono">
              {i < 30 ? i + 1 : ''}
            </span>
          ))}
        </div>
      </section>

      {/* Inbox — placeholder; cards draggable chegam no Marco 3 */}
      <section className="sidebar__block sidebar__block--grow">
        <h2 className="sidebar__title">Inbox</h2>
        <p className="sidebar__empty">
          Sem tarefas ainda. No Marco 2, tarefas aparecem aqui como cards
          arrastáveis para o calendário.
        </p>
      </section>

      {/* Legenda das classes padrão — confirma o estado inicial seedado (§2.2) */}
      <section className="sidebar__block">
        <h2 className="sidebar__title">Classes</h2>
        <ul className="legend">
          {CLASSES_PADRAO.map((c) => (
            <li key={c.id} className="legend__item">
              <span
                className="legend__swatch"
                style={{ background: c.cor.bg, borderColor: c.cor.st }}
              />
              <span className="legend__name" style={{ color: c.cor.tx }}>
                {c.nome}
              </span>
              {c.rastreia_conclusao && (
                <span className="legend__track mono" title="rastreia conclusão">
                  ✓
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
