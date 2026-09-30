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
  // Group the one-hot columns of a field into ONE readable driver, e.g. "Contract: Month-to-month"
  const groups = new Map();
  parts.forEach(({ f, contribution }) => {
    const id = f.type === "cat" ? f.key : f.name;
    const label = f.type === "cat" ? `${PRETTY[f.key] || f.key.replace(/([a-z])([A-Z])/g, "$1 $2")}: ${c[f.key]}` : f.label;
    const g = groups.get(id) || { label, contribution: 0 };
    g.contribution += contribution;
    groups.set(id, g);
  });
  return { prob: sigmoid(logit), drivers: [...groups.values()] };
}
export { model };
