import { describe, it, expect } from 'vitest'
import {
  jsToBackendDia,
  backendToJsDia,
  classeFromApi,
  tarefaFromApi,
  tarefaToApi,
  regraFromApi,
  regraToApi,
  eventoToApi,
  instanceFromApiItem,
} from './mappers.js'

describe('conversão de dia da semana', () => {
  it('JS getDay (0=dom) ↔ backend (0=seg)', () => {
    // domingo
    expect(jsToBackendDia(0)).toBe(6)
    expect(backendToJsDia(6)).toBe(0)
    // segunda
    expect(jsToBackendDia(1)).toBe(0)
    expect(backendToJsDia(0)).toBe(1)
    // sábado
    expect(jsToBackendDia(6)).toBe(5)
    expect(backendToJsDia(5)).toBe(6)
  })

  it('é inversa em todos os dias', () => {
    for (let d = 0; d < 7; d++) expect(backendToJsDia(jsToBackendDia(d))).toBe(d)
  })
})

describe('classeFromApi', () => {
  it('expande o hex único do backend no trio {bg,st,tx}', () => {
    const c = classeFromApi({ id: 'c1', nome: 'Estudar', cor: '#ecf4df', rastreia_conclusao: true })
    expect(c.cor).toEqual({ bg: '#ecf4df', st: '#b9d795', tx: '#3b6d11' })
    expect(c.rastreia_conclusao).toBe(true)
  })
})

describe('tarefa', () => {
  it('fromApi achata classe aninhada e mapeia descricao→detalhes', () => {
    const t = tarefaFromApi({
      id: 't1',
      titulo: 'X',
      classe: { id: 'c1' },
      descricao: 'nota',
      esforco_estimado: 60,
      status: 'INBOX',
    })
    expect(t.classe).toBe('c1')
    expect(t.detalhes).toBe('nota')
  })

  it('toApi usa classe_id e descricao', () => {
    const body = tarefaToApi({ titulo: 'X', classe: 'c1', detalhes: 'nota', esforco_estimado: 60 })
    expect(body).toEqual({ titulo: 'X', descricao: 'nota', classe_id: 'c1', esforco_estimado: 60 })
  })
})

describe('regra de recorrência', () => {
  it('SEMANAL converte dias nos dois sentidos', () => {
    // backend [1,3] (ter, qui) → js [2,4]
    expect(regraFromApi({ tipo: 'SEMANAL', dias: [1, 3] }).dias).toEqual([2, 4])
    // js seg+qua [1,3] → backend [0,2]
    expect(regraToApi({ tipo: 'SEMANAL', dias: [1, 3] }).dias).toEqual([0, 2])
  })

  it('MENSAL não converte (dia do mês)', () => {
    expect(regraToApi({ tipo: 'MENSAL', dias: [15] }).dias).toEqual([15])
    expect(regraFromApi({ tipo: 'MENSAL', dias: [15] }).dias).toEqual([15])
  })

  it('regraToApi devolve null sem dias', () => {
    expect(regraToApi(undefined)).toBeNull()
    expect(regraToApi({ tipo: 'SEMANAL', dias: [] })).toBeNull()
  })
})

describe('eventoToApi', () => {
  it('mapeia detalhes→descricao, classe→classe_id e datas tz-aware', () => {
    const body = eventoToApi({
      titulo: 'Estudar',
      detalhes: 'cap 4',
      classe: 'c1',
      inicio: '2026-06-15T13:00:00',
      fim: '2026-06-15T15:00:00',
      rastrear_conclusao: true,
      status: 'AGENDADO',
    })
    expect(body.descricao).toBe('cap 4')
    expect(body.classe_id).toBe('c1')
    expect(body.inicio).toMatch(/Z$/) // ISO tz-aware
    expect(body.status).toBe('AGENDADO')
  })

  it('zera status quando não rastreia', () => {
    const body = eventoToApi({
      titulo: 'Aula',
      classe: 'c1',
      inicio: '2026-06-15T08:00:00',
      fim: '2026-06-15T10:00:00',
      rastrear_conclusao: false,
      status: 'AGENDADO',
    })
    expect(body.status).toBeNull()
  })
})

describe('instanceFromApiItem', () => {
  it('mapeia ocorrência expandida (id evento@data) e usa status_efetivo', () => {
    const inst = instanceFromApiItem({
      id: 'ev1',
      titulo: 'Aula',
      classe: { id: 'aula' },
      inicio: '2026-06-16T11:00:00+00:00',
      fim: '2026-06-16T13:00:00+00:00',
      rastrear_conclusao: false,
      status: null,
      status_efetivo: null,
      ocorrencia: { data: '2026-06-16', persistida: false },
    })
    expect(inst.id).toBe('ev1@2026-06-16')
    expect(inst.eventoId).toBe('ev1')
    expect(inst.occDateISO).toBe('2026-06-16')
    expect(inst.recorrente).toBe(true)
  })

  it('evento simples: id próprio, status_efetivo do servidor', () => {
    const inst = instanceFromApiItem({
      id: 'ev2',
      titulo: 'Estudar',
      classe: { id: 'estudar' },
      inicio: '2026-06-15T13:00:00-03:00',
      fim: '2026-06-15T15:00:00-03:00',
      rastrear_conclusao: true,
      status: 'AGENDADO',
      status_efetivo: 'PENDENTE',
      ocorrencia: null,
    })
    expect(inst.id).toBe('ev2')
    expect(inst.recorrente).toBe(false)
    expect(inst.status).toBe('PENDENTE')
  })
})
