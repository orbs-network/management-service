import Web3 from 'web3';
import { BlockNumber } from 'web3-core';
import { EventData, Contract, PastEventOptions } from 'web3-eth-contract';
import { compiledContracts } from '@orbs-network/orbs-ethereum-contracts-v2/release/compiled-contracts';
import { Contracts } from '@orbs-network/orbs-ethereum-contracts-v2/release/typings/contracts';
import { ContractAddressUpdatedEvent as ContractAddressUpdatedEventValues } from '@orbs-network/orbs-ethereum-contracts-v2/release/typings/contract-registry-contract';
import { errorString, toNumber } from './utils';

export function getNewEthereumReader(config: ServiceEthereumConfiguration) {
    const ethConfig = new EthereumConfigReader(config).readEthereumConfig();
    return new EthereumReader(ethConfig);
}
type ContractAddressUpdatedEvent = EventData & { returnValues: ContractAddressUpdatedEventValues };

function translateEventContractNameToContractName(eventContractName: string): keyof Contracts {
    switch (eventContractName) {
        case 'staking':
            return 'StakingContract';
        case 'rewards':
            return 'Rewards';
        case 'elections':
            return 'Elections';
        case 'subscriptions':
            return 'Subscriptions';
        case 'protocol':
            return 'Protocol';
    }
    throw new Error(`unknown contract name '${eventContractName}'`);
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

    private connect(contractName: keyof Contracts) {
        const abi = compiledContracts[contractName].abi;
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
        const contracts: { [t in keyof Contracts]?: ContractMetadata } = {};
        events.forEach((e) => {
            contracts[translateEventContractNameToContractName(e.returnValues.contractName)] = {
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
    contracts: Promise<{ [t in keyof Contracts]?: ContractMetadata }>;
    firstBlock: BlockNumber;
    httpEndpoint: string;
};

export const eventNames = [
    'CommitteeChanged',
    'TopologyChanged',
    'SubscriptionChanged',
    'ProtocolVersionChanged',
] as Readonly<['CommitteeChanged', 'TopologyChanged', 'SubscriptionChanged', 'ProtocolVersionChanged']>;
export type EventName = typeof eventNames[-1];
export function contractByEventName(eventName: EventName): keyof Contracts {
    switch (eventName) {
        case 'CommitteeChanged':
            return 'Elections';
        case 'TopologyChanged':
            return 'Elections';
        case 'SubscriptionChanged':
            return 'Subscriptions';
        case 'ProtocolVersionChanged':
            return 'Protocol';
        default:
            throw new Error(`unknown event name '${eventName}'`);
    }
}
export class EthereumReader {
    private web3: Web3;

    constructor(private config: EthereumConfig) {
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.httpEndpoint));
    }

    private async connect(contractName: keyof Contracts) {
        const contractMetadata = (await this.config.contracts)[contractName];
        if (!contractMetadata) {
            throw new Error(`contract "${contractName}" not in registry`);
        }
        const abi = compiledContracts[contractName].abi;
        return new this.web3.eth.Contract(abi, contractMetadata.address);
    }

    async getAllVirtualChains(): Promise<Array<string>> {
        const web3Contract = await this.connect('Subscriptions');
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

    async getPastEvents(eventName: EventName, { fromBlock, toBlock }: PastEventOptions) {
        const web3Contract = await this.connect(contractByEventName(eventName));
        return await getEventsPaged(web3Contract, eventName, fromBlock, toBlock, fromBlock - toBlock);
    }
}

async function getEventsPaged(
    web3Contract: Contract,
    eventName: string,
    fromBlock: number,
    toBlock: number,
    pageSize: number
): Promise<Array<EventData>> {
    const result: Array<EventData> = [];
    for (let currBlock = fromBlock; currBlock < toBlock; currBlock += pageSize) {
        const options = {
            fromBlock: currBlock,
            toBlock: Math.min(currBlock + pageSize, toBlock),
        };
        try {
            const events = await web3Contract.getPastEvents(eventName, options);
            result.push(...events);
        } catch (err) {
            if (pageSize > 5) {
                // assume there are too many events
                const events = await getEventsPaged(
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
