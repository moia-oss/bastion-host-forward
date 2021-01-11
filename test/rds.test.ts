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

import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import { strict as assert } from 'assert';
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as rds from '@aws-cdk/aws-rds';
import { BastionHostRDSForward } from '../lib/rds';

test('Bastion Host created for normal username/password access', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const testVpc = new ec2.Vpc(stack, 'TestVpc');
    const testRds = new rds.DatabaseInstance(stack, 'TestRDS', {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: testVpc
    });

    // WHEN
    new BastionHostRDSForward(stack, 'MyTestConstruct', {
      vpc: testVpc,
      name: 'MyBastion',
      rdsInstance: testRds,
      clientTimeout: 2,
    });

    // THEN
    expectCDK(stack).to(haveResource('AWS::EC2::Instance', {
      UserData: {
        'Fn::Base64': {
          'Fn::Join': [
            '',
            [
              'Content-Type: multipart/mixed; boundary=\"//\"\nMIME-Version: 1.0\n--//\nContent-Type: text/cloud-config; charset=\"us-ascii\"\nMIME-Version: 1.0\nContent-Transfer-Encoding: 7bit\nContent-Disposition: attachment; filename=\"cloud-config.txt\"\n#cloud-config\ncloud_final_modules:\n- [scripts-user, always]\n--//\nContent-Type: text/x-shellscript; charset=\"us-ascii\"\nMIME-Version: 1.0\nContent-Transfer-Encoding: 7bit\nContent-Disposition: attachment; filename=\"userdata.txt\"\n#!/bin/bash\nmount -o remount,rw,nosuid,nodev,noexec,relatime,hidepid=2 /proc\nyum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm\nyum install -y haproxy\necho \"listen database\n  bind 0.0.0.0:',
              {
                'Fn::GetAtt': [
                  'TestRDSDF309CB7',
                  'Endpoint.Port'
                ]
              },
              '\n  timeout connect 10s\n  timeout client 2m\n  timeout server 1m\n  mode tcp\n  server service ',
              {
                'Fn::GetAtt': [
                  'TestRDSDF309CB7',
                  'Endpoint.Address'
                ]
              },
              ':',
              {
                'Fn::GetAtt': [
                  'TestRDSDF309CB7',
                  'Endpoint.Port'
                ]
              },
              '\n\" > /etc/haproxy/haproxy.cfg\nservice haproxy restart\n--//'
            ]
          ]
        },
      },
      Tags: [
        {
          Key: 'Name',
          Value: 'MyBastion'
        }
      ],
    }));
});

test('Bastion Host created with extended Role for IAM RDS Connection', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const testVpc = new ec2.Vpc(stack, 'TestVpc');
    const testRds = new rds.DatabaseInstance(stack, 'TestRDS', {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: testVpc
    });

    // WHEN
    new BastionHostRDSForward(stack, 'MyTestConstruct', {
      vpc: testVpc,
      name: 'MyBastionWithIAMAccess',
      rdsInstance: testRds,
      iamUser: 'iamuser',
      rdsResourceIdentifier: 'db-ABCDEFGH',
    });

    // THEN
    expectCDK(stack).to(haveResource('AWS::EC2::Instance', {
      UserData: {
        'Fn::Base64': {
          'Fn::Join': [
            '',
            [
              'Content-Type: multipart/mixed; boundary=\"//\"\nMIME-Version: 1.0\n--//\nContent-Type: text/cloud-config; charset=\"us-ascii\"\nMIME-Version: 1.0\nContent-Transfer-Encoding: 7bit\nContent-Disposition: attachment; filename=\"cloud-config.txt\"\n#cloud-config\ncloud_final_modules:\n- [scripts-user, always]\n--//\nContent-Type: text/x-shellscript; charset=\"us-ascii\"\nMIME-Version: 1.0\nContent-Transfer-Encoding: 7bit\nContent-Disposition: attachment; filename=\"userdata.txt\"\n#!/bin/bash\nmount -o remount,rw,nosuid,nodev,noexec,relatime,hidepid=2 /proc\nyum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm\nyum install -y haproxy\necho \"listen database\n  bind 0.0.0.0:',             {
                'Fn::GetAtt': [
                  'TestRDSDF309CB7',
                  'Endpoint.Port'
                ]
              },
              '\n  timeout connect 10s\n  timeout client 1m\n  timeout server 1m\n  mode tcp\n  server service ',
              {
                'Fn::GetAtt': [
                  'TestRDSDF309CB7',
                  'Endpoint.Address'
                ]
              },
              ':',
              {
                'Fn::GetAtt': [
                  'TestRDSDF309CB7',
                  'Endpoint.Port'
                ]
              },
              '\n\" > /etc/haproxy/haproxy.cfg\nservice haproxy restart\n--//'
            ]
          ]
        },
      },
      Tags: [
        {
          Key: 'Name',
          Value: 'MyBastionWithIAMAccess'
        }
      ],
    }));
    expectCDK(stack).to(haveResource('AWS::IAM::Policy', {
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: [
              'ssmmessages:*',
              'ssm:UpdateInstanceInformation',
              'ec2messages:*'
            ],
            Effect: 'Allow',
            Resource: '*'
          },
          {
            Action: [
              'rds-db:connect',
              'rds:*'
            ],
            Effect: 'Allow',
            Resource: [
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:aws:rds-db:',
                    {
                      'Ref': 'AWS::Region'
                    },
                    ':',
                    {
                      'Ref': 'AWS::AccountId'
                    },
                    ':dbuser:db-ABCDEFGH/iamuser'
                  ]
                ]
              },
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      'Ref': 'AWS::Partition'
                    },
                    ':rds:',
                    {
                      'Ref': 'AWS::Region'
                    },
                    ':',
                    {
                      'Ref': 'AWS::AccountId'
                    },
                    ':db:',
                    {
                      'Ref': 'TestRDSDF309CB7'
                    }
                  ]
                ]
              }
            ]
          }
        ]
      }
  }));
});

test('Bastion Host with own securityGroup', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const testVpc = new ec2.Vpc(stack, 'TestVpc');
    const securityGroup = new ec2.SecurityGroup(stack, 'SecurityGroup', {
      vpc: testVpc,
      allowAllOutbound: false,
      description: 'My test securityGroup description',
      securityGroupName: 'MyTestSecurityGroupName',
    });

    const testRds = new rds.DatabaseInstance(stack, 'TestRDS', {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: testVpc
    });

    // WHEN
    const bastionHost = new BastionHostRDSForward(stack, 'MyTestConstruct', {
      vpc: testVpc,
      name: 'MyBastion',
      rdsInstance: testRds,
      securityGroup,
    });
    const bastionHostSecurityGroup = bastionHost.securityGroup as ec2.SecurityGroup;

    assert.equal(securityGroup.securityGroupName, bastionHostSecurityGroup.securityGroupName);
    assert.equal(securityGroup.allowAllOutbound, bastionHostSecurityGroup.allowAllOutbound);
});
