# ASX Scraper — Serverless API + Vercel Demo (Windows-friendly CDK)

Tiny serverless stack: AWS Lambda (Python 3.12), DynamoDB (latest), S3 (history JSONL), API Gateway (HTTP API),
EventBridge (cron). Frontend with Next.js.

This package is **Windows/PowerShell friendly**: CDK compiles TS to JS (CommonJS), then runs Node on `dist/`.

## Quickstart

### Prereqs
- AWS CLI configured (`aws configure`) in ap-southeast-2
- Node.js 18+ (prefer 20)
- Python 3.12
- AlphaVantage API key: https://www.alphavantage.co/support/#api-key

### Deploy backend (PowerShell)
```powershell
cd infra
npm install
npm run build
$env:ALPHAVANTAGE_API_KEY="YOUR_KEY"
$env:TICKERS="BHP.AX,CBA.AX,ANZ.AX,WBC.AX,NAB.AX"
npx cdk bootstrap
npm run deploy
```
Copy the **ApiUrl** output when finished.

### Test API
```powershell
$API="<ApiUrl>"
curl "$API/latest?ticker=BHP.AX"
curl "$API/history?ticker=BHP.AX&date=$(Get-Date -UFormat %Y-%m-%d)"
```

### Run frontend
```powershell
cd ../frontend
Copy-Item .env.local.example .env.local
# edit .env.local and set NEXT_PUBLIC_API_URL to the ApiUrl
npm install
npm run dev
```
Open http://localhost:3000

### Deploy frontend to Vercel
- Push repo to GitHub.
- Import `frontend/` in Vercel.
- Set env var `NEXT_PUBLIC_API_URL` to your ApiUrl.
- Deploy.
