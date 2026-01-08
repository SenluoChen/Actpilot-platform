import { ANNEX_IV_SECTIONS } from "./annexIvFields";

export type AnnexFormState = Record<string, string | boolean>;

export function createInitialState(): AnnexFormState {
  const state: AnnexFormState = {};
  for (const s of ANNEX_IV_SECTIONS) {
    for (const f of s.fields) state[f.key] = f.type === "boolean" ? false : "";
  }
  return state;
}
