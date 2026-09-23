#!/usr/bin/env bash
# Nota do PageSpeed Insights da página publicada. Celular por padrão: é de onde vem quase todo o
# tráfego de anúncio, e é onde a nota costuma doer.
set -euo pipefail

URL="${1:?uso: pagespeed.sh <url> [mobile|desktop]}"
ESTRATEGIA="${2:-mobile}"

RESPOSTA="$(mktemp)"
trap 'rm -f "$RESPOSTA"' EXIT

echo "medindo ${URL} (${ESTRATEGIA})… costuma levar de 20 a 40 segundos"

# `--get --data-urlencode` deixa o curl escapar a URL; montar a query à mão quebra com `?` e `&`.
ARGS=(
  --get
  --data-urlencode "url=${URL}"
  --data-urlencode "strategy=${ESTRATEGIA}"
  --data-urlencode "category=performance"
  --data-urlencode "category=accessibility"
  --data-urlencode "category=best-practices"
  --data-urlencode "category=seo"
)
[[ -n "${PAGESPEED_API_KEY:-}" ]] && ARGS+=(--data-urlencode "key=${PAGESPEED_API_KEY}")

curl -sS --max-time 180 "${ARGS[@]}" \
  'https://www.googleapis.com/pagespeedonline/v5/runPagespeed' -o "$RESPOSTA"

python3 - "$ESTRATEGIA" "$RESPOSTA" <<'PY'
import json
import sys

estrategia, caminho = sys.argv[1], sys.argv[2]

with open(caminho, encoding='utf-8') as arquivo:
    dados = json.load(arquivo)

if 'error' in dados:
    erro = dados['error']
    print(f"erro {erro.get('code')}: {erro.get('message')}")
    if erro.get('code') == 429:
        print()
        print('O limite sem chave é compartilhado e estoura fácil. Dois caminhos:')
        print('  1. pegar uma chave gratuita e exportar PAGESPEED_API_KEY (veja references/pagespeed.md);')
        print('  2. medir localmente: npx --yes lighthouse@12 <url> --preset=desktop --quiet')
    raise SystemExit(1)

farol = dados.get('lighthouseResult', {})
categorias = farol.get('categories', {})

rotulos = {
    'performance': 'Desempenho',
    'accessibility': 'Acessibilidade',
    'best-practices': 'Boas práticas',
    'seo': 'SEO',
}

print()
print(f'PageSpeed — {estrategia}')
print(f"URL: {farol.get('finalUrl', '?')}")
print()

for chave, rotulo in rotulos.items():
    categoria = categorias.get(chave)
    if not categoria or categoria.get('score') is None:
        continue
    nota = round(categoria['score'] * 100)
    marca = 'OK  ' if nota >= 90 else ('ATN ' if nota >= 50 else 'RUIM')
    print(f'  [{marca}] {rotulo:<16} {nota}')

auditorias = farol.get('audits', {})

print()
print('  métricas')
for chave, rotulo in [
    ('first-contentful-paint', 'Primeiro conteúdo'),
    ('largest-contentful-paint', 'Maior conteúdo (LCP)'),
    ('total-blocking-time', 'Bloqueio total'),
    ('cumulative-layout-shift', 'Deslocamento (CLS)'),
    ('speed-index', 'Índice de velocidade'),
]:
    item = auditorias.get(chave)
    if item and item.get('displayValue'):
        print(f"    {rotulo:<24} {item['displayValue']}")

pesados = []
for chave in (
    'uses-optimized-images',
    'modern-image-formats',
    'uses-responsive-images',
    'unused-css-rules',
    'render-blocking-resources',
    'unsized-images',
    'third-party-summary',
    'total-byte-weight',
):
    item = auditorias.get(chave)
    if item and item.get('score') is not None and item['score'] < 0.9:
        economia = (item.get('details') or {}).get('overallSavingsMs')
        sufixo = f' (aprox. {round(economia)} ms)' if economia else ''
        pesados.append(f"    - {item.get('title')}{sufixo}")

if pesados:
    print()
    print('  o que está segurando')
    print('\n'.join(pesados))

print()
PY
