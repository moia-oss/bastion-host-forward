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

import { Fn } from 'aws-cdk-lib';
import {
  AmazonLinuxCpuType,
  AmazonLinuxGeneration,
  AmazonLinuxImage,
  BastionHostLinux,
  BlockDeviceVolume,
  InstanceClass,
  InstanceSize,
  InstanceType,
  SecurityGroup,
  UserData,
} from 'aws-cdk-lib/aws-ec2';
import type { CfnInstance, ISecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

import type { BastionHostForwardProps } from './bastion-host-forward-props';
import type { MultidestinationBastionHostForwardProps } from './multidestination-bastion-host-forward-props';
import { BastionHostPatchManager } from './bastion-host-patch-manager';

interface HaProxyConfig {
  address: string;
  remotePort: string;
  localPort: string;
  clientTimeout: number;
  serverTimeout: number;
}

/*
 * Creates a Config entry for HAProxy with the given address and port
 */
const generateHaProxyBaseConfig = (configs: HaProxyConfig[]): string => 
  configs.map(config => 
  `listen database
  bind 0.0.0.0:${config.localPort}
  timeout connect 10s
  timeout client ${config.clientTimeout}m
  timeout server ${config.serverTimeout}m
  mode tcp
  server service ${config.address}:${config.remotePort}\n`)
  .join('\n');

/*
 * Generates EC2 User Data for Bastion Host Forwarder. This installs HAProxy
 * on the Instance as well, as writing a config file for it.
 * The User Data is written in MIME format to override the User Data
 * application behavior to be applied on every machine restart
 */
const generateEc2UserData = (configs: HaProxyConfig[]): UserData =>
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
yum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_arm64/amazon-ssm-agent.rpm
yum install -y haproxy
echo "${generateHaProxyBaseConfig(configs)}" > /etc/haproxy/haproxy.cfg
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
   * @returns the private ip address of the bastion host
   */
  public instancePrivateIp?: string;

  /**
   * @returns The BastionHost Instance
   */
  protected readonly bastionHost: BastionHostLinux;

  protected constructor(
    scope: Construct,
    id: string,
    props: BastionHostForwardProps | MultidestinationBastionHostForwardProps,
  ) {
    super(scope, id);
    if (!('destinations' in props)) {
      const { address, port, ...rest } = props;
      props = {
        ...rest,
        destinations: [{
          address,
          remotePort: port,
          localPort: port,
        }]
      };
    }

    this.securityGroup =
      props.securityGroup ??
      new SecurityGroup(this, 'BastionHostSecurityGroup', {
        vpc: props.vpc,
        allowAllOutbound: true,
      });

    const instanceName = props.name ?? 'BastionHost';
    this.bastionHost = new BastionHostLinux(this, 'BastionHost', {
      requireImdsv2: true,
      instanceName,
      machineImage: new AmazonLinuxImage({
        cpuType: AmazonLinuxCpuType.ARM_64,
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2023,
        cachedInContext: props.cachedInContext,
      }),
      instanceType:
        props.instanceType ??
        InstanceType.of(InstanceClass.T4G, InstanceSize.NANO),
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: BlockDeviceVolume.ebs(10, {
            encrypted: true,
          }),
        },
      ],
      vpc: props.vpc,
      securityGroup: this.securityGroup,
    });

    const cfnBastionHost = this.bastionHost.instance.node
      .defaultChild as CfnInstance;
    const shellCommands = generateEc2UserData(props.destinations.map(destination => ({
      address: destination.address,
      remotePort: destination.remotePort,
      localPort: destination.localPort ?? destination.remotePort,
      clientTimeout: destination.clientTimeout ?? props.clientTimeout ?? 1,
      serverTimeout: destination.serverTimeout ?? props.serverTimeout ?? 1,
    })));
    cfnBastionHost.userData = Fn.base64(shellCommands.render());

    if (props.shouldPatch === undefined || props.shouldPatch) {
      this.bastionHost.instance.role.addManagedPolicy(
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      );
      new BastionHostPatchManager(this, 'BastionHostPatchManager', {
        instanceName,
        instanceId: this.bastionHost.instance.instanceId,
      });
    }

    this.instanceId = this.bastionHost.instance.instanceId;
    this.instancePrivateIp = this.bastionHost.instance.instancePrivateIp;
  }
}
