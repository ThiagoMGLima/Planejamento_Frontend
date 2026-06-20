import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { api, request, ApiError, BASE_URL } from './api.js'

function mockFetch(impl) {
  global.fetch = vi.fn(impl)
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

beforeEach(() => {
  mockFetch(async () => jsonResponse([]))
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('request', () => {
  it('monta a URL com base + querystring e NÃO envia header de auth', async () => {
    await api.eventos.list({ inicio: '2026-06-15', fim: '2026-06-21' })
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe(`${BASE_URL}/eventos?inicio=2026-06-15&fim=2026-06-21`)
    expect(init.method).toBe('GET')
    const headers = init.headers ?? {}
    expect(headers.Authorization).toBeUndefined()
    expect(headers.authorization).toBeUndefined()
  })

  it('omite params nulos/undefined da querystring', async () => {
    await api.feriados.list({ ano: undefined })
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE_URL}/feriados`)
  })

  it('envia corpo JSON com Content-Type em POST', async () => {
    mockFetch(async () => jsonResponse({ id: 'x' }, 201))
    await api.tarefas.create({ titulo: 'Nova' })
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe(`${BASE_URL}/tarefas`)
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ titulo: 'Nova' })
  })

  it('passa o escopo no remarcar', async () => {
    mockFetch(async () => jsonResponse(null, 204))
    await api.eventos.remarcar('e1', { escopo: 'serie' })
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE_URL}/eventos/e1/remarcar?escopo=serie`)
  })

  it('lança ApiError em status >= 400', async () => {
    mockFetch(async () => jsonResponse({ detail: 'não encontrado' }, 404))
    await expect(request('/eventos/zzz')).rejects.toBeInstanceOf(ApiError)
    try {
      await request('/eventos/zzz')
    } catch (e) {
      expect(e.status).toBe(404)
      expect(e.body).toEqual({ detail: 'não encontrado' })
    }
  })

  it('retorna null em 204 (sem corpo)', async () => {
    mockFetch(async () => ({ ok: true, status: 204, text: async () => '', json: async () => null }))
    expect(await api.classes.remove('c1')).toBeNull()
  })
})
