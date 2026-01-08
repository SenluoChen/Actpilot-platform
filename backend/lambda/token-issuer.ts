import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import jwt from 'jsonwebtoken';

const secretName = process.env.JWT_SECRET_NAME || '/ai-act-mvp/jwt-secret';

export const main = async (event: any) => {
  try {
    // simple admin-only token issuer - in production restrict who can call this
    const sm = new SecretsManagerClient({});
    const cmd = new GetSecretValueCommand({ SecretId: secretName });
    const res = await sm.send(cmd);
    const secretString = res.SecretString ? JSON.parse(res.SecretString).secret : process.env.JWT_SECRET;
    if (!secretString) return { statusCode: 500, body: 'Signing secret not found' };

    // issue a short-lived token (e.g., 10 minutes)
    const token = jwt.sign({ iss: 'ai-act-mvp' }, secretString, { algorithm: 'HS256', expiresIn: '10m' });
    return { statusCode: 200, body: JSON.stringify({ token }) };
  } catch (err: any) {
    return { statusCode: 500, body: String(err) };
  }
};
