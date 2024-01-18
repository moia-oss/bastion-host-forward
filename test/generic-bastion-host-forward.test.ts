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

import { Template } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { strict as assert } from 'assert';
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { GenericBastionHostForward } from '../lib/generic-bastion-host-forward';

test('Bastion Host created for normal access', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const testVpc = new Vpc(stack, 'TestVpc');
  // WHEN
  new GenericBastionHostForward(stack, 'MyTestConstruct', {
    vpc: testVpc,
    name: 'MyRedisBastion',
    address: '127.0.0.1',
    port: '6379',
    clientTimeout: 20,
    serverTimeout: 50,
  });

  const template = Template.fromStack(stack);

  // THEN
  template.hasResourceProperties('AWS::EC2::Instance', {
    UserData: {
      'Fn::Base64':
        'Content-Type: multipart/mixed; boundary="//"\nMIME-Version: 1.0\n--//\nContent-Type: text/cloud-config; charset="us-ascii"\nMIME-Version: 1.0\nContent-Transfer-Encoding: 7bit\nContent-Disposition: attachment; filename="cloud-config.txt"\n#cloud-config\ncloud_final_modules:\n- [scripts-user, always]\n--//\nContent-Type: text/x-shellscript; charset="us-ascii"\nMIME-Version: 1.0\nContent-Transfer-Encoding: 7bit\nContent-Disposition: attachment; filename="userdata.txt"\n#!/bin/bash\nmount -o remount,rw,nosuid,nodev,noexec,relatime,hidepid=2 /proc\nyum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_arm64/amazon-ssm-agent.rpm\nyum install -y haproxy\necho "listen database\n  bind 0.0.0.0:6379\n  timeout connect 10s\n  timeout client 20m\n  timeout server 50m\n  mode tcp\n  server service 127.0.0.1:6379\n" > /etc/haproxy/haproxy.cfg\nservice haproxy restart\n--//',
    },
    Tags: [
      {
        Key: 'Name',
        Value: 'MyRedisBastion',
      },
    ],
  });

  template.hasResource('AWS::SSM::MaintenanceWindow', {});
  template.hasResourceProperties('AWS::SSM::MaintenanceWindowTarget', {
    Targets: [
      {
        Key: 'InstanceIds',
        Values: [
          {
            Ref: 'MyTestConstructBastionHost55102049',
          },
        ],
      },
    ],
    WindowId: {
      Ref: 'MyTestConstructBastionHostPatchManagerMaintenanceWindow4F21EBB0',
    },
  });

  template.hasResourceProperties('AWS::SSM::MaintenanceWindowTask', {
    Targets: [
      {
        Key: 'WindowTargetIds',
        Values: [
          {
            Ref: 'MyTestConstructBastionHostPatchManagerMaintenanceWindowTarget1C708788',
          },
        ],
      },
    ],
    TaskArn: 'AWS-RunPatchBaseline',
  });
});

test('Bastion Host with own securityGroup', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const testVpc = new Vpc(stack, 'TestVpc');
  const securityGroup = new SecurityGroup(stack, 'SecurityGroup', {
    vpc: testVpc,
    allowAllOutbound: false,
    description: 'My test securityGroup description',
    securityGroupName: 'MyTestSecurityGroupName',
  });

  // WHEN
  const bastionHost = new GenericBastionHostForward(stack, 'MyTestConstruct', {
    vpc: testVpc,
    name: 'MyRedShiftBastion',
    securityGroup,
    address: '127.0.0.1',
    port: '6379',
  });
  const bastionHostSecurityGroup = bastionHost.securityGroup as SecurityGroup;

  assert.equal(securityGroup.securityGroupId, bastionHostSecurityGroup.securityGroupId);
  assert.equal(securityGroup.allowAllOutbound, bastionHostSecurityGroup.allowAllOutbound);
});

test('Bastion Host has encrypted EBS', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const testVpc = new Vpc(stack, 'TestVpc');

  // WHEN
  new GenericBastionHostForward(stack, 'MyTestConstruct', {
    vpc: testVpc,
    address: '127.0.0.1',
    port: '6379',
  });

  const template = Template.fromStack(stack);

  // THEN
  template.hasResourceProperties('AWS::EC2::Instance', {
    BlockDeviceMappings: [
      {
        DeviceName: '/dev/xvda',
        Ebs: {
          Encrypted: true,
        },
      },
    ],
  });
});

test('Bastion Host created without patch manager', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const testVpc = new Vpc(stack, 'TestVpc');
  // WHEN
  new GenericBastionHostForward(stack, 'MyTestConstruct', {
    vpc: testVpc,
    address: '127.0.0.1',
    port: '6379',
    shouldPatch: false,
  });

  const template = Template.fromStack(stack);

  // THEN
  template.resourceCountIs('AWS::SSM::MaintenanceWindow', 0);
  template.resourceCountIs('AWS::SSM::MaintenanceWindowTarget', 0);
  template.resourceCountIs('AWS::SSM::MaintenanceWindowTask', 0);
});
