#!/usr/bin/env node
// Pré-visualização LOCAL da página, antes de existir qualquer coisa no Cubo.
//
// Monta o documento a partir do que vai nas colunas `head` e `html` e serve num endereço local. O
// formulário desenha de verdade (o SDK vem do CRM), mas o envio é respondido aqui mesmo: dá para
// preencher e mandar à vontade, que nenhuma negociação é criada.
//
// Com --capturar, tira as capturas de celular e de computador e diz o que achou de errado: é assim
// que o Claude "olha" a página, já que ele não tem tela.
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { abrirNavegador, argumentos, falha } from './lib.mjs'

const { posicionais, opcoes } = argumentos()
const [corpoArquivo, cabecaArquivo] = posicionais

if (!corpoArquivo) {
  console.log(`uso: previa.mjs <corpo.html> [cabeca.html] [--capturar] [--limpa] [--porta=8799]

  corpo.html   o que vai na coluna \`html\` (o corpo da página)
  cabeca.html  o que vai na coluna \`head\` (fontes + <style>)

  sem opção    serve em http://127.0.0.1:<porta>/ até Ctrl+C, para a pessoa abrir no navegador
  --capturar   tira as capturas em ./previa/ e encerra (junte --servir para continuar servindo)
  --limpa      esconde os números dos trechos em rascunho (a lista sai no terminal de qualquer jeito)
  --formulario=arquivo.json
               desenha o formulário do Cubo de verdade no #form, a partir de uma definição local,
               antes de ele existir no CRM (veja references/formulario.md)

Imagem com caminho relativo (ex.: imagens/topo.webp) é servida da pasta do corpo.html.`)
  process.exit(2)
}

for (const arquivo of [corpoArquivo, cabecaArquivo].filter(Boolean)) {
  if (!existsSync(arquivo)) falha(`${arquivo} não existe`, 2)
}

const PASTA_CORPO = dirname(resolve(corpoArquivo))
const SAIDA = resolve('previa')
mkdirSync(SAIDA, { recursive: true })

// Duas travas, só aqui: o envio do formulário é respondido pela própria página e o redirecionamento
// de sucesso é cancelado. Nada disto vai para o Cubo — o que sobe é só o conteúdo dos arquivos.
const TRAVAS = `<script>
(function () {
  var fetchOriginal = window.fetch
  window.fetch = function (entrada, init) {
    var url = String((entrada && entrada.url) || entrada || '')
    var metodo = String((init && init.method) || (entrada && entrada.method) || 'GET').toUpperCase()
    if (metodo !== 'GET' && /\\/public\\/forms\\/[^/]+\\/(submissions|pageview)/.test(url)) {
      var corpo = JSON.stringify({ data: { submissionToken: 'previa', eventId: 'previa', received: true } })
      return Promise.resolve(new Response(corpo, { status: 202, headers: { 'Content-Type': 'application/json' } }))
    }
    return fetchOriginal.apply(this, arguments)
  }
  var guardado
  try {
    Object.defineProperty(window, 'Form', {
      configurable: true,
      get: function () { return guardado },
      set: function (Original) {
        guardado = function (opcoes) {
          var instancia = new Original(opcoes || {})
          try { instancia.on('redirect', function (evento) { evento.preventDefault() }) } catch (e) {}
          return instancia
        }
      },
    })
  } catch (e) {}
})()
</script>`

// A marcação de rascunho vive numa camada própria, criada por script. Ela não pode usar ::before
// nem ::after no elemento marcado: a página costuma usar os dois, e a regra se funde com a dela
// (foi assim que um selo laranja cobriu a foto inteira de um arco).
const MARCA_RASCUNHO = `<style>
.previa-selo { position: absolute; z-index: 2147483647; font: 600 9px/15px system-ui, sans-serif; color: #fff;
  background: rgba(180, 83, 9, .82); min-width: 15px; height: 15px; padding: 0 3px; border-radius: 8px;
  text-align: center; box-sizing: border-box; cursor: help; }
</style>
<script>
addEventListener('load', function () {
  var desenhar = function () {
    document.querySelectorAll('.previa-selo').forEach(function (s) { s.remove() })
    document.querySelectorAll('[data-rascunho]').forEach(function (el, indice) {
      var caixa = el.getBoundingClientRect()
      var selo = document.createElement('div')
      selo.className = 'previa-selo'
      selo.textContent = 'R' + (indice + 1)
      selo.title = el.getAttribute('data-rascunho')
      selo.style.left = Math.max(0, caixa.left + scrollX - 4) + 'px'
      selo.style.top = Math.max(0, caixa.top + scrollY - 6) + 'px'
      document.body.appendChild(selo)
    })
  }
  desenhar()
  if (document.fonts) document.fonts.ready.then(desenhar)
  setTimeout(desenhar, 1500)
  addEventListener('resize', desenhar)
})
</script>`

// Formulário ainda não criado no Cubo: o SDK publicado no npm desenha a partir da definição local,
// em modo prévia — sem rede e sem envio. É o mesmo modo que a pré-visualização do CRM usa.
const SDK_PUBLICO = 'https://cdn.jsdelivr.net/npm/@cubosuite/form@1/dist/form.umd.js'

function formularioLocal() {
  if (!opcoes.formulario) return ''
  if (!existsSync(opcoes.formulario)) falha(`${opcoes.formulario} não existe`, 2)
  const configuracao = JSON.parse(readFileSync(opcoes.formulario, 'utf8'))
  if (!configuracao.definition?.fields?.length) falha(`${opcoes.formulario} precisa ter "definition" com "fields"`, 2)
  return `<script src="${SDK_PUBLICO}"></script>
<script>
addEventListener('DOMContentLoaded', function () {
  var alvo = document.querySelector('#form')
  if (!alvo) return console.error('previa: a página não tem <div id="form">')
  alvo.innerHTML = ''
  new Form(Object.assign({ minHeight: 420, inheritPageStyles: true }, ${JSON.stringify(configuracao)}, { target: alvo, preview: true }))
})
</script>`
}

function documento() {
  const corpo = readFileSync(corpoArquivo, 'utf8')
  const cabeca = cabecaArquivo ? readFileSync(cabecaArquivo, 'utf8') : ''
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Pré-visualização</title>
${TRAVAS}
${cabeca}
${opcoes.limpa ? '' : MARCA_RASCUNHO}
</head>
<body>
${corpo}
${formularioLocal()}
</body>
</html>`
}

// Roda dentro da página. Mede o acabamento que se vê nas capturas e costuma escapar: título virando
// parede, frase curta espremida, colunas desproporcionais, botão quebrado. Não substitui olhar.
function medirAcabamento(largura) {
  const achados = []
  const nome = (el) => `<${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? ` class="${el.className.split(' ')[0]}"` : ''}>`
  const texto = (el) => el.innerText.replace(/\s+/g, ' ').trim()
  const visivel = (el) => { const c = el.getBoundingClientRect(); return c.width > 0 && c.height > 0 && getComputedStyle(el).visibility !== 'hidden' }
  const linhas = (el) => { const e = getComputedStyle(el); const lh = parseFloat(e.lineHeight) || parseFloat(e.fontSize) * 1.2; return Math.round(el.getBoundingClientRect().height / lh) }

  for (const el of document.querySelectorAll('h1, h2, h3, blockquote')) {
    if (!visivel(el)) continue
    const n = linhas(el)
    const limite = el.tagName === 'H3' ? 4 : 3
    if (n > limite) achados.push(`título em ${n} linhas: ${nome(el)} "${texto(el).slice(0, 60)}…" — encurte ou diminua (acabamento.md)`)
    if (/^H[12]$/.test(el.tagName) && n > 1 && !/balance|pretty/.test(getComputedStyle(el).textWrap || '')) achados.push(`título sem text-wrap: balance: ${nome(el)} "${texto(el).slice(0, 40)}…"`)
  }

  for (const el of document.querySelectorAll('p, figcaption, li, blockquote, h2, h3')) {
    if (!visivel(el) || !el.parentElement) continue
    // Item de uma grade ou fileira com vários lado a lado é estreito de propósito.
    const irmaos = [...el.parentElement.children].filter((f) => f !== el && visivel(f))
    if (/grid|flex/.test(getComputedStyle(el.parentElement).display) && irmaos.some((f) => Math.abs(f.getBoundingClientRect().top - el.getBoundingClientRect().top) < 12)) continue
    const t = texto(el)
    const n = linhas(el)
    const caixa = el.getBoundingClientRect().width
    const pai = el.parentElement.getBoundingClientRect().width
    if (t.length < 170 && n >= 3 && caixa < pai * 0.62) achados.push(`frase curta espremida em ${n} linhas (${Math.round(caixa)}px num bloco de ${Math.round(pai)}px): ${nome(el)} "${t.slice(0, 50)}…"`)
  }

  for (const el of document.querySelectorAll('a, button')) {
    if (!visivel(el) || !texto(el) || texto(el).length > 60) continue
    const e = getComputedStyle(el)
    if (e.display === 'block' && el.getBoundingClientRect().width > largura * 0.9) continue
    if (linhas(el) >= 2 && el.getBoundingClientRect().height > (parseFloat(e.lineHeight) || 20) * 1.8 + parseFloat(e.paddingTop) + parseFloat(e.paddingBottom)) {
      achados.push(`botão ou link quebrado em duas linhas: "${texto(el).slice(0, 40)}"`)
    }
  }

  for (const el of document.querySelectorAll('body *')) {
    const d = getComputedStyle(el).display
    if (!/grid|flex/.test(d) || !visivel(el)) continue
    const filhos = [...el.children].filter(visivel).map((f) => f.getBoundingClientRect())
    if (filhos.length < 2) continue
    const mesmaLinha = filhos.filter((c) => Math.abs(c.top - filhos[0].top) < 12)
    if (mesmaLinha.length < 2) continue
    const alturas = mesmaLinha.map((c) => c.height)
    const maior = Math.max(...alturas)
    const menor = Math.min(...alturas)
    if (menor > 80 && maior / menor > 1.45 && maior - menor > 220) achados.push(`colunas desproporcionais lado a lado (${Math.round(maior)}px × ${Math.round(menor)}px): ${nome(el)} — equilibre (acabamento.md, "proporção")`)
  }

  const tamanhos = new Set()
  const familias = new Set()
  for (const el of document.querySelectorAll('body *')) {
    if (!visivel(el) || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue
    const e = getComputedStyle(el)
    tamanhos.add(Math.round(parseFloat(e.fontSize)))
    familias.add(e.fontFamily.split(',')[0].replace(/["']/g, '').trim())
  }
  if (tamanhos.size > 7) achados.push(`${tamanhos.size} tamanhos de letra diferentes (${[...tamanhos].sort((a, b) => a - b).join(', ')}px) — use uma escala de no máximo cinco`)
  if (familias.size > 3) achados.push(`${familias.size} famílias de fonte: ${[...familias].join(', ')} — três é o teto`)

  const primeiraTela = [...document.querySelectorAll('input, select, textarea, a, button')]
    .some((el) => { const c = el.getBoundingClientRect(); return visivel(el) && c.top < window.innerHeight && !el.closest('header, nav') && texto(el).length < 60 && (el.tagName !== 'A' || getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)') })
  const noShadow = [...document.querySelectorAll('*')].some((el) => el.shadowRoot && el.getBoundingClientRect().top < window.innerHeight && el.shadowRoot.querySelector('input, button'))
  if (!primeiraTela && !noShadow) achados.push('nenhum botão nem formulário na primeira tela — a ação tem que aparecer sem rolar')

  return [...new Set(achados)].slice(0, 12)
}

const TIPOS = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2' }

const servidor = createServer((pedido, resposta) => {
  const caminho = decodeURIComponent(new URL(pedido.url, 'http://x').pathname)
  if (caminho === '/' || caminho === '/index.html') {
    const html = documento()
    writeFileSync(join(SAIDA, 'index.html'), html)
    resposta.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    return resposta.end(html)
  }
  if (caminho === '/favicon.ico') {
    resposta.writeHead(204)
    return resposta.end()
  }
  const arquivo = normalize(join(PASTA_CORPO, caminho))
  if (!arquivo.startsWith(PASTA_CORPO) || !existsSync(arquivo) || !statSync(arquivo).isFile()) {
    resposta.writeHead(404)
    return resposta.end()
  }
  resposta.writeHead(200, { 'Content-Type': TIPOS[extname(arquivo).toLowerCase()] || 'application/octet-stream' })
  resposta.end(readFileSync(arquivo))
})

// Porta ocupada (outra prévia aberta, outro programa) não pode parar o trabalho: cai numa livre.
const escutar = (porta) => new Promise((pronto, erro) => servidor.once('error', erro).listen(porta, '127.0.0.1', pronto))
const portaPedida = Number(opcoes.porta || 8799)
await escutar(portaPedida).catch(async (erro) => {
  if (erro.code !== 'EADDRINUSE') falha(erro.message)
  console.log(`(a porta ${portaPedida} está ocupada; usando outra)`)
  await escutar(0)
})
const endereco = `http://127.0.0.1:${servidor.address().port}/`

// Página publicada é https: qualquer recurso http:// é bloqueado pelo navegador (imagem some,
// formulário não carrega) — e na prévia local, que é http, isso passa despercebido.
const inseguros = [...new Set([...`${readFileSync(corpoArquivo, 'utf8')}${cabecaArquivo ? readFileSync(cabecaArquivo, 'utf8') : ''}`
  .matchAll(/(?:src|href)\s*=\s*["'](http:\/\/[^"']+)/gi)].map((m) => m[1]))]

const rascunhos = [...readFileSync(corpoArquivo, 'utf8').matchAll(/data-rascunho="([^"]*)"/g)].map((m) => m[1])

if (opcoes.capturar) {
  const { navegador } = await abrirNavegador()
  const problemas = []
  for (const [nome, viewport, movel] of [['desktop', { width: 1366, height: 860 }, false], ['celular', { width: 390, height: 844 }, true]]) {
    const pagina = await navegador.newPage({ viewport, isMobile: movel, hasTouch: movel })
    pagina.on('console', (msg) => msg.type() === 'error' && problemas.push(`[${nome}] console: ${msg.text().slice(0, 200)}`))
    pagina.on('pageerror', (erro) => problemas.push(`[${nome}] erro de script: ${erro.message.slice(0, 200)}`))
    pagina.on('requestfailed', (req) => problemas.push(`[${nome}] não carregou: ${req.url().slice(0, 160)}`))
    await pagina.goto(endereco, { waitUntil: 'load', timeout: 45_000 }).catch(() => {})
    // A captura da página inteira não rola a tela, então imagem com loading="lazy" nunca carregaria.
    await pagina.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
        window.scrollTo(0, y)
        await new Promise((pronto) => setTimeout(pronto, 80))
      }
      window.scrollTo(0, 0)
    })
    await pagina.waitForTimeout(2500)

    // No modo celular o navegador alarga a janela até caber o conteúdo, então comparar com
    // `innerWidth` nunca acusa nada: a régua é a largura que pedimos.
    const vazando = await pagina.evaluate((largura) => [...document.querySelectorAll('body *:not(.previa-selo)')]
      .filter((el) => el.getBoundingClientRect().right > largura + 1)
      .filter((el, _, todos) => !todos.some((outro) => outro !== el && outro.contains(el)))
      .slice(0, 3)
      .map((el) => `<${el.tagName.toLowerCase()}${el.className ? ` class="${el.className}"` : ''}> até ${Math.round(el.getBoundingClientRect().right)}px`), viewport.width)
    if (vazando.length) problemas.push(`[${nome}] a página rola para o lado (tela de ${viewport.width}px): ${vazando.join('; ')}`)
    // O SDK desenha dentro de um shadow DOM: sem descer nele, todo formulário real pareceria ausente.
    const campos = await pagina.evaluate(() => {
      const conta = (raiz) => raiz.querySelectorAll('input, select, textarea').length +
        [...raiz.querySelectorAll('*')].reduce((total, el) => total + (el.shadowRoot ? conta(el.shadowRoot) : 0), 0)
      return conta(document)
    })
    if (!campos) problemas.push(`[${nome}] nenhum campo de formulário apareceu — o SDK carregou? o id do formulário está certo?`)
    // O Cubo não zera a margem do body: sem o reset no CSS da página, ela vai ao ar com uma borda.
    const margem = await pagina.evaluate(() => getComputedStyle(document.body).margin)
    if (margem !== '0px') problemas.push(`[${nome}] a página tem uma borda em volta (margem do body: ${margem}) — ponha html, body { margin: 0 } no CSS da página: o template do Cubo não zera para página em HTML`)
    for (const achado of await pagina.evaluate(medirAcabamento, viewport.width)) problemas.push(`[${nome}] ${achado}`)
    const semAlt = await pagina.evaluate(() => [...document.images].filter((i) => !i.hasAttribute('alt')).length)
    if (semAlt) problemas.push(`[${nome}] ${semAlt} imagem(ns) sem alt`)

    await pagina.screenshot({ path: join(SAIDA, `${nome}-topo.jpg`), type: 'jpeg', quality: 75 })
    await pagina.screenshot({ path: join(SAIDA, `${nome}-pagina.jpg`), type: 'jpeg', quality: 65, fullPage: true })
    await pagina.close()
  }
  await navegador.close()

  console.log(`capturas em ${SAIDA}:`)
  for (const nome of ['desktop-topo', 'desktop-pagina', 'celular-topo', 'celular-pagina']) console.log(`  ${join(SAIDA, `${nome}.jpg`)}`)
  console.log('')
  if (inseguros.length) problemas.push(`endereço http:// na página (a publicada é https e o navegador bloqueia): ${inseguros.slice(0, 4).join(', ')}`)
  console.log(problemas.length ? `o que achei:\n  ${[...new Set(problemas)].join('\n  ')}` : 'nenhum problema técnico encontrado.')
  console.log('')
  console.log(rascunhos.length ? `trechos em RASCUNHO (${rascunhos.length}) — precisam de conteúdo real antes de publicar:\n${rascunhos.map((texto, indice) => `  R${indice + 1}  ${texto}`).join('\n')}` : 'nenhum trecho em rascunho.')
  if (!opcoes.servir) {
    servidor.close()
    process.exit(0)
  }
}

console.log(`pré-visualização em ${endereco}`)
console.log('(o envio do formulário aqui NÃO cria negociação; Ctrl+C encerra)')
