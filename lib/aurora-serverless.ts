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

import { Stack, Token } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { IServerlessCluster } from 'aws-cdk-lib/aws-rds';
import type { Construct } from 'constructs';

import { BastionHostForward } from './bastion-host-forward';
import type { BastionHostForwardBaseProps } from './bastion-host-forward-base-props';

export interface BastionHostAuroraServerlessForwardProps extends BastionHostForwardBaseProps {
  /*
   * The Aurora Serverless Cluster where the bastion host should be able to connect to
   */
  readonly serverlessCluster: IServerlessCluster;
  /*
   * The resource identifier of this.serverlessCluster.
   * Can be omitted, when not using IAM Authentication.
   *
   * Is needed for the rds-db:connect permission. This property is currently
   * not exported by the ServerlessCluster.
   */
  readonly resourceIdentifier?: string;

  /*
   * The iam user with which to connect to the RDS.
   * Can be omitted, when not using IAM Authentication
   */
  readonly iamUser?: string;
}

/*
 * Creates a Bastion Host to forward to an Aurora Serverless Cluster
 */
export class BastionHostAuroraServerlessForward extends BastionHostForward {
  constructor(scope: Construct, id: string, props: BastionHostAuroraServerlessForwardProps) {
    super(scope, id, {
      vpc: props.vpc,
      name: props.name,
      securityGroup: props.securityGroup,
      address: props.serverlessCluster.clusterEndpoint.hostname,
      port: Token.asString(props.serverlessCluster.clusterEndpoint.port),
      clientTimeout: props.clientTimeout,
    });

    if (props.iamUser !== undefined && props.resourceIdentifier !== undefined) {
      this.bastionHost.instance.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['rds-db:connect', 'rds:*'],
          resources: [
            this.genDbUserArnFromRdsArn(props.resourceIdentifier, props.iamUser),
            props.serverlessCluster.clusterArn,
          ],
        }),
      );
    }
  }

  /**
   * @returns the resource ARN for the the rds-db:connect action
   */
  private genDbUserArnFromRdsArn(dbIdentifier: string, dbUser: string): string {
    return `arn:aws:rds-db:${Stack.of(this).region}:${Stack.of(this).account}:dbuser:${dbIdentifier}/${dbUser}`;
  }
}
