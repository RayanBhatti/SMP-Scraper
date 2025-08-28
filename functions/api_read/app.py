import os
import json
import boto3
from boto3.dynamodb.conditions import Key  # kept if you add queries later

dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")

TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]


def _to_float(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def handler(event, context):
    path = event.get("rawPath") or ""
    params = event.get("queryStringParameters") or {}
    symbol = params.get("ticker")

    if not symbol:
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "ticker required"})
        }

    if path.endswith("/latest"):
        table = dynamodb.Table(TABLE_NAME)
        resp = table.get_item(Key={"symbol": symbol})
        if "Item" not in resp:
            return {
                "statusCode": 404,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "not found"})
            }

        item = resp["Item"]
        body = {
            "symbol": item.get("symbol"),
            "price": _to_float(item.get("price")),
            "ts": _to_float(item.get("ts")),
            "meta": json.loads(item.get("meta") or "{}"),
            "source": item.get("source") or "alphavantage",
        }
        # Optional fields
        if "change" in item:
            body["change"] = _to_float(item.get("change"))
        if "change_pct" in item:
            body["change_pct"] = _to_float(item.get("change_pct"))

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(body)
        }

    elif path.endswith("/history"):
        # list last 10 objects in S3 for that ticker (most recent first)
        resp = s3.list_objects_v2(
            Bucket=BUCKET_NAME,
            Prefix=f"{symbol}/",
            MaxKeys=50,  # fetch a few more to be safe, we'll slice later
        )
        keys = sorted(
            [o["Key"] for o in resp.get("Contents", []) if o.get("Key")],
            reverse=True
        )[:10]

        items = []
        for key in keys:
            obj = s3.get_object(Bucket=BUCKET_NAME, Key=key)
            items.append(json.loads(obj["Body"].read().decode("utf-8")))

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(items)
        }

    else:
        return {
            "statusCode": 404,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "invalid route"})
        }
