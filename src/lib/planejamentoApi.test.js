import { describe, it, expect } from 'vitest'
import {
  DURACAO_MOCK_S,
  DURACAO_MOCK_REFINO_S,
  montarCorpoCenarios,
  criarJobCenarios,
  consultarJob,
  consultarRefino,
  escolherCenario,
  refinarCenario,
  simularReplanejamento,
  diffVazio,
} from './planejamentoApi.js'

const TAREFAS = [
  { id: 't1', titulo: 'Trabalho de Física', classe: 'estudar', esforco_estimado: 240 },
  { id: 't2', titulo: 'Lista de ED', classe: 'estudar', esforco_estimado: 120 },
]
const SEMANA = new Date('2026-07-06T00:00:00') // segunda

describe('montarCorpoCenarios', () => {
  it('sempre envia tarefa_ids e horizonte', () => {
    expect(montarCorpoCenarios({ tarefaIds: ['a', 'b'], horizonte: 'SEMANA' })).toEqual({
      tarefa_ids: ['a', 'b'],
      horizonte: 'SEMANA',
    })
  })

  it('cai para AUTOMATICO sem horizonte', () => {
    expect(montarCorpoCenarios({ tarefaIds: ['a'] }).horizonte).toBe('AUTOMATICO')
  })

  it('inclui preferencias só quando há algo', () => {
    expect(montarCorpoCenarios({ tarefaIds: ['a'], preferencias: {} }).preferencias).toBeUndefined()
    expect(
      montarCorpoCenarios({ tarefaIds: ['a'], preferencias: { evitar_fds: true } }).preferencias,
    ).toEqual({ evitar_fds: true })
  })

  it('materializa iteráveis (Set) em array', () => {
    expect(montarCorpoCenarios({ tarefaIds: new Set(['x']) }).tarefa_ids).toEqual(['x'])
  })

  it('inclui janela_dias só no horizonte CUSTOMIZADO', () => {
    expect(
      montarCorpoCenarios({ tarefaIds: ['a'], horizonte: 'CUSTOMIZADO', janelaDias: 90 }),
    ).toEqual({ tarefa_ids: ['a'], horizonte: 'CUSTOMIZADO', janela_dias: 90 })
    // janelaDias é ignorado nos horizontes fixos
    expect(
      montarCorpoCenarios({ tarefaIds: ['a'], horizonte: 'SEMANA', janelaDias: 90 }).janela_dias,
    ).toBeUndefined()
    // e sem janela válida no CUSTOMIZADO, não injeta o campo
    expect(
      montarCorpoCenarios({ tarefaIds: ['a'], horizonte: 'CUSTOMIZADO' }).janela_dias,
    ).toBeUndefined()
  })
})

describe('criarJobCenarios', () => {
  it('recusa seleção vazia com status 422', () => {
    expect(() => criarJobCenarios({ tarefa_ids: [] })).toThrow()
    try {
      criarJobCenarios({ tarefa_ids: [] })
    } catch (e) {
      expect(e.status).toBe(422)
    }
  })

  it('devolve jobId e tempo estimado', () => {
    const r = criarJobCenarios({ tarefa_ids: ['a'] }, { agora: 0 })
    expect(r.jobId).toBeTruthy()
    expect(r.tempoEstimadoS).toBe(DURACAO_MOCK_S)
  })
})

describe('consultarJob', () => {
  it('fica PROCESSANDO antes do tempo estimado e PRONTO depois', () => {
    const { jobId, tempoEstimadoS } = criarJobCenarios({ tarefa_ids: ['a', 'b'] }, { agora: 0 })

    const meio = consultarJob(jobId, { agora: (tempoEstimadoS - 1) * 1000 })
    expect(meio.status).toBe('PROCESSANDO')

    const fim = consultarJob(jobId, { agora: tempoEstimadoS * 1000 })
    expect(fim.status).toBe('PRONTO')
    expect(Array.isArray(fim.cenarios)).toBe(true)
    expect(fim.cenarios.length).toBeGreaterThanOrEqual(3)
    expect(fim.cenarios[0].id).toBe('base')
    expect(fim.cenarios.some((c) => c.sugerido)).toBe(true)
  })

  it('erra com 404 para job desconhecido', () => {
    try {
      consultarJob('inexistente')
    } catch (e) {
      expect(e.status).toBe(404)
    }
  })

  it('gera sessões a partir das tarefas selecionadas', () => {
    const { jobId, tempoEstimadoS } = criarJobCenarios(
      { tarefa_ids: ['t1', 't2'] },
      { agora: 0, tarefas: TAREFAS, inicioSemana: SEMANA },
    )
    const { cenarios } = consultarJob(jobId, { agora: tempoEstimadoS * 1000 })
    const equilibrado = cenarios.find((c) => c.id === 'equilibrado')
    expect(equilibrado.plano.sessoes.length).toBeGreaterThan(0)
    // 240min → 2 sessões de 120; 120min → 1 sessão. Total 3.
    expect(equilibrado.plano.sessoes).toHaveLength(3)
    const s = equilibrado.plano.sessoes[0]
    expect(s).toMatchObject({ tarefa_id: 't1', tarefa_titulo: 'Trabalho de Física' })
    expect(new Date(s.inicio).getTime()).toBeLessThan(new Date(s.fim).getTime())
  })
})

describe('escolherCenario', () => {
  function jobPronto() {
    const { jobId } = criarJobCenarios(
      { tarefa_ids: ['t1'] },
      { agora: 0, tarefas: TAREFAS.slice(0, 1), inicioSemana: SEMANA },
    )
    return jobId
  }

  it('aplicar=true materializa as sessões em eventos', () => {
    const jobId = jobPronto()
    const { aplicado, eventos_criados } = escolherCenario({
      jobId,
      cenarioId: 'equilibrado',
      aplicar: true,
    })
    expect(aplicado).toBe(true)
    expect(eventos_criados.length).toBeGreaterThan(0)
    const ev = eventos_criados[0]
    expect(ev).toMatchObject({
      titulo: 'Trabalho de Física',
      origem_tarefa: 't1',
      status: 'AGENDADO',
    })
    expect(ev.id).toBeTruthy()
  })

  it('aplicar=false não cria eventos, mas registra a escolha', () => {
    const jobId = jobPronto()
    const r = escolherCenario({ jobId, cenarioId: 'equilibrado', aplicar: false })
    expect(r.aplicado).toBe(false)
    expect(r.eventos_criados).toEqual([])
  })

  it('erra com 404 para cenário inexistente', () => {
    const jobId = jobPronto()
    expect(() => escolherCenario({ jobId, cenarioId: 'nao-existe' })).toThrow()
  })
})

describe('refinarCenario / consultarRefino (mock do chat do lote)', () => {
  function loteProntoComRefino() {
    const { jobId, tempoEstimadoS } = criarJobCenarios(
      { tarefa_ids: ['a'] },
      { agora: 0, tarefas: TAREFAS, inicioSemana: SEMANA },
    )
    consultarJob(jobId, { agora: tempoEstimadoS * 1000 })
    return jobId
  }

  it('devolve refinoId e tempo estimado; PROCESSANDO antes, PRONTO depois', () => {
    const jobId = loteProntoComRefino()
    const r = refinarCenario(
      { jobId, cenarioId: 'equilibrado', mensagem: 'sem academia essa semana' },
      { agora: 0 },
    )
    expect(r.refinoId).toBeTruthy()
    expect(r.tempoEstimadoS).toBe(DURACAO_MOCK_REFINO_S)
    expect(consultarRefino(r.refinoId, { agora: 0 }).status).toBe('PROCESSANDO')

    const pronto = consultarRefino(r.refinoId, { agora: DURACAO_MOCK_REFINO_S * 1000 })
    expect(pronto.status).toBe('PRONTO')
    expect(pronto.resposta).toBeTruthy()
    expect(pronto.cenario.origem).toBe('equilibrado')
    expect(pronto.ia_indisponivel).toBe(false)
  })

  it('anexa o cenário novo ao lote original (escolher continua valendo)', () => {
    const jobId = loteProntoComRefino()
    const { refinoId } = refinarCenario(
      { jobId, cenarioId: 'equilibrado', mensagem: 'x' },
      { agora: 0 },
    )
    const pronto = consultarRefino(refinoId, { agora: DURACAO_MOCK_REFINO_S * 1000 })
    expect(pronto.cenarios.some((c) => c.id === pronto.cenario.id)).toBe(true)
    // o cenário refinado pode ser escolhido pelo job original
    const r = escolherCenario({ jobId, cenarioId: pronto.cenario.id, aplicar: false })
    expect(r.aplicado).toBe(false)
  })

  it('sem cenário em foco, parte de um cenário não-base', () => {
    const jobId = loteProntoComRefino()
    const { refinoId } = refinarCenario({ jobId, cenarioId: null, mensagem: 'x' }, { agora: 0 })
    const pronto = consultarRefino(refinoId, { agora: DURACAO_MOCK_REFINO_S * 1000 })
    expect(pronto.cenario.origem).not.toBe('base')
  })

  it('erra com 404 para job/refino desconhecidos', () => {
    expect(() => refinarCenario({ jobId: 'nao-existe', mensagem: 'x' })).toThrow()
    expect(() => consultarRefino('nao-existe')).toThrow()
  })
})

describe('simularReplanejamento', () => {
  const AGORA = new Date('2026-07-06T08:00:00').getTime() // segunda 08h
  const sessao = (id, inicio, fim, extra = {}) => ({
    id,
    titulo: id,
    inicio,
    fim,
    rastrear_conclusao: true,
    status: 'AGENDADO',
    ...extra,
  })
  const EVENTOS = [
    sessao('hoje19h', '2026-07-06T19:00:00', '2026-07-06T20:00:00'),
    sessao('qua2130', '2026-07-08T21:30:00', '2026-07-08T23:00:00'),
    sessao('passada', '2026-07-05T19:00:00', '2026-07-05T20:00:00'), // < hoje: fora
    sessao('concluida', '2026-07-07T19:00:00', '2026-07-07T20:00:00', { status: 'CONCLUIDO' }),
    { id: 'aula', titulo: 'Aula', inicio: '2026-07-07T08:00:00', fim: '2026-07-07T10:00:00' },
  ]

  it('sem bloqueio, puxa sessão tarde da noite para mais cedo', () => {
    const { diff } = simularReplanejamento({ eventos: EVENTOS, agora: AGORA })
    expect(diff.movidas).toHaveLength(1)
    const m = diff.movidas[0]
    expect(m.eventoId).toBe('qua2130')
    expect(m.motivo).toBe('evita a noite')
    expect(new Date(m.novoInicio).getHours()).toBe(19)
    // duração preservada (90 min).
    expect((new Date(m.novoFim) - new Date(m.novoInicio)) / 60000).toBe(90)
  })

  it('"Hoje não" move a sessão de hoje para o próximo dia', () => {
    const { diff } = simularReplanejamento({
      eventos: EVENTOS,
      diasBloqueados: ['2026-07-06'],
      agora: AGORA,
    })
    const m = diff.movidas.find((x) => x.eventoId === 'hoje19h')
    expect(m).toBeTruthy()
    expect(m.motivo).toBe('dia bloqueado')
    expect(new Date(m.para).getDate()).toBe(7) // 06 → 07
  })

  it('ignora eventos passados, concluídos e que não rastreiam', () => {
    const { diff } = simularReplanejamento({ eventos: EVENTOS, agora: AGORA })
    const ids = diff.movidas.map((m) => m.eventoId)
    expect(ids).not.toContain('passada')
    expect(ids).not.toContain('concluida')
    expect(ids).not.toContain('aula')
  })

  it('diffVazio detecta ausência de mudanças', () => {
    const semNoturna = [EVENTOS[0]] // só a de 19h; nada a mover sem bloqueio
    const { diff } = simularReplanejamento({ eventos: semNoturna, agora: AGORA })
    expect(diffVazio(diff)).toBe(true)
  })
})
