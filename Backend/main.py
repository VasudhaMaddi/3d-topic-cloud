from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
