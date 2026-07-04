import { usePlanejamento } from '../store/planejamento.jsx'

/**
 * Overlay de geração (Rotina Inteligente, W2) — "espera honesta" enquanto o
 * solver + IA montam os cenários. Cobre a área abaixo da topbar com um véu
 * desfocado e um card central: barra de progresso, estimativa em mono (`≈Ns`,
 * vinda do `tempo_estimado_s` da resposta 202) e link "cancelar".
 *
 * Ao terminar (`status:'pronto'`) o overlay some e a comparação de cenários (W3,
 * `ComparadorCenarios`) assume a área do calendário. Em `status:'erro'` mostra a
 * mensagem e permite fechar.
 */
export default function GeracaoOverlay() {
  const plan = usePlanejamento()
  const g = plan.geracao

  // 'pronto' é tratado pelo W3 (ComparadorCenarios), não por overlay.
  if (!g || g.status === 'idle' || g.status === 'pronto') return null

  return (
    <div className="geracao" role="dialog" aria-modal="true">
      {g.status === 'processando' && <Processando plan={plan} g={g} />}
      {g.status === 'erro' && <Erro plan={plan} g={g} />}
    </div>
  )
}

function Processando({ plan, g }) {
  const restante = g.restanteS ?? 0
  const nSel = plan.selCount
  const tarefas = `${nSel} ${nSel === 1 ? 'tarefa' : 'tarefas'}`
  // Estimativa estourada ≠ travado: a IA local ainda está gerando. Não mostrar
  // "≈0s" congelado — dizer o que está acontecendo.
  const meta =
    restante > 0
      ? `≈${restante}s · analisando ${tarefas}`
      : `passou da estimativa — a IA local ainda está trabalhando (${tarefas})`
  const sub = g.iaIndisponivel
    ? 'IA offline — montando a partir dos arquétipos padrão do solver.'
    : 'A IA propõe alternativas; o solver garante que tudo cabe antes dos prazos.'

  return (
    <div className="geracao__card">
      <div className="geracao__titulo">Montando seus cenários…</div>
      <div className="geracao__trilho">
        <div className="geracao__preenche" style={{ width: `${g.progresso ?? 0}%` }} />
      </div>
      <div className="geracao__meta mono">{meta}</div>
      <div className="geracao__sub">{sub}</div>
      <button type="button" className="geracao__link" onClick={plan.cancelarGeracao}>
        cancelar
      </button>
    </div>
  )
}

function Erro({ plan, g }) {
  return (
    <div className="geracao__card">
      <div className="geracao__titulo">Não deu para gerar os cenários</div>
      <div className="geracao__sub">{g.erro?.message ?? 'Tente novamente em instantes.'}</div>
      <button type="button" className="btn btn--ghost" onClick={plan.cancelarGeracao}>
        Fechar
      </button>
    </div>
  )
}
