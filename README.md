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
| `BootstrapMode` | Whether the service is operating in bootstrap mode, meaning just upgrade ManagementService itself and suspend all other tasks.<br>Default: `false` |
| `Port` | The port the service listens on for its endpoints.<br>Default: `8080` |
| `EthereumGenesisContract` | The hex address (including the leading `0x`) of the Ethereum registry contract used as genesis for all management events. Provide the address of the original contract during the launch of the network.<br>Default: `0xD859701C81119aB12A1e62AF6270aD2AE05c7AB3` (Orbs PoS V2 mainnet) |
| `EthereumFirstBlock` | Optimization. The earliest block number in Ethereum we can start scanning from (the block number when the genesis registry contract was deployed for example).<br>Default: `11191390` (Orbs PoS V2 mainnet) |
| `EthereumEndpoint` | HTTP URL endpoint for an Ethereum full node which will be used for all Ethereum queries. |
| `ElectionsAuditOnly` | Whether the node is audit only and should avoid joining the committee as elected validator and remain standby in the topology instead.<br>Default: `false` |
| `DeploymentDescriptorUrl` | Locator of the deployment descriptor for automatic software upgrades.<br>Default: `https://deployment.orbs.network/mainnet.json` |
| `StatusJsonPath` | The local path on disk where status JSON should be written by the service.<br>Default: `./status/status.json` |
| `StatusWriteIntervalSeconds` | How often should the service write status JSON file to disk.<br>Default: `25` (seconds) |
| `DeploymentDescriptorPollIntervalSeconds` | How often should the docker registry be polled to search for new image versions. In seconds.<br>Default: `180` (3 minutes) |
| `RegularRolloutWindowSeconds` | During gradual rollout of image versions, over how long of a period should regular images (non-hotfix) should be rolled out. In seconds.<br>Default: `86400` (24 hours) |
| `HotfixRolloutWindowSeconds` | During gradual rollout of image versions, over how long of a period should hotfix images (non-regular) should be rolled out. In seconds.<br>Default: `3600` (1 hour) |
| `EthereumPollIntervalSeconds` | How often should Ethereum be polled for new blocks containing events. In seconds.<br>Default: `30` (30 seconds) |
| `EthereumRequestsPerSecondLimit` | Optional limit over how many requests per second the service is allowed to make, useful for services like Infura that have API throttling and require the service to slow down.<br>Default: `0` (no limit) |
| `ElectionsStaleUpdateSeconds` | How long should election updates (ReadyToSync and ReadyForCommittee) make by Ethereum Writer servie live before becoming stale, `STALE_TIMEOUT` in the [spec](https://github.com/orbs-network/orbs-spec/blob/master/node-architecture/ETH-WRITER.md).<br>Default: `604800` (7 days) |
| `FinalityBufferBlocks` | Ethereum finality boundary in blocks, meaning how many blocks from the tip we look it to reduce the chance of re-org.<br>Default: `40` (about 10 minutes) |
| `Verbose` | Whether logging is extra verbose or not.<br>Default: `false` |
| `node-address` | The Orbs address of the node, configured during [initialization](https://github.com/orbs-network/validator-instructions) with Polygon, for example `8cd2a24f0c3f50bce2f12c846277491433b47ae0`. |

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

### Matic-reader - Polygon

The code has been updated to add EVM read capabalities for Polygon network, as well as Ethereum in order to support polygon proof of stake functionality as of March 29 2022.

he netwrok runs another docker image of this repo under the name matic-reader to support reading from POS contracts on polygon netwrok.

# ORBS VM (L3)

### vm-keepers

Service that keeps time for tasks to be done on ETH L1 and L2 networks.
will be change to **vm-lambda** when ready

### vm-notifications 

Open Defi Notification Protocol
Service to enable defi notifications
internal port 80
external port 8082
