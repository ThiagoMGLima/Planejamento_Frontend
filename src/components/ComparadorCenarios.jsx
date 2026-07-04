import { usePlanejamento } from '../store/planejamento.jsx'
import ChatCenarios from './ChatCenarios.jsx'
import {
  METRICAS_CARD,
  densidadePorDia,
  formatDelta,
  formatMetrica,
  sentidoDelta,
} from '../lib/metricasPlano.js'

/**
 * Comparação de cenários (Rotina Inteligente, W3) — o coração da feature. Cards
 * lado a lado (máx. 4), um por cenário: nome + intenção, mini-mapa de densidade
 * da semana, 3–4 métricas em mono com delta vs. base (verde=melhora, âmbar=custo)
 * e trade-offs. O de maior score traz o badge violeta "Sugerido" e vem
 * pré-selecionado; a "Base" nunca mostra delta. Selecionar um card (sem aplicar)
 * mostra o preview "ghost" das sessões no calendário; "Aplicar este" confirma.
 *
 * Renderiza ancorado no rodapé da área do calendário, que segue visível atrás
 * para o preview.
 */
// Iniciais seg→dom (o mini-mapa é seg-based, como `densidadePorDia`).
const DIAS_MIN = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

export default function ComparadorCenarios() {
  const plan = usePlanejamento()
  const { cenarios, cenarioSelecionadoId, geracao } = plan

  if (geracao.status !== 'pronto' || cenarios.length === 0) return null

  // Escala compartilhada do mini-mapa: maior carga diária entre todos os cenários.
  const picoDensidade = Math.max(
    1,
    ...cenarios.flatMap((c) => densidadePorDia(c.plano?.sessoes ?? [])),
  )

  return (
    <section className="comparador" aria-label="Comparação de cenários">
      <header className="comparador__head">
        <span className="comparador__count mono">
          {cenarios.length} cenários · escolha um para aplicar
        </span>
        {plan.geracao.iaIndisponivel && (
          <span className="comparador__aviso">cenários padrão — IA offline</span>
        )}
        <span className="comparador__spacer" />
        {!plan.chat.aberto && (
          <button type="button" className="comparador__chat" onClick={() => plan.abrirChat(null)}>
            <span aria-hidden="true">💬</span> Conversar sobre os cenários
          </button>
        )}
        <button type="button" className="comparador__voltar" onClick={plan.cancelarGeracao}>
          ← voltar à seleção
        </button>
      </header>

      <div className="comparador__corpo">
        <div className="comparador__cards">
          {cenarios.map((c) => (
            <CenarioCard
              key={c.id}
              cenario={c}
              base={c.id === 'base'}
              selecionado={c.id === cenarioSelecionadoId}
              picoDensidade={picoDensidade}
              aplicando={plan.aplicando}
              onSelecionar={() => plan.selecionarCenario(c.id)}
              onAplicar={() => plan.aplicarCenario(c.id)}
              onAjustar={() => plan.abrirChat(c.id)}
            />
          ))}
        </div>
        <ChatCenarios />
      </div>
    </section>
  )
}

function CenarioCard({
  cenario,
  base,
  selecionado,
  picoDensidade,
  aplicando,
  onSelecionar,
  onAplicar,
  onAjustar,
}) {
  const densidade = densidadePorDia(cenario.plano?.sessoes ?? [])
  const naoAlocado = cenario.metricas?.nao_alocado_min ?? 0

  const classe = [
    'cenariocard',
    selecionado && 'cenariocard--on',
    cenario.sugerido && 'cenariocard--sugerido',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classe}
      role="button"
      tabIndex={0}
      aria-pressed={selecionado}
      onClick={onSelecionar}
    >
      <div className="cenariocard__top">
        <span className="cenariocard__nome">{cenario.nome}</span>
        {cenario.sugerido && <span className="cenariocard__badge">Sugerido</span>}
      </div>
      <p className="cenariocard__intencao">{cenario.intencao}</p>

      {/* Mini-mapa de densidade — só carga por dia, sem horários (HANDOFF §3). */}
      <div className="minimapa" aria-hidden="true">
        {densidade.map((min, i) => (
          <div key={i} className="minimapa__col">
            <div className="minimapa__trilho">
              <div
                className="minimapa__barra"
                style={{ height: `${Math.round((min / picoDensidade) * 100)}%` }}
              />
            </div>
            <span className="minimapa__dia">{DIAS_MIN[i]}</span>
          </div>
        ))}
      </div>

      <dl className="cenariocard__metricas mono">
        {METRICAS_CARD.map((m) => {
          const valor = cenario.metricas?.[m.chave]
          const delta = base ? null : cenario.metricas_vs_base?.[m.chave]
          const sentido = sentidoDelta(delta ?? 0, m.maiorMelhor)
          return (
            <div key={m.chave} className="metrica">
              <dt className="metrica__rotulo">{m.rotulo}</dt>
              <dd className="metrica__valor">
                {formatMetrica(valor, m.tipo)}
                {!base && delta ? (
                  <span className={`metrica__delta metrica__delta--${sentido}`}>
                    {formatDelta(delta, m.tipo)}
                  </span>
                ) : null}
              </dd>
            </div>
          )
        })}
      </dl>

      {naoAlocado > 0 && (
        <div className="cenariocard__alerta">⚠ não coube: {naoAlocado} min antes do prazo</div>
      )}

      {cenario.trade_offs?.length > 0 && (
        <ul className="cenariocard__trades">
          {cenario.trade_offs.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}

      <div className="cenariocard__acoes">
        {!base && (
          <button
            type="button"
            className="btn btn--ui cenariocard__aplicar"
            disabled={aplicando}
            onClick={(e) => {
              e.stopPropagation()
              onAplicar()
            }}
          >
            {aplicando ? 'Aplicando…' : 'Aplicar este'}
          </button>
        )}
        <button
          type="button"
          className="cenariocard__ajustar"
          title="Pedir mudanças neste cenário em linguagem natural"
          onClick={(e) => {
            e.stopPropagation()
            onAjustar()
          }}
        >
          <span aria-hidden="true">💬</span> Ajustar com IA
        </button>
      </div>
    </div>
  )
}
