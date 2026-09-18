# L'éditeur de blocs d'Arcade : construit ici, servi par nginx. Site statique,
# aucun backend, aucune base, aucun cookie (README-ARCADE.md, « Déployer »).
#
# ORIGINE_PLATEFORME est OBLIGATOIRE et sans défaut : sans elle, le pont ne
# s'installe pas. Sur la plateforme de déploiement, c'est une variable de
# CONSTRUCTION (les origines app et admin de l'environnement).
#
# CETTE IMAGE SE CONSTRUIT DANS L'INTÉGRATION CONTINUE, PAS SUR LE SERVEUR QUI
# SERT LA PRODUCTION : voir `.github/workflows/image.yml` et README-ARCADE.md.
# Construire ici prend plusieurs gigaoctets et plusieurs minutes ; le
# 2026-09-17, cette construction a rendu un serveur entier injoignable pendant
# une heure. `MINIFICATION_PARALLELE` borne le poste le plus lourd.

FROM node:24-bookworm-slim AS construction
WORKDIR /src
# Tout le source AVANT l'installation : le script `prepare` du projet lance
# `scripts/prepublish.mjs`, qui doit exister à ce moment-là.
COPY . .
# `ci`, pas `install` : les dépendances sont épinglées au verrou (LICENCES.md).
RUN npm ci --no-audit --no-fund
ARG ORIGINE_PLATEFORME
ARG DEPOT_SOURCE=https://github.com/groupe-trousseau/arcade-editeur-blocs
RUN test -n "$ORIGINE_PLATEFORME" || (echo "ORIGINE_PLATEFORME manque" >&2; exit 1)
ENV NODE_ENV=production \
    ROUTING_STYLE=filehash \
    NODE_OPTIONS=--max-old-space-size=4096 \
    MINIFICATION_PARALLELE=2 \
    ORIGINE_PLATEFORME=$ORIGINE_PLATEFORME \
    DEPOT_SOURCE=$DEPOT_SOURCE
RUN npx webpack --bail && test -f build/editor.html

FROM nginx:1.27-alpine
COPY nginx-arcade.conf /etc/nginx/conf.d/default.conf
COPY --from=construction /src/build /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/editor.html || exit 1
