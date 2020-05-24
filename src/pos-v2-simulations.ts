import BN from 'bn.js';
import { Driver } from '@orbs-network/orbs-ethereum-contracts-v2';
import { DEPLOYMENT_SUBSET_MAIN } from '@orbs-network/orbs-ethereum-contracts-v2/release/test/driver';

export async function addParticipant(d: Driver, committee: boolean) {
    // enter comitee:
    const initStakeLesser = new BN(17000);
    const v1 = d.newParticipant();
    await v1.stake(initStakeLesser);
    const validatorTxResult = await v1.registerAsValidator(); // this moves into pending
    if (committee) {
        const commiteeTxResult = await v1.notifyReadyForCommittee(); // this moves from pending to commitee
        return { validatorTxResult, commiteeTxResult };
    } else {
        const syncTxResult = await v1.notifyReadyToSync();
        return { validatorTxResult, syncTxResult };
    }
}
// protocol version has to be greater than current, and in future block.
export async function setProtocolVersion(d: Driver, newVersion: number, fromTimestamp: number) {
    return await d.protocol.setProtocolVersion(DEPLOYMENT_SUBSET_MAIN, newVersion, fromTimestamp);
}
