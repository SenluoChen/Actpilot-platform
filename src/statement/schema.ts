import { z } from 'zod';

export const StatementSchema = z.object({
  apiVersion: z.literal('v1'),
  template: z.literal('annex4-v1'),
  templateVersion: z.string().optional(),
  theme: z.string().default('actpilot-blue'),
  locale: z.union([z.literal('en'), z.literal('fr'), z.literal('zh')]).default('en'),
  options: z.object({
    layoutPolicy: z.union([z.literal('compact'), z.literal('balanced'), z.literal('fill')]).default('balanced'),
    autoColumns: z.boolean().optional(),
    collapseEmptySections: z.boolean().optional(),
    promoteSingletonBlocks: z.boolean().optional(),
    minItemsToShow: z.number().optional(),
    densityScale: z.number().optional(),
    toc: z.boolean().optional(),
    pageNumbers: z.boolean().optional(),
    autoSummary: z.boolean().optional()
  }).optional(),
  payload: z.object({
    purpose: z.string().optional(),
    provider: z.object({ name: z.string().optional(), version: z.string().optional() }).optional(),
    runtime: z.object({ hardware: z.string().optional(), releaseForms: z.array(z.string()).optional() }).optional(),
    system: z.object({ overview: z.string().optional(), components: z.array(z.any()).optional(), dataFlow: z.string().optional() }).optional(),
    dev: z.object({ design: z.string().optional(), training: z.string().optional(), validation: z.string().optional() }).optional()
  }).optional(),
  orderingOverrides: z.any().optional()
});

export type StatementInput = z.infer<typeof StatementSchema>;

export const PdfLaxSchema = StatementSchema.partial().passthrough();

export default StatementSchema;
