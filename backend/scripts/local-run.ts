import { main as classify } from '../lambda/classify';
import { main as statement } from '../lambda/statement';
import fs from 'fs';

(async () => {
  const event = JSON.parse(fs.readFileSync('events/apigw-post.json','utf8'));
  console.log('\n--- Local classify ---');
  console.log(await classify(event));

  const payload = {
    company: 'ABC Tech',
    email: 'info@abc.com',
    useCase: 'Recrutement',
    dataSource: 'CV + LinkedIn',
    hasHumanSupervision: true,
    classification: 'Haut risque',
    label: 'Rouge',
    explication: 'Domaine listé comme haut risque',
    checklist: ['A','B','C']
  };
  const statementEvent = { ...event, body: JSON.stringify(payload) };
  console.log('\n--- Local statement ---');
  console.log(await statement(statementEvent));
})();
