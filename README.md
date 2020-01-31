# Bastion Host RDS Forward

This CDK Library provides a custom construct `BastionHostRDSForward`. It's an
extension for the `BastionHostLinux`, which forwards traffic from a RDS
Instance in the same VPC. This makes it possible to connect to an RDS inside a
VPC from a developer machine outside of the VPC via the AWS Session Manager.
The library allows connections to a basic-auth RDS via username and password, as
well as IAM authenticated ones.

# Setup

## Instantiating the Bastion Host
Include this library into your project via npm

```
npm install <address-needs-to-be-added>
```

A minimal example for creating the RDS Forward Construct, which will used via
username/password could look like this snippet:

```typescript
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import { BastionHostRDSForward } from 'moia-dev/bastion-host-rds-forward';

export class BastionHostPocStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'MyVpc', {
      vpcId: 'vpc-0123456789abcd'
    });

    const securityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'RDSSecurityGroup',
      'odsufa5addasdj',
      { mutable: false }
    );

    const rdsInstance = rds.DatabaseInstance.fromDatabaseInstanceAttributes(
      this,
      'MyDb',
      {
        instanceIdentifier: 'abcd1234geh',
        instanceEndpointAddress: 'abcd1234geh.ughia8asd.eu-central-1.rds.amazonaws.com',
        port: 5432,
        securityGroups: [securityGroup]
      }
    );

    new BastionHostRDSForward.BastionHostRDSForward(stack, 'BastionHost', {
      vpc: vpc,
      rdsInstance: rdsInstance,
      databases: ['my-postres-db'],
      name: 'MyBastionHost',
    });
```

If the RDS is IAM Authenticated you also need to add an `iam_user` and
`rdsResourceIdentifier` to the BastionHostRDSForward:

```typescript
...
new BastionHostRDSForward.BastionHostRDSForward(stack, 'BastionHost', {
  vpc: vpc,
  rdsInstance: rdsInstance,
  databases: ['my-postres-db'],
  name: 'MyBastionHost',
  iamUser: 'iamusername',
  rdsResourceIdentifier: 'db-ABCDEFGHIJKL123'
});
```

This will spawn a Bastion Host in the defined VPC. You also need to make sure
that IPs from within the VPC are able to connect to the RDS Database. This
needs to be set in the RDS's Security Group. Otherwise the Bastion Host can't
connect to the RDS.

## Install the Session-Manager Plugin for AWS-CLI

First of all, you are also able to connect to the Bastion Host via the AWS Web
Console. For this go to `AWS Systems Manager` -> `Session Manager` -> choose
the newly created instance -> click on start session.

But overall it's a much more comfortable experience to connect to the Bastion
Session Manager Plugin. On Mac OSX you can get it via homebrew for example:

```
brew cask install session-manager-plugin
```

For Linux it should also be available in the respective package manager. Also
have a look at []the official installation instructions from
AWS](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)

## Forward the connection to your machine

The Session Manager offers a command to forward a specific port. On the Bastion
Host a HAProxy was installed which forwards the RDS connection on the same
port, which is used by the respective database. In the following we assume to
forward the connection of a PostgreSQL database. PostgreSQL uses 5432 as the
default port. To forward the connection to our machine we execute the following
command in the shell:

```
aws ssm start-session \
    --target <bastion-host-id> \
    --document-name AWS-StartPortForwardingSession \
    --parameters '{"portNumber": ["5432"], "localPortNumber":["5432"]}'
```

This creates a port forward session on the defined `localPortNumber`. The
target is the id of the bastion host instance. This will be outputted
automatically after deploying the bastion host. The `portNumber` must be the
same as the RDS Port.

Now you would be able to connect to the RDS as it would run on localhost:5432.

## Additional step if you are using IAM Authentication on RDS

If you are having an IAM authenticated RDS, the inline policy of the bastion
host will be equipped with according access rights. Namely it will get `rds:*`
permissions on the RDS you provided and it also allows `rds-db:connect` with
the provided `iamUser`.

Most of the steps are the same as you would connect to the RDS as it wouldn't
be in a VPC.

First you generate the PGPASSWORD on your local machine:

```
export
PGPASSWORD="$(aws rds generate-db-auth-token
--hostname=<rds endpoint> --port=5432
--username=<iam user> --region <the region of the rds>)"
```

You also need to have the RDS certificate from AWS, which you can download:

```
wget https://s3.amazonaws.com/rds-downloads/rds-ca-2019-root.pem
```

There is now an additional step needed, because the certificate checks against
the real endpoint name during the connect procedure. Therefore we need to add
an entry to the `/etc/hosts` file on our machine:

```
echo "127.0.0.1  <rds endpoint>" >> /etc/hosts
```

Now you can connect to the IAM authenticated RDS like this:

```
psql "host=<rds endpoint> port=5432 dbname=<database name> user=<iamUser> sslrootcert=<full path to downloaded cert> sslmode=verify-ca"
```

For a full guide on how to connect to a IAM authenticated RDS check out [this
guide by AWS](https://aws.amazon.com/premiumsupport/knowledge-center/users-connect-rds-iam/)
