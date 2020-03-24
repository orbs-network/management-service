import Web3 from 'web3';
import { BlockNumber } from 'web3-core';
import { EventData } from 'web3-eth-contract';
import { compiledContracts } from '@orbs-network/orbs-ethereum-contracts-v2/release/compiled-contracts';
import { Contracts } from '@orbs-network/orbs-ethereum-contracts-v2/release/typings/contracts';
import { ServiceConfiguration } from './data-types';
import { ContractAddressUpdatedEvent as ContractAddressUpdatedEventValues } from '@orbs-network/orbs-ethereum-contracts-v2/release/typings/contract-registry-contract';

type ContractMetadata = {
    address: string;
    firstBlock: BlockNumber;
};
export type EthereumConfig = {
    contracts: { [t in keyof Contracts]?: ContractMetadata };
    firstBlock: BlockNumber;
    httpEndpoint: string;
};
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

export class EthereumConfigReader {
    private web3: Web3;

    constructor(private config: ServiceConfiguration) {
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.EthereumEndpoint));
    }

    private connect(contractName: keyof Contracts) {
        const abi = compiledContracts[contractName].abi;
        return new this.web3.eth.Contract(abi, this.config.EthereumGenesisContract);
    }

    async readEthereumConfig(): Promise<EthereumConfig> {
        const web3Contract = this.connect('ContractRegistry');
        const events = (await web3Contract.getPastEvents('ContractAddressUpdated', {
            fromBlock: 0,
            toBlock: 'latest',
        })) as ContractAddressUpdatedEvent[];
        const result: EthereumConfig = {
            contracts: {},
            firstBlock: events[0].blockNumber,
            httpEndpoint: this.config.EthereumEndpoint,
        };
        events.forEach((e) => {
            result.contracts[translateEventContractNameToContractName(e.returnValues.contractName)] = {
                address: e.returnValues.addr,
                firstBlock: 0, // e.blockNumber
            };
        });
        return result;
    }
}

export class EthereumReader {
    private web3: Web3;

    constructor(private config: EthereumConfig) {
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.httpEndpoint));
    }

    private connect(contractName: keyof Contracts) {
        const contractMetadata = this.config.contracts[contractName];
        if (!contractMetadata) {
            throw new Error(`contract "${contractName}" not in registry`);
        }
        const abi = compiledContracts[contractName].abi;
        return new this.web3.eth.Contract(abi, contractMetadata.address);
    }

    async getAllVirtualChains(): Promise<Array<string>> {
        const web3Contract = this.connect('Subscriptions');
        const events = await web3Contract.getPastEvents('SubscriptionChanged', {
            fromBlock: this.config.firstBlock,
            toBlock: 'latest',
        });
        return events.map((event) => event.returnValues.vcid);
    }
}

// async function getEventsPaged(
//   contract: Contract,
//   eventType: string,
//   fromBlock: number,
//   toBlock: number,
//   pageSize: number
// ): Promise<Array<EventData>> {
//   const result: Array<EventData> = [];
//   for (let currBlock = fromBlock; currBlock < toBlock; currBlock += pageSize) {
//     const options = {
//       fromBlock: currBlock,
//       toBlock: Math.min(currBlock + pageSize, toBlock)
//     };
//     try {
//       const events = await contract.getPastEvents(
//         "SubscriptionChanged",
//         options
//       );
//       result.push(...events);
//     } catch (err) {
//       if (pageSize > 5) {
//         // assume there are too many events
//         const events = await getEventsPaged(
//           contract,
//           eventType,
//           options.fromBlock,
//           options.toBlock,
//           Math.floor(pageSize / 5)
//         );
//         result.push(...events);
//       } else throw err;
//     }
//   }
//   return result;
// }
