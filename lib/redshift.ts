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
import { BastionHostForwardBaseProps } from './bastion-host-forward-base-props';
import { BastionHostForward } from './bastion-host-forward';
import { ICluster } from '@aws-cdk/aws-redshift';

export interface BastionHostRedshiftForwardProps extends BastionHostForwardBaseProps {
  /*
   * The Redshift Cluster where the bastion host should be able to connect to
   */
  readonly redshiftCluster: ICluster;
}

/*
 * Creates a Bastion Host to forward to a Redshift Cluster
 */
export class BastionHostRedshiftForward extends BastionHostForward {
  constructor(scope: cdk.Construct, id: string, props: BastionHostRedshiftForwardProps) {
    super(scope, id, {
      vpc: props.vpc,
      name: props.name,
      securityGroup: props.securityGroup,
      address: props.redshiftCluster.clusterEndpoint.hostname,
      port: String(props.redshiftCluster.clusterEndpoint.port),
      clientTimeout: props.clientTimeout,
    });
  }
}
