# AGENTS.md - Instruções persistentes para agentes

Este arquivo orienta agentes que trabalham neste repositório. Use estas instruções para evitar perguntas repetidas sobre execução, validação e uso de skills.

## Projeto

- Raiz do app: `cooper-hours-web`.
- Aplicação principal: React + Vite em `client/src`.
- Porta Vite configurada: `3000`.
- URL canônica local: `http://localhost:3000/cooper-hours/`.
- Build de produção: `dist/public`.

## Arquitetura frontend

- `client/src/pages/Home.tsx` deve ficar como camada de orquestração: estado da tela, handlers de upload/cópia e composição das abas.
- Regras puras de timesheet ficam em `client/src/features/timesheet`: parsing de CSV, status, calendário, Cecis, JSONs, tipos e constantes.
- Painéis específicos do fluxo ficam em `client/src/features/timesheet/components`.
- Padrões visuais compartilhados ficam em `client/src/design-system`; consulte `client/src/design-system/README.md` antes de criar novo componente visual reutilizável.
- Primitivos shadcn/Radix continuam em `client/src/components/ui` e não devem receber regra de negócio do domínio.

## Execução no Windows desta máquina

- Se `pnpm` não estiver no PATH, use diretamente: `C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd`.
- Não pergunte novamente qual gerenciador usar quando esse caminho existir; use-o automaticamente.
- Execute comandos a partir de `cooper-hours-web`.

## Comandos padrão

```powershell
& 'C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd' install
& 'C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd' run dev
& 'C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd' run check
& 'C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd' run build
& 'C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd' run test:e2e
node test_comprehensive.mjs
```

## Entrega Git

- Ao concluir uma solicitação que altere o repositório, execute as validações aplicáveis, crie um commit apenas com os arquivos do escopo e faça push da branch atual sem pedir confirmação.
- Não faça commit nem push quando o usuário pedir somente análise, diagnóstico, revisão ou plano, ou quando proibir a publicação.
- Se o push falhar por autenticação, divergência ou proteção de branch, preserve o commit local e informe o bloqueio.

Para testes Playwright contra servidor local, suba o Vite antes e use:

```powershell
$env:E2E_BASE_URL='http://localhost:3000/cooper-hours/'
& 'C:\Users\danilo.catapan\AppData\Roaming\npm\pnpm.cmd' run test:e2e
```

O `playwright.config.ts` não sobe o servidor sozinho. Se a porta 3000 estiver ocupada, leia a URL impressa pelo Vite antes de testar.

## Validação esperada

- Antes de concluir alterações funcionais, rode typecheck, build e testes relevantes.
- O GitHub Actions em `.github/workflows/deploy.yml` roda `pnpm run check`, `node test_comprehensive.mjs`, instala Chromium do Playwright, executa `pnpm run test:e2e`, gera build e publica `cooper-hours-web/dist/public`.
- Para mudanças de UI, valide com Playwright em browser real, incluindo snapshots de acessibilidade, console, desktop e mobile.
- Para esta aplicação, valide pelo menos: upload por clique, drag-and-drop, CSV inválido, CSV com mais de 5 dias, dia abaixo de 8h, dia com 8h, dia acima de 8h e layout mobile.
- Registre qualquer aviso preexistente separadamente de regressão nova.

## Finalização e publicação

- Ao concluir uma tarefa de desenvolvimento, não encerre com alterações somente locais, salvo se o usuário pedir explicitamente para não publicar.
- Crie uma branch dedicada, faça commit apenas do escopo da tarefa, envie a branch e abra um pull request pronto para revisão.
- Aguarde as verificações obrigatórias do pull request. Com os checks aprovados, faça o merge na `main`.
- Aguarde o workflow de GitHub Pages, confirme que o deploy terminou com sucesso e valide que a aplicação publicada responde na URL oficial.
- Se autenticação, permissões, checks ou deploy impedirem a publicação, informe o bloqueio com precisão em vez de declarar a tarefa concluída.

## Skills

- Use `define-goal` quando o pedido precisar transformar uma intenção ampla em objetivo verificável.
- Use `webapp-testing` e `playwright` para fluxos de UI.
- Use `create-plan` quando o usuário pedir plano antes da execução.
- Use `frontend-design` para evoluções de interface, preservando a identidade visual existente.
- Leia o `SKILL.md` relevante antes de aplicar uma skill nova.

## Cuidados

- Textos de interface, documentação, mensagens de erro e avisos legais exibidos ao usuário devem estar em pt-BR, com ortografia correta e acentos. Antes de concluir qualquer alteração textual, rode uma busca por palavras sem acento em português (ex.: `ciencia`, `autorizacao`, `nao`, `usuario`, `validacao`) e corrija os casos que forem texto humano, mantendo sem acento apenas identificadores técnicos, nomes de arquivos, slugs, comandos e código.
- Não reverta alterações do usuário sem pedido explícito.
- Não edite manualmente `node_modules` ou `dist`; eles são artefatos de instalação/build.
- Preserve o escopo do pedido e remova código obsoleto apenas quando a falta de uso for confirmada por busca no repositório.
- Evite hexadecimais em telas e componentes de produto; prefira tokens semânticos (`success`, `warning`, `danger`, `surface-*`, `code`) definidos em `client/src/index.css`.
- Ao alterar contratos testados de CSV ou Cecis, atualize/rode os E2E correspondentes.
