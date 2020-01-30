import { expect as expectCDK, haveResource, SynthUtils } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as rds from '@aws-cdk/aws-rds';
import BastionHostRDSForward = require('../lib/index');

test('Bastion Host created for normal username/password access', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const vpc = new ec2.Vpc(stack, 'TestVpc')
    const rdsInstance = new rds.DatabaseInstance(stack, 'TestRDS', {
      masterUsername: 'testuser',
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      instanceClass: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: vpc
    })

    // WHEN
    new BastionHostRDSForward.BastionHostRDSForward(stack, 'MyTestConstruct', {
      vpc: vpc,
      databases: ['mypostgres', 'yourpostgres'],
      name: 'MyBastion',
      rdsInstance: rdsInstance,
    });

    // THEN
    expectCDK(stack).to(haveResource('AWS::EC2::Instance', {
      UserData: {
        'Fn::Base64': {
          'Fn::Join': [
            '',
            [
              '#!/bin/bash\nyum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm\nyum install -y haproxy\necho \"listen postgres\n  bind 0.0.0.0:',
              {
                'Fn::GetAtt': [
                  'TestRDSDF309CB7',
                  'Endpoint.Port'
                ]
              },
              '\n  timeout connect 10s\n  timeout client 1m\n  timeout server 1m\n  mode tcp\n  server mypostgres ',
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
              '\n  server yourpostgres ',
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
              "\n\" > /etc/haproxy/haproxy.cfg\nservice haproxy restart"
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
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('Bastion Host created with extended Role for IAM RDS Connection', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const vpc = new ec2.Vpc(stack, 'TestVpc')
    const rdsInstance = new rds.DatabaseInstance(stack, 'TestRDS', {
      masterUsername: 'testuser',
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      instanceClass: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: vpc
    })

    // WHEN
    new BastionHostRDSForward.BastionHostRDSForward(stack, 'MyTestConstruct', {
      vpc: vpc,
      databases: ['mypostgres', 'yourpostgres'],
      name: 'MyBastionWithIAMAccess',
      rdsInstance: rdsInstance,
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
              '#!/bin/bash\nyum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm\nyum install -y haproxy\necho \"listen postgres\n  bind 0.0.0.0:',
              {
                'Fn::GetAtt': [
                  'TestRDSDF309CB7',
                  'Endpoint.Port'
                ]
              },
              '\n  timeout connect 10s\n  timeout client 1m\n  timeout server 1m\n  mode tcp\n  server mypostgres ',
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
              '\n  server yourpostgres ',
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
              '\n\" > /etc/haproxy/haproxy.cfg\nservice haproxy restart'
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
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
