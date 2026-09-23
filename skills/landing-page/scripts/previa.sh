#!/usr/bin/env bash
# Pré-visualização LOCAL da página, antes de existir qualquer coisa no Cubo.
#
# Monta o documento completo a partir do que vai nas colunas `head` e `html`, serve num endereço
# local e devolve a URL. O formulário desenha de verdade (o SDK vem do CRM), mas o envio é
# interceptado aqui na página: dá para preencher e mandar à vontade que nada é criado.
set -euo pipefail

HTML="${1:-}"
HEAD="${2:-}"
PORTA="${3:-8799}"

if [[ -z "$HTML" ]]; then
  cat <<'FIM'
uso: previa.sh <arquivo-com-o-html> [arquivo-com-o-head] [porta]

  O primeiro arquivo é o CORPO da página (o que vai na coluna `html`).
  O segundo, se houver, é o que vai na coluna `head` (fontes + <style>).

Serve em http://127.0.0.1:<porta>/ e imprime a URL. Ctrl+C encerra.
FIM
  exit 2
fi

[[ -f "$HTML" ]] || { echo "erro: $HTML não existe" >&2; exit 2; }
[[ -z "$HEAD" || -f "$HEAD" ]] || { echo "erro: $HEAD não existe" >&2; exit 2; }

PASTA="$(mktemp -d)"
trap 'rm -rf "$PASTA"' EXIT

{
  cat <<'ABERTURA'
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Pré-visualização</title>
<script>
/**
 * Duas travas, só aqui: o envio do formulário é respondido pela própria página (nada de negociação
 * de teste no funil do cliente) e o redirecionamento de sucesso é cancelado, para não tirar quem
 * está conferindo de dentro da página.
 *
 * Nada disto vai para o Cubo — o que sobe é só o conteúdo dos arquivos.
 */
(function () {
  var fetchOriginal = window.fetch
  window.fetch = function (entrada, init) {
    var url = String((entrada && entrada.url) || entrada || '')
    var metodo = String((init && init.method) || (entrada && entrada.method) || 'GET').toUpperCase()
    if (metodo !== 'GET' && /\/public\/forms\/[^/]+\/(submissions|pageview)/.test(url)) {
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
</script>
ABERTURA

  [[ -n "$HEAD" ]] && cat "$HEAD"

  echo '</head>'
  echo '<body>'
  cat "$HTML"
  echo '</body>'
  echo '</html>'
} > "$PASTA/index.html"

echo "pré-visualização em http://127.0.0.1:${PORTA}/"
echo "(o envio do formulário aqui NÃO cria negociação; Ctrl+C encerra)"
echo

cd "$PASTA" && python3 -m http.server "$PORTA" --bind 127.0.0.1 >/dev/null 2>&1
