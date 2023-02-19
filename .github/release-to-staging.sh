#!/bin/bash

docker login -u $DOCKER_HUB_LOGIN -p $DOCKER_HUB_PASSWORD

export VERSION=$(cat .version)

docker push $DOCKER_HUB_IMAGE_PATH:$VERSION

BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)

if [[ $BRANCH_NAME == "master" ]] ;
then
  docker tag $DOCKER_HUB_IMAGE_PATH:$VERSION $DOCKER_HUB_IMAGE_PATH:experimental
  docker push $DOCKER_HUB_IMAGE_PATH:experimental
fi
