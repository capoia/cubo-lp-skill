# Landing page no Cubo — skill do Claude Code

Skill que faz a landing page inteira: entrevista, escreve a página, cria o formulário que gera a
negociação no funil, publica no domínio e mede o PageSpeed. Tudo pela API do Cubo — nada de copiar e
colar HTML no painel.

## Instalar

No Claude Code:

```
/plugin marketplace add capoia/cubo-lp-skill
/plugin install cubo-landing@cubo
```

Repositório privado, por SSH:

```
/plugin marketplace add git@github.com:capoia/cubo-lp-skill.git
/plugin install cubo-landing@cubo
```

De uma pasta local (para testar antes de publicar):

```
/plugin marketplace add /caminho/para/cubo-lp-skill
/plugin install cubo-landing@cubo
```

## Usar

Depois de instalada, basta pedir:

> cria uma landing page pra captar leads do curso de inglês

Ou chamar direto: `/cubo-landing:landing-page`.

A skill vai:

1. **pedir o acesso** — o endereço do seu Cubo e uma chave de API, e ensinar onde criar a chave com
   as permissões certas;
2. **entrevistar** — seis blocos curtos: oferta, público, prova, objeções, conversão, marca,
   referências, SEO e publicação. Ela pede referências de páginas que você gosta, e o que você **não**
   quer;
3. **propor o plano** — estrutura, direção visual e a promessa principal, para você aprovar antes de
   qualquer código;
4. **construir** — campos personalizados que faltarem, o formulário com funil e etapa de destino, o
   domínio (com o CNAME para apontar, se for novo) e a página, que **nasce fora do ar**;
5. **pré-visualizar** — link temporário de 24 h, sem rastreamento, com o formulário em modo de teste.
   Dá para mandar para o cliente aprovar;
6. **publicar e medir** — publica e devolve as notas do PageSpeed (desempenho, acessibilidade, boas
   práticas e SEO), consertando o que derrubar a nota.

Também edita página que já existe: `edita a landing //promo, troca a chamada principal`.

## O que você precisa ter

- **Cubo** com os módulos de landing pages, formulários e domínios ativos;
- **chave de API** com as permissões de landing pages, formulários, domínios e campos
  personalizados (a skill confere e diz se faltar alguma);
- um **domínio** apontado para o Cubo, ou vontade de apontar um (a skill cadastra e entrega o CNAME).

Opcional: `PAGESPEED_API_KEY` no ambiente. Sem ela a medição usa a cota pública do Google, que é
compartilhada e às vezes estoura.

## Por que a página fica guardada no Cubo

Porque é o que faz ela ter, de graça, tudo que uma landing do construtor tem: Pixel, PageView
deduplicado com a API de Conversões, GTM, GA4, Clarity, enriquecimento de dados, aviso de cookies,
metatags, favicon e robots. A skill escreve só o corpo da página e o formulário — e **nunca** escreve
rastreamento, porque isso faria o evento contar duas vezes.

## Estrutura

```
.claude-plugin/       plugin.json + marketplace.json
skills/landing-page/
  SKILL.md            o fluxo
  references/         acesso, questionário, design, html, formulário, api, seo, pagespeed
  scripts/            cubo.sh (cliente da API) e pagespeed.sh (medição)
```

Os arquivos de `references/` são lidos sob demanda: o `SKILL.md` fica curto e o detalhe só entra no
contexto quando é preciso.
