import crypto from 'crypto';

export const sha256Hex = (i: string|Buffer) => crypto.createHash('sha256').update(i).digest('hex');
export const sanitizeCompany = (s: string) => (s||'company').toLowerCase().replace(/[^a-z0-9-_]/g,'-').slice(0,60);
