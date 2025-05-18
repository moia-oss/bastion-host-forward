import type { BastionHostForwardBaseProps } from './bastion-host-forward-base-props';

export interface MultidestinationBastionHostForwardProps extends BastionHostForwardBaseProps {
  destinations: Array<{
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
     * Each destination must have a different local port.
     * @default - The remote port will be used as the local port
     */
    readonly localPort?: string;
  }>
}
