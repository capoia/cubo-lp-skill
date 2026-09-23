#!/usr/bin/env bash
# Prepara uma imagem para a landing: redimensiona, converte para webp e aperta a qualidade até
# caber no orçamento de bytes. Quem usa a skill não é de desenvolvimento web — deixar passar uma
# foto de 3 MB tirada do celular é o jeito mais fácil de derrubar a nota do PageSpeed e o lead junto.
set -euo pipefail

ENTRADA="${1:-}"
PAPEL="${2:-conteudo}"   # topo | conteudo | logo
SAIDA="${3:-}"

if [[ -z "$ENTRADA" ]]; then
  cat <<'FIM'
uso: imagem.sh <arquivo> [topo|conteudo|logo] [saida.webp]

  topo      imagem grande do começo da página (é ela que o Lighthouse mede como LCP)
            largura máxima 1600px, alvo de 200 KB
  conteudo  qualquer outra imagem da página (padrão)
            largura máxima 1200px, alvo de 100 KB
  logo      logotipo
            largura máxima 480px, alvo de 40 KB

Sempre devolve **webp**. O limite duro do Cubo é 1 MB por arquivo, e cada imagem
consome a cota de armazenamento da empresa.
FIM
  exit 2
fi

[[ -f "$ENTRADA" ]] || { echo "erro: $ENTRADA não existe" >&2; exit 2; }

case "$PAPEL" in
  topo)     LARGURA=1600; ALVO_KB=200 ;;
  conteudo) LARGURA=1200; ALVO_KB=100 ;;
  logo)     LARGURA=480;  ALVO_KB=40  ;;
  *) echo "erro: papel inválido ($PAPEL). Use topo, conteudo ou logo." >&2; exit 2 ;;
esac

LIMITE_DURO_KB=1024   # o validador do Cubo recusa acima disso

if ! command -v cwebp >/dev/null 2>&1; then
  cat >&2 <<'FIM'
erro: `cwebp` não está instalado, e ele é o único jeito confiável de gerar webp aqui.

  macOS:  brew install webp
  Debian/Ubuntu:  sudo apt install webp

(o `sips` do macOS LÊ webp mas não escreve; um ffmpeg sem libwebp também não serve.)

Sem ele, NÃO suba a imagem em jpg ou png grande só para destravar: peça a instalação,
ou peça à pessoa uma imagem já em webp e no tamanho certo.
FIM
  exit 3
fi

EXT="$(printf '%s' "${ENTRADA##*.}" | tr '[:upper:]' '[:lower:]')"
case "$EXT" in
  jpg|jpeg|png|webp|gif|tif|tiff) ;;
  svg)
    echo "aviso: SVG já é vetor — não converta. Suba como está, se for logotipo ou ícone." >&2
    exit 0
    ;;
  *) echo "erro: formato .$EXT não é imagem que a página deva usar" >&2; exit 2 ;;
esac

[[ -n "$SAIDA" ]] || SAIDA="${ENTRADA%.*}.webp"

bytes() { stat -f%z "$1" 2>/dev/null || stat -c%s "$1"; }
kb() { echo $(( ($(bytes "$1") + 1023) / 1024 )); }

ORIGINAL_KB="$(kb "$ENTRADA")"

# `-resize L 0` mantém a proporção e só encolhe quando a imagem é maior que L.
for QUALIDADE in 82 75 68 60 52; do
  cwebp -quiet -q "$QUALIDADE" -resize "$LARGURA" 0 -metadata none "$ENTRADA" -o "$SAIDA"
  ATUAL_KB="$(kb "$SAIDA")"
  [[ "$ATUAL_KB" -le "$ALVO_KB" ]] && break
done

if [[ "$ATUAL_KB" -gt "$LIMITE_DURO_KB" ]]; then
  echo "erro: mesmo apertada, a imagem ficou em ${ATUAL_KB} KB e o Cubo recusa acima de ${LIMITE_DURO_KB} KB." >&2
  echo "Peça uma imagem menor, ou corte o que não precisa aparecer." >&2
  exit 1
fi

echo "$SAIDA"
echo "  origem:    ${ORIGINAL_KB} KB (.$EXT)"
echo "  resultado: ${ATUAL_KB} KB (webp, qualidade ${QUALIDADE}, largura máx ${LARGURA}px)"

if [[ "$ATUAL_KB" -gt "$ALVO_KB" ]]; then
  echo "  ⚠ acima do alvo de ${ALVO_KB} KB para '${PAPEL}'. Passa no Cubo, mas pesa na nota —" >&2
  echo "    vale cortar a imagem ou pedir uma com menos detalhe." >&2
fi
