import {ServiceConfiguration} from "./config";

export const GOVERNANCE_MAINNET_GENESIS_CONTRACT = '0x5454223e3078Db87e55a15bE541cc925f3702eB0';
export const GOVERNANCE_GANACHE_GENESIS_CONTRACT = '0x5cd0D270C30EDa5ADa6b45a5289AFF1D425759b3';

export const GOVERNANCE_MAINNET_FIRST_BLOCK = 11067858;
export const GOVERNANCE_GANACHE_FIRST_BLOCK = 0;

export function getGenesisContractAddress() : string {
    return (process.env.NODE_ENV === 'production') ?
        GOVERNANCE_MAINNET_GENESIS_CONTRACT :
        GOVERNANCE_GANACHE_GENESIS_CONTRACT;
}

export function getEthereumFirstBlock() : number {
    return (process.env.NODE_ENV === 'production') ?
        GOVERNANCE_MAINNET_FIRST_BLOCK :
        GOVERNANCE_GANACHE_FIRST_BLOCK;
}

export function applyGovernance(config: ServiceConfiguration) {
    config.EthereumGenesisContract = getGenesisContractAddress();
    config.EthereumFirstBlock = getEthereumFirstBlock();
}
