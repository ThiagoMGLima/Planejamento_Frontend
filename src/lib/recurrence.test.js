import { describe, it, expect } from 'vitest'
import { expandInstances, instancesOfDay } from './recurrence.js'

const monday = new Date(2026, 5, 15) // 2026-06-15, segunda
const sunday = new Date(2026, 5, 21)

function aulaSemanal(extra = {}) {
  return {
    id: 'r1',
    titulo: 'Aula',
    classe: 'aula',
    inicio: new Date(2026, 5, 15, 8, 0).toISOString(),
    fim: new Date(2026, 5, 15, 10, 0).toISOString(),
    regra_recorrencia: { tipo: 'SEMANAL', dias: [1, 3], ignorar_feriados: true },
    ...extra,
  }
}

describe('expandInstances — não-recorrente', () => {
  it('inclui o evento se cair na janela', () => {
    const e = {
      id: 'e1',
      titulo: 'X',
      classe: 'aula',
      inicio: new Date(2026, 5, 16, 9).toISOString(),
      fim: new Date(2026, 5, 16, 10).toISOString(),
    }
    const inst = expandInstances([e], { start: monday, end: sunday })
    expect(inst).toHaveLength(1)
    expect(inst[0].id).toBe('e1')
    expect(inst[0].recorrente).toBe(false)
  })

  it('exclui evento fora da janela', () => {
    const e = {
      id: 'e1',
      titulo: 'X',
      classe: 'aula',
      inicio: new Date(2026, 0, 1, 9).toISOString(),
      fim: new Date(2026, 0, 1, 10).toISOString(),
    }
    expect(expandInstances([e], { start: monday, end: sunday })).toHaveLength(0)
  })
})

describe('expandInstances — semanal', () => {
  it('gera uma ocorrência por dia que casa com a regra', () => {
    const inst = expandInstances([aulaSemanal()], { start: monday, end: sunday })
    expect(inst).toHaveLength(2) // Seg(15) e Qua(17)
    expect(inst.every((i) => i.recorrente && i.eventoId === 'r1')).toBe(true)
    expect(inst[0].id).toBe('r1@2026-06-15')
  })

  it('mantém a hora do evento-base em cada ocorrência', () => {
    const [seg] = expandInstances([aulaSemanal()], { start: monday, end: sunday })
    expect(new Date(seg.inicio).getHours()).toBe(8)
    expect(new Date(seg.fim).getHours()).toBe(10)
  })

  it('ignora feriado quando ignorar_feriados=true', () => {
    const inst = expandInstances([aulaSemanal()], {
      start: monday,
      end: sunday,
      feriados: new Set(['2026-06-17']),
    })
    expect(inst).toHaveLength(1) // Qua(17) caiu
    expect(inst[0].occDateISO).toBe('2026-06-15')
  })

  it('respeita data_fim', () => {
    const aula = aulaSemanal({
      regra_recorrencia: { tipo: 'SEMANAL', dias: [1, 3], data_fim: '2026-06-16' },
    })
    const inst = expandInstances([aula], { start: monday, end: sunday })
    expect(inst).toHaveLength(1) // só Seg(15); Qua(17) já passou de data_fim
  })

  it('oculta ocorrência com override REMARCADO e aplica override de status', () => {
    const aula = aulaSemanal({
      rastrear_conclusao: true,
      status: 'AGENDADO',
      ocorrencias: { '2026-06-15': { status: 'REMARCADO' }, '2026-06-17': { status: 'CONCLUIDO' } },
    })
    const inst = expandInstances([aula], { start: monday, end: sunday })
    expect(inst).toHaveLength(1)
    expect(inst[0].occDateISO).toBe('2026-06-17')
    expect(inst[0].status).toBe('CONCLUIDO')
  })

  it('reposiciona ocorrência movida no MESMO dia (só muda o horário)', () => {
    const aula = aulaSemanal({
      ocorrencias: {
        '2026-06-15': {
          movidoInicio: new Date(2026, 5, 15, 14, 0).toISOString(),
          movidoFim: new Date(2026, 5, 15, 16, 0).toISOString(),
        },
      },
    })
    const inst = expandInstances([aula], { start: monday, end: sunday })
    expect(inst).toHaveLength(2) // Seg(movida) + Qua(natural)
    const seg = inst.find((i) => i.occDateISO === '2026-06-15')
    expect(new Date(seg.inicio).getHours()).toBe(14) // horário movido, não 8h
    expect(seg.id).toBe('r1@2026-06-15') // identidade preservada
  })

  it('move ocorrência para OUTRA semana: some da origem, aparece no destino', () => {
    const nextMon = new Date(2026, 5, 22)
    const aula = aulaSemanal({
      ocorrencias: {
        '2026-06-15': {
          movidoInicio: new Date(2026, 5, 23, 8, 0).toISOString(), // terça da semana seguinte
          movidoFim: new Date(2026, 5, 23, 10, 0).toISOString(),
        },
      },
    })
    // Semana original: a segunda movida NÃO aparece; só a quarta natural.
    const semanaOrig = expandInstances([aula], { start: monday, end: sunday })
    expect(semanaOrig.map((i) => i.occDateISO).sort()).toEqual(['2026-06-17'])

    // Semana destino: a ocorrência movida aparece na terça (23), + as naturais.
    const semanaDest = expandInstances([aula], { start: nextMon, end: new Date(2026, 5, 28) })
    const movida = semanaDest.find((i) => i.occDateISO === '2026-06-15')
    expect(movida).toBeTruthy()
    expect(new Date(movida.inicio).getDate()).toBe(23)
  })
})

describe('expandInstances — MENSAL', () => {
  it('casa pelo dia do mês', () => {
    const e = {
      id: 'm1',
      titulo: 'Boleto',
      classe: 'basica',
      inicio: new Date(2026, 5, 10, 9).toISOString(),
      fim: new Date(2026, 5, 10, 9, 30).toISOString(),
      regra_recorrencia: { tipo: 'MENSAL', dias: [15] },
    }
    const inst = expandInstances([e], { start: monday, end: sunday })
    expect(inst).toHaveLength(1)
    expect(inst[0].occDateISO).toBe('2026-06-15')
  })
})

describe('instancesOfDay', () => {
  it('filtra instâncias de um dia específico', () => {
    const all = expandInstances([aulaSemanal()], { start: monday, end: sunday })
    expect(instancesOfDay(all, new Date(2026, 5, 17))).toHaveLength(1)
    expect(instancesOfDay(all, new Date(2026, 5, 16))).toHaveLength(0)
  })
})
