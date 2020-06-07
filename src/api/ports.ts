export const GOSSIP_PORT_BASE = 10000;
export const BASE = 1000000;

export function getVirtualChainPort(id: number) {
  return GOSSIP_PORT_BASE + id - BASE;
}
