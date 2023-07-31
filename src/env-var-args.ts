import { ServiceConfiguration } from './config';

/**
 * Parse required and optional node configuration from environment variables
 *
 * Environment variables override default configuration values
 *
 * Validation handled later in `validateServiceConfiguration`
 * @param config - The node configuration to update
 * */
export function setConfigEnvVars(config: ServiceConfiguration): void {
  config.BootstrapMode = process.env.BOOTSTRAP_MODE ? process.env.BOOTSTRAP_MODE === 'true' : config.BootstrapMode;
  config.Port = process.env.PORT ? Number(process.env.PORT) : config.Port;
  config.EthereumGenesisContract = process.env.ETHEREUM_GENESIS_CONTRACT ?? config.EthereumGenesisContract;
  config.EthereumEndpoint = process.env.ETHEREUM_ENDPOINT ?? config.EthereumEndpoint;
  config.DeploymentDescriptorUrl = process.env.DEPLOYMENT_DESCRIPTOR_URL ?? config.DeploymentDescriptorUrl;
  config.ElectionsAuditOnly = process.env.ELECTIONS_AUDIT_ONLY
    ? process.env.ELECTIONS_AUDIT_ONLY === 'true'
    : config.ElectionsAuditOnly;
  config.StatusJsonPath = process.env.STATUS_JSON_PATH ?? config.StatusJsonPath;
  config.StatusAnalyticsJsonPath = process.env.STATUS_ANALYTICS_JSON_PATH ?? config.StatusAnalyticsJsonPath;
  config.StatusAnalyticsJsonGzipPath =
    process.env.STATUS_ANALYTICS_JSON_GZIP_PATH ?? config.StatusAnalyticsJsonGzipPath;
  config.StatusWriteIntervalSeconds = process.env.STATUS_WRITE_INTERVAL_SECONDS
    ? Number(process.env.STATUS_WRITE_INTERVAL_SECONDS)
    : config.StatusWriteIntervalSeconds;
  config.DeploymentDescriptorPollIntervalSeconds = process.env.DEPLOYMENT_DESCRIPTOR_POLL_INTERVAL_SECONDS
    ? Number(process.env.DEPLOYMENT_DESCRIPTOR_POLL_INTERVAL_SECONDS)
    : config.DeploymentDescriptorPollIntervalSeconds;
  config.RegularRolloutWindowSeconds = process.env.REGULAR_ROLLOUT_WINDOW_SECONDS
    ? Number(process.env.REGULAR_ROLLOUT_WINDOW_SECONDS)
    : config.RegularRolloutWindowSeconds;
  config.HotfixRolloutWindowSeconds = process.env.HOTFIX_ROLLOUT_WINDOW_SECONDS
    ? Number(process.env.HOTFIX_ROLLOUT_WINDOW_SECONDS)
    : config.HotfixRolloutWindowSeconds;
  config.EthereumPollIntervalSeconds = process.env.ETHEREUM_POLL_INTERVAL_SECONDS
    ? Number(process.env.ETHEREUM_POLL_INTERVAL_SECONDS)
    : config.EthereumPollIntervalSeconds;
  config.EthereumRequestsPerSecondLimit = process.env.ETHEREUM_REQUESTS_PER_SECOND_LIMIT
    ? Number(process.env.ETHEREUM_REQUESTS_PER_SECOND_LIMIT)
    : config.EthereumRequestsPerSecondLimit;
  config.ElectionsStaleUpdateSeconds = process.env.ELECTIONS_STALE_UPDATE_SECONDS
    ? Number(process.env.ELECTIONS_STALE_UPDATE_SECONDS)
    : config.ElectionsStaleUpdateSeconds;
  config.FinalityBufferBlocks = process.env.FINALITY_BUFFER_BLOCKS
    ? Number(process.env.FINALITY_BUFFER_BLOCKS)
    : config.FinalityBufferBlocks;
  config.EthereumFirstBlock = process.env.ETHEREUM_FIRST_BLOCK
    ? Number(process.env.ETHEREUM_FIRST_BLOCK)
    : config.EthereumFirstBlock;
  config.Verbose = process.env.VERBOSE ? process.env.VERBOSE === 'true' : config.Verbose;
  config['node-address'] = process.env.NODE_ADDRESS ?? config['node-address'];
  config.ExternalLaunchConfig = process.env.EXTERNAL_LAUNCH_CONFIG
    ? JSON.parse(process.env.EXTERNAL_LAUNCH_CONFIG)
    : config.ExternalLaunchConfig;
}
