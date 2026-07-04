import SidePanel from './SidePanel.jsx'
import { usePlanejamento } from '../store/planejamento.jsx'
import { diffVazio } from '../lib/planejamentoApi.js'
import { WEEKDAYS_SHORT } from '../lib/dates.js'

/**
 * Replanejar (Rotina Inteligente, W4) — mostra o diff da simulação ANTES de
 * aplicar (HANDOFF §3): sessões movidas (de → para), com o atalho "Hoje não"
 * (bloquear hoje). Diff vazio ⇒ "nada muda". Só persiste ao clicar Aplicar.
 */
export default function ReplanejarPanel() {
  const plan = usePlanejamento()
  const { replan } = plan

  if (replan.status === 'idle') return null

  const diff = replan.diff
  const vazio = diffVazio(diff)
  const hojeBloqueado = (replan.diasBloqueados ?? []).includes(plan.hojeISO)

  return (
    <SidePanel title="Replanejar" onClose={plan.fecharReplan}>
      <label className="replan__hoje">
        <input
          type="checkbox"
          checked={hojeBloqueado}
          onChange={(e) => plan.replanejar(e.target.checked ? [plan.hojeISO] : [])}
        />
        <span>🌙 Hoje não — não agendar nada para hoje</span>
      </label>

      {replan.status === 'carregando' && <p className="replan__vazio">Simulando o replano…</p>}

      {replan.status === 'erro' && (
        <p className="replan__vazio">
          {replan.erro?.message ?? 'Não deu para simular o replano.'}
        </p>
      )}

      {replan.status === 'pronto' &&
        (vazio ? (
          <p className="replan__vazio">Nada muda no plano atual.</p>
        ) : (
          <>
            <div className="replan__resumo mono">
              {diff.movidas.length} {diff.movidas.length === 1 ? 'movida' : 'movidas'} ·{' '}
              {diff.inalteradas} {diff.inalteradas === 1 ? 'inalterada' : 'inalteradas'}
            </div>
            <ul className="replan__lista">
              {diff.movidas.map((m) => (
                <li key={m.eventoId} className="replan__item">
                  <span className="replan__tit">{m.tarefa_titulo}</span>
                  <span className="replan__mov mono">
                    {fmtQuando(m.de)} <span aria-hidden="true">→</span> {fmtQuando(m.para)}
                  </span>
                  {m.motivo && <span className="replan__motivo">{m.motivo}</span>}
                </li>
              ))}
            </ul>
          </>
        ))}

      <div className="replan__acoes">
        <button type="button" className="btn btn--ghost" onClick={plan.fecharReplan}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn--ui"
          disabled={replan.status !== 'pronto' || vazio}
          onClick={plan.aplicarReplan}
        >
          Aplicar
        </button>
      </div>
    </SidePanel>
  )
}

function fmtQuando(iso) {
  const d = new Date(iso)
  const dia = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${WEEKDAYS_SHORT[d.getDay()]} ${dia} · ${hh}:${mm}`
}
