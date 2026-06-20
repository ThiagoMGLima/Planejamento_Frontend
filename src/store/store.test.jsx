import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { StoreProvider, useStore } from './store.jsx'

const wrapper = ({ children }) => <StoreProvider>{children}</StoreProvider>

beforeEach(() => {
  localStorage.clear()
})

describe('store — promoção e máquina de estados', () => {
  it('promoverTarefa cria evento (herda classe/rastreamento) e marca a tarefa PROMOVIDA', () => {
    const { result } = renderHook(() => useStore(), { wrapper })

    act(() =>
      result.current.addTarefa({ id: 't1', titulo: 'Estudar', classe: 'estudar', status: 'INBOX' }),
    )

    let id
    act(() => {
      id = result.current.promoverTarefa(
        't1',
        new Date(2026, 5, 15, 13, 0),
        new Date(2026, 5, 15, 14, 0),
      )
    })

    const ev = result.current.eventos.find((e) => e.id === id)
    expect(ev).toBeTruthy()
    expect(ev.origem_tarefa).toBe('t1')
    expect(ev.classe).toBe('estudar')
    expect(ev.rastrear_conclusao).toBe(true) // Estudar rastreia → AGENDADO
    expect(ev.status).toBe('AGENDADO')
    expect(result.current.tarefas.find((t) => t.id === 't1').status).toBe('PROMOVIDA')
  })

  it('remarcar um evento simples remove-o e devolve a tarefa ao Inbox', () => {
    const { result } = renderHook(() => useStore(), { wrapper })

    act(() =>
      result.current.addTarefa({ id: 't1', titulo: 'Estudar', classe: 'estudar', status: 'INBOX' }),
    )
    let id
    act(() => {
      id = result.current.promoverTarefa(
        't1',
        new Date(2026, 5, 15, 13, 0),
        new Date(2026, 5, 15, 14, 0),
      )
    })

    const ev = result.current.eventos.find((e) => e.id === id)
    const instance = { eventoId: ev.id, recorrente: false, occDateISO: null }
    act(() => result.current.remarcar(instance))

    expect(result.current.eventos.find((e) => e.id === id)).toBeUndefined()
    expect(result.current.tarefas.find((t) => t.id === 't1').status).toBe('INBOX')
  })

  it('concluir uma ocorrência grava override sem remover a série', () => {
    const { result } = renderHook(() => useStore(), { wrapper })

    act(() =>
      result.current.addEvento({
        id: 'rec1',
        titulo: 'Aula',
        classe: 'estudar',
        inicio: new Date(2026, 5, 15, 8, 0).toISOString(),
        fim: new Date(2026, 5, 15, 9, 0).toISOString(),
        rastrear_conclusao: true,
        status: 'AGENDADO',
        regra_recorrencia: { tipo: 'SEMANAL', dias: [1] },
      }),
    )

    const instance = { eventoId: 'rec1', recorrente: true, occDateISO: '2026-06-15' }
    act(() => result.current.concluir(instance))

    const base = result.current.eventos.find((e) => e.id === 'rec1')
    expect(base).toBeTruthy() // série preservada
    expect(base.ocorrencias['2026-06-15'].status).toBe('CONCLUIDO')
  })
})
