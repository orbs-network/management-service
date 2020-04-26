import {
    createVC,
    Driver,
    subscriptionChangedEvents,
    topologyChangedEvents,
    committeeChangedEvents,
    protocolChangedEvents,
} from '@orbs-network/orbs-ethereum-contracts-v2';
import test from 'ava';
import { EthereumModel } from '../eth-model';
import { getNewEthereumReader } from '../ethereum-reader';
import { deepDataMatcher } from '../test-kit';
import Web3 from 'web3';
import { addParticipant, setProtocolVersion } from '../pos-v2-simulations';

test.serial(
    '[integration] getLast24HoursEvents(SubscriptionChanged) returns according to ethereum state',
    async (t) => {
        t.timeout(60 * 1000);
        const d = await Driver.new();

        const vc1Event = subscriptionChangedEvents(await createVC(d))[0];
        const vc2Event = subscriptionChangedEvents(await createVC(d))[0];
        const evpectedEvents = [{ returnValues: vc1Event }, { returnValues: vc2Event }];
        const ethModel = await pollEvents(d);
        const eventsFromModel = ethModel.getEventsFromTime('SubscriptionChanged', 0);
        t.deepEqual(
            deepDataMatcher(eventsFromModel, evpectedEvents),
            [],
            'SubscriptionChanged events stored matches events produced'
        );
    }
);

test.serial('[integration] getLast24HoursEvents(TopologyChanged) returns according to ethereum state', async (t) => {
    t.timeout(60 * 1000);
    const d = await Driver.new();

    const v1Results = await addParticipant(d, true);
    const v2Results = await addParticipant(d, false);

    const vc1Event = topologyChangedEvents(v1Results.validatorTxResult)[0];
    const vc2Event = topologyChangedEvents(v2Results.validatorTxResult)[0];
    const evpectedEvents = [{ returnValues: vc1Event }, { returnValues: vc2Event }];
    const ethModel = await pollEvents(d);
    const eventsFromModel = ethModel.getEventsFromTime('TopologyChanged', 0);

    t.deepEqual(
        deepDataMatcher(eventsFromModel, evpectedEvents),
        [],
        'TopologyChanged events stored matches events produced'
    );
});

test.serial('[integration] getLast24HoursEvents(CommitteeChanged) returns according to ethereum state', async (t) => {
    t.timeout(60 * 1000);
    const d = await Driver.new();

    const v1Results = await addParticipant(d, true);
    const v2Results = await addParticipant(d, true);

    const vc1Event = committeeChangedEvents(v1Results.commiteeTxResult)[0];
    const vc2Event = committeeChangedEvents(v2Results.commiteeTxResult)[0];
    const evpectedEvents = [{ returnValues: vc1Event }, { returnValues: vc2Event }];
    const ethModel = await pollEvents(d);
    const eventsFromModel = ethModel.getEventsFromTime('CommitteeChanged', 0);

    t.deepEqual(
        deepDataMatcher(eventsFromModel, evpectedEvents),
        [],
        'CommitteeChanged events stored matches events produced'
    );
});

test.serial(
    '[integration] getLast24HoursEvents(ProtocolVersionChanged) returns according to ethereum state',
    async (t) => {
        t.timeout(60 * 1000);
        const d = await Driver.new();

        const blockNumber = await d.web3.eth.getBlockNumber();
        const v1Results = await setProtocolVersion(d, 2, blockNumber + 10); // revert protocol update can only take place in the future
        const v2Results = await setProtocolVersion(d, 3, blockNumber + 20);

        const driverInitEvent = { protocolVersion: '1', asOfBlock: '0' };
        const vc1Event = protocolChangedEvents(v1Results)[0];
        const vc2Event = protocolChangedEvents(v2Results)[0];
        const evpectedEvents = [
            { returnValues: driverInitEvent },
            { returnValues: vc1Event },
            { returnValues: vc2Event },
        ];
        const ethModel = await pollEvents(d);
        const eventsFromModel = ethModel.getEventsFromTime('ProtocolVersionChanged', 0);

        t.deepEqual(
            deepDataMatcher(eventsFromModel, evpectedEvents),
            [],
            'ProtocolVersionChanged events stored matches events produced'
        );
    }
);

async function pollEvents(d: Driver) {
    const zeroBlock = await new Web3('http://localhost:7545').eth.getBlockNumber();
    const config = {
        FirstBlock: zeroBlock,
        EthereumGenesisContract: d.contractRegistry.address,
        EthereumEndpoint: 'http://localhost:7545',
    };
    const ethReader = getNewEthereumReader(config);
    const ethModel = new EthereumModel(ethReader);
    while ((await ethModel.pollEvents()) < (await ethReader.getBlockNumber())) {
        await new Promise((res) => setTimeout(res, 50));
    }
    return ethModel;
}
