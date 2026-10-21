// AWS Lambda entry: the same Hono app as node.ts, with DynamoDB storage.
import { handle } from "@hono/aws-lambda";
import { createApp } from "./app";
import { DynamoRepo } from "./store/dynamoRepo";

const table = process.env.GQ_TABLE;
if (!table) throw new Error("GQ_TABLE is required");

export const handler = handle(createApp(new DynamoRepo(table)));
