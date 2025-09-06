import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({});

export async function putJson(bucket: string, key: string, obj: any) {
  const Body = Buffer.from(JSON.stringify(obj));
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body, ContentType: 'application/json' }));
}

export async function putBuffer(bucket: string, key: string, buffer: Buffer, contentType: string) {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }));
}

export async function presignGet(bucket: string, key: string, seconds = 600) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: seconds });
}
