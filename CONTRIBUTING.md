# Como contribuir

Obrigado por contribuir com o Cooper Hours. Execute todos os comandos a partir de `cooper-hours-web/`.

## Preparação

Use Node.js 20 ou superior e pnpm 10.15.1:

```powershell
cd cooper-hours-web
pnpm install
pnpm run dev
```

## Branches e alterações

- Use nomes curtos e descritivos, como `feat/ajuda-csv`, `fix/mapeamento-cecis` ou `docs/quickstart`.
- Preserve o processamento local: não adicione envio de arquivos, telemetria ou persistência sem uma decisão explícita de produto e privacidade.
- Mantenha regras de negócio em `client/src/features/timesheet` e componentes reutilizáveis em `client/src/design-system`.
- Escreva textos de interface e documentação em pt-BR, com acentuação correta.
- Não altere os contratos de CSV ou JSON sem atualizar os testes correspondentes e descrever a compatibilidade no PR.

## Validação obrigatória

```powershell
pnpm run check
node test_comprehensive.mjs
pnpm run test:e2e
pnpm run test:a11y
pnpm run build
```

Mudanças visuais também devem ser conferidas em desktop, mobile, navegação por teclado e reflow equivalente a 200% de zoom.

## Pull requests

Inclua no PR:

- problema resolvido e comportamento esperado;
- arquivos ou áreas afetadas;
- testes executados e resultados;
- imagens somente quando ajudarem a explicar uma mudança visual;
- limitações conhecidas ou itens que precisam de acompanhamento.

Mantenha os commits focados e não inclua arquivos gerados de `dist/`, resultados locais de testes ou dados reais de usuários.
