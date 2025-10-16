# AI Act MVP Backend (AWS CDK + TypeScript)

兩個受 API Key 保護的端點：
- `POST /classify`：根據 `useCase` 粗分 AI Act 風險級別，回傳分類與 checklist
- `POST /statement`：生成「專業聲明」JSON（前端可用來產 PDF）

## 需求
- Node.js 18+
- 已設定 `aws configure` 的 AWS CLI
- AWS CDK v2（`npm i -g aws-cdk`）

## 安裝
```bash
npm install
```

## 本機測 Lambda（不用上雲）
```bash
npm run local
# 或自動重跑：
npm run dev:local
```
此指令會執行 `scripts/local-run.ts`，用 `events/apigw-post.json` 模擬 API Gateway 事件。

## 部署到 AWS
首次在此帳號/區域：
```bash
npx cdk bootstrap
```
之後部署：
```bash
npm run deploy
```
輸出會包含：
- `ApiBaseUrl` 例：`https://xxx.execute-api.eu-west-3.amazonaws.com/prod/`
- `ApiKeyId`：到 AWS Console → API Gateway → API Keys 找到 `ai-act-mvp-key` 顯示 **API key 值**（明文）。

## 測試（雲端）
```bash
API="https://xxx.execute-api.<region>.amazonaws.com/prod"
KEY="<你的API_KEY值>"

# /classify
curl -X POST "$API/classify" \
  -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"company":"ABC Tech","email":"info@abc.com","useCase":"Recrutement","dataSource":"CV + LinkedIn","hasHumanSupervision":true}'

# /statement
curl -X POST "$API/statement" \
  -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"company":"ABC Tech","email":"info@abc.com","useCase":"Recrutement","dataSource":"CV + LinkedIn","hasHumanSupervision":true,"classification":"Haut risque","label":"Rouge","explication":"Domaine listé comme haut risque","checklist":["A","B","C"]}'
```

## 前端整合提示
- `.env` 例：
  ```
  REACT_APP_API_BASE_URL=https://xxx.execute-api.<region>.amazonaws.com/prod
  ```
- 每次 `fetch` 記得加：
  ```js
  headers: { "Content-Type": "application/json", "x-api-key": "<你的API_KEY值>" }
  ```

## 清除資源
```bash
npm run destroy
```

---

> 注意：此專案使用 `NODEJS_20_X` runtime。若你的公司有特定區域/帳號，請在 `bin/app.ts` 設定 `env`。
