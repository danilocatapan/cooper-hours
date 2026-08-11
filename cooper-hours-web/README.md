# Lançamento de Horas BusinessMap → Coopersystem

## 📋 Visão Geral

Sistema web para processar e validar registros de timesheet exportados do BusinessMap. A aplicação permite upload de arquivos CSV, processa registros de horas por dia, valida totais diários contra a meta de 8 horas e exibe um relatório organizado com a identidade visual da Coopersystem.

**Versão:** 1.0.0  
**Status:** Publicado e funcional  
**Última atualização:** 11 de agosto de 2026

---

## Privacidade e LGPD

O CSV continua sendo lido e processado no navegador. No GitHub Pages, todo o fluxo permanece manual e nenhum dado é enviado automaticamente. No ambiente privado, somente os dados derivados apresentados na prévia são enviados pelo backend ao Redmine, e apenas depois de uma confirmação explícita.

A chave individual é digitada em um campo mascarado e permanece somente no estado React da aba. Ela é enviada em cada operação no header `Authorization: RedmineKey ...`, não entra no bundle, banco, logs, cookies, `localStorage` ou `sessionStorage` e desaparece ao limpar ou recarregar a página.

### Matriz resumida de tratamento

| Operação | Dados envolvidos | Finalidade | Retenção | Compartilhamento |
|----------|------------------|------------|----------|------------------|
| Upload local do CSV | Nome, IDs de cartão/tarefa, títulos, etiquetas, datas e horas | Conferir lançamentos e gerar relatório | Apenas durante a sessão da página | Nenhum automático |
| Relatório na tela | Datas, horas, títulos e IDs | Revisão visual pelo usuário | Apenas durante a sessão da página | Nenhum automático |
| Cópia de JSON | Títulos, datas, horas, issue_id e activity_id | Uso manual em Cecis ou sistema autorizado | Área de transferência do dispositivo | Manual pelo usuário |
| Download CSV | Resumo de datas, horas e atividades | Arquivamento ou envio manual autorizado | Arquivo baixado no dispositivo | Manual pelo usuário |
| Prévia da automação privada | Títulos, datas, horas, IDs, atividade e versão | Conferir tarefas, atualizações, duplicatas e conflitos antes da escrita | Até 15 minutos no PostgreSQL, sem a chave | Backend consulta o Redmine |
| Envio confirmado ao Redmine | Tarefas, horas, atividade e marcador técnico | Criar/reutilizar/atualizar tarefas e lançar/atualizar horas | Ledger técnico por 90 dias; conteúdo no Redmine conforme política institucional | Backend envia após confirmação |
| Tema visual | Preferência de tema | Acessibilidade e conforto visual | localStorage do navegador | Nenhum automático |

### Textos base

- Consentimento/ciência: "Confirmo que tenho autorização para importar este CSV e tratar seus dados para validação de horas, geração de relatórios/JSONs e, quando eu confirmar a prévia no ambiente local, envio dos dados derivados ao Redmine pela [PLACEHOLDER_NOME_EMPRESA]."
- Direitos do titular: "Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamento e revogação de consentimento pelo canal [PLACEHOLDER_CANAIS_CONTATO]."
- Encarregado/DPO: "O encarregado pelo tratamento de dados pessoais pode ser contatado em [PLACEHOLDER_CONTATO_DPO]."

Antes de uso institucional, revise estes textos com [PLACEHOLDER_RESPONSAVEL_JURIDICO] e preencha [PLACEHOLDER_NOME_EMPRESA], [PLACEHOLDER_CANAIS_CONTATO] e [PLACEHOLDER_CONTATO_DPO].

---

## 🎯 O que o Sistema Faz

### Funcionalidades Principais

1. **Upload de Arquivo CSV**
   - Aceita arquivos separados por tabulação, ponto-e-vírgula ou vírgula
   - Detecta automaticamente o separador usado
   - Valida formato de data (YYYY-MM-DD)
   - Remove linhas vazias e espaços em branco extras

2. **Processamento de Registros**
   - Agrupa registros por data
   - Calcula total de horas por dia
   - Identifica atividades realizadas
   - Ordena datas em ordem decrescente (mais recentes primeiro)

3. **Validação de Horas Diárias**
   - Meta: 8 horas por dia
   - **✓ No horário:** Exatamente 8 horas (verde)
   - **⚠️ Menos de 8 horas:** Abaixo da meta (laranja)
   - **📈 Mais de 8 horas:** Acima da meta (verde com alerta)

4. **Relatório Visual**
   - Resumo geral com total de horas e dias registrados
   - Detalhamento diário com status e atividades
   - Listagem completa de todas as atividades
   - Design responsivo com identidade visual Coopersystem

5. **Automação privada do Redmine**
   - Consulta conexão, usuário, projeto 333, versões, trackers, status e atividades
   - Reutiliza tarefas existentes sem alterá-las; cria e atualiza somente recursos gerenciados e assinados pela aplicação
   - Detecta horas já lançadas, impede duplicações e bloqueia correspondências ambíguas
   - Exige uma prévia válida e uma confirmação final antes de qualquer escrita
   - Interrompe falhas parciais e permite gerar uma nova prévia segura

### Identidade Visual Coopersystem

- **Paleta de cores:**
  - Fundo escuro: `#1a2332` (dark mode)
  - Verde neon: `#00D084` (destaque e sucesso)
  - Laranja: `#FF6B5B` (alerta e aviso)
- **Design system:** tokens semânticos em `client/src/index.css`, documentação em `client/src/design-system/README.md` e componentes reutilizáveis para shell, cards, métricas, status e prévias de JSON.
- **Acessibilidade e UX:** matriz WCAG, guia UX 2026 e declaração de acessibilidade em `docs/`.
  
- **Logo:** Símbolo em verde e branco, texto "cooper" em verde e "system" em branco
- **Tema:** Dark mode por padrão

---

## 📊 Formato do Arquivo CSV

### Campos Obrigatórios

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **Usuário** | Nome do colaborador | [PLACEHOLDER_USUARIO] |
| **ID do cartão** | Identificador único | 893566 |
| **Título** | Descrição da tarefa | [Back] [Arquitetural] Replicação |
| **Etiquetas** | Tags/categorias (opcional) | QualityBot,#bbseg,#modelagem |
| **Data** | Data do registro | 2026-04-01 |
| **Tempo registrado soma** | Horas trabalhadas | 5.000 |

### Formato de Números

- **Separador decimal:** Ponto (`.`)
- **Exemplo:** `5.000` = 5.0 horas (NÃO cinco mil)
- Espaços e caracteres especiais são removidos automaticamente

### Exemplo de Arquivo CSV

```
Usuário	ID do cartão	Título	Etiquetas	Data	Tempo registrado soma
[PLACEHOLDER_USUARIO]	893566	[Back] [Arquitetural] Replicação	"QualityBot,#bbseg,#modelagem"	2026-04-01	5.000
[PLACEHOLDER_USUARIO]	987589	[313-Maestro] Ritos (Daily, Planning)	"#bbseg"	2026-04-01	1.000
[PLACEHOLDER_USUARIO]	987605	[313-Maestro] Refinamento	"#bbseg"	2026-04-01	2.000
```

### Separadores Suportados

- **Tabulação** (`\t`) - Recomendado
- **Ponto-e-vírgula** (`;`)
- **Vírgula** (`,`)
- **Espaços múltiplos** (` `)

---

## 🚀 Como Usar

### Via Web, fluxo manual

1. Acesse a publicacao atual do GitHub Pages: **https://danilocatapan.github.io/cooper-hours/**
2. Clique em "Clique para selecionar" ou arraste um arquivo CSV
3. O sistema processará automaticamente e exibirá o relatório
4. Visualize:
   - **Resumo Geral:** Total de horas e dias registrados
   - **Detalhes Diários:** Horas por dia com status
   - **Atividades:** Lista completa de tarefas realizadas

O GitHub Pages não contém backend nem chave de API e mantém somente o fluxo manual. A automação é disponibilizada no domínio corporativo protegido pelo Cloudflare Access ou, para desenvolvimento, pelo servidor local.

### Interpretando o Relatório

- **Cor verde (#00D084):** Dia com 8 horas (no horário)
- **Cor laranja (#FF6B5B):** Dia com menos de 8 horas (aviso)
- **Ícone ✓:** Dia completo
- **Ícone ⚠️:** Dia incompleto
- **Ícone 📈:** Dia com mais de 8 horas

---

## 💻 Executar Localmente

### Pré-requisitos

- **Node.js** versão 18+ (recomendado: 22.13.0)
- **pnpm** (gerenciador de pacotes)
- **Git** (opcional, para clonar o repositório)

### Instalação

1. **Extrair o arquivo ZIP:**
   ```bash
   unzip cooper-hours.zip
   cd cooper-hours
   ```

2. **Instalar dependências:**
   ```bash
   pnpm install
   ```

3. **Configurar a integração local:**
   ```bash
   # PowerShell
   Copy-Item .env.example .env.local
   ```

   Não configure `REDMINE_API_KEY` no arquivo. A chave é informada pelo próprio usuário no painel **Automatizar** e mantida somente na memória da aba. O host `https://redmine.coopersystem.com.br` e o projeto `333` estão fixados no código do backend e não podem ser alterados pelo navegador.

4. **Iniciar frontend e backend local:**
   ```bash
   pnpm run dev
   ```

5. **Acessar a aplicação:**
   - Abra `http://127.0.0.1:3000/cooper-hours/`.
   - O Vite atende a interface em `127.0.0.1:3000` e encaminha `/api` ao backend em `127.0.0.1:3001`.
   - Importe o CSV, revise as configurações, abra **Automatizar**, gere a prévia e confirme o envio.

### Segurança e recuperação

- Em desenvolvimento, o backend escuta apenas `127.0.0.1`. Em produção, o Render é publicado exclusivamente atrás do Cloudflare Access e valida assinatura, issuer e audience do JWT.
- A chave Redmine é exigida novamente em conexão, prévia e envio; a prévia expira em 15 minutos e é vinculada por HMAC à chave e às identidades Entra/Redmine.
- O transporte usa uma allowlist runtime de operações fechadas. `DELETE`, `PATCH`, proxy genérico, troca de usuário, projetos, usuários, papéis, workflows e configurações não existem na superfície permitida.
- Atualizações exigem projeto 333, mesmo usuário, ledger vigente e marcador HMAC válido. Recursos apenas reutilizados nunca recebem `PUT`; ambiguidades interrompem o lote.
- `REDMINE_WRITE_MODE` começa em `disabled` e pode avançar para `create` e `create-update`. Nenhuma modalidade permite exclusão.
- O primeiro teste real deve ser somente de consulta. Uma escrita de teste requer autorização específica e, preferencialmente, projeto de treinamento ou sandbox.

Consulte [Segurança e publicação do Redmine](docs/REDMINE_SECURITY.md) para a allowlist completa, limites da garantia, secrets e checklist de homologação.

### Comandos Disponíveis

```bash
# Iniciar servidor de desenvolvimento (com hot reload)
pnpm run dev

# Build para produção
pnpm run build

# Visualizar build de produção localmente
pnpm run preview

# Executar testes unitários
node test_comprehensive.mjs
pnpm run test:unit

# Typecheck
pnpm run check

# Testes de interface e acessibilidade
pnpm run test:e2e
pnpm run test:a11y

# Auditoria de dependências de produção (bloqueia high/critical)
pnpm audit --prod --audit-level high
```

### CI/CD no GitHub Actions

O workflow de deploy fica em `.github/workflows/deploy.yml` na raiz do repositório pai. Em pushes para `main` que alterem `.github/workflows/deploy.yml` ou `cooper-hours-web/**` (ou execução manual via `workflow_dispatch`), ele:

1. Instala dependências em `cooper-hours-web` com `pnpm@10.15.1` e lockfile congelado.
2. Executa `pnpm run check`.
3. Executa o parser, os testes unitários e `pnpm audit --prod --audit-level high` sem credenciais reais.
4. Instala Chromium do Playwright e roda testes E2E e de acessibilidade contra `http://127.0.0.1:3000/cooper-hours/`.
5. Gera `pnpm run build` com `VITE_REDMINE_INTEGRATION_ENABLED=false`, cria `404.html` para fallback SPA e publica somente `cooper-hours-web/dist/public` no GitHub Pages.

O Blueprint [render.yaml](../render.yaml) cria o serviço privado e o PostgreSQL. O Render usa `autoDeployTrigger: checksPass`, executa migrations antes do deploy e inicia com as escritas desativadas.

O CI nunca recebe uma chave de API nem faz chamadas reais ao Redmine.

---

## 🏗️ Arquitetura do Projeto

### Estrutura de Diretórios

```
cooper-hours/
├── client/                      # Frontend React
│   ├── public/                  # Arquivos estáticos (favicon, etc)
│   ├── src/
│   │   ├── pages/
│   │   │   └── Home.tsx        # Orquestra estado, upload e abas
│   │   ├── features/
│   │   │   ├── timesheet/      # Domínio, parsing, Cecis e painéis do produto
│   │   │   └── redmine/        # Contratos do frontend, API local e automação
│   │   ├── design-system/      # Tokens, status e componentes compartilhados
│   │   ├── components/
│   │   │   └── ui/             # Primitivos shadcn/ui
│   │   ├── index.css           # Tailwind, tema e tokens CSS
│   │   ├── main.tsx            # Entry point React
│   │   └── App.tsx             # Rotas e layout
│   └── index.html              # HTML template
├── server/                      # API Express local e cliente Redmine
├── shared/                      # Contratos Zod/TypeScript compartilhados
├── package.json                # Dependências e scripts
├── vite.config.ts              # Configuração Vite
├── tsconfig.json               # Configuração TypeScript
├── test_comprehensive.mjs       # Testes unitários
├── e2e/                         # Testes de ponta a ponta com Playwright
└── README.md                    # Documentação original
```

### Stack Tecnológico

| Tecnologia | Versão | Propósito |
|------------|--------|----------|
| **React** | 19 | Framework frontend |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4 | Estilização |
| **shadcn/ui** | Latest | Componentes UI |
| **Vite** | 7.1.9 | Build tool e dev server |
| **Wouter** | 3.7.1 | Roteamento client-side |

### Arquitetura Atual do Frontend

A interface foi separada em camadas para evitar que a página principal concentre regras de negócio, layout e componentes reutilizáveis:

```text
client/src/
├── pages/
│   └── Home.tsx                         # Orquestra estado, upload, abas e composição
├── features/
│   ├── timesheet/
│       ├── constants.ts                 # Metas, defaults e opções Cecis
│       ├── types.ts                     # Tipos de relatório, tarefas e entradas de tempo
│       ├── parseCsv.ts                  # Parsing e validação do CSV
│       ├── report.ts                    # Cálculos, status e helpers de relatório
│       ├── cecis.ts                     # Parsing/mapeamento Cecis e JSONs
│   │   └── components/                  # Painéis de produto do fluxo de timesheet
│   └── redmine/                         # Cliente da API local, request e painel de automação
├── design-system/
│   ├── README.md                        # Regras de uso do design system
│   ├── status.ts                        # Mapa semântico de status visuais
│   ├── tokens.ts                        # Classes utilitárias compartilhadas
│   └── components/                      # AppShell, SectionCard, MetricCard, etc.
├── components/ui/                       # Primitivos shadcn/Radix
└── index.css                            # Tailwind 4, tema e tokens CSS
```

**Regra de separação:** lógica pura fica em `features/timesheet`; padrões visuais compartilhados ficam em `design-system`; `Home.tsx` deve permanecer como camada de composição.

---

## 🔧 Lógica de Processamento

### Fluxo de Processamento de CSV

```
1. Upload do arquivo
   ↓
2. Leitura do conteúdo (FileReader API)
   ↓
3. Detecção automática de separador
   ↓
4. Parsing do header (primeira linha)
   ↓
5. Busca de índices das colunas obrigatórias
   ↓
6. Iteração sobre linhas de dados
   ├─ Validação de formato de data (YYYY-MM-DD)
   ├─ Parsing de horas (ponto como decimal)
   └─ Agrupamento por data
   ↓
7. Cálculo de totais por dia
   ↓
8. Ordenação por data (decrescente)
   ↓
9. Cálculo de status (< 8h, = 8h, > 8h)
   ↓
10. Renderização do relatório
```

### Correção de Bug de Timezone

**Problema identificado:** Datas eram deslocadas em -1 dia (ex: 2026-04-01 virava 31/03/2026)

**Causa raiz:** `new Date("2026-04-01")` interpreta como UTC meia-noite. Em fusos horários como UTC-3, isso resulta em 31/03/2026.

**Solução implementada:** Substituir comparação de `new Date()` por `localeCompare()` na ordenação:

```typescript
// ❌ Antes (bugado)
.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

// ✅ Depois (corrigido)
.sort((a, b) => b.date.localeCompare(a.date))
```

**Benefício:** Trabalha com datas como strings puras (YYYY-MM-DD), eliminando problemas de timezone.

---

## ✅ Testes Unitários

### Testes Inclusos

O projeto inclui testes automatizados para validar a lógica de parsing:

#### 1. Teste Abrangente (`test_comprehensive.mjs`)

Valida parsing com dados reais do usuário:

```bash
node test_comprehensive.mjs
```

**Validações:**
- ✅ 26 linhas processadas corretamente
- ✅ 10 datas únicas identificadas
- ✅ 80 horas totais calculadas
- ✅ Sem dias fantasmas (31/03/2026)
- ✅ 15/04/2026 presente e exibido

#### 2. Testes de ponta a ponta (`pnpm run test:e2e`)

Simula o processamento completo como o site faria:

```bash
pnpm run test:e2e
```

**Validações:**
- ✅ Processamento bem-sucedido
- ✅ Ordem decrescente correta
- ✅ Status de horas calculado
- ✅ Atividades ordenadas alfabeticamente

### Executar Testes

```bash
# Teste abrangente
node test_comprehensive.mjs

# Teste de integração
pnpm run test:e2e

# Ambos
node test_comprehensive.mjs && pnpm run test:e2e
```

**Resultado esperado:** Todos os testes devem passar com ✅

---

## 🐛 Troubleshooting

### Problema: "Colunas obrigatórias não encontradas"

**Causa:** O arquivo CSV não possui as colunas esperadas.

**Solução:**
1. Verifique se o arquivo tem as colunas: Usuário, ID do cartão, Título, Etiquetas, Data, Tempo registrado soma
2. Certifique-se de que a primeira linha contém os nomes das colunas
3. Verifique o separador (tab, ponto-e-vírgula ou vírgula)

### Problema: Datas aparecem incorretas

**Causa:** Formato de data inválido ou espaços em branco extras.

**Solução:**
1. Verifique se as datas estão no formato YYYY-MM-DD (ex: 2026-04-01)
2. Remova espaços em branco antes e depois das datas
3. Certifique-se de que não há linhas vazias no meio do arquivo

### Problema: Horas aparecem como 0

**Causa:** Formato de número incorreto ou parsing falhado.

**Solução:**
1. Use ponto (`.`) como separador decimal, não vírgula
2. Exemplo correto: `5.000` (5 horas), NÃO `5,000`
3. Remova caracteres especiais (R$, %, etc)

### Problema: Servidor não inicia

**Causa:** Porta 5173 já está em uso ou dependências não instaladas.

**Solução:**
```bash
# Reinstalar dependências
pnpm install

# Ou usar porta diferente
pnpm run dev -- --port 3000
```

---

## 📈 Próximas Melhorias Sugeridas

1. **Exportar PDF**
   - Adicionar botão para baixar relatório formatado
   - Incluir logo Coopersystem e resumo executivo
   - Gerar documento profissional para apresentações

2. **Gráficos de Análise**
   - Gráfico de barras com distribuição de horas por dia
   - Gráfico de pizza com proporção de atividades
   - Tendências ao longo do período

3. **Auditoria da automação**
   - Exportar o resultado da prévia e do envio sem dados secretos
   - Facilitar a conciliação de falhas parciais
   - Exibir histórico somente com retenção e autorização definidas

4. **Historico de Uploads**
   - Não salvar uploads por padrão
   - Só implementar histórico com consentimento específico, retenção definida e opção de exclusão
   - Preferir dados agregados ou anonimizados quando possível

5. **Filtros Avançados**
   - Filtrar por intervalo de datas
   - Buscar por atividade ou etiqueta
   - Agrupar por usuário (para múltiplos colaboradores)

---

## 📞 Suporte e Documentação

### Arquivos Importantes

- **client/src/pages/Home.tsx:** Orquestra estado, upload e composição das abas
- **client/src/features/timesheet/:** Regras de CSV, relatório, Cecis, tipos e painéis de produto
- **client/src/features/redmine/:** Construção da prévia, chamadas locais e interface de confirmação
- **server/redmine/:** Cliente HTTP, deduplicação, prévias efêmeras e envio sequencial
- **shared/redmine.ts:** Contratos compartilhados e validação Zod
- **client/src/design-system/:** Tokens, mapa de status e componentes reutilizáveis do design system
- **client/src/index.css:** Estilos globais, Tailwind 4 e tokens CSS do tema Coopersystem
- **package.json:** Dependências e scripts
- **vite.config.ts:** Configuração do build

### Recursos Externos

- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Vite Documentation](https://vitejs.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

---

## 📝 Notas de Desenvolvimento

### Padrões de Código

- **TypeScript:** Tipagem forte em todos os componentes
- **React Hooks:** estado na página e cálculos derivados com `useMemo`
- **Tailwind CSS:** utilities-first com tokens semânticos em `index.css`
- **Componentes:** primitivas shadcn/ui, componentes de produto em `features/timesheet/components` e padrões compartilhados em `design-system/components`
- **Separação de responsabilidades:** parsing, status, calendário, Cecis e JSONs devem permanecer como funções puras em `features/timesheet`

### Boas Práticas Implementadas

- ✅ Validação robusta de entrada
- ✅ Tratamento de erros com feedback ao usuário
- ✅ Responsivo para mobile e desktop
- ✅ Acessibilidade (ARIA labels, keyboard navigation)
- ✅ Performance otimizada (lazy loading, memoization)
- ✅ Testes unitários e de integração

---

## 📄 Licença

Projeto desenvolvido para Coopersystem. Todos os direitos reservados.

---

**Versão:** 1.0.0  
**Última atualização:** 11 de agosto de 2026
**Status:** ✅ Publicado e funcional
