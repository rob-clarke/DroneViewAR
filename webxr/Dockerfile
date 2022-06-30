FROM node:alpine as builder

RUN apk add openssl

WORKDIR /app

COPY package.json package-lock.json /app/

RUN npm install

COPY . /app

RUN sh create_selfsigned_cert.sh -subj '/C=XX/ST=/L=None/O=/OU=/CN=example.com'

RUN npm run build

FROM node:alpine

RUN apk add git

WORKDIR /app

COPY --from=builder /app/package.json /app/

RUN npm install --omit=dev

COPY --from=builder /app/server /app/server
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/cert.pem /app/key.pem /app/

ENV WWW_ROOT=/app/dist
CMD node /app/server/index.js
