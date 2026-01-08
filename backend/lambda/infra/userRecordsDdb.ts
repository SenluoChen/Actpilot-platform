import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.USER_TABLE_NAME!;

export type UserRecordItem = {
  userSub: string;
  recordId: string;
  createdAt: string;
  type?: string;
  payload?: unknown;
};

export async function putUserRecord(item: UserRecordItem) {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
    })
  );
}

export async function listUserRecords(userSub: string, limit = 20, startKey?: any) {
  return ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: { '#pk': 'userSub' },
      ExpressionAttributeValues: { ':pk': userSub },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: startKey,
    })
  );
}
