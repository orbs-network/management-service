import { EventData } from 'web3-eth-contract';
import { State, StateSnapshot, StateConfiguration } from './state';
import { EventTypes } from '../ethereum/types';
import fs from 'fs';
import * as Logger from '../logger';

export class StateManager {
  private current: State;
  private MODE : string = process.env.MODE || 'production';
  private MY_CHAIN_ID : string = process.env.CHAIN || 'ethereum';

  applyNewEvents(block: number, time: number, events: EventData[]) {
    for (const event of events) {
      switch (event.event) {
        case 'ContractAddressUpdated':
          this.current.applyNewContractAddressUpdated(time, event as EventTypes['ContractAddressUpdated']);
          break;
        case 'CommitteeChange':
          this.current.applyNewCommitteeChange(time, event as EventTypes['CommitteeChange']);
          break;
        case 'SubscriptionChanged':
          this.current.applyNewSubscriptionChanged(time, event as EventTypes['SubscriptionChanged']);
          break;
        case 'ProtocolVersionChanged':
          this.current.applyNewProtocolVersionChanged(time, event as EventTypes['ProtocolVersionChanged']);
          break;
        case 'GuardianDataUpdated':
          this.current.applyNewGuardianDataUpdated(time, event as EventTypes['GuardianDataUpdated']);
          break;
        case 'GuardianStatusUpdated':
          this.current.applyNewGuardianStatusUpdated(time, event as EventTypes['GuardianStatusUpdated']);
          break;
        case 'StakeChanged':
          this.current.applyNewStakeChanged(time, event as EventTypes['StakeChanged']);
          break;
        case 'GuardianMetadataChanged':
          this.current.applyNewGuardianMetadataChanged(time, event as EventTypes['GuardianMetadataChanged']);
          break;
        case 'GuardianCertificationUpdate':
          this.current.applyNewGuardianCertificationUpdate(time, event as EventTypes['GuardianCertificationUpdate']);
          break;
      }
    }
    this.current.applyNewEventsProcessed(
      block,
      events.map((e) => e.event)
    );
  }

  constructor(private config: StateConfiguration) {
    this.current = new State(this.config);

    // Inject fake data
    this.createFakeData();
  }

  applyNewTimeRef(time: number, block: number) {
    this.current.applyNewTimeRef(time, block);
  }

  applyNewImageVersion(rolloutGroup: string, imageName: string, imageVersion: string) {
    this.current.applyNewImageVersion(rolloutGroup, imageName, imageVersion);
  }

  applyNewImageVersionPollTime(time: number, rolloutGroup: string, imageName: string) {
    this.current.applyNewImageVersionPollTime(time, rolloutGroup, imageName);
  }

  applyNewImageVersionPendingUpdate(rolloutGroup: string, imageName: string, pendingVersion = '', pendingTime = 0) {
    this.current.applyNewImageVersionPendingUpdate(rolloutGroup, imageName, pendingVersion, pendingTime);
  }

  getCurrentSnapshot(): StateSnapshot {
    return this.current.getSnapshot();
  }

  getHistoricSnapshot(containingTime: number): StateSnapshot {
    const latestAvailableRefTime = this.current.getSnapshot().CurrentRefTime;
    if (latestAvailableRefTime < containingTime) {
      throw new Error(
        `Latest available RefTime ${latestAvailableRefTime} is earlier than requested time ${containingTime}.`
      );
    }
    // TODO: improve to a more efficient implementation that only returns a subset of events
    return this.current.getSnapshot();
  }

  loadStateFromDisk () {
    if (this.MODE != 'dev') {
      return;
    }

    try {
      if (!fs.existsSync('./status/'+this.MY_CHAIN_ID+'.json')) {
        Logger.log('State file does not exist, starting with empty state.');
        return;
      }

      const state = JSON.parse(fs.readFileSync('./status/'+this.MY_CHAIN_ID+'.json', 'utf8'));
      this.current = new State(this.config);
      this.current.loadSnapshot(state);
    } catch (e) {
      console.error('Failed to load state from disk, starting with empty state.');
    }
  }

  saveStateToDisk () {
    if (this.MODE != 'dev') {
      return;
    }

    Logger.log('Saving state to disk');
    fs.writeFileSync('./status/'+this.MY_CHAIN_ID+'.json', JSON.stringify(this.current.getSnapshot(), null, 2));
  }

  createFakeData() {
    const jsonEnvVar  = process.env.INJECT_FAKE_GUARDIAN;

    if (!jsonEnvVar) {
        return;
    }

    const guardianData = JSON.parse(jsonEnvVar);

    const now = Number(Math.floor(Date.now() / 1000));

    const newFakeEvent: EventData = {
        returnValues: {
            currentRefTime: now,
            guardian: "ff74bc1383958e2475df73dc68c4f09658e23777",
            orbsAddr: "ff74bc1383958e2475df73dc68c4f09658e23777",
            name: guardianData.name,
            ip : guardianData.ip,
            email: guardianData.Email,
            website: guardianData.Website,
            registrationTime: now,
            metadata: guardianData.Metadata,
            certification: guardianData.Certification,
            isCertified: true,
            isRegistered: true,
            isCertificationValid: true,
            isCertificationValidAt: guardianData.IsCertificationValidAt,
            isCertificationValidUntil: guardianData.IsCertificationValidUntil,
            isCertificationValidUntilAt: guardianData.IsCertificationValidUntilAt,
        },
        raw: {
            data: "0x",               // Example data, replace with actual values
            topics: ["0x..."]          // Example topic, replace with actual topic array
        },
        event: "GuardianDataUpdated",            // Replace with your event name
        signature: "0x...",            // Replace with actual signature
        logIndex: 0,                   // Replace with the correct log index
        transactionIndex: 0,           // Replace with the correct transaction index
        transactionHash: "0x...",      // Replace with actual transaction hash
        blockHash: "0x...",            // Replace with actual block hash
        blockNumber: 123456,           // Replace with actual block number
        address: "0x..."               // Replace with actual address
    };

    this.current.applyNewGuardianDataUpdated(0, newFakeEvent as EventTypes['GuardianDataUpdated']);
    this.current.applyNewTimeRef(now, 111111);
  }
}
