# O HTML da página

## O que você escreve, e o que o Cubo escreve

A página é montada assim, a cada visita:

```
<html>
  <head>
    metatags, favicon, robots        ← colunas da página no Cubo
    Pixel, GTM, GA4, Clarity, CAPI   ← integrações da página no Cubo
    {{ head }}                       ← SEU: fontes + <style>
    {{ codeHead }}                   ← script extra do cliente, se houver
  </head>
  <body>
    {{ html }}                       ← SEU: o corpo da página
    aviso de cookies, enriquecimento ← Cubo
    {{ codeBody }}                   ← script extra do cliente, se houver
  </body>
</html>
```

Então:

| Campo da API | O que vai nele |
|---|---|
| `html` | **só o corpo**: `<header>`, `<section>`, `<footer>`, o `<div id="form">` e o trecho do SDK |
| `head` | `<link>` das fontes e **o `<style>` com o CSS da página** |
| `codeHead` / `codeBody` | script de terceiro que o cliente pediu, e só |
| `metaDescription`, `robots`, `favicon` | campos próprios, não escreva no HTML |

⚠️ **O CSS vai em `head`, dentro de um `<style>`.** Existe uma coluna `css` por causa do construtor
visual antigo, mas **ela não é renderizada** na página em HTML. CSS mandado só em `css` não aparece.

## Proibido no `html`

`<!doctype>`, `<html>`, `<head>`, `<body>`, `<meta>`, `<title>` — e **qualquer** rastreamento:
`fbq`, `gtag`, `dataLayer`, GTM, Clarity, chamadas para `/api/capi/track`, aviso de cookies.

Não é questão de estilo: o Cubo já disparou o PageView com um id que casa com o que vai pela API de
Conversões. Um segundo evento seu, com outro id, faz a Meta contar duas visitas — e o cliente toma
decisão de verba em cima desse número.

## Esqueleto

```html
<div class="lp">
  <header class="lp-topo">
    <img src="https://…/logo.svg" alt="Nome da empresa" width="140" height="40" />
  </header>

  <section class="lp-oferta">
    <div class="lp-oferta__texto">
      <h1>A promessa, em uma frase</h1>
      <p class="lp-subtitulo">A frase que tira a dúvida mais óbvia.</p>
      <ul class="lp-provas">…</ul>
    </div>

    <div class="lp-oferta__form">
      <h2>Fale com a gente</h2>
      <div id="form"></div>
    </div>
  </section>

  <section class="lp-prova">…</section>
  <section class="lp-objecoes">…</section>
  <section class="lp-fechamento">
    <a class="lp-cta" href="#form">Quero começar</a>
  </section>

  <footer class="lp-rodape">…</footer>
</div>

<script src="https://SEU-CRM/sdk/form.js" defer></script>
<script>
  addEventListener('DOMContentLoaded', function () {
    new Form({ form: 'frm_XXXXXXXXXXXXXXXX', target: '#form', minHeight: 420, inheritPageStyles: true })
  })
</script>
```

Três coisas sobre o trecho do formulário:

- `SEU-CRM` é o mesmo endereço configurado no acesso. **Não passe `apiBase`**: o SDK descobre pelo
  endereço do próprio script, e é isso que faz a marca branca funcionar;
- `frm_…` é o `publicId` que a criação do formulário devolveu;
- `minHeight` reserva a altura e evita o salto de layout. **Nunca use `lazy`** — ele não existe mais
  e, quando existia, trocava alguns kB por risco de lead perdido.

## CSS

Em `head`, num `<style>` só. Regras práticas:

- prefixe tudo (`.lp-`): o CSS convive com o que o Cubo injeta;
- **não estilize o formulário por CSS da página** — ele desenha em shadow DOM e nada vaza para
  dentro. Para mudar a aparência dele, use as configurações do formulário
  ([formulario.md](formulario.md));
- mobile primeiro. A maior parte do tráfego de anúncio é celular;
- reserve `width` e `height` em toda imagem: é a causa número um de nota baixa por deslocamento;
- fonte do sistema não custa nada e é aceitável quando a marca não tem fonte própria. Se usar Google
  Fonts, **um** peso ou dois, com `display=swap`, e `preconnect` antes.

```html
<!-- head -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&display=swap" rel="stylesheet" />
<style>
  .lp { … }
</style>
```

## Imagens

Suba pelo `POST /api/landings/assets` e use a URL que ele devolve — assim a imagem fica no mesmo
lugar do resto e não some quando alguém apagar um Drive. Limite de 1 MB por arquivo.

Antes de subir: redimensione para o tamanho em que a imagem vai aparecer (foto de topo raramente
precisa passar de 1600px de largura) e prefira `webp`. Uma foto de 3 MB tirada do celular é o que
mais derruba a nota do PageSpeed.

## Script de terceiro

O conteúdo passa por uma checagem: `<script src>` apontando para um domínio fora da lista conhecida
(jsDelivr, cdnjs, unpkg, Google Fonts, GTM, Facebook, jQuery) é **recusado** com 422 dizendo qual
origem foi barrada. Script escrito na própria página continua liberado.

A checagem vale para `html`, `head`, `codeHead` e `codeBody`. Quando for recusado, explique por que
existe a trava em vez de procurar um jeito de contorná-la — inclusive porque **dá** para contorná-la
(script embutido é liberado, e ele carrega o que quiser). Contornar uma trava que existe para
proteger a página do cliente é traição de confiança, não esperteza.
