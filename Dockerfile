FROM node:21-bookworm-slim as build-stage
WORKDIR /app
COPY package*.json ./
RUN cat package.json | sed 's/\({"version": "\)[^"]*\("}\)/\1${MAJOR}.${MINOR}.${BUILD}\2/g' > package.json

RUN npm install --legacy-peer-deps
COPY ./ .
RUN npm run build

FROM nginx as production-stage
RUN mkdir /app
COPY --from=build-stage /app/dist /app
COPY nginx.conf /etc/nginx/nginx.conf