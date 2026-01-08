
import React from "react";
import { ANNEX_IV_SECTIONS, AnnexSection, AnnexField } from "../annex/annexIvFields";
import { AnnexFormState } from "../annex/types";

import styles from "./AnnexForm.module.css";

interface AnnexFormProps {
  state: AnnexFormState;
  onChange: (key: string, value: string | boolean) => void;
  suggestedKeys?: Set<string>;
}

const AnnexForm: React.FC<AnnexFormProps> = ({ state, onChange, suggestedKeys }) => (
  <div className={styles.annexForm}>
    {ANNEX_IV_SECTIONS.map((section: AnnexSection) => (
      <div className={styles.formSection} key={section.id}>
        <div className={styles.formSectionTitle}>{section.title}</div>
        {section.subtitle && <div className={styles.formSectionSubtitle}>{section.subtitle}</div>}
        <div className={styles.formFields}>
          {section.fields.map((field: AnnexField) => (
            <div className={styles.formField} key={field.key}>
              <label htmlFor={field.key} className={styles.formFieldLabel}>
                <span>{field.label}</span>
                {suggestedKeys?.has(field.key) && (
                  <span className={styles.formFieldSuggested}>Suggested</span>
                )}
              </label>
              {field.type === "text" && (
                <input
                  id={field.key}
                  type="text"
                  value={state[field.key] as string}
                  placeholder={field.placeholder}
                  onChange={e => onChange(field.key, e.target.value)}
                />
              )}
              {field.type === "textarea" && (
                <textarea
                  id={field.key}
                  value={state[field.key] as string}
                  placeholder={field.placeholder}
                  onChange={e => onChange(field.key, e.target.value)}
                  rows={3}
                />
              )}
              {field.type === "select" && field.options && (
                <select
                  id={field.key}
                  value={state[field.key] as string}
                  onChange={e => onChange(field.key, e.target.value)}
                >
                  <option value="">Select...</option>
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
              {field.type === "boolean" && (
                <input
                  id={field.key}
                  type="checkbox"
                  checked={!!state[field.key]}
                  onChange={e => onChange(field.key, e.target.checked)}
                />
              )}
              {field.help && <div className={styles.formFieldHelp}>{field.help}</div>}
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default AnnexForm;
