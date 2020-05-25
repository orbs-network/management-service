/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    createVC,
    Driver,
    subscriptionChangedEvents,
    standbysChangedEvents,
    committeeChangedEvents,
    protocolChangedEvents,
} from '@orbs-network/orbs-ethereum-contracts-v2';
import test, { ExecutionContext } from 'ava';
import { EthereumModel } from '../eth-model';
import { getNewEthereumReader } from '../ethereum-reader';
import { deepDataMatcher } from '../test-kit';
import Web3 from 'web3';
import { addParticipant, setProtocolVersion } from '../pos-v2-simulations';
import { nowUTC } from '../utils';
import { EventName, EventTypes } from './events-types';

test.serial('[integration] getEventsFromTime(SubscriptionChanged) returns according to ethereum state', async (t) => {
    t.timeout(60 * 1000);
    const d = await Driver.new();

    const vc1Event = subscriptionChangedEvents(await createVC(d))[0];
    const vc2Event = subscriptionChangedEvents(await createVC(d))[0];
    const evpectedEvents = [{ returnValues: vc1Event }, { returnValues: vc2Event }];
    const ethModel = await pollEvents(d);
    const eventsFromModel = ethModel.getEventsFromTime('SubscriptionChanged', 0, nowUTC() * 2);
    t.deepEqual(
        deepDataMatcher(eventsFromModel, evpectedEvents),
        [],
        'SubscriptionChanged events stored matches events produced'
    );
});

test.serial('[integration] getEventsFromTime(StandbysChanged) returns according to ethereum state', async (t) => {
    t.timeout(60 * 1000);
    const d = await Driver.new();

    const v1Results = await addParticipant(d, false);
    const v2Results = await addParticipant(d, false);

    const committeeContractAddress = d.committeeGeneral.address;
    const vc1Event = standbysChangedEvents(v1Results.syncTxResult, committeeContractAddress)[0];
    const vc2Event = standbysChangedEvents(v2Results.syncTxResult, committeeContractAddress)[0];
    const evpectedEvents = [{ returnValues: vc1Event }, { returnValues: vc2Event }];
    const ethModel = await pollEvents(d);
    const eventsFromModel = ethModel.getEventsFromTime('StandbysChanged', 0, nowUTC() * 2);

    t.deepEqual(
        deepDataMatcher(eventsFromModel, evpectedEvents),
        [],
        'StandbysChanged events stored matches events produced'
    );
});

test.serial('[integration] getEventsFromTime(CommitteeChanged) returns according to ethereum state', async (t) => {
    t.timeout(60 * 1000);
    const d = await Driver.new();

    const v1Results = await addParticipant(d, true);
    const v2Results = await addParticipant(d, true);

    const committeeContractAddress = d.committeeGeneral.address;
    const vc1Event = committeeChangedEvents(v1Results.commiteeTxResult, committeeContractAddress)[0];
    const vc2Event = committeeChangedEvents(v2Results.commiteeTxResult, committeeContractAddress)[0];
    const evpectedEvents = [{ returnValues: vc1Event }, { returnValues: vc2Event }];
    const ethModel = await pollEvents(d);
    const eventsFromModel = ethModel.getEventsFromTime('CommitteeChanged', 0, nowUTC() * 2);

    t.deepEqual(
        deepDataMatcher(eventsFromModel, evpectedEvents),
        [],
        'CommitteeChanged events stored matches events produced'
    );
});

test.serial(
    '[integration] getEventsFromTime(ProtocolVersionChanged) returns according to ethereum state',
    async (t) => {
        t.timeout(60 * 1000);
        const d = await Driver.new();

        const v1Results = await setProtocolVersion(d, 20, nowUTC() * 2);
        const v2Results = await setProtocolVersion(d, 30, nowUTC() * 3);

        const driverInitEvent = { currentVersion: '1', nextVersion: '1' };
        const vc1Event = protocolChangedEvents(v1Results)[0];
        const vc2Event = protocolChangedEvents(v2Results)[0];
        const evpectedEvents = [
            { returnValues: driverInitEvent },
            { returnValues: vc1Event },
            { returnValues: vc2Event },
        ];
        const ethModel = await pollEvents(d);
        const eventsFromModel = ethModel.getEventsFromTime('ProtocolVersionChanged', 0, nowUTC() * 2);

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
    const ethModel = new EthereumModel(ethReader, {
        finalityBufferTime: 0,
        finalityBufferBlocks: 0,
    });
    while ((await ethModel.pollEvents()) < (await ethReader.getBlockNumber())) {
        await new Promise((res) => setTimeout(res, 50));
    }
    return ethModel;
}

function makeFakeReader() {
    return {
        blocks: [
            {
                time: 10,
                events: { ProtocolVersionChanged: [{ returnValues: { protocolVersion: 'A', asOfBlock: '99' } }] },
            },
            {
                time: 20,
                events: { ProtocolVersionChanged: [{ returnValues: { protocolVersion: 'B', asOfBlock: '99' } }] },
            },
            {
                time: 30,
                events: { ProtocolVersionChanged: [{ returnValues: { protocolVersion: 'C', asOfBlock: '99' } }] },
            },
            {
                time: 40,
                events: { ProtocolVersionChanged: [{ returnValues: { protocolVersion: 'D', asOfBlock: '99' } }] },
            },
        ],
        getBlockNumber(): Promise<number> {
            return Promise.resolve(this.blocks.length - 1);
        },

        getRefTime(blockNumber: number | 'latest'): Promise<number | null> {
            if (blockNumber === 'latest') {
                blockNumber = this.blocks.length - 1;
            }
            if (blockNumber >= this.blocks.length) {
                return Promise.resolve(null);
            }
            return Promise.resolve(this.blocks[blockNumber].time);
        },

        getPastEvents<T extends EventName>(
            eventName: T,
            { fromBlock, toBlock }: { fromBlock: number; toBlock: number }
        ): Promise<Array<EventTypes[T]>> {
            if (eventName === 'ProtocolVersionChanged') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return Promise.resolve(
                    this.blocks
                        .slice(fromBlock, toBlock - fromBlock + 1)
                        .flatMap((b, i) =>
                            b.events.ProtocolVersionChanged.map((e) => ({ blockNumber: i, ...(e as any) }))
                        )
                );
            } else {
                return Promise.resolve([]);
            }
        },
    };
}

test('getEventsFromTime(ProtocolVersionChanged) with fake reader happy flow', async (t) => {
    const fakeReader = makeFakeReader();
    const ethModel = new EthereumModel(fakeReader, {
        finalityBufferTime: 0,
        finalityBufferBlocks: 0,
    });
    await assertExpectedEvents(t, ethModel, fakeReader, 3);
});

test('getEventsFromTime(ProtocolVersionChanged) with fake reader happy flow and finality by blocks', async (t) => {
    const fakeReader = makeFakeReader();
    const ethModel = new EthereumModel(fakeReader, {
        finalityBufferTime: 0,
        finalityBufferBlocks: 2,
    });
    await assertExpectedEvents(t, ethModel, fakeReader, 1);
});

test('getEventsFromTime(ProtocolVersionChanged) with fake reader happy flow and finality by time', async (t) => {
    const fakeReader = makeFakeReader();
    const ethModel = new EthereumModel(fakeReader, {
        finalityBufferTime: 1,
        finalityBufferBlocks: 0,
    });
    await assertExpectedEvents(t, ethModel, fakeReader, 2);
});

test('getEventsFromTime(ProtocolVersionChanged) with fake reader happy flow and finality by time (2)', async (t) => {
    const fakeReader = makeFakeReader();
    const ethModel = new EthereumModel(fakeReader, {
        finalityBufferTime: 19,
        finalityBufferBlocks: 1,
    });
    await assertExpectedEvents(t, ethModel, fakeReader, 0);
});

test('getEventsFromTime(ProtocolVersionChanged) with fake reader happy flow and finality by time and blocks', async (t) => {
    const fakeReader = makeFakeReader();
    const ethModel = new EthereumModel(fakeReader, {
        finalityBufferTime: 19,
        finalityBufferBlocks: 1,
    });
    await assertExpectedEvents(t, ethModel, fakeReader, 1);
});

test('getEventsFromTime(ProtocolVersionChanged) with fake reader happy flow and finality by time and blocks (2)', async (t) => {
    const fakeReader = makeFakeReader();
    const ethModel = new EthereumModel(fakeReader, {
        finalityBufferTime: 5,
        finalityBufferBlocks: 2,
    });
    await assertExpectedEvents(t, ethModel, fakeReader, 1);
});
async function assertExpectedEvents(
    t: ExecutionContext,
    ethModel: EthereumModel,
    fakeReader: ReturnType<typeof makeFakeReader>,
    lastExpectedBlockNumber: number
) {
    while ((await ethModel.pollEvents()) < lastExpectedBlockNumber);
    const evpectedEvents = (
        await fakeReader.getPastEvents('ProtocolVersionChanged', { fromBlock: 0, toBlock: lastExpectedBlockNumber })
    ).map((e) => ({ ...e, time: fakeReader.blocks[e.blockNumber].time }));
    const eventsFromModel = ethModel.getEventsFromTime('ProtocolVersionChanged', 0, 10000);
    t.deepEqual(
        deepDataMatcher(eventsFromModel, evpectedEvents),
        [],
        'ProtocolVersionChanged events stored matches events produced'
    );
}
