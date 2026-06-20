import { useEffect } from 'react'

/**
 * Painel lateral (handoff §3) — 380px, entra deslizando da direita sobre um
 * scrim; barra de cor (da classe) no topo; fecha em ✕, clique no scrim ou Esc.
 * É a casca reutilizada pelo Painel do Evento e pelo de Pendentes.
 *
 * @param {{ title: string, accent?: string, onClose: Function, children: any }} props
 */
export default function SidePanel({ title, accent, onClose, children }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="sidepanel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sidepanel__accent" style={{ background: accent ?? 'var(--ui)' }} />
        <header className="sidepanel__head">
          <h2 className="sidepanel__title">{title}</h2>
          <button type="button" className="sidepanel__close" aria-label="Fechar" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="sidepanel__body">{children}</div>
      </aside>
    </>
  )
}
