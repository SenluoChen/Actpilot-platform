import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import jwt from 'jsonwebtoken';

const secretName = process.env.JWT_SECRET_NAME || '/ai-act-mvp/jwt-secret';
const statementFunctionName = process.env.STATEMENT_FUNCTION_NAME || process.env.STATEMENT_FN_ARN || '';

export const main = async (event: any) => {
  try {
    // read Authorization header
    const auth = event.headers?.Authorization || event.headers?.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return { statusCode: 401, body: 'Missing token' };
    const token = auth.slice('Bearer '.length);

    const sm = new SecretsManagerClient({});
    const cmd = new GetSecretValueCommand({ SecretId: secretName });
    const res = await sm.send(cmd);
    const secretString = res.SecretString ? JSON.parse(res.SecretString).secret : process.env.JWT_SECRET;
    if (!secretString) return { statusCode: 500, body: 'Signing secret not found' };

    // verify token
    try {
      jwt.verify(token, secretString, { algorithms: ['HS256'] });
    } catch (e) {
      return { statusCode: 401, body: 'Invalid token' };
    }

    // invoke the statement lambda synchronously
    const lambda = new LambdaClient({});
    const payload = event.body;
    const invokeCmd = new InvokeCommand({ FunctionName: statementFunctionName, Payload: Buffer.from(JSON.stringify(event)) });
    const invokeRes = await lambda.send(invokeCmd);
    const payloadBytes = invokeRes.Payload ? Buffer.from(await (invokeRes.Payload as any).transformToString()) : null;
    // The invoked function returns API Gateway lambda proxy response; forward it
    if (!invokeRes.Payload) return { statusCode: 502, body: 'Empty response from statement function' };
    const respText = Buffer.from(await (invokeRes.Payload as any).transformToString()).toString();
    // try parse
    let parsed: any;
    try { parsed = JSON.parse(respText); } catch { parsed = respText; }
    // if parsed has isBase64Encoded and body, return base64 with headers
    if (parsed && parsed.isBase64Encoded) {
      return {
        statusCode: parsed.statusCode || 200,
        headers: parsed.headers || { 'Content-Type': 'application/pdf' },
        isBase64Encoded: true,
        body: parsed.body
      };
    }
    return {
      statusCode: parsed?.statusCode || 200,
      headers: parsed?.headers || { 'Content-Type': 'application/json' },
      body: typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
    };
  } catch (err: any) {
    return { statusCode: 500, body: String(err) };
  }
};
