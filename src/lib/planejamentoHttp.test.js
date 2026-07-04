import { describe, it, expect } from 'vitest'
import { mapearDiff } from './planejamentoHttp.js'

describe('mapearDiff (backend agrupado por tarefa → UI plana)', () => {
  it('achata os grupos, herda o título e conta inalteradas', () => {
    const backend = {
      'tarefa-uuid-1': {
        titulo: 'Estudar Cálculo',
        movidas: [
          {
            de: { inicio: '2026-07-06T21:30:00', fim: '2026-07-06T23:00:00' },
            para: { inicio: '2026-07-08T19:00:00', fim: '2026-07-08T20:30:00' },
          },
        ],
        criadas: [],
        removidas: [],
        inalteradas: [{ inicio: 'x', fim: 'y' }],
      },
      'tarefa-uuid-2': {
        titulo: 'Relatório',
        movidas: [],
        criadas: [{ inicio: '2026-07-09T19:00:00', fim: '2026-07-09T20:00:00' }],
        removidas: [],
        inalteradas: [{ inicio: 'a', fim: 'b' }],
      },
    }
    const diff = mapearDiff(backend)
    expect(diff.movidas).toHaveLength(1)
    expect(diff.movidas[0].tarefa_titulo).toBe('Estudar Cálculo') // título real do grupo
    expect(diff.movidas[0].de).toBe('2026-07-06T21:30:00') // {inicio,fim} → inicio
    expect(diff.movidas[0].para).toBe('2026-07-08T19:00:00')
    expect(diff.criadas).toHaveLength(1)
    expect(diff.inalteradas).toBe(2) // somatório dos grupos
  })

  it('diff vazio/ausente não quebra', () => {
    expect(mapearDiff(undefined)).toEqual({ movidas: [], criadas: [], removidas: [], inalteradas: 0 })
    expect(mapearDiff({})).toEqual({ movidas: [], criadas: [], removidas: [], inalteradas: 0 })
  })
})
