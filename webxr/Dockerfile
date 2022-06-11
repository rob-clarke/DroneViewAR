FROM node:alpine

RUN apk add openssl

WORKDIR /app

COPY package.json package-lock.json /app/

RUN npm install

COPY . /app

RUN sh create_selfsigned_cert.sh -subj '/C=XX/ST=/L=None/O=/OU=/CN=example.com'

CMD npm run start
