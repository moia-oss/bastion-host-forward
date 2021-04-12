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
import { App, Stack } from '@aws-cdk/core';
import { Vpc } from '@aws-cdk/aws-ec2';
import { Cluster } from '@aws-cdk/aws-redshift';
import { BastionHostRedshiftForward } from '../lib/redshift';

test('Bastion Host created for normal username/password access', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const testVpc = new Vpc(stack, 'TestVpc');
    const testRedshift = new Cluster(stack, 'TestRedshift', {
      masterUser: {masterUsername: 'myMasterUser'},
      vpc: testVpc,
      clusterName: 'myClusterName',
    });

    // WHEN
    new BastionHostRedshiftForward(stack, 'MyTestConstruct', {
      vpc: testVpc,
      name: 'MyBastion',
      redshiftCluster: testRedshift,
      clientTimeout: 2,
    });

    // THEN
    expectCDK(stack).to(haveResource('AWS::EC2::Instance', {
      UserData: {
        'Fn::Base64': {
          'Fn::Join': [
            '',
            [
              `Content-Type: multipart/mixed; boundary=\"//\"\nMIME-Version: 1.0\n--//\nContent-Type: text/cloud-config; charset=\"us-ascii\"\nMIME-Version: 1.0\nContent-Transfer-Encoding: 7bit\nContent-Disposition: attachment; filename=\"cloud-config.txt\"\n#cloud-config\ncloud_final_modules:\n- [scripts-user, always]\n--//\nContent-Type: text/x-shellscript; charset=\"us-ascii\"\nMIME-Version: 1.0\nContent-Transfer-Encoding: 7bit\nContent-Disposition: attachment; filename=\"userdata.txt\"\n#!/bin/bash\nmount -o remount,rw,nosuid,nodev,noexec,relatime,hidepid=2 /proc\nyum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm\nyum install -y haproxy\necho \"listen database\n  bind 0.0.0.0:${testRedshift.clusterEndpoint.port}\n  timeout connect 10s\n  timeout client 2m\n  timeout server 1m\n  mode tcp\n  server service `,
              {
                'Fn::GetAtt': [
                  'TestRedshift8D950AC2',
                  'Endpoint.Address'
                ]
              },
              `:${testRedshift.clusterEndpoint.port}\n\" > /etc/haproxy/haproxy.cfg\nservice haproxy restart\n--//`
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
