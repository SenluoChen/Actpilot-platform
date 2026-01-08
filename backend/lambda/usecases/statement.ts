import { ClassifyResult, Statement, SubmitInput } from './types';

export function buildStatement(body: SubmitInput, cls: ClassifyResult): Statement {
  return {
    id: 'stmt_' + Date.now().toString(36),
    version: '1.0.0',
    company: body.company,
    email: body.email,
    submittedAt: new Date().toISOString(),
    useCase: body.useCase,
    dataSource: body.dataSource ?? '',
    hasHumanSupervision: !!body.hasHumanSupervision,
    aiAct: {
      level: cls.classification,
      label: cls.label,
      rationale: cls.explication,
      checklist: cls.checklist
    },
    limitations: ['Les biais potentiels dépendent de la qualité des données.'],
    controls: ['Supervision humaine documentée', 'Journalisation de base']
  };
}
