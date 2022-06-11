#!/usr/bin/env sh

openssl req -x509 \
    -newkey rsa:4096 \
    -keyout key.pem \
    -out cert.pem \
    -nodes \
    -sha256 \
    -days 1 \
    "$@"
