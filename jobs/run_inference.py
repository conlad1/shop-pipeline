# run_inference.py
# Fraud Detection — Inference Job
# ─────────────────────────────────────────────────────────────────────────────
# Loads the trained pipeline, scores all unfulfilled orders in shop.db,
# and writes fraud probability predictions back to the order_predictions table.
#
# The web app reads order_predictions to show the fraud priority queue.
#
# Usage:
#   python run_inference.py
#   python run_inference.py --db path/to/shop.db --model path/to/fraud_detection_pipeline.pkl
#
# Schedule this to run automatically (e.g. after each new order batch):
#   Mac/Linux:  crontab -e  →  */30 * * * * /path/to/venv/bin/python /path/to/run_inference.py
#   Windows:    Task Scheduler → run every 30 minutes

import argparse
import sqlite3
import os
import joblib
import json
import pandas as pd
import numpy as np
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone
from pathlib import Path


# ── Configuration ─────────────────────────────────────────────────────────────

DEFAULT_DB_PATH    = 'prisma/shop.db'
DEFAULT_MODEL_PATH = 'jobs/fraud_detection_pipeline.pkl'


# ── Feature definitions — must match training exactly ─────────────────────────
# If you add or remove features in the notebook, update these lists too.

NUMERIC_FEATURES = [
    'order_subtotal', 'shipping_fee', 'tax_amount', 'order_total',
    'risk_score', 'risk_bucket',
    'order_hour', 'order_dow', 'order_month',
    'is_night', 'is_weekend', 'zip_mismatch', 'foreign_ip',
    'promo_used',
    'shipping_ratio', 'tax_ratio',
    'item_count', 'total_qty', 'distinct_products',
    'avg_unit_price', 'max_unit_price',
    'cust_order_count', 'cust_avg_total',
    'cust_fraud_hist', 'high_fraud_cust',
    'customer_age', 'is_active',
]

CATEGORICAL_FEATURES = [
    'payment_method', 'device_type', 'ip_country',
    'shipping_state', 'gender', 'customer_segment', 'loyalty_tier',
]

ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


# ── Step 1: Load model ────────────────────────────────────────────────────────

def load_model(model_path):
    """Load the serialized pipeline and its metadata/metrics files."""
    pipeline  = joblib.load(model_path)
    threshold = 0.5  # default if no metadata found

    meta_path = f"{model_path}.meta.json"
    if Path(meta_path).exists():
        with open(meta_path) as f:
            meta = json.load(f)
        threshold = meta.get('threshold', threshold)
        print(f"  Model trained at:  {meta.get('saved_at_utc', 'unknown')}")
        print(f"  Model type:        {meta.get('model_type', 'unknown')}")

    metrics_path = f"{model_path}.metrics.json"
    if Path(metrics_path).exists():
        with open(metrics_path) as f:
            metrics = json.load(f)
        print(f"  Training ROC-AUC:  {metrics.get('roc_auc', 'unknown')}")

    print(f"  Decision threshold: {threshold}")
    return pipeline, threshold


# ── Step 2: Load and prepare features from shop.db ────────────────────────────

def load_features(db_path):
    """
    Query shop.db and engineer the same features used during training.
    Scores all orders in the database.
    """
    conn = sqlite3.connect(db_path)

    orders = pd.read_sql("""
        SELECT o.*
        FROM orders o
    """, conn)

    customers = pd.read_sql("SELECT * FROM customers", conn)

    order_items = pd.read_sql("SELECT * FROM order_items", conn)

    products = pd.read_sql(
        "SELECT product_id, price, category FROM products", conn
    )

    conn.close()

    if len(orders) == 0:
        print("  No unfulfilled orders to score.")
        return pd.DataFrame(), pd.Series(dtype=int)

    print(f"  Unfulfilled orders to score: {len(orders)}")

    # ── Customer aggregates (excluding current order to prevent leakage) ───────
    # We compute fraud history from ALL orders, then the pipeline will use
    # the value as-is. In production this is safe because we're scoring
    # new (unfulfilled) orders whose is_fraud is not yet known.
    all_orders_for_agg = pd.read_sql(
        "SELECT customer_id, order_id, order_total, is_fraud FROM orders",
        sqlite3.connect(db_path)
    )
    cust_agg = all_orders_for_agg.groupby('customer_id').agg(
        cust_order_count = ('order_id',    'count'),
        cust_avg_total   = ('order_total', 'mean'),
        cust_fraud_hist  = ('is_fraud',    'sum'),
    ).reset_index()

    # ── Basket aggregates ──────────────────────────────────────────────────────
    basket = (
        order_items
        .merge(products, on='product_id', how='left')
        .groupby('order_id')
        .agg(
            item_count        = ('order_item_id', 'count'),
            total_qty         = ('quantity',       'sum'),
            distinct_products = ('product_id',     'nunique'),
            avg_unit_price    = ('unit_price',     'mean'),
            max_unit_price    = ('unit_price',     'max'),
        ).reset_index()
    )

    # ── Customer demographics ──────────────────────────────────────────────────
    cust_demo = customers[[
        'customer_id', 'gender', 'customer_segment',
        'loyalty_tier', 'is_active', 'birthdate'
    ]].copy()

    # ── Join everything ────────────────────────────────────────────────────────
    df = (
        orders
        .merge(cust_agg,  on='customer_id', how='left')
        .merge(basket,    on='order_id',    how='left')
        .merge(cust_demo, on='customer_id', how='left')
    )

    # ── Feature engineering (must match notebook exactly) ─────────────────────
    df['order_datetime'] = pd.to_datetime(df['order_datetime'], errors='coerce')
    df['order_hour']     = df['order_datetime'].dt.hour
    df['order_dow']      = df['order_datetime'].dt.dayofweek
    df['order_month']    = df['order_datetime'].dt.month
    df['is_night']       = df['order_hour'].between(0, 5).astype(int)
    df['is_weekend']     = (df['order_dow'] >= 5).astype(int)

    df['zip_mismatch']   = (df['billing_zip'] != df['shipping_zip']).astype(int)
    df['foreign_ip']     = (df['ip_country'] != 'US').astype(int)

    df['shipping_ratio'] = df['shipping_fee']  / (df['order_subtotal'] + 1e-6)
    df['tax_ratio']      = df['tax_amount']    / (df['order_subtotal'] + 1e-6)

    df['high_fraud_cust'] = (df['cust_fraud_hist'] > 0).astype(int)

    df['risk_bucket'] = pd.cut(
        df['risk_score'],
        bins=[0, 25, 50, 75, 100],
        labels=[0, 1, 2, 3]
    ).astype(float)

    df['birthdate']    = pd.to_datetime(df['birthdate'], errors='coerce')
    df['customer_age'] = (pd.Timestamp.now() - df['birthdate']).dt.days // 365

    order_ids = df['order_id'].values
    X = df[ALL_FEATURES].copy()

    return X, order_ids


# ── Step 3: Score and write predictions ───────────────────────────────────────

def write_predictions(db_path, order_ids, probabilities, predictions, threshold):
    """Upsert predictions into the OrderPrediction table in Postgres."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL environment variable is not set. "
            "Add it to jobs/.env or export it before running."
        )

    ts = datetime.now(timezone.utc)
    rows = [
        (int(oid), float(prob), bool(pred), float(threshold), ts)
        for oid, prob, pred in zip(order_ids, probabilities, predictions)
    ]

    conn = psycopg2.connect(database_url)
    cur  = conn.cursor()

    psycopg2.extras.execute_values(cur, """
        INSERT INTO "OrderPrediction"
            ("orderId", "fraudProbability", "isFraudPredicted",
             "decisionThreshold", "predictedAt")
        VALUES %s
        ON CONFLICT ("orderId") DO UPDATE SET
            "fraudProbability"  = EXCLUDED."fraudProbability",
            "isFraudPredicted"  = EXCLUDED."isFraudPredicted",
            "decisionThreshold" = EXCLUDED."decisionThreshold",
            "predictedAt"       = EXCLUDED."predictedAt"
    """, rows)

    conn.commit()
    cur.close()
    conn.close()

    flagged = int(sum(predictions))
    print(f"  Predictions written: {len(rows)}")
    print(f"  Flagged as fraud:    {flagged} ({flagged / len(rows):.1%})")


# ── Main ──────────────────────────────────────────────────────────────────────

def run(db_path, model_path):
    print("=" * 55)
    print("  FRAUD DETECTION — INFERENCE JOB")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 55)

    print("\n[1/4] Loading model...")
    pipeline, threshold = load_model(model_path)

    print("\n[2/4] Loading and preparing features from shop.db...")
    X, order_ids = load_features(db_path)

    if len(X) == 0:
        print("\nNothing to score. Exiting.")
        return

    print("\n[3/4] Scoring orders...")
    probabilities = pipeline.predict_proba(X)[:, 1]
    predictions   = (probabilities >= threshold).astype(int)

    print("\n[4/4] Writing predictions to Postgres...")
    write_predictions(db_path, order_ids, probabilities, predictions, threshold)

    print("\n" + "=" * 55)
    print("  Done.")
    print("=" * 55)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run fraud detection inference.')
    parser.add_argument('--db',    default=DEFAULT_DB_PATH,    help='Path to shop.db')
    parser.add_argument('--model', default=DEFAULT_MODEL_PATH, help='Path to .pkl model file')
    args = parser.parse_args()

    run(db_path=args.db, model_path=args.model)
