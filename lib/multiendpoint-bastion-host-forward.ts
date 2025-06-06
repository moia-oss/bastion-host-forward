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

import type { Construct } from 'constructs';

import { BastionHostForward } from './bastion-host-forward';
import { MultiendpointBastionHostForwardProps } from './multiendpoint-bastion-host-forward-props';

/*
 * Creates a Bastion Host to forward to multiple generic endpoints. It needs
 * the following attributes:
 * - vpc: The VPC to deploy the bastion host to
 * - endpoints: An array of objects with the following attributes:
 *   - address: The endpoint address of the datastore
 *   - remotePort: The port of the datastore
 */
export class MultiendpointBastionHostForward extends BastionHostForward {
  constructor(
    scope: Construct,
    id: string,
    props: MultiendpointBastionHostForwardProps,
  ) {
    super(scope, id, props);
  }
}
