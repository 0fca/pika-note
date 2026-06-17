FROM node:21-bookworm-slim as build-stage
ARG MAJOR
ARG MINOR
ARG BUILD
WORKDIR /app
COPY package*.json ./
COPY ./ .

RUN npm install --legacy-peer-deps
RUN sed -e "s/0.3.0/${MAJOR}.${MINOR}.${BUILD}/g" -i package.json
RUN npm run build

FROM nginx:1.27-bookworm as production-stage
RUN apt-get update \
  && apt-get install -y --no-install-recommends wget \
  && rm -rf /var/lib/apt/lists/*
RUN mkdir /app
COPY --from=build-stage /app/dist /app
COPY nginx.conf /etc/nginx/nginx.conf
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/healthz || exit 1