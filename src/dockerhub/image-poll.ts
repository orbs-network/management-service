import { StateManager } from '../model/manager';
import * as Logger from '../logger';
import { DockerHubConfiguration, DockerHubReader } from './dockerhub-reader';
import { getCurrentClockTime } from '../helpers';

export const imageNamesToPollForNewVersions = ['management-service', 'node'];

export type ImagePollConfiguration = DockerHubConfiguration & {};

export class ImagePoll {
  private reader: DockerHubReader;

  constructor(private state: StateManager, config: ImagePollConfiguration) {
    this.reader = new DockerHubReader(config);
    Logger.log(`DockerHubPoll: initialized.`);
  }

  // single tick of the run loop
  async run() {
    for (const imageName of imageNamesToPollForNewVersions) {
      await this.pollImageForImmediateUpdate(imageName);
    }
  }

  async pollImageForImmediateUpdate(imageName: string) {
    const time = getCurrentClockTime();
    const imageVersion = await this.reader.fetchLatestVersion(imageName);
    if (imageVersion['main']) this.state.applyNewImageVersion(time, 'main', imageName, imageVersion['main']);
    if (imageVersion['canary']) this.state.applyNewImageVersion(time, 'canary', imageName, imageVersion['canary']);
    Logger.log(`ImagePoll: '${imageName}' versions ${JSON.stringify(imageVersion)}.`);
  }
}
