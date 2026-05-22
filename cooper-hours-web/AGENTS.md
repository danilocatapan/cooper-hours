# AGENTS.md - Instrucoes persistentes para agentes

Este arquivo orienta agentes que trabalham neste repositorio. Use estas instrucoes para evitar perguntas repetidas sobre execucao, validacao e uso de skills.

## Projeto

- Raiz do app: `cooper-hours-web`.
- Aplicacao principal: React + Vite em `client/src`.
- Porta Vite configurada: `3000`.
- Build de producao: `dist/public`.

## Execucao no Windows desta maquina

- Se `pnpm` nao estiver no PATH, use diretamente: `C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd`.
- Nao pergunte novamente qual gerenciador usar quando esse caminho existir; use-o automaticamente.
- Execute comandos a partir de `cooper-hours-web`.

## Comandos padrao

```powershell
& 'C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd' run dev
& 'C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd' run check
& 'C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd' run build
& 'C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd' run test:e2e
node test_comprehensive.mjs
```

Para testes Playwright contra servidor local, use `E2E_BASE_URL=http://localhost:3000` quando precisar apontar explicitamente para o servidor.

## Validacao esperada

- Antes de concluir alteracoes funcionais, rode typecheck, build e testes relevantes.
- Para mudancas de UI, valide com Playwright em browser real, incluindo snapshots de acessibilidade, console, desktop e mobile.
- Registre qualquer aviso pre-existente separadamente de regressao nova.

## Skills

- Use `webapp-testing` e `playwright` para fluxos de UI.
- Use `create-plan` quando o usuario pedir plano antes da execucao.
- Leia o `SKILL.md` relevante antes de aplicar uma skill nova.

## Cuidados

- Nao reverta alteracoes do usuario sem pedido explicito.
- Nao edite manualmente `node_modules` ou `dist`; eles sao artefatos de instalacao/build.
- Preserve o escopo do pedido e remova codigo obsoleto apenas quando a falta de uso for confirmada por busca no repositorio.
