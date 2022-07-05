FROM node:alpine as builder

RUN apk add openssl python3 build-base

WORKDIR /app

COPY package.json package-lock.json /app/

RUN npm install

COPY create_selfsigned_cert.sh /app/

RUN sh create_selfsigned_cert.sh -subj '/C=XX/ST=/L=None/O=/OU=/CN=example.com'

COPY . /app

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
ENV GPS_POSITION_URL=http://localhost:3000/position
CMD node /app/server/index.js
