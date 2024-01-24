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

import { CfnMaintenanceWindow, CfnMaintenanceWindowTarget, CfnMaintenanceWindowTask } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface BastionHostPatchManagerProps {
  /**
   * The instance id that should be patched with security updates
   */
  readonly instanceId: string;
  /**
   * The name of the bastion host instance
   */
  readonly instanceName: string;
}

export class BastionHostPatchManager extends Construct {
  public constructor(scope: Construct, id: string, props: BastionHostPatchManagerProps) {
    super(scope, id);
    const maintenanceWindow = new CfnMaintenanceWindow(this, 'MaintenanceWindow', {
      name: `Patch-${props.instanceName}`,
      allowUnassociatedTargets: false,
      cutoff: 0,
      duration: 2,
      schedule: 'cron(0 3 ? * SUN *)',
    });

    const maintenanceTarget = new CfnMaintenanceWindowTarget(this, 'MaintenanceWindowTarget', {
      name: `${props.instanceName}`,
      windowId: maintenanceWindow.ref,
      ownerInformation: 'Bastion-Host-Forward',
      resourceType: 'INSTANCE',
      targets: [
        {
          key: 'InstanceIds',
          values: [props.instanceId],
        },
      ],
    });
    new CfnMaintenanceWindowTask(this, 'MaintenanceWindowTask', {
      taskArn: 'AWS-RunPatchBaseline',
      priority: 1,
      taskType: 'RUN_COMMAND',
      windowId: maintenanceWindow.ref,
      name: `${props.instanceName}-Patch-Task`,
      targets: [
        {
          key: 'WindowTargetIds',
          values: [maintenanceTarget.ref],
        },
      ],
      taskInvocationParameters: {
        maintenanceWindowRunCommandParameters: {
          parameters: {
            Operation: ['Install'],
          },
          documentVersion: '$LATEST',
        },
      },
      maxErrors: '0',
      maxConcurrency: '1',
    });
  }
}
