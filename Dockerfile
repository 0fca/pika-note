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
RUN mkdir /app
COPY --from=build-stage /app/dist /app
COPY nginx.conf /etc/nginx/nginx.conf