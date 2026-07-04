import { api } from './api.js'

/**
 * Cliente HTTP real do montador de rotina (backend marcos C1b/C2). Expõe a MESMA
 * interface do mock (`planejamentoApi.js`) — `criarJobCenarios`, `consultarJob`,
 * `escolherCenario`, `simularReplanejamento`, `aplicarReplanejamento` — mapeando
 * as divergências de shape do backend para o que a UI espera:
 *
 *  - status do job em minúsculas ("processando"/"pronto") → maiúsculas;
 *  - payload pronto embrulhado em `resultado` → `cenarios` no topo;
 *  - cache-hit (200 no POST) → guardado localmente e resolvido no 1º polling;
 *  - diff do replanejar: `de`/`para` são {inicio,fim} e não trazem título;
 *    `inalteradas` vem como array (a UI usa a contagem).
 *
 * Trocar mock↔HTTP é papel de `planejamentoClient.js` (por VITE_DATA_SOURCE).
 */

// Cache-hits do POST (200 já pronto) não têm job no Celery; guardamos aqui e
// resolvemos no primeiro `consultarJob`, mantendo o mesmo fluxo de polling.
const _hits = new Map()
let _hitSeq = 0

/** POST /planejamento/cenarios. Devolve {jobId, tempoEstimadoS} (mesmo do mock). */
export async function criarJobCenarios(body) {
  const resp = await api.planejamento.cenarios(body)
  if (resp?.status === 'pronto' && resp.resultado) {
    // O backend cunha um job_id também no cache-hit (escolher/refinar precisam
    // dele); o hit-N local fica só de fallback para backends antigos.
    const jobId = resp.job_id ?? `hit-${++_hitSeq}`
    _hits.set(jobId, resp.resultado)
    return { jobId, tempoEstimadoS: 0 }
  }
  return { jobId: resp.job_id, tempoEstimadoS: resp.tempo_estimado_s ?? 0 }
}

/** GET /planejamento/cenarios/{jobId} → {status:'PROCESSANDO'} | {status:'PRONTO', cenarios,...}. */
export async function consultarJob(jobId) {
  if (_hits.has(jobId)) {
    const resultado = _hits.get(jobId)
    _hits.delete(jobId)
    return prontoDe(resultado)
  }
  const resp = await api.planejamento.cenariosStatus(jobId)
  if (resp?.status === 'erro') {
    const err = new Error(resp.detalhe || 'Falha no processamento dos cenários.')
    err.status = 500
    throw err
  }
  if (resp?.status === 'pronto') return prontoDe(resp.resultado)
  return { status: 'PROCESSANDO' }
}

/** POST /planejamento/cenarios/escolher. Backend persiste; devolve a contagem. */
export async function escolherCenario({ jobId, cenarioId, aplicar = true }) {
  const resp = await api.planejamento.cenariosEscolher({
    job_id: jobId,
    cenario_id: cenarioId,
    aplicar,
  })
  // `eventos_criados` vem como número; a UI (modo API) recarrega os eventos do
  // servidor, então devolvemos array vazio + a contagem para quem quiser.
  return {
    aplicado: !!resp?.aplicado,
    eventos_criados: [],
    eventosCriadosCount: resp?.eventos_criados ?? 0,
  }
}

/** POST /planejamento/cenarios/refinar. Devolve {refinoId, tempoEstimadoS}. */
export async function refinarCenario({ jobId, cenarioId, mensagem }) {
  const body = { job_id: jobId, mensagem }
  if (cenarioId) body.cenario_id = cenarioId
  const resp = await api.planejamento.cenariosRefinar(body)
  return { refinoId: resp.job_id, tempoEstimadoS: resp.tempo_estimado_s ?? 0 }
}

/**
 * GET /planejamento/cenarios/refinar/{refinoId} → {status:'PROCESSANDO'} |
 * {status:'PRONTO', resposta, cenario, cenarios, ia_indisponivel}. `cenarios` é
 * o lote inteiro já com o cenário novo — a UI substitui a lista de uma vez.
 */
export async function consultarRefino(refinoId) {
  const resp = await api.planejamento.cenariosRefinarStatus(refinoId)
  if (resp?.status === 'erro') {
    const err = new Error(resp.detalhe || 'Falha ao ajustar o cenário.')
    err.status = 500
    throw err
  }
  if (resp?.status === 'pronto') {
    const r = resp.resultado ?? {}
    return {
      status: 'PRONTO',
      resposta: r.resposta ?? '',
      cenario: r.cenario ?? null,
      cenarios: r.cenarios ?? null,
      ia_indisponivel: !!r.ia_indisponivel,
    }
  }
  return { status: 'PROCESSANDO' }
}

/** POST /planejamento/replanejar (simulação). Mapeia o diff para a UI. */
export async function simularReplanejamento({ diasBloqueados = [] } = {}) {
  const resp = await api.planejamento.replanejar({ dias_bloqueados: diasBloqueados })
  return { diff: mapearDiff(resp?.diff), metricas_vs_anterior: resp?.metricas_vs_anterior }
}

/** POST /planejamento/replanejar/aplicar (persiste). */
export async function aplicarReplanejamento({ diasBloqueados = [] } = {}) {
  const resp = await api.planejamento.replanejarAplicar({ dias_bloqueados: diasBloqueados })
  return {
    diff: mapearDiff(resp?.diff),
    eventosCriados: resp?.eventos_criados,
    eventosRemovidos: resp?.eventos_removidos,
  }
}

function prontoDe(resultado) {
  return {
    status: 'PRONTO',
    cenarios: resultado?.cenarios ?? [],
    ia_indisponivel: !!resultado?.ia_indisponivel,
  }
}

/**
 * Normaliza o diff do backend para o shape plano que a UI consome. O backend
 * agrupa por tarefa — `{ "<tarefa_id>": { titulo, movidas, criadas, removidas,
 * inalteradas } }` — então ACHATAMOS os grupos, aproveitando o `titulo` do grupo
 * em cada `movida`. `de`/`para` são objetos `{inicio,fim}` → usamos o `inicio`.
 * `criadas`/`removidas` viram listas planas; `inalteradas` vira a contagem total
 * (o mesmo shape do mock, que a UI e `diffVazio` esperam).
 */
export function mapearDiff(diff) {
  const vazio = { movidas: [], criadas: [], removidas: [], inalteradas: 0 }
  if (!diff || typeof diff !== 'object') return vazio

  const intervalo = (v) => (v && typeof v === 'object' ? (v.inicio ?? v.fim) : v)
  const movidas = []
  const criadas = []
  const removidas = []
  let inalteradas = 0

  for (const [tid, grupo] of Object.entries(diff)) {
    if (!grupo || typeof grupo !== 'object') continue
    const titulo = grupo.titulo ?? 'Sessão'
    ;(grupo.movidas ?? []).forEach((m, i) =>
      movidas.push({
        eventoId: `${tid}-${i}`,
        tarefa_titulo: titulo,
        de: intervalo(m.de),
        para: intervalo(m.para),
        motivo: null,
      }),
    )
    criadas.push(...(grupo.criadas ?? []))
    removidas.push(...(grupo.removidas ?? []))
    inalteradas += (grupo.inalteradas ?? []).length
  }
  return { movidas, criadas, removidas, inalteradas }
}
