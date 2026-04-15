# Timesheet Processor Web

Processador de planilhas de horas BusinessMap para Coopersystem.

## 🚀 Como executar

1. Certifique-se de ter Node.js instalado
2. Execute o servidor:
   ```bash
   node server-fixed.js
   ```
3. Abra seu navegador em: http://localhost:5184

## 📋 Funcionalidades

- ✅ **Upload de CSV** - Processamento completo dos dados
- ✅ **Relatório de Horas** - Análise detalhada com validações
- ✅ **Aba "Criar Tarefas"** - Geração de JSON para criação de tarefas no Redmine
- ✅ **Aba "Registrar Tempo"** - Mapeamento de cartões e geração de time entries
  - Seleção de cartão do CSV
  - Configuração de Issue ID
  - Seleção de atividade (Desenvolvimento, Reuniões, Análise e Refinamento)
  - Adicionar/editar registros de tempo
  - Geração automática de JSON para Redmine

## 🛠️ Desenvolvimento

O projeto usa:
- HTML/CSS/JavaScript puro (frontend)
- Node.js (servidor simples)
- Estrutura modular e organizada

## 📁 Estrutura

```
timesheet-processor-web/
├── public/
│   └── index.html          # Interface principal
├── server-fixed.js         # Servidor HTTP
└── test_*.csv             # Arquivos de teste
```