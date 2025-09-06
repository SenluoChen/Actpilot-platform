import { ClassifyResult } from './types';

export function classify(useCaseRaw: string): ClassifyResult {
  const txt = (useCaseRaw || '').toLowerCase();
  const HIGH = /(recrut|éduc|educ|santé|sante|health|finance|banque|crédit|credit|assur)/;
  const LIMITED = /(générative|generative|chatbot|marketing|recommand|assist|vision|speech|traduction|translation)/;

  if (HIGH.test(txt)) {
    return {
      classification: 'Haut risque',
      label: 'Rouge',
      explication: "Domaine listé comme 'haut risque' (ex. recrutement/éducation/santé/finance).",
      checklist: [
        'Enregistrer les jeux de données (provenance, qualité, biais).',
        'Mettre en place une supervision humaine documentée.',
        'Définir un registre de gestion des risques + suivi post-déploiement.',
        'Préparer une déclaration de transparence (objectifs, limites, performance).'
      ]
    };
  }
  if (LIMITED.test(txt)) {
    return {
      classification: 'Risque limité',
      label: 'Orange',
      explication: 'Transparence/étiquetage requis (ex. système génératif, chatbot, recommandation).',
      checklist: [
        'Informer l’utilisateur du caractère IA / génératif.',
        'Documenter les limites et risques connus.',
        'Permettre un recours humain pour les décisions importantes.',
        'Journaliser l’usage (audit de base).'
      ]
    };
  }
  return {
    classification: 'Hors champ / Minime',
    label: 'Vert',
    explication: 'Cas d’usage non répertorié comme haut risque ; bonnes pratiques recommandées.',
    checklist: [
      'Documenter brièvement les données et objectifs.',
      'Informer l’utilisateur en cas d’ambiguïté.',
      'Revue éthique interne simple.'
    ]
  };
}
