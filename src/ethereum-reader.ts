import Web3 from 'web3';
import { BlockNumber } from 'web3-core';
import { compiledContracts } from '@orbs-network/orbs-ethereum-contracts-v2/release/compiled-contracts';
import { EthereumNetwork } from './data-types';

export type Contracts = {
    Subscriptions: string;
};
export type EthereumConfig = {
    contracts: Contracts;
    firstBlock: BlockNumber;
    httpEndpoint: string;
};

export function getHardcodedEthereumConfig(network: EthereumNetwork): EthereumConfig {
    if (network == 'ganache') {
        throw new Error('ganache does not have a static configuration');
    } else if (network == 'mainnet') {
        throw new Error('mainnet not yet defined');
    } else if (network == 'ropsten') {
        throw new Error('ropsten not yet defined');
    }
    throw new Error(`unknown network: ${JSON.stringify(network)}`);
}

export class EthereumReader {
    private web3: Web3;

    constructor(private config: EthereumConfig) {
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.httpEndpoint));
    }

    private connect(contractName: keyof Contracts) {
        const abi = compiledContracts[contractName].abi;
        return new this.web3.eth.Contract(abi, this.config.contracts[contractName]);
    }

    async getAllVirtualChains(): Promise<Array<string>> {
        const web3Contract = this.connect('Subscriptions');
        const events = await web3Contract.getPastEvents('SubscriptionChanged', {
            fromBlock: this.config.firstBlock,
            toBlock: 'latest'
        });
        return events.map(event => event.returnValues.vcid);
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
