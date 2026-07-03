# Handoff — Rotina Inteligente (frontend)

> **Para o agente que vai produzir o frontend.** Este pacote é autossuficiente:
> este documento (contratos, fluxos, estados), `wireframes.html` (as 6 telas,
> abra no navegador) e `slides.html` (visão geral apresentável). O visual segue
> o design system já existente no repo — tokens em `src/styles/tokens.css`,
> contrato visual em `Handoff de Design - MVP.html`. O backend correspondente
> está especificado em `Planejamento_Backend/docs/tasks/rotina-inteligente-implementacao.md`
> (marcos C1–C4); os endpoints abaixo espelham aquele plano.

## 1. O que é a feature

O Planejador ganha um **montador inteligente de rotina**: o usuário seleciona
tarefas do Inbox (com deadline/esforço/classe), o sistema gera **3–4 cenários
de rotina comparáveis** — cada um com métricas objetivas e trade-offs em
linguagem natural ("estendendo quinta até 20h, o sábado fica livre") — e o
usuário escolhe um para aplicar no calendário. O sistema **aprende com as
escolhas** (o cenário "Sugerido" fica cada vez mais a cara do usuário), permite
**replanejar a partir de agora** quando a vida atropela, e no futuro terá um
**agente conversacional** ("adiciona o trabalho de Física 2 pra sexta").

Arquitetura que o front precisa respeitar: **todo número na tela vem do
backend** (solver determinístico + métricas por código). A IA só propõe; o
front nunca calcula plano, score ou métrica — só apresenta.

## 2. Regras invioláveis de design (herdadas do handoff do MVP)

1. **Cor = classe.** Sessões de plano herdam a cor da classe da tarefa.
2. **Estado = tratamento, não matiz** (borda/opacidade/ícone).
3. **Violeta (`--ui`) é só da UI** — seleção, sugerido, ações primárias, agora.
4. Números/tempo/metadados em **IBM Plex Mono** (`--font-mono`); resto Hanken.
5. Novidade desta feature, mesma família das regras acima: **badge "Sugerido",
   score e seleção de cenário usam violeta** (são UI), nunca cor de classe.

## 3. As telas (ver `wireframes.html`, W1–W6)

| #  | Tela                       | Entrada                                    |
| -- | -------------------------- | ------------------------------------------ |
| W1 | Botão **Planejar** na topbar + seleção de tarefas elegíveis | topbar / Inbox |
| W2 | Espera da geração (estimativa + polling)                    | após W1        |
| W3 | **Comparação de cenários** (tela central da feature)        | após W2        |
| W4 | **Replanejar** — diff antes de aplicar + atalho "Hoje não"  | topbar/menu    |
| W5 | Concluir com **tempo real** (captura opcional de `real_min`)| dialog concluir |
| W6 | **Agente** (chat lateral) — fase futura, wireframe de direção | topbar        |

### W3 em detalhe (é o coração)

- Cards lado a lado (máx. 4), um por cenário: nome, intenção em 1 linha,
  **mini-mapa da semana** (7 colunas × intensidade de carga por dia — só
  densidade, sem horários), 3–4 métricas em mono (pico/dia, dias livres,
  folga média, fora da janela) com **delta vs. base** (▲▼), lista de
  trade-offs, botão "Aplicar este".
- O de maior score traz badge violeta **"Sugerido"** e vem pré-selecionado;
  o card "Base" sempre existe (é a referência dos deltas — não mostra deltas).
- Selecionar um card (sem aplicar) mostra **preview das sessões no calendário**
  de fundo com opacidade reduzida (padrão "ghost") — aplicar confirma.
- `ia_indisponivel: true` ⇒ mostrar aviso discreto ("cenários padrão — IA
  offline") e seguir normal: os arquétipos sempre vêm.

## 4. Contratos de API (backend marcos C1b/C2/C3)

Base: mesma API local sem auth do MVP. Rotas `path()` sem barra final.

### Gerar cenários

```
POST /planejamento/cenarios
  {tarefa_ids: [uuid], preferencias?: {...}, horizonte?: "AUTOMATICO"|"SEMANA"|"DUAS_SEMANAS"|"MES"}
→ 202 {job_id, tempo_estimado_s}     (usar na barra de progresso de W2)
→ 200 corpo completo                  (cache hit — pular W2)
→ 400/422 tarefas inválidas           (mesmo shape do /planejar-ia atual)

GET /planejamento/cenarios/{job_id}   (polling ~2s, como o planejar-ia hoje)
→ 200 {status: "PROCESSANDO"}
→ 200 {status: "PRONTO",
       cenarios: [{id, nome, intencao, sugerido: bool, score,
                   plano: {sessoes: [{tarefa_id, tarefa_titulo, classe_id,
                                      inicio, fim, dur_min}], nao_alocado: [...]},
                   metricas: {pico_min_dia, dias_livres, fds_livres,
                              folga_media_h, min_fora_janela, fragmentacao,
                              nao_alocado_min},
                   metricas_vs_base: {…mesmas chaves, deltas},
                   trade_offs: ["Sábado fica livre", "Quinta vai até 20h"]}],
       pesos_usados: {...}, ia_indisponivel?: true}
```

### Escolher/aplicar

```
POST /planejamento/cenarios/escolher
  {job_id, cenario_id, aplicar: bool}
→ 200 {aplicado: bool, eventos_criados?: [...]}
```

**Sempre** chamar ao confirmar (mesmo `aplicar=false` num "só salvar escolha"
futuro): é o que alimenta o aprendizado de pesos. Após aplicar, invalidar o
estado local de eventos (as sessões viram eventos reais no calendário).

### Replanejar

```
POST /planejamento/replanejar            {dias_bloqueados?: ["YYYY-MM-DD"], preferencias?}
→ 200 {plano, diff: {movidas: [{tarefa_titulo, de, para}], criadas, removidas,
       inalteradas}, metricas, metricas_vs_anterior}          (simulação, nada persiste)

POST /planejamento/replanejar/aplicar    (mesmo corpo; recalcula e persiste)
→ 200 {diff, eventos_criados, eventos_removidos}
```

"Hoje não" (emergência/cansaço) = replanejar com `dias_bloqueados=[hoje]` —
é um atalho de UI, não um endpoint.

### Tempo real na conclusão (C3)

O endpoint de concluir existente passa a aceitar `{"real_min": 90}` opcional.
UI (W5): no dialog de concluir sessão de plano, campo mono "Quanto levou?"
pré-preenchido com o planejado, com escape óbvio ("pular") — NUNCA bloquear a
conclusão por causa disso.

## 5. Estados que a UI precisa cobrir

- **Espera com estimativa** (W2): `tempo_estimado_s` na resposta 202 alimenta
  barra de progresso honesta; IA local em CPU ⇒ dezenas de segundos.
- **Cache hit**: 200 direto no POST ⇒ pular W2 (sem flash de loading).
- **`ia_indisponivel: true`**: aviso discreto; fluxo idêntico (arquétipos vêm).
- **`nao_alocado` não vazio** num cenário: alerta âmbar no card ("não coube:
  X min de Y") — o usuário pode escolher assim mesmo.
- **Tarefas inelegíveis** na seleção (W1): sem deadline/esforço/classe ⇒
  desabilitadas com o motivo inline e link "completar" (abre o painel da tarefa).
- **Diff vazio** no replanejar: "nada muda" — não abrir tela de diff.

## 6. Sugestões (não requisitos)

- **Mini-mapa da semana nos cards**: barras de densidade por dia batem mais
  rápido que números; usar `--ui-tint`→`--ui` como escala (é UI, não classe).
- Deltas com sinal semântico: verde `--done` para melhora, âmbar `--pend` para
  custo — nunca vermelho `--crit` (não é erro, é trade-off).
- Preview "ghost" das sessões: mesma técnica visual de arrastar-evento do MVP.
- Registrar em qual ordem os cards foram exibidos ao chamar `escolher` (se o
  backend pedir isso depois, ajuda a debiasar o aprendizado).
- W6 (agente): não construir agora; o wireframe existe para as decisões de
  layout de W1–W5 não bloquearem um painel de chat depois (mesma largura
  `--panel-w`).

## 7. Ordem sugerida de construção (1 marco = 1 PR, como no PLAN.md)

- **F1** — W1+W2+W3: fluxo completo de cenários contra o backend C1b.
- **F2** — W4: replanejar + "Hoje não" (backend C2).
- **F3** — W5: tempo real no concluir (backend C3; mudança pequena).
- **F4** — W6: agente conversacional (backend C4; aguardar MCP pronto).

F1 pode começar com mocks dos contratos acima (o repo já tem o padrão
store/apiStore para isso) e trocar para HTTP quando o backend C1b sair.
