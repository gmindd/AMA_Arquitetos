# Site + backoffice AMA — imagem para deploy no Coolify.
#
# TUDO o que o backoffice grava (logótipos, projetos, obras, uploads,
# definições, mensagens) vive em /app/data. SEM UM VOLUME PERSISTENTE
# MONTADO NESSE CAMINHO, cada redeploy apaga tudo o que foi carregado
# no /admin. No Coolify: aplicação AMA -> separador "Storages" ->
# "Add" -> tipo "Volume" ou "Bind Mount" -> Destination Path /app/data.
# Fazer um redeploy depois desta configuração e nunca mais se perde.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    DATA_DIR=/app/data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/seed ./seed
COPY --from=build /app/package.json ./
# Declara o caminho como volume: se o orquestrador (Coolify, Docker
# Compose) não anexar um volume próprio, é criado um anónimo — a marca
# de aviso, não uma garantia. A garantia vem da configuração no Coolify.
VOLUME ["/app/data"]
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
