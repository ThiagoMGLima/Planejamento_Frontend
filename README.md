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
npm run dev      # sobe em http://localhost:5173
npm run build    # build de produção
```

## Estado do projeto — Marcos

- **Marco 1 — Fundação, design tokens e shell.** Scaffolding Vite + React;
  `src/styles/tokens.css` com todos os tokens do handoff §2.2–2.4; fontes;
  shell de layout; modelo de dados em JSDoc (`src/store/types.js`); 5 classes
  padrão seedadas (`src/store/seed.js`).
- **Marco 2 (este PR) — Componentes e telas.** Store local (contexto + reducer
  + persistência em `localStorage`, chave `planejador:v2`) com interface única
  de CRUD; componentes (`EventBlock`, `InboxCard`, `MiniCalendar`, `NowLine`,
  `SidePanel`, `Topbar`); views **Dia/Semana/Mês** renderizando do store;
  painéis do **Evento** e de **Pendentes** (abrir/fechar por ✕/scrim/Esc);
  navegação de views (segmented, setas, "Hoje"). Estado seedado com dados de
  exemplo na primeira carga.
- **Marco 3** — comportamentos (arrasto Inbox→horário, conclusão/pendência
  derivada, recorrência, feriados).
- **Marco 4** — integração com a API local (`VITE_API_URL`), testes e build.

## Backend

Repo separado (`planejador-backend`) expõe uma API REST **local e sem
autenticação** (single-user). O frontend não tem login. Até o Marco 4 o app roda
inteiramente sobre `localStorage`, espelhando os formatos da API.
