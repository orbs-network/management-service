export const GOSSIP_PORT_BEGIN = 4000;
export const GOSSIP_PORT_RANGE = 1000;

export function getVirtualChainPort(id: string) {
    return GOSSIP_PORT_BEGIN + (stringHash(id) % GOSSIP_PORT_RANGE);
}

export function stringHash(id: string) {
    let result = 0;
    for (let i = 0; i < id.length; i++) {
        const chr = id.charCodeAt(i);
        result = (result << 5) - result + chr;
        result |= 0; // Convert to 32bit integer
    }
    return result;
}
