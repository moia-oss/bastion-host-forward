import { BastionHostForwardBaseProps } from './bastion-host-forward-base-props';

export interface BastionHostForwardProps extends BastionHostForwardBaseProps {
  /**
   * The address of the service to forward to
   */
  readonly address: string;

  /**
   * The port of the service to forward to
   */
  readonly port: string;
}

