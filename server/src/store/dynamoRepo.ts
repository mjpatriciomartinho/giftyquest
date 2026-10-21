// DynamoDB storage for demo accounts: one item per account. The table's TTL attribute is
// `expiresAt`, so DynamoDB deletes expired demo accounts by itself, at no cost.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { newAccount, type Account, type AccountRepo } from "./repo";

export class DynamoRepo implements AccountRepo {
  private db: DynamoDBDocumentClient;

  constructor(private table: string, region = process.env.AWS_REGION ?? "eu-west-1") {
    this.db = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), { marshallOptions: { removeUndefinedValues: true } });
  }

  async create() {
    const account = newAccount();
    await this.save(account);
    return account;
  }

  async get(id: string) {
    if (!/^[a-f0-9]{32}$/.test(id)) return null;
    const res = await this.db.send(new GetCommand({ TableName: this.table, Key: { id } }));
    const account = res.Item as Account | undefined;
    // TTL deletion can lag; treat expired accounts as gone right away.
    if (!account || account.expiresAt < Date.now() / 1000) return null;
    return account;
  }

  async save(account: Account) {
    await this.db.send(new PutCommand({ TableName: this.table, Item: account }));
  }
}
