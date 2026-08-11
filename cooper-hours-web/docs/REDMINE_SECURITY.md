# Segurança e publicação da automação Redmine

## Garantia implementada

O backend não é um proxy. A interface escolhe apenas operações de domínio fechadas; método, host, caminho, projeto, headers e schema do corpo são construídos no servidor. Imediatamente antes de cada `fetch`, `server/redmine/client.ts` converte a operação tipada e valida uma allowlist. O destino é sempre `https://redmine.coopersystem.com.br`, projeto `333`, sem redirects.

| Método | Caminhos permitidos | Uso |
| --- | --- | --- |
| `GET` | `/users/current.json` | Identificar o titular da chave |
| `GET` | `/projects/333.json`, `/projects/333/versions.json` | Validar projeto e versões |
| `GET` | `/trackers.json`, `/issue_statuses.json`, `/enumerations/time_entry_activities.json` | Opções válidas do Redmine |
| `GET` | `/issues.json` com `project_id=333`, `/issues/{id}.json` | Prévia e revalidação de tarefas |
| `GET` | `/time_entries.json` com `project_id=333` e `user_id=me`, `/time_entries/{id}.json` | Prévia e revalidação de horas |
| `POST` | `/issues.json`, `/time_entries.json` | Criar tarefas e horas |
| `PUT` | `/issues/{id}.json`, `/time_entries/{id}.json` | Atualizar somente recursos gerenciados |

Todo outro método ou caminho é rejeitado antes da rede. Isso inclui `DELETE`, `PATCH`, anexos, usuários, projetos, papéis, memberships, workflows e configurações. Os headers de saída são reconstruídos somente com `Accept`, `Content-Type` e `X-Redmine-API-Key`; `X-Redmine-Switch-User` nunca é encaminhado.

Uma issue gerenciada pode atualizar apenas tracker, status, responsável (sempre o próprio usuário Redmine), datas, versão e descrição. Assunto, projeto e autor não são enviados no `PUT`. Uma hora gerenciada pode atualizar somente data, quantidade de horas, atividade e comentário; usuário, projeto e issue não são enviados no `PUT`.

Antes de qualquer atualização devem coincidir:

1. identidade validada pelo Cloudflare Access;
2. titular atual da chave Redmine;
3. projeto `333` retornado pelo Redmine;
4. registro do recurso no ledger, com no máximo 90 dias;
5. marcador HMAC versionado, válido e vinculado ao tipo, ID Redmine, projeto, usuário e chave de origem.

Falha ou ambiguidade bloqueia a escrita. Uma issue existente apenas reutilizada não entra no ledger e nunca é atualizada. A aplicação não implementa exclusão.

## Credencial pessoal

A chave é lida por um campo `password`, mantida no estado da página e enviada novamente em `Authorization: RedmineKey ...` para conexão, prévia e submissão. O backend a converte para `X-Redmine-API-Key` apenas na chamada ao Redmine. A chave não é gravada no PostgreSQL nem incluída em logs, respostas ou contratos de erro.

Não use `REDMINE_API_KEY`, variáveis `VITE_*`, cookies ou storage para essa credencial. Recarregar, fechar a aba ou usar **Limpar chave** remove a cópia no navegador.

Importante: a allowlist limita o que esta aplicação faz, mas não reduz as permissões intrínsecas da chave fora dela. A administração do Redmine deve garantir que o papel do usuário no projeto 333 permita somente consulta, criação/edição de issues e lançamento/edição das próprias horas. Uma chave roubada continua tendo as permissões do usuário e deve ser revogada no Redmine.

## Controles do ambiente privado

- Cloudflare Access com Microsoft Entra ID protege todas as rotas, exceto `GET /healthz`.
- O backend valida assinatura via JWKS, issuer e audience do `Cf-Access-Jwt-Assertion`.
- Configure o DNS para que o hostname do Render não seja a origem aceita; `APP_ORIGIN` deve conter somente o domínio privado.
- A API valida `Origin`, Fetch Metadata, header próprio, JSON de no máximo 256 KB e rate limits por identidade/IP.
- PostgreSQL mantém prévias por 15 minutos, idempotência/lock de envio, ledger e auditoria técnica sanitizada. Ledger e auditoria expiram em 90 dias; a limpeza roda diariamente.
- `AUTOMATION_SIGNING_KEY` deve ser estável e ter pelo menos 32 caracteres aleatórios. Se for perdida ou trocada, recursos antigos falham de modo seguro e deixam de ser atualizáveis automaticamente.
- `REDMINE_WRITE_MODE=disabled|create|create-update` controla ativação gradual e desligamento emergencial. O padrão é `disabled`.

## Secrets e deploy no Render

O `render.yaml` cria o web service e o PostgreSQL privado, executa `pnpm run migrate` antes do deploy e só publica depois dos checks do GitHub.

Configure como secrets no Render:

- `APP_ORIGIN`: origem HTTPS exata do domínio protegido;
- `AUTOMATION_SIGNING_KEY`: segredo estável e aleatório;
- `CLOUDFLARE_ACCESS_TEAM_DOMAIN`: `https://<team>.cloudflareaccess.com`;
- `CLOUDFLARE_ACCESS_AUD`: audience tag da aplicação Access.

`DATABASE_URL` vem do banco do Blueprint. Não configure uma chave Redmine no Render.

No Cloudflare Access, crie uma aplicação self-hosted para o domínio privado, permita somente o grupo Entra autorizado, mantenha MFA e sessão corporativa e envie o tráfego ao serviço Render. O GitHub Pages deve continuar com `VITE_REDMINE_INTEGRATION_ENABLED=false`.

## Homologação

1. Suba com `REDMINE_WRITE_MODE=disabled` e valide login, JWT, conexão, consultas, headers e logs sem dados sensíveis.
2. Confirme as permissões do papel Redmine e faça backup operacional conforme a política da organização.
3. Mude para `create`; crie uma issue e uma hora controladas e confira projeto, usuário, histórico e marcador.
4. Mude para `create-update`; altere esses mesmos dois registros pela aplicação e confirme que assunto/projeto/autor/usuário/issue foram preservados.
5. Só então libere o grupo Entra. Monitore rate limits, falhas, auditoria e expiração do ledger.

Não use chaves reais em CI, pull requests ou ambientes de preview.
