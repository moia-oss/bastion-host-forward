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
import { BastionHostForwardProps } from './bastion-host-forward-props';

export class BastionHostForward extends cdk.Construct {
  /**
   * @returns the id of the bastion host, which can be used by the session
   * manager connect command afterwards
   */
  public instanceId?: string;

  /**
   * @returns the security group attached to the bastion host
   */
  public securityGroup?: ec2.ISecurityGroup;

  /**
   * @returns The BastionHost Instance
   */
  protected readonly bastionHost: ec2.BastionHostLinux;

  protected constructor(scope: cdk.Construct, id: string, props: BastionHostForwardProps) {
    super(scope, id);
    this.securityGroup = props.securityGroup || new ec2.SecurityGroup(this, 'BastionHostSecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    this.bastionHost = new ec2.BastionHostLinux(this, 'BastionHost', {
      instanceName: props.name || 'BastionHost',
      vpc: props.vpc,
      securityGroup: this.securityGroup,
    });

    const cfnBastionHost = this.bastionHost.instance.node.defaultChild as ec2.CfnInstance;
    const shellCommands = this.generateEc2UserData(
      props.address,
      props.port,
      props.clientTimeout || 1,
    );
    cfnBastionHost.userData = cdk.Fn.base64(shellCommands.render());

    this.instanceId = this.bastionHost.instance.instanceId;
  }

  /*
   * Creates a Config entry for HAProxy with the given address and port
   */
  private generateHaProxyBaseConfig(address: string, port: string, clientTimeout: number): string {
    return `listen database
  bind 0.0.0.0:${port}
  timeout connect 10s
  timeout client ${clientTimeout}m
  timeout server 1m
  mode tcp
  server service ${address}:${port}\n`;
  }

  /*
   * Generates EC2 User Data for Bastion Host Forwarder. This installs HAProxy
   * on the Instance as well, as writing a config file for it.
   * The User Data is written in MIME format to override the User Data
   * application behavior to be applied on every machine restart
   */
  private generateEc2UserData(address: string, port: string, clientTimeout: number): ec2.UserData {
    return ec2.UserData.custom(
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
echo "${this.generateHaProxyBaseConfig(address, port, clientTimeout)}" > /etc/haproxy/haproxy.cfg
service haproxy restart
--//`);
  }
}
