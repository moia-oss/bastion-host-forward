[![Build Status](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2Fmoia-oss%2Fbastion-host-forward%2Fbadge&style=flat)](https://actions-badge.atrox.dev/moia-dev/bastion-host-forward/goto)
[![npm version](https://badge.fury.io/js/%40moia-oss%2Fbastion-host-forward.svg)](https://badge.fury.io/js/%40moia-dev%2Fbastion-host-forward)
[![PyPI version](https://badge.fury.io/py/moia-dev.bastion-host-forward.svg)](https://badge.fury.io/py/moia-dev.bastion-host-forward)
# Bastion Host Forward

This CDK Library provides custom constructs `BastionHostRDSForward`,
`BastionHostRedisForward` and `BastionHostRedshiftForward`. It's an extension
for the `BastionHostLinux`, which forwards traffic from an RDS Instance or Redis
in the same VPC. This makes it possible to connect to a service inside a VPC
from a developer machine outside of the VPC via the AWS Session Manager. The
library allows connections to a basic-auth RDS via username and password or IAM,
as well as to Redis clusters.

# Setup

First of all you need to include this library into your project for the language
you want to deploy the bastion host with

## Javascript/Typescript

For Javascript/Typescript the library can be installed via npm:

```
npm install @moia-oss/bastion-host-forward
```

## Python

For python the library can be installed via pip:

```
pip install moia-dev.bastion-host-forward
```

# Examples
The following section includes some examples in supported languages how the
Bastion Host can be created for different databases.

## Bastion Host for RDS in Typescript

A minimal example for creating the RDS Forward Construct, which will be used via
username/password could look like this snippet:

```typescript
import * as cdk from '@aws-cdk/core';
import { SecurityGroup, Vpc } from '@aws-cdk/aws-ec2';
import { DatabaseInstance } from '@aws-cdk/aws-rds';
import { BastionHostRDSForward } from '@moia-dev/bastion-host-rds-forward';

export class BastionHostPocStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = Vpc.fromLookup(this, 'MyVpc', {
      vpcId: 'vpc-0123456789abcd'
    });

    const securityGroup = SecurityGroup.fromSecurityGroupId(
      this,
      'RDSSecurityGroup',
      'odsufa5addasdj',
      { mutable: false }
    );

    const rdsInstance = DatabaseInstance.fromDatabaseInstanceAttributes(
      this,
      'MyDb',
      {
        instanceIdentifier: 'abcd1234geh',
        instanceEndpointAddress: 'abcd1234geh.ughia8asd.eu-central-1.rds.amazonaws.com',
        port: 5432,
        securityGroups: [securityGroup]
      }
    );

    new BastionHostRDSForward(this, 'BastionHost', {
      vpc: vpc,
      rdsInstance: rdsInstance,
      name: 'MyBastionHost',
    });
```

If the RDS is IAM Authenticated you also need to add an `iam_user` and
`rdsResourceIdentifier` to the BastionHostRDSForward:

```typescript
...
new BastionHostRDSForward(this, 'BastionHost', {
  vpc: vpc,
  rdsInstance: rdsInstance,
  name: 'MyBastionHost',
  iamUser: 'iamusername',
  rdsResourceIdentifier: 'db-ABCDEFGHIJKL123'
});
```

This will spawn a Bastion Host in the defined VPC. You also need to make sure
that IPs from within the VPC are able to connect to the RDS Database. This
needs to be set in the RDS's Security Group. Otherwise the Bastion Host can't
connect to the RDS.

## Bastion Host for Redis in Typescript

The instantiation of a BastionHostRedisForward works very similar to the RDS
example, except that you pass a CfnCacheCluster to the BastionHost like this:

```typescript
new BastionHostRedisForward(this, 'RedisBastion', {
  elasticacheCluster: cluster,
  vpc: vpc,
});
```

## Bastion Host for Redshift

### Typescript

A minimal example for creating the Redshift Forward Construct, which will be used via
username/password could look like this snippet. It's very similar to the RDS
version. The only difference is that we need a Redshift Cluster object instead
of a RDS DatabaseInstance:

```typescript
import * as cdk from '@aws-cdk/core';
import { BastionHostRedshiftForward } from '@moia-dev/bastion-host-forward';
import { SecurityGroup, Vpc } from '@aws-cdk/aws-ec2';
import { Cluster } from '@aws-cdk/aws-redshift';

export class PocRedshiftStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = Vpc.fromLookup(this, 'MyVpc', {
      vpcId: 'vpc-12345678'
    });

    const securityGroup = SecurityGroup.fromSecurityGroupId(
      this,
      'BastionHostSecurityGroup',
      'sg-1245678',
      { mutable: false }
    );

    const redshiftCluster = Cluster.fromClusterAttributes(this, 'RedshiftCluster', {
      clusterName: 'myRedshiftClusterName',
      clusterEndpointAddress: 'myRedshiftClusterName.abcdefg.eu-central-1.redshift.amazonaws.com',
      clusterEndpointPort: 5439,
      
    });

    new BastionHostRedshiftForward(this, 'BastionHostRedshiftForward', {
      vpc,
      name: 'MyRedshiftBastionHost',
      securityGroup,
      redshiftCluster
    })
  }
}
```

### Python

```python
from aws_cdk import core as cdk
from aws_cdk import aws_redshift
from aws_cdk import aws_ec2
from moia_dev import bastion_host_forward


class PocRedshiftStack(cdk.Stack):

    def __init__(self, scope: cdk.Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        vpc = aws_ec2.Vpc.from_lookup(
            self,
            "vpc",
            vpc_id="vpc-12345678"
        )
        security_group = aws_ec2.SecurityGroup.from_security_group_id(
            self,
            "sec_group", "sg-12345678"
        )
        redshiftCluster = aws_redshift.Cluster.from_cluster_attributes(
            self,
            "cluster",
            cluster_name="myRedshiftClusterName",
            cluster_endpoint_address="myRedshiftClusterName.abcdefg.eu-central-1.redshift.amazonaws.com",
            cluster_endpoint_port=5439
        )

        bastion_host_forward.BastionHostRedshiftForward(
            self,
            "bastion-host",
            name="my-vastion-host",
            security_group=security_group,
            redshift_cluster=redshiftCluster,
            vpc=vpc
        )
```

## Bastion Host for Aurora Serverless

```typescript
import * as cdk from '@aws-cdk/core';
import { SecurityGroup, Vpc } from '@aws-cdk/aws-ec2';
import { ServerlessCluster } from '@aws-cdk/aws-rds';
import { BastionHostAuroraServerlessForward } from '@moia-dev/bastion-host-rds-forward';

export class BastionHostPocStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = Vpc.fromLookup(this, 'MyVpc', {
      vpcId: 'vpc-0123456789abcd'
    });

    const securityGroup = SecurityGroup.fromSecurityGroupId(
      this,
      'AuroraSecurityGroup',
      'odsufa5addasdj',
      { mutable: false }
    );

    const serverlessCluster = ServerlessCluster.fromServerlessClusterAttributes(
      this,
      'Aurora',
      {
        clusterIdentifier: 'my-cluster',
        port: 3306,
        clusterEndpointAddress: 'my-aurora.cluster-abcdef.eu-central-1.rds.amazonaws.com',
        securityGroups: [securityGroup]
      }
    );

    new BastionHostAuroraServerlessForward(this, 'BastionHost', {
      vpc, 
      serverlessCluster,
    });
```

## Deploying the Bastion Host

When you setup the Bastion Host for the Database you want to connect to, you can
now go forward to actually deploy the Bastion Host:

```
cdk deploy
```

When the EC2 Instance for you Bastion Host is visible you can continue with the
setup of the Session-Manager Plugin on your Machine

# Install the Session-Manager Plugin for AWS-CLI

You are also able to connect to the Bastion Host via the AWS Web
Console. For this go to `AWS Systems Manager` -> `Session Manager` -> choose
the newly created instance -> click on start session.

But overall it's a much more comfortable experience to connect to the Bastion
Session Manager Plugin. On Mac OSX you can get it via homebrew for example:

```
brew cask install session-manager-plugin
```

For Linux it should also be available in the respective package manager. Also
have a look at [the official installation instructions from
AWS](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)

## Forward the connection to your machine

The Session Manager offers a command to forward a specific port. On the Bastion
Host a HAProxy was installed which forwards the connection on the same
port as the specified service. Those are by default:
- RDS MySQL: 3306
- RDS PostgreSQL: 5432
- Redis: 6739
- Redshift: 5439

In the following example, we show how to forward the connection of a PostgreSQL
database. To forward the connection to our machine we execute the following
command in the shell:

```
aws ssm start-session \
    --target <bastion-host-id> \
    --document-name AWS-StartPortForwardingSession \
    --parameters '{"portNumber": ["5432"], "localPortNumber":["5432"]}'
```

This creates a port forward session on the defined `localPortNumber`. The
target is the id of the bastion host instance. This will be output
automatically after deploying the bastion host. The `portNumber` must be the
same as the RDS Port.

Now you would be able to connect to the RDS as it would run on localhost:5432.

*Note*

In the example of a MySQL running in Serverless Aurora, we couldn't connect to
the database using localhost. If you face the same issue, make sure to also try to connect via
the local IP 127.0.0.1. 

Example with the MySQL CLI:

```sh
mysql -u <username> -h 127.0.0.1 -p
```

## Additional step if you are using IAM Authentication on RDS

If you have an IAM authenticated RDS, the inline policy of the bastion
host will be equipped with access rights accordingly. Namely it will get `rds:*`
permissions on the RDS you provided and it also allows `rds-db:connect` with
the provided `iamUser`.

Most of the steps you would perform to connect to the RDS are the same, since it wouldn't
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

For a full guide on how to connect to an IAM authenticated RDS check out [this
guide by AWS](https://aws.amazon.com/premiumsupport/knowledge-center/users-connect-rds-iam/)
