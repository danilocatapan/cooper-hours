# Cooper Hours — guia técnico

Aplicação React + Vite para conferir lançamentos de horas exportados do BusinessMap e preparar as mensagens usadas no fluxo manual da Cesis.

- [Demonstração publicada](https://danilocatapan.github.io/cooper-hours/)
- [Visão geral do repositório](../README.md)
- [Como contribuir](../CONTRIBUTING.md)

## O que faz e o que não faz

O Cooper Hours:

- lê o CSV localmente;
- calcula horas por dia e compara dias úteis com a meta de 8h;
- destaca pendências, horas acima da meta, feriados, duplicatas e linhas ignoradas;
- prepara a mensagem de tarefas com pré-validação, prevenção de duplicidade e payload JSON;
- aplica os IDs retornados pela Cesis e prepara a mensagem final de horas.

A aplicação não autentica no BusinessMap ou na Cesis, não envia o CSV, não cria tarefas e não registra horas automaticamente. O envio das mensagens continua sendo uma ação manual do usuário em um destino autorizado.

## Fluxo de uso

1. Exporte do BusinessMap um CSV do período desejado.
2. Confirme o processamento local e importe o arquivo por clique, teclado ou arrastar e soltar.
3. Em **Conferir horas**, revise o calendário, as horas diárias e as inconsistências.
4. Em **Preparar tarefas**, revise os dados e copie a mensagem para a Cesis.
5. Em **Mapear IDs**, cole a resposta da Cesis e associe os IDs às tarefas.
6. Em **Copiar lançamento final**, copie a mensagem e cole-a no fluxo autorizado da Cesis.

## Glossário

- **BusinessMap:** origem do CSV usado para conferência.
- **Cesis:** neste projeto, é o fluxo manual autorizado que recebe as mensagens preparadas pela ferramenta.
- **ID da tarefa na Cesis (`issue_id`):** identificador da tarefa criada ou reutilizada após a primeira mensagem.
- **ID da categoria de atividade (`activity_id`):** categoria usada para classificar cada lançamento de horas.

## Quickstart

Requisitos:

- Node.js 20 ou superior;
- pnpm 10.15.1.

Execute a partir desta pasta:

```powershell
pnpm install
pnpm run dev
```

A aplicação fica em `http://127.0.0.1:3000/cooper-hours/`. O único ajuste opcional de ambiente é o caminho base:

```env
VITE_BASE_PATH=/cooper-hours/
```

## Exemplo sanitizado

Entrada mínima, separada por tabulação:

```text
Usuário	ID do cartão	Título	Etiquetas	Data	Tempo registrado soma
Pessoa Exemplo	1001	Reunião diária	"equipe"	2026-04-01	2.000
Pessoa Exemplo	1002	Desenvolvimento	"projeto"	2026-04-01	6.000
```

A mensagem de tarefas inclui orientações de pré-validação e um payload delimitado com o contrato `create_tasks_batch`. Depois do retorno da Cesis, a mensagem final inclui as regras de conferência e um payload de horas com `issue_id`, `hours`, `spent_on`, `activity_id` e `comments`.

Os valores são tratados localmente. O CSV aceita tabulação, ponto e vírgula ou vírgula como separador e identifica automaticamente o formato.

## Arquitetura e fluxo de dados

1. O navegador lê o arquivo escolhido com `FileReader`.
2. O parser valida o cabeçalho, normaliza linhas e remove duplicatas exatas.
3. O modelo de relatório agrupa as atividades por data e calcula calendário e status.
4. Os títulos únicos e configurações locais geram a mensagem de tarefas.
5. A resposta colada da Cesis preenche os IDs reconhecidos e diagnostica conflitos.
6. Somente quando todo o mapeamento é válido a mensagem final de horas pode ser copiada.

As regras puras ficam em `client/src/features/timesheet`; `Home.tsx` coordena estado, upload, navegação, cópia e download. Componentes visuais reutilizáveis ficam em `client/src/design-system`.

## Privacidade e limitações

- O projeto é demonstrativo e independente; não representa uma política oficial da Coopersystem.
- Todo conteúdo importado permanece no estado da aba aberta.
- Recarregar ou fechar a página remove os dados; somente a preferência de tema pode permanecer no navegador.
- Cópias acontecem diretamente após o botão correspondente e exibem um aviso sobre destinos autorizados.
- Downloads e exclusão de dados exigem confirmação.
- Cada importação deve representar um usuário e um único mês.
- O formato esperado é o CSV exportado pelo BusinessMap com `Título`, `Data` e `Tempo registrado soma`.
- Não há declaração formal de navegadores suportados nem auditoria manual completa com tecnologias assistivas.

## Validação

```powershell
pnpm run check
node test_comprehensive.mjs
pnpm run test:e2e
pnpm run test:a11y
pnpm run build
```

- `pnpm run check`: valida tipos TypeScript sem gerar arquivos.
- `node test_comprehensive.mjs`: testa parser, calendário e contratos de mensagens.
- `pnpm run test:e2e`: exercita upload, etapas, validações da Cesis, responsividade e payloads em navegador real.
- `pnpm run test:a11y`: executa verificações automatizadas axe nas telas e temas principais.
- `pnpm run build`: valida o bundle estático de produção.

## Publicação

O workflow `.github/workflows/deploy.yml` executa as validações, gera `dist/public`, publica no GitHub Pages e cria a próxima tag `v1.0.x`. A aplicação não precisa de servidor, banco de dados ou infraestrutura adicional.

## Estrutura principal

```text
client/
├── public/                         # Logo e arquivos públicos
└── src/
    ├── components/ui/              # Primitivos de interface
    ├── design-system/              # Componentes e tokens compartilhados
    ├── features/privacy/           # Aviso de privacidade e mensagens seguras
    ├── features/timesheet/         # Parsing, regras, relatórios e painéis
    └── pages/                      # Composição das páginas
e2e/                               # Testes Playwright do fluxo manual
docs/                              # Acessibilidade e guia visual
```
