# Deploy web — checklist

Artefatos: pasta `dist/` gerada por `npm run build` (Vite estático). Sem backend.

## Pré-requisitos

- [ ] `npm test` verde
- [ ] `npm run build` conclui sem erro
- [ ] Conteúdo de `dist/` inclui `index.html` + `assets/`

## Publicação (quando for o momento)

1. Servir `dist/` como site estático (Netlify, Vercel, Cloudflare Pages, S3+CDN, nginx, etc.).
2. Não é necessário Node/API no servidor — apenas arquivos estáticos.
3. SPA: apontar fallback 404 → `index.html` se o host exigir (rota única `/` na V1).

## Smoke pós-deploy

- [ ] Abrir a URL pública — calculadora renderiza (janela 456×816)
- [ ] `427 + 379 =` → resultado `806`, expressão `427+379`
- [ ] Teclado físico (dígitos, operadores, Enter, Escape) funciona
- [ ] DevTools → Application → IndexedDB → `calculadora-mac` / `calculations` recebe o registro
- [ ] Console sem erros de APIs Tauri (web não depende de runtime Tauri)
- [ ] Convert e Keypad Mode permanecem desabilitados

## Notas

- Persistência no browser: IndexedDB local (`calculadora-mac`).
- Desktop continua separado (`npm run tauri build` / SQLite); este checklist é só web.
