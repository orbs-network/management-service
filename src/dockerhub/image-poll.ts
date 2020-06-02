import { StateManager } from '../model/manager';
import * as Logger from '../logger';
import { DockerHubConfiguration, DockerHubReader } from './dockerhub-reader';

export type ImagePollConfiguration = DockerHubConfiguration & {};

export class ImagePoll {
  private reader: DockerHubReader;
  private imageNamesToPoll: string[];

  constructor(private state: StateManager, config: ImagePollConfiguration) {
    this.reader = new DockerHubReader(config);
    this.imageNamesToPoll = ['node', 'management-service'];
    Logger.log(`DockerHubPoll: initialized.`);
  }

  // single tick of the run loop
  async run() {
    const promises = this.imageNamesToPoll.map((imageName) => this.reader.fetchLatestVersion(imageName));
    const latestVersions = await Promise.all(promises);
    for (let i = 0; i < this.imageNamesToPoll.length; i++) {
      const imageName = this.imageNamesToPoll[i];
      const imageVersion = latestVersions[i];
      if (imageVersion) this.state.applyNewImageVersion(imageName, imageVersion);
    }
    Logger.log(`ImagePoll: run processed versions ${latestVersions}.`);
  }
}
