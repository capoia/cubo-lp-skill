# CLAUDE.md

Orientação para o Claude Code trabalhando **neste repositório** (desenvolvendo a skill). Não
confundir com o `skills/landing-page/SKILL.md`, que é a instrução para a skill **em uso**, quando
alguém pede uma landing page.

## O que é este repositório

Um **plugin do Claude Code** que é, ao mesmo tempo, o seu próprio marketplace — por isso os dois
manifestos em `.claude-plugin/`. Ele entrega uma skill: criar, publicar e editar landing page no
Cubo (Cubo Suite / Cubo CRM), pela API, com entrevista, SEO e medição de PageSpeed.

Quem instala roda:

```
/plugin marketplace add capoia/cubo-lp-skill
/plugin install cubo-landing@cubo
```

O repositório é **público** desde 2026-09-23 — é o que permite instalar sem dar acesso ao GitHub. A
skill não vai para tenant: quem precisar, copia ou forka. Não há nada de interno aqui dentro (só
documentação de API pública e os scripts), e a varredura antes de abrir confirmou: nenhuma chave,
nenhum host interno.

## Estrutura

```
.claude-plugin/
  plugin.json        nome, versão, descrição — o que aparece na instalação
  marketplace.json   o catálogo; a entrada aponta para "./" (o próprio repositório)
skills/landing-page/
  SKILL.md           o FLUXO, curto de propósito
  references/*.md    o detalhe, lido sob demanda
  scripts/*.sh       cliente da API, preparo de imagem e medição
```

**O `SKILL.md` fica curto e os `references/` carregam sob demanda.** Não é preferência de estilo: o
`SKILL.md` entra em **toda** sessão de quem tem o plugin instalado (~163 tokens hoje), enquanto os
arquivos de referência só entram quando a skill precisa deles (~2,8k por invocação). Engordar o
`SKILL.md` cobra de todo mundo, o tempo inteiro. Detalhe novo vai para `references/`, e o `SKILL.md`
ganha no máximo um ponteiro.

Confira o custo depois de mexer:

```bash
claude plugin details cubo-landing
```

## Regras de escrita

- **Texto em pt-BR**, incluindo comentário de script. Quem lê é o Wellington e os clientes dele.
- **Identificador em inglês** quando houver (nome de arquivo, variável). O conteúdo é que é pt-BR.
- **A skill fala com quem não é técnico.** Nas partes que viram fala com o cliente (instrução de
  CNAME, pedido da chave de API), escreva o texto pronto para ser copiado, não uma descrição do que
  dizer.
- **Nada de promessa que o código não cumpre.** Se uma trava do CRM é contornável, a referência diz
  que é contornável — foi assim com a checagem de `<script src>`. Skill que mente sobre a garantia
  faz o agente confiar onde não devia.

## A fonte da verdade da API é o CRM, não este repositório

`references/api.md` e `references/formulario.md` descrevem endpoints que vivem em
`capoia/cubo-crm`. Quando a API mudar, **quem manda é o CRM**:

| O que você quer saber | Onde está, no `cubo-crm` |
| --- | --- |
| Endpoints, corpo aceito, escopos | `app/controllers/api/{landing,form,domain}_controller.ts` e `app/validators/landing.ts` |
| O que a página em HTML pode e não pode ter | `docs/form-sdk/GUIA-PAGINA-HTML.md` |
| Formulário: campos, `settings`, LGPD, rastreamento | `docs/form-sdk/README.md` e `app/types/form_settings.ts` |
| Andamento e decisões do projeto | `docs/form-sdk/LEDGER.md` |
| Opções do SDK na página | `capoia/cubo-form-sdk`, `README.md` e `src/types.ts` |

Antes de escrever que a API aceita um campo, **confirme no validador**. Já aconteceu de a referência
prometer `status` e `css`, que a API recusa de propósito.

## Como testar uma mudança

1. **Valide os manifestos** — pega erro de JSON e de frontmatter antes de instalar:

   ```bash
   claude plugin validate .
   ```

2. **Instale a partir da pasta local**, sem passar pelo GitHub:

   ```
   /plugin marketplace add /Users/wellingtoncapoia/Documents/Repositories/cubo-suite/cubo-lp-skill
   /plugin install cubo-landing@cubo
   ```

   Precisa de sessão nova para carregar. Para voltar à versão do GitHub, remova o marketplace local
   (`/plugin marketplace remove cubo`) e adicione `capoia/cubo-lp-skill` de novo.

3. **Exercite os scripts de verdade**, contra um CRM que responda:

   ```bash
   export CUBO_BASE_URL="http://127.0.0.1:3336" CUBO_API_KEY="sk_..."
   ./skills/landing-page/scripts/cubo.sh check
   ```

   Um slot de worktree do `cubo-crm` (`pnpm dev:docker`) serve bem. Chave de API pela tela
   `/apikeys`, com as permissões de landing pages, formulários, domínios e campos personalizados.

4. **Rode a skill inteira uma vez** antes de dar por pronta. Ler o `SKILL.md` não mostra o que
   trava: o que trava é a entrevista longa demais, a referência que não responde a pergunta que
   apareceu, o endpoint que devolve um erro que o texto não previu.

## Publicar uma versão

1. suba `version` nos **dois** manifestos (`plugin.json` e a entrada do `marketplace.json`) — eles
   precisam concordar;
2. commite e empurre a `main`;
3. opcionalmente, marque a versão: `claude plugin tag .` cria `cubo-landing--v<versão>` conferindo
   que os dois manifestos batem.

Quem já instalou atualiza com `/plugin update cubo-landing` (ou `claude plugin update`).

## Armadilhas já pagas

- **Não rode `prettier` neste repositório.** Não há configuração aqui; o padrão dele reformata tudo
  com aspas duplas e ponto e vírgula, e vira um diff de mil linhas em cima de nada.
- **`${CLAUDE_PLUGIN_ROOT}` é o único caminho confiável** para os scripts dentro do `SKILL.md`.
  Caminho relativo funciona nos links de markdown entre os `references/`, mas não em comando de
  shell — a skill roda a partir do diretório do usuário, não do plugin.
- **Os scripts precisam do bit de execução** (`chmod +x`) no commit. Sem ele, a cópia instalada não
  roda e o erro só aparece na mão de quem instalou.
- **`sips` do macOS não escreve webp** — lê, mas não escreve ("Can't write format:
  org.webmproject.webp"); e um `ffmpeg` sem libwebp também não serve. Medido nas duas ferramentas. O
  `imagem.sh` depende de `cwebp` e para com instrução de instalação quando ele falta, em vez de
  cair num caminho que entrega jpg pesado.
- **A cota pública do PageSpeed estoura com frequência.** O `pagespeed.sh` já explica os dois
  caminhos (chave gratuita ou Lighthouse local) quando devolve 429; não troque isso por um "tente
  de novo".

## Repositórios irmãos

| Repositório | Papel |
| --- | --- |
| `capoia/cubo-crm` | o CRM: API, telas, e o `landing.edge` que serve a página |
| `capoia/cubo-form-sdk` | o `@cubosuite/form`, o bundle que desenha o formulário na página |
| `gitlab.com/weellingtonc/landing-server` | quem serve a landing publicada, lendo `landings.html` do banco |
