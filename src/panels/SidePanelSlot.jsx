/**
 * Slot do painel lateral (380px) — reservado no layout (Marco 1). O SidePanel
 * deslizante sobre scrim (evento / pendentes), com fechar em ✕/scrim/Esc,
 * chega no Marco 2. Por ora o slot fica fechado e não ocupa espaço.
 *
 * @param {{ open?: boolean }} props
 */
export default function SidePanelSlot({ open = false }) {
  if (!open) return null

  // Estrutura mínima reservada; preenchida no Marco 2.
  return (
    <>
      <div className="scrim" />
      <aside className="sidepanel" role="dialog" aria-modal="true" />
    </>
  )
}
