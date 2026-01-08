import { createInitialState } from "./types";
import { applyFactsToState } from "./mapToFacts";

export function runPrefillSelfTest() {
  const state = createInitialState();
  const facts = [
    { key: "system_architecture", value: "The system consists of a frontend, API gateway, and backend services." },
    { key: "data_sources", value: "Data sources include internal datasets and user-provided documents." },
    { key: "preprocessing_steps", value: "Preprocessing includes deduplication, normalization, and validation checks." },
    { key: "model_type", value: "Transformer-based classifier." },
    { key: "evaluation_metrics", value: "Accuracy and F1 score are measured on a held-out validation set." },
    { key: "runtime_environment", value: "AWS Lambda Node.js 20 in eu-west-3, with CloudWatch logging." },
  ];

  const { nextState, suggestedKeys } = applyFactsToState(state, facts);
  return { suggestedKeys, filled: {
    system_architecture_overview: nextState.system_architecture_overview,
    data_sources: nextState.data_sources,
    data_preprocessing: nextState.data_preprocessing,
    model_type: nextState.model_type,
    accuracy_metrics: nextState.accuracy_metrics,
    evaluation_protocol: nextState.evaluation_protocol,
    runtime_environment: nextState.runtime_environment,
  }};
}
