import Web3 from 'web3';
import { BlockNumber } from 'web3-core';
import { EventData, Contract, PastEventOptions } from 'web3-eth-contract';
import { compiledContracts } from '@orbs-network/orbs-ethereum-contracts-v2/release/compiled-contracts';
import { Contracts } from '@orbs-network/orbs-ethereum-contracts-v2/release/typings/contracts';
import { ContractAddressUpdatedEvent as ContractAddressUpdatedEventValues } from '@orbs-network/orbs-ethereum-contracts-v2/release/typings/contract-registry-contract';
import { errorString, toNumber } from './utils';
import { EventName, EventTypes } from './eth-model/events-types';

export function getNewEthereumReader(config: ServiceEthereumConfiguration) {
    const ethConfig = new EthereumConfigReader(config).readEthereumConfig();
    return new EthereumReader(ethConfig);
}
type ContractAddressUpdatedEvent = EventData & { returnValues: ContractAddressUpdatedEventValues };

export type ContractName =
    | 'protocol'
    | 'fees'
    | 'committee-general'
    | 'committee-compliance'
    | 'elections'
    | 'delegations'
    | 'validatorsRegistration'
    | 'compliance'
    | 'staking'
    | 'subscriptions';

type ContractTypeName = keyof Contracts;

export function getContractTypeName(key: ContractName): ContractTypeName {
    switch (key) {
        case 'protocol':
            return 'Protocol';
        case 'fees':
            return 'Fees';
        case 'committee-general':
        case 'committee-compliance':
            return 'Committee';
        case 'elections':
            return 'Delegations';
        case 'delegations':
            return 'Delegations';
        case 'validatorsRegistration':
            return 'ValidatorsRegistration';
        case 'compliance':
            return 'Compliance';
        case 'staking':
            return 'StakingContract';
        case 'subscriptions':
            return 'Subscriptions';
        default:
            throw new Error(`unknown event name '${key}'`);
    }
}

export type ServiceEthereumConfiguration = {
    EthereumGenesisContract: string;
    EthereumEndpoint: string;
    FirstBlock: BlockNumber;
};
export class EthereumConfigReader {
    private web3: Web3;

    constructor(private config: ServiceEthereumConfiguration) {
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.EthereumEndpoint));
    }

    private connect(contractType: ContractTypeName) {
        const abi = compiledContracts[contractType].abi;
        return new this.web3.eth.Contract(abi, this.config.EthereumGenesisContract);
    }

    async readContractsConfig(): EthereumConfig['contracts'] {
        const web3Contract = this.connect('ContractRegistry');
        const events = (await retryGetPastEventsWithLatest(
            'ContractAddressUpdated',
            this.web3,
            web3Contract,
            0
        )) as ContractAddressUpdatedEvent[];
        const contracts: { [t in ContractName]?: ContractMetadata } = {};
        events.forEach((e) => {
            contracts[e.returnValues.contractName as ContractName] = {
                address: e.returnValues.addr,
                firstBlock: this.config.FirstBlock, // TODO: max with contract genesis once it exists
            };
        });
        return contracts;
    }

    readEthereumConfig() {
        return {
            contracts: this.readContractsConfig(),
            firstBlock: this.config.FirstBlock, // events[0].blockNumber,
            httpEndpoint: this.config.EthereumEndpoint,
        };
    }
}
async function retryGetPastEventsWithLatest(
    event: string,
    web3: Web3,
    web3Contract: Contract,
    firstBlock: BlockNumber
) {
    try {
        return await web3Contract.getPastEvents(event, {
            fromBlock: firstBlock,
            toBlock: 'latest',
        });
    } catch (e) {
        return await handleEventReadError(event, web3, web3Contract, firstBlock, e);
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleEventReadError(
    event: string,
    web3: Web3,
    web3Contract: Contract,
    firstBlock: BlockNumber,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    e: any
) {
    console.warn(`failed reading events from ethereum.`, errorString(e));
    console.warn(`re-trying with not-latest block number`);
    let stage = 0;
    try {
        const latest = await web3.eth.getBlockNumber();
        stage = 1;
        console.warn(`re-trying with (latest - 1) block number (latest block is ${latest})`);
        return await web3Contract.getPastEvents(event, {
            fromBlock: firstBlock,
            toBlock: latest - 1,
        });
    } catch (e2) {
        if (stage) {
            console.error(`failed reading events from ethereum. `, errorString(e2));
            throw new Error(
                `error reading '${event}' events: ${errorString(e2)}\n\n original error:\n${errorString(e)}`
            );
        } else {
            console.error(`failed reading block number from ethereum. `, errorString(e2));
            throw new Error(`error reading block number: ${errorString(e2)}\n\n original error:\n${errorString(e)}`);
        }
    }
}

type ContractMetadata = {
    address: string;
    firstBlock: BlockNumber;
};
export type EthereumConfig = {
    contracts: Promise<{ [t in ContractName]?: ContractMetadata }>;
    firstBlock: BlockNumber;
    httpEndpoint: string;
};

export function contractByEventName(eventName: EventName): ContractName {
    switch (eventName) {
        case 'CommitteeChanged':
            return 'committee-general';
        case 'StandbysChanged':
            return 'committee-general';
        case 'SubscriptionChanged':
            return 'subscriptions';
        case 'ProtocolVersionChanged':
            return 'protocol';
        default:
            throw new Error(`unknown event name '${eventName}'`);
    }
}
export class EthereumReader {
    private web3: Web3;

    constructor(private config: EthereumConfig) {
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.httpEndpoint));
    }

    private async connect(contractName: ContractName) {
        const contractMetadata = (await this.config.contracts)[contractName];
        if (!contractMetadata) {
            throw new Error(`contract "${contractName}" not in registry`);
        }
        const abi = compiledContracts[getContractTypeName(contractName)].abi;
        return new this.web3.eth.Contract(abi, contractMetadata.address);
    }

    async getAllVirtualChains(): Promise<Array<string>> {
        const web3Contract = await this.connect('subscriptions');
        const events = await retryGetPastEventsWithLatest(
            'SubscriptionChanged',
            this.web3,
            web3Contract,
            this.config.firstBlock
        );
        return events.map((event) => event.returnValues.vcid);
    }

    getBlockNumber(): Promise<number> {
        return this.web3.eth.getBlockNumber();
    }

    async getRefTime(blockNumber: number | 'latest'): Promise<number | null> {
        const block = await this.web3.eth.getBlock(blockNumber);
        return block && toNumber(block.timestamp);
    }

    async getPastEvents<T extends EventName>(
        eventName: T,
        { fromBlock, toBlock }: PastEventOptions
    ): Promise<Array<EventTypes[T]>> {
        const web3Contract = await this.connect(contractByEventName(eventName));
        return await getEventsPaged(web3Contract, eventName, fromBlock, toBlock, toBlock - fromBlock);
    }
}

async function getEventsPaged<T extends EventName>(
    web3Contract: Contract,
    eventName: string,
    fromBlock: number,
    toBlock: number,
    pageSize: number
): Promise<Array<EventTypes[T]>> {
    const result: Array<EventTypes[T]> = [];
    for (let currBlock = fromBlock; currBlock < toBlock; currBlock += pageSize) {
        const options = {
            fromBlock: currBlock,
            toBlock: Math.min(currBlock + pageSize, toBlock),
        };
        try {
            const events = (await web3Contract.getPastEvents(eventName, options)) as Array<EventTypes[T]>;
            result.push(...events);
        } catch (err) {
            console.info(`soft failure reading blocks [${fromBlock}-${toBlock}] for ${eventName}: ${errorString(err)}`);
            if (pageSize > 5) {
                // assume there are too many events
                const events = await getEventsPaged<T>(
                    web3Contract,
                    eventName,
                    options.fromBlock,
                    options.toBlock,
                    Math.floor(pageSize / 5)
                );
                result.push(...events);
            } else throw err;
        }
    }
    return result;
}
