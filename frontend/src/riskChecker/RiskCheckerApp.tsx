import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Info,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from "lucide-react";

import Intro from "./Intro";
import "./riskChecker.css";
import ProgressBar from "../components/ProgressBar";
import ArticleIcon from '@mui/icons-material/Article';

type RiskLevel = "prohibited" | "high" | "limited" | "minimal";

type Question = {
  id: string;
  title: string;
  help?: string;
  options: {
    id: string;
    label: string;
    description?: string;
    score?: Partial<Record<RiskLevel, number>>;
    tags?: RiskLevel[];
  }[];
};

type Result = {
  level: RiskLevel;
  title: string;
  summary: string;
  obligations: string[];
  notes: string[];
};

const QUESTIONS: Question[] = [
  {
    id: "q1_domain",
    title: "What is the primary use case of the AI system?",
    help: "EU AI Act risk depends heavily on the application domain and potential impact.",
    options: [
      {
        id: "critical",
        label: "Critical infrastructure / safety",
        description: "Transport, energy, water, healthcare devices",
        tags: ["high"],
        score: { high: 3 },
      },
      {
        id: "employment",
        label: "Employment / worker management",
        description: "Hiring, promotion, performance evaluation",
        tags: ["high"],
        score: { high: 3 },
      },
      {
        id: "education",
        label: "Education / training",
        description: "Admissions, exams, assessment",
        tags: ["high"],
        score: { high: 2 },
      },
      {
        id: "biometrics",
        label: "Biometrics / identity verification",
        description: "Face recognition, identity matching",
        tags: ["high"],
        score: { high: 3 },
      },
      {
        id: "consumer",
        label: "General consumer product",
        description: "Assistants, recommendations, analytics",
        tags: ["limited", "minimal"],
        score: { limited: 1, minimal: 1 },
      },
      {
        id: "other",
        label: "Other / not listed",
        description: "A mixed or niche use case",
        tags: ["limited"],
        score: { limited: 1 },
      },
    ],
  },
  {
    id: "q2_prohibited",
    title: "Does the system involve prohibited practices?",
    help: "Examples include manipulative or exploitative techniques that cause harm, social scoring by public authorities, and certain biometric categorisation.",
    options: [
      {
        id: "yes",
        label: "Yes / likely",
        description: "Could include prohibited patterns",
        tags: ["prohibited"],
        score: { prohibited: 6 },
      },
      {
        id: "no",
        label: "No",
        description: "Does not fit prohibited practices",
        tags: ["minimal"],
        score: { minimal: 1 },
      },
      {
        id: "unsure",
        label: "Not sure",
        description: "Need legal review",
        tags: ["high"],
        score: { high: 2 },
      },
    ],
  },
  {
    id: "q3_decisions",
    title: "Does it make or support decisions with legal or similarly significant effects on people?",
    help: "E.g. access to employment, credit, insurance, education, essential services.",
    options: [
      {
        id: "yes",
        label: "Yes",
        description: "Material effect on individuals",
        tags: ["high"],
        score: { high: 3 },
      },
      {
        id: "no",
        label: "No",
        description: "Only minor or no impact",
        tags: ["limited", "minimal"],
        score: { limited: 1, minimal: 1 },
      },
    ],
  },
  {
    id: "q4_genai",
    title: "Is it a general-purpose AI model or a generative AI system?",
    help: "General-purpose and generative systems may carry transparency and documentation duties.",
    options: [
      {
        id: "genai",
        label: "Yes",
        description: "Text/image/audio generation or GPAI",
        tags: ["limited"],
        score: { limited: 2 },
      },
      {
        id: "no",
        label: "No",
        description: "Not generative / not GPAI",
        tags: ["minimal"],
        score: { minimal: 1 },
      },
    ],
  },
  {
    id: "q5_transparency",
    title: "Does the system interact directly with users (e.g. chatbot)?",
    help: "Transparency obligations typically apply to user-facing AI interactions.",
    options: [
      {
        id: "yes",
        label: "Yes",
        description: "Users directly see or talk to AI",
        tags: ["limited"],
        score: { limited: 2 },
      },
      {
        id: "no",
        label: "No",
        description: "Back-office or internal only",
        tags: ["minimal"],
        score: { minimal: 1 },
      },
    ],
  },
];

const RESULTS: Record<RiskLevel, Result> = {
  prohibited: {
    level: "prohibited",
    title: "Prohibited",
    summary:
      "This appears to match practices the EU AI Act generally prohibits. You should stop deployment and seek legal guidance.",
    obligations: [
      "Do not place on the market / put into service if prohibited",
      "Perform legal review with EU AI Act counsel",
      "Document assessment and decision trail",
      "If unsure, consult counsel (heuristic)",
    ],
    notes: [
      "This is a heuristic. If unsure, consult counsel.",
      "Edge cases exist depending on exact features and context. 區塊要在Key obligations",
      "Do not place on the market / put into service if prohibited",
      "Perform legal review with EU AI Act counsel",
    ],
  },
  high: {
    level: "high",
    title: "High risk",
    summary:
      "Your use case may be considered high-risk. Expect strong compliance duties: risk management, documentation, and human oversight.",
    obligations: [
      "Risk management system (identify & mitigate risks)",
      "Technical documentation & record-keeping",
      "Data governance and quality controls",
      "Human oversight + transparency to deployers/users",
      "Post-market monitoring and incident reporting",
    ],
    notes: [
      "Whether it is legally high-risk depends on Annex III and context.",
      "Plan evidence and controls early to avoid rework.",
    ],
  },
  limited: {
    level: "limited",
    title: "Limited risk",
    summary:
      "This likely triggers transparency duties rather than full high-risk controls.",
    obligations: [
      "Transparency to users when interacting with AI",
      "Label AI-generated content where required",
      "Provide basic instructions and limitations",
    ],
    notes: [
      "Generative / user-facing systems often sit here.",
      "Some use cases can still be high-risk depending on domain.",
    ],
  },
  minimal: {
    level: "minimal",
    title: "Minimal risk",
    summary:
      "This likely falls into minimal risk. General good practices still apply (security, privacy, documentation).",
    obligations: ["General good practice: security, privacy, and documentation"],
    notes: [
      "Even minimal-risk AI can face other laws (privacy, consumer, sector rules).",
    ],
  },
};

function levelIcon(level: RiskLevel) {
  switch (level) {
    case "prohibited":
      return <ShieldX size={18} />;
    case "high":
      return <ShieldAlert size={18} />;
    case "limited":
      return <CircleHelp size={18} />;
    case "minimal":
      return <ShieldCheck size={18} />;
  }
}

function pickLevel(score: Record<RiskLevel, number>): RiskLevel {
  if (score.prohibited > 0) return "prohibited";
  if (score.high >= 5) return "high";
  if (score.high >= 3) return "high";
  if (score.limited >= 3) return "limited";
  if (score.limited >= 1) return "limited";
  return "minimal";
}

export default function RiskCheckerApp() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const score = useMemo(() => {
    const totals: Record<RiskLevel, number> = {
      prohibited: 0,
      high: 0,
      limited: 0,
      minimal: 0,
    };

    for (const q of QUESTIONS) {
      const picked = answers[q.id];
      if (!picked) continue;
      const opt = q.options.find((o) => o.id === picked);
      if (!opt?.score) continue;
      for (const k of Object.keys(opt.score) as RiskLevel[]) {
        totals[k] += opt.score[k] ?? 0;
      }
    }

    return totals;
  }, [answers]);

  const currentQuestion = QUESTIONS[step];
  const isComplete = started && step >= QUESTIONS.length;
  const level = useMemo(() => pickLevel(score), [score]);
  const result = RESULTS[level];

  const reset = () => {
    setStarted(false);
    setStep(0);
    setAnswers({});
  };

  const start = () => {
    setStarted(true);
    setStep(0);
  };

  const next = () => {
    setStep((s) => Math.min(s + 1, QUESTIONS.length));
  };

  const back = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const setAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const canGoNext =
    started &&
    (step >= QUESTIONS.length || (currentQuestion && Boolean(answers[currentQuestion.id])));

  return (
    <div className="riskScope">
      <main className="page">
        <div className="container">
          {/* header branding removed per request */}

          {!started ? (
            <Intro onStart={start} onReset={reset} />
          ) : isComplete ? (
            <div className="grid">
              <div className="card resultCard">
                <button type="button" className="resetBtn btn btn--ghost" onClick={reset} aria-label="Reset">
                  <RotateCcw size={18} />
                </button>
                <header className="resultHeader">
                  <div className={`pill resultPill resultPill--${level}`}>
                    {levelIcon(level)}
                    {result.title}
                  </div>
                </header>

                <section className="resultSummary">
                  <h2 className="resultTitle"><ArticleIcon className="summaryIcon" />Summary</h2>
                  <p className="muted resultSummaryText">{result.summary}</p>
                </section>

                <section className="resultSection">
                  <h3 className="resultSectionTitle">Key obligations</h3>
                  <div className="resultList">
                    {result.obligations.map((o) => (
                      <div key={o} className="resultItem">
                        <span className="resultItemIcon" aria-hidden="true">
                          <CheckCircle2 size={18} />
                        </span>
                        <div className="resultItemText">{o}</div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Notes section removed per design request */}
              </div>
            </div>
          ) : (
            <div className="card">
              <button type="button" className="resetBtn btn btn--ghost" onClick={reset} aria-label="Reset">
                <RotateCcw size={18} />
              </button>
              <div style={{ marginBottom: 12 }}>
                <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>
                  Step {step + 1} of {QUESTIONS.length}
                </div>
                <ProgressBar percent={Math.round(((step + 1) / QUESTIONS.length) * 100)} label={""} />
              </div>

              <div className="section">
                <div className="questionHeader">
                  <span className="titleDot" aria-hidden="true" />
                  <h2 className="title">{currentQuestion.title}</h2>
                </div>
                {currentQuestion.help ? (
                  <p className="muted" style={{ marginTop: 6 }}>
                    {currentQuestion.help}
                  </p>
                ) : null}
              </div>

              <div className="options section">
                {currentQuestion.options.map((o) => {
                  const active = answers[currentQuestion.id] === o.id;
                  return (
                    <button
                      key={o.id}
                      className={`option ${active ? "option--active" : ""}`}
                      onClick={() => setAnswer(currentQuestion.id, o.id)}
                      type="button"
                    >
                      <div className="optionLabel">{o.label}</div>
                      {o.description ? (
                        <div className="muted" style={{ marginTop: 6 }}>
                          {o.description}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="section row" style={{ justifyContent: "space-between" }}>
                <button className="btn" onClick={back} disabled={step === 0}>
                  <ArrowLeft size={18} />
                  Back
                </button>
                <button className="btn btn--primary" onClick={next} disabled={!canGoNext}>
                  Next
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
