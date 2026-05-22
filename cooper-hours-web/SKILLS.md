# Skills aplicáveis ao projeto Cooper Hours

Este documento lista skills (Codex/Agent Skills) que recomendo adicionar ao projeto, por área, o ganho esperado e como usá-las rapidamente.

## Como instalar e usar (resumo)
- Instalação rápida (Codex / Codex CLI): copie a pasta da skill para `~/.agents/skills/<skill-name>` ou use o `skill-installer` quando disponível.
- Verificar instalação: `ls ~/.agents/skills` ou inspecione `SKILL.md` dentro da pasta da skill.
- Após instalar: reinicie o cliente Codex/agent para recarregar metadados.

## Skills que recomendo (seleção prática)

- **WarpGrep (Code Search)**: pesquisa de código paralela e eficiente.
  - Ganho: reduz tempo de busca em grandes codebases; melhora prompts que precisam localizar usos de funções.
  - Uso: instalar `warpGrep` como MCP skill / subagent.

- **create-plan (Forçar plano antes de execução)**
  - Ganho: evita execuções erradas do agente; garante aprovação do plano antes de alterar arquivos.
  - Uso: `skill-installer create-plan` ou copiar para `~/.agents/skills/create-plan`.

- **gh-fix-ci (Corrigir CI automaticamente)**
  - Ganho: acelera resolução de pipelines quebrados, reduz tempo perdido com debug manual.

- **gh-address-comments (Responder/Aplicar comentários de PR)**
  - Ganho: aumenta velocidade de revisão e reduz ciclo de feedback.

- **frontend-design / theme-factory (UI opinionated skill)**
  - Ganho: força decisões de tipografia, paleta, acessibilidade; melhora consistência visual do `client/`.

- **stop-slop (Melhorar prosa e docs)**
  - Ganho: melhora READMEs, mensagens de commit e textos gerados (menos estilo "AI").

- **webapp-testing / pr-review-ci-fix**
  - Ganho: testes e CI automatizados + loop de correção automática.

- **codebase-recon / developer-growth-analysis**
  - Ganho: análises do repositório (hotspots, dívida técnica) e históricos, útil para priorizar refatorações.

- **Valyu / langsmith-fetch (Pesquisa & dados externos)**
  - Ganho: integrações para pesquisas, papers e dados atualizados — útil ao justificar heurísticas do algoritmo de evidências.

## Skills custom sugeridas para evidências de 8 horas trabalhadas

- **workday-evidence** (skill custom que sugerimos criar)
  - Objetivo: agregar sinais que comprovem um dia de trabalho de 8h e gerar um pacote de evidências com score de confiança.
  - Inputs possíveis:
    - registros de ponto (in/out) do app
    - timestamps de commits no repo
    - eventos de UI (start/stop de timers)
    - atividades de teclado/integrações (opcional, com consentimento)
    - screenshots/artefatos anexados (opcional)
  - Output: JSON com intervalos cobertos, gaps detectados, motivos, e um `confidence_score` + resumo em texto pronto para auditoria.
  - Ganho: criar evidências auditáveis para relatórios e export (CSV/PDF), reduzir fraudes e facilitar verificação.
  - Como implementar (alto nível): agregador no backend que une fontes por usuário+dia, aplica heurísticas (minutos ativos, sobreposição, máximo idle), e gera relatório + hashes das evidências.

- **timesheet-validator** (skill auxiliar)
  - Objetivo: validar entradas do usuário aplicando regras (máximo horas continuas, pausa mínima, etc.) e sugerir correções.

## Onde integrar no projeto atual
- Backend (`server/`): implementar `workday-evidence` como endpoint que recebe eventos e retorna relatório e score.
- Frontend (`client/`): adicionar UX para anexar evidências (commits, screenshots), visualizar relatório e marcar anomalias.
- CI / DevOps: usar `gh-fix-ci` e `webapp-testing` para manter qualidade ao introduzir heurísticas.

## Automação: revisar skills e adaptar prompts (agents)
- Recomendo manter um arquivo de agente (`AGENTS.md`) no repositório com instruções padrão (AGENTS.md é lido por Codex/Claude para instruções persistentes).
- Comandos práticos para revisar skills localmente:
  - `ls ~/.agents/skills` — listar skills instaladas
  - `head ~/.agents/skills/<skill>/SKILL.md` — inspecionar frontmatter e descrição
  - `skill-installer <skill-name>` — instalar a partir de listas públicas (quando disponível)

## Dicas de uso (para você que não baixa skills diariamente)
- Sempre leia o `SKILL.md` da skill instalada; a `description` explica quando o agente dispara.
- Se quiser forçar uma skill em uma sessão, mencione o nome da skill no prompt (ex.: "Use create-plan para... ").
- Para Copilot: GitHub Copilot não usa diretamente o padrão `~/.agents/skills`. Skills funcionam com Codex / Codex CLI / Claude Code / outros clientes que suportam Agent Skills.

## Próximos passos que posso executar agora
- Criar a skill custom `workday-evidence` - protótipo do `SKILL.md` + backend scaffold.
- Gerar templates de `SKILL.md` para as skills recomendadas.

---
Arquivo criado: [SKILLS.md](SKILLS.md)
