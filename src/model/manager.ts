import { EventData } from 'web3-eth-contract';
import { State, StateSnapshot } from './state';
import { EventTypes } from '../ethereum/events-types';

export class StateManager {
  private current: State = new State();

  applyNewEvents(time: number, events: EventData[]) {
    for (const event of events) {
      switch (event.event) {
        case 'CommitteeChanged':
          this.current.applyNewCommitteeChanged(time, event as EventTypes['CommitteeChanged']);
          break;
        case 'StandbysChanged':
          this.current.applyNewStandbysChanged(time, event as EventTypes['StandbysChanged']);
          break;
        case 'SubscriptionChanged':
          this.current.applyNewSubscriptionChanged(time, event as EventTypes['SubscriptionChanged']);
          break;
        case 'ProtocolVersionChanged':
          this.current.applyNewProtocolVersionChanged(time, event as EventTypes['ProtocolVersionChanged']);
          break;
        case 'ValidatorRegistered':
          this.current.applyNewValidatorRegistered(time, event as EventTypes['ValidatorRegistered']);
          break;
      }
    }
  }

  applyNewTimeRef(time: number) {
    this.current.applyNewTimeRef(time);
  }

  applyNewImageVersion(time: number, rolloutGroup: string, imageName: string, imageVersion: string) {
    this.current.applyNewImageVersion(time, rolloutGroup, imageName, imageVersion);
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
    // TODO: improve to a more efficient implementation
    return this.current.getSnapshot();
  }
}
