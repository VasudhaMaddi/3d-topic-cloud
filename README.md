# 3D Topic Cloud

An interactive web app that visualizes key topics from any news article as a **3D word cloud**.  
Frontend uses **React Three Fiber (Three.js)**. Backend uses **FastAPI (Python)** with TF-IDF keyword extraction.

---

## Overview
Enter a news article URL. The backend crawls and cleans the text, extracts important words with weights, and returns JSON. The frontend renders a colorful, animated 3D word cloud with size and color mapped to each word's weight.

---

## Tech Stack

**Frontend**
- React + Vite
- React Three Fiber (Three.js)
- @react-three/drei
- Axios

**Backend**
- Python 3.9+
- FastAPI, Uvicorn
- requests, readability-lxml, beautifulsoup4
- scikit-learn (TF-IDF)

---

## Project Structure
```text
3d-topic-cloud/
├── Backend/                      # FastAPI backend
│   ├── main.py
│   ├── requirements.txt
│   ├── test_api.py               # basic API tests
│   ├── pytest.ini
│   └── README.md
├── frontend/                     # React + Three.js frontend
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   │       └── WordCloud3D.jsx
│   ├── vite.config.js            # dev proxy to backend
│   ├── package.json
│   └── .gitignore
└── README.md                     # this file
