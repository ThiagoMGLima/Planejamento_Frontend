# Planejador de Rotina — Frontend

App web pessoal de planejamento de rotina: um **calendário** (Dia/Semana/Mês) +
um **Inbox** de tarefas, com o ritual de arrastar uma tarefa do Inbox para um
horário. Execução **100% local** via Vite.

> **Contrato visual/comportamental:** `Handoff de Design - MVP.html` (tokens,
> componentes, telas, interações) é a fonte da verdade. O plano de produção
> está em `PLAN.md`.

## Stack

- **React + Vite** (JSX puro)
- CSS com as custom properties do handoff (`src/styles/tokens.css`)
- Fontes **Hanken Grotesk** (UI) e **IBM Plex Mono** (tempo/metadados)

## Rodar localmente

```bash
npm install
npm run dev          # sobe em http://localhost:5173
npm run build        # build de produção
npm run test         # testes em watch (Vitest)
npm run test:run     # testes uma vez (CI)
npm run lint         # ESLint
npm run format       # Prettier (escreve)
```

## Configuração (.env) — origem dos dados

```bash
cp .env.example .env
```

- `VITE_DATA_SOURCE=local` (padrão) — store em `localStorage` (chave
  `planejador:v2`). Roda sem backend.
- `VITE_DATA_SOURCE=api` — consome o backend HTTP em `VITE_API_URL`
  (ex.: `http://localhost:8000/api/v1`). Suba o backend antes:

  ```bash
  cd ../backend/Planejamento_Backend && cp .env.example .env && docker compose up -d --build web
  ```

A interface do store é a mesma nos dois modos — só troca o provider
(`src/store/store.jsx` ↔ `src/store/apiStore.jsx`).

## Estado do projeto — Marcos

- **Marco 1 — Fundação, design tokens e shell.** Scaffolding Vite + React;
  `src/styles/tokens.css` com todos os tokens do handoff §2.2–2.4; fontes;
  shell de layout; modelo de dados em JSDoc (`src/store/types.js`); 5 classes
  padrão seedadas (`src/store/seed.js`).
- **Marco 2 — Componentes e telas.** Store local (contexto + reducer +
  persistência em `localStorage`, chave `planejador:v2`) com interface única de
  CRUD; componentes (`EventBlock`, `InboxCard`, `MiniCalendar`, `NowLine`,
  `SidePanel`, `Topbar`); views **Dia/Semana/Mês**; painéis do **Evento** e de
  **Pendentes**; navegação de views.
- **Marco 3 — Comportamentos e interações.** Arrasto Inbox→horário com **snap
  de 15min** e fantasma; **pendência derivada** (`status_efetivo` no cliente,
  nunca persistido); Concluir/Remarcar (Remarcar devolve ao Inbox);
  **recorrência** (editor + expansão local); **feriados** como etiqueta, nunca
  bloco.
- **Marco 4 — Integração com a API, testes e build.**
  - **Parte 1:** infra de testes (**Vitest + React Testing Library**), **ESLint
    + Prettier** e o esqueleto do cliente HTTP.
  - **Parte 2 (este PR):** **integração real com o backend**. `src/lib/api.js`
    (slashes/paginação/escopo do contrato real), `src/store/mappers.js`
    (DTO↔modelo: cor hex↔`{bg,st,tx}`, `descricao`↔`detalhes`, `classe_id`,
    conversão de dia da semana 0=seg↔0=dom, ocorrência↔instância) e
    `src/store/apiStore.jsx` (mesma interface do store, sobre HTTP). Selecionado
    por `VITE_DATA_SOURCE`. Expansão de recorrência, `status_efetivo` e feriados
    passam a vir do servidor.

## Backend

Repo separado (`../backend/Planejamento_Backend`, Django + DRF) expõe uma API
REST **local e sem autenticação** (single-user) sob `/api/v1`. O frontend não
tem login. Com `VITE_DATA_SOURCE=local` o app roda 100% sobre `localStorage`;
com `=api` consome a API real.
