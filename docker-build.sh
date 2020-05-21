#!/bin/bash

npm run build
docker build -t orbsnetwork/management-service:$(cat .version) .