#!/usr/bin/env bash
# Cliente da API do Cubo. Põe a chave e o Accept em toda chamada, imprime o corpo e, quando o
# código não é 2xx, imprime o código junto — erro silencioso aqui vira página publicada errada.
set -euo pipefail

CONFIG_FILE="${CUBO_CONFIG:-.cubo.env}"
[[ -f "$CONFIG_FILE" ]] && . "$CONFIG_FILE"

BASE="${CUBO_BASE_URL:-}"
KEY="${CUBO_API_KEY:-}"
BASE="${BASE%/}"

uso() {
  cat <<'FIM'
uso:
  cubo.sh check
  cubo.sh get    <caminho>
  cubo.sh post   <caminho> [json|@arquivo]
  cubo.sh put    <caminho> [json|@arquivo]
  cubo.sh del    <caminho>
  cubo.sh upload <caminho> <arquivo>

ambiente:
  CUBO_BASE_URL   https://crm-do-cliente.com.br
  CUBO_API_KEY    sk_...
  CUBO_CONFIG     arquivo com as duas variáveis (padrão: .cubo.env)
FIM
}

exige_credenciais() {
  if [[ -z "$BASE" || -z "$KEY" ]]; then
    echo "erro: faltam CUBO_BASE_URL e/ou CUBO_API_KEY." >&2
    echo "defina no ambiente, ou crie um $CONFIG_FILE com as duas linhas." >&2
    exit 2
  fi
}

# Corpo: literal, ou @arquivo, ou vazio.
corpo() {
  local entrada="${1:-}"
  if [[ -z "$entrada" ]]; then
    printf ''
  elif [[ "$entrada" == @* ]]; then
    cat "${entrada:1}"
  else
    printf '%s' "$entrada"
  fi
}

chamar() {
  local metodo="$1" caminho="$2" dados="${3:-}"
  local saida codigo

  saida="$(
    if [[ -n "$dados" ]]; then
      curl -sS -X "$metodo" "${BASE}${caminho}" \
        -H "X-API-Key: ${KEY}" \
        -H 'Accept: application/json' \
        -H 'Content-Type: application/json' \
        --data-binary "$dados" \
        -w $'\n%{http_code}'
    else
      curl -sS -X "$metodo" "${BASE}${caminho}" \
        -H "X-API-Key: ${KEY}" \
        -H 'Accept: application/json' \
        -w $'\n%{http_code}'
    fi
  )"

  codigo="${saida##*$'\n'}"
  printf '%s\n' "${saida%$'\n'*}"

  if [[ "$codigo" != 2* ]]; then
    echo "HTTP $codigo" >&2
    return 1
  fi
}

case "${1:-}" in
  check)
    exige_credenciais
    echo "CRM:    $BASE"
    echo "chave:  ${KEY:0:10}…"
    echo
    echo "— módulos da conta —"
    chamar GET /api/me/modules || true
    echo
    echo "— permissões da chave (403 = falta marcar na chave) —"
    for par in "landings:GET:/api/landings?perPage=1" \
               "forms:GET:/api/forms?perPage=1" \
               "domains:GET:/api/domains" \
               "customfields:GET:/api/customfields?perPage=1" \
               "pipes:GET:/api/pipes?perPage=1"; do
      recurso="${par%%:*}"; resto="${par#*:}"; metodo="${resto%%:*}"; caminho="${resto#*:}"
      httpcode="$(curl -sS -o /dev/null -w '%{http_code}' -X "$metodo" "${BASE}${caminho}" \
        -H "X-API-Key: ${KEY}" -H 'Accept: application/json')"
      case "$httpcode" in
        2*) estado="ok" ;;
        403) estado="FALTA PERMISSÃO" ;;
        401) estado="CHAVE INVÁLIDA" ;;
        *) estado="HTTP $httpcode" ;;
      esac
      printf '  %-14s %s\n' "$recurso" "$estado"
    done
    ;;
  get)    exige_credenciais; chamar GET "${2:?caminho}" ;;
  post)   exige_credenciais; chamar POST "${2:?caminho}" "$(corpo "${3:-}")" ;;
  put)    exige_credenciais; chamar PUT "${2:?caminho}" "$(corpo "${3:-}")" ;;
  del)    exige_credenciais; chamar DELETE "${2:?caminho}" ;;
  upload)
    exige_credenciais
    arquivo="${3:?arquivo}"
    [[ -f "$arquivo" ]] || { echo "erro: $arquivo não existe" >&2; exit 2; }
    curl -sS -X POST "${BASE}${2:?caminho}" \
      -H "X-API-Key: ${KEY}" \
      -H 'Accept: application/json' \
      -F "file=@${arquivo}"
    echo
    ;;
  ''|-h|--help|help) uso ;;
  *) uso; exit 2 ;;
esac
