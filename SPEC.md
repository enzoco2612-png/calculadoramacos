# SPEC — Calculadora Web + Desktop V1

Fontes: `PLAN.md` (escopo), `design.pen` (UI). Convert e Keypad Mode: stubs desabilitados.

Modelo: avaliação imediata estilo macOS (sem precedência de operadores). Engine TypeScript puro. Sem `eval()`.

Ambientes de entrega: **navegador web** e **aplicativo desktop Tauri**, com UI, design, State Machine, Calculation Engine, teclado e History Service compartilhados.

---

## 1. Entrada

### Números 0–9

- Cada dígito acrescenta ao operando em edição.
- Em `Result` ou `Error`, o primeiro dígito inicia novo operando (`Input`) e zera `op`/`lastB`.
- Em `OpReady`, o primeiro dígito (ou `,`) inicia o segundo operando e transiciona para `Input` com `acc`/`op` preservados.

### Separador decimal

- UI e teclado: `,` (design). Tecla `.` também insere decimal.
- No máximo um separador por operando.
- Se o operando for vazio ou só `0`, `,` produz `0,`.
- Display sempre com `,`; motor usa número interno.

### Zero à esquerda

- Inteiro: zeros iniciais colapsam para um único `0` (ex.: `0007` → `7` ao digitar `7`; enquanto só zeros, display `0`).
- Após decimal, zeros são significativos (`0,10` permitido até o limite de dígitos).

### Números negativos

- Somente via controle `+/−` (não há tecla `-` unária no keypad).
- `+/−` inverte o sinal do operando em edição (ou do resultado em `Result`).
- `-0` normaliza para `0` no display após operação que resulte em zero.

---

## 2. Controles

### AC

- Zera operando, operador pendente, último operando de repetição e erro.
- Display resultado: `0`; expressão: vazia.
- Estado: `Input`.

### Backspace

- Em `Input` (incluindo 2º operando em edição, com `acc`/`op` definidos): remove o último caractere do operando em edição; se vazio, fica `0`.
- Em `OpReady`, `Result` ou `Error`: no-op.
- Não remove o operador pendente.

### +/−

- Inverte sinal do valor no display (operando atual ou resultado).
- Em `OpReady` (aguardando 2º operando, display ainda mostra 1º): inverte o 1º operando (`acc`) e permanece em `OpReady`.
- Em `Error`: no-op.

### %

Porcentagem é **contextual** (estilo Calculadora macOS). Não tratar sempre como `n / 100`.

#### Sem operador pendente

- Substitui o operando atual por `n / 100`, depois formata ao display.
- Ex.: `50` + `%` → `0,5`.
- Em `OpReady` sem 2º operando iniciado: aplica ao 1º operando (`acc`/display) como `n / 100`.
- Em `Result`: aplica ao resultado como `n / 100`; limpa `op`, `lastB` e a marca de `%` (repetição de `=` deixa de valer); estado permanece `Result`.
- Em `Error`: no-op.
- Não grava histórico sozinho.

#### Com operador pendente (editando `b`)

Seja `A` o acumulador e `B` o operando em edição (taxa percentual):

| Operador | Significado de `A ⊕ B%` | Conversão de `B` no display | Exemplo |
|----------|-------------------------|-----------------------------|---------|
| `+` | `A + (A × B / 100)` | `A × B / 100` | `100 + 15 % =` → `115` |
| `−` | `A − (A × B / 100)` | `A × B / 100` | `100 - 15 % =` → `85` |
| `×` | `A × (B / 100)` | `B / 100` | `100 × 15 % =` → `15` |
| `÷` | `A ÷ (B / 100)` | `B / 100` | `100 ÷ 25 % =` → `400` |

- Ao pressionar `%`, o display/`b` passa a mostrar o valor convertido; a **taxa** `B` original fica preservada para `=` e repetição (não gravar permanentemente `+ 0,15`).
- Em `Result` após operação com `%`, `lastB` guarda a **taxa** (ex.: `15`), não só o decimal/absoluto convertido.
- Repetir `=` reaplica `A ⊕ B%` sobre o novo resultado (ex.: `100 + 15 % =` → `115`, depois `=` → `132,25`).
- Após resultado com `%`, digitar um novo número e `=` reaplica a mesma operação percentual (ex.: `100 + 15 % =` → `115`, depois `150 =` → `172,5`).
- Dígito/`,` após `Result` **sem** `%` pendente continua descartando `op`/`lastB` (comportamento normal).

---

## 3. Operações

Operadores binários: `+`, `−`, `×`, `÷`.

### Símbolos na expressão

- Na linha de expressão e no histórico, usar exatamente: `+`, `-`, `×`, `÷` (menos ASCII `-`; vezes/divisão como no keypad).
- Forma: `"{a}{op}{b}"` após `=`; operandos com o mesmo formatador do display (ex.: `427+379`, `0,1+0,2`, `5×5`).

### Linha de expressão (display superior)

| Situação | Expressão | Resultado (inferior) |
|----------|-----------|----------------------|
| `Input` sem `op` | vazia | operando em edição |
| `OpReady` | `"{a}{op}"` | `a` |
| `Input` com `op` (editando `b`) | `"{a}{op}"` | `b` em edição |
| `Result` | `"{a}{op}{b}"` | resultado |
| `Error` | operação tentada (se houver) | `Erro` |

### Soma, subtração, multiplicação, divisão

- Ao pressionar operador com operando válido:
  - Se estado `Input` com `op`/`acc` e segundo operando `b` em edição → calcula `a ⊕ b`, mostra resultado, e o novo operador fica pendente sobre esse resultado (`OpReady`).
  - Se estiver em `OpReady` sem segundo operando → **troca de operador** (substitui `⊕`).
  - Se estiver em `Input` sem `op` (só um número) → guarda número e operador → `OpReady`.
  - Se estiver em `Result` → usa resultado como `a`, guarda operador → `OpReady`.

### =

- Em `Input` com `op` e `b` em edição: calcula `a ⊕ b` → `Result`; `lastB = b`.
- Em `OpReady` sem `b` iniciado (estilo macOS): `b = acc`, calcula `acc ⊕ acc` → `Result`; `lastB = acc`.
- Em `Result`: repetição (ver abaixo).
- Em `Input` sem `op`: no-op.
- Em `Error`: no-op.
- Sucesso: expressão `"{a}{op}{b}"`, persiste histórico.
- Falha: `Error`.

### Troca de operador antes do segundo operando

- Sequência `5 + −` → pendente fica subtração; display continua `5`; expressão `5-`; estado `OpReady`.

### Operações consecutivas

- `5 + 3 +` → ao segundo `+`, calcula `8`, display `8`, pendente `+`, expressão `8+`, estado `OpReady`.

### Pressionar = repetidamente

- Após `a ⊕ b =` → resultado `r`, com `op` e `lastB = b` preservados.
- Se `b` veio de `%`, `lastB` é a **taxa** percentual e cada `=` reaplica `r ⊕ lastB%`.
- Próximo `=` calcula `r ⊕ lastB` (ou `r ⊕ lastB%`), atualiza `r` e a expressão.
- Repetível indefinidamente até novo dígito/`,` (exceto após resultado com `%`, onde o novo número + `=` reaplica a operação percentual), `%` em `Result` (que limpa `lastB`), AC ou erro.

### Novo número após resultado

- Em `Result`, dígito ou `,` descarta a expressão anterior, zera `op`/`lastB`, inicia novo `Input`.

### Operador após resultado

- Em `Result`, operador usa o resultado como `a` → `OpReady`.

---

## 4. Casos especiais

### Divisão por zero

- Qualquer `÷ 0` (incluindo via `=` , `OpReady`+`=` com `b=acc`, encadeamento ou repetição) → estado `Error`.
- Display resultado: `Erro`; expressão mantém a operação tentada.
- Próximo dígito, `,` ou `AC` sai do erro.

### Precisão decimal

- Cálculo interno em IEEE-754; após cada operação binária/`%`, aplicar `roundToSignificant` antes de exibir e de encadear.
- Remover zeros à direita no display (`1,50` → `1,5`); inteiros sem vírgula (`806`).
- Sem notação científica na V1.

### 0,1 + 0,2

- Após arredondamento de display: resultado **`0,3`**.

### Arredondamento

- Half away from zero na 12ª casa significativa (ex.: `1,25` com 2 significativos → `1,3`; `-1,25` → `-1,3`).
- Aplicar antes do display e do próximo cálculo encadeado.

### Números muito grandes / overflow

- Resultado não finito (`Infinity` / `NaN`) → `Error`, display `Erro`.
- Após `roundToSignificant`, se `abs(n) >= 10^12` → `Error` (não cabe em 12 dígitos sem notação científica).
- Se a string de display (excluindo sinal e vírgula) exceder 12 dígitos → `Error`.

### Limite do display

- Máximo **12 dígitos** no operando em edição (contagem exclui sinal e vírgula).
- Dígitos extras ou segunda `,` são ignorados.

### Estados de erro

- Entrada: divisão por zero, overflow/não-finito.
- Saída: `AC` → `Input` com `0`, contexto zerado; dígito/`,` → `Input` com esse início e `op`/`lastB` zerados; demais teclas de operação: no-op até limpar.

---

## 5. Máquina de estados

### Estados

| Estado | Significado |
|--------|-------------|
| `Input` | Editando operando. Sem `op`: operando único. Com `acc`/`op`: editando o 2º operando `b` |
| `OpReady` | Operador pendente; display ainda mostra `a`; `b` ainda não iniciado |
| `Result` | Último `=` bem-sucedido (`op`/`lastB` preservados para repetir `=`) |
| `Error` | Erro de cálculo |

Contexto: `display`, `expression`, `acc`, `op`, `lastB`, `editing`.

### Transições (resumo)

```mermaid
stateDiagram-v2
  [*] --> Input
  Input --> OpReady: operator
  Input --> Input: digit_decimal_pct_sign_backspace
  Input --> Result: equals_with_op_and_b
  Input --> Error: equals_fail
  OpReady --> OpReady: operator_swap
  OpReady --> Input: digit_or_decimal_starts_b
  OpReady --> Result: equals_b_equals_acc
  OpReady --> Error: equals_fail
  Result --> Input: digit_or_decimal
  Result --> OpReady: operator
  Result --> Result: equals_repeat_ok
  Result --> Error: equals_repeat_fail
  Error --> Input: AC_or_digit_or_decimal
  Input --> Input: AC
  OpReady --> Input: AC
  Result --> Input: AC
```

Eventos:

- `digit` / `decimal` / `backspace` / `percent` / `sign` — seções 1–2.
- `operator` — seção 3 (troca e encadeamento).
- `equals` — seção 3; sucesso → `Result` + histórico; falha → `Error`.
- `clear` (AC) → `Input` zerado.

---

## 6. Arquitetura

```text
UI
→ State Machine
→ Calculation Engine
→ History Service
→ CalculationRepository
      ├── TauriSqliteCalculationRepository  → SQLite   (desktop)
      └── IndexedDbCalculationRepository   → IndexedDB (web)
```

| Camada | Responsabilidade |
|--------|------------------|
| **UI** | Renderiza `design.pen`; envia eventos (tecla/clique); não calcula regra de negócio além de despachar eventos; **não executa SQL**; **não acessa IndexedDB** |
| **State Machine** | Estados/transições; monta expressão/display; chama Engine para `⊕` e `%`; **compartilhada** web/desktop |
| **Calculation Engine** | Funções puras: `add/sub/mul/div`, `percent`, `negate`, `formatDisplay`, `roundToSignificant`; **independente de React, SQLite, IndexedDB e Tauri**; sem `eval()`; **sem duplicação** de regras matemáticas |
| **History Service** | Após `=` ok, monta `{ expression, result }` e chama `CalculationRepository`; depende **somente** dessa interface; engole/registra falha de persistência sem reverter o resultado na UI |
| **CalculationRepository** | Interface comum de persistência (`insert` / `list` / `clear`); único contrato usado pelo History Service |
| **TauriSqliteCalculationRepository** | Implementação desktop; SQLite via IPC/comandos Tauri; React não fala SQL |
| **IndexedDbCalculationRepository** | Implementação web; IndexedDB no navegador; React não acessa IndexedDB diretamente |
| **Factory de ambiente** | Seleciona automaticamente SQLite (Tauri) ou IndexedDB (browser) |

**Compartilhado (obrigatório):** React UI, design, State Machine, Calculation Engine, regras matemáticas, teclado, History Service. Nenhuma UI duplicada. `design.pen` continua sendo a fonte de verdade visual.

**Desktop:** UI/State Machine/Engine/History no TypeScript do frontend; implementação SQLite no Rust (comandos IPC) atrás de `TauriSqliteCalculationRepository`.

**Web:** mesma UI e lógica; `npm run dev` / `npm run build` sem runtime Tauri; histórico local via IndexedDB.

V1: persistir histórico sem UI de listagem. Sem tabela de preferências.

---

## 7. Persistência (`CalculationRepository`)

### Modelo lógico `calculations`

| Campo | Tipo lógico | Constraints |
|-------|-------------|-------------|
| `id` | inteiro / chave | gerado pelo storage |
| `expression` | texto | obrigatório |
| `result` | texto | obrigatório |
| `created_at` | texto | obrigatório (ISO-8601 UTC) |

- Sem linhas de erro.
- `expression` / `result` como exibidos (ex.: `427+379`, `806`; decimal com `,`).

### Desktop — SQLite

Tabela `calculations`:

| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` |
| `expression` | `TEXT` | `NOT NULL` |
| `result` | `TEXT` | `NOT NULL` |
| `created_at` | `TEXT` | `NOT NULL` (ISO-8601 UTC) |

Índice:

```sql
CREATE INDEX idx_calculations_created_at ON calculations(created_at DESC);
```

Migration:

- `001_init.sql`: `CREATE TABLE calculations (...)` + índice acima.
- Aplicar na abertura do app desktop; versão em `schema_migrations(version INTEGER PRIMARY KEY)`.

### Web — IndexedDB

- Object store equivalente a `calculations` com os mesmos campos lógicos.
- Ordenação de listagem por `created_at` descendente (índice ou sort pós-leitura).
- Sem runtime Tauri.

### Falha de persistência

- Falha ao abrir/migrar/inserir/listar (SQLite ou IndexedDB): log interno; cálculo e UI seguem normais.
- Insert falho: resultado permanece na tela; item não entra no histórico.
- Sem crash do processo/aba por erro de persistência na V1.
- **Falha na persistência nunca impede a calculadora de funcionar.**

---

## 8. Teclado

| Tecla | Ação |
|-------|------|
| `0`–`9` | dígito |
| `+` | soma |
| `-` | subtração |
| `*` | multiplicação |
| `/` | divisão |
| `Enter` ou `=` | igual |
| `Backspace` | backspace |
| `Escape` | AC |
| `,` ou `.` | separador decimal |
| `%` | percentual |

- `+/−` apenas pelo botão da UI na V1 (sem atalho obrigatório).
- Atalhos ativos com foco na janela da calculadora.

---

## 9. Testes

| Área | O que cobrir |
|------|----------------|
| **Calculation Engine** | `+ − × ÷`, `%`, negate, `0,1+0,2` → `0,3`, ÷0, overflow `>= 10^12`, format/round 12 dígitos half away from zero |
| **State Machine** | troca de operador, encadeamento, `=` com `b=acc` em `OpReady`, `=` repetido, novo número após resultado, operador após resultado, AC, backspace em `Input` (incl. `b`), `%` em `Result` limpa `lastB`, saída de `Error` |
| **CalculationRepository (SQLite)** | migration, insert, list ordenado por `created_at`, clear; falha de insert sem throw para o caller |
| **CalculationRepository (IndexedDB)** | insert, list ordenado por `created_at`, clear; falha de insert sem throw para o caller |
| **History Service** | depende só da interface; `=` sucesso → insert; falha de persistência não altera resultado/UI |
| **Teclado** | mapa da seção 8 dispara os mesmos eventos dos botões |
| **UI** | smoke: display expressão/resultado e keypad; Convert/Keypad Mode desabilitados |
| **Finais web** | `npm run dev`, `npm run build`, histórico IndexedDB, app sem Tauri |
| **Finais desktop** | build Tauri, histórico SQLite, mesma UI/lógica |
| **E2E / visual** | critérios da seção 10 + validação contra `design.pen` |

---

## 10. Critérios de aceitação

**427 + 379 = 806**  
Given display `0`  
When digitar `427`, `+`, `379`, `=`  
Then resultado `806` e expressão `427+379`

**10 − 3 = 7**  
Given calculadora limpa  
When `10`, `−`, `3`, `=`  
Then resultado `7` e expressão `10-3`

**5 × 5 = 25**  
Given calculadora limpa  
When `5`, `×`, `5`, `=`  
Then resultado `25` e expressão `5×5`

**10 ÷ 2 = 5**  
Given calculadora limpa  
When `10`, `÷`, `2`, `=`  
Then resultado `5` e expressão `10÷2`

**0,1 + 0,2**  
Given calculadora limpa  
When `0`, `,`, `1`, `+`, `0`, `,`, `2`, `=`  
Then resultado `0,3`

**Divisão por zero**  
Given calculadora limpa  
When `1`, `÷`, `0`, `=`  
Then estado `Error` e display `Erro`

**= em OpReady sem b**  
Given `5`, `+` (estado `OpReady`)  
When `=`  
Then resultado `10` e expressão `5+5`

**AC**  
Given expressão em andamento qualquer  
When `AC`  
Then display `0`, expressão vazia, estado `Input`

**Backspace**  
Given `5`, `+`, `379` (editando `b` em `Input`)  
When `Backspace`  
Then display `37`

**+/−**  
Given operando `5`  
When `+/−`  
Then display `-5`

**% (sem operador)**  
Given operando `50`  
When `%`  
Then display `0,5`

**% (adição)**  
Given `100`, `+`, `15`  
When `%`, `=`  
Then resultado `115`

**% (subtração)**  
Given `100`, `−`, `15`  
When `%`, `=`  
Then resultado `85`

**% (multiplicação)**  
Given `100`, `×`, `15`  
When `%`, `=`  
Then resultado `15`

**% (divisão)**  
Given `100`, `÷`, `25`  
When `%`, `=`  
Then resultado `400`

**% (repetição com novo operando)**  
Given `100`, `+`, `15`, `%`, `=` (resultado `115`)  
When `150`, `=`  
Then resultado `172,5`

**Repetição de =**  
Given `5`, `+`, `3`, `=` (resultado `8`)  
When `=`  
Then resultado `11`  
When `=`  
Then resultado `14`

**Troca de operador**  
Given `5`, `+`  
When `−`  
Then expressão `5-` e display `5`  
When `3`, `=`  
Then resultado `2` e expressão `5-3`
