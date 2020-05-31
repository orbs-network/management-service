#!/bin/bash

docker login -u $DOCKER_HUB_LOGIN -p $DOCKER_HUB_PASSWORD

./create-version-file.sh
export VERSION=$(cat .version)

docker tag orbsnetwork/management-service:$VERSION orbsnetworkstaging/management-service:$VERSION
docker push orbsnetworkstaging/management-service:$VERSION
