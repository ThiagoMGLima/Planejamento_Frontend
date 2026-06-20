import { startOfWeek, addDays, toISO, toDateISO } from '../lib/dates.js'

/**
 * Estado inicial seedado. As 5 classes padrão (handoff §2.2) são a base
 * inviolável; tarefas/eventos/feriados de exemplo são ancorados à semana
 * corrente apenas no primeiro carregamento (localStorage vazio), para que as
 * views e os painéis tenham conteúdo para renderizar e revisar. Em uso real o
 * usuário limpa/edita à vontade.
 *
 * @typedef {import('./types.js').Classe} Classe
 * @typedef {import('./types.js').Tarefa} Tarefa
 * @typedef {import('./types.js').Evento} Evento
 */

/** Chave de persistência em localStorage (igual ao protótipo). @type {string} */
export const STORAGE_KEY = 'planejador:v2'

/**
 * Cinco classes padrão. Cores idênticas às custom properties de tokens.css.
 * Nenhuma é violeta — violeta é reservado à UI (handoff §2, regra 3).
 * @type {Classe[]}
 */
export const CLASSES_PADRAO = [
  { id: 'aula', nome: 'Aula', cor: { bg: '#e6f1fb', st: '#9cc4e8', tx: '#185fa5' }, rastreia_conclusao: false },
  { id: 'basica', nome: 'Tarefas básicas', cor: { bg: '#f0efe9', st: '#d8d6cd', tx: '#6a695f' }, rastreia_conclusao: false },
  { id: 'estudar', nome: 'Estudar', cor: { bg: '#ecf4df', st: '#b9d795', tx: '#3b6d11' }, rastreia_conclusao: true },
  { id: 'prova', nome: 'Prova', cor: { bg: '#fbeaea', st: '#e0b0b0', tx: '#a32d2d' }, rastreia_conclusao: false },
  { id: 'trabalho', nome: 'Trabalho', cor: { bg: '#e1f5ee', st: '#9fe1cb', tx: '#0f6e56' }, rastreia_conclusao: true },
]

/**
 * Feriados nacionais (BR) 2026 — marcadores de dia, nunca blocos (handoff §5).
 * No Marco 4 passam a vir do backend (BrasilAPI). @type {{data:string,nome:string}[]}
 */
export const FERIADOS_2026 = [
  { data: '2026-01-01', nome: 'Confraternização Universal' },
  { data: '2026-02-16', nome: 'Carnaval' },
  { data: '2026-02-17', nome: 'Carnaval' },
  { data: '2026-04-03', nome: 'Sexta-feira Santa' },
  { data: '2026-04-21', nome: 'Tiradentes' },
  { data: '2026-05-01', nome: 'Dia do Trabalho' },
  { data: '2026-06-04', nome: 'Corpus Christi' },
  { data: '2026-09-07', nome: 'Independência' },
  { data: '2026-10-12', nome: 'N. Sra. Aparecida' },
  { data: '2026-11-02', nome: 'Finados' },
  { data: '2026-11-15', nome: 'Proclamação da República' },
  { data: '2026-11-20', nome: 'Consciência Negra' },
  { data: '2026-12-25', nome: 'Natal' },
]

/** Monta um Evento de exemplo no dia `offset` da semana corrente. */
function ev(weekStart, offset, hIni, hFim, titulo, classe, extra = {}) {
  const dia = addDays(weekStart, offset)
  const inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), Math.floor(hIni), (hIni % 1) * 60)
  const fim = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), Math.floor(hFim), (hFim % 1) * 60)
  return { id: `seed_ev_${offset}_${hIni}`, titulo, inicio: toISO(inicio), fim: toISO(fim), classe, ...extra }
}

/**
 * Constrói o estado inicial. Chamado pelo store quando não há nada persistido.
 */
export function buildInitialState(now = new Date()) {
  const ws = startOfWeek(now)
  /** @type {Tarefa[]} */
  const tarefas = [
    { id: 'seed_t1', titulo: 'Estudar P1 Cálculo', classe: 'estudar', deadline: toDateISO(addDays(ws, 11)), esforco_estimado: 180, status: 'INBOX' },
    { id: 'seed_t2', titulo: 'Relatório Física', classe: 'trabalho', esforco_estimado: 120, status: 'INBOX' },
    { id: 'seed_t3', titulo: 'Ler capítulo 4', esforco_estimado: 60, status: 'INBOX' },
  ]
  /** @type {Evento[]} */
  const eventos = [
    // Aula recorrente (Seg + Qua), demonstra a expansão local de ocorrências.
    ev(ws, 0, 8, 10, 'Cálculo I', 'aula', {
      regra_recorrencia: { tipo: 'SEMANAL', dias: [1, 3], ignorar_feriados: true },
    }),
    ev(ws, 0, 13, 15, 'Estudar P1 Cálculo', 'estudar', { rastrear_conclusao: true, status: 'AGENDADO' }),
    // AGENDADO no passado (ontem) → deriva PENDENTE sozinho (status_efetivo).
     evAbs(addDays(now, -1), 14, 15.5, 'Estudar Física', 'estudar', { rastrear_conclusao: true, status: 'AGENDADO' }),
    ev(ws, 1, 16, 18, 'Relatório Física', 'trabalho', { rastrear_conclusao: true, status: 'CONCLUIDO' }),
    ev(ws, 2, 12, 13, 'Almoço', 'basica'),
    ev(ws, 3, 10, 12, 'Prova de Física', 'prova'),
    ev(ws, 4, 19, 20.5, 'Estudar Cálculo', 'estudar', { rastrear_conclusao: true, status: 'AGENDADO' }),
  ]
  return {
    classes: CLASSES_PADRAO,
    tarefas,
    eventos,
    feriados: FERIADOS_2026,
    view: 'semana',
    cursorISO: toDateISO(now),
  }
}

/** Igual a `ev`, mas a partir de uma data absoluta (não offset da semana). */
function evAbs(dia, hIni, hFim, titulo, classe, extra = {}) {
  const inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), Math.floor(hIni), (hIni % 1) * 60)
  const fim = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), Math.floor(hFim), (hFim % 1) * 60)
  return { id: `seed_ev_abs_${toDateISO(dia)}_${hIni}`, titulo, inicio: toISO(inicio), fim: toISO(fim), classe, ...extra }
}
