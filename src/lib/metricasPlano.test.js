import { describe, it, expect } from 'vitest'
import {
  METRICAS_CARD,
  sentidoDelta,
  formatMetrica,
  formatDelta,
  densidadePorDia,
} from './metricasPlano.js'

describe('sentidoDelta', () => {
  it('trata zero/ausência como neutro', () => {
    expect(sentidoDelta(0, true)).toBe('neutro')
    expect(sentidoDelta(undefined, false)).toBe('neutro')
  })

  it('para "maior é melhor", positivo = melhora e negativo = custo', () => {
    expect(sentidoDelta(2, true)).toBe('melhora')
    expect(sentidoDelta(-2, true)).toBe('custo')
  })

  it('para "menor é melhor", negativo = melhora e positivo = custo', () => {
    expect(sentidoDelta(-30, false)).toBe('melhora')
    expect(sentidoDelta(30, false)).toBe('custo')
  })
})

describe('formatMetrica', () => {
  it('formata minutos em horas cheias e mistas', () => {
    expect(formatMetrica(180, 'min')).toBe('3h')
    expect(formatMetrica(90, 'min')).toBe('1h30min')
    expect(formatMetrica(45, 'min')).toBe('45min')
  })

  it('formata horas e inteiros', () => {
    expect(formatMetrica(3.5, 'h')).toBe('3.5h')
    expect(formatMetrica(2, 'int')).toBe('2')
  })
})

describe('formatDelta', () => {
  it('usa seta para cima/baixo e omite quando zero', () => {
    expect(formatDelta(0, 'min')).toBeNull()
    expect(formatDelta(60, 'min')).toBe('▲ 1h')
    expect(formatDelta(-30, 'min')).toBe('▼ 30min')
    expect(formatDelta(0.7, 'h')).toBe('▲ 0.7h')
  })
})

describe('densidadePorDia', () => {
  it('soma minutos por dia da semana (seg-based)', () => {
    // 2026-07-06 é segunda; 2026-07-11 é sábado.
    const sessoes = [
      { inicio: '2026-07-06T19:00:00', dur_min: 60 },
      { inicio: '2026-07-06T20:00:00', dur_min: 30 },
      { inicio: '2026-07-11T19:00:00', dur_min: 90 },
    ]
    const dias = densidadePorDia(sessoes)
    expect(dias[0]).toBe(90) // segunda
    expect(dias[5]).toBe(90) // sábado
    expect(dias.reduce((a, b) => a + b, 0)).toBe(180)
  })

  it('aceita lista vazia/indefinida', () => {
    expect(densidadePorDia(undefined)).toEqual([0, 0, 0, 0, 0, 0, 0])
  })
})

describe('METRICAS_CARD', () => {
  it('expõe 4 métricas com sentido definido', () => {
    expect(METRICAS_CARD).toHaveLength(4)
    for (const m of METRICAS_CARD) expect(typeof m.maiorMelhor).toBe('boolean')
  })
})
