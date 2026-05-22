# AGENTS.md — Instruções persistentes para agentes (Codex / Claude Code)

Este arquivo fornece instruções que agentes compatíveis (Codex, Claude Code, etc.) podem ler ao abrir o repositório. Use-o para padronizar comportamento e incluir passos automáticos de verificação de skills.

## Objetivos principais
- Manter um inventário de skills relevantes para o projeto.
- Sempre validar `SKILL.md` quando uma nova skill for adicionada.
- Sugerir adaptações de prompt quando uma skill adequada existir.

## Bloco de instruções (exemplo para incluir ao agente)

1. Ao iniciar, liste skills instaladas localmente (`ls ~/.agents/skills`).
2. Para cada skill encontrada, leia a primeira seção do `SKILL.md` e extraia `name` e `description`.
3. Compare a descrição com a tarefa corrente; se houver match, sugira ao usuário: "Posso usar a skill `<skill-name>` para X — deseja que eu ative/execute?".
4. Se uma nova skill for adicionada ao repositório, execute um checklist: validar `description`, extrair comandos de instalação e testar (simulado) se a skill é segura (sem chamadas de rede não autorizadas).

## Comandos úteis (para humanos)
- Listar skills locais: `ls ~/.agents/skills`
- Ver SKILL.md de uma skill: `sed -n '1,40p' ~/.agents/skills/<skill>/SKILL.md`
- Instalar via instalador (quando disponível): `skill-installer <skill-name>` ou seguir instruções no `README` do skill.

## Recomendações de integração com VS Code + Codex
- Mantenha `AGENTS.md` na raiz para que Codex/Claude o use como `AGENTS.md` do projeto.
- Use `create-plan` antes de grandes mudanças e `gh-fix-ci` como skill de reação a falhas de CI.

---
Arquivo criado: [AGENTS.md](AGENTS.md)

## Snippet sugerido: Auto-review de skills e reescrita de prompts

Quando o agente iniciar uma tarefa, execute este fluxo automaticamente:

1. Liste skills locais: `ls ~/.agents/skills`.
2. Para cada skill, leia `SKILL.md` e extraia `name`, `description` e `triggers` (se houver).
3. Calcule uma similaridade simples entre a descrição da tarefa do usuário e a descrição da skill (p.ex. termo-chave em comum, ou modelo de embedding quando disponível).
4. Se `similarity_score >= 0.6` proponha ao usuário: "Posso usar a skill `<skill-name>` para ajudar (descrição curta). Deseja que eu a aplique?".
5. Se autorizado, reescreva o prompt incluindo uma linha no início: `Use-Skill: <skill-name>` e insira quaisquer constraints sugeridos pelo `SKILL.md`.

Exemplo de reescrita automática do prompt:

```
Use-Skill: create-plan
Task: Implementar endpoint POST /evidence que agrega eventos de ponto
Constraints: Gere um plano passo-a-passo; liste arquivos a serem alterados; proponha testes unitários.
```

Notas de segurança:
- Não execute automaticamente skills que contenham scripts com chamadas de rede externas sem confirmação explícita do usuário.
- Sempre registre (log) quais skills foram usadas e peça confirmação antes de commitar alterações.

Com isso, o agente ajuda a identificar e aplicar skills relevantes, e você não precisa decorar nomes — basta aprovar quando o agente sugerir.

