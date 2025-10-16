import { z } from "zod";

// Shared fields/types
const base = {
  company: z.string().min(1, "company required"),
  email: z.string().email("invalid email"),
  useCase: z.string().min(1, "useCase required"),
  classification: z.enum(["Minimal-risk","Limited-risk","High-risk"]).optional(),
  label: z.string().optional(),
  explication: z.string().optional(),
  checklist: z.array(z.string()).optional(),
  dataSource: z.string().optional(),
  hasHumanSupervision: z.boolean().optional(),
  intendedPurpose: z.string().optional(),
  providerName: z.string().optional(),
  systemName: z.string().optional(),
  version: z.string().optional(),
  releaseForms: z.array(z.string()).optional(),
  runtimeHW: z.string().optional(),
  swFwVersions: z.string().optional(),
  instructionsForUse: z.string().optional(),
};

// Strict JSON schema (required fields for downstream processing)
export const JsonStrictSchema = z.object({
  ...base,
  classification: z.enum(["Minimal-risk","Limited-risk","High-risk"]),
  label: z.string().min(1),
  explication: z.string().min(1),
  checklist: z.array(z.string()).min(1),
  dataSource: z.string().min(1),
  hasHumanSupervision: z.boolean(),
  intendedPurpose: z.string().min(1),
  providerName: z.string().min(1),
  systemName: z.string().min(1),
  version: z.string().min(1),
  releaseForms: z.array(z.string()).min(1),
  runtimeHW: z.string().min(1),
  swFwVersions: z.string().min(1),
  instructionsForUse: z.string().min(1),
});

// Lax PDF schema (autofill to avoid empty PDFs)
export const PdfLaxSchema = z.object({ ...base }).transform((v) => ({
  company: v.company ?? "N/A",
  email: v.email ?? "N/A",
  useCase: v.useCase ?? "N/A",
  classification: v.classification ?? "Limited-risk",
  label: v.label ?? "LR-UNKNOWN",
  explication: v.explication ?? "Generated for preview/testing.",
  checklist: v.checklist ?? [],
  dataSource: v.dataSource ?? "unspecified",
  hasHumanSupervision: v.hasHumanSupervision ?? true,
  intendedPurpose: v.intendedPurpose ?? "N/A",
  providerName: v.providerName ?? v.company ?? "N/A",
  systemName: v.systemName ?? "Unnamed System",
  version: v.version ?? "0.1",
  releaseForms: v.releaseForms ?? ["SaaS"],
  runtimeHW: v.runtimeHW ?? "unspecified",
  swFwVersions: v.swFwVersions ?? "unspecified",
  instructionsForUse: v.instructionsForUse ?? "N/A",
}));

export type JsonStrict = z.infer<typeof JsonStrictSchema>;
export type PdfLax = z.infer<typeof PdfLaxSchema>;
