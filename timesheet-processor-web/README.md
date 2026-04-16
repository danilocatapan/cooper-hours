# Lançamento de Horas BusinessMap → Coopersystem

## 📋 Visão Geral

Sistema web para processar e validar registros de timesheet exportados do BusinessMap. A aplicação permite upload de arquivos CSV, processa registros de horas por dia, valida totais diários contra a meta de 8 horas e exibe um relatório organizado com a identidade visual da Coopersystem.

**Versão:** 1.0.0  
**Status:** Publicado e funcional  
**Última atualização:** 15 de Abril de 2026

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

### Identidade Visual Coopersystem

- **Paleta de cores:**
  - Fundo escuro: `#1a2332` (dark mode)
  - Verde neon: `#00D084` (destaque e sucesso)
  - Laranja: `#FF6B5B` (alerta e aviso)
  
- **Logo:** Símbolo em verde e branco, texto "cooper" em verde e "system" em branco
- **Tema:** Dark mode por padrão

---

## 📊 Formato do Arquivo CSV

### Campos Obrigatórios

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **Usuário** | Nome do colaborador | Danilo |
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
Danilo	893566	[Back] [Arquitetural] Replicação	"QualityBot,#bbseg,#modelagem"	2026-04-01	5.000
Danilo	987589	[313-Maestro] Ritos (Daily, Planning)	"#bbseg"	2026-04-01	1.000
Danilo	987605	[313-Maestro] Refinamento	"#bbseg"	2026-04-01	2.000
```

### Separadores Suportados

- **Tabulação** (`\t`) - Recomendado
- **Ponto-e-vírgula** (`;`)
- **Vírgula** (`,`)
- **Espaços múltiplos** (` `)

---

## 🚀 Como Usar

### Via Web (Recomendado)

1. Acesse: **https://timesheetapp-9hdyhw3f.manus.space**
2. Clique em "Clique para selecionar" ou arraste um arquivo CSV
3. O sistema processará automaticamente e exibirá o relatório
4. Visualize:
   - **Resumo Geral:** Total de horas e dias registrados
   - **Detalhes Diários:** Horas por dia com status
   - **Atividades:** Lista completa de tarefas realizadas

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
   unzip timesheet-processor-web.zip
   cd timesheet-processor-web
   ```

2. **Instalar dependências:**
   ```bash
   pnpm install
   ```

3. **Iniciar servidor de desenvolvimento:**
   ```bash
   pnpm run dev
   ```

4. **Acessar a aplicação:**
   - Abra o navegador em: `http://localhost:5173`
   - O servidor está pronto quando você ver:
     ```
     VITE v7.1.9  ready in XXX ms
     ➜  Local:   http://localhost:5173/
     ```

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
node test_integration.mjs
```

---

## 🏗️ Arquitetura do Projeto

### Estrutura de Diretórios

```
timesheet-processor-web/
├── client/                      # Frontend React
│   ├── public/                  # Arquivos estáticos (favicon, etc)
│   ├── src/
│   │   ├── pages/
│   │   │   └── Home.tsx        # Página principal (upload + relatório)
│   │   ├── components/
│   │   │   └── ui/             # Componentes shadcn/ui
│   │   ├── index.css           # Estilos globais (Tailwind + temas)
│   │   ├── main.tsx            # Entry point React
│   │   └── App.tsx             # Rotas e layout
│   └── index.html              # HTML template
├── server/                      # Placeholder (não usado em static)
├── shared/                      # Tipos compartilhados
├── package.json                # Dependências e scripts
├── vite.config.ts              # Configuração Vite
├── tsconfig.json               # Configuração TypeScript
├── test_comprehensive.mjs       # Testes unitários
├── test_integration.mjs         # Testes de integração
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

#### 2. Teste de Integração (`test_integration.mjs`)

Simula o processamento completo como o site faria:

```bash
node test_integration.mjs
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
node test_integration.mjs

# Ambos
node test_comprehensive.mjs && node test_integration.mjs
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

3. **Validação de Duplicatas**
   - Detectar registros duplicados no mesmo dia
   - Alertar usuário sobre possíveis erros de lançamento
   - Sugerir consolidação de registros

4. **Histórico de Uploads**
   - Salvar últimos uploads em localStorage
   - Permitir comparação entre períodos
   - Exportar histórico em CSV

5. **Filtros Avançados**
   - Filtrar por intervalo de datas
   - Buscar por atividade ou etiqueta
   - Agrupar por usuário (para múltiplos colaboradores)

---

## 📞 Suporte e Documentação

### Arquivos Importantes

- **Home.tsx:** Componente principal com toda a lógica de processamento
- **index.css:** Estilos globais e tema Coopersystem
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
- **React Hooks:** useState para gerenciamento de estado
- **Tailwind CSS:** Utilities-first para estilização
- **Componentes:** Reutilizáveis e compostos com shadcn/ui

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
**Última atualização:** 15 de Abril de 2026  
**Status:** ✅ Publicado e funcional
