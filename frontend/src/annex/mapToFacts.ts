import { AnnexFormState } from "./types";
import { ANNEX_IV_SECTIONS } from "./annexIvFields";

export type Fact = { key: string; value: string | boolean };

type UploadedFact = { key: string; value: unknown; source?: string };

export function mapToFacts(state: AnnexFormState): Fact[] {
  const facts: Fact[] = [];
  for (const section of ANNEX_IV_SECTIONS) {
    for (const field of section.fields) {
      facts.push({ key: field.key, value: state[field.key] });
    }
  }
  return facts;
}

export function applyFactsToState(
  prevState: AnnexFormState,
  facts: UploadedFact[]
): { nextState: AnnexFormState; suggestedKeys: string[] } {
  const nextState: AnnexFormState = { ...prevState };
  const suggested = new Set<string>();

  const keyMap: Record<string, string[]> = {
    system_architecture: ["system_architecture_overview"],
    data_sources: ["data_sources"],
    preprocessing_steps: ["data_preprocessing"],
    model_type: ["model_type"],
    evaluation_metrics: ["accuracy_metrics", "evaluation_protocol"],
    runtime_environment: ["runtime_environment"],
  };

  for (const fact of facts || []) {
    const rawValue = typeof fact?.value === "string" ? fact.value : "";
    const value = rawValue.trim();
    if (!value) continue;
    if (/^MISSING\b/i.test(value)) continue;

    const targets = keyMap[fact.key] || [fact.key];
    for (const targetKey of targets) {
      const current = nextState[targetKey];
      if (typeof current !== "string") continue;
      if (current.trim() !== "") continue;
      nextState[targetKey] = value;
      suggested.add(targetKey);
    }
  }

  return { nextState, suggestedKeys: Array.from(suggested) };
}
