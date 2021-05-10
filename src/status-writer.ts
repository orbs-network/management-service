import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { gzip } from 'node-gzip';
import { StateManager } from './model/manager';
import { ServiceConfiguration } from './config';
import { renderServiceStatus, renderServiceStatusAnalytics } from './api/render-status';
import { DailyStatsData, sleep } from './helpers';
import * as Logger from './logger';

export class StatusWriter {
  constructor(private state: StateManager, private config: ServiceConfiguration) {}

  // single tick of the run loop
  async run(stats: DailyStatsData) {
    // render status
    const snapshot = this.state.getCurrentSnapshot();
    const status = renderServiceStatus(snapshot, stats, this.config);
    const statusAnalytics = renderServiceStatusAnalytics(snapshot, stats, this.config);

    // do the actual writing to local files
    writeFile(this.config.StatusJsonPath, status);
    writeFile(this.config.StatusAnalyticsJsonPath, statusAnalytics);
    await writeFileCompress(this.config.StatusAnalyticsJsonGzipPath, statusAnalytics);

    await sleep(0); // for eslint
  }
}

function writeFile(filePath: string, jsonObject: any) {
  ensureFileDirectoryExists(filePath);
  let content = JSON.stringify(jsonObject, null, 2);
  writeFileSync(filePath, content);
  // log progress
  Logger.log(`Wrote status JSON to ${filePath} (${content.length} bytes).`);
}

async function writeFileCompress(filePath: string, jsonObject: any) {
  ensureFileDirectoryExists(filePath);
  let content = await gzip(JSON.stringify(jsonObject, null, 2));
  writeFileSync(filePath, content);
  // log progress
  Logger.log(`Wrote status JSON compressed to ${filePath} (${content.length} bytes).`);
}

export function ensureFileDirectoryExists(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true });
}
