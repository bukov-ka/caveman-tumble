import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

import { Construct } from "constructs";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";

export class GravitygameStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create DynamoDB Table
    const table = new dynamodb.Table(this, "GravityGameTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    // Create Lambda Function
    const lambdaFunction = new lambda.Function(this, "GravityGameLambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("dist"),
      handler: "index.handler",
      environment: {
        TABLE_NAME: table.tableName,
        PRIMARY_KEY: "id",
      },
      reservedConcurrentExecutions: 1,
    });

    // Grant the lambda function read/write permissions to our DynamoDB table
    table.grantReadWriteData(lambdaFunction);

    // Create API Gateway
    const api = new apigateway.RestApi(this, "GravityGameApi", {
      restApiName: "Game of Gravity API",
      description: "This service serves Game of Gravity: Caveman Tumble.",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Create a resource for /gravitygame
    const gravityGame = api.root.addResource("gravitygame");
    const gravityGameItem = gravityGame.addResource("{id}");

    // Create API Key
    const apiKey = api.addApiKey(
      "wpSxB9GJRDbBcT3td6JJSFx4XacndANAkxyUs7kNCazQppRLSegAPLYLZA2NVnaW"
    );

    // Create Usage Plan
    const plan = api.addUsagePlan("UsagePlan", {
      name: "EasyStartPlan",
      throttle: {
        rateLimit: 10,
        burstLimit: 20,
      },
    });
    plan.addApiKey(apiKey);

    // Add GET and POST methods to /gravitygame
    gravityGameItem.addMethod(
      "GET",
      new apigateway.LambdaIntegration(lambdaFunction)
    );
    gravityGameItem.addMethod(
      "POST",
      new apigateway.LambdaIntegration(lambdaFunction)
    );

    // Output API Gateway URL to the CloudFormation Outputs
    new cdk.CfnOutput(this, "ApiUrl", { value: api.url ?? "" });

    // Create a new S3 bucket for storing your web contents.
    const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
      websiteIndexDocument: "index.html",
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      publicReadAccess: true,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Gravity.bukov.net deployment
    this.deployBukovNet(websiteBucket);

    // Game of gravity deployment
    this.deployGameOfGravity();
  }

  private deployGameOfGravity() {
    const gameOfGravityCert = new Certificate(
      this,
      "GameOfGravitySiteCertificate",
      {
        domainName: "gameofgravity.com",
        validation: CertificateValidation.fromDns(),
      }
    );

    const gameOfGravityWebsiteBucket = new s3.Bucket(
      this,
      "GameOfGravityWebsiteBucket",
      {
        websiteIndexDocument: "index.html",
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
        publicReadAccess: true,
        autoDeleteObjects: true,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );

    const gameOfGravityDistribution = new cloudfront.Distribution(
      this,
      "GameOfGravityDistribution",
      {
        defaultBehavior: {
          origin: new origins.S3Origin(gameOfGravityWebsiteBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          // originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
        },
        domainNames: ["gameofgravity.com"],
        certificate: gameOfGravityCert,
      }
    );
    new s3deploy.BucketDeployment(this, "DeployGameOfGravityWebsite", {
      sources: [s3deploy.Source.asset("../web")],
      destinationBucket: gameOfGravityWebsiteBucket,
      distribution: gameOfGravityDistribution,
      distributionPaths: ["/*"],
      retainOnDelete: false,
    });

    const zone = route53.HostedZone.fromLookup(this, 'Zone', { domainName: 'gameofgravity.com' });

    new route53.ARecord(this, 'SiteAliasRecord', {
      recordName: 'gameofgravity.com',
      target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(gameOfGravityDistribution)),
      zone,
    });
    
    new route53.ARecord(this, 'SiteWWWAliasRecord', {
      recordName: 'www.gameofgravity.com',
      target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(gameOfGravityDistribution)),
      zone,
    });
    

    new cdk.CfnOutput(this, "GameOfGravityDistributionDomainName", {
      value: gameOfGravityDistribution.distributionDomainName,
    });
  }

  private deployBukovNet(websiteBucket: cdk.aws_s3.Bucket) {
    const cert = new Certificate(this, "SiteCertificate", {
      domainName: "gravity.bukov.net",
      validation: CertificateValidation.fromDns(),
    });

    // Create a CloudFront distribution for the website bucket.
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
      },
      domainNames: ["gravity.bukov.net"],
      certificate: cert,
    });

    // Deploy site contents to S3 bucket
    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      sources: [s3deploy.Source.asset("../web")],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ["/*"],
      retainOnDelete: false,
    });

    // Output the CloudFront domain name.
    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: distribution.distributionDomainName,
    });
  }
}
