# Cooper Hours

Aplicação web para conferir lançamentos de horas e preparar os dados usados no processo manual de criação de tarefas e registro de tempo.

Tudo funciona no navegador. O projeto não mantém servidor próprio, banco de dados, credenciais de API ou integração automática com sistemas externos.

## Fluxo de uso

1. Confirme que entendeu o processamento local e que pode usar o arquivo escolhido.
2. Importe o CSV exportado do Jira por clique ou arrastar e soltar.
3. Confira o calendário, as horas diárias e as inconsistências encontradas.
4. Na aba **Criar Tarefas**, revise os campos e copie o JSON para o processo manual.
5. Cole a resposta da Cecis na aba **Registrar Tempo**, mapeie os `issue_id` e copie o JSON final.
6. Se precisar, baixe o relatório CSV para conferência ou arquivamento.

O CSV aceita tabulação, ponto e vírgula ou vírgula como separador. O processamento identifica automaticamente o formato, ignora duplicatas exatas e apresenta erros de forma legível.

## Privacidade

- O projeto é demonstrativo e independente; não representa uma política oficial da Coopersystem.
- O conteúdo do CSV é processado somente na aba aberta.
- Nenhum dado do arquivo é enviado pela aplicação.
- Recarregar ou fechar a página remove os dados importados.
- Somente a preferência de tema pode permanecer salva no navegador.
- Cópias de JSON e downloads acontecem apenas após confirmação explícita do usuário.

## Desenvolvimento

Requisitos:

- Node.js 20 ou superior
- pnpm 10.15.1

Instale as dependências e inicie o Vite:

```powershell
pnpm install
pnpm run dev
```

A aplicação fica disponível em `http://127.0.0.1:3000/cooper-hours/`.

O único ajuste opcional de ambiente é o caminho base:

```env
VITE_BASE_PATH=/cooper-hours/
```

## Validação

```powershell
pnpm run check
node test_comprehensive.mjs
pnpm run test:e2e
pnpm run test:a11y
pnpm run build
```

Os testes cobrem upload por clique e arrastar e soltar, CSV inválido, múltiplos dias, estados abaixo/com/acima de 8h, geração dos JSONs, acessibilidade e layout mobile.

## Publicação

O workflow `.github/workflows/deploy.yml` valida e publica os arquivos estáticos de `dist/public` no GitHub Pages. A aplicação publicada possui a mesma arquitetura local e não precisa de infraestrutura adicional.

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

As regras puras ficam em `client/src/features/timesheet`; `Home.tsx` apenas coordena estado, upload, cópia, download e composição das abas.
