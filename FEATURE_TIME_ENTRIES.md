# Nova Feature: Registrar Tempo (Time Entries)

## 📝 Descrição

Implementada uma nova aba "⏱️ Registrar Tempo" que permite gerar JSON para criação de registros de tempo (Time Entries) no Redmine.

## 🎯 Funcionalidades

### 1. **Configuração de Mapeamento**
   - **ID do Cartão**: Seletor que popula automaticamente com os cartões encontrados no CSV
   - **Issue ID**: Campo de texto para inserir o código da issue (replicado em todos os registros)
   - **Atividade Padrão**: Seletor com 3 opções:
     - Desenvolvimento (activity_id: 9)
     - Reuniões (activity_id: 10)
     - Análise e Refinamento (activity_id: 20)

### 2. **Registros de Tempo**
   Quando você seleciona um cartão, a aplicação carrega automaticamente todos os registros do CSV para esse cartão e cria uma lista editável com:
   
   - **Horas**: Campo numérico (passo 0.25) - valor inicial do CSV
   - **Data**: Campo de data - data do CSV
   - **Atividade**: Seletor dropdown
   - **Comentários**: Campo de texto livre
   - **Botão Remover**: Para deletar registros da lista

### 3. **Geração de JSON**
   O JSON é gerado automaticamente conforme você edita os campos. Formato:
   ```json
   [
     {
       "issue_id": 289825,
       "hours": 2,
       "spent_on": "2026-04-14",
       "activity_id": 20,
       "comments": ""
     },
     {
       "issue_id": 289825,
       "hours": 1,
       "spent_on": "2026-04-13",
       "activity_id": 20,
       "comments": ""
     }
   ]
   ```

### 4. **Ações Disponíveis**
   - **+ Adicionar Registro**: Adiciona um novo registro em branco
   - **🗑️ Remover**: Remove um registro da lista
   - **🔄 Gerar JSON**: Regenera o JSON (atualização automática)
   - **📋 Copiar JSON**: Copia o JSON para a área de transferência

## 🔄 Fluxo de Uso

1. **Faça upload do CSV** com a coluna "ID do cartão"
2. **Clique na aba "⏱️ Registrar Tempo"**
3. **Preencha a configuração**:
   - Selecione um cartão no dropdown
   - Insira o Issue ID (ex: 289825)
   - Escolha a atividade padrão
4. **Edite os registros**:
   - Ajuste horas, datas, atividades conforme necessário
   - Adicione mais registros com o botão "+ Adicionar Registro"
   - Remova registros com os botões de lixeira
5. **Copie o JSON**:
   - Clique em "📋 Copiar JSON"
   - Cole nos seus sistemas/API

## 📊 Mapeamento Automático

O CSV é automaticamente mapeado:
- **Data do CSV** → `spent_on`
- **Tempo registrado do CSV** → `hours`
- **ID do Cartão do CSV** → Filtra registros por cartão selecionado

## 💡 Recursos

✅ **Issue ID replicado** - O Issue ID é automaticamente replicado em todos os registros  
✅ **Edição em tempo real** - JSON atualiza conforme você digita  
✅ **Validação** - Campos obrigatórios são validados  
✅ **Copiar facilmente** - Botão para copiar JSON para clipboard  
✅ **Remover registros** - Cada registro tem botão de remoção  
✅ **Adicionar registros** - Botão para adicionar novos registros manualmente  

## 🚀 Tecnologia

- Implementado em **JavaScript puro** sem dependências
- Atualização **em tempo real** do JSON
- Interface **responsiva e intuitiva**
- Integrado com o processamento **existente de CSV**
