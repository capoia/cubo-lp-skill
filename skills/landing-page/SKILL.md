---
name: landing-page
description: Cria, publica e edita landing page no Cubo (Cubo Suite / Cubo CRM). Use quando a pessoa pedir uma landing page, página de captura, página de vendas, LP, página de inscrição ou quiser editar/republicar uma página que já existe no Cubo. Faz a entrevista, escreve o HTML, cria o formulário que gera a negociação, publica no domínio e mede o PageSpeed.
---

# Landing page no Cubo

Você vai entregar uma landing page **publicada e funcionando**: página escrita, formulário criado,
lead caindo no funil certo, domínio no ar e nota do PageSpeed medida. Não é um rascunho de HTML.

## Regra que muda tudo

A página fica **guardada no Cubo** e é servida por ele. Isso significa que o Cubo já injeta, sozinho:
metatags, favicon, robots, Pixel da Meta, PageView deduplicado com a API de Conversões, GTM, GA4,
Clarity, enriquecimento de dados e aviso de cookies.

> **Nunca escreva rastreamento no HTML.** Nada de Pixel, GTM, GA4, Clarity, CAPI, aviso de cookies,
> `<!doctype>`, `<html>` ou `<head>`. Tudo isso vem do registro da página. Escrever de novo faz o
> evento contar **duas vezes** e estraga o relatório do cliente.
>
> O que você escreve é: o **corpo** da página, o CSS dela e o trecho do formulário.

Detalhe completo em [references/html.md](references/html.md).

## Fluxo

Siga na ordem. Não pule a aprovação do passo 4 — publicar é o que fica visível para o mundo.

### 1. Acesso

Confira se há chave e endereço configurados:

```bash
"${CLAUDE_PLUGIN_ROOT}/skills/landing-page/scripts/cubo.sh" check
```

Faltando, peça à pessoa e ensine onde pegar — o passo a passo está em
[references/acesso.md](references/acesso.md). Não siga sem a checagem passar: ela também diz quais
permissões a chave tem e quais faltam.

### 2. Entrevista

**Este é o passo que decide a qualidade da página.** Use
[references/questionario.md](references/questionario.md) — são seis blocos, feitos para serem
perguntados em rodadas curtas (3 a 4 perguntas por vez, com opções prontas sempre que der), nunca
como um formulário gigante de uma vez.

Duas coisas a puxar com insistência, porque são as que mais mudam o resultado:

- **referências**: peça 1 a 3 endereços de páginas que a pessoa acha boas, e o que exatamente ela
  gosta em cada uma. Abra cada uma e olhe. Pergunte também o que ela **não** quer;
- **prova**: número, depoimento, caso, credencial, garantia. Página sem prova é panfleto.

Se a pessoa disser "faz do seu jeito", ainda assim confirme: para quem é, qual ação a página pede, e
o que acontece depois que a pessoa envia. Sem essas três, não comece.

### 3. Plano

Antes de escrever uma linha, apresente em poucas linhas: a estrutura de seções, a direção visual
(paleta com valores, tipografia com nomes, o elemento que carrega a personalidade) e o texto da
promessa principal. Peça o "pode ir".

A direção visual é decisão sua e precisa ser **desta** página, não o padrão bonito que serve para
qualquer coisa: [references/design.md](references/design.md) diz o que evitar e por quê.

### 4. Construção

Nesta ordem, sempre pela API ([references/api.md](references/api.md)):

1. **Imagens**, se houver: passe cada uma pelo `scripts/imagem.sh` (webp, tamanho e peso certos) e
   suba com `POST /api/landings/assets`. Regras e limites em [references/html.md](references/html.md).
2. **Campos personalizados** que faltarem (e-mail, por exemplo, é campo personalizado, não campo
   base) — `GET /api/customfields`, `POST /api/customfields`.
3. **Formulário** — `POST /api/forms`, com o funil e a etapa de destino. Guarde o `publicId`
   (`frm_…`): é ele que vai no trecho do SDK. Regras de campo em
   [references/formulario.md](references/formulario.md).
4. **Domínio** — `GET /api/domains`. Se o que a pessoa quer não existe, cadastre com
   `POST /api/domains` e entregue o CNAME para ela apontar; confira com
   `POST /api/domains/:id/verify`. Publicar em domínio que ainda não resolve é página no ar que
   ninguém alcança.
5. **Prévia local**, antes de criar qualquer coisa no Cubo:

   ```bash
   "${CLAUDE_PLUGIN_ROOT}/skills/landing-page/scripts/previa.sh" corpo.html cabeca.html
   ```

   Monta o documento, serve num endereço local e abre. O formulário desenha de verdade (o SDK vem
   do CRM), mas o envio é interceptado na própria página — pode preencher e mandar à vontade.
   Confira no celular e no computador, ajuste, e mostre para a pessoa.

6. **Página** — `POST /api/landings`, só depois de a prévia estar boa. Ela nasce **fora do ar**.
   Se o caminho já estiver ocupado, vem 422 com "Já existe uma landing page ou formulário com este
   domínio e caminho" — proponha outro e siga, sem drama.

Corrija o que ela pedir e faça a prévia de novo. Só avance com um "pode publicar" explícito.

**Se ela quiser mostrar ao cliente antes de valer**, publique num caminho descartável
(`/previa-turma-marco`), mande o endereço, e depois troque a `url` para a definitiva com um `PUT`.
Não invente endpoint nem serviço de hospedagem para isso.

### 5. Publicação e medição

1. `POST /api/landings/:id/publish`.
2. Abra o endereço público e confira que a página responde e que o formulário desenha.
3. Meça:

```bash
"${CLAUDE_PLUGIN_ROOT}/skills/landing-page/scripts/pagespeed.sh" https://dominio/caminho
```

4. Se o desempenho no celular vier abaixo de 90, conserte o que o relatório apontar (quase sempre é
   imagem grande ou fonte demais) e meça de novo. O que costuma resolver está em
   [references/pagespeed.md](references/pagespeed.md).
5. Entregue: endereço publicado, notas das quatro categorias, para onde o lead vai (funil e etapa) e
   o que a pessoa precisa fazer por conta própria, se sobrou algo.

## Editar uma página que já existe

`GET /api/landings` lista. `GET /api/landings/:id` traz o HTML inteiro. Edite, pré-visualize,
publique. **Só edite pela API páginas com `builderVersion: "html"`** — as de `"1"` ou `"2"` foram
feitas no construtor visual do Cubo, e sobrescrever o HTML delas apaga o que o construtor guarda.
Nesse caso, diga isso à pessoa em vez de escrever por cima.

## Erros que custam caro

- **Escrever Pixel/GTM/GA4 no HTML.** Evento duplicado, relatório estragado. O Cubo já injeta.
- **Publicar sem pré-visualizar.** A página fica no ar para o anúncio, com o erro junto.
- **Publicar em domínio `validating`.** A API recusa, e ainda bem.
- **Inventar campo base.** No formulário público só existem `title` e `phone` como campos base;
  qualquer outro dado é campo personalizado.
- **Usar `lazy` no formulário.** O formulário é o motivo da página existir. Use `minHeight`.
- **Deixar a nota do PageSpeed para depois.** Ela faz parte da entrega.
- **Subir imagem sem passar pelo `imagem.sh`.** Uma foto de celular tem 3 MB; o Cubo recusa acima de
  1 MB, e mesmo o que passa derruba a nota e gasta a cota de armazenamento do cliente.

## Referências

| Arquivo | Para quê |
|---|---|
| [references/acesso.md](references/acesso.md) | Chave da API, endereço do CRM, permissões |
| [references/questionario.md](references/questionario.md) | Os seis blocos da entrevista |
| [references/design.md](references/design.md) | Direção visual, e o visual genérico a evitar |
| [references/html.md](references/html.md) | O que escrever (e o que jamais escrever) no HTML |
| [references/formulario.md](references/formulario.md) | Campos, destino, LGPD, o trecho do SDK |
| [references/api.md](references/api.md) | Todos os endpoints, com corpo e resposta |
| [references/seo.md](references/seo.md) | Título, descrição, dados estruturados, compartilhamento |
| [references/pagespeed.md](references/pagespeed.md) | Como medir e o que costuma derrubar a nota |
