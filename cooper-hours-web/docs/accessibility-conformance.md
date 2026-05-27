# Matriz de conformidade de acessibilidade

Alvo do projeto: WCAG 2.2 AA para a experiência principal do validador Cooper Hours.

| Área | Critério | Evidência esperada |
| --- | --- | --- |
| Navegação por teclado | Foco visível, ordem lógica e calendário com foco único | E2E de upload, calendário e abas; revisão manual com Tab e setas |
| Conteúdo e idioma | Interface em pt-BR, sem mojibake visível | Teste E2E de texto renderizado e busca por artefatos de encoding |
| Contraste | Temas claro, escuro e alto contraste com tokens semânticos | Teste E2E de contraste de status e revisão visual |
| Formulários | Labels persistentes, ajuda contextual e erros próximos ao controle | Upload, campos Cecis e filtro de inconsistências |
| Status e notificações | `aria-live` para processamento, cópia, download e erro | Testes de fluxo e inspeção da árvore acessível |
| Prevenção de erro | Confirmação para copiar/baixar dados pessoais | Diálogo de ação sensível antes de JSON/relatório |
| Movimento | Respeito a `prefers-reduced-motion` | CSS global e revisão manual |
| Privacidade | Processamento local e aviso antes de ações sensíveis | Aviso LGPD, confirmação de clipboard/download e docs |

## Limitações conhecidas

- A aplicação processa CSV localmente, mas cópias para clipboard e downloads passam a ser responsabilidade do usuário após confirmação.
- Contatos jurídicos e de DPO permanecem como placeholders até revisão institucional.
- Auditorias automatizadas não substituem teste com leitor de tela real.
