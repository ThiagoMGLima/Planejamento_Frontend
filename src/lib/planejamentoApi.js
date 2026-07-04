import { makeId } from './id.js'
import { toDateISO } from './dates.js'

/**
 * Cliente do montador de rotina (backend marco C1b) — hoje um **mock local**,
 * porque o backend ainda está em construção. A superfície espelha o contrato do
 * HANDOFF para a troca por HTTP ser cirúrgica:
 *
 *   POST /planejamento/cenarios          → `criarJobCenarios(body, ctx)`
 *   GET  /planejamento/cenarios/{id}     → `consultarJob(jobId)`
 *   POST /planejamento/cenarios/escolher → `escolherCenario({jobId, cenarioId, aplicar})`
 *
 * Quando o C1b sair, estas funções viram chamadas a `src/lib/api.js` (mesmos
 * nomes de campo) e nada acima muda. O 2º argumento `ctx` (tarefas selecionadas,
 * início da semana) é ANDAIME: o backend real deriva isso do banco a partir dos
 * `tarefa_ids`; aqui o mock precisa dele para inventar sessões/plano plausíveis.
 *
 * Toda métrica/plano aqui é FICTÍCIA — o backend real é a fonte da verdade. Os
 * números são curados para exercitar a UI de W3 (comparação); o front só os
 * apresenta, nunca os calcula em produção.
 */

/** Duração simulada da geração (s). Real: dezenas de s; no mock, curto e honesto. */
export const DURACAO_MOCK_S = 5

const _jobs = new Map()
let _seq = 0

/**
 * Monta o corpo do POST /planejamento/cenarios. Puro e testável: sempre envia
 * `tarefa_ids` e `horizonte`; `preferencias` só quando há algo a sobrescrever.
 */
export function montarCorpoCenarios({
  tarefaIds,
  horizonte = 'AUTOMATICO',
  janelaDias,
  preferencias,
} = {}) {
  const body = {
    tarefa_ids: [...(tarefaIds ?? [])],
    horizonte: horizonte || 'AUTOMATICO',
  }
  // Horizonte "Personalizado": envia a janela concreta em dias (o backend usa
  // isto no lugar do enum; ignorado nos horizontes fixos).
  if (body.horizonte === 'CUSTOMIZADO' && Number.isFinite(janelaDias) && janelaDias > 0) {
    body.janela_dias = Math.round(janelaDias)
  }
  if (preferencias && Object.keys(preferencias).length > 0) body.preferencias = preferencias
  return body
}

/**
 * "POST" — cria o job. Valida como o backend (422 sem tarefas) e devolve
 * `{jobId, tempoEstimadoS}` (a resposta 202). Já gera os cenários (deterministas)
 * e os guarda no job para `consultarJob`/`escolherCenario` reusarem.
 *
 * @param {object} body                    corpo do POST (tarefa_ids, horizonte…)
 * @param {{ agora?: number, tarefas?: any[], inicioSemana?: Date }} ctx  andaime do mock
 */
export function criarJobCenarios(body, { agora = Date.now(), tarefas = [], inicioSemana } = {}) {
  const ids = body?.tarefa_ids ?? []
  if (ids.length === 0) {
    const err = new Error('Nenhuma tarefa elegível selecionada.')
    err.status = 422
    throw err
  }
  const jobId = `mock-job-${++_seq}`
  const base = inicioSemana instanceof Date ? inicioSemana : new Date(agora)
  const cenarios = gerarCenariosMock(tarefas, base)
  _jobs.set(jobId, { criadoEm: agora, tempoEstimadoS: DURACAO_MOCK_S, body, cenarios })
  return { jobId, tempoEstimadoS: DURACAO_MOCK_S }
}

/** "GET" — status do job. PROCESSANDO até decorrer `tempoEstimadoS`; depois PRONTO. */
export function consultarJob(jobId, { agora = Date.now() } = {}) {
  const job = exigirJob(jobId)
  const decorridoS = (agora - job.criadoEm) / 1000
  if (decorridoS < job.tempoEstimadoS) return { status: 'PROCESSANDO' }
  return { status: 'PRONTO', cenarios: job.cenarios, pesos_usados: {}, ia_indisponivel: false }
}

/**
 * "POST /escolher" — sempre chamado ao confirmar (alimenta o aprendizado de
 * pesos, HANDOFF §4). Com `aplicar:true`, materializa as sessões do cenário em
 * eventos e os devolve em `eventos_criados`.
 */
export function escolherCenario({ jobId, cenarioId, aplicar = true }) {
  const job = exigirJob(jobId)
  const cenario = job.cenarios.find((c) => c.id === cenarioId)
  if (!cenario) {
    const err = new Error('Cenário desconhecido.')
    err.status = 404
    throw err
  }
  const eventos = aplicar ? cenario.plano.sessoes.map(sessaoParaEvento) : []
  return { aplicado: !!aplicar, eventos_criados: eventos }
}

/** Limpa o job (cancelar / fechar). */
export function descartarJob(jobId) {
  _jobs.delete(jobId)
}

// ---------------------------------------------------------------------------
// Refino conversacional (backend marco C5) — mock. No real, a IA traduz o
// pedido em diretrizes e o solver recalcula; aqui clonamos o cenário em foco
// com outro nome, só para exercitar o fluxo de chat da UI.
// ---------------------------------------------------------------------------

/** Duração simulada do refino (s). Real: ~1 chamada de IA (dezenas de s). */
export const DURACAO_MOCK_REFINO_S = 2

const _refinos = new Map()

/** "POST /cenarios/refinar" — devolve {refinoId, tempoEstimadoS} (a 202). */
export function refinarCenario({ jobId, cenarioId, mensagem }, { agora = Date.now() } = {}) {
  const job = exigirJob(jobId)
  const origem =
    job.cenarios.find((c) => c.id === cenarioId) ??
    job.cenarios.find((c) => c.id !== 'base') ??
    job.cenarios[0]
  const refinoId = `mock-refino-${++_seq}`
  const cenario = {
    ...origem,
    id: `${origem.id}-ajustado-${_seq}`,
    nome: `${origem.nome} (ajustado)`,
    intencao: `Variação de "${origem.nome}" a partir do seu pedido.`,
    sugerido: false,
    origem: origem.id,
  }
  _refinos.set(refinoId, {
    criadoEm: agora,
    tempoEstimadoS: DURACAO_MOCK_REFINO_S,
    jobId,
    cenario,
    resposta:
      `Mock: criei uma variação de "${origem.nome}" para “${mensagem}”. ` +
      'No backend real a IA traduz o pedido em diretrizes e o plano é recalculado.',
  })
  return { refinoId, tempoEstimadoS: DURACAO_MOCK_REFINO_S }
}

/** "GET /cenarios/refinar/{id}" — PROCESSANDO até decorrer; depois PRONTO. */
export function consultarRefino(refinoId, { agora = Date.now() } = {}) {
  const refino = _refinos.get(refinoId)
  if (!refino) {
    const err = new Error('Refino desconhecido.')
    err.status = 404
    throw err
  }
  const decorridoS = (agora - refino.criadoEm) / 1000
  if (decorridoS < refino.tempoEstimadoS) return { status: 'PROCESSANDO' }
  // Anexa ao lote original (como o backend), para o escolher continuar valendo.
  const job = _jobs.get(refino.jobId)
  if (job && !job.cenarios.some((c) => c.id === refino.cenario.id)) {
    job.cenarios = [...job.cenarios, refino.cenario]
  }
  return {
    status: 'PRONTO',
    resposta: refino.resposta,
    cenario: refino.cenario,
    cenarios: job ? job.cenarios : null,
    ia_indisponivel: false,
  }
}

function exigirJob(jobId) {
  const job = _jobs.get(jobId)
  if (!job) {
    const err = new Error('Job de cenários desconhecido.')
    err.status = 404
    throw err
  }
  return job
}

/** Sessão do plano → evento do domínio (o que o backend devolveria em eventos_criados). */
function sessaoParaEvento(s) {
  return {
    id: makeId('evento'),
    titulo: s.tarefa_titulo,
    inicio: s.inicio,
    fim: s.fim,
    classe: s.classe_id,
    rastrear_conclusao: true,
    status: 'AGENDADO',
    origem_tarefa: s.tarefa_id,
  }
}

// ---------------------------------------------------------------------------
// Geração fictícia (andaime). Métricas curadas; sessões derivadas das tarefas.
// ---------------------------------------------------------------------------

const ARQUETIPOS = [
  {
    id: 'equilibrado',
    nome: 'Equilibrado',
    intencao: 'Distribui o esforço de forma pareja até os prazos.',
    sugerido: true,
    score: 0.86,
    dias: [0, 1, 3, 5],
    metricas: {
      pico_min_dia: 180,
      dias_livres: 2,
      fds_livres: 1,
      folga_media_h: 3.5,
      min_fora_janela: 0,
      fragmentacao: 5,
      nao_alocado_min: 0,
    },
    metricas_vs_base: {
      pico_min_dia: -60,
      dias_livres: 1,
      fds_livres: 0,
      folga_media_h: 0.7,
      min_fora_janela: -30,
      fragmentacao: -1,
      nao_alocado_min: 0,
    },
    trade_offs: ['Sábado fica livre', 'Quinta vai até 20h'],
    nao_alocado: [],
  },
  {
    id: 'foco-cedo',
    nome: 'Foco antecipado',
    intencao: 'Concentra as tarefas no começo da janela.',
    sugerido: false,
    score: 0.74,
    dias: [0, 1, 2],
    metricas: {
      pico_min_dia: 300,
      dias_livres: 3,
      fds_livres: 2,
      folga_media_h: 3.0,
      min_fora_janela: 30,
      fragmentacao: 4,
      nao_alocado_min: 0,
    },
    metricas_vs_base: {
      pico_min_dia: 60,
      dias_livres: 2,
      fds_livres: 1,
      folga_media_h: 0.2,
      min_fora_janela: 0,
      fragmentacao: -2,
      nao_alocado_min: 0,
    },
    trade_offs: ['Começo de semana mais pesado', 'Folga cresce perto dos prazos'],
    nao_alocado: [],
  },
  {
    id: 'fds-livre',
    nome: 'Fim de semana livre',
    intencao: 'Protege o fim de semana empurrando carga para os dias úteis.',
    sugerido: false,
    score: 0.69,
    dias: [0, 1, 2, 3, 4],
    metricas: {
      pico_min_dia: 240,
      dias_livres: 2,
      fds_livres: 2,
      folga_media_h: 2.6,
      min_fora_janela: 60,
      fragmentacao: 6,
      nao_alocado_min: 45,
    },
    metricas_vs_base: {
      pico_min_dia: 0,
      dias_livres: 1,
      fds_livres: 1,
      folga_media_h: -0.2,
      min_fora_janela: 30,
      fragmentacao: 0,
      nao_alocado_min: 45,
    },
    trade_offs: ['Dias úteis mais cheios', '45 min não couberam antes do prazo'],
    nao_alocado: [{ tarefa_titulo: 'sessão final', min: 45 }],
  },
]

const METRICAS_BASE = {
  pico_min_dia: 240,
  dias_livres: 1,
  fds_livres: 1,
  folga_media_h: 2.8,
  min_fora_janela: 30,
  fragmentacao: 6,
  nao_alocado_min: 0,
}

function gerarCenariosMock(tarefas, inicioSemana) {
  const base = {
    id: 'base',
    nome: 'Base',
    intencao: 'Sua agenda atual, sem replanejar.',
    sugerido: false,
    score: 0,
    plano: { sessoes: [], nao_alocado: [] },
    metricas: METRICAS_BASE,
    metricas_vs_base: null,
    trade_offs: [],
  }
  const arquetipos = ARQUETIPOS.map((a) => ({
    id: a.id,
    nome: a.nome,
    intencao: a.intencao,
    sugerido: a.sugerido,
    score: a.score,
    plano: { sessoes: montarSessoes(tarefas, a.dias, inicioSemana), nao_alocado: a.nao_alocado },
    metricas: a.metricas,
    metricas_vs_base: a.metricas_vs_base,
    trade_offs: a.trade_offs,
  }))
  return [base, ...arquetipos]
}

/** Espalha o esforço de cada tarefa em sessões (≤120 min) sobre `diasOffsets`. */
function montarSessoes(tarefas, diasOffsets, inicioSemana) {
  const sessoes = []
  const usadosPorDia = {}
  let di = 0
  for (const t of tarefas ?? []) {
    const total = t.esforco_estimado || 60
    const n = Math.max(1, Math.ceil(total / 120))
    const dur = Math.round(total / n)
    for (let k = 0; k < n; k++) {
      const off = diasOffsets[di % diasOffsets.length]
      di += 1
      const stack = usadosPorDia[off] ?? 0
      usadosPorDia[off] = stack + 1
      const horaIni = 19 + stack
      const inicio = emHora(inicioSemana, off, horaIni)
      const fim = emHora(inicioSemana, off, horaIni + dur / 60)
      sessoes.push({
        tarefa_id: t.id,
        tarefa_titulo: t.titulo,
        classe_id: t.classe ?? null,
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        dur_min: dur,
      })
    }
  }
  return sessoes
}

function emHora(inicioSemana, dayOffset, horaDecimal) {
  const d = new Date(inicioSemana)
  d.setDate(d.getDate() + dayOffset)
  const h = Math.floor(horaDecimal)
  const m = Math.round((horaDecimal - h) * 60)
  d.setHours(h, m, 0, 0)
  return d
}

// ---------------------------------------------------------------------------
// Replanejar (backend marco C2) — mock. "Simula" (nada persiste) devolvendo um
// diff; "aplicar" persiste. HANDOFF §4: POST /planejamento/replanejar[/aplicar].
// "Hoje não" é replanejar com `diasBloqueados=[hoje]` (atalho de UI, não rota).
// ---------------------------------------------------------------------------

const HORA_TARDE = 21 // sessões a partir daqui são "puxadas" p/ mais cedo
const HORA_ALVO = 19

/** Sessão de plano futura e ainda ativa = candidata a replanejar. */
function ehReplanejavel(ev, hoje) {
  return ev.rastrear_conclusao && ev.status === 'AGENDADO' && new Date(ev.inicio) >= hoje
}

/**
 * "POST /replanejar" — simulação. Move sessões de dias bloqueados para o próximo
 * dia livre e puxa sessões tarde da noite para mais cedo. Devolve só o diff;
 * nada é persistido (o front confirma com `aplicar`).
 *
 * @param {{ eventos?: any[], diasBloqueados?: string[], agora?: number }} entrada
 */
export function simularReplanejamento({
  eventos = [],
  diasBloqueados = [],
  agora = Date.now(),
} = {}) {
  const hoje = new Date(agora)
  hoje.setHours(0, 0, 0, 0)
  const bloqueados = new Set(diasBloqueados)
  const sessoes = eventos.filter((e) => ehReplanejavel(e, hoje))

  const movidas = []
  for (const ev of sessoes) {
    const ini = new Date(ev.inicio)
    const fim = new Date(ev.fim)
    const durMs = fim - ini
    let novoInicio = null
    let motivo = null

    if (bloqueados.has(toDateISO(ini))) {
      let d = 1
      while (bloqueados.has(toDateISO(deslocarDias(ini, d)))) d += 1
      novoInicio = deslocarDias(ini, d)
      motivo = 'dia bloqueado'
    } else if (ini.getHours() >= HORA_TARDE) {
      novoInicio = comHora(ini, HORA_ALVO)
      motivo = 'evita a noite'
    }

    if (novoInicio) {
      const novoFim = new Date(novoInicio.getTime() + durMs)
      movidas.push({
        eventoId: ev.id,
        tarefa_titulo: ev.titulo,
        de: ev.inicio,
        para: novoInicio.toISOString(),
        novoInicio: novoInicio.toISOString(),
        novoFim: novoFim.toISOString(),
        motivo,
      })
    }
  }

  const diff = {
    movidas,
    criadas: [],
    removidas: [],
    inalteradas: sessoes.length - movidas.length,
  }
  return { diff }
}

/** True quando o diff não muda nada (UI: "nada muda", não abrir tela). */
export function diffVazio(diff) {
  if (!diff) return true
  return (
    (diff.movidas?.length ?? 0) === 0 &&
    (diff.criadas?.length ?? 0) === 0 &&
    (diff.removidas?.length ?? 0) === 0
  )
}

function deslocarDias(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function comHora(d, h) {
  const r = new Date(d)
  r.setHours(h, r.getMinutes(), 0, 0)
  return r
}
