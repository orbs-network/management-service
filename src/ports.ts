export const GOSSIP_PORT_BASE = 32768;
export const BASE = 1000000;

export function getVirtualChainPort(id: string) {
    return GOSSIP_PORT_BASE + Number(id) - BASE;
}
