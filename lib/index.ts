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
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as rds from '@aws-cdk/aws-rds';

export interface BastionHostRDSForwardProps {
  /**
   * The Vpc in which to instantiate the Bastion Host
   */
  readonly vpc: ec2.Vpc;

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

  /**
   * The databases to which a connection can be build up
   */
  readonly databases: string[]

  /**
   * The name of the bastionHost instance
   *
   * @default "BastionHost"
   */
  readonly name?: string;

  /*
   * The iam user with which to connect to the RDS.
   * Can be omitted, when not using IAM Authentication
   */
  readonly iamUser?: string;
}

export class BastionHostRDSForward extends cdk.Construct {
  /**
   * @returns the id of the bastion host, which can be used by the session
   * manager connect command afterwards
   */
  public readonly instanceId: string;

  constructor(scope: cdk.Construct, id: string, props: BastionHostRDSForwardProps) {
    super(scope, id);

    const bastionHost = new ec2.BastionHostLinux(this, 'BastionHost', {
      instanceName: props.name || 'BastionHost',
      vpc: props.vpc,
    });

    const databasesHaProxy = props.databases.reduce(
      (reduced, current) => {
        return `${reduced}  server ${current} ${props.rdsInstance.dbInstanceEndpointAddress}:${props.rdsInstance.dbInstanceEndpointPort}\n`;
      },
      ''
    );

    const haProxyRule = `listen database
  bind 0.0.0.0:${props.rdsInstance.dbInstanceEndpointPort}
  timeout connect 10s
  timeout client 1m
  timeout server 1m
  mode tcp
` + databasesHaProxy;

    bastionHost.instance.userData.addCommands(
      'yum install -y haproxy',
      `echo "${haProxyRule}" > /etc/haproxy/haproxy.cfg`,
      'service haproxy restart'
    );

    if (props.iamUser !== undefined && props.rdsResourceIdentifier !== undefined) {
      bastionHost.instance.addToRolePolicy(
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

    this.instanceId = bastionHost.instance.instanceId;
  }

  /**
   * @returns the resource ARN for the the rds-db:connect action
   */
  private genDbUserArnFromRdsArn(dbIdentifier: string, dbUser: string): string {
    return 'arn:aws:rds-db:${Token[AWS::Region.4]}:${Token[AWS::AccountId.0]}:dbuser:' + dbIdentifier + '/' + dbUser;
  }
}
