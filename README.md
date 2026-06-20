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

## Configuração (.env)

A integração com o backend (Marco 4) lê `VITE_API_URL`. Copie o exemplo:

```bash
cp .env.example .env   # VITE_API_URL=http://localhost:8000/api/v1
```

Nos Marcos 1–3 a variável é ignorada — o app roda 100% sobre `localStorage`
(chave `planejador:v2`).

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
- **Marco 4 — em andamento.**
  - **Parte 1 (este PR):** infra de testes (**Vitest + React Testing Library**)
    e suíte cobrindo `status_efetivo`, snap/grade, expansão de recorrência,
    `EventBlock` e o store; **ESLint + Prettier**; e o **esqueleto do cliente
    HTTP** (`src/lib/api.js`) com os endpoints do PLAN (sem auth).
  - **Parte 2 (a seguir):** trocar a implementação do `store` por `src/lib/api.js`
    quando o contrato do backend (OpenAPI) for confirmado — a interface do store
    não muda, então views/componentes ficam intactos.

## Backend

Repo separado (`planejador-backend`) expõe uma API REST **local e sem
autenticação** (single-user). O frontend não tem login. Até o Marco 4 o app roda
inteiramente sobre `localStorage`, espelhando os formatos da API.
