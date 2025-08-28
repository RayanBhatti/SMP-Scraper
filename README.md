# SMP-Scraper

A full-stack project that scrapes and displays stock quotes for the **Top 10 S&P 500 companies**.  
It uses **AWS (serverless backend)** for ingestion/storage and a **Next.js + Tailwind frontend** for a clean UI.  

---

## Features

- Fetches real-time stock data for **AAPL, MSFT, NVDA, AMZN, META, GOOGL, GOOG, TSLA, BRK.B, AVGO**.
- **Serverless architecture** (AWS Lambda, API Gateway, DynamoDB, S3).
- **Efficient API usage** (quotes updated once every 10 hours, cached in DynamoDB).
- Frontend auto-refreshes every 30 seconds.
- **Styled with Tailwind CSS** for modern UI.
- History of quotes is saved to S3 for persistence.
- Deployable frontend via **Vercel** or **Netlify**.

---

## Tech Stack

### Frontend
- **Next.js (App Router)** — React framework.
- **Tailwind CSS** — styling and layout.
- Hosted on **Vercel** (or any static Next.js hosting).

### Backend (AWS CDK)
- **Lambda (Python 3.12)**  
  - `FetchTransformFn`: fetches stock quotes via Alpha Vantage API every 10 hours, stores in DynamoDB + S3.  
  - `ApiReadFn`: serves `/latest` and `/history` API routes via API Gateway.  
- **API Gateway (HTTP API)**  
  - Exposes `/latest?ticker=XYZ` and `/history?ticker=XYZ`.  
- **DynamoDB**  
  - Stores the *latest* quote for each ticker.  
- **S3 Bucket**  
  - Stores historical JSON snapshots of quotes.  
- **EventBridge (CloudWatch Events)**  
  - Triggers ingestion Lambda every **10 hours**.  

### Data Provider
- **Alpha Vantage API** — market data source.

---

## How It Works

### 1. Ingestion
- `FetchTransformFn` Lambda runs on an **EventBridge schedule (every 10h)**.
- Pulls quotes for 10 tickers from **Alpha Vantage**.
- Stores:
  - Latest record → **DynamoDB**.
  - Historical record → **S3**.

### 2. Backend API
- `ApiReadFn` Lambda exposes two routes via API Gateway:
  - **`GET /latest?ticker=TSLA`** → returns latest DynamoDB record.
  - **`GET /history?ticker=TSLA`** → fetches last 50 JSON objects from S3.

### 3. Frontend
- Built in Next.js (with Tailwind).
- Calls `/latest` API for all tickers every **30 seconds**.
- Displays in a styled table with:
  - Company name + ticker.
  - Price, change, change % (colored red/green).
  - Last updated timestamp.
- History button fetches `/history` view.

---

## Architecture Overview

```

```

---

## AWS Services Breakdown

| Service         | Purpose                                                                 |
|-----------------|-------------------------------------------------------------------------|
| **Lambda**      | Serverless functions for ingestion (`FetchTransformFn`) and API (`ApiReadFn`). |
| **API Gateway** | Exposes REST endpoints for frontend to fetch data.                      |
| **DynamoDB**    | Stores latest quotes (fast read access).                                |
| **S3**          | Stores JSON history files per ticker.                                   |
| **EventBridge** | Cron-like scheduler (triggers every 10h).                               |
| **CloudWatch**  | Logs Lambda invocations for debugging.                                  |

---

## Local Development

### 1. Clone & install
```bash
git clone https://github.com/RayanBhatti/SMP-Scraper.git
cd SMP-Scraper/frontend
npm install
```

### 2. Environment Variables
Create `.env.local` files:

**Backend (CDK / Lambda):**
```
ALPHAVANTAGE_API_KEY=your_alpha_vantage_key
TICKERS=AAPL,MSFT,NVDA,AMZN,META,GOOGL,GOOG,TSLA,BRK.B,AVGO
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_BASE=https://<your-api-gateway-id>.execute-api.ap-southeast-2.amazonaws.com
```

### 3. Run frontend locally
```bash
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000).

### 4. Deploy backend
From `/infra`:
```bash
npm run build
npx cdk deploy --profile <your-aws-profile>
```

### 5. Deploy frontend
- Push to GitHub.
- Import into **Vercel** → it automatically detects Next.js + Tailwind.

---

## Example API Usage

### Latest
```bash
curl "https://<api-id>.execute-api.ap-southeast-2.amazonaws.com/latest?ticker=AAPL"
```

Response:
```json
{
  "symbol": "AAPL",
  "price": 230.49,
  "change": 1.18,
  "change_pct": 0.51,
  "ts": 1756390625,
  "source": "alphavantage"
}
```

### History
```bash
curl "https://<api-id>.execute-api.ap-southeast-2.amazonaws.com/history?ticker=AAPL"
```

Response: JSON array of last ~50 records.

---

## Future Improvements
- Add **pagination** for history endpoint (beyond last 50).
- Add **frontend charting** (e.g., Recharts).
- Move Alpha Vantage API key to **AWS Secrets Manager**.
- Add CI/CD (GitHub Actions for CDK + Vercel auto-deploy).

---

## Credits
- Alpha Vantage for data.
- AWS CDK for infra.
- Next.js + Tailwind for frontend.
