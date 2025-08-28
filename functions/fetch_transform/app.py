import os
import time
import json
import urllib.request
import urllib.parse
import boto3

# ===== AWS clients =====
dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")

# ===== Env =====
TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
TICKERS = [t.strip() for t in os.environ.get("TICKERS", "").split(",") if t.strip()]
API_KEY = os.environ.get("ALPHAVANTAGE_API_KEY", "")

# pacing & cooldown
BETWEEN_CALL_SLEEP_SECS = float(os.getenv("BETWEEN_CALL_SLEEP_SECS", "1.0"))  # tiny delay between tickers
COOLDOWN_SECS = int(os.getenv("COOLDOWN_SECS", str(10 * 60 * 60)))            # default 10h

CONTROL_PK = "__CONTROL__"   # control row in Dynamo to store last run timestamp


# ===== Helpers =====
def _to_float(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _pct_to_float(v):
    # e.g. "0.5146%" -> 0.5146
    try:
        return float(str(v).strip().rstrip("%"))
    except (TypeError, ValueError):
        return None


def fetch_alpha_quote(symbol: str, api_key: str):
    """
    Call Alpha Vantage GLOBAL_QUOTE for a single symbol.
    Returns a dict with price/change/change_pct or None if no usable data.
    """
    qsym = urllib.parse.quote_plus(symbol)
    url = (
        f"https://www.alphavantage.co/query"
        f"?function=GLOBAL_QUOTE&symbol={qsym}&apikey={api_key}"
    )

    with urllib.request.urlopen(url, timeout=15) as resp:
        if resp.status != 200:
            raise Exception(f"HTTP {resp.status}")
        payload = json.loads(resp.read().decode("utf-8"))

    q = payload.get("Global Quote") or {}
    price = _to_float(q.get("05. price"))
    if price is None:
        return None

    change = _to_float(q.get("09. change"))
    change_pct = _pct_to_float(q.get("10. change percent"))

    # Fallback: compute change if not present
    if change is None:
        prev = _to_float(q.get("08. previous close"))
        if prev is not None:
            change = price - prev
    if change_pct is None and change is not None and price:
        prev = _to_float(q.get("08. previous close"))
        if prev:
            change_pct = (change / prev) * 100.0

    return {
        "symbol": symbol,
        "price": price,
        "change": change,
        "change_pct": change_pct,
        "ts": time.time(),
        "meta": {"provider_symbol": q.get("01. symbol")},
        "source": "alphavantage",
    }


def put_latest(item: dict):
    """
    Store latest snapshot. Numbers are written as strings so we avoid
    float pitfalls with DynamoDB (and convert back on read).
    """
    table = dynamodb.Table(TABLE_NAME)
    db_item = {
        "symbol": item["symbol"],
        "price": str(item["price"]),
        "ts": str(item["ts"]),
        "meta": json.dumps(item.get("meta", {})),
        "source": item.get("source", "alphavantage"),
    }
    if item.get("change") is not None:
        db_item["change"] = str(item["change"])
    if item.get("change_pct") is not None:
        db_item["change_pct"] = str(item["change_pct"])
    table.put_item(Item=db_item)


def put_history(item: dict):
    key = f"{item['symbol']}/{int(item['ts'])}.json"
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=key,
        Body=json.dumps(item).encode("utf-8"),
        ContentType="application/json",
    )


def _get_last_run_ts() -> float | None:
    table = dynamodb.Table(TABLE_NAME)
    resp = table.get_item(Key={"symbol": CONTROL_PK})
    if "Item" not in resp:
        return None
    try:
        return float(resp["Item"].get("ts"))
    except Exception:
        return None


def _set_last_run_ts(ts: float):
    table = dynamodb.Table(TABLE_NAME)
    table.put_item(Item={
        "symbol": CONTROL_PK,
        "ts": str(ts),
        "meta": json.dumps({"note": "cooldown control"}),
        "source": "system",
    })


# ===== Lambda entrypoint =====
def handler(event, context):
    if not API_KEY:
        return {"ingested": [{"symbol": s, "ok": False, "reason": "ALPHAVANTAGE_API_KEY not set"} for s in TICKERS]}

    now = time.time()
    last = _get_last_run_ts()
    if last is not None and (now - last) < COOLDOWN_SECS:
        remaining = int(COOLDOWN_SECS - (now - last))
        return {"skipped": True, "reason": f"cooldown active; {remaining}s remaining"}

    results = []
    for i, sym in enumerate(TICKERS):
        try:
            rec = fetch_alpha_quote(sym, API_KEY)
            if rec is None:
                results.append({"symbol": sym, "ok": False, "reason": "no-data"})
            else:
                put_latest(rec)
                put_history(rec)
                results.append({"symbol": sym, "ok": True})
        except Exception as e:
            results.append({"symbol": sym, "ok": False, "reason": str(e)})

        # tiny pause between calls to be gentle
        if i < len(TICKERS) - 1 and BETWEEN_CALL_SLEEP_SECS > 0:
            time.sleep(BETWEEN_CALL_SLEEP_SECS)

    # set cooldown only after finishing the batch
    _set_last_run_ts(time.time())
    return {"ingested": results}
