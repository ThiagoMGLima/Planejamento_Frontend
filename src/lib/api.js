/**
 * Cliente HTTP do backend (Marco 4) — `fetch` apontando para a API local, SEM
 * header de auth (o backend é aberto, single-user). Contrato validado ao vivo
 * contra o planejador-backend (Django+DRF):
 *  - Recursos do router exigem BARRA FINAL: classes/ tarefas/ eventos/ e ações
 *    (promover/concluir/remarcar). Rotas avulsas NÃO têm barra: pendentes,
 *    feriados, health.
 *  - classes/ e tarefas/ são paginadas por cursor ({next, previous, results});
 *    eventos/?inicio&fim e pendentes retornam array puro; feriados retorna
 *    {ano, feriados:[...]}.
 *
 * Base URL: VITE_API_URL (ex.: http://localhost:8000/api/v1).
 */

const BASE_URL = (import.meta.env?.VITE_API_URL ?? 'http://localhost:8000/api/v1').replace(
  /\/$/,
  '',
)

/** Erro de API com status HTTP e corpo (quando houver). */
export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/** Monta querystring ignorando valores nulos/undefined. */
function qs(params) {
  if (!params) return ''
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) usp.append(k, v)
  }
  const s = usp.toString()
  return s ? `?${s}` : ''
}

async function parse(res, method, path) {
  if (!res.ok) {
    let body = null
    try {
      body = await res.json()
    } catch {
      /* sem corpo JSON */
    }
    throw new ApiError(`${method} ${path} → ${res.status}`, { status: res.status, body })
  }
  if (res.status === 204) return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

/**
 * Request relativa à BASE. Sem auth. Lança ApiError em status >= 400.
 * @param {string} path  Caminho relativo (ex.: '/eventos/').
 * @param {{ method?: string, body?: any, params?: object, signal?: AbortSignal }} [opts]
 */
export async function request(path, { method = 'GET', body, params, signal } = {}) {
  const res = await fetch(`${BASE_URL}${path}${qs(params)}`, {
    method,
    signal,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  return parse(res, method, path)
}

/** GET de uma URL ABSOLUTA (usado para seguir o cursor `next` da paginação). */
async function getAbsolute(url, signal) {
  const res = await fetch(url, { signal })
  return parse(res, 'GET', url)
}

/**
 * Coleta TODAS as páginas de um endpoint paginado por cursor (segue `next`).
 * @returns {Promise<any[]>}
 */
export async function collectPaginated(path, { params, signal } = {}) {
  let page = await request(path, { params, signal })
  const out = []
  // Endpoint pode (teoricamente) não estar paginado: trata array direto.
  if (Array.isArray(page)) return page
  while (page) {
    out.push(...(page.results ?? []))
    if (!page.next) break
    page = await getAbsolute(page.next, signal)
  }
  return out
}

/** Superfície da API (handoff §8). Retornos são DTOs crus — mapeie via store/mappers.js. */
export const api = {
  // ---- Classes (paginado) ----
  classes: {
    list: (opts) => collectPaginated('/classes/', opts),
    create: (classe, opts) => request('/classes/', { method: 'POST', body: classe, ...opts }),
    update: (id, classe, opts) =>
      request(`/classes/${id}/`, { method: 'PUT', body: classe, ...opts }),
    remove: (id, opts) => request(`/classes/${id}/`, { method: 'DELETE', ...opts }),
  },

  // ---- Tarefas / Inbox (paginado) ----
  tarefas: {
    list: (opts) => collectPaginated('/tarefas/', opts),
    create: (tarefa, opts) => request('/tarefas/', { method: 'POST', body: tarefa, ...opts }),
    update: (id, tarefa, opts) =>
      request(`/tarefas/${id}/`, { method: 'PUT', body: tarefa, ...opts }),
    patch: (id, tarefa, opts) =>
      request(`/tarefas/${id}/`, { method: 'PATCH', body: tarefa, ...opts }),
    remove: (id, opts) => request(`/tarefas/${id}/`, { method: 'DELETE', ...opts }),
    promover: (id, body, opts) =>
      request(`/tarefas/${id}/promover/`, { method: 'POST', body, ...opts }),
  },

  // ---- Eventos (janela já expandida; status_efetivo do servidor) ----
  eventos: {
    // Retorna array puro de itens (eventos simples + ocorrências expandidas).
    list: ({ inicio, fim } = {}, opts) =>
      request('/eventos/', { params: { inicio, fim }, ...opts }),
    get: (id, opts) => request(`/eventos/${id}/`, opts),
    create: (evento, opts) => request('/eventos/', { method: 'POST', body: evento, ...opts }),
    update: (id, evento, opts) =>
      request(`/eventos/${id}/`, { method: 'PUT', body: evento, ...opts }),
    remove: (id, opts) => request(`/eventos/${id}/`, { method: 'DELETE', ...opts }),
    // escopo: 'serie' | 'ocorrencia' (+ data=YYYY-MM-DD p/ ocorrência).
    concluir: (id, { escopo, data } = {}, opts) =>
      request(`/eventos/${id}/concluir/`, {
        method: 'POST',
        body: {},
        params: { escopo, data },
        ...opts,
      }),
    remarcar: (id, { escopo, data } = {}, opts) =>
      request(`/eventos/${id}/remarcar/`, {
        method: 'POST',
        body: {},
        params: { escopo, data },
        ...opts,
      }),
  },

  // ---- Derivados (rotas avulsas, SEM barra) ----
  pendentes: (opts) => request('/pendentes', opts),
  feriados: ({ ano } = {}, opts) => request('/feriados', { params: { ano }, ...opts }),
  health: (opts) => request('/health', opts),
}

export { BASE_URL }
