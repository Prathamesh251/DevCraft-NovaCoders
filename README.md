Project Overview :=
CivicSense is a NLP based machine learning system that automatically classifies citizen complaints into predefined civic categories such as water, electricity, roads, sanitation, and public services.
The goal of this project is to help municipal authorities quickly identify complaint types and route them to the correct department, improving response time and city management efficiency.
This system uses text preprocessing and machine learning classification to predict the category of a complaint based on user submitted text.

Setup and Installation:-
1.git clone https://github.com/Prathamesh251/DevCraft-NovaCoders.gitcd DevCraft-NovaCoders (Clone the repository)
2.pip install -r requirements.txt (Install required libraries)
3.pip install pandas numpy scikit-learn streamlit (If requirements.txt not present)
4.uvicorn main:app --reload
5.Then open browser at: http://localhost:8501
6.Then enter any complaint like "Fire in the hospital"

How It Works:-
1.User enters complaint text
2.Text preprocessing
3.Text converted to numerical features 
4.ML model predicts complaint category
5.Category displayed to user
