import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine } from "recharts";
import { predict, model } from "./predict.js";

const YN = ["Yes", "No"];
const OPTIONS = {
  Contract: ["Month-to-month", "One year", "Two year"],
  InternetService: ["Fiber optic", "DSL", "No"],
  PaymentMethod: ["Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"],
  PaperlessBilling: YN, Partner: YN, Dependents: YN, SeniorCitizen: [0, 1], PhoneService: YN, MultipleLines: YN,
  OnlineSecurity: YN, OnlineBackup: YN, DeviceProtection: YN, TechSupport: YN, StreamingTV: YN, StreamingMovies: YN,
};
const PRESETS = {
  "High-risk profile": { Contract: "Month-to-month", InternetService: "Fiber optic", PaymentMethod: "Electronic check", PaperlessBilling: "Yes", Partner: "No", Dependents: "No", SeniorCitizen: 0, PhoneService: "Yes", MultipleLines: "No", OnlineSecurity: "No", OnlineBackup: "No", DeviceProtection: "No", TechSupport: "No", StreamingTV: "No", StreamingMovies: "No", tenure: 2, MonthlyCharges: 79.5 },
  "Typical customer": { Contract: "One year", InternetService: "DSL", PaymentMethod: "Mailed check", PaperlessBilling: "No", Partner: "Yes", Dependents: "No", SeniorCitizen: 0, PhoneService: "Yes", MultipleLines: "No", OnlineSecurity: "No", OnlineBackup: "Yes", DeviceProtection: "No", TechSupport: "No", StreamingTV: "No", StreamingMovies: "No", tenure: 24, MonthlyCharges: 55 },
  "Loyal customer": { Contract: "Two year", InternetService: "DSL", PaymentMethod: "Credit card (automatic)", PaperlessBilling: "No", Partner: "Yes", Dependents: "Yes", SeniorCitizen: 0, PhoneService: "Yes", MultipleLines: "Yes", OnlineSecurity: "Yes", OnlineBackup: "Yes", DeviceProtection: "Yes", TechSupport: "Yes", StreamingTV: "No", StreamingMovies: "No", tenure: 60, MonthlyCharges: 70 },
};
const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
const THR = model.meta.threshold;

function tier(p) {
  if (p >= 0.6) return { name: "High risk", color: "#e11d48", tip: "Immediate retention outreach recommended." };
  if (p >= THR) return { name: "Elevated risk", color: "#f59e0b", tip: "Flagged by the model – include in the next retention campaign." };
  return { name: "Low risk", color: "#10b981", tip: "No action needed – customer looks stable." };
}
function actions(c) {
  const a = [];
  if (c.Contract === "Month-to-month") a.push("Offer a discount to switch to a 1- or 2-year contract");
  if (c.PaymentMethod === "Electronic check") a.push("Incentivise a move to automatic payment");
  if (c.InternetService !== "No" && c.OnlineSecurity === "No" && c.TechSupport === "No") a.push("Bundle Online Security + Tech Support free for 3 months");
  if (Number(c.tenure) <= 6) a.push("Schedule an onboarding check-in call");
  if (Number(c.MonthlyCharges) > 85) a.push("Review the plan – price sensitivity is likely");
  return a.length ? a : ["Keep the customer engaged with loyalty rewards"];
}

function Gauge({ p, color }) {
  const L = Math.PI * 90;
  return (
    <svg viewBox="0 0 200 118" className="gauge">
      <path d="M10 105 A90 90 0 0 1 190 105" fill="none" stroke="#e5e7eb" strokeWidth="16" strokeLinecap="round" />
      <path d="M10 105 A90 90 0 0 1 190 105" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${p * L} ${L}`} style={{ transition: "all .5s" }} />
      <text x="100" y="92" textAnchor="middle" className="gauge-num" fill={color}>{pct(p, 0)}</text>
      <text x="100" y="112" textAnchor="middle" className="gauge-sub">churn probability</text>
    </svg>
  );
}
const Select = ({ label, value, opts, onChange }) => (
  <label className="field"><span>{label}</span>
    <select value={value} onChange={(e) => onChange(typeof opts[0] === "number" ? Number(e.target.value) : e.target.value)}>
      {opts.map((o) => <option key={o} value={o}>{o === 0 ? "No" : o === 1 && typeof o === "number" ? "Yes" : o}</option>)}
    </select>
  </label>
);
const Slider = ({ label, value, min, max, step, unit, onChange }) => (
  <label className="field wide"><span>{label} <b>{unit === "$" ? `$${value}` : `${value} ${unit}`}</b></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </label>
);
const Card = ({ title, children, className = "" }) => <section className={`card ${className}`}>{title && <h3>{title}</h3>}{children}</section>;
const Kpi = ({ label, value, sub }) => <div className="kpi"><small>{label}</small><strong>{value}</strong>{sub && <em>{sub}</em>}</div>;

function Predict() {
  const [c, setC] = useState(PRESETS["High-risk profile"]);
  const set = (k) => (v) => setC((s) => {
    const n = { ...s, [k]: v };
    if (k === "InternetService" && v === "No") ["OnlineSecurity", "OnlineBackup", "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies"].forEach((x) => (n[x] = "No"));
    if (k === "PhoneService" && v === "No") n.MultipleLines = "No";
    return n;
  });
  const { prob, drivers } = useMemo(() => predict(c), [c]);
  const t = tier(prob);
  const top = [...drivers].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 7).reverse();
  const noNet = c.InternetService === "No";
  return (
    <div className="grid predict">
      <Card title="Customer profile">
        <div className="chips">{Object.keys(PRESETS).map((k) => <button key={k} className="chip" onClick={() => setC(PRESETS[k])}>{k}</button>)}</div>
        <div className="form">
          <Slider label="Tenure" value={c.tenure} min={0} max={72} step={1} unit="months" onChange={set("tenure")} />
          <Slider label="Monthly charges" value={c.MonthlyCharges} min={18} max={120} step={0.5} unit="$" onChange={set("MonthlyCharges")} />
          {["Contract", "InternetService", "PaymentMethod", "PaperlessBilling", "Partner", "Dependents", "SeniorCitizen", "PhoneService"].map((k) => <Select key={k} label={k.replace(/([a-z])([A-Z])/g, "$1 $2")} value={c[k]} opts={OPTIONS[k]} onChange={set(k)} />)}
          {c.PhoneService === "Yes" && <Select label="Multiple Lines" value={c.MultipleLines} opts={YN} onChange={set("MultipleLines")} />}
          {!noNet && ["OnlineSecurity", "OnlineBackup", "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies"].map((k) => <Select key={k} label={k.replace(/([a-z])([A-Z])/g, "$1 $2")} value={c[k]} opts={YN} onChange={set(k)} />)}
        </div>
      </Card>
      <div className="stack">
        <Card className="result" >
          <Gauge p={prob} color={t.color} />
          <div className="badge" style={{ background: t.color }}>{t.name}</div>
          <p className="muted">{t.tip}</p>
          <p className="tiny">Decision threshold {pct(THR, 0)} (tuned for F1) · model output is a calibrated probability</p>
        </Card>
        <Card title="Why this prediction?">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={top} layout="vertical" margin={{ left: 30, right: 12 }}>
              <CartesianGrid horizontal={false} stroke="#eef0f4" /><XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="label" width={170} tick={{ fontSize: 11 }} />
              <ReferenceLine x={0} stroke="#94a3b8" />
              <Tooltip formatter={(v) => [v.toFixed(2), "log-odds impact"]} />
              <Bar dataKey="contribution" radius={4}>{top.map((d, i) => <Cell key={i} fill={d.contribution > 0 ? "#e11d48" : "#2563eb"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="tiny">Red pushes churn risk up, blue pushes it down (relative to the average customer).</p>
        </Card>
        <Card title="Suggested retention actions"><ul className="actions">{actions(c).map((a) => <li key={a}>{a}</li>)}</ul></Card>
      </div>
    </div>
  );
}

function Performance() {
  const ops = model.metrics.operating_points; const names = Object.keys(ops);
  const [sel, setSel] = useState(names[1]); const m = ops[sel]; const ci = model.metrics.ci;
  const P = model.confusion.tp + model.confusion.fn, N = model.meta.n_test; // derive the matrix for the selected threshold
  const tp = Math.round(m.recall * P), fp = Math.round(tp / m.precision - tp);
  const cm = { tp, fp, fn: P - tp, tn: N - tp - fp - (P - tp) };
  const roc = model.roc.fpr.map((f, i) => ({ fpr: f, tpr: model.roc.tpr[i] }));
  return (
    <div className="grid perf">
      <div className="span2 toggle">{names.map((n) => <button key={n} className={n === sel ? "on" : ""} onClick={() => setSel(n)}>{n} · thr {m && ops[n].threshold.toFixed(2)}</button>)}</div>
      <div className="span2 kpis">
        <Kpi label="Accuracy" value={pct(m.accuracy)} sub={sel === names[1] ? `95% CI ${pct(ci.accuracy[0])}–${pct(ci.accuracy[1])}` : undefined} />
        <Kpi label="Precision" value={pct(m.precision)} /><Kpi label="Recall" value={pct(m.recall)} />
        <Kpi label="F1 score" value={m.f1.toFixed(3)} /><Kpi label="ROC-AUC" value={model.metrics.roc_auc.toFixed(3)} sub={`CI ${ci.roc_auc[0].toFixed(3)}–${ci.roc_auc[1].toFixed(3)}`} />
      </div>
      <Card title="ROC curve">
        <ResponsiveContainer width="100%" height={280}><LineChart data={roc} margin={{ left: 0, right: 16, top: 8, bottom: 22 }}>
          <CartesianGrid stroke="#eef0f4" /><XAxis dataKey="fpr" type="number" domain={[0, 1]} tick={{ fontSize: 11 }} label={{ value: "False-positive rate", position: "insideBottom", offset: -2, fontSize: 11 }} />
          <YAxis domain={[0, 1.03]} ticks={[0, 0.25, 0.5, 0.75, 1]} tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => v.toFixed(3)} />
          <Line dataKey="tpr" stroke="#e11d48" strokeWidth={2.5} dot={false} name="TPR" />
          <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#94a3b8" strokeDasharray="4 4" /></LineChart></ResponsiveContainer>
      </Card>
      <Card title={`Confusion matrix · test set (n=${model.meta.n_test.toLocaleString()})`}>
        <div className="cm">
          <div /><b>Pred. stay</b><b>Pred. churn</b>
          <b>Actual stay</b><div className="c tn">{cm.tn}<small>true neg.</small></div><div className="c fp">{cm.fp}<small>false pos.</small></div>
          <b>Actual churn</b><div className="c fn">{cm.fn}<small>false neg.</small></div><div className="c tp">{cm.tp}<small>true pos.</small></div>
        </div><p className="tiny">Shown at threshold {m.threshold.toFixed(2)} (selected above).</p>
      </Card>
      <Card title="Benchmark vs scikit-learn (test set, threshold 0.5)" className="span2">
        <table><thead><tr><th>Model</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1</th><th>ROC-AUC</th><th>Train acc.</th></tr></thead>
          <tbody>{model.benchmark.map((b) => <tr key={b.model} className={b.model.includes("[mine]") ? "hl" : ""}><td>{b.model}</td>{["accuracy", "precision", "recall"].map((k) => <td key={k}>{pct(b[k])}</td>)}<td>{b.f1.toFixed(3)}</td><td>{b.roc_auc.toFixed(3)}</td><td className={b.train_accuracy - b.accuracy > 0.1 ? "warn" : ""}>{pct(b.train_accuracy)}</td></tr>)}</tbody></table>
        <p className="tiny">Every model family plateaus at ≈ 0.85 ROC-AUC – the limit of the information in the dataset. A train accuracy far above test accuracy (red) means over-fitting.</p>
      </Card>
      <Card title="Cumulative gains – contact the riskiest customers first" className="span2">
        <ResponsiveContainer width="100%" height={240}><LineChart data={[{ pct: 0, captured: 0 }, ...model.gains].map((g) => ({ ...g, captured: g.captured * 100, random: g.pct }))} margin={{ left: 0, right: 16, top: 8 }}>
          <CartesianGrid stroke="#eef0f4" /><XAxis dataKey="pct" unit="%" tick={{ fontSize: 11 }} /><YAxis unit="%" tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
          <Line dataKey="captured" name="Model" stroke="#2563eb" strokeWidth={2.5} /><Line dataKey="random" name="Random" stroke="#94a3b8" strokeDasharray="4 4" dot={false} /></LineChart></ResponsiveContainer>
      </Card>
    </div>
  );
}

function Insights() {
  const seg = model.segments; const base = model.meta.churn_rate * 100;
  const drivers = model.features.map((f, i) => ({ label: f.label, w: model.weights[i] })).sort((a, b) => Math.abs(b.w) - Math.abs(a.w)).slice(0, 12).reverse();
  return (
    <div className="grid insights">
      {Object.entries(seg).map(([k, rows]) => (
        <Card key={k} title={`Churn rate by ${k === "tenure_bin" ? "tenure (months)" : k}`}>
          <ResponsiveContainer width="100%" height={210}><BarChart data={rows.map((r) => ({ ...r, rate: +(r.rate * 100).toFixed(1) }))}>
            <CartesianGrid vertical={false} stroke="#eef0f4" /><XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} tickFormatter={(v) => v.replace(" (automatic)", " (auto)")} /><YAxis unit="%" tick={{ fontSize: 11 }} />
            <ReferenceLine y={base} stroke="#e11d48" strokeDasharray="4 4" /><Tooltip formatter={(v, n, p) => [`${v}% (n=${p.payload.n})`, "churn"]} />
            <Bar dataKey="rate" fill="#3b6ef5" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
        </Card>
      ))}
      <Card title="Top model drivers (standardised coefficients)" className="span2">
        <ResponsiveContainer width="100%" height={330}><BarChart data={drivers} layout="vertical" margin={{ left: 40 }}>
          <CartesianGrid horizontal={false} stroke="#eef0f4" /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="label" width={190} tick={{ fontSize: 11 }} /><ReferenceLine x={0} stroke="#94a3b8" /><Tooltip formatter={(v) => v.toFixed(3)} />
          <Bar dataKey="w" radius={4}>{drivers.map((d, i) => <Cell key={i} fill={d.w > 0 ? "#e11d48" : "#2563eb"} />)}</Bar></BarChart></ResponsiveContainer>
      </Card>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("Predict");
  const TABS = { Predict: <Predict />, Performance: <Performance />, Insights: <Insights /> };
  return (
    <>
      <header>
        <div className="brand"><span className="logo">◉</span><div><h1>ChurnGuard</h1><p>Telco customer churn intelligence</p></div></div>
        <nav>{Object.keys(TABS).map((t) => <button key={t} className={t === tab ? "on" : ""} onClick={() => setTab(t)}>{t}</button>)}</nav>
        <div className="meta"><b>{model.meta.n_customers.toLocaleString()}</b> customers · <b>{model.meta.n_features}</b> features · {pct(model.meta.churn_rate)} churn</div>
      </header>
      <main>{TABS[tab]}</main>
      <footer>{model.meta.model} · trained on {model.meta.n_train.toLocaleString()} customers, evaluated on {model.meta.n_test.toLocaleString()} held-out customers</footer>
    </>
  );
}
