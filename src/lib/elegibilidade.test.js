import { describe, it, expect } from 'vitest'
import { elegibilidadeTarefa, tarefaElegivel, tarefasDoInbox } from './elegibilidade.js'

const completa = { classe: 'estudar', deadline: '2026-07-11', esforco_estimado: 120 }

describe('elegibilidadeTarefa', () => {
  it('é elegível quando tem prazo, esforço e classe', () => {
    expect(elegibilidadeTarefa(completa)).toEqual({ elegivel: true, motivo: null })
    expect(tarefaElegivel(completa)).toBe(true)
  })

  it('sinaliza prazo faltando primeiro', () => {
    expect(elegibilidadeTarefa({ ...completa, deadline: undefined })).toEqual({
      elegivel: false,
      motivo: 'sem prazo definido',
    })
  })

  it('sinaliza esforço faltando', () => {
    expect(elegibilidadeTarefa({ ...completa, esforco_estimado: 0 })).toEqual({
      elegivel: false,
      motivo: 'sem esforço estimado',
    })
  })

  it('sinaliza classe faltando', () => {
    expect(elegibilidadeTarefa({ ...completa, classe: undefined })).toEqual({
      elegivel: false,
      motivo: 'sem classe',
    })
  })

  it('trata tarefa nula sem quebrar', () => {
    expect(elegibilidadeTarefa(null).elegivel).toBe(false)
  })
})

describe('tarefasDoInbox', () => {
  it('filtra só o que está no Inbox', () => {
    const lista = [
      { id: 'a', status: 'INBOX' },
      { id: 'b', status: 'PROMOVIDA' },
      { id: 'c', status: 'INBOX' },
    ]
    expect(tarefasDoInbox(lista).map((t) => t.id)).toEqual(['a', 'c'])
  })

  it('aceita entrada indefinida', () => {
    expect(tarefasDoInbox(undefined)).toEqual([])
  })
})
