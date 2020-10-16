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
import * as iam from '@aws-cdk/aws-iam';
import * as rds from '@aws-cdk/aws-rds';
import { BastionHostForwardBaseProps } from './bastion-host-forward-base-props';
import { BastionHostForward } from './bastion-host-forward';

export interface BastionHostRDSForwardProps extends BastionHostForwardBaseProps {
  /*
   * The RDS instance where the bastion host should be able to connect to
   */
  readonly rdsInstance: rds.IDatabaseInstance;

  /*
   * The resource identifier of this.rdsInstance.
   * Can be omitted, when not using IAM Authentication.
   *
   * Is needed for the rds-db:connect permission. This property is currently
   * not exported by the rds.DatabaseInstance.
   */
  readonly rdsResourceIdentifier?: string;

  /*
   * The iam user with which to connect to the RDS.
   * Can be omitted, when not using IAM Authentication
   */
  readonly iamUser?: string;
}

/*
 * Creates a Bastion Host to forward to an RDS Instance
 */
export class BastionHostRDSForward extends BastionHostForward {
  constructor(scope: cdk.Construct, id: string, props: BastionHostRDSForwardProps) {
    super(scope, id, {
      vpc: props.vpc,
      name: props.name,
      securityGroup: props.securityGroup,
      address: props.rdsInstance.dbInstanceEndpointAddress,
      port: props.rdsInstance.dbInstanceEndpointPort,
    });

    if (props.iamUser !== undefined && props.rdsResourceIdentifier !== undefined) {
      this.bastionHost.instance.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['rds-db:connect', 'rds:*'],
          resources: [
            this.genDbUserArnFromRdsArn(props.rdsResourceIdentifier, props.iamUser),
            props.rdsInstance.instanceArn,
          ]
        })
      );
    }
  }

  /**
   * @returns the resource ARN for the the rds-db:connect action
   */
  private genDbUserArnFromRdsArn(dbIdentifier: string, dbUser: string): string {
    return `arn:aws:rds-db:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:dbuser:${dbIdentifier}/${dbUser}`;
  }
}
