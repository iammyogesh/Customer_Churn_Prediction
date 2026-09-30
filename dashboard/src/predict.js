// Runs the trained NumPy logistic-regression model in the browser.
// Mirrors engineer_features() from the notebook exactly (verified by `npm run verify`).
import model from "./model.json";

const ADDONS = ["OnlineSecurity", "OnlineBackup", "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies"];
const PRETTY = { tenure_bin: "Tenure bucket (months)" };
export const sigmoid = (z) => 1 / (1 + Math.exp(-z));

export function engineer(r) {
  const c = { ...r };
  ["MultipleLines", ...ADDONS].forEach((k) => {
    if (c[k] === "No internet service" || c[k] === "No phone service") c[k] = "No";
  });
  const t = Number(c.tenure);
  c.n_addons = ADDONS.filter((k) => c[k] === "Yes").length;
  c.tenure_log = Math.log1p(t);
  c.tenure_bin = t <= 6 ? "0-6" : t <= 12 ? "7-12" : t <= 24 ? "13-24" : t <= 48 ? "25-48" : "49+";
  c.autopay = /automatic/.test(c.PaymentMethod) ? 1 : 0;
  c.mtm_fiber = +(c.Contract === "Month-to-month" && c.InternetService === "Fiber optic");
  c.mtm_echeck = +(c.Contract === "Month-to-month" && c.PaymentMethod === "Electronic check");
  c.family = +(c.Partner === "Yes" || c.Dependents === "Yes");
  c.no_support_internet = +(c.InternetService !== "No" && c.OnlineSecurity === "No" && c.TechSupport === "No");
  return c;
}

export function predict(raw) {
  const c = engineer(raw);
  const parts = model.features.map((f, i) => {
    const x = f.type === "num" ? Number(c[f.key]) : c[f.key] === f.level ? 1 : 0;
    return { f, contribution: (model.weights[i] * (x - model.mean[i])) / model.std[i] };
  });
  const logit = model.bias + parts.reduce((s, d) => s + d.contribution, 0);
  const groups = new Map();
  parts.forEach(({ f, contribution }) => {
    const id = f.type === "cat" ? f.key : f.name;
    const label = f.type === "cat" ? `${PRETTY[f.key] || f.key.replace(/([a-z])([A-Z])/g, "$1 $2")}: ${c[f.key]}` : f.label;
    const g = groups.get(id) || { name: label, contribution: 0 };
    g.contribution += contribution;
    groups.set(id, g);
  });
  return { prob: sigmoid(logit), drivers: [...groups.values()] };
}

export const THR = model.meta.threshold;

export const YN = ["No", "Yes"];

export const OPTIONS = {
  Contract: ["Month-to-month", "One year", "Two year"],
  InternetService: ["DSL", "Fiber optic", "No"],
  PaymentMethod: [
    "Electronic check",
    "Mailed check",
    "Bank transfer (automatic)",
    "Credit card (automatic)"
  ],
  PaperlessBilling: YN,
  Partner: YN,
  Dependents: YN,
  SeniorCitizen: [0, 1],
  PhoneService: YN,
  MultipleLines: YN,
  OnlineSecurity: YN,
  OnlineBackup: YN,
  DeviceProtection: YN,
  TechSupport: YN,
  StreamingTV: YN,
  StreamingMovies: YN
};

export const PRESETS = {
  "High-risk": {
    SeniorCitizen: 1, Partner: "No", Dependents: "No", tenure: 1,
    PhoneService: "Yes", MultipleLines: "Yes", InternetService: "Fiber optic",
    OnlineSecurity: "No", OnlineBackup: "No", DeviceProtection: "No",
    TechSupport: "No", StreamingTV: "Yes", StreamingMovies: "Yes",
    Contract: "Month-to-month", PaperlessBilling: "Yes",
    PaymentMethod: "Electronic check", MonthlyCharges: 95.1
  },
  "Typical": {
    SeniorCitizen: 0, Partner: "Yes", Dependents: "No", tenure: 24,
    PhoneService: "Yes", MultipleLines: "No", InternetService: "Fiber optic",
    OnlineSecurity: "No", OnlineBackup: "Yes", DeviceProtection: "No",
    TechSupport: "No", StreamingTV: "Yes", StreamingMovies: "No",
    Contract: "Month-to-month", PaperlessBilling: "Yes",
    PaymentMethod: "Electronic check", MonthlyCharges: 79.5
  },
  "Loyal": {
    SeniorCitizen: 0, Partner: "Yes", Dependents: "Yes", tenure: 72,
    PhoneService: "Yes", MultipleLines: "Yes", InternetService: "DSL",
    OnlineSecurity: "Yes", OnlineBackup: "Yes", DeviceProtection: "Yes",
    TechSupport: "Yes", StreamingTV: "Yes", StreamingMovies: "Yes",
    Contract: "Two year", PaperlessBilling: "No",
    PaymentMethod: "Credit card (automatic)", MonthlyCharges: 82.65
  }
};

export function tier(prob) {
  if (prob >= 0.6) {
    return {
      name: "High Risk",
      color: "#ef4444",
      tip: "Immediate churn intervention required.",
      actions: [
        "Offer 1-year contract renewal with $15/mo discount",
        "Assign priority tech support representative",
        "Pitch bundled TechSupport + OnlineSecurity at zero cost",
        "Incentivize automatic payment transition ($5 bill credit)"
      ]
    };
  }
  if (prob >= 0.3) {
    return {
      name: "Moderate Risk",
      color: "#f59e0b",
      tip: "Proactive retention engagement recommended.",
      actions: [
        "Promote loyalty discount on long-term contract",
        "Encourage auto-pay setup with bill credit",
        "Send satisfaction check-in survey with follow-up"
      ]
    };
  }
  return {
    name: "Low Risk",
    color: "#10b981",
    tip: "Customer relationship is healthy and stable.",
    actions: [
      "Upsell additional premium streaming add-ons",
      "Enroll in customer loyalty & advocacy program",
      "Request NPS review or referral"
    ]
  };
}

export { model };
