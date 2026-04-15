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

- ✅ Upload e processamento de arquivos CSV
- ✅ Relatório detalhado de horas trabalhadas
- ✅ Validação de regras de horas (8h/dia)
- ✅ Geração de JSON para criação de tarefas no Redmine
- ✅ Interface responsiva e moderna

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