import { describe, it, expect } from 'vitest'
import { statusEfetivo, isPendente } from './status.js'

const inHours = (h) => new Date(Date.now() + h * 3600e3).toISOString()

describe('statusEfetivo', () => {
  it('não retorna status para item que não rastreia conclusão', () => {
    expect(statusEfetivo({ rastrear_conclusao: false, fim: inHours(-1) })).toBeUndefined()
  })

  it('mantém AGENDADO enquanto o fim está no futuro', () => {
    expect(statusEfetivo({ rastrear_conclusao: true, status: 'AGENDADO', fim: inHours(1) })).toBe(
      'AGENDADO',
    )
  })

  it('deriva PENDENTE quando agora > fim e ainda está AGENDADO', () => {
    expect(statusEfetivo({ rastrear_conclusao: true, status: 'AGENDADO', fim: inHours(-1) })).toBe(
      'PENDENTE',
    )
  })

  it('CONCLUIDO tem precedência sobre a derivação por tempo', () => {
    expect(statusEfetivo({ rastrear_conclusao: true, status: 'CONCLUIDO', fim: inHours(-1) })).toBe(
      'CONCLUIDO',
    )
  })

  it('REMARCADO tem precedência sobre a derivação por tempo', () => {
    expect(statusEfetivo({ rastrear_conclusao: true, status: 'REMARCADO', fim: inHours(-1) })).toBe(
      'REMARCADO',
    )
  })

  it('trata status ausente como AGENDADO (futuro) / PENDENTE (passado)', () => {
    expect(statusEfetivo({ rastrear_conclusao: true, fim: inHours(1) })).toBe('AGENDADO')
    expect(statusEfetivo({ rastrear_conclusao: true, fim: inHours(-1) })).toBe('PENDENTE')
  })

  it('isPendente reflete a derivação', () => {
    expect(isPendente({ rastrear_conclusao: true, status: 'AGENDADO', fim: inHours(-2) })).toBe(
      true,
    )
    expect(isPendente({ rastrear_conclusao: true, status: 'AGENDADO', fim: inHours(2) })).toBe(
      false,
    )
  })
})
