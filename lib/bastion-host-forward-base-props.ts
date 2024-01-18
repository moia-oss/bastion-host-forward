/*
   Copyright 2024 MOIA GmbH
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at
       http://www.apache.org/licenses/LICENSE-2.0
   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

import type { ISecurityGroup, IVpc } from 'aws-cdk-lib/aws-ec2';

export interface BastionHostForwardBaseProps {
  /**
   * The Vpc in which to instantiate the Bastion Host
   */
  readonly vpc: IVpc;

  /**
   * The name of the bastionHost instance
   *
   * @default "BastionHost"
   */
  readonly name?: string;

  /**
   * The security group, which is attached to the bastion host.
   *
   * @default If none is provided a default security group is attached, which
   * doesn't allow incoming traffic and allows outbound traffic to everywhere
   */
  readonly securityGroup?: ISecurityGroup;

  /**
   * The HAProxy client timeout in minutes
   *
   * @default 1
   */
  readonly clientTimeout?: number;

  /**
   * The HAProxy server timeout in minutes
   *
   * @default 1
   */
  readonly serverTimeout?: number;

  /**
   * Whether patching should be enabled for the bastion-host-forward instance
   *
   * @default true
   */
  readonly shouldPatch?: boolean;
}
