#!/usr/bin/env bash

set -e

docker build -t gpsserver gps

docker build -t droneviewserver webxr
