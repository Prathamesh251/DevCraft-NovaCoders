import pandas as pd
import numpy as np
import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
df = pd.read_csv('dataset.csv')
X = df["text"].astype(str)
y = df["category"].astype(str)
vectorizer = TfidfVectorizer(
    lowercase=True,
    stop_words = "english"
)
x_vec = vectorizer.fit_transform(X)
model = MultinomialNB()
model.fit(x_vec, y)
with open("model.pkl", "wb") as f:
    pickle.dump(model, f)
with open("vectorizer.pkl", "wb") as f:
    pickle.dump(vectorizer, f)
print("Model trained")