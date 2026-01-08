// lambda/utils/annexStructure.ts
// Official-style Annex IV structure for MVP PDF rendering (EN/FR titles)
// Each field.key must match your payload / statement keys.

export type AnnexField =
  | { key: string; type: "string" | "string[]"; required?: boolean }
  | { key: string; type: "object"; required?: boolean }
  | { key: string; type: "object[]"; required?: boolean };

export const annexSections: Array<{
  id: number;
  title: { en: string; fr: string };
  fields: AnnexField[];
}> = [
  {
    id: 1,
    title: { en: "General description of the AI system", fr: "Description générale du système d'IA" },
    fields: [
      { key: "intendedPurpose",  type: "string",   required: true },
      { key: "providerName",     type: "string",   required: true },
      { key: "systemName",       type: "string" },
      { key: "version",          type: "string",   required: true },
      { key: "releaseForms",     type: "string[]", required: true },  // e.g. ["API","embedded","download"]
      { key: "runtimeHW",        type: "string",   required: true },
      { key: "swFwVersions",     type: "string[]" },
      { key: "interactions",     type: "string[]" }, // external systems/AI it interacts with
      { key: "uiDesc",           type: "string" },
      { key: "instructionsForUse", type: "string", required: true }
    ]
  },
  {
    id: 2,
    title: { en: "Elements and development process", fr: "Éléments et processus de développement" },
    fields: [
      { key: "devMethod",             type: "string",   required: true }, // e.g., CRISP-ML(Q)
      { key: "thirdPartyTools",       type: "string[]" },
      { key: "designLogic",           type: "string",   required: true },
      { key: "keyChoices",            type: "string",   required: true }, // assumptions, target users/groups
      { key: "optObjective",          type: "string",   required: true }, // optimization objective(s)
      { key: "paramsRelevance",       type: "string" },
      { key: "expectedOutputs",       type: "string",   required: true },
      { key: "complianceTradeoffs",   type: "string",   required: true },
      { key: "architecture",          type: "string",   required: true }, // high-level architecture
      { key: "computeUsed",           type: "string" }, // training/validation/inference resources
      // dataSheets object: provenance/scope/characteristics/selection/labelling/cleaning
      { key: "dataSheets",            type: "object",   required: true },
      { key: "humanOversightPlan",    type: "string",   required: true }, // Art.14
      { key: "interpretabilityMeasures", type: "string", required: true }, // Art.13(3)(d)
      { key: "predeterminedChanges",  type: "string" }, // predictable changes + how to keep compliance
      // validationTesting object: datasets, metrics, logsRef, reports
      { key: "validationTesting",     type: "object",   required: true },
      { key: "cybersecurity",         type: "string",   required: true }
    ]
  },
  {
    id: 3,
    title: { en: "Monitoring, functioning and control", fr: "Surveillance, fonctionnement et contrôle" },
    fields: [
      { key: "capabilities",      type: "string",   required: true },
      { key: "limitations",       type: "string",   required: true },
      // accuracy by group (object map), overall accuracy as string summary
      { key: "accuracyByGroup",   type: "object" },
      { key: "overallAccuracy",   type: "string" },
      { key: "foreseeableRisks",  type: "string[]", required: true }, // health/safety, fundamental rights, discrimination
      { key: "oversightMeasures", type: "string",   required: true },
      { key: "inputSpecs",        type: "string" }
    ]
  },
  {
    id: 4,
    title: { en: "Appropriateness of performance metrics", fr: "Pertinence des indicateurs de performance" },
    fields: [
      { key: "metricJustification", type: "string", required: true }
    ]
  },
  {
    id: 5,
    title: { en: "Risk management system (Art. 9)", fr: "Système de gestion des risques (art. 9)" },
    fields: [
      { key: "riskProcess", type: "string", required: true } // hazard identification → evaluation → mitigation → residual risk
    ]
  },
  {
    id: 6,
    title: { en: "Lifecycle changes", fr: "Modifications au cours du cycle de vie" },
    fields: [
      // array of change objects {version, change, impact, revalidation}
      { key: "lifecycleChanges", type: "object[]", required: true }
    ]
  },
  {
    id: 7,
    title: { en: "Harmonised standards and technical specifications", fr: "Normes harmonisées et spécifications techniques" },
    fields: [
      { key: "harmonisedStandards",  type: "string[]" }, // Official harmonised standards (OJ listed)
      { key: "otherStandards",       type: "string[]" }, // Other specs used
      { key: "equivalenceRationale", type: "string" }    // If no harmonised standard, explain equivalence
    ]
  },
  {
    id: 8,
    title: { en: "EU Declaration of Conformity", fr: "Déclaration UE de conformité" },
    fields: [
      // either a fileRef string or object with {fileRef}
      { key: "euDeclarationFileRef", type: "string" }
    ]
  },
  {
    id: 9,
    title: { en: "Post-market monitoring (Art. 72)", fr: "Suivi après mise sur le marché (art. 72)" },
    fields: [
      { key: "pmmPlan", type: "string", required: true }, // monitoring plan (KPI, sources, sampling, triggers, incident workflow)
      { key: "signals", type: "string[]" }                // complaints, appeals, bias alerts, etc.
    ]
  }
];

// Human-readable labels for PDF rendering / form UIs
export const fieldDict: Record<string, { en: string; fr: string }> = {
  // Ch.1
  intendedPurpose: { en: "Intended purpose", fr: "Finalité prévue" },
  providerName: { en: "Provider", fr: "Fournisseur" },
  systemName: { en: "System name", fr: "Nom du système" },
  version: { en: "Version", fr: "Version" },
  releaseForms: { en: "Release forms", fr: "Formes de diffusion" },
  runtimeHW: { en: "Runtime hardware", fr: "Matériel d’exécution" },
  swFwVersions: { en: "SW/FW versions", fr: "Versions logicielles" },
  interactions: { en: "External interactions", fr: "Interactions externes" },
  uiDesc: { en: "User interface", fr: "Interface utilisateur" },
  instructionsForUse: { en: "Instructions for use", fr: "Mode d’emploi" },

  // Ch.2
  devMethod: { en: "Development method", fr: "Méthode de développement" },
  thirdPartyTools: { en: "Third-party tools / models", fr: "Outils / modèles tiers" },
  designLogic: { en: "Design logic", fr: "Logique de conception" },
  keyChoices: { en: "Key design choices & assumptions", fr: "Choix de conception et hypothèses clés" },
  optObjective: { en: "Optimization objective", fr: "Objectif d’optimisation" },
  paramsRelevance: { en: "Relevant parameters", fr: "Paramètres pertinents" },
  expectedOutputs: { en: "Expected outputs", fr: "Sorties attendues" },
  complianceTradeoffs: { en: "Compliance trade-offs", fr: "Arbitrages pour la conformité" },
  architecture: { en: "Architecture", fr: "Architecture" },
  computeUsed: { en: "Compute resources", fr: "Ressources de calcul" },
  dataSheets: { en: "Data sheets", fr: "Fiches de données" },
  humanOversightPlan: { en: "Human oversight plan (Art. 14)", fr: "Supervision humaine (art. 14)" },
  interpretabilityMeasures: { en: "Interpretability measures", fr: "Mesures d’interprétabilité" },
  predeterminedChanges: { en: "Predetermined changes", fr: "Modifications prédéterminées" },
  validationTesting: { en: "Validation & testing", fr: "Validation et tests" },
  cybersecurity: { en: "Cybersecurity", fr: "Cybersécurité" },

  // Ch.3
  capabilities: { en: "Capabilities", fr: "Capacités" },
  limitations: { en: "Limitations", fr: "Limites" },
  accuracyByGroup: { en: "Accuracy by group", fr: "Précision par groupe" },
  overallAccuracy: { en: "Overall accuracy", fr: "Précision globale" },
  foreseeableRisks: { en: "Foreseeable risks", fr: "Risques prévisibles" },
  oversightMeasures: { en: "Oversight measures", fr: "Mesures de supervision" },
  inputSpecs: { en: "Input specifications", fr: "Spécifications des entrées" },

  // Ch.4
  metricJustification: { en: "Justification of metrics", fr: "Justification des indicateurs" },

  // Ch.5
  riskProcess: { en: "Risk management process", fr: "Processus de gestion des risques" },

  // Ch.6
  lifecycleChanges: { en: "Lifecycle changes", fr: "Modifications du cycle de vie" },

  // Ch.7
  harmonisedStandards: { en: "Harmonised standards", fr: "Normes harmonisées" },
  otherStandards: { en: "Other standards / specs", fr: "Autres normes / spécifications" },
  equivalenceRationale: { en: "Equivalence rationale", fr: "Justification d’équivalence" },

  // Ch.8
  euDeclarationFileRef: { en: "EU Declaration file", fr: "Fichier de la déclaration UE" },

  // Ch.9
  pmmPlan: { en: "Post-market monitoring plan", fr: "Plan de surveillance post-commercialisation" },
  signals: { en: "Signals", fr: "Signaux" }
};
