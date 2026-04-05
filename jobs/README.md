# Fraud Detection Pipeline — Setup

## 1. Create a virtual environment

```bash
cd jobs
python3 -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows
```

## 2. Install dependencies

```bash
pip install joblib pandas scikit-learn numpy
```

## 3. Test that the script runs

```bash
# From the project root
source jobs/venv/bin/activate
python jobs/run_inference.py
```

You should see output like:
```
=======================================================
  FRAUD DETECTION — INFERENCE JOB
=======================================================
[1/4] Loading model...
[2/4] Loading and preparing features from shop.db...
...
  Done.
```

## 4. Add the venv path to .env

Add this line to your `.env` file so the web app knows which Python to use:

```
FRAUD_PYTHON_BIN=jobs/venv/bin/python3
```

On Windows use:
```
FRAUD_PYTHON_BIN=jobs/venv/Scripts/python.exe
```
