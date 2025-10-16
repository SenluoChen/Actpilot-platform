// lambda/utils/schema.ts
import { z } from "zod";

export const statementSchema = z.object({
  // your existing MVP fields
  company: z.string().min(1),
  email: z.string().email(),
  useCase: z.string().min(1),
  dataSource: z.string().optional(),
  hasHumanSupervision: z.boolean().optional(),
  classification: z.string().optional(),
  label: z.string().optional(),
  explication: z.string().optional(),
  checklist: z.array(z.string()).optional(),

  // Annex IV Ch.1
  intendedPurpose: z.string().optional(),
  providerName: z.string().optional(),
  systemName: z.string().optional(),
  version: z.string().optional(),
  releaseForms: z.array(z.string()).optional(),
  runtimeHW: z.string().optional(),
  swFwVersions: z.array(z.string()).optional(),
  interactions: z.array(z.string()).optional(),
  uiDesc: z.string().optional(),
  instructionsForUse: z.string().optional(),

  // Ch.2
  devMethod: z.string().optional(),
  thirdPartyTools: z.array(z.string()).optional(),
  designLogic: z.string().optional(),
  keyChoices: z.string().optional(),
  optObjective: z.string().optional(),
  paramsRelevance: z.string().optional(),
  expectedOutputs: z.string().optional(),
  complianceTradeoffs: z.string().optional(),
  architecture: z.string().optional(),
  computeUsed: z.string().optional(),
  dataSheets: z
    .object({
      provenance: z.string().optional(),
      scope: z.string().optional(),
      characteristics: z.string().optional(),
      selection: z.string().optional(),
      labelling: z.string().optional(),
      cleaning: z.string().optional()
    })
    .optional(),
  humanOversightPlan: z.string().optional(),
  interpretabilityMeasures: z.string().optional(),
  predeterminedChanges: z.string().optional(),
  validationTesting: z
    .object({
      datasets: z.array(z.string()).optional(),
      metrics: z.array(z.string()).optional(),
      logsRef: z.string().optional(),
      reports: z.array(z.string()).optional()
    })
    .optional(),
  cybersecurity: z.string().optional(),

  // Ch.3
  capabilities: z.string().optional(),
  limitations: z.string().optional(),
  accuracyByGroup: z.record(z.string(), z.number().or(z.string())).optional(),
  overallAccuracy: z.string().optional(),
  foreseeableRisks: z.array(z.string()).optional(),
  oversightMeasures: z.string().optional(),
  inputSpecs: z.string().optional(),

  // Ch.4
  metricJustification: z.string().optional(),

  // Ch.5
  riskProcess: z.string().optional(),

  // Ch.6
  lifecycleChanges: z
    .array(
      z.object({
        version: z.string().optional(),
        change: z.string().optional(),
        impact: z.string().optional(),
        revalidation: z.string().optional()
      })
    )
    .optional(),

  // Ch.7
  harmonisedStandards: z.array(z.string()).optional(),
  otherStandards: z.array(z.string()).optional(),
  equivalenceRationale: z.string().optional(),

  // Ch.8
  euDeclarationFileRef: z.string().optional(),

  // Ch.9
  pmmPlan: z.string().optional(),
  signals: z.array(z.string()).optional()
});

export type StatementPayload = z.infer<typeof statementSchema>;
