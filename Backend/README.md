# Topic Cloud Backend

## Stack
- Python 3.9+
- FastAPI, Uvicorn
- requests, readability-lxml, beautifulsoup4
- scikit-learn (TF-IDF for keyword extraction)

## Setup
```bash
cd Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

