import { StateManager } from '../model/manager';
import * as Logger from '../logger';
import { DockerHubConfiguration, DockerHubReader } from './dockerhub-reader';
import { getCurrentClockTime } from '../helpers';

export const imageNamesToPollForNewVersions = ['node', 'management-service'];

export type ImagePollConfiguration = DockerHubConfiguration & {};

export class ImagePoll {
  private reader: DockerHubReader;

  constructor(private state: StateManager, config: ImagePollConfiguration) {
    this.reader = new DockerHubReader(config);
    Logger.log(`DockerHubPoll: initialized.`);
  }

  // single tick of the run loop
  async run() {
    const time = getCurrentClockTime();
    const promises = imageNamesToPollForNewVersions.map((imageName) => this.reader.fetchLatestVersion(imageName));
    const latestVersions = await Promise.all(promises);
    for (let i = 0; i < imageNamesToPollForNewVersions.length; i++) {
      const imageName = imageNamesToPollForNewVersions[i];
      const imageVersion = latestVersions[i];
      if (imageVersion['main']) this.state.applyNewImageVersion(time, 'main', imageName, imageVersion['main']);
      if (imageVersion['canary']) this.state.applyNewImageVersion(time, 'canary', imageName, imageVersion['canary']);
    }
    Logger.log(`ImagePoll: run processed versions ${JSON.stringify(latestVersions)}.`);
  }
}
