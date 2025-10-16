export const ANNEX4_V1 = {
  id: 'annex4-v1',
  apiVersion: 'v1',
  sections: [
    {
      id: 'ch1',
      order: 1,
      titles: { en: 'Purpose & Provider', fr: 'But et Fournisseur', zh: '目的與提供者' },
      blocks: [
        {
          id: 'purpose',
          order: 1,
          titles: { en: 'Purpose', fr: 'But', zh: '目的' },
          fields: [
            { id: 'purpose', weight: 100, titles: { en: 'Purpose', fr: 'But', zh: '目的' } }
          ]
        },
        {
          id: 'provider',
          order: 2,
          titles: { en: 'Provider', fr: 'Fournisseur', zh: '提供者' },
          fields: [
            { id: 'provider.name', weight: 100, titles: { en: 'Name', fr: 'Nom', zh: '名稱' } },
            { id: 'provider.version', weight: 110, titles: { en: 'Version', fr: 'Version', zh: '版本' } }
          ]
        },
        {
          id: 'runtime',
          order: 3,
          titles: { en: 'Runtime', fr: 'Exécution', zh: '執行環境' },
          fields: [
            { id: 'runtime.hardware', weight: 100, titles: { en: 'Hardware', fr: 'Matériel', zh: '硬體' } },
            { id: 'runtime.releaseForms', weight: 110, titles: { en: 'Release forms', fr: 'Formes de distribution', zh: '發行形式' } }
          ]
        }
      ]
    },
    {
      id: 'ch2',
      order: 2,
      titles: { en: 'System Description', fr: 'Description du système', zh: '系統描述' },
      blocks: [
        { id: 'overview', order: 1, titles: { en: 'Overview', fr: 'Aperçu', zh: '概述' }, fields: [{ id: 'system.overview', weight: 100, titles: { en: 'Overview', fr: 'Aperçu', zh: '概述' } }] },
        { id: 'components', order: 2, titles: { en: 'Components', fr: 'Composants', zh: '組件' }, fields: [{ id: 'system.components', weight: 100, titles: { en: 'Components', fr: 'Composants', zh: '組件' } }] },
        { id: 'dataFlow', order: 3, titles: { en: 'Data Flow', fr: 'Flux de données', zh: '資料流程' }, fields: [{ id: 'system.dataFlow', weight: 100, titles: { en: 'Data flow', fr: 'Flux de données', zh: '資料流程' } }] }
      ]
    },
    {
      id: 'ch3',
      order: 3,
      titles: { en: 'Development', fr: 'Développement', zh: '開發' },
      blocks: [
        { id: 'design', order: 1, titles: { en: 'Design', fr: 'Conception', zh: '設計' }, fields: [{ id: 'dev.design', weight: 100, titles: { en: 'Design', fr: 'Conception', zh: '設計' } }] },
        { id: 'training', order: 2, titles: { en: 'Training', fr: 'Entraînement', zh: '訓練' }, fields: [{ id: 'dev.training', weight: 100, titles: { en: 'Training', fr: 'Entraînement', zh: '訓練' } }] },
        { id: 'validation', order: 3, titles: { en: 'Validation', fr: 'Validation', zh: '驗證' }, fields: [{ id: 'dev.validation', weight: 100, titles: { en: 'Validation', fr: 'Validation', zh: '驗證' } }] }
      ]
    }
  ]
};

export type Registry = typeof ANNEX4_V1;

export default ANNEX4_V1;
