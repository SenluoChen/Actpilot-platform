import { APIGatewayProxyHandler } from 'aws-lambda';

type Fact = { key: string; value: unknown };

type ComposedItem = { key: string; label: string; value: string };
export type ComposedSection = { id: string; title: string; items: ComposedItem[] };

type ComposeBody = {
  facts?: Fact[];
};

function parseJsonBody(event: any): any {
  if (!event?.body) return {};
  if (event.isBase64Encoded) {
    const raw = Buffer.from(event.body, 'base64').toString('utf8');
    return JSON.parse(raw);
  }
  return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'string') return value.trim();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function buildFactMap(facts: Fact[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of facts || []) {
    const key = (f?.key ?? '').toString().trim();
    if (!key) continue;
    const value = toText(f.value);
    if (!value) continue;
    map[key] = value;
  }
  return map;
}

function composeSectionsFromFacts(facts: Fact[]): { systemName: string; sections: ComposedSection[] } {
  const m = buildFactMap(facts);

  const systemName = m.system_name || m.intended_use_case || 'AI System';

  const schema: Array<{ id: string; title: string; fields: Array<{ key: string; label: string }> }> = [
    {
      id: 'basic',
      title: 'BASIC',
      fields: [
        { key: 'company_name', label: 'Company' },
        { key: 'contact_email', label: 'Email' },
        { key: 'system_name', label: 'AI system name' },
        { key: 'intended_use_case', label: 'Use case' },
      ],
    },
    {
      id: 'chapter1',
      title: 'CHAPTER 1 – Intended purpose / Provider / Runtime',
      fields: [
        { key: 'intended_purpose', label: 'Intended purpose' },
        { key: 'provider_name', label: 'Provider name' },
        { key: 'runtime_environment', label: 'Runtime environment' },
        { key: 'system_architecture_overview', label: 'System architecture overview' },
        { key: 'intended_users', label: 'Intended users / deployers' },
        { key: 'out_of_scope', label: 'Out-of-scope use' },
        { key: 'input_specification', label: 'Input specification' },
        { key: 'output_specification', label: 'Output specification' },
        { key: 'system_interactions', label: 'Interactions with other systems' },
        { key: 'hardware_requirements', label: 'Hardware requirements' },
        { key: 'deployment_constraints', label: 'Deployment constraints' },
      ],
    },
    {
      id: 'chapter2',
      title: 'CHAPTER 2 – Data governance',
      fields: [
        { key: 'data_sources', label: 'Data sources' },
        { key: 'data_requirements', label: 'Data requirements (quality, relevance)' },
        { key: 'data_preprocessing', label: 'Data preprocessing' },
        { key: 'data_labeling', label: 'Data labeling / annotation process' },
        { key: 'bias_mitigation', label: 'Bias mitigation measures' },
        { key: 'data_provenance', label: 'Data provenance / lineage' },
        { key: 'privacy_personal_data', label: 'Personal data & privacy safeguards' },
      ],
    },
    {
      id: 'chapter3',
      title: 'CHAPTER 3 – Development & training process',
      fields: [
        { key: 'model_type', label: 'Model type / approach' },
        { key: 'training_procedure', label: 'Training procedure' },
        { key: 'evaluation_protocol', label: 'Evaluation protocol' },
        { key: 'hyperparameters', label: 'Key hyperparameters' },
        { key: 'versioning', label: 'Model/versioning & change management' },
        { key: 'documentation_instructions', label: 'Documentation & instructions for use' },
      ],
    },
    {
      id: 'chapter4',
      title: 'CHAPTER 4 – Monitoring, control & human oversight',
      fields: [
        { key: 'human_oversight_measures', label: 'Human oversight measures' },
        { key: 'interpretability_measures', label: 'Interpretability / explainability measures' },
        { key: 'logging_monitoring', label: 'Logging & monitoring' },
        { key: 'fallback_procedures', label: 'Fallback / fail-safe procedures' },
        { key: 'post_market_monitoring', label: 'Post-market monitoring arrangements' },
      ],
    },
    {
      id: 'chapter5',
      title: 'CHAPTER 5 – Performance, limitations & risks',
      fields: [
        { key: 'accuracy_metrics', label: 'Accuracy metrics & target levels' },
        { key: 'robustness', label: 'Robustness considerations' },
        { key: 'cybersecurity', label: 'Cybersecurity measures' },
        { key: 'known_limitations', label: 'Known limitations' },
        { key: 'foreseeable_misuse', label: 'Foreseeable misuse / unintended outcomes' },
        { key: 'risk_management_summary', label: 'Risk management summary' },
      ],
    },
    {
      id: 'chapter6',
      title: 'CHAPTER 6 – Testing & validation',
      fields: [
        { key: 'test_datasets', label: 'Test datasets description' },
        { key: 'validation_results', label: 'Validation results' },
        { key: 'stress_testing', label: 'Stress testing / edge cases' },
      ],
    },
  ];

  const sections: ComposedSection[] = schema.map((s) => {
    const items: ComposedItem[] = s.fields
      .map((f) => ({ key: f.key, label: f.label, value: m[f.key] || '' }))
      .filter((it) => it.value.trim() !== '');

    return { id: s.id, title: s.title, items };
  });

  return { systemName, sections };
}

export const main: APIGatewayProxyHandler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Content-Type': 'application/json',
  };

  const method = (event as any)?.httpMethod || (event.requestContext as any)?.http?.method;
  if (method === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    let body: ComposeBody;
    try {
      body = parseJsonBody(event);
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ erreur: 'Invalid JSON body' }) };
    }

    const facts = Array.isArray(body?.facts) ? body.facts : [];
    const composed = composeSectionsFromFacts(facts);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(composed),
    };
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : String(e);
    return { statusCode: 500, headers, body: JSON.stringify({ erreur: msg }) };
  }
};
