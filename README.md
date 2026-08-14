# Cooper Hours

Aplicação web para conferir lançamentos de horas exportados do BusinessMap e preparar as mensagens usadas no fluxo manual da Cesis.

[Abrir a demonstração publicada](https://danilocatapan.github.io/cooper-hours/)

## O que a ferramenta faz

- processa o CSV localmente no navegador;
- confere dias úteis, feriados e a meta diária de 8h;
- identifica linhas inválidas e duplicadas;
- prepara mensagens para tarefas e lançamentos de horas;
- ajuda a mapear os IDs retornados pela Cesis.

Ela não acessa contas, envia arquivos, cria tarefas ou registra horas automaticamente. O usuário continua responsável por copiar as mensagens para o fluxo autorizado.

## Quickstart

Requisitos: Node.js 20 ou superior e pnpm 10.15.1.

```powershell
git clone https://github.com/danilocatapan/cooper-hours.git
cd cooper-hours/cooper-hours-web
pnpm install
pnpm run dev
```

A aplicação local fica em `http://127.0.0.1:3000/cooper-hours/`.

## Documentação

- [Guia técnico e fluxo completo](cooper-hours-web/README.md)
- [Como contribuir](CONTRIBUTING.md)
- [Roadmap](ROADMAP.md)
- [Declaração de acessibilidade](cooper-hours-web/docs/accessibility-statement.md)
