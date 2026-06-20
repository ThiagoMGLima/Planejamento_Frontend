/**
 * Modelo de dados do Planejador — espelha os campos da API (handoff §6 +
 * Especificação v1.1 §3). Definido em JSDoc para que a troca do Marco 4
 * (localStorage → cliente HTTP) seja trivial: os formatos já batem.
 *
 * Convenção de nomes (igual à spec/API):
 *   - Classe.rastreia_conclusao  → padrão de rastreamento DA CLASSE.
 *   - Evento.rastrear_conclusao  → valor efetivo NO EVENTO (herda da classe, com override).
 *
 * Datas trafegam como string ISO 8601 (ex.: "2026-06-30T13:00:00"), como na API.
 */

/** @typedef {'INBOX' | 'PROMOVIDA'} StatusTarefa */
/** @typedef {'AGENDADO' | 'PENDENTE' | 'CONCLUIDO' | 'REMARCADO'} StatusEvento */
/** @typedef {'SEMANAL' | 'MENSAL'} TipoRecorrencia */

/**
 * Tipo de atividade. É o eixo da paleta: define a cor do evento e o padrão de
 * "Acompanhar conclusão". Classes são definíveis pelo usuário.
 * @typedef {Object} Classe
 * @property {string} id
 * @property {string} nome
 * @property {ClasseCor} cor                 Trio de cores (bg/st/tx) da classe.
 * @property {boolean} rastreia_conclusao    Padrão de rastreamento para eventos desta classe.
 */

/**
 * Trio de cores de uma classe (handoff §2.2). bg = fundo do bloco, st = traço
 * (barra/borda), tx = texto. Persistido junto da classe para o backend ser a
 * fonte da verdade da paleta.
 * @typedef {Object} ClasseCor
 * @property {string} bg
 * @property {string} st
 * @property {string} tx
 */

/**
 * Pendência sem horário, aguardando agendamento (Inbox).
 * @typedef {Object} Tarefa
 * @property {string} id
 * @property {string} titulo
 * @property {string} [classe]               id da Classe (opcional até o agendamento).
 * @property {string} [deadline]             ISO datetime — prazo (usado na Fase 2).
 * @property {number} [esforco_estimado]     Duração/complexidade estimada, em minutos.
 * @property {StatusTarefa} status           INBOX | PROMOVIDA.
 */

/**
 * Item posicionado no calendário, com início e fim.
 * @typedef {Object} Evento
 * @property {string} id
 * @property {string} titulo
 * @property {string} inicio                 ISO datetime.
 * @property {string} fim                    ISO datetime.
 * @property {string} classe                 id da Classe (define a cor).
 * @property {boolean} rastrear_conclusao    Efetivo no evento (herda da classe, override manual).
 * @property {StatusEvento} [status]         Só quando rastrear_conclusao = true.
 * @property {string} [detalhes]
 * @property {string} [origem_tarefa]        id da Tarefa que originou o bloco.
 * @property {string} [regra_recorrencia]    id da RegraRecorrencia.
 */

/**
 * Regra de repetição de um evento.
 * @typedef {Object} RegraRecorrencia
 * @property {string} id
 * @property {TipoRecorrencia} tipo          SEMANAL (dias da semana) | MENSAL (dias do mês).
 * @property {number[]} dias                 SEMANAL: 0–6 (dom–sáb); MENSAL: 1–31.
 * @property {boolean} ignorar_feriados
 * @property {string} [data_fim]             ISO date — fim da série (opcional).
 */

/**
 * Materialização de um evento recorrente numa data específica. Carrega override
 * opcional de status/horário sem afetar a série.
 * @typedef {Object} Ocorrencia
 * @property {string} data                   ISO date.
 * @property {StatusEvento} [status]         Override de status só desta ocorrência.
 * @property {string} [inicio]               Override de horário (ISO datetime).
 * @property {string} [fim]                  Override de horário (ISO datetime).
 */

export {}
