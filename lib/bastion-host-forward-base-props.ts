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

  /**
   * Whether the AMI ID is cached to be stable between deployments
   *
   * By default, the newest image is used on each deployment. This will cause
   * instances to be replaced whenever a new version is released, and may cause
   * downtime if there aren't enough running instances in the AutoScalingGroup
   * to reschedule the tasks on.
   *
   * If set to true, the AMI ID will be cached in `cdk.context.json` and the
   * same value will be used on future runs. Your instances will not be replaced
   * but your AMI version will grow old over time. To refresh the AMI lookup,
   * you will have to evict the value from the cache using the `cdk context`
   * command. See https://docs.aws.amazon.com/cdk/latest/guide/context.html for
   * more information.
   *
   * Can not be set to `true` in environment-agnostic stacks.
   *
   * @default false
   */
  readonly cachedInContext?: boolean;
}
