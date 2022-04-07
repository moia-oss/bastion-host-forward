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

import { Fn } from 'aws-cdk-lib';
import { BastionHostLinux, SecurityGroup, UserData } from 'aws-cdk-lib/aws-ec2';
import type { CfnInstance, ISecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

import type { BastionHostForwardProps } from './bastion-host-forward-props';

interface HaProxyConfig {
  address: string;
  port: string;
  clientTimeout: number;
  serverTimeout: number;
}

/*
 * Creates a Config entry for HAProxy with the given address and port
 */
const generateHaProxyBaseConfig = (config: HaProxyConfig): string =>
  `listen database
  bind 0.0.0.0:${config.port}
  timeout connect 10s
  timeout client ${config.clientTimeout}m
  timeout server ${config.serverTimeout}m
  mode tcp
  server service ${config.address}:${config.port}\n`;

/*
 * Generates EC2 User Data for Bastion Host Forwarder. This installs HAProxy
 * on the Instance as well, as writing a config file for it.
 * The User Data is written in MIME format to override the User Data
 * application behavior to be applied on every machine restart
 */
const generateEc2UserData = (config: HaProxyConfig): UserData =>
  UserData.custom(
    `Content-Type: multipart/mixed; boundary="//"
MIME-Version: 1.0
--//
Content-Type: text/cloud-config; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Content-Disposition: attachment; filename="cloud-config.txt"
#cloud-config
cloud_final_modules:
- [scripts-user, always]
--//
Content-Type: text/x-shellscript; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Content-Disposition: attachment; filename="userdata.txt"
#!/bin/bash
mount -o remount,rw,nosuid,nodev,noexec,relatime,hidepid=2 /proc
yum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm
yum install -y haproxy
echo "${generateHaProxyBaseConfig(config)}" > /etc/haproxy/haproxy.cfg
service haproxy restart
--//`,
  );

export class BastionHostForward extends Construct {
  /**
   * @returns the id of the bastion host, which can be used by the session
   * manager connect command afterwards
   */
  public instanceId?: string;

  /**
   * @returns the security group attached to the bastion host
   */
  public securityGroup?: ISecurityGroup;

  /**
   * @returns The BastionHost Instance
   */
  protected readonly bastionHost: BastionHostLinux;

  protected constructor(scope: Construct, id: string, props: BastionHostForwardProps) {
    super(scope, id);
    this.securityGroup =
      props.securityGroup ??
      new SecurityGroup(this, 'BastionHostSecurityGroup', {
        vpc: props.vpc,
        allowAllOutbound: true,
      });

    this.bastionHost = new BastionHostLinux(this, 'BastionHost', {
      instanceName: props.name ?? 'BastionHost',
      vpc: props.vpc,
      securityGroup: this.securityGroup,
    });

    const cfnBastionHost = this.bastionHost.instance.node.defaultChild as CfnInstance;
    const shellCommands = generateEc2UserData({
      address: props.address,
      port: props.port,
      clientTimeout: props.clientTimeout ?? 1,
      serverTimeout: props.serverTimeout ?? 1,
    });
    cfnBastionHost.userData = Fn.base64(shellCommands.render());

    this.instanceId = this.bastionHost.instance.instanceId;
  }
}
