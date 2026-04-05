# Shop Pipeline — IS 455 Group Project

A Next.js dashboard for order management and fraud detection. The fraud detection pipeline uses a trained Gradient Boosting model (`jobs/fraud_detection_pipeline.pkl`) to score orders from `prisma/shop.db`.

## Prerequisites

- Node.js 18+
- Python 3.11+

## Setup

### 1. Install Node dependencies

```bash
npm install
```

### 2. Set up the Python environment

```bash
python3 -m venv jobs/venv
source jobs/venv/bin/activate        # Mac/Linux
# jobs\venv\Scripts\activate         # Windows
pip install joblib pandas scikit-learn numpy
pip install psycopg2-binary
```

### 3. Set up env variables

Create a `.env.local` file in the project root, and update it with all your secrets.

Add the Python path to your `.env.local`:

```
FRAUD_PYTHON_BIN=jobs/venv/bin/python3
# Windows: FRAUD_PYTHON_BIN=jobs/venv/Scripts/python.exe
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
