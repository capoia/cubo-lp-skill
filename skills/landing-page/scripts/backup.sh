#!/usr/bin/env bash
# Guarda a versão atual da landing antes de mexer nela, e devolve ao estado guardado quando algo
# der errado. Página no ar é anúncio rodando: desfazer precisa ser mais rápido que explicar.
set -euo pipefail

CUBO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/cubo.sh"

uso() {
  cat <<'FIM'
uso:
  backup.sh guardar <id> [pasta]      guarda a landing (padrão: ./backups-lp)
  backup.sh restaurar <arquivo.json>  devolve a landing ao estado do arquivo

O que é guardado: title, url, status, todo o conteúdo (html, head, code_head, code_body),
SEO (meta description, robots, favicon, fontes) e os códigos de rastreamento.

⚠️ O que NÃO é guardado, porque a API de leitura não devolve: as integrações da Meta ligadas
à página. Se a landing tem API de Conversões, confira no CRM depois de restaurar.
FIM
}

bytes() { stat -f%z "$1" 2>/dev/null || stat -c%s "$1"; }

guardar() {
  local id="${1:?informe o id da landing}"
  local pasta="${2:-./backups-lp}"
  mkdir -p "$pasta"

  local carimbo arquivo
  carimbo="$(date +%Y-%m-%d-%H%M%S)"
  arquivo="${pasta}/landing-${id}-${carimbo}.json"

  "$CUBO" get "/api/landings/${id}" > "$arquivo"

  python3 - "$arquivo" <<'PY'
import json, sys

caminho = sys.argv[1]
with open(caminho, encoding='utf-8') as arquivo:
    corpo = json.load(arquivo)

dados = corpo.get('data')
if not dados:
    print('erro: a resposta não trouxe a landing. Confira o id e a chave.', file=sys.stderr)
    raise SystemExit(1)

# Guarda só a landing, sem o envelope — é o que a restauração lê de volta.
with open(caminho, 'w', encoding='utf-8') as arquivo:
    json.dump(dados, arquivo, ensure_ascii=False, indent=2)

corpo_html = dados.get('html') or ''
cabeca = dados.get('head') or ''
base = caminho[:-5]
with open(base + '.html', 'w', encoding='utf-8') as arquivo:
    arquivo.write(corpo_html)
with open(base + '.head.html', 'w', encoding='utf-8') as arquivo:
    arquivo.write(cabeca)

print(f"guardado: {dados.get('title')} ({dados.get('publicUrl') or 'sem domínio'})")
print(f"  status:   {dados.get('status')} · construtor: {dados.get('builderVersion')}")
print(f"  conteúdo: {len(corpo_html)} caracteres de html, {len(cabeca)} de head")
PY

  echo "  arquivos: $arquivo"
  echo "            ${arquivo%.json}.html  (só o corpo, para ler e comparar)"
  echo "            ${arquivo%.json}.head.html"
}

restaurar() {
  local arquivo="${1:?informe o arquivo de backup}"
  [[ -f "$arquivo" ]] || { echo "erro: $arquivo não existe" >&2; exit 2; }

  local id corpo
  id="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1], encoding='utf-8'))['id'])" "$arquivo")"

  # Só os campos que o PUT aceita. Mandar `id`, `createdAt` ou `publicUrl` faz a API recusar tudo.
  corpo="$(python3 - "$arquivo" <<'PY'
import json, sys

with open(sys.argv[1], encoding='utf-8') as arquivo:
    dados = json.load(arquivo)

ACEITOS = [
    'title', 'url', 'domainId', 'status',
    'html', 'head', 'codeHead', 'codeBody',
    'metaDescription', 'robots', 'favicon', 'fonts',
    'gtmCode', 'pixelCode', 'uaCode', 'ga4Code', 'clarityCode',
    'cookieAlert', 'enhanceData',
]

print(json.dumps({campo: dados[campo] for campo in ACEITOS if campo in dados}, ensure_ascii=False))
PY
)"

  "$CUBO" put "/api/landings/${id}" "$corpo" > /dev/null
  echo "restaurada a landing ${id} para o estado de ${arquivo}"
}

case "${1:-}" in
  guardar) shift; guardar "$@" ;;
  restaurar) shift; restaurar "$@" ;;
  ''|-h|--help|help) uso ;;
  *) uso; exit 2 ;;
esac
