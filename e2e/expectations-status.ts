import {
  isValidTimeRef,
  isValidEthereumAddress,
  isValidImageVersion,
  isValidBlock,
  isValidTimestamp,
  isNonEmptyString,
  isPositiveNumber,
  isValidFullImageName,
} from './deep-matcher';

export const expectationStatus = {
  Status: isNonEmptyString,
  Timestamp: isValidTimestamp,
  Error: undefined,
  Payload: {
    Uptime: isPositiveNumber,
    MemoryUsage: {
      heapUsed: isPositiveNumber,
      rss: isPositiveNumber,
    },
    Version: {
      Semantic: isValidImageVersion,
    },
    CurrentRefTime: isValidTimeRef,
    CurrentRefBlock: isValidBlock,
    TotalEventsProcessed: isPositiveNumber,
    CurrentCommittee: [
      {
        EthAddress: '44ea9fbfebb3162a5778b30fb2ba2a66cc5291a8',
        Weight: 40000,
        Name: 'Guardian4',
        EnterTime: isValidTimeRef,
      },
      {
        EthAddress: '94fda04016784d0348ec2ece7a9b24e3313885f0',
        Weight: 30000,
        Name: 'Guardian2',
        EnterTime: isValidTimeRef,
      },
    ],
    CurrentCandidates: [
      {
        EthAddress: '7d5b6545e3427374adeb96f4198c05812f7625b1',
        IsStandby: true,
        Name: 'Guardian5',
      },
      {
        EthAddress: '02ebe4663d6110aec8f816f9772a4087cc1a5ec7',
        IsStandby: true,
        Name: 'Guardian3',
      },
      {
        EthAddress: '98b4d71c78789637364a70f696227ec89e35626c',
        IsStandby: true,
        Name: 'Guardian1',
      },
    ],
    CurrentTopology: [
      {
        EthAddress: '02ebe4663d6110aec8f816f9772a4087cc1a5ec7',
        OrbsAddress: 'ecfcccbc1e54852337298c7e90f5ecee79439e67',
        Ip: '2.235.228.102',
        Port: 0,
        Name: 'Guardian3',
      },
      {
        EthAddress: '44ea9fbfebb3162a5778b30fb2ba2a66cc5291a8',
        OrbsAddress: '33a8534adfddd5a774fb4b245f25b9a54c931346',
        Ip: '68.234.159.191',
        Port: 0,
        Name: 'Guardian4',
      },
      {
        EthAddress: '7d5b6545e3427374adeb96f4198c05812f7625b1',
        OrbsAddress: '605b47645c2ff7ffb9756a051048d006d2b1ef4a',
        Ip: '125.91.101.69',
        Port: 0,
        Name: 'Guardian5',
      },
      {
        EthAddress: '94fda04016784d0348ec2ece7a9b24e3313885f0',
        OrbsAddress: '945dc264e11c09f8a518da6ce1bea493e0055b16',
        Ip: '148.253.160.64',
        Port: 0,
        Name: 'Guardian2',
      },
      {
        EthAddress: '98b4d71c78789637364a70f696227ec89e35626c',
        OrbsAddress: 'b1985d8a332bfc903fd437489ea933792fbfa500',
        Ip: '152.180.215.28',
        Port: 0,
        Name: 'Guardian1',
      },
    ],
    CurrentImageVersions: {
      main: {
        'management-service': isValidFullImageName,
        node: isValidFullImageName,
      },
    },
    CurrentImageVersionsUpdater: {
      main: {
        'management-service': {
          LastPollTime: isValidTimeRef,
          PendingVersion: '',
          PendingVersionTime: 0,
        },
        node: {
          LastPollTime: isValidTimeRef,
          PendingVersion: '',
          PendingVersionTime: 0,
        },
      },
    },
    CurrentVirtualChains: {
      '1000000': {
        Expiration: isValidTimeRef,
        GenesisRefTime: isValidTimeRef,
        IdentityType: 0,
        RolloutGroup: 'main',
        Tier: 'defaultTier',
      },
      '1000001': {
        Expiration: isValidTimeRef,
        GenesisRefTime: isValidTimeRef,
        IdentityType: 0,
        RolloutGroup: 'canary',
        Tier: 'defaultTier',
      },
      '1000002': {
        Expiration: isValidTimeRef,
        GenesisRefTime: isValidTimeRef,
        IdentityType: 0,
        RolloutGroup: 'main',
        Tier: 'defaultTier',
      },
    },
    ProtocolVersionEvents: {
      main: [
        {
          RefTime: isValidTimeRef,
          Data: {
            Version: 1,
          },
        },
        {
          RefTime: isValidTimeRef,
          Data: {
            Version: 19,
          },
        },
      ],
      canary: [
        {
          RefTime: isValidTimeRef,
          Data: {
            Version: 1,
          },
        },
        {
          RefTime: isValidTimeRef,
          Data: {
            Version: 20,
          },
        },
      ],
    },
    Guardians: {
      '02ebe4663d6110aec8f816f9772a4087cc1a5ec7': {
        EthAddress: '02ebe4663d6110aec8f816f9772a4087cc1a5ec7',
        OrbsAddress: 'ecfcccbc1e54852337298c7e90f5ecee79439e67',
        Ip: '2.235.228.102',
        EffectiveStake: 30000,
        SelfStake: 30000,
        DelegatedStake: 30000,
        IdentityType: 0,
        ElectionsStatus: {
          LastUpdateTime: isValidTimeRef,
          ReadyToSync: true,
          ReadyForCommittee: false,
          TimeToStale: 0,
        },
        Name: 'Guardian3',
        Website: 'Guardian3-website',
        RegistrationTime: isValidTimeRef,
      },
      '98b4d71c78789637364a70f696227ec89e35626c': {
        EthAddress: '98b4d71c78789637364a70f696227ec89e35626c',
        OrbsAddress: 'b1985d8a332bfc903fd437489ea933792fbfa500',
        Ip: '152.180.215.28',
        EffectiveStake: 10000,
        SelfStake: 10000,
        DelegatedStake: 10000,
        IdentityType: 0,
        ElectionsStatus: {
          LastUpdateTime: isValidTimeRef,
          ReadyToSync: true,
          ReadyForCommittee: true,
          TimeToStale: 0,
        },
        Name: 'Guardian1',
        Website: 'Guardian1-website',
        RegistrationTime: isValidTimeRef,
      },
      '44ea9fbfebb3162a5778b30fb2ba2a66cc5291a8': {
        EthAddress: '44ea9fbfebb3162a5778b30fb2ba2a66cc5291a8',
        OrbsAddress: '33a8534adfddd5a774fb4b245f25b9a54c931346',
        Ip: '68.234.159.191',
        EffectiveStake: 40000,
        SelfStake: 40000,
        DelegatedStake: 40000,
        IdentityType: 0,
        ElectionsStatus: {
          LastUpdateTime: isValidTimeRef,
          ReadyToSync: true,
          ReadyForCommittee: true,
          TimeToStale: isPositiveNumber,
        },
        Name: 'Guardian4',
        Website: 'Guardian4-website',
        RegistrationTime: isValidTimeRef,
      },
      '7d5b6545e3427374adeb96f4198c05812f7625b1': {
        EthAddress: '7d5b6545e3427374adeb96f4198c05812f7625b1',
        OrbsAddress: '605b47645c2ff7ffb9756a051048d006d2b1ef4a',
        Ip: '125.91.101.69',
        EffectiveStake: 50000,
        SelfStake: 50000,
        DelegatedStake: 50000,
        IdentityType: 0,
        ElectionsStatus: {
          LastUpdateTime: isValidTimeRef,
          ReadyToSync: true,
          ReadyForCommittee: false,
          TimeToStale: 0,
        },
        Name: 'Guardian5',
        Website: 'Guardian5-website',
        RegistrationTime: isValidTimeRef,
      },
      '94fda04016784d0348ec2ece7a9b24e3313885f0': {
        EthAddress: '94fda04016784d0348ec2ece7a9b24e3313885f0',
        OrbsAddress: '945dc264e11c09f8a518da6ce1bea493e0055b16',
        Ip: '148.253.160.64',
        EffectiveStake: 20000,
        SelfStake: 20000,
        DelegatedStake: 20000,
        IdentityType: 0,
        ElectionsStatus: {
          LastUpdateTime: isValidTimeRef,
          ReadyToSync: true,
          ReadyForCommittee: true,
          TimeToStale: isPositiveNumber,
        },
        Name: 'Guardian2',
        Website: 'Guardian2-website',
        RegistrationTime: isValidTimeRef,
      },
    },
    CurrentContractAddress: {
      contractRegistry: isValidEthereumAddress,
      protocol: isValidEthereumAddress,
      committee: isValidEthereumAddress,
      elections: isValidEthereumAddress,
      delegations: isValidEthereumAddress,
      certification: isValidEthereumAddress,
      staking: isValidEthereumAddress,
      subscriptions: isValidEthereumAddress,
    },
    Config: {
      BootstrapMode: false,
      Port: 8080,
      EthereumGenesisContract: isValidEthereumAddress,
      EthereumEndpoint: `http://ganache:7545`,
      DockerNamespace: 'orbsnetwork',
      StatusWriteIntervalSeconds: 1,
      DeploymentDescriptorPollIntervalSeconds: 1,
      RegularRolloutWindowSeconds: 2,
      HotfixRolloutWindowSeconds: 2,
      EthereumPollIntervalSeconds: 1,
      EthereumRequestsPerSecondLimit: 20,
      ElectionsStaleUpdateSeconds: 7 * 24 * 60 * 60,
      FinalityBufferBlocks: 10,
      EthereumFirstBlock: 0,
      Verbose: true,
      'node-address': 'ecfcCcbc1E54852337298c7E90f5eceE79439e67',
      ExternalLaunchConfig: {
        BootstrapMode: false,
        Port: 8080,
        EthereumGenesisContract: isValidEthereumAddress,
        EthereumEndpoint: `http://ganache:7545`,
        DockerNamespace: 'orbsnetwork',
        StatusWriteIntervalSeconds: 1,
        DeploymentDescriptorPollIntervalSeconds: 1,
        RegularRolloutWindowSeconds: 2,
        HotfixRolloutWindowSeconds: 2,
        EthereumPollIntervalSeconds: 1,
        EthereumRequestsPerSecondLimit: 20,
        ElectionsStaleUpdateSeconds: 7 * 24 * 60 * 60,
        FinalityBufferBlocks: 10,
        EthereumFirstBlock: 0,
        Verbose: true,
        'node-address': 'ecfcCcbc1E54852337298c7E90f5eceE79439e67', // Guardian3 (mixed case!)
      },
    },
  },
};
