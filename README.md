# Orbs Network State Reader

An Orbs node V2 service that reads the management configuration state of the Orbs network from Ethereum.

## Functionality

This service serves as a source of truth for an Orbs node V2 management configuration. It periodically reads several external sources:

 - Orbs PoS V2 Ethereum contracts
 - Docker registry for the latest versions of the node's services

## How to run

 [still missing]

## Developer instructions

### Installing workspace

To install a development environment, you need to have nvm and git installed.
Then, `git clone` this repo locally and run:

```sh
npm install
```

and that's it, you've just installed the development environment!

This project is written with [VSCode](https://code.visualstudio.com/) in mind. specifically configured for these extensions: [dbaeumer.vscode-eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint), [esbenp.prettier-vscode](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode).

### Test

```sh
# if you don't have a ganache instance running on localhost:7545
npm run start:eth

npm run test
```

Executes unit tests (not including e2e) after checking type correctness, and code formatting.

To run only the tests without getting blocked by types or formatting errors, run

```sh
npm run test:quick
```

To execute only a single test file, or any other customization, it's possible to chain parameters to the test command like so:
```sh
npm run test:quick -- src/index.test.ts
```



### Clean

```sh
npm run clean
```

Removes any built code and any built executables.

### Build

```sh
npm run build
```

Cleans, then builds the service and docker image.

Your built code will be in the `./dist/` directory, the docker image will be written to the local docker exporter.

### End-to-end testing

```sh
# if you don't have local docker image built
npm run build

npm run test:e2e
```

Runs end-to-end tests against a built docker image.
