from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

import requests
from readability import Document
from bs4 import BeautifulSoup
import re

from sklearn.feature_extraction.text import TfidfVectorizer
from nltk.corpus import stopwords
import string

# Create the API app object
app = FastAPI(title="Topic Cloud API", version="0.1.0")

# Allow the frontend (different port) to call this API during local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # ok for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple health-check endpoint
@app.get("/health")
def health():
    return {"status": "ok"}


class AnalyzeRequest(BaseModel):
    url: HttpUrl

class AnalyzePreview(BaseModel):
    chars: int
    preview: str

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/127.0 Safari/537.36"
)

def fetch_and_extract_text(url: str) -> str:
    # 1) Download HTML
    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")

    # 2) Use Readability to isolate main article
    doc = Document(resp.text)
    summary_html = doc.summary()  # this is HTML for the main content
    soup = BeautifulSoup(summary_html, "lxml")

    # 3) Remove scripts and styles that do not belong in text
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    text = soup.get_text(" ")

    # 4) Fallback: if readability gave too little, try full page text
    if not text or len(text.strip()) < 200:
        fallback = BeautifulSoup(resp.text, "lxml")
        for tag in fallback(["script", "style", "noscript"]):
            tag.decompose()
        text = fallback.get_text(" ")

    # 5) Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()

    # 6) Guard: ensure we have enough content to analyze later
    if len(text) < 200:
        raise HTTPException(status_code=422, detail="Could not extract enough article text")

    return text


class KeywordItem(BaseModel):
    word: str
    weight: float

class AnalyzeResponse(BaseModel):
    keywords: list[KeywordItem]

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    """
    Extract top keywords from the article text using TF-IDF.
    """
    text = fetch_and_extract_text(str(req.url))

    # 1) Basic text cleaning
    text = text.lower()
    text = text.translate(str.maketrans("", "", string.punctuation))

    # 2) Prepare TF-IDF
    stop_words = list(stopwords.words("english"))
    vectorizer = TfidfVectorizer(stop_words=stop_words, max_features=40)
    tfidf_matrix = vectorizer.fit_transform([text])

    # 3) Collect words and weights
    feature_names = vectorizer.get_feature_names_out()
    weights = tfidf_matrix.toarray()[0]
    keywords = sorted(
        [{"word": w, "weight": float(weights[i])} for i, w in enumerate(feature_names)],
        key=lambda x: x["weight"],
        reverse=True,
    )

    # 4) Return top N keywords
    return AnalyzeResponse(keywords=keywords[:30])
