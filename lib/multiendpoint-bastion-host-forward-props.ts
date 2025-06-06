import type { BastionHostForwardBaseProps } from './bastion-host-forward-base-props';

export interface EndpointProps {
  /**
   * The address of the service to forward to
   */
  readonly address: string;

  /**
   * The port of the service to forward to
   */
  readonly remotePort: string;

  /**
   * The port on the bastion host which will be forwarded to the remote port.
   * Each endpoint must have a different local port.
   * @default - The remote port will be used as the local port
   */
  readonly localPort?: string;

  /**
   * The HAProxy client timeout in minutes for this endpoint
   *
   * @default - The global client timeout will be used
   */
  readonly clientTimeout?: number;

  /**
   * The HAProxy server timeout in minutes for this endpoint
   *
   * @default - The global server timeout will be used
   */
  readonly serverTimeout?: number;
}

export interface MultiendpointBastionHostForwardProps
  extends BastionHostForwardBaseProps {
  readonly endpoints: EndpointProps[];
}
