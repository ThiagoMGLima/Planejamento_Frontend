# Plano de produção — Frontend do Planejador de Rotina

> **Como usar este arquivo.** Este é o plano aprovado para construir o frontend.
> Junto com `Handoff de Design - MVP.html` (o contrato visual/comportamental) e a
> `planejador-rotina-especificacao.html` (Especificação v1.1), ele é autossuficiente:
> numa sessão do Claude Code apontada para o repo `planejador-frontend`, basta pedir
> *"Leia o Handoff de Design e o PLAN.md e execute o Marco 1"*.

## Context

O Planejador de Rotina é uma app web pessoal de planejamento de rotina: um **calendário**
(Dia/Semana/Mês) + um **Inbox** de tarefas, com o ritual central de arrastar uma tarefa do
Inbox para um horário. O visual e os comportamentos exatos estão no **Handoff de Design -
MVP** (tokens, componentes, telas anotadas, interações) — ele é a **fonte da verdade** do
frontend. O protótipo funcional (`core/views/panels/app.jsx`, `Planejador.html`) está
**embutido** no HTML do handoff; extraia dele os tokens `:root` (§2.4) e as specs de
componentes.

Decisões que moldam o plano:
- **Projeto pessoal, execução 100% local.** Roda na máquina do dono via Vite
  (`npm run dev`). Sem deploy em nuvem.
- **Stack:** React + Vite (JSX puro, espelhando o protótipo), CSS com as custom
  properties do handoff. Fontes **Hanken Grotesk** (UI) e **IBM Plex Mono** (tempo/metadados).
- **Backend é um repo separado** (`planejador-backend`) que expõe uma API REST **local e
  sem autenticação** (single-user). O frontend **não tem login** — fala direto com a API
  em `localhost`.
- **Desacoplado por contrato.** Os Marcos 1–3 rodam sobre estado local
  (`localStorage`, chave `planejador:v2`, como no protótipo), espelhando exatamente os
  formatos de dados da API. Só o **Marco 4** troca o `localStorage` pelo cliente HTTP do
  backend. Assim o frontend nunca fica bloqueado esperando o backend.
- **Por etapas** — 4 marcos, cada um em seu PR, para revisão incremental.

**Três regras invioláveis (handoff §2):**
1. **Cor = classe.** A cor de qualquer evento vem sempre da sua classe. Nunca use cor para
   significar outra coisa no calendário.
2. **Estado = tratamento, não matiz.** Pendente/concluído são mostrados por
   borda/opacidade/ícone — mantendo a cor da classe.
3. **Violeta é só da UI.** Hoje, seleção, linha do agora e ações primárias usam violeta;
   nenhuma classe é violeta.

---

## Passo 0 — Repositório

- Repo `planejador-frontend` (privado), branch `main`.
- Cada marco = uma branch + um PR contra `main`.

---

## Marco 1 — Fundação, design tokens e shell  (PR 1)

- **Scaffolding** Vite + React (`npm create vite@latest`), estrutura `src/`
  (`components/`, `views/`, `panels/`, `store/`, `styles/`, `lib/`).
- **Design tokens** em `src/styles/tokens.css`: colar o bloco `:root` do handoff §2.4
  com **todas** as custom properties nomeadas — cores de classe (bg/st/tx), violeta de
  UI, estados (pendente âmbar, concluído verde, crítico vermelho), neutros/superfícies,
  linhas, raios, sombras, e os tokens de grade (barra 52px, sidebar 232px, painel 380px,
  cabeçalho 46px, régua 50px, hora 38px, faixa 06:00–23:30, snap 15min).
- **Fontes**: Hanken Grotesk + IBM Plex Mono (via `@fontsource` ou Google Fonts) e a
  escala tipográfica do §2.1 (mono **somente** para números/tempo/metadados).
- **Shell de layout** (sem lógica ainda): topbar 52px, sidebar 232px (mini-calendário +
  Inbox placeholders), área de calendário e slot do painel lateral 380px.
- **Modelo de dados em JS** em `src/store/types.js` (ou JSDoc): `Classe`, `Tarefa`,
  `Evento`, `RegraRecorrencia`, `Ocorrencia` — campos idênticos aos da API (handoff §6 e
  Especificação v1.1) para a troca do Marco 4 ser trivial.
- **Classes padrão** seedadas no estado inicial (handoff §2.2): Aula, Tarefas básicas,
  Estudar, Prova, Trabalho — com cores e `rastreia_conclusao` exatos.

**Critérios:** `npm run dev` sobe; o shell renderiza com as cores/tipografia/medidas dos
tokens; as 5 classes padrão existem no estado.

---

## Marco 2 — Componentes e telas  (PR 2)

- **Store local** em `src/store/`: contexto + reducer com persistência em `localStorage`
  (chave `planejador:v2`), expondo CRUD de Classe/Tarefa/Evento por uma interface única
  (`store` API) — desenhada para o Marco 4 só trocar a implementação por chamadas HTTP.
- **Componentes** (handoff §3): `EventBlock` (raio 11px, estados agendado/pendente/
  concluído/selecionado), `InboxCard` (draggable, barra de acento = traço da classe),
  `Topbar` (segmented Dia/Semana/Mês, botões Concluir/Remarcar/Salvar, pílula Pendentes
  com N>0), `MiniCalendar`, `NowLine` (linha do agora violeta só em hoje), `SidePanel`
  (380px, entra deslizando sobre scrim; fecha em ✕/scrim/Esc).
- **Telas/views** (handoff §4): grade **Semana** (7 colunas, 06h→23h30), **Dia** (coluna
  única ~760px), **Mês** (densidade por tom neutro + chips só para deadlines/feriados);
  **Painel do Evento** (seletor de classe, início/fim/detalhes, repetir, conclusão se
  rastreável, excluir/salvar) e **Painel de Pendentes**.
- Navegação de views (segmented, setas ±1 dia/7 dias/1 mês, botão "Hoje").

**Critérios:** as três views renderizam eventos/inbox a partir do store; abrir/fechar
painéis funciona; cor sempre vem da classe; estados visuais corretos por token.

---

## Marco 3 — Comportamentos e interações  (PR 3)

- **Arrasto Inbox → horário** (handoff §5): `InboxCard` draggable; sobre a grade calcula a
  hora pelo Y do cursor com **snap de 15min** e mostra o **fantasma** (bloco tracejado com
  horário); ao soltar, cria Evento (início = drop, duração = `esforco_estimado` ou 1h),
  herda classe + padrão de rastreamento, remove do Inbox e abre o painel do novo evento.
- **Conclusão & pendência derivadas** (handoff §6, máquina de estados): `status_efetivo`
  calculado no cliente (PENDENTE quando `agora > fim` + classe rastreia + ainda AGENDADO —
  nunca persistido); **Concluir** → CONCLUIDO (bloco esmaece + ✓); **Remarcar** → remove o
  evento e **devolve a tarefa ao Inbox**.
- **Recorrência básica** na UI: editor "Repetir na rotina" (dias + ignorar feriados);
  expansão local das ocorrências na janela visível (será substituída pela expansão do
  backend no Marco 4).
- **Feriados** como marcador de dia (etiqueta vermelha no cabeçalho/mini-calendário),
  **nunca** um bloco — não colide com a classe Prova.
- Atalhos: Esc/scrim/✕ fecham qualquer painel.

**Critérios:** arrasto cria evento com snap correto; pendente aparece sozinho ao vencer;
remarcar devolve ao Inbox; recorrência semanal/mensal aparece expandida na janela;
feriado some como bloco e vira etiqueta.

---

## Marco 4 — Integração com a API, testes e build  (PR 4)

> **Ponto de coordenação com o backend.** Iniciar quando o backend tiver entregue ao
> menos os Marcos 2–3 (CRUD + expansão de eventos/pendentes/feriados). Até lá, os Marcos
> 1–3 do frontend rodam 100% sobre `localStorage`.

- **Cliente HTTP** em `src/lib/api.js`: `fetch` apontando para a API local (ex.:
  `VITE_API_URL=http://localhost:8000/api/v1`), **sem header de auth** (backend é aberto).
- **Trocar a implementação do `store`** do `localStorage` para a API, mantendo a mesma
  interface: `classes`, `tarefas`, `eventos` (CRUD), `POST /tarefas/{id}/promover`,
  `GET /eventos?inicio&fim` (usa o `status_efetivo` **do servidor**), `POST /eventos/{id}/
  concluir`, `POST /eventos/{id}/remarcar?escopo=ocorrencia|serie`, `GET /pendentes`,
  `GET /feriados?ano=`. A expansão de recorrência passa a vir do backend.
- **Testes**: Vitest + React Testing Library — render dos estados do `EventBlock`,
  cálculo de `status_efetivo` no cliente, snap do arrasto, e o fluxo promover→agendar.
- **Build/lint**: `npm run build` limpo; ESLint + Prettier; opcional GitHub Actions
  (lint + testes).
- `README.md` (setup local, `VITE_API_URL`, comandos) apontando o handoff como contrato.

**Critérios:** app consome a API local de ponta a ponta (criar tarefa → promover →
calendário → concluir/remarcar → pendentes → feriados); suíte verde; build limpo.

---

## Critical files (no repo planejador-frontend)

- `src/styles/tokens.css`, `src/styles/global.css`
- `src/store/` (contexto/reducer, persistência, interface única do store)
- `src/components/{EventBlock,InboxCard,Topbar,MiniCalendar,NowLine,SidePanel}.jsx`
- `src/views/{DayView,WeekView,MonthView}.jsx`
- `src/panels/{EventPanel,PendingPanel}.jsx`
- `src/lib/api.js`, `src/lib/dates.js`
- `index.html`, `vite.config.js`, `.env.example`

Reaproveitar integralmente o `Handoff de Design - MVP.html` — ele já traz tokens exatos,
specs de componentes, telas anotadas, comportamentos e o modelo de dados. O protótipo
embutido é a referência funcional definitiva.

---

## Verificação (end-to-end, local)

1. `npm install` && `npm run dev` → shell com tokens corretos (cores/tipografia/grade).
2. Criar classes/tarefas; arrastar do Inbox para um horário (snap 15min, fantasma);
   evento herda a classe.
3. Alternar Dia/Semana/Mês; abrir painel do evento; deixar um evento rastreável vencer →
   vira pendente sozinho; **Concluir** esmaece; **Remarcar** devolve ao Inbox.
4. Recorrente semanal aparece expandido na janela; feriado vira etiqueta (não bloco).
5. **Marco 4**: subir o backend local (`docker compose up`), apontar `VITE_API_URL`, e
   repetir o fluxo consumindo a API real; `npm run build` limpo; testes verdes.
