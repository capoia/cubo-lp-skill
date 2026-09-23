# PageSpeed

Medir faz parte da entrega. Uma página de anúncio que demora 4 segundos no celular perde lead antes
de ser lida — e o custo por lead sobe sem ninguém entender por quê.

## Como medir

```bash
"${CLAUDE_PLUGIN_ROOT}/skills/landing-page/scripts/pagespeed.sh" https://dominio/caminho
```

Mede **celular** por padrão (é de onde vem a maior parte do tráfego de anúncio) e devolve as quatro
notas mais as métricas que costumam explicar a de desempenho. Para o computador:

```bash
"…/pagespeed.sh" https://dominio/caminho desktop
```

A API é a do PageSpeed Insights do Google. **Sem chave, o limite é compartilhado entre todo mundo e
estoura com frequência** (erro 429, "Queries per day"). Dois caminhos quando isso acontecer:

1. **Chave gratuita**, que resolve de vez: em `https://developers.google.com/speed/docs/insights/v5/get-started`
   a pessoa cria um projeto no Google Cloud, ativa a *PageSpeed Insights API* e gera uma chave de
   API. Depois basta `export PAGESPEED_API_KEY="…"` — o script usa sozinho. Não custa nada e não
   pede cartão.
2. **Medir localmente**, sem chave nenhuma:

   ```bash
   npx --yes lighthouse@12 https://dominio/caminho --quiet --chrome-flags="--headless" \
     --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=./lh.json
   ```

   Precisa de Chrome instalado na máquina. As notas saem em `lh.json`, em `categories.*.score`.

A página precisa estar **publicada e alcançável**: o Google busca de fora. Não dá para medir a
pré-visualização.

## O que perseguir

| Categoria | Meta |
|---|---|
| Desempenho (celular) | ≥ 90 |
| Acessibilidade | ≥ 95 |
| Boas práticas | ≥ 95 |
| SEO | ≥ 95 |

Abaixo disso, conserte e meça de novo. Se depois de dois ajustes não subir, diga à pessoa o que
está segurando e por quê, em vez de entregar um número sem explicação.

## O que costuma derrubar, em ordem

1. **Imagem grande.** É a causa em quase todo caso — e é por isso que existe o `imagem.sh`, que
   redimensiona, converte para webp e aperta até caber no orçamento (200 KB no topo, 100 KB nas
   demais). No HTML, `width`/`height` em todas, `fetchpriority="high"` na do topo e
   `loading="lazy"` no resto.
2. **Fonte.** Cada família e cada peso é um arquivo. Use uma família e dois pesos no máximo, com
   `display=swap` e `preconnect`. Fonte do sistema custa zero.
3. **Deslocamento de layout (CLS).** Imagem sem dimensão, e formulário sem altura reservada. Use
   `minHeight` no SDK — é para isso que ele existe.
4. **Script de terceiro.** Chat, mapa embutido, vídeo incorporado. Cada um paga pedágio. Mapa e
   vídeo podem virar imagem clicável que só carrega o embutido depois do clique.
5. **CSS demais.** Uma landing cabe em poucos kB de CSS escrito à mão. Não traga framework inteiro
   para usar três classes.

## O que **não** é culpa sua

O Cubo injeta Pixel, GTM, GA4, Clarity e enriquecimento de dados conforme o que estiver configurado
**na página** — e cada um desses pesa. Numa página com GTM e Clarity ligados, desempenho 100 no
celular é improvável, e tudo bem: o cliente escolheu medir.

Quando a nota estiver presa por causa disso, **diga com clareza**: "desempenho 78; 14 pontos vêm do
GTM e do Clarity, que estão ligados nas configurações da página. Desligando o Clarity, sobe para
~88. Quer que eu desligue?" — a decisão é dela, não sua.
