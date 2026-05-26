# Cooper Hours Design System

Design system mínimo para manter a interface operacional consistente sem criar uma camada pesada.

## Tokens

- `primary`: verde Coopersystem, usado em ações principais.
- `success`: dias completos, registros prontos e feedback positivo.
- `selection`: azul reservado para item ativo/selecionado, sem substituir a cor semântica do status.
- `warning`: horas acima da meta, pendências revisáveis e alertas não bloqueantes.
- `danger`: dias ausentes, dados inválidos e conflitos que exigem correção.
- `surface-*`: superfícies internas, painéis elevados e bordas de seção.
- `code`: blocos técnicos como prévias de JSON.

## Componentes

- `AppShell`: estrutura comum de header, main e footer.
- `SectionCard`: cartão padrão para seções operacionais.
- `MetricCard`: indicador numérico com status semântico.
- `StatusBadge`: rótulo visual para estados do timesheet.
- `JsonPreview`: prévia técnica com ação de copiar.
- `EmptyState`: estado inicial antes do upload.

## Regras de Uso

- Prefira status semânticos (`complete`, `pending`, `over`, `missing`, `optional`, `invalid`) em vez de cores diretas.
- Evite hexadecimais dentro de telas e componentes de produto; adicione tokens em `index.css` quando necessário.
- Mantenha regras de negócio em `features/timesheet` e use os componentes de design system apenas para apresentação.
- Preserve textos e contratos testados pelos fluxos E2E antes de ajustar visual.
