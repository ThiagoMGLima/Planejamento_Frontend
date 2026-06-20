import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { api, request, collectPaginated, ApiError, BASE_URL } from './api.js'

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

describe('request / contrato de URL', () => {
  it('eventos.list usa barra final e querystring, sem header de auth', async () => {
    await api.eventos.list({
      inicio: '2026-06-15T00:00:00-03:00',
      fim: '2026-06-21T00:00:00-03:00',
    })
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe(
      `${BASE_URL}/eventos/?inicio=2026-06-15T00%3A00%3A00-03%3A00&fim=2026-06-21T00%3A00%3A00-03%3A00`,
    )
    expect(init.method).toBe('GET')
    expect((init.headers ?? {}).Authorization).toBeUndefined()
  })

  it('rotas avulsas (pendentes/feriados) NÃO têm barra final', async () => {
    await api.pendentes()
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE_URL}/pendentes`)
    await api.feriados({ ano: 2026 })
    expect(global.fetch.mock.calls[1][0]).toBe(`${BASE_URL}/feriados?ano=2026`)
  })

  it('feriados omite ano nulo', async () => {
    await api.feriados({ ano: undefined })
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE_URL}/feriados`)
  })

  it('POST envia JSON com Content-Type em recurso com barra', async () => {
    mockFetch(async () => jsonResponse({ id: 'x' }, 201))
    await api.tarefas.create({ titulo: 'Nova', classe_id: 'c1' })
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe(`${BASE_URL}/tarefas/`)
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ titulo: 'Nova', classe_id: 'c1' })
  })

  it('concluir/remarcar passam escopo e data como query', async () => {
    mockFetch(async () => jsonResponse({}, 200))
    await api.eventos.concluir('e1', { escopo: 'ocorrencia', data: '2026-06-16' })
    expect(global.fetch.mock.calls[0][0]).toBe(
      `${BASE_URL}/eventos/e1/concluir/?escopo=ocorrencia&data=2026-06-16`,
    )
    await api.eventos.remarcar('e1', { escopo: 'serie' })
    expect(global.fetch.mock.calls[1][0]).toBe(`${BASE_URL}/eventos/e1/remarcar/?escopo=serie`)
  })

  it('lança ApiError em status >= 400 com corpo', async () => {
    mockFetch(async () => jsonResponse({ detail: 'não encontrado' }, 404))
    await expect(request('/eventos/zzz/')).rejects.toBeInstanceOf(ApiError)
  })

  it('retorna null em 204', async () => {
    mockFetch(async () => ({ ok: true, status: 204, text: async () => '', json: async () => null }))
    expect(await api.classes.remove('c1')).toBeNull()
  })
})

describe('collectPaginated (cursor)', () => {
  it('segue `next` e concatena results', async () => {
    const page1 = { next: `${BASE_URL}/classes/?cursor=2`, previous: null, results: [{ id: 'a' }] }
    const page2 = { next: null, previous: null, results: [{ id: 'b' }] }
    let call = 0
    mockFetch(async () => jsonResponse(call++ === 0 ? page1 : page2))
    const all = await collectPaginated('/classes/')
    expect(all.map((x) => x.id)).toEqual(['a', 'b'])
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('aceita endpoint não paginado (array direto)', async () => {
    mockFetch(async () => jsonResponse([{ id: 'a' }]))
    expect(await collectPaginated('/classes/')).toEqual([{ id: 'a' }])
  })
})
