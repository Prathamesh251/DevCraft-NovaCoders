from fastapi import FastAPI
from pydantic import BaseModel
import pickle

app = FastAPI()   # ← THIS MUST EXIST

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (for development)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
with open("model.pkl", "rb") as f:
    model = pickle.load(f)

with open("vectorizer.pkl", "rb") as f:
    vectorizer = pickle.load(f)

class Complaint(BaseModel):
    text: str

@app.post("/predict")
def predict_category(data: Complaint):
    text_vec = vectorizer.transform([data.text])
    prediction = model.predict(text_vec)[0]
    return {"category": prediction}