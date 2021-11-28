export type services =
  | 'management-service-bootstrap'
  | 'management-service'
  | 'signer'
  | 'ethereum-writer'
  | 'logs-service'
  | 'node'
  | 'node-canary';

export type DeploymentDescriptor = {
  Desc?: string;
  SchemaVersion: number | string;
  ImageVersions: {
    [serviceName in services]?: {
      image: string;
      comment?: string;
    };
  };
};
