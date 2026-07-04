import { useEffect, useState } from 'react'
import { useStore } from '../store/store.jsx'

/**
 * Dialog de concluir sessão de plano (Rotina Inteligente, W5 / backend C3).
 * Captura opcionalmente o tempo REAL ("Quanto levou?"), pré-preenchido com o
 * planejado, para alimentar os fatores adaptativos. NUNCA bloqueia a conclusão:
 * "pular" conclui sem `real_min`; Enter/Concluir envia o valor se houver.
 *
 * @param {{ instance: any }} props
 */
export default function ConcluirDialog({ instance }) {
  const store = useStore()
  const planejadoMin = Math.max(
    1,
    Math.round((new Date(instance.fim) - new Date(instance.inicio)) / 60000),
  )
  const [valor, setValor] = useState(String(planejadoMin))

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') store.closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store])

  function concluir(comReal) {
    const n = parseInt(valor, 10)
    const realMin = comReal && Number.isInteger(n) && n >= 1 ? n : undefined
    store.concluir(instance, realMin)
    store.closePanel()
  }

  return (
    <>
      <div className="scrim" onClick={() => store.closePanel()} />
      <div className="concluir" role="dialog" aria-modal="true" aria-label="Concluir sessão">
        <div className="concluir__titulo">Concluir “{instance.titulo}”</div>
        <label className="concluir__label">
          Quanto levou?
          <span className="concluir__campo">
            <input
              className="concluir__input mono"
              type="number"
              min="1"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && concluir(true)}
              autoFocus
              aria-label="Minutos que levou"
            />
            <span className="concluir__unid mono">min</span>
          </span>
        </label>
        <div className="concluir__hint mono">planejado: {planejadoMin} min</div>
        <div className="concluir__acoes">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => concluir(false)}>
            pular
          </button>
          <button type="button" className="btn btn--done btn--sm" onClick={() => concluir(true)}>
            ✓ Concluir
          </button>
        </div>
      </div>
    </>
  )
}
