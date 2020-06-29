import { EventData } from 'web3-eth-contract';
import { State, StateSnapshot } from './state';
import { EventTypes } from '../ethereum/events-types';

export class StateManager {
  private current: State = new State();

  applyNewEvents(time: number, events: EventData[]) {
    for (const event of events) {
      switch (event.event) {
        case 'ValidatorCommitteeChange':
          this.current.applyNewValidatorCommitteeChange(time, event as EventTypes['ValidatorCommitteeChange']);
          break;
        case 'SubscriptionChanged':
          this.current.applyNewSubscriptionChanged(time, event as EventTypes['SubscriptionChanged']);
          break;
        case 'ProtocolVersionChanged':
          this.current.applyNewProtocolVersionChanged(time, event as EventTypes['ProtocolVersionChanged']);
          break;
        case 'ValidatorDataUpdated':
          this.current.applyNewValidatorDataUpdated(time, event as EventTypes['ValidatorDataUpdated']);
          break;
        case 'ValidatorStatusUpdated':
          this.current.applyNewValidatorStatusUpdated(time, event as EventTypes['ValidatorStatusUpdated']);
          break;
      }
    }
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
}
