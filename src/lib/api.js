/**
 * Cliente HTTP do backend (Marco 4) — `fetch` apontando para a API local, SEM
 * header de auth (o backend é aberto, single-user). Os endpoints abaixo são os
 * fixados no PLAN.md. Este arquivo é o ESQUELETO: a plumbing (URL, query, erros,
 * JSON) está pronta; a troca da implementação do `store` por estas chamadas e o
 * mapeamento final de campos acontecem quando o contrato do backend (OpenAPI)
 * for confirmado — ver os blocos marcados com TODO(contrato).
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

/**
 * Wrapper único de request. Sem auth. Lança ApiError em status >= 400.
 * @param {string} path  Caminho relativo (ex.: '/eventos').
 * @param {{ method?: string, body?: any, params?: object, signal?: AbortSignal }} [opts]
 */
export async function request(path, { method = 'GET', body, params, signal } = {}) {
  const res = await fetch(`${BASE_URL}${path}${qs(params)}`, {
    method,
    signal,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let errBody = null
    try {
      errBody = await res.json()
    } catch {
      /* sem corpo JSON */
    }
    throw new ApiError(`${method} ${path} → ${res.status}`, { status: res.status, body: errBody })
  }

  if (res.status === 204) return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

/**
 * Superfície da API espelhando a interface do `store` (handoff §6 + PLAN Marco 4).
 *
 * TODO(contrato): confirmar contra o OpenAPI do backend —
 *  - nomes de campo (rastreia_conclusao / rastrear_conclusao / esforco_estimado /
 *    origem_tarefa / regra_recorrencia / status_efetivo);
 *  - formato de `Classe.cor` (objeto {bg,st,tx} vs hex/chave de paleta);
 *  - representação da OCORRÊNCIA expandida em GET /eventos (id próprio vs
 *    evento_id + data) e como `concluir`/`remarcar?escopo=ocorrencia` a identificam;
 *  - formato de data (ISO com/sem timezone).
 * Quando confirmado, adicionar aqui as funções de mapeamento DTO↔modelo.
 */
export const api = {
  // ---- Classes ----
  classes: {
    list: (opts) => request('/classes', opts),
    create: (classe, opts) => request('/classes', { method: 'POST', body: classe, ...opts }),
    update: (id, classe, opts) =>
      request(`/classes/${id}`, { method: 'PUT', body: classe, ...opts }),
    remove: (id, opts) => request(`/classes/${id}`, { method: 'DELETE', ...opts }),
  },

  // ---- Tarefas (Inbox) ----
  tarefas: {
    list: (opts) => request('/tarefas', opts),
    create: (tarefa, opts) => request('/tarefas', { method: 'POST', body: tarefa, ...opts }),
    update: (id, tarefa, opts) =>
      request(`/tarefas/${id}`, { method: 'PUT', body: tarefa, ...opts }),
    remove: (id, opts) => request(`/tarefas/${id}`, { method: 'DELETE', ...opts }),
    // Promove a tarefa a evento no horário (corpo: inicio/fim/classe — TODO confirmar).
    promover: (id, body, opts) =>
      request(`/tarefas/${id}/promover`, { method: 'POST', body, ...opts }),
  },

  // ---- Eventos (já expandidos pelo servidor; status_efetivo vem do backend) ----
  eventos: {
    list: ({ inicio, fim } = {}, opts) => request('/eventos', { params: { inicio, fim }, ...opts }),
    get: (id, opts) => request(`/eventos/${id}`, opts),
    create: (evento, opts) => request('/eventos', { method: 'POST', body: evento, ...opts }),
    update: (id, evento, opts) =>
      request(`/eventos/${id}`, { method: 'PUT', body: evento, ...opts }),
    remove: (id, opts) => request(`/eventos/${id}`, { method: 'DELETE', ...opts }),
    concluir: (id, body, opts) =>
      request(`/eventos/${id}/concluir`, { method: 'POST', body, ...opts }),
    // escopo: 'ocorrencia' | 'serie' (handoff §6: Remarcar devolve ao Inbox).
    remarcar: (id, { escopo = 'ocorrencia', ...body } = {}, opts) =>
      request(`/eventos/${id}/remarcar`, { method: 'POST', params: { escopo }, body, ...opts }),
  },

  // ---- Derivados (servidor) ----
  pendentes: {
    list: (opts) => request('/pendentes', opts),
  },
  feriados: {
    list: ({ ano } = {}, opts) => request('/feriados', { params: { ano }, ...opts }),
  },
}

export { BASE_URL }
