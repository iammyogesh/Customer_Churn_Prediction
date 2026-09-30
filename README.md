# Telco Customer Churn Prediction

Capstone (Option 2): **logistic regression implemented from scratch in NumPy** (sigmoid, log-loss, gradient descent,
L2 regularisation, class weights), benchmarked against scikit-learn, with a React dashboard for live predictions.

## Layout
```
data/Telco-Customer-Churn.csv        dataset
notebooks/churn_prediction.ipynb     full pipeline: audit -> EDA -> features -> model -> CV -> test -> benchmark -> business impact -> export
models/churn_logreg_scratch.json     trained weights, scaler, metrics
dashboard/                           React + Vite dashboard (runs the trained model in the browser)
```

## Run the notebook
```bash
pip install -r requirements.txt
cd notebooks && jupyter notebook churn_prediction.ipynb     # Run All (~1-2 min)
```
Running it regenerates `dashboard/src/model.json`.

## Run the dashboard
```bash
cd dashboard
npm install
npm run dev        # http://localhost:5173
npm run verify     # checks JS predictions == Python predictions (max diff ~1e-16)
```

## Results (held-out test set, n = 1,409; every number is out-of-sample)
| Operating point | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|
| Accuracy-oriented (thr 0.51) | 80.6 % | 67.2 % | 52.1 % | 0.587 | 0.848 |
| Recall-oriented (thr 0.34)   | 77.9 % | 56.5 % | 73.5 % | 0.639 | 0.848 |

The from-scratch model matches scikit-learn (coefficients agree to ~1e-5) and equals or beats random forest and gradient boosting.
~80 % accuracy / ~0.85 ROC-AUC is the ceiling for this dataset; see the notebook's final section.
