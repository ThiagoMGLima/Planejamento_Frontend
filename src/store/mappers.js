/**
 * Mapeamento DTO (backend) ↔ modelo (frontend) — Marco 4. Concentra TODAS as
 * divergências de contrato num só lugar, para o resto do app continuar falando o
 * modelo do front. Ver memória `backend-api-contract`.
 *
 * Divergências tratadas:
 *  - Classe.cor: hex único (backend) ↔ { bg, st, tx } (front) — via colors.js.
 *  - descricao (backend) ↔ detalhes (front, em Evento).
 *  - classe aninhada na leitura ↔ classe_id na escrita.
 *  - Recorrência SEMANAL: dias 0=segunda..6=domingo (backend) ↔ getDay() 0=domingo (front).
 *  - Ocorrência expandida ↔ "instância" do front (id `evento@data`).
 */

import { corClasse } from '../lib/colors.js'

/** getDay() do JS (0=dom) → convenção do backend (0=seg). */
export const jsToBackendDia = (d) => (d + 6) % 7
/** Convenção do backend (0=seg) → getDay() do JS (0=dom). */
export const backendToJsDia = (d) => (d + 1) % 7

/** ISO tz-aware (UTC) a partir de Date | string naive/ISO. */
function toApiDateTime(value) {
  if (value == null) return value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`).toISOString()
  return new Date(value).toISOString()
}

// ---- Classe ---------------------------------------------------------------
export function classeFromApi(dto) {
  return {
    id: dto.id,
    nome: dto.nome,
    cor: corClasse(dto.cor),
    rastreia_conclusao: dto.rastreia_conclusao,
  }
}

export function classeToApi(model) {
  const cor = typeof model.cor === 'string' ? model.cor : model.cor?.bg
  return { nome: model.nome, cor, rastreia_conclusao: !!model.rastreia_conclusao }
}

// ---- Tarefa ---------------------------------------------------------------
export function tarefaFromApi(dto) {
  return {
    id: dto.id,
    titulo: dto.titulo,
    classe: dto.classe?.id ?? null,
    detalhes: dto.descricao ?? '',
    deadline: dto.deadline ?? null,
    esforco_estimado: dto.esforco_estimado ?? null,
    status: dto.status,
  }
}

export function tarefaToApi(model) {
  const body = { titulo: model.titulo, descricao: model.detalhes ?? '' }
  if (model.classe) body.classe_id = model.classe
  if (model.deadline) body.deadline = toApiDateTime(model.deadline)
  if (model.esforco_estimado != null) body.esforco_estimado = model.esforco_estimado
  return body
}

// ---- Regra de recorrência -------------------------------------------------
export function regraFromApi(dto) {
  if (!dto) return undefined
  const dias =
    dto.tipo === 'SEMANAL' ? dto.dias.map(backendToJsDia).sort((a, b) => a - b) : dto.dias
  return {
    tipo: dto.tipo,
    dias,
    ignorar_feriados: !!dto.ignorar_feriados,
    data_fim: dto.data_fim ?? undefined,
  }
}

export function regraToApi(model) {
  if (!model || !model.dias?.length) return null
  const dias =
    model.tipo === 'SEMANAL' ? model.dias.map(jsToBackendDia).sort((a, b) => a - b) : model.dias
  return {
    tipo: model.tipo,
    dias,
    ignorar_feriados: !!model.ignorar_feriados,
    data_fim: model.data_fim ?? null,
  }
}

// ---- Evento (forma "crua" para edição no painel) --------------------------
export function eventoFromApi(dto) {
  return {
    id: dto.id,
    titulo: dto.titulo,
    detalhes: dto.descricao ?? '',
    inicio: dto.inicio,
    fim: dto.fim,
    classe: dto.classe?.id ?? null,
    rastrear_conclusao: dto.rastrear_conclusao,
    status: dto.status,
    origem_tarefa: dto.origem_tarefa ?? undefined,
    regra_recorrencia: regraFromApi(dto.regra_recorrencia),
  }
}

export function eventoToApi(model) {
  const body = {
    titulo: model.titulo,
    descricao: model.detalhes ?? '',
    inicio: toApiDateTime(model.inicio),
    fim: toApiDateTime(model.fim),
    rastrear_conclusao: !!model.rastrear_conclusao,
  }
  if (model.classe) body.classe_id = model.classe
  if ('status' in model)
    body.status = model.rastrear_conclusao ? (model.status ?? 'AGENDADO') : null
  if ('regra_recorrencia' in model) body.regra_recorrencia = regraToApi(model.regra_recorrencia)
  return body
}

// ---- Item da janela (/eventos) → "instância" do front ---------------------
export function instanceFromApiItem(item) {
  const occDateISO = item.ocorrencia?.data ?? null
  const recorrente = !!item.ocorrencia
  return {
    id: recorrente ? `${item.id}@${occDateISO}` : item.id,
    eventoId: item.id,
    occDateISO,
    recorrente,
    titulo: item.titulo,
    classe: item.classe?.id ?? null,
    detalhes: item.descricao ?? '',
    inicio: item.inicio,
    fim: item.fim,
    rastrear_conclusao: item.rastrear_conclusao,
    // status_efetivo vem do servidor (PENDENTE derivado lá); EventBlock o repassa.
    status: item.status_efetivo ?? item.status ?? undefined,
  }
}
