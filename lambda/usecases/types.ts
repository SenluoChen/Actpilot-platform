export type ClassifyResult = {
  classification: string;
  label: string;
  explication: string;
  checklist: string[];
};

export type SubmitInput = {
  company: string;
  email: string;
  useCase: string;
  dataSource?: string;
  hasHumanSupervision?: boolean;
};

export type Statement = {
  id: string;
  version: string;
  company: string;
  email: string;
  submittedAt: string;
  useCase: string;
  dataSource: string;
  hasHumanSupervision: boolean;
  aiAct: {
    level: string;
    label: string;
    rationale: string;
    checklist: string[];
  };
  limitations: string[];
  controls: string[];
};
