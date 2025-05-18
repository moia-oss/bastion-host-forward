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
    readonly port: string;
  }>
}
