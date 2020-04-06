/*
   Copyright 2020 MOIA GmbH
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

import * as cdk from '@aws-cdk/core';
import * as elasticache from '@aws-cdk/aws-elasticache';
import { BastionHostForwardBaseProps } from './bastion-host-forward-base-props';
import { BastionHostForward } from './bastion-host-forward';

export interface BastionHostRedisForwardProps extends BastionHostForwardBaseProps {
  /*
   * The RDS instance where the bastion host should be able to connect to
   */
  readonly elasticacheCluster: elasticache.CfnCacheCluster;
}

/*
 * Creates a Bastion Host to forward to a Redis Cluster
 */
export class BastionHostRedisForward extends BastionHostForward {
  constructor(scope: cdk.Construct, id: string, props: BastionHostRedisForwardProps) {
    super(scope, id, {
      vpc: props.vpc,
      name: props.name,
      securityGroup: props.securityGroup,
      address: props.elasticacheCluster.attrRedisEndpointAddress,
      port: props.elasticacheCluster.attrRedisEndpointPort
    });
  }
}
