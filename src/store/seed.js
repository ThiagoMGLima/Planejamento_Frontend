/**
 * Estado inicial seedado — classes padrão do handoff §2.2, com cores e
 * `rastreia_conclusao` exatos. O store real (contexto + reducer + persistência
 * em localStorage sob a chave "planejador:v2") chega no Marco 2; aqui só
 * definimos a semente para o shell e para o Marco 2 reaproveitar.
 *
 * @typedef {import('./types.js').Classe} Classe
 */

/** Chave de persistência em localStorage (igual ao protótipo). @type {string} */
export const STORAGE_KEY = 'planejador:v2'

/**
 * Cinco classes padrão. Cores idênticas às custom properties de tokens.css.
 * Nenhuma é violeta — violeta é reservado à UI (handoff §2, regra 3).
 * @type {Classe[]}
 */
export const CLASSES_PADRAO = [
  {
    id: 'aula',
    nome: 'Aula',
    cor: { bg: '#e6f1fb', st: '#9cc4e8', tx: '#185fa5' },
    rastreia_conclusao: false,
  },
  {
    id: 'basica',
    nome: 'Tarefas básicas',
    cor: { bg: '#f0efe9', st: '#d8d6cd', tx: '#6a695f' },
    rastreia_conclusao: false,
  },
  {
    id: 'estudar',
    nome: 'Estudar',
    cor: { bg: '#ecf4df', st: '#b9d795', tx: '#3b6d11' },
    rastreia_conclusao: true,
  },
  {
    id: 'prova',
    nome: 'Prova',
    cor: { bg: '#fbeaea', st: '#e0b0b0', tx: '#a32d2d' },
    rastreia_conclusao: false,
  },
  {
    id: 'trabalho',
    nome: 'Trabalho',
    cor: { bg: '#e1f5ee', st: '#9fe1cb', tx: '#0f6e56' },
    rastreia_conclusao: true,
  },
]

/**
 * Forma do estado persistido. Espelha os formatos da API para o Marco 4 ser
 * trivial. Nos Marcos 1–3 vive em localStorage.
 */
export const initialState = {
  classes: CLASSES_PADRAO,
  tarefas: [],
  eventos: [],
  view: 'semana', // 'dia' | 'semana' | 'mes'
  cursor: null, // data-âncora da navegação (ISO date) — definida pelo store no Marco 2
}
