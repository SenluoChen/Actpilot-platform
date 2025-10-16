import ANNEX4_V1 from './registry';
import { StatementSchema } from './schema';
import { z } from 'zod';

export const main = async () => {
  // return zod schema -> JSON schema via simple mapping
  const jsonSchema = { type: 'object', title: 'StatementInput (zod derived)', properties: {} };
  // minimal mapping for demonstration
  jsonSchema.properties = { apiVersion: { const: 'v1' }, template: { const: 'annex4-v1' } };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Accept,Authorization,x-api-key' },
    body: JSON.stringify({ apiVersion: 'v1', jsonSchema, registrySummary: ANNEX4_V1 })
  };
};
