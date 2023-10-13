#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { GravitygameStack } from "../lib/gravitygame-stack";

const app = new cdk.App();
new GravitygameStack(app, "GravitygameStack", {
  env: { account: "908478757030", region: "us-east-1" },
});
