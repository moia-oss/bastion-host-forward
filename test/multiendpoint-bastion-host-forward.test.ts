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

import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { MultiendpointBastionHostForward } from '../lib/multiendpoint-bastion-host-forward';

test('fails if multiple endpoints have the same localPort', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const testVpc = new Vpc(stack, 'TestVpc');

  expect(() => {
    new MultiendpointBastionHostForward(stack, 'MyTestConstruct', {
      vpc: testVpc,
      endpoints: [
        {
          address: '10.0.0.1',
          remotePort: '5432',
        },
        {
          address: '10.0.0.2',
          remotePort: '5432',
        },
      ],
    });
  }).toThrow('All local ports must be unique');
});

test('fails if endpoints array is empty', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const testVpc = new Vpc(stack, 'TestVpc');

  expect(() => {
    new MultiendpointBastionHostForward(stack, 'MyTestConstruct', {
      vpc: testVpc,
      endpoints: [],
    });
  }).toThrow('At least one endpoint must be provided');
});

test('creates Bastion Host for multiple endpoints with overridden local ports', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const testVpc = new Vpc(stack, 'TestVpc');

  new MultiendpointBastionHostForward(stack, 'MyTestConstruct', {
    vpc: testVpc,
    name: 'MultiEndpointBastion',
    endpoints: [
      {
        address: '10.0.0.1',
        remotePort: '5432',
        localPort: '15432',
      },
      {
        address: '10.0.0.2',
        remotePort: '5432',
        localPort: '25432',
      },
    ],
  });

  const template = Template.fromStack(stack);

  // Assert that both local ports are present in the rendered HAProxy configuration
  template.hasResourceProperties('AWS::EC2::Instance', {
    UserData: {
      'Fn::Base64': Match.stringLikeRegexp('bind 0\\.0\\.0\\.0:15432'),
    },
  });
  template.hasResourceProperties('AWS::EC2::Instance', {
    UserData: {
      'Fn::Base64': Match.stringLikeRegexp('bind 0\\.0\\.0\\.0:25432'),
    },
  });
});

test('creates Bastion Host for multiple endpoints with individual timeout settings', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const testVpc = new Vpc(stack, 'TestVpc');

  new MultiendpointBastionHostForward(stack, 'MyTestConstruct', {
    vpc: testVpc,
    endpoints: [
      {
        address: '10.0.0.1',
        remotePort: '5432',
        localPort: '15432',
        clientTimeout: 2,
        serverTimeout: 4,
      },
      {
        address: '10.0.0.2',
        remotePort: '5433',
        localPort: '25432',
        clientTimeout: 3,
        serverTimeout: 5,
      },
    ],
  });

  const template = Template.fromStack(stack);

  // Verify the per-endpoint timeout values are present in the HAProxy config
  template.hasResourceProperties('AWS::EC2::Instance', {
    UserData: {
      'Fn::Base64': Match.stringLikeRegexp('timeout client 2m\\n  timeout server 4m'),
    },
  });
  template.hasResourceProperties('AWS::EC2::Instance', {
    UserData: {
      'Fn::Base64': Match.stringLikeRegexp('timeout client 3m\\n  timeout server 5m'),
    },
  });
});
