---
name: landing-page
description: Cria, publica e edita landing page no Cubo (Cubo Suite / Cubo CRM). Use quando a pessoa pedir uma landing page, página de captura, página de vendas, LP, página de inscrição ou quiser editar/republicar uma página que já existe no Cubo. Lê o site do cliente para pegar a identidade, faz a entrevista, escreve o HTML, cria o formulário que gera a negociação, publica no domínio e mede o PageSpeed.
---

# Landing page no Cubo

Você vai entregar uma landing page **publicada e funcionando**: página escrita, formulário criado,
lead caindo no funil certo, domínio no ar e nota do PageSpeed medida.

Quem pede quase nunca é de desenvolvimento web. Os scripts existem para impedir os erros que essa
pessoa não saberia ver (foto de 3 MB, rastreamento duplicado, página que rola para o lado). **Use-os
sempre**, em vez de fazer à mão.

## Regra que muda tudo

A página fica **guardada no Cubo** e é servida por ele, que já injeta sozinho: metatags, favicon,
robots, Pixel da Meta, PageView deduplicado com a API de Conversões, GTM, GA4, Clarity,
enriquecimento de dados e aviso de cookies.

> **Nunca escreva rastreamento no HTML.** Nada de Pixel, GTM, GA4, Clarity, CAPI, aviso de cookies,
> `<!doctype>`, `<html>` ou `<head>`. Escrever de novo faz o evento contar **duas vezes** e estraga o
> relatório do cliente. O que você escreve é: o **corpo** da página, o CSS dela e o trecho do
> formulário. Detalhe em [references/html.md](references/html.md).

Todos os scripts rodam com Node, em Windows, macOS e Linux, e ficam em:

```
${CLAUDE_PLUGIN_ROOT}/skills/landing-page/scripts
```

Nas referências esse caminho aparece como `<scripts>`. **Escreva-o por inteiro em todo comando**
(`node "${CLAUDE_PLUGIN_ROOT}/skills/landing-page/scripts/cubo.mjs" check`): variável de shell não
sobrevive de um comando para o outro, e `$CLAUDE_PLUGIN_ROOT` não existe no terminal.

## O que faz a página não parecer feita por IA

Valem sempre, e estão aqui (e não só nas referências) de propósito:

1. **A estrutura é escolhida, não sai sozinha.** No plano, ofereça **três estruturas de famílias
   diferentes** do catálogo ([references/estruturas.md](references/estruturas.md)), com um desenho
   em texto de cada uma. O "texto de um lado, imagem do outro, até o rodapé" é o molde que denuncia.
2. **Duas seções seguidas nunca têm a mesma composição.**
3. **Proibido, a não ser que a marca peça:** faixa de números grandes com legenda, grade de cartões
   iguais com ícone, rótulo pequeno acima do título, "01/02/03" no que não é sequência, carrossel de
   depoimentos, menu de navegação.
4. **Gente real.** Peça e procure foto de quem atende, do lugar, de clientes reais. Banco de imagem
   genérico, nunca; sem foto de gente, avise que isso custa conversão.
5. **Prova cedo e o botão sem rolar.** Promessa, ação e uma prova cabem na primeira tela do celular.
6. **Texto de gente**: palavra do dia a dia, a do cliente final quando der; nada de "solução
   inovadora", trio de adjetivos ou frase de efeito no fim de cada parágrafo.
7. **Nada inventado**: número, depoimento, prazo, nome de cliente. Lacuna marcada é melhor.

O porquê de cada uma, com as fontes: [references/conversao.md](references/conversao.md) e
[references/design.md](references/design.md).

## Fluxo

### 0. Requisitos — antes de qualquer pergunta

```bash
node --version && node "${CLAUDE_PLUGIN_ROOT}/skills/landing-page/scripts/requisitos.mjs"
```

Sem Node, ou com algo como `FALTA`, **pare e resolva primeiro**, com o texto pronto de
[references/requisitos.md](references/requisitos.md). Descobrir no meio da publicação que falta uma
peça é o que mais frustra quem usa.

### 1. Acesso

Endereço do Cubo e chave de API, guardados com `cubo.mjs configurar` e conferidos com
`cubo.mjs check`. Onde pegar e o que marcar: [references/acesso.md](references/acesso.md).

### 2. Raio-x da marca

Se existe site, landing antiga, loja ou blog do cliente — no briefing, na conversa, na assinatura —
leia **antes** da entrevista. E, se houver concorrentes citados, eles também:

```bash
node "<scripts>/marca.mjs" https://site-do-cliente https://lp-antiga-do-cliente
node "<scripts>/marca.mjs" https://concorrente-a https://concorrente-b --pasta=concorrentes
```

E **abra as capturas que ele gravar**: é nelas que aparece o elemento da marca, o uso da cor e o
estilo de foto. Resuma a identidade em poucas linhas e confirme com a pessoa; dos concorrentes, tire
**o que todos fazem** e **o que ninguém faz**. Junte também frases reais de clientes (depoimentos,
avaliações) — é a matéria-prima do texto. Como fazer tudo isso:
[references/marca.md](references/marca.md).

### 3. Entrevista

[references/questionario.md](references/questionario.md): seis blocos, em rodadas de 3 a 4
perguntas. **Pergunte só o que o briefing e o raio-x não responderam.** Puxe com insistência
**referências** (e o que ela *não* quer) e **prova** (número, depoimento, caso). Página sem prova é
panfleto.

Faltou conteúdo? **Não pare e não use lorem ipsum.** Escreva o rascunho a partir do briefing e do
site, e marque o que depende do cliente: [references/rascunho.md](references/rascunho.md). Número,
depoimento, prazo e nome de cliente **nunca** se inventam.

### 4. Plano

Antes de escrever uma linha:

1. **três estruturas** de famílias diferentes ([references/estruturas.md](references/estruturas.md)),
   cada uma com o desenho em texto da primeira dobra e uma frase de por que serve — a pessoa escolhe;
2. a direção visual: paleta com valores, tipografia com nomes, o elemento que carrega a
   personalidade (de preferência um que o raio-x achou);
3. a promessa principal, e em que o concorrente fica para trás.

Peça o "pode ir". O que evitar: [references/design.md](references/design.md).

### 5. Construção e prévia

Sempre pela API ([references/api.md](references/api.md)):

1. **Imagens**: toda imagem passa pelo `imagem.mjs` (aceita arquivo ou endereço; devolve webp no
   tamanho e peso certos) e sobe por `POST /api/landings/assets`. Regras em
   [references/html.md](references/html.md).
2. **Campos personalizados** que faltarem — e-mail é campo personalizado, não campo base.
3. **Formulário** — `POST /api/forms`, com funil e etapa. Guarde o `publicId` (`frm_…`).
   [references/formulario.md](references/formulario.md).
4. **Domínio** — `GET /api/domains`; se não existir, cadastre e entregue o CNAME.
5. **Prévia local**, com captura:

   ```bash
   node "<scripts>/previa.mjs" corpo.html cabeca.html --capturar
   ```

   **Abra as capturas** (`previa/*-topo.jpg` e `*-pagina.jpg`, celular e computador) e corrija o que
   o script apontar: página rolando para o lado, formulário que não desenhou, imagem sem `alt`,
   trechos em rascunho. Para a pessoa ver no navegador dela: `node "<scripts>/previa.mjs" corpo.html
   cabeca.html` (serve até Ctrl+C). O envio do formulário na prévia não cria negociação.

Ajuste até a pessoa dizer **"pode publicar"**.

### 6. Publicação e medição

1. Sobrou `data-rascunho` no HTML? Liste o que falta e pergunte antes ([rascunho.md](references/rascunho.md)).
2. Confira que o domínio está `active` (`GET /api/domains`). **A API não confere**: página em
   domínio que não resolve fica "no ar" onde ninguém alcança.
3. `POST /api/landings` — **a página nasce no ar** (`status: "active"`). Para deixar pronta e fora
   do ar, mande `"status": "deactivated"`; para publicar depois, `PUT` com `"status": "active"`.
   Caminho ocupado volta 422 com a mensagem: proponha outro e siga.
4. Abra o endereço público e confira que responde e que o formulário desenha.
5. Meça: `node "<scripts>/pagespeed.mjs" https://dominio/caminho`. Abaixo de 90 no celular, conserte e
   meça de novo ([references/pagespeed.md](references/pagespeed.md)).
6. Entregue: endereço, as quatro notas, funil e etapa do lead, e o que ainda depende da pessoa.

## Editar uma página que já existe

**Antes de qualquer alteração, guarde a versão atual:**

```bash
node "<scripts>/backup.mjs" guardar <id>          # desfazer: node "<scripts>/backup.mjs" restaurar <arquivo.json>
```

`GET /api/landings/:id` traz o HTML inteiro. Edite, pré-visualize, e grave com `PUT` **passando o
corpo por arquivo** (`cubo.mjs put /api/landings/<id> @pagina.json`) — no Windows, um HTML inteiro
não cabe na linha de comando. **Só edite pela API páginas com `builderVersion: "html"`**: as de
`"1"` ou `"2"` são do construtor visual, e sobrescrever o HTML delas apaga o que o construtor
guarda. Nesse caso, diga isso à pessoa em vez de escrever por cima.

## Erros que custam caro

- **Escrever Pixel/GTM/GA4 no HTML.** Evento duplicado, relatório estragado.
- **Criar a página antes do "pode publicar".** Ela nasce no ar — com o erro junto.
- **Publicar em domínio que não está `active`.** A API aceita; o visitante não chega.
- **Inventar número, depoimento ou prazo** para preencher buraco. Lacuna visível é melhor.
- **Descrever a marca sem abrir as capturas.** Os números do CSS enganam em página de construtor.
- **Inventar campo base.** No formulário público só existem `title` e `phone`.
- **Usar `lazy` no formulário.** Use `minHeight`.
- **Editar sem `backup.mjs guardar` antes.** Leva dois segundos; refazer à mão leva a tarde.
- **Subir imagem sem o `imagem.mjs`.** Foto de celular tem 3 MB; o Cubo recusa acima de 1 MB.
- **Deixar a nota do PageSpeed para depois.** Ela faz parte da entrega.

## Referências

| Arquivo | Para quê |
|---|---|
| [references/requisitos.md](references/requisitos.md) | Node, chave do PageSpeed, instalação por sistema |
| [references/acesso.md](references/acesso.md) | Chave da API, endereço do CRM, permissões |
| [references/marca.md](references/marca.md) | Raio-x da marca e dos concorrentes, e a linguagem do cliente final |
| [references/questionario.md](references/questionario.md) | Os seis blocos da entrevista |
| [references/estruturas.md](references/estruturas.md) | As estruturas de página, e qual oferecer para cada negócio |
| [references/conversao.md](references/conversao.md) | O que converte, com a evidência e a fonte |
| [references/rascunho.md](references/rascunho.md) | Quando falta conteúdo: o que escrever e o que nunca inventar |
| [references/design.md](references/design.md) | Direção visual, e o visual genérico a evitar |
| [references/html.md](references/html.md) | O que escrever (e o que jamais escrever) no HTML |
| [references/formulario.md](references/formulario.md) | Campos, destino, LGPD, o trecho do SDK |
| [references/api.md](references/api.md) | Todos os endpoints, com corpo e resposta |
| [references/seo.md](references/seo.md) | Título, descrição, dados estruturados, compartilhamento |
| [references/pagespeed.md](references/pagespeed.md) | Como medir e o que costuma derrubar a nota |
