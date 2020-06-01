#!/bin/bash -e

if [[ $CIRCLE_TAG == v* ]] ;
then
  VERSION=$CIRCLE_TAG
else
  VERSION=experimental
fi

docker login -u $DOCKER_HUB_LOGIN -p $DOCKER_HUB_PASSWORD

docker tag orbsnetwork/management-service:$(cat .version) orbsnetwork/management-service:$VERSION
docker push orbsnetwork/management-service:$VERSION
