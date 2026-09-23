# A API do Cubo

Tudo em `https://SEU-CRM/api/...`, com o cabeçalho `X-API-Key: sk_...` e
`Accept: application/json`. O script `scripts/cubo.sh` já põe os dois:

```bash
CUBO="${CLAUDE_PLUGIN_ROOT}/skills/landing-page/scripts/cubo.sh"

"$CUBO" get  /api/pipes
"$CUBO" post /api/landings '{"title":"…","url":"promo","domainId":7,"html":"<div>…</div>"}'
"$CUBO" post /api/landings/12/publish
"$CUBO" put  /api/landings/12 @pagina.json      # @arquivo lê o corpo de um arquivo
"$CUBO" del  /api/landings/12
```

Resposta de sucesso vem envelopada em `{"data": …}`. Erro vem como
`{"errors":[{"message":"…"}]}`.

Documentação viva do CRM da pessoa: `https://SEU-CRM/docs` (mostra só o que aquele CRM tem).

---

## Landing pages

### Listar

`GET /api/landings?page=1&perPage=20&status=active&domainId=7`

A listagem **não traz o HTML** (é grande). Para o conteúdo, leia uma página.

### Ler uma

`GET /api/landings/:id` → traz `html`, `head`, `codeHead`, `codeBody` e o resto.

### Criar

`POST /api/landings`

```json
{
  "title": "Turma de março",
  "url": "turma-marco",
  "domainId": 7,
  "html": "<div class=\"lp\">…</div>",
  "head": "<link …><style>.lp{…}</style>",
  "metaDescription": "Até 140 caracteres que descrevem a oferta.",
  "robots": "User-agent: *\nDisallow:",
  "favicon": "https://…/favicon.png",
  "codeHead": null,
  "codeBody": null,
  "cookieAlert": false,
  "enhanceData": true,
  "integrations": [12]
}
```

- **nasce fora do ar**, sempre. A API **não aceita `status`**: publicar é `POST /:id/publish`, que
  confere conteúdo e domínio ativo;
- **a API não aceita `css`.** O CSS vai dentro do `head`, num `<style>` — a página publicada ignora
  a coluna `css`;
- `url` é o caminho dentro do domínio, sem barra no começo. `"/"` é a raiz;
- `integrations` é opcional: ids de integração da Meta (API de Conversões) para a página. Pegue em
  `GET /api/landings` de uma página que já funcione, ou pergunte;
- consome uma unidade do módulo de landing pages. Estourando a capacidade, vem 422 com
  `E_INSUFFICIENT_QUOTA` — quem resolve é a pessoa, contratando mais.

A resposta traz `publicUrl`, já montado.

### Atualizar

`PUT /api/landings/:id` — só o que vier no corpo muda.

### Publicar / despublicar

`POST /api/landings/:id/publish` · `POST /api/landings/:id/unpublish`

Publicar recusa (422) quando a página não tem conteúdo ou quando o domínio não está `active`.

### Pré-visualizar

`POST /api/landings/:id/preview` →

```json
{ "url": "https://SEU-CRM/public/landings/preview/eyJ…", "expiresAt": "2026-09-24T12:00:00.000-03:00" }
```

Endereço temporário (24 h), sem rastreamento nenhum, com o formulário em modo de teste — envio ali
não cria negociação. Pode mandar para a pessoa aprovar.

### Caminho livre

`GET /api/landings/path-check?domainId=7&path=turma-marco` → `{"available": true}`

Único entre landing pages **e** formulários hospedados do mesmo domínio.

### Imagem

`POST /api/landings/assets`, multipart, campo `file`, **até 1 MB** → `{"url": "https://…"}`

```bash
# sempre nesta ordem: preparar, depois subir
PRONTA=$("${CLAUDE_PLUGIN_ROOT}/skills/landing-page/scripts/imagem.sh" foto.jpg topo | head -1)
"$CUBO" upload /api/landings/assets "$PRONTA"
```

Formatos aceitos pela API: `jpg`, `jpeg`, `png`, `gif`, `svg`, `webp` — mas **a skill sobe webp**
(ou SVG, quando for vetor). Veja [html.md](html.md).

⚠️ **Cada arquivo consome a cota de armazenamento da empresa**, o mesmo balde dos anexos: a chamada
passa por `checkStorageQuota` e registra o arquivo. Estourando, vem 422 com
`E_STORAGE_QUOTA_EXCEEDED` — e quem resolve é a pessoa, liberando espaço ou contratando mais.

### Excluir

`DELETE /api/landings/:id` — exclusão lógica, libera a capacidade.

---

## Formulários

### Listar / ler

`GET /api/forms` · `GET /api/forms/:id` — a leitura traz o `publicId` (`frm_…`).

### Criar

`POST /api/forms` — corpo completo e regras de campo em [formulario.md](formulario.md).

### Atualizar / excluir

`PUT /api/forms/:id` · `DELETE /api/forms/:id`

---

## Domínios

### Listar

`GET /api/domains` → cada um com `status`: `active` (serve página), `validating` (esperando o
CNAME), `deactivated`, `suspended`.

### Cadastrar

`POST /api/domains` com `{"domain":"landing.cliente.com.br"}` →

```json
{ "data": { "id": 9, "domain": "landing.cliente.com.br", "status": "validating" }, "cnameTarget": "proxy.w8hub.com.br" }
```

Entregue à pessoa, com estas palavras:

> No painel do seu domínio (Registro.br, Cloudflare, GoDaddy…), crie um registro **CNAME**:
> **nome** `landing` (ou o subdomínio que você escolheu) e **valor** `proxy.w8hub.com.br`.
> Depois me avise — pode levar de alguns minutos a algumas horas para propagar.

### Conferir o apontamento

`POST /api/domains/:id/verify` → `{"data": …, "verified": true}`. Quando confirma, o domínio vira
`active` sozinho e a página pode ser publicada.

---

## Apoio

| Rota | Para quê |
|---|---|
| `GET /api/pipes` | funis com as etapas — para escolher o destino do lead |
| `GET /api/customfields` | campos personalizados da empresa |
| `POST /api/customfields` | criar campo: `{"name":"E-mail","context":"deal","type":"text"}` |
| `GET /api/me/modules` | módulos ativos da conta |

Tipos de campo personalizado: `text`, `number`, `selectbox` (exige `options: ["A","B"]`),
`datetime`, `city`, `state`. Contextos: `deal`, `organization`, `people`.

---

## Erros

| Código | O que fazer |
|---|---|
| 401 | chave errada ou ausente |
| 403 `Missing required scope: x:y` | falta permissão na chave — peça para a pessoa editar |
| 403 `Origem não autorizada` | você chamou um endpoint público de fora de uma página do cliente |
| 404 | id de outra empresa, ou caminho errado |
| 422 | corpo inválido, caminho ocupado, domínio inativo, script barrado ou capacidade esgotada |
| 429 | limite de taxa; espere o `Retry-After` |

A mensagem do 422 diz exatamente o que houve — leia antes de tentar de novo, e repita o motivo para
a pessoa em vez de esconder atrás de "deu erro".
