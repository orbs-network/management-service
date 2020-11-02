import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { StateManager } from './model/manager';
import { ServiceConfiguration } from './config';
import { renderServiceStatus } from './api/render-status';
import { DailyStatsData, sleep } from './helpers';
import * as Logger from './logger';

export class StatusWriter {
  constructor(private state: StateManager, private config: ServiceConfiguration) {}

  // single tick of the run loop
  async run(stats: DailyStatsData) {
    // render status
    const snapshot = this.state.getCurrentSnapshot();
    const status = renderServiceStatus(snapshot, stats, this.config);

    // do the actual writing to local file
    const filePath = this.config.StatusJsonPath;
    ensureFileDirectoryExists(filePath);
    const content = JSON.stringify(status, null, 2);
    writeFileSync(filePath, content);

    // log progress
    Logger.log(`Wrote status JSON to ${filePath} (${content.length} bytes).`);
    await sleep(0); // for eslint
  }
}

export function ensureFileDirectoryExists(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true });
}
