import json, time, urllib.request

def _maybe_float(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None

def _pct_to_float(v):
    try:
        return float(str(v).strip().rstrip('%'))
    except (TypeError, ValueError):
        return None

def fetch_quote(symbol: str, api_key: str):
    url = (
        f"https://www.alphavantage.co/query"
        f"?function=GLOBAL_QUOTE&symbol={symbol}&apikey={api_key}"
    )
    with urllib.request.urlopen(url) as resp:
        if resp.status != 200:
            raise Exception(f"HTTP {resp.status}")
        data = json.loads(resp.read().decode())

    q = data.get("Global Quote") or {}
    price = _maybe_float(q.get("05. price"))
    change = _maybe_float(q.get("09. change"))
    change_pct = _pct_to_float(q.get("10. change percent"))

    if price is None:
        # treat as no-data so the ingest loop can continue
        return None

    return {
        "symbol": symbol,
        "price": price,
        "change": change,
        "change_pct": change_pct,
        "ts": time.time(),
        "meta": {"provider_symbol": q.get("01. symbol")},
        "source": "alphavantage",
    }
