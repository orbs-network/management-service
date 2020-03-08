# Orbs Network State Reader

An Orbs node V2 service that reads the state of the Orbs network. 

## Functionality

This service serves as a source of truth for an Orbs node V2 configuration. It periodically reads several external sources:
 - A remote source for V1 node's management configuration, provided by Orbs LTD
 - Docker registry for the latest versions of the node's services

## How to run

 [still missing]

## Developer instructions

### Installing workspace

to install a development environment, you need to have nvm and git installd.
Then, `git clone` this repo locally and run:
```
$ nvm use
$ npm install
$ npm test
```
and that's it, you've just installed the development environment!

This project is written with [VSCode](https://code.visualstudio.com/) in mind. specifically configured for these extensions: [dbaeumer.vscode-eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint), [esbenp.prettier-vscode](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode).

### test

`npm run test`

execute all internal tests.

### clean

`npm run clean`

Removes any built code and any built executables.

### build

`npm run build`

Cleans, then builds the service and docker image.

Your built code will be in the `./dist/` directory, the docker image will be written to the local docker exporter.

### End-to-end Testing

`npm run test:e2e`

runs end-to-end tests against a built docker image (notice this command does nbot builds a docker image).
