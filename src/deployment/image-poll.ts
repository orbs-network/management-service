import crypto from 'crypto';
import { StateManager } from '../model/manager';
import { DeploymentDescriptorConfiguration, DeploymentDescriptorReader, services } from './deployment-descriptor';
import { getCurrentClockTime } from '../helpers';
import * as Versioning from './/versioning';
import * as Logger from '../logger';

export const imageNamesToPollForNewVersions: services[] = [
  'management-service',
  'matic-reader',
  'node',
  'signer',
  'ethereum-writer',
  'matic-writer',
  'logs-service',  
  'hello'
];

export type ImagePollConfiguration = DeploymentDescriptorConfiguration & {
  BootstrapMode: boolean;
  RegularRolloutWindowSeconds: number;
  HotfixRolloutWindowSeconds: number;
};

interface PendingUpdate {
  pendingVersion: string;
  timer: ReturnType<typeof setTimeout>;
}

export class ImagePoll {
  private reader: DeploymentDescriptorReader;
  private delayedUpdates: { [RolloutGroup: string]: { [ImageName: string]: PendingUpdate } };

  constructor(private state: StateManager, private config: ImagePollConfiguration) {
    if (config.BootstrapMode) {
      // only poll management-service in bootstrap mode
      imageNamesToPollForNewVersions.splice(0);
      imageNamesToPollForNewVersions.push('management-service');
    }
    this.reader = new DeploymentDescriptorReader(config);
    this.delayedUpdates = { main: {}, canary: {} };
    Logger.log(`ImagePoll: initialized.`);
  }

  // single tick of the run loop
  async run() {
    Logger.log(`ImagePoll: about to poll ${imageNamesToPollForNewVersions} from deployment descriptor.`);
    const time = getCurrentClockTime();
    const fetchedVersions = await this.reader.fetchLatestVersion(); // open protocol

    // TODO add protection here - if we don't have a valid management-service we must throw here
    // otherwise boyar might shut down management service forever
    // TBD - what other services are required?

    for (const imageName of imageNamesToPollForNewVersions) {
      for (const [rolloutGroup, imageVersion] of Object.entries(fetchedVersions[imageName])) {
        if (this.config.BootstrapMode) {
          // bootstrap is just management-service - must be updated immediately
          this.performImmediateUpdate(rolloutGroup, imageName, imageVersion);
        } else {
          // when not in bootstrap, everything is rolled out slowly (24h by default)
          this.performGradualRollout(rolloutGroup, imageName, imageVersion);
        }
        this.state.applyNewImageVersionPollTime(time, rolloutGroup, imageName);
      }
    }
  }

  isUpgradeAllowed(newVersion: string, currentVersion: string): boolean {
    if (!Versioning.isValid(newVersion)) return false;
    if (!currentVersion) return true;
    // image version upgrades only go forward (we don't allow downgrade)
    return Versioning.compare(newVersion, currentVersion) > 0;
  }

  performImmediateUpdate(rolloutGroup: string, imageName: string, imageVersion: string) {
    const currentVersion = this.getCurrentVersion(rolloutGroup, imageName);
    if (!this.isUpgradeAllowed(imageVersion, currentVersion)) return;
    this.state.applyNewImageVersion(rolloutGroup, imageName, imageVersion);
    Logger.log(`ImagePoll: immediate update of '${imageName}:${rolloutGroup}' to ${imageVersion}.`);
  }

  performGradualRollout(rolloutGroup: string, imageName: string, imageVersion: string) {
    // initialize first version immediately (no delays before first update)
    const currentVersion = this.getCurrentVersion(rolloutGroup, imageName);
    if (!currentVersion) {
      return this.performImmediateUpdate(rolloutGroup, imageName, imageVersion);
    }

    // check if we have a pending update
    const existingPending = this.delayedUpdates[rolloutGroup][imageName];
    if (existingPending) {
      if (!this.isUpgradeAllowed(imageVersion, existingPending.pendingVersion)) return;
      // we want to update over this update, let's cancel it
      clearTimeout(existingPending.timer);
      this.clearPendingUpdate(rolloutGroup, imageName);
      Logger.log(
        `ImagePoll: existing pending update of '${imageName}:${rolloutGroup}' to ${existingPending.pendingVersion} canceled.`
      );
    } else {
      if (!this.isUpgradeAllowed(imageVersion, currentVersion)) return;
    }

    // create a new pending update
    const delaySeconds = this.getGradualRolloutDelay(imageVersion);
    if (delaySeconds === 0) {
      return this.performImmediateUpdate(rolloutGroup, imageName, imageVersion);
    } else {
      this.setPendingUpdate(rolloutGroup, imageName, imageVersion, delaySeconds);
      Logger.log(
        `ImagePoll: new pending update of '${imageName}:${rolloutGroup}' to ${imageVersion} in ${delaySeconds} seconds.`
      );
    }
  }

  getCurrentVersion(rolloutGroup: string, imageName: string) {
    return this.state.getCurrentSnapshot().CurrentImageVersions[rolloutGroup][imageName];
  }

  getGradualRolloutDelay(imageVersion: string): number {
    if (Versioning.isImmediate(imageVersion)) return 0;
    const rolloutWindow = Versioning.isHotfix(imageVersion)
      ? this.config.HotfixRolloutWindowSeconds
      : this.config.RegularRolloutWindowSeconds;
    const randomNumbers = new Uint32Array(1);
    crypto.randomFillSync(randomNumbers);
    return randomNumbers[0] % rolloutWindow;
  }

  clearPendingUpdate(rolloutGroup: string, imageName: string) {
    delete this.delayedUpdates[rolloutGroup][imageName];
    this.state.applyNewImageVersionPendingUpdate(rolloutGroup, imageName);
  }

  setPendingUpdate(rolloutGroup: string, imageName: string, imageVersion: string, delaySeconds: number) {
    if (delaySeconds > 20 * 24 * 60 * 60) {
      throw new Error(`Pending update delay seconds ${delaySeconds} is above 20 days (setTimeout can overflow).`);
    }
    const time = getCurrentClockTime();
    const newPendingUpdate = {
      pendingVersion: imageVersion,
      timer: setTimeout(() => {
        this.performImmediateUpdate(rolloutGroup, imageName, imageVersion);
        this.clearPendingUpdate(rolloutGroup, imageName);
      }, delaySeconds * 1000),
    };
    this.delayedUpdates[rolloutGroup][imageName] = newPendingUpdate;
    this.state.applyNewImageVersionPendingUpdate(rolloutGroup, imageName, imageVersion, time + delaySeconds);
  }
}
