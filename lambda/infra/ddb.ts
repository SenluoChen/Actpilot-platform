import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME!;

export async function saveStatementMeta(item: any) {
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
}

export async function getStatementById(id: string) {
  const r = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  return r.Item;
}

export async function queryByCompany(company: string, limit = 10, startKey?: any) {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'byCompany',
    KeyConditionExpression: '#c = :c',
    ExpressionAttributeNames: { '#c': 'company' },
    ExpressionAttributeValues: { ':c': company },
    ScanIndexForward: false,
    Limit: limit,
    ExclusiveStartKey: startKey
  }));
  return res;
}
