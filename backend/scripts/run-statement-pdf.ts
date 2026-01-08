import { main as statement } from '../lambda/statement';
import fs from 'fs';

(async () => {
  const payload = {
    company: 'ABC Tech',
    email: 'info@abc.com',
    useCase: 'Recrutement',
    classification: 'Haut risque',
    label: 'Rouge',
    explication: 'Domaine listé comme haut risque',
    checklist: ['A', 'B', 'C']
  };

  const event: any = {
    version: '2.0',
    routeKey: 'POST /statement',
    rawPath: '/statement',
    requestContext: { requestId: 'local-pdf-run' },
    headers: { 'content-type': 'application/json', 'accept': 'application/pdf' },
    body: JSON.stringify(payload),
    isBase64Encoded: false
  };

  const res: any = await statement(event);
  console.log('Lambda response:', { statusCode: res.statusCode, headers: res.headers });

  if (res && res.isBase64Encoded && res.body) {
    const buf = Buffer.from(res.body, 'base64');
    fs.mkdirSync('tmp', { recursive: true });
    const out = 'tmp/statement.pdf';
    fs.writeFileSync(out, buf);
    console.log('Wrote PDF to', out);
  } else {
    console.log('No base64 PDF returned, body:', res.body);
  }
})();
