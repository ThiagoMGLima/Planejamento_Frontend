import { usePlanejamento } from '../store/planejamento.jsx'

/**
 * Barra de resumo do modo Planejar (Rotina Inteligente, W1) — ancorada no rodapé
 * da área do calendário. Mostra a contagem viva da seleção (mono), o seletor de
 * horizonte e o botão primário "Gerar cenários" (desabilitado com 0 tarefas).
 * Só renderiza em modo Planejar; a fiação fica no App.
 */
const HORIZONTES = [
  { value: 'AUTOMATICO', label: 'Automático' },
  { value: 'SEMANA', label: 'Semana' },
  { value: 'MES', label: 'Mês' },
  { value: 'CUSTOMIZADO', label: 'Personalizado…' },
]

export default function PlanoResumoBar() {
  const plan = usePlanejamento()
  const { selCount, selMin, gerarHabilitado, horizonte, horizonteMeses, horizonteMaxMeses } = plan

  const resumo = `${selCount} ${selCount === 1 ? 'tarefa' : 'tarefas'} · ${selMin} min`
  const custom = horizonte === 'CUSTOMIZADO'

  return (
    <div className="planobar">
      <span className="planobar__dot" aria-hidden="true" />
      <span className="planobar__count mono">{resumo}</span>
      <span className="planobar__sep" aria-hidden="true" />
      <label className="planobar__horizonte">
        horizonte
        <select
          className="planobar__select"
          value={horizonte}
          onChange={(e) => plan.setHorizonte(e.target.value)}
        >
          {HORIZONTES.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}
            </option>
          ))}
        </select>
      </label>
      {custom && (
        <label className="planobar__horizonte">
          <input
            type="number"
            className="planobar__meses"
            min={1}
            max={horizonteMaxMeses}
            value={horizonteMeses}
            onChange={(e) => plan.setHorizonteMeses(e.target.value)}
            aria-label="Duração do horizonte, em meses"
          />
          {horizonteMeses === 1 ? 'mês' : 'meses'}
          <span className="planobar__hint mono">até {horizonteMaxMeses}</span>
        </label>
      )}
      <span className="planobar__spacer" />
      <button
        type="button"
        className="btn btn--ui"
        disabled={!gerarHabilitado}
        onClick={plan.gerar}
      >
        Gerar cenários
      </button>
    </div>
  )
}
