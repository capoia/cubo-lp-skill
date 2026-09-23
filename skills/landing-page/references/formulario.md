# O formulário

O formulário do Cubo não é um `<form>` que você escreve: é criado pela API, desenhado pelo SDK e,
ao ser enviado, cria a **negociação** no funil, com duplicidade, distribuição, automações e envio da
conversão para a Meta — o mesmo caminho da API de negociações. Você nunca escreve `<input>` na
página.

## Campos

Dois campos **base**, e só dois:

| `id` | Vira | Obrigatório? |
|---|---|---|
| `title` | o título da negociação **e o nome da pessoa** | quase sempre sim |
| `phone` | o telefone da pessoa, com máscara `(99) 99999-9999` | sim, quando o contato é por WhatsApp |

**Qualquer outro dado é campo personalizado** — inclusive e-mail. Procure em
`GET /api/customfields` antes de criar: quase toda empresa já tem "E-mail".

### Formato de um campo

```json
{
  "id": "title",
  "name": "Titulo",
  "label": "Seu nome",
  "isCustomfield": false,
  "columns": 12,
  "hide": false,
  "placeholder": "Como podemos te chamar?",
  "validations": {
    "required": true,
    "type": { "use": false, "value": null },
    "maxLength": { "use": false, "value": null },
    "minLength": { "use": false, "value": null }
  }
}
```

Campo personalizado, com validação de e-mail:

```json
{
  "id": 318035,
  "name": "E-mail",
  "label": "Seu melhor e-mail",
  "isCustomfield": true,
  "customfield": { "id": 318035, "name": "E-mail", "type": "text", "status": "active", "context": "deal" },
  "columns": 12,
  "hide": false,
  "placeholder": "nome@empresa.com.br",
  "validations": {
    "required": false,
    "type": { "use": true, "value": "email" },
    "maxLength": { "use": false, "value": null },
    "minLength": { "use": false, "value": null }
  }
}
```

- `columns` é de 1 a 12 (grade de 12). Dois campos lado a lado: 6 e 6. Em telas estreitas tudo vira
  uma coluna sozinho;
- `validations.type.value`: `email`, `number`, `integer`, `letters`;
- `hide: true` manda o campo escondido — serve para gravar uma origem fixa junto do lead.

**Peça pouco.** Nome e WhatsApp convertem muito mais que cinco campos. Se a pessoa quiser qualificar
mais, o caminho melhor é um segundo formulário (do tipo `update`) na página de obrigado.

## Criar

```json
{
  "name": "LP Turma de março",
  "type": "create",
  "fields": [ … ],
  "settings": {
    "destination": { "pipeId": 304170, "stageId": 998877 },
    "afterSubmit": {
      "successMessage": { "enabled": true, "title": "Recebemos!", "text": "Em instantes falamos com você no WhatsApp.", "durationMs": 2500 },
      "redirectUrl": null
    },
    "button": { "idle": "Quero falar com um especialista", "sending": "Enviando…", "sent": "Recebido!", "redirecting": "Abrindo…" },
    "theme": { "primary": "#1D4ED8", "background": "#FFFFFF", "text": "#111827", "radius": 10, "size": "normal", "inputStyle": "outline", "buttonWidth": "full", "buttonAlign": "center" },
    "lgpd": { "enabled": true, "required": true, "source": "url", "url": "https://cliente.com.br/privacidade", "label": "Li e aceito a política de privacidade", "customfieldId": 318027 },
    "tracking": { "utm": [ { "param": "utm_source", "customfieldId": 318034 } ], "pageView": false },
    "protection": { "honeypot": true, "minFillSeconds": 2, "allowedDomains": [] }
  }
}
```

A resposta traz `publicId` (`frm_…`) — é ele que vai no trecho do SDK na página.

### O que cada seção decide

- **`destination`** — onde a negociação nasce. Pegue os ids em `GET /api/pipes`. Errar aqui é o
  defeito mais caro: o lead entra e ninguém vê.
- **`afterSubmit`** — mensagem na própria página **ou** `redirectUrl`. Para mandar ao WhatsApp:
  `https://wa.me/55DDDNUMERO?text=Oi%2C%20vim%20pela%20p%C3%A1gina`.
- **`theme`** — a aparência do formulário vive **aqui**, não no CSS da página: ele desenha em shadow
  DOM e o CSS de fora não entra. Case `primary` com a cor do botão principal da página.
- **`lgpd`** — `source`: `url` (link para a política), `custom` (texto próprio em `customText`) ou
  `default`. O aceite fica gravado no campo personalizado de `customfieldId`, com data e origem.
- **`tracking.utm`** — só o que estiver mapeado aqui é gravado. Sem mapeamento, a UTM **se perde**.
  Se a página vai receber anúncio, mapeie ao menos `utm_source`, `utm_medium` e `utm_campaign`
  (crie os campos personalizados se não existirem). Também dá para mapear `page_url` e `referrer`.
- **`tracking.pageView`** — ver abaixo.
- **`protection`** — deixe o honeypot ligado. `allowedDomains` vazio libera qualquer origem; preencha
  se quiser travar no domínio da página.

## PageView

`tracking.pageView: true` faz o **formulário** disparar o PageView dos dois lados (pixel da página e
servidor, com o mesmo id, para a Meta contar uma visita só). Só vale com uma integração da API de
Conversões escolhida no formulário.

**Numa página hospedada no Cubo, deixe desligado.** O Cubo já dispara o PageView da página; ligar os
dois conta a visita duas vezes. A chave existe para o caso de o formulário estar embutido num site
fora do Cubo.

## Na página

```html
<div id="form"></div>
<script src="https://SEU-CRM/sdk/form.js" defer></script>
<script>
  addEventListener('DOMContentLoaded', function () {
    new Form({ form: 'frm_XXXXXXXXXXXXXXXX', target: '#form', minHeight: 420, inheritPageStyles: true })
  })
</script>
```

Opções que valem a pena: `minHeight` (reserva a altura, evita o salto), `inheritPageStyles` (herda a
fonte e a cor de texto da página), `values` (pré-preenche), `css` (CSS extra **dentro** do shadow).
Não passe `apiBase` e não use `lazy`.

Eventos, se precisar reagir:

```js
const form = new Form({ … })
form.on('success', ({ eventId }) => { /* já enviou */ })
form.on('redirect', ({ url, preventDefault }) => { /* dá para cancelar */ })
```

## Testar sem sujar o funil

A prévia local (`previa.mjs`) desenha o formulário de verdade — ele vem do CRM — mas responde o
envio na própria página: pode preencher e mandar à vontade, nenhuma negociação é criada. Para isso
o formulário **já precisa existir** no Cubo (é o `publicId` dele que vai no trecho do SDK).

Para testar de verdade **depois de publicar**, combine com a pessoa: mande um lead real, confira a
negociação no funil e apague. É o único jeito de provar que o caminho inteiro funciona.
