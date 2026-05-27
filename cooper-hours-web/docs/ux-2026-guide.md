# Guia UX 2026 do Cooper Hours

## Princípios

- Clareza operacional acima de decoração: cada painel deve responder “o que aconteceu”, “o que falta” e “qual é o próximo passo”.
- Componentes devem usar tokens semânticos, não cores diretas.
- Estados de risco, pendência e sucesso devem combinar texto, cor e ícone.
- Dados pessoais exigem confirmação antes de sair da tela por clipboard ou download.
- Melhorias modernas devem ser progressivas e ter fallback.

## Componentes e padrões

- Upload: botão real, suporte a arrastar e soltar, nome do arquivo e feedback por `aria-live`.
- Calendário: navegação por setas com foco único e detalhe diário controlado pela seleção.
- Tarefas Cecis: selects com nome + ID e inputs manuais apenas onde o contrato exige.
- Inconsistências CSV: filtro por tipo, recomendação de correção e exportação separada.
- Tema: claro, escuro e alto contraste, com `prefers-reduced-motion` respeitado.

## Tendências adotadas com fallback

- Tokens preparados para contraste adaptativo quando `contrast-color()` estiver disponível.
- Busca com `mark` sem depender de APIs experimentais.
- Transições e animações sempre subordinadas a preferências do usuário.
