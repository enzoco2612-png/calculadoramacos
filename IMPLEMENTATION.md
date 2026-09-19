# IMPLEMENTATION.md

Ordem fixa: Bloco 1 → 2 → 3 → 4. Fontes: `SPEC.md`, `design.pen`, `PLAN.md`.

Entrega final: **web** (`npm run dev` / `npm run build`) + **desktop Tauri**, com UI e lógica compartilhadas; persistência via `CalculationRepository` (SQLite no Tauri, IndexedDB no browser).

**Status:** BLOCOS 1–4 concluídos — validação final web + desktop.

---

## BLOCO 1 — Fundação

**Objetivo:** Scaffold Tauri 2 + React + TypeScript + Vite; tipos; Calculation Engine e State Machine conforme `SPEC.md`, com testes unitários verdes.

**Arquivos/módulos principais:**

- scaffold do app (`src-tauri/`, Vite + React)
- `src/calculator/types.ts` — estados, eventos, operadores, contexto
- `src/calculator/engine.ts` — `add/sub/mul/div`, `percent`, `negate`, `roundToSignificant`, `formatDisplay`, parse de operando
- `src/calculator/stateMachine.ts` — reducer/transições (`Input`, `OpReady`, `Result`, `Error`)
- `src/calculator/engine.test.ts`
- `src/calculator/stateMachine.test.ts`

**Testes necessários:**

- Engine: quatro operações, `%`, negate, `0,1+0,2` → `0,3`, ÷0, overflow `>= 10^12`, round half away from zero, format com `,`
- State Machine: troca de operador, encadeamento, `=` com `b=acc`, `=` repetido, novo número/operador após resultado, AC, backspace em `b`, `%` em `Result` limpa `lastB`, saída de `Error`

**Critério de conclusão:** testes unitários do engine e da state machine passando; nenhum UI além do scaffold mínimo; sem SQLite.

---

## BLOCO 2 — Interface

**Objetivo:** Reproduzir o `design.pen` (janela, display, keypad, tokens) e conectar a UI à State Machine, com teclado físico.

**Arquivos/módulos principais:**

- `src/styles/tokens.css` (ou equivalente) — variáveis do `design.pen`
- `src/components/CalculatorWindow.tsx`
- `src/components/Display.tsx` — expressão + resultado
- `src/components/Keypad.tsx` — grid 5×4; Convert/Keypad Mode stubs desabilitados
- `src/components/WindowControls.tsx` — traffic lights (fechar/minimizar; maximize inativo)
- `src/hooks/useCalculator.ts` — despacha eventos para a State Machine
- `src/hooks/useKeyboard.ts` — mapa SPEC §8
- config de janela Tauri (tamanho ~456×816, decoração alinhada ao design)

**Testes necessários:**

- Teclado: teclas do mapa geram os mesmos eventos dos botões
- UI smoke: display e keypad renderizam; Convert/Keypad Mode desabilitados

**Critério de conclusão:** app abre com visual alinhado ao `design.pen`; todos os fluxos da SPEC §10 exercitáveis por clique e teclado; cálculo ainda só em memória.

---

## BLOCO 3 — Persistência (CalculationRepository)

**Objetivo:** Abstrair persistência por `CalculationRepository`; History Service; adapters SQLite (Tauri) e IndexedDB (browser); seleção automática por ambiente; gravar após `=` ok sem UI de histórico; falha de persistência nunca bloqueia o cálculo.

**Arquivos/módulos principais:**

1. **Interface `CalculationRepository`**
   - `src/history/CalculationRepository.ts` (ou equivalente) — contrato `insert` / `list` / `clear` (e tipos do registro `calculations`)
   - React **não** executa SQL nem acessa IndexedDB diretamente

2. **History Service**
   - `src/history/historyService.ts` — após `=` sucesso, monta `{ expression, result }` e chama somente `CalculationRepository`
   - engole/registra falha sem reverter resultado na UI / State Machine

3. **Implementação SQLite / Tauri (desktop)**
   - `TauriSqliteCalculationRepository` (client TS + comandos IPC)
   - `src-tauri/src/db.rs` / `repository.rs` — open, migrate, insert, list, clear
   - React não fala SQL; Engine e State Machine não conhecem Tauri/SQLite

4. **Implementação IndexedDB / browser (web)**
   - `IndexedDbCalculationRepository`
   - object store alinhado ao modelo lógico da SPEC §7
   - encapsulado atrás da interface; UI/History não usam IndexedDB direto

5. **Seleção automática do adapter**
   - factory (ex.: `createCalculationRepository()`) detecta ambiente Tauri vs. navegador
   - History Service recebe a interface; zero branches de plataforma na UI/Engine/State Machine

6. **Migrations SQLite**
   - `src-tauri/migrations/001_init.sql` — `calculations` + índice `idx_calculations_created_at` + `schema_migrations`
   - aplicar na abertura do app desktop

7. **Persistência de histórico**
   - `=` bem-sucedido → History Service → `insert`
   - sem UI de listagem na V1
   - web: IndexedDB local; desktop: SQLite local

**Testes necessários:**

8. **Repositories (dois adapters)**
   - SQLite: migration, insert, list por `created_at DESC`, clear; falha de insert sem throw ao caller
   - IndexedDB: insert, list por `created_at DESC`, clear; falha de insert sem throw ao caller

9. **History Service**
   - depende só de `CalculationRepository` (mock)
   - `=` sucesso → chama `insert` com expression/result corretos
   - não acopla a SQLite/IndexedDB/Tauri

10. **Falha de persistência**
    - insert/list/open falhando: resultado permanece na UI; calculadora continua operando
    - cobrir cenário web e desktop (ou mock do adapter correspondente)

**Critério de conclusão:**

- `=` ok persiste via adapter correto ao ambiente;
- mesma State Machine / Engine / UI / History Service em web e desktop;
- `npm run dev` no browser usa IndexedDB; desktop Tauri usa SQLite;
- falha simulada de persistência mantém resultado na UI;
- sem tela de histórico na V1.

---

## BLOCO 4 — Validação final (web + desktop)

**Objetivo:** Validar aceitação, visual, testes e builds das duas entregas; preparar deploy web; corrigir desvios sem alterar a arquitetura aprovada.

**Arquivos/módulos principais:**

- checklist de validação (não exige novos módulos de domínio)
- correções pontuais em UI / SM / engine / persistência conforme bugs encontrados
- scripts/config já existentes: `npm test`, `npm run dev`, `npm run build`, build Tauri
- notas/checklist de preparação para deploy web (estáticos do Vite)

**Testes / validações necessárias:**

- **Testes finais web:** app no navegador sem runtime Tauri; histórico via IndexedDB; fluxos SPEC §10
- **Testes finais Tauri:** app desktop; histórico via SQLite; mesma UI/lógica da web
- **E2E:** smoke dos Given/When/Then da SPEC §10 (clique e teclado) em web e desktop (incl. `=` em `OpReady` → `5+5=10`)
- **Validação visual** lado a lado com `design.pen` (cores, hierarquia display, keypad, traffic lights, stubs)
- **`npm test`** — suite unitária + integração (engine, SM, History Service, ambos repositories, falha de persistência)
- **`npm run build`** — build de produção web conclui com sucesso
- **`npm run dev`** — smoke: abre no navegador e opera a calculadora
- **Build desktop Tauri** — `tauri build` (ou equivalente do projeto) conclui na plataforma host
- **Preparação para deploy web** — artefatos de `npm run build` prontos para hosting estático; checklist de smoke pós-deploy (abrir URL, calcular, histórico IndexedDB)

**Critério de conclusão:**

- critérios de aceitação SPEC §10 ok em web e desktop;
- desvios visuais críticos vs. `design.pen` corrigidos;
- `npm test`, `npm run build` e build Tauri verdes;
- `npm run dev` validado;
- checklist de deploy web preenchido;
- nenhuma duplicação de UI/matemática; persistência continua atrás de `CalculationRepository`.
