# Management Service

An Orbs node V2 service that reads the management configuration state of the Orbs network from Ethereum.

## Functionality

This service serves as a source of truth for an Orbs node V2 management configuration. It periodically reads several external sources:

 - Orbs PoS V2 Ethereum contracts
 - Docker registry for the latest versions of the node's services

## How to run

The service is packaged as a Docker image. It is routinely published from this repo to [Docker Hub](https://hub.docker.com/repository/docker/orbsnetwork/management-service).

### Command-line arguments

| Argument | Description |
| -------- | ----------- |
| `--config <path>` | Path for a JSON configuration file. Multiple files can be given one after the other. (see JSON format below). | 

### Static JSON config file

* [Example as JavaScript code](src/config.example.ts)

| Field Name | Description |
| ---------- | ----------- |
| `Port` | The port the service listens on for its endpoints.<br>Default: `8080` | 
| `EthereumGenesisContract` | The hex address (including the leading `0x`) of the Ethereum registry contract used as genesis for all management events. Provide the address of the original contract during the launch of the network. |
| `EthereumEndpoint` | Optional URL for an Ethereum full node which will be used for all Ethereum queries. If not given, a local Ethereum light client will be instantiated. |
| `DockerNamespace` | Namespace for images in the docker registry.<br>Default: `orbsnetwork` |
| `DockerRegistry` | URL of the docker registry to rely on.<br>Default: `https://registry.hub.docker.com` |
| `ElectionsAuditOnly` | Boolean whether the node participates in consensus or just stays stand-by for auditing.<br>Default: `false` |
| `DockerHubPollIntervalSeconds` | How often should the docker registry be polled to search for new image versions. In seconds.<br>Default: `180` (3 minutes) |
| `RegularRolloutWindowSeconds` | During gradual rollout of image versions, over how long of a period should regular images (non-hotfix) should be rolled out. In seconds.<br>Default: `86400` (24 hours) |
| `HotfixRolloutWindowSeconds` | During gradual rollout of image versions, over how long of a period should hotfix images (non-regular) should be rolled out. In seconds.<br>Default: `3600` (1 hour) |
| `EthereumPollIntervalSeconds` | How often should Ethereum be polled for new blocks containing events. In seconds.<br>Default: `30` (30 seconds) |
| `FinalityBufferBlocks` | Ethereum finality boundary in blocks, meaning how many blocks from the tip we look it to reduce the chance of re-org.<br>Default: `100` |
| `EthereumFirstBlock` | Optimization. The earliest block number in Ethereum we can start scanning from (the block number when the genesis registry contract was deployed for example). |
| `Verbose` | Whether logging is extra verbose or not.<br>Default: `false` |

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

To run only the tests without getting blocked by types or formatting errors, run:

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
