#!/bin/bash

docker login -u $DOCKER_HUB_LOGIN -p $DOCKER_HUB_PASSWORD

export VERSION=$(cat .version)
docker push orbsnetworkstaging/management-service:$VERSION

if [[ $CIRCLE_BRANCH == "master" ]] ;
then
  docker tag orbsnetworkstaging/management-service:$VERSION orbsnetworkstaging/management-service:experimental
  docker push orbsnetworkstaging/management-service:experimental
fi
