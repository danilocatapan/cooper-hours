# Inventário rápido de Skills — Cooper Hours

Este arquivo é um resumo enxuto das skills recomendadas/registradas, para referência rápida e comandos práticos.

- WarpGrep — Code Search
  - O que faz: busca de código paralela e precisa (subagent).
  - Instalar: siga o repositório do WarpGrep ou use MCP installer (ex.: `npm i -g @morphllm/morphmcp` e configurar em `~/.codex/config.toml`).
  - Usar / forçar: mencione `WarpGrep` no prompt ou configure MCP server em Codex.

- create-plan
  - O que faz: força o agente a gerar um plano antes de executar mudanças.
  - Instalar: `skill-installer create-plan` ou copie a pasta para `~/.agents/skills/create-plan`.
  - Usar: escrever no prompt "Use create-plan para formular o plano antes de modificar arquivos".

- gh-fix-ci
  - O que faz: lê logs do CI e propõe/commita correções.
  - Instalar: `skill-installer gh-fix-ci`.
  - Usar: quando CI falhar, invoque: "Diagnostique e aplique `gh-fix-ci`".

- gh-address-comments
  - O que faz: agrupa e responde comentários de PR.
  - Usar: em reviews com muitos comentários, peça: "Use gh-address-comments para aplicar/responder os comentários deste PR".

- frontend-design / theme-factory
  - O que faz: impõe guia visual e decisões de design antes de gerar UI.
  - Usar: pedir ao agente "Siga as regras do frontend-design" ao gerar componentes.

- stop-slop
  - O que faz: remove padrões de escrita AI de textos (docs, commits).
  - Usar: peça ao agente "Polir docs com stop-slop".

- webapp-testing / pr-review-ci-fix
  - O que fazem: testes automatizados e loop de correção CI/PR.
  - Usar: "Execute webapp-testing" ou permita o agente analisar falhas com `pr-review-ci-fix`.

- codebase-recon / developer-growth-analysis
  - O que fazem: mapeiam hotspots, dívida técnica e padrões de desenvolvimento.
  - Usar: "Rode codebase-recon" para priorizar refatorações.

- Valyu / langsmith-fetch
  - O que fazem: integradores de pesquisa externa (papers, GH, noticias).
  - Usar: "Pesquise com Valyu sobre X".

- workday-evidence (sugerida, custom)
  - O que faz: agrega sinais para provar um dia de 8h (pontos, commits, timers) e gera relatório com `confidence_score`.
  - Como usar (planejado): enviar eventos ao endpoint do backend e pedir "Gerar relatório de evidências para `YYYY-MM-DD`".

Comandos úteis para inspeção local das skills

```bash
ls ~/.agents/skills                     # listar skills instaladas
sed -n '1,80p' ~/.agents/skills/<skill>/SKILL.md   # ver frontmatter e descrição rápido
skill-installer <skill-name>            # instalar skill quando disponível
```

Observação: para forçar o uso de uma skill em uma sessão, mencione o nome dela no prompt; para integração automática, veja `AGENTS.md`.
