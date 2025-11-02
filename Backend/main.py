from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

import re
import string
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from readability import Document
from bs4 import BeautifulSoup

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_extraction import text as sk_text

app = FastAPI(title="Topic Cloud API", version="0.1.0")

# Accept localhost and 127.0.0.1 during dev
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

class AnalyzeRequest(BaseModel):
    url: HttpUrl

class KeywordItem(BaseModel):
    word: str
    weight: float

class AnalyzeResponse(BaseModel):
    keywords: list[KeywordItem]

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/127.0 Safari/537.36"
)

def fetch_and_extract_text(url: str) -> str:
    # Robust fetch with small retry policy
    session = requests.Session()
    session.headers.update({
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    })
    retries = Retry(total=2, backoff_factor=0.3, status_forcelist=[429, 500, 502, 503, 504])
    session.mount("http://", HTTPAdapter(max_retries=retries))
    session.mount("https://", HTTPAdapter(max_retries=retries))

    try:
        resp = session.get(url, timeout=15, allow_redirects=True)
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")

    # Isolate article
    doc = Document(resp.text)
    summary_html = doc.summary()
    soup = BeautifulSoup(summary_html, "lxml")

    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    text = soup.get_text(" ")

    # Fallback to full page if too short
    if not text or len(text.strip()) < 200:
        fallback = BeautifulSoup(resp.text, "lxml")
        for tag in fallback(["script", "style", "noscript"]):
            tag.decompose()
        text = fallback.get_text(" ")

    text = re.sub(r"\s+", " ", text).strip()

    if len(text) < 200:
        raise HTTPException(status_code=422, detail="Could not extract enough article text")

    return text

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    # 1) Extract and clean
    text = fetch_and_extract_text(str(req.url))
    text = text.lower()
    text = text.translate(str.maketrans("", "", string.punctuation))

    # 2) TF-IDF over unigrams and bigrams
    vectorizer = TfidfVectorizer(
    stop_words="english",
    token_pattern=r"(?u)\b[a-z]{3,}\b",
    ngram_range=(1, 2),
    min_df=1,          
    max_df=1.0,        
    max_features=2000,
)
    tfidf_matrix = vectorizer.fit_transform([text])

    # 3) Convert to pairs
    feature_names = vectorizer.get_feature_names_out()
    weights = tfidf_matrix.toarray()[0]
    pairs = list(zip(feature_names, weights))

    # 4) Top N, then normalize to [0, 1]
    top_n = 40
    pairs = sorted(pairs, key=lambda x: x[1], reverse=True)[:top_n]

    if not pairs:
        return AnalyzeResponse(keywords=[])

    min_w = min(w for _, w in pairs)
    max_w = max(w for _, w in pairs)
    if max_w == min_w:
        keywords = [{"word": t, "weight": 1.0} for t, _ in pairs]
    else:
        keywords = [{"word": t, "weight": float((w - min_w) / (max_w - min_w))} for t, w in pairs]

    return AnalyzeResponse(keywords=keywords)