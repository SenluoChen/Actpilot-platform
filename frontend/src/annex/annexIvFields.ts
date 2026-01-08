export type FieldType = "text" | "textarea" | "select" | "boolean";

export type AnnexField = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  help?: string;
};

export type AnnexSection = {
  id: string;
  title: string;
  subtitle?: string;
  fields: AnnexField[];
};

export const ANNEX_IV_SECTIONS: AnnexSection[] = [
  {
    id: "provider_admin",
    title: "Provider Information",
    fields: [
      { key: "provider_legal_name", label: "Provider legal name", type: "text", help: "Legal name of the provider as registered." },
      { key: "registered_address", label: "Registered address", type: "text", help: "Registered business address." },
      { key: "country_of_establishment", label: "Country of establishment", type: "text", help: "Country where the provider is legally established." },
      { key: "contact_person", label: "Contact person or function", type: "text", help: "e.g. Compliance Officer / Legal Representative" },
      { key: "contact_email", label: "Contact email", type: "text", help: "Contact email for compliance or regulatory enquiries." },
      { key: "provider_role", label: "Provider role", type: "select", options: ["Provider", "Deployer", "Both"], help: "Select the role(s) the organisation fulfils with respect to the AI system." },
      { key: "system_name", label: "AI system name", type: "text", help: "Name of the AI system." },
      { key: "system_version", label: "AI system version", type: "text", help: "Version identifier of the AI system." },
      { key: "documentation_date", label: "Date of documentation", type: "text", placeholder: "Auto-filled with current date, editable.", help: "Auto-filled with current date, editable." },
    ],
  },
  {
    id: "chapter1",
    title: "CHAPTER 1 - Intended purpose & system description",
    fields: [
      { key: "intended_purpose", label: "Intended purpose", type: "textarea", help: "Description of the specific purpose and context of use of the AI system." },
      { key: "runtime_environment", label: "Runtime environment", type: "textarea", help: "Description of the operational environment in which the system runs." },
      { key: "system_architecture_overview", label: "System architecture overview", type: "textarea", help: "High-level description of system components and their interactions." },
      { key: "intended_users", label: "Intended users / deployers", type: "textarea", help: "Intended users or deployers of the system." },
      { key: "out_of_scope", label: "Out-of-scope use", type: "textarea", help: "Any use of the system outside the intended purpose defined above is considered out of scope." },
      { key: "input_specification", label: "Input specification", type: "textarea", help: "Description of expected input data formats and characteristics." },
      { key: "output_specification", label: "Output specification", type: "textarea", help: "Description of system outputs and their intended interpretation." },
      { key: "system_interactions", label: "Interaction with other systems", type: "textarea", help: "Description of interactions with other systems." },
      { key: "hardware_requirements", label: "Hardware requirements", type: "textarea", help: "No specific hardware requirements beyond standard computing infrastructure." },
      { key: "deployment_constraints", label: "Deployment constraints", type: "textarea", help: "The system shall be deployed in accordance with the provider’s technical guidelines." },
    ],
  },
  {
    id: "chapter2",
    title: "CHAPTER 2 - Data governance",
    fields: [
      { key: "data_sources", label: "Data sources", type: "textarea", help: "Sources of data used by the system." },
      { key: "data_requirements", label: "Data requirements (quality & relevance)", type: "textarea", help: "Data used by the system are expected to be relevant and appropriate for the intended purpose." },
      { key: "data_preprocessing", label: "Data preprocessing", type: "textarea", help: "Description of preprocessing steps applied to input data." },
      { key: "data_labeling", label: "Data labeling / annotation", type: "textarea", help: "Information about any data labeling or annotation processes." },
      { key: "bias_mitigation", label: "Bias mitigation measures", type: "textarea", help: "Measures in place to mitigate bias." },
      { key: "data_provenance", label: "Data provenance / lineage", type: "textarea", help: "Traceability and provenance of data sources." },
      { key: "privacy_personal_data", label: "Personal data & privacy safeguards", type: "textarea", help: "The system is not designed to process personal data beyond what is strictly necessary for operation." },
    ],
  },
  {
    id: "chapter3",
    title: "CHAPTER 3 - Development & training process",
    fields: [
      { key: "model_type", label: "Model type / approach", type: "textarea", help: "Model family or approach (e.g., Transformer, XGBoost)." },
      { key: "training_procedure", label: "Training procedure", type: "textarea", help: "Description of training process if applicable." },
      { key: "evaluation_protocol", label: "Evaluation protocol", type: "textarea", help: "Evaluation and validation protocols." },
      { key: "hyperparameters", label: "Key hyperparameters", type: "textarea", help: "Key hyperparameters used (if training performed)." },
      { key: "versioning", label: "Model versioning & change management", type: "textarea", help: "Versioning and change management practices." },
      { key: "documentation_instructions", label: "Documentation & instructions for use", type: "textarea", help: "Instructions for correct operation and documentation." },
    ],
  },
  {
    id: "chapter4",
    title: "CHAPTER 4 - Monitoring, control & human oversight",
    fields: [
      { key: "human_oversight_measures", label: "Human oversight measures", type: "textarea", help: "Measures to ensure appropriate human oversight." },
      { key: "interpretability_measures", label: "Interpretability / explainability measures", type: "textarea", help: "Measures to support interpretability and explainability." },
      { key: "logging_monitoring", label: "Logging & monitoring", type: "textarea", help: "Logging and monitoring arrangements." },
      { key: "fallback_procedures", label: "Fallback / fail-safe procedures", type: "textarea", help: "Fallback and fail-safe procedures." },
      { key: "post_market_monitoring", label: "Post-market monitoring arrangements", type: "textarea", help: "Post-deployment monitoring arrangements." },
    ],
  },
  {
    id: "chapter5",
    title: "CHAPTER 5 - Performance, limitations & risks",
    fields: [
      { key: "accuracy_metrics", label: "Accuracy metrics & target levels", type: "textarea", help: "Accuracy metrics and targets where applicable." },
      { key: "robustness_considerations", label: "Robustness considerations", type: "textarea", help: "Considerations for robustness to distribution shift and adversarial inputs." },
      { key: "cybersecurity_measures", label: "Cybersecurity measures", type: "textarea", help: "Security measures relevant to the AI system." },
      { key: "known_limitations", label: "Known limitations", type: "textarea", help: "Known limitations of the system." },
      { key: "foreseeable_misuse", label: "Foreseeable misuse / unintended outcomes", type: "textarea", help: "Potential misuse or unintended outcomes." },
      { key: "risk_management_summary", label: "Risk management summary", type: "textarea", help: "Summary of risk management measures." },
    ],
  },
  {
    id: "chapter6",
    title: "CHAPTER 6 - Testing & validation",
    fields: [
      { key: "test_datasets", label: "Test datasets", type: "textarea", help: "Datasets used for testing and validation." },
      { key: "validation_results", label: "Validation results", type: "textarea", help: "Summary of validation results." },
      { key: "stress_testing", label: "Stress testing & edge cases", type: "textarea", help: "Stress testing and edge-case analyses." },
    ],
  },
];
