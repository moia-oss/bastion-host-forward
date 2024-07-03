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
import { strict as assert } from 'assert';
import { App, Stack } from 'aws-cdk-lib';
import { InstanceClass, InstanceSize, InstanceType, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { DatabaseClusterEngine, ServerlessCluster } from 'aws-cdk-lib/aws-rds';
import { BastionHostAuroraServerlessForward } from '../lib/aurora-serverless';

test('Bastion Host created for normal username/password access', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const testVpc = new Vpc(stack, 'TestVpc');
  const testAurora = new ServerlessCluster(stack, 'TestAurora', {
    engine: DatabaseClusterEngine.AURORA,
    vpc: testVpc,
  });

  // WHEN
  new BastionHostAuroraServerlessForward(stack, 'MyTestConstruct', {
    vpc: testVpc,
    name: 'MyBastion',
    serverlessCluster: testAurora,
    clientTimeout: 2,
    serverTimeout: 7,
  });

  const template = Template.fromStack(stack);

  // THEN
  template.hasResourceProperties('AWS::EC2::Instance', {
    UserData: {
      'Fn::Base64': {
        'Fn::Join': [
          '',
          [
            'Content-Type: multipart/mixed; boundary="//"\nMIME-Version: 1.0\n--//\nContent-Type: text/cloud-config; charset="us-ascii"\nMIME-Version: 1.0\nContent-Transfer-Encoding: 7bit\nContent-Disposition: attachment; filename="cloud-config.txt"\n#cloud-config\ncloud_final_modules:\n- [scripts-user, always]\n--//\nContent-Type: text/x-shellscript; charset="us-ascii"\nMIME-Version: 1.0\nContent-Transfer-Encoding: 7bit\nContent-Disposition: attachment; filename="userdata.txt"\n#!/bin/bash\nmount -o remount,rw,nosuid,nodev,noexec,relatime,hidepid=2 /proc\nyum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_arm64/amazon-ssm-agent.rpm\nyum install -y haproxy\necho "listen database\n  bind 0.0.0.0:',
            {
              'Fn::GetAtt': ['TestAurora252434E9', 'Endpoint.Port'],
            },
            '\n  timeout connect 10s\n  timeout client 2m\n  timeout server 7m\n  mode tcp\n  server service ',
            {
              'Fn::GetAtt': ['TestAurora252434E9', 'Endpoint.Address'],
            },
            ':',
            {
              'Fn::GetAtt': ['TestAurora252434E9', 'Endpoint.Port'],
            },
            '\n" > /etc/haproxy/haproxy.cfg\nservice haproxy restart\n--//',
          ],
        ],
      },
    },
    Tags: [
      {
        Key: 'Name',
        Value: 'MyBastion',
      },
    ],
  });
});

test('Bastion Host created with extended Role for IAM Connection', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const testVpc = new Vpc(stack, 'TestVpc');
  const testAurora = new ServerlessCluster(stack, 'TestAurora', {
    engine: DatabaseClusterEngine.AURORA,
    vpc: testVpc,
  });

  // WHEN
  new BastionHostAuroraServerlessForward(stack, 'MyTestConstruct', {
    vpc: testVpc,
    name: 'MyBastionWithIAMAccess',
    serverlessCluster: testAurora,
    iamUser: 'iamuser',
    resourceIdentifier: 'db-ABCDEFGH',
  });

  const template = Template.fromStack(stack);
  // THEN
  template.hasResourceProperties('AWS::EC2::Instance', {
    UserData: {
      'Fn::Base64': {
        'Fn::Join': [
          '',
          [
            'Content-Type: multipart/mixed; boundary="//"\nMIME-Version: 1.0\n--//\nContent-Type: text/cloud-config; charset="us-ascii"\nMIME-Version: 1.0\nContent-Transfer-Encoding: 7bit\nContent-Disposition: attachment; filename="cloud-config.txt"\n#cloud-config\ncloud_final_modules:\n- [scripts-user, always]\n--//\nContent-Type: text/x-shellscript; charset="us-ascii"\nMIME-Version: 1.0\nContent-Transfer-Encoding: 7bit\nContent-Disposition: attachment; filename="userdata.txt"\n#!/bin/bash\nmount -o remount,rw,nosuid,nodev,noexec,relatime,hidepid=2 /proc\nyum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_arm64/amazon-ssm-agent.rpm\nyum install -y haproxy\necho "listen database\n  bind 0.0.0.0:',
            {
              'Fn::GetAtt': ['TestAurora252434E9', 'Endpoint.Port'],
            },
            '\n  timeout connect 10s\n  timeout client 1m\n  timeout server 1m\n  mode tcp\n  server service ',
            {
              'Fn::GetAtt': ['TestAurora252434E9', 'Endpoint.Address'],
            },
            ':',
            {
              'Fn::GetAtt': ['TestAurora252434E9', 'Endpoint.Port'],
            },
            '\n" > /etc/haproxy/haproxy.cfg\nservice haproxy restart\n--//',
          ],
        ],
      },
    },
    Tags: [
      {
        Key: 'Name',
        Value: 'MyBastionWithIAMAccess',
      },
    ],
  });
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: ['ssmmessages:*', 'ssm:UpdateInstanceInformation', 'ec2messages:*'],
          Effect: 'Allow',
          Resource: '*',
        },
        {
          Action: ['rds-db:connect', 'rds:*'],
          Effect: 'Allow',
          Resource: [
            {
              'Fn::Join': [
                '',
                [
                  'arn:aws:rds-db:',
                  {
                    Ref: 'AWS::Region',
                  },
                  ':',
                  {
                    Ref: 'AWS::AccountId',
                  },
                  ':dbuser:db-ABCDEFGH/iamuser',
                ],
              ],
            },
            {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  {
                    Ref: 'AWS::Partition',
                  },
                  ':rds:',
                  {
                    Ref: 'AWS::Region',
                  },
                  ':',
                  {
                    Ref: 'AWS::AccountId',
                  },
                  ':cluster:',
                  {
                    Ref: 'TestAurora252434E9',
                  },
                ],
              ],
            },
          ],
        },
      ],
    },
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

  const testAurora = new ServerlessCluster(stack, 'TestAurora', {
    engine: DatabaseClusterEngine.AURORA,
    vpc: testVpc,
  });

  // WHEN
  const bastionHost = new BastionHostAuroraServerlessForward(stack, 'MyTestConstruct', {
    vpc: testVpc,
    name: 'MyBastion',
    serverlessCluster: testAurora,
    securityGroup,
  });
  const bastionHostSecurityGroup = bastionHost.securityGroup as SecurityGroup;

  assert.equal(securityGroup.securityGroupId, bastionHostSecurityGroup.securityGroupId);
  assert.equal(securityGroup.allowAllOutbound, bastionHostSecurityGroup.allowAllOutbound);
});

test('Bastion Host with different instanceType', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const testVpc = new Vpc(stack, 'TestVpc');
  const testAurora = new ServerlessCluster(stack, 'TestAurora', {
    engine: DatabaseClusterEngine.AURORA,
    vpc: testVpc,
  });

  // WHEN
  new BastionHostAuroraServerlessForward(stack, 'MyTestConstruct', {
    vpc: testVpc,
    name: 'MyBastion',
    serverlessCluster: testAurora,
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
  });

  const template = Template.fromStack(stack);

  // THEN
  template.hasResourceProperties('AWS::EC2::Instance', {
    InstanceType: 't3.medium',
  });
});
