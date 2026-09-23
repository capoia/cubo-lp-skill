#!/usr/bin/env node
// Cliente da API do Cubo. Põe a chave e o Accept em toda chamada, imprime o corpo e, quando o
// código não é 2xx, imprime o código junto — erro silencioso aqui vira página publicada errada.
import { appendFileSync, chmodSync, existsSync, openAsBlob, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { apiCubo, argumentos, configuracao, exigeAcesso, falha } from './lib.mjs'

const [comando, caminho, dado] = process.argv.slice(2)
const config = configuracao()

const USO = `uso:
  cubo.mjs configurar --base=https://… --chave=sk_… [--pagespeed=…]
  cubo.mjs check
  cubo.mjs get    <caminho>
  cubo.mjs post   <caminho> [json|@arquivo.json]
  cubo.mjs put    <caminho> [json|@arquivo.json]
  cubo.mjs del    <caminho>
  cubo.mjs upload <caminho> <arquivo>

acesso (no ambiente, ou num arquivo .cubo.env na pasta de trabalho):
  CUBO_BASE_URL   https://crm-do-cliente.com.br
  CUBO_API_KEY    sk_...
  CUBO_CONFIG     outro arquivo no lugar do .cubo.env`

function corpo(entrada) {
  if (!entrada) return undefined
  if (!entrada.startsWith('@')) return entrada
  const arquivo = entrada.slice(1)
  if (!existsSync(arquivo)) falha(`${arquivo} não existe`, 2)
  return readFileSync(arquivo, 'utf8')
}

const chamar = (metodo, rota, conteudo) => apiCubo(metodo, rota, conteudo, config)

async function imprime(metodo, rota, conteudo) {
  const { codigo, texto } = await chamar(metodo, rota, conteudo)
  console.log(texto)
  if (codigo < 200 || codigo > 299) {
    console.error(`HTTP ${codigo}`)
    process.exit(1)
  }
}

// Variável de ambiente não sobrevive entre um comando e outro do Claude Code, então o acesso mora
// num arquivo. Ele é segredo: permissão só do dono e, se a pasta for repositório, fora do git.
function configurar() {
  const { opcoes } = argumentos(process.argv.slice(3))
  const novos = { CUBO_BASE_URL: opcoes.base, CUBO_API_KEY: opcoes.chave, PAGESPEED_API_KEY: opcoes.pagespeed }
  if (!Object.values(novos).some(Boolean)) falha('informe ao menos um: --base=https://… --chave=sk_… --pagespeed=…', 2)

  const linhas = existsSync(config.arquivo) ? readFileSync(config.arquivo, 'utf8').split(/\r?\n/).filter(Boolean) : []
  for (const [nome, valor] of Object.entries(novos)) {
    if (!valor) continue
    const limpo = nome === 'CUBO_BASE_URL' ? String(valor).trim().replace(/\/+$/, '') : String(valor).trim()
    const indice = linhas.findIndex((linha) => linha.startsWith(`${nome}=`))
    if (indice >= 0) linhas[indice] = `${nome}=${limpo}`
    if (indice < 0) linhas.push(`${nome}=${limpo}`)
  }
  writeFileSync(config.arquivo, `${linhas.join('\n')}\n`, { mode: 0o600 })
  chmodSync(config.arquivo, 0o600)

  const pasta = dirname(config.arquivo)
  const gitignore = join(pasta, '.gitignore')
  const repositorio = existsSync(join(pasta, '.git'))
  const jaIgnorado = existsSync(gitignore) && readFileSync(gitignore, 'utf8').split(/\r?\n/).includes(basename(config.arquivo))
  if (repositorio && !jaIgnorado) appendFileSync(gitignore, `${existsSync(gitignore) ? '\n' : ''}${basename(config.arquivo)}\n`)

  console.log(`gravado em ${config.arquivo}${repositorio ? ' (e fora do git)' : ''}`)
  for (const [nome, valor] of Object.entries(novos)) if (valor) console.log(`  ${nome}=${nome === 'CUBO_BASE_URL' ? valor : `${String(valor).slice(0, 8)}…`}`)
}

switch (comando) {
  case 'configurar':
    configurar()
    break
  case 'check': {
    exigeAcesso(config)
    console.log(`CRM:    ${config.base}`)
    console.log(`chave:  ${config.chave.slice(0, 10)}…\n`)
    console.log('— módulos da conta —')
    console.log((await chamar('GET', '/api/me/modules')).texto)
    console.log('\n— permissões da chave (403 = falta marcar na chave) —')
    const rotas = {
      landings: '/api/landings?perPage=1',
      forms: '/api/forms?perPage=1',
      domains: '/api/domains',
      customfields: '/api/customfields?perPage=1',
      pipes: '/api/pipes?perPage=1',
    }
    for (const [recurso, rota] of Object.entries(rotas)) {
      const { codigo } = await chamar('GET', rota)
      const estado = codigo >= 200 && codigo < 300 ? 'ok' : codigo === 403 ? 'FALTA PERMISSÃO' : codigo === 401 ? 'CHAVE INVÁLIDA' : `HTTP ${codigo}`
      console.log(`  ${recurso.padEnd(14)} ${estado}`)
    }
    break
  }
  case 'get':
  case 'del':
    exigeAcesso(config)
    if (!caminho) falha('informe o caminho', 2)
    await imprime(comando === 'get' ? 'GET' : 'DELETE', caminho)
    break
  case 'post':
  case 'put':
    exigeAcesso(config)
    if (!caminho) falha('informe o caminho', 2)
    await imprime(comando.toUpperCase(), caminho, corpo(dado))
    break
  case 'upload': {
    exigeAcesso(config)
    if (!caminho || !dado) falha('informe o caminho e o arquivo', 2)
    if (!existsSync(dado)) falha(`${dado} não existe`, 2)
    const formulario = new FormData()
    formulario.append('file', await openAsBlob(dado, { type: dado.endsWith('.svg') ? 'image/svg+xml' : dado.endsWith('.webp') ? 'image/webp' : '' }), basename(dado))
    await imprime('POST', caminho, formulario)
    break
  }
  default:
    console.log(USO)
    process.exit(comando ? 2 : 0)
}
