#!/usr/bin/env node
// Teste de fumaça dos scripts da skill. Roda no CI em Windows, macOS e Linux — é a única prova de
// que a skill funciona fora da máquina de quem escreveu. Sobe um Cubo de mentira na própria
// máquina, então não precisa de chave, de rede, nem de CRM no ar.
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'landing-page', 'scripts')
const PASTA = mkdtempSync(join(tmpdir(), 'cubo-lp-fumaca-'))
const resultados = []

// Assíncrono de propósito: o Cubo de mentira roda neste mesmo processo, e um spawnSync congelaria o
// servidor enquanto o script filho espera a resposta dele.
function roda(script, args = [], ambiente = {}) {
  return new Promise((pronto) => {
    const filho = spawn(process.execPath, [join(SCRIPTS, script), ...args], { cwd: PASTA, env: { ...process.env, ...ambiente } })
    let saida = ''
    filho.stdout.on('data', (parte) => (saida += parte))
    filho.stderr.on('data', (parte) => (saida += parte))
    const limite = setTimeout(() => filho.kill(), 240_000)
    filho.on('close', (codigo) => {
      clearTimeout(limite)
      pronto({ codigo, saida })
    })
  })
}

async function caso(nome, funcao) {
  try {
    await funcao()
    resultados.push(`  ok     ${nome}`)
  } catch (erro) {
    resultados.push(`  FALHOU ${nome}\n         ${String(erro.message).replace(/\n/g, '\n         ')}`)
    process.exitCode = 1
  }
}

function confere(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem)
}

// Cubo de mentira: guarda o que recebeu para o teste conferir.
const recebidos = []
const landing = { id: 7, title: 'Teste', url: 'teste', status: 'active', builderVersion: 'html', publicUrl: 'https://x.test/teste', createdAt: '2026-01-01', html: `<main>${'<p>conteúdo longo da página</p>'.repeat(2500)}</main>`, head: '<style>.a{}</style>' }
const paginaDaMarca = `<!doctype html><html><head><title>Marca Teste</title><meta name="description" content="descrição"></head>
<body style="margin:0;background:#123456;font-family:Georgia">
<header><a href="/"><img src="/logo.png" alt="Logo da Marca Teste" width="120" height="40"></a></header>
<h1 style="color:#ffffff">Título da marca</h1><p style="color:#eeeeee">Um parágrafo com texto suficiente para contar como parágrafo.</p>
<a class="btn" style="background:#ff8800;color:#000;padding:10px">Comprar agora</a>
<section style="width:600px;height:400px;background-image:linear-gradient(#0000,#0000),url('/foto.png')"></section>
</body></html>`

let sharp
let png

const servidor = createServer((pedido, resposta) => {
  const partes = []
  pedido.on('data', (p) => partes.push(p))
  pedido.on('end', () => {
    const corpo = Buffer.concat(partes)
    recebidos.push({ metodo: pedido.method, url: pedido.url, cabecalhos: pedido.headers, corpo })
    const json = (codigo, dado) => {
      resposta.writeHead(codigo, { 'Content-Type': 'application/json' })
      resposta.end(JSON.stringify(dado))
    }
    if (pedido.url === '/marca') {
      resposta.writeHead(200, { 'Content-Type': 'text/html' })
      return resposta.end(paginaDaMarca)
    }
    if (pedido.url === '/logo.png' || pedido.url === '/foto.png') {
      resposta.writeHead(200, { 'Content-Type': 'image/png' })
      return resposta.end(png)
    }
    if (pedido.headers['x-api-key'] !== 'sk_teste') return json(401, { message: 'chave inválida' })
    if (pedido.url.startsWith('/api/landings/7') && pedido.method === 'GET') return json(200, { data: landing })
    if (pedido.url.startsWith('/api/landings/7') && pedido.method === 'PUT') return json(200, { data: { id: 7 } })
    if (pedido.url === '/api/landings/assets') return json(201, { data: { url: 'https://arquivos.test/a.webp' } })
    if (pedido.url === '/api/me/modules') return json(200, { data: ['landings'] })
    if (pedido.url.startsWith('/api/forms')) return json(403, { message: 'sem permissão' })
    return json(200, { data: [] })
  })
})
await new Promise((pronto) => servidor.listen(0, '127.0.0.1', pronto))
const BASE = `http://127.0.0.1:${servidor.address().port}`
const acesso = { CUBO_BASE_URL: BASE, CUBO_API_KEY: 'sk_teste', PAGESPEED_API_KEY: 'chave-de-teste' }

await caso('requisitos: instala dependências, acha navegador, aprova com acesso configurado', async () => {
  const r = await roda('requisitos.mjs', [], acesso)
  confere(r.codigo === 0, `saiu com ${r.codigo}:\n${r.saida}`)
  confere(/\[ok\s*\] navegador/.test(r.saida), `sem navegador:\n${r.saida}`)
})

await caso('requisitos: sem acesso ao Cubo, aponta FALTA e sai com erro', async () => {
  const r = await roda('requisitos.mjs', [], { CUBO_BASE_URL: '', CUBO_API_KEY: '', CUBO_CONFIG: join(PASTA, 'nao-existe.env') })
  confere(r.codigo === 1 && /FALTA\] acesso ao Cubo/.test(r.saida), r.saida)
})

// O sharp só existe depois que o `requisitos` instalou as dependências.
sharp = createRequire(join(SCRIPTS, 'package.json'))('sharp')
// No Windows o cache do sharp mantém o arquivo aberto, e a faxina do fim não consegue apagar a pasta.
sharp.cache(false)
png = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#7f9c90' } })
  .composite([{ input: Buffer.from('<svg width="3000" height="2000"><circle cx="1500" cy="1000" r="800" fill="#ea9e95"/></svg>') }])
  .png()
  .toBuffer()

await caso('imagem: foto de 3000px vira webp de 1600px dentro do alvo do topo', async () => {
  writeFileSync(join(PASTA, 'grande.png'), png)
  const r = await roda('imagem.mjs', ['grande.png', 'topo', 'topo.webp'])
  confere(r.codigo === 0, r.saida)
  const meta = await sharp(join(PASTA, 'topo.webp')).metadata()
  confere(meta.format === 'webp' && meta.width === 1600, `saiu ${meta.format} ${meta.width}px`)
  confere(readFileSync(join(PASTA, 'topo.webp')).length <= 200 * 1024, 'acima de 200 KB')
})

await caso('imagem: aceita endereço e apara a margem do logotipo', async () => {
  const r = await roda('imagem.mjs', [`${BASE}/logo.png`, 'logo', 'logo.webp'])
  confere(r.codigo === 0, r.saida)
  confere((await sharp(join(PASTA, 'logo.webp')).metadata()).width <= 480, 'logo acima de 480px')
})

await caso('cubo: manda chave e Accept, e o check aponta permissão faltando', async () => {
  const r = await roda('cubo.mjs', ['check'], acesso)
  confere(r.codigo === 0, r.saida)
  confere(/forms\s+FALTA PERMISSÃO/.test(r.saida) && /landings\s+ok/.test(r.saida), r.saida)
  const ultima = recebidos.at(-1)
  confere(ultima.cabecalhos.accept === 'application/json', 'sem Accept: application/json')
})

await caso('cubo: put com @arquivo manda o JSON do arquivo', async () => {
  writeFileSync(join(PASTA, 'corpo.json'), JSON.stringify({ title: 'Novo' }))
  const r = await roda('cubo.mjs', ['put', '/api/landings/7', '@corpo.json'], acesso)
  confere(r.codigo === 0, r.saida)
  const ultima = recebidos.at(-1)
  confere(ultima.metodo === 'PUT' && JSON.parse(ultima.corpo).title === 'Novo', 'corpo não chegou')
  confere(ultima.cabecalhos['content-type'] === 'application/json', 'sem Content-Type JSON')
})

await caso('cubo: upload vai como multipart com o arquivo', async () => {
  const r = await roda('cubo.mjs', ['upload', '/api/landings/assets', 'topo.webp'], acesso)
  confere(r.codigo === 0, r.saida)
  const ultima = recebidos.at(-1)
  confere(/multipart\/form-data/.test(ultima.cabecalhos['content-type']), 'não foi multipart')
  confere(ultima.corpo.includes('filename="topo.webp"'), 'arquivo não foi no campo file')
})

await caso('cubo: erro HTTP sai com código diferente de zero', async () => {
  const r = await roda('cubo.mjs', ['get', '/api/forms'], acesso)
  confere(r.codigo === 1 && /HTTP 403/.test(r.saida), r.saida)
})

await caso('cubo: configurar grava o .cubo.env protegido e fora do git', async () => {
  mkdirSync(join(PASTA, 'projeto', '.git'), { recursive: true })
  const r = await roda('cubo.mjs', ['configurar', '--base=https://crm.teste/', '--chave=sk_segredo'], { CUBO_CONFIG: join(PASTA, 'projeto', '.cubo.env') })
  confere(r.codigo === 0, r.saida)
  const conteudo = readFileSync(join(PASTA, 'projeto', '.cubo.env'), 'utf8')
  confere(conteudo.includes('CUBO_BASE_URL=https://crm.teste\n') && conteudo.includes('CUBO_API_KEY=sk_segredo'), conteudo)
  confere(readFileSync(join(PASTA, 'projeto', '.gitignore'), 'utf8').includes('.cubo.env'), 'não foi para o .gitignore')
  confere(!r.saida.includes('sk_segredo'), 'imprimiu a chave inteira')
})

await caso('backup: guarda e restaura página maior que o limite de linha de comando do Windows', async () => {
  const guardado = await roda('backup.mjs', ['guardar', '7', 'bkp'], acesso)
  confere(guardado.codigo === 0, guardado.saida)
  const arquivo = readdirSync(join(PASTA, 'bkp')).find((nome) => nome.endsWith('.json'))
  confere(arquivo && existsSync(join(PASTA, 'bkp', arquivo.replace('.json', '.html'))), 'faltou o .html')
  const restaurado = await roda('backup.mjs', ['restaurar', join('bkp', arquivo)], acesso)
  confere(restaurado.codigo === 0, restaurado.saida)
  const enviado = JSON.parse(recebidos.at(-1).corpo)
  confere(enviado.html.length > 40_000, 'o html não foi inteiro')
  confere(!('id' in enviado) && !('publicUrl' in enviado) && !('createdAt' in enviado), 'mandou campo que o PUT recusa')
})

await caso('previa: captura, lista os rascunhos e acusa rolagem lateral', async () => {
  mkdirSync(join(PASTA, 'pagina'), { recursive: true })
  writeFileSync(join(PASTA, 'pagina', 'corpo.html'), '<main><h1>Oi</h1><p data-rascunho="texto do cliente">x</p><div class="largo" style="width:700px">largo</div></main>')
  const r = await roda('previa.mjs', [join('pagina', 'corpo.html'), '--capturar', '--porta=0'])
  confere(r.codigo === 0, r.saida)
  for (const nome of ['desktop-topo', 'desktop-pagina', 'celular-topo', 'celular-pagina']) {
    confere(existsSync(join(PASTA, 'previa', `${nome}.jpg`)), `faltou ${nome}.jpg`)
  }
  confere(/R1\s+texto do cliente/.test(r.saida), `rascunho não listado:\n${r.saida}`)
  confere(/\[celular\] a página rola para o lado/.test(r.saida), `não acusou a rolagem:\n${r.saida}`)
  confere(/borda em volta \(margem do body: 8px\)/.test(r.saida), `não acusou a borda do body:\n${r.saida}`)
})

await caso('previa: desenha o formulário do Cubo pela definição local e enxerga dentro do shadow DOM', async () => {
  writeFileSync(join(PASTA, 'pagina', 'form.html'), '<style>html,body{margin:0}</style><main><div id="form"></div></main>')
  writeFileSync(join(PASTA, 'pagina', 'formulario.json'), JSON.stringify({
    definition: { id: 'frm_previa', type: 'create', fields: [{ key: 'title', kind: 'text', label: 'Nome', required: true }] },
  }))
  const r = await roda('previa.mjs', [join('pagina', 'form.html'), `--formulario=${join('pagina', 'formulario.json')}`, '--capturar', '--porta=0'])
  confere(r.codigo === 0, r.saida)
  confere(!/nenhum campo de formulário/.test(r.saida), `formulário não apareceu (ou o detector não enxerga o shadow DOM):\n${r.saida}`)
})

await caso('previa: porta ocupada cai numa livre, e acusa recurso http:// que a página https bloquearia', async () => {
  writeFileSync(join(PASTA, 'pagina', 'http.html'), '<style>html,body{margin:0}</style><img src="http://exemplo.test/foto.webp" alt="x" width="10" height="10">')
  const ocupante = createServer().listen(8799, '127.0.0.1')
  await new Promise((pronto) => ocupante.once('listening', pronto).once('error', pronto))
  const r = await roda('previa.mjs', [join('pagina', 'http.html'), '--capturar'])
  ocupante.close()
  confere(r.codigo === 0, `não caiu numa porta livre:\n${r.saida}`)
  confere(/endereço http:\/\/ na página/.test(r.saida), `não acusou o http://:\n${r.saida}`)
})

await caso('previa: acusa título em linhas demais e colunas desproporcionais', async () => {
  writeFileSync(join(PASTA, 'pagina', 'feio.html'), `<style>html,body{margin:0} .g{display:grid;grid-template-columns:1fr 1fr;gap:20px} h1{font-size:60px;max-width:420px}</style>
<main><h1>Um título comprido demais que vai quebrar em muitas linhas na tela do computador</h1>
<div class="g"><div style="height:300px">pouco texto</div><div style="height:900px">formulário enorme</div></div>
<a href="#" style="background:#333;color:#fff;padding:10px">Quero</a></main>`)
  const r = await roda('previa.mjs', [join('pagina', 'feio.html'), '--capturar'])
  confere(r.codigo === 0, r.saida)
  confere(/\[desktop\] título em \d+ linhas/.test(r.saida), `não acusou o título:\n${r.saida}`)
  confere(/colunas desproporcionais/.test(r.saida), `não acusou as colunas:\n${r.saida}`)
})

await caso('video: comprime para mp4 sem áudio, corta e gera o pôster em webp', async () => {
  const ffmpeg = createRequire(join(SCRIPTS, 'package.json'))('ffmpeg-static')
  await new Promise((pronto, erro) => {
    const f = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=1920x1080:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440', '-t', '20', '-c:v', 'libx264', '-c:a', 'aac', join(PASTA, 'bruto.mp4')])
    f.on('close', (c) => (c === 0 ? pronto() : erro(new Error(`ffmpeg saiu com ${c}`))))
  })
  const r = await roda('video.mjs', ['bruto.mp4', 'fundo', '--saida=fundo'])
  confere(r.codigo === 0, r.saida)
  confere(existsSync(join(PASTA, 'fundo.mp4')) && existsSync(join(PASTA, 'fundo-poster.webp')), 'faltou o vídeo ou o pôster')
  confere(/sem áudio, 15s/.test(r.saida), `não cortou nem tirou o áudio:\n${r.saida}`)
  confere((await sharp(join(PASTA, 'fundo-poster.webp')).metadata()).format === 'webp', 'pôster não é webp')
})

await caso('previa: acusa conteúdo da primeira tela escondido por animação', async () => {
  writeFileSync(join(PASTA, 'pagina', 'escondido.html'), '<style>html,body{margin:0} h1{opacity:0}</style><main><h1>Oi</h1><a href="#" style="background:#333;color:#fff;padding:9px">Quero</a></main>')
  const r = await roda('previa.mjs', [join('pagina', 'escondido.html'), '--capturar', '--porta=0'])
  confere(r.codigo === 0, r.saida)
  confere(/primeira tela invisíveis ao abrir/.test(r.saida), `não acusou o topo escondido:\n${r.saida}`)
})

await caso('marca: mede cor, fonte, logotipo e foto de fundo com degradê por cima', async () => {
  const r = await roda('marca.mjs', [`${BASE}/marca`, '--pasta=raio-x'])
  confere(r.codigo === 0, r.saida)
  const pasta = join(PASTA, 'raio-x', readdirSync(join(PASTA, 'raio-x'))[0])
  const medidas = JSON.parse(readFileSync(join(pasta, 'marca.json'), 'utf8'))
  confere(medidas.fundos[0]?.valor === '#123456', `fundo: ${JSON.stringify(medidas.fundos)}`)
  confere(medidas.fontesTitulo.some((f) => f.valor.startsWith('Georgia')), `fonte: ${JSON.stringify(medidas.fontesTitulo)}`)
  confere(medidas.logotipos.some((l) => String(l.src).endsWith('/logo.png')), `logo: ${JSON.stringify(medidas.logotipos)}`)
  confere(medidas.imagens.some((i) => i.src.endsWith('/foto.png')), 'não achou a foto de fundo sob o degradê')
  confere(existsSync(join(pasta, 'celular-topo.jpg')), 'faltou a captura')
})

servidor.close()
console.log(`fumaça em ${process.platform} (Node ${process.versions.node})\n${resultados.join('\n')}`)
if (!process.exitCode) {
  try {
    rmSync(PASTA, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
  } catch (erro) {
    console.log(`(não consegui apagar ${PASTA}: ${erro.code} — não afeta o resultado)`)
  }
}
