# AGENTS.md - Instrucoes persistentes para agentes

Este arquivo orienta agentes que trabalham neste repositorio. Use estas instrucoes para evitar perguntas repetidas sobre execucao, validacao e uso de skills.

## Projeto

- Raiz do app: `cooper-hours-web`.
- Aplicacao principal: React + Vite em `client/src`.
- Porta Vite configurada: `3000`.
- URL canonica local: `http://localhost:3000/cooper-hours/`.
- Build de producao: `dist/public`.

## Arquitetura frontend

- `client/src/pages/Home.tsx` deve ficar como camada de orquestracao: estado da tela, handlers de upload/copia e composicao das abas.
- Regras puras de timesheet ficam em `client/src/features/timesheet`: parsing de CSV, status, calendario, Cecis, JSONs, tipos e constantes.
- Paineis especificos do fluxo ficam em `client/src/features/timesheet/components`.
- Padroes visuais compartilhados ficam em `client/src/design-system`; consulte `client/src/design-system/README.md` antes de criar novo componente visual reutilizavel.
- Primitivos shadcn/Radix continuam em `client/src/components/ui` e nao devem receber regra de negocio do dominio.

## Execucao no Windows desta maquina

- Se `pnpm` nao estiver no PATH, use diretamente: `C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd`.
- Nao pergunte novamente qual gerenciador usar quando esse caminho existir; use-o automaticamente.
- Execute comandos a partir de `cooper-hours-web`.

## Comandos padrao

```powershell
& 'C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd' install
& 'C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd' run dev
& 'C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd' run check
& 'C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd' run build
& 'C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd' run test:e2e
node test_comprehensive.mjs
```

Para testes Playwright contra servidor local, suba o Vite antes e use:

```powershell
$env:E2E_BASE_URL='http://localhost:3000/cooper-hours/'
& 'C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd' run test:e2e
```

O `playwright.config.ts` nao sobe o servidor sozinho. Se a porta 3000 estiver ocupada, leia a URL impressa pelo Vite antes de testar.

## Validacao esperada

- Antes de concluir alteracoes funcionais, rode typecheck, build e testes relevantes.
- O GitHub Actions em `.github/workflows/deploy.yml` roda `pnpm run check`, `node test_comprehensive.mjs`, instala Chromium do Playwright, executa `pnpm run test:e2e`, gera build e publica `cooper-hours-web/dist/public`.
- Para mudancas de UI, valide com Playwright em browser real, incluindo snapshots de acessibilidade, console, desktop e mobile.
- Para esta aplicacao, valide pelo menos: upload por clique, drag-and-drop, CSV invalido, CSV com mais de 5 dias, dia abaixo de 8h, dia com 8h, dia acima de 8h e layout mobile.
- Registre qualquer aviso pre-existente separadamente de regressao nova.

## Skills

- Use `define-goal` quando o pedido precisar transformar uma intencao ampla em objetivo verificavel.
- Use `webapp-testing` e `playwright` para fluxos de UI.
- Use `create-plan` quando o usuario pedir plano antes da execucao.
- Use `frontend-design` para evolucoes de interface, preservando a identidade visual existente.
- Leia o `SKILL.md` relevante antes de aplicar uma skill nova.

## Cuidados

- Nao reverta alteracoes do usuario sem pedido explicito.
- Nao edite manualmente `node_modules` ou `dist`; eles sao artefatos de instalacao/build.
- Preserve o escopo do pedido e remova codigo obsoleto apenas quando a falta de uso for confirmada por busca no repositorio.
- Evite hexadecimais em telas e componentes de produto; prefira tokens semanticos (`success`, `warning`, `danger`, `surface-*`, `code`) definidos em `client/src/index.css`.
- Ao alterar contratos testados de CSV ou Cecis, atualize/rode os E2E correspondentes.
