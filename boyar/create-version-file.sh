#!/bin/bash -e

set -x

git status

#git fetch --tags
git pull --tags

echo boo

git tag

if [[ ! -z "$CIRCLE_TAG" ]]; then
    echo "This is a release run - Updating the .version file to indicate the correct Semver"
    echo "For this release ($CIRCLE_TAG)..."

    TAG_FIRST_CHAR=$(echo "$CIRCLE_TAG" | head -c 1)
    if [[ $TAG_FIRST_CHAR != "v" ]]; then
        echo "Oops! the tag format supplied is invalid while releasing a new version of the Orbs node"
        echo "Tag supplied is $CIRCLE_TAG and we do not allow that. Must use format vX.X.X!"
        exit 2
    fi

    echo "$CIRCLE_TAG" > .version
else
    #LATEST_SEMVER=$(git describe --tags --abbrev=0)
    LATEST_SEMVER=$(git tag --sort=-v:refname | head -n 1)
    SHORT_COMMIT=$(git rev-parse HEAD | cut -c1-8)
    echo "$LATEST_SEMVER-$SHORT_COMMIT" > .version
    echo "$LATEST_SEMVER-$SHORT_COMMIT"
fi
