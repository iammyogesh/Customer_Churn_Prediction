import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { PRESETS, OPTIONS, YN, THR, predict, model, tier } from './predict';

const pct = (n, d = 1) => (n * 100).toFixed(d) + "%";

function Gauge({ p, color }) {
  const rot = p * 180 - 90;
  return (
    <div className="gauge-container">
      <svg viewBox="0 0 200 115" style={{ overflow: "visible", width: "100%", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.06))" }}>
        <defs>
          <linearGradient id="speedo" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id="needle-shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" floodColor="#000" />
          </filter>
        </defs>
        
        {/* Background track */}
        <path d="M20 95 A75 75 0 0 1 180 95" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
        
        {/* Speedometer color segmented track */}
        <path 
          d="M20 95 A75 75 0 0 1 180 95" 
          fill="none" 
          stroke="url(#speedo)" 
          strokeWidth="12" 
          strokeLinecap="round" 
          strokeDasharray="4 7" 
        />
        
        {/* Needle */}
        <g style={{ transform: `translate(100px, 95px) rotate(${rot}deg)`, transition: "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
          <polygon points="-2,0 2,0 0,-68" fill="#0f172a" filter="url(#needle-shadow)" />
          <circle cx="0" cy="0" r="5.5" fill="#0f172a" filter="url(#needle-shadow)" />
          <circle cx="0" cy="0" r="2" fill="#ffffff" />
        </g>
      </svg>
      
      {/* Percentage */}
      <div style={{ textAlign: "center", marginTop: "-6px" }}>
        <div style={{ fontSize: "38px", fontWeight: "800", color: "#0f172a", lineHeight: "1", letterSpacing: "-1px" }}>
          {pct(p, 0)}
        </div>
        <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1.5px", marginTop: "4px", fontWeight: "600" }}>
          Churn Probability
        </div>
      </div>
    </div>
  );
}

const Select = ({ label, value, opts, onChange }) => (
  <label className="field">
    <span>{label}</span>
    <select value={value} onChange={(e) => onChange(typeof opts[0] === "number" ? Number(e.target.value) : e.target.value)}>
      {opts.map((o) => (
        <option key={o} value={o}>
          {o === 0 ? "No" : o === 1 && typeof o === "number" ? "Yes" : o}
        </option>
      ))}
    </select>
  </label>
);

const Slider = ({ label, value, min, max, step, unit, onChange }) => (
  <label className="field wide">
    <span>
      {label} <b>{unit === "$" ? `$${value}` : `${value} ${unit}`}</b>
    </span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </label>
);

const Card = ({ title, children, className = "" }) => (
  <section className={`bento-card ${className}`}>
    {title && <h3>{title}</h3>}
    {children}
  </section>
);

export default function App() {
  const [c, setC] = useState(PRESETS["High-risk"]);
  const [activePreset, setActivePreset] = useState("High-risk");

  const set = (k) => (v) => setC((s) => {
    setActivePreset(null);
    const n = { ...s, [k]: v };
    if (k === "InternetService" && v === "No") {
      ["OnlineSecurity", "OnlineBackup", "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies"].forEach((x) => (n[x] = "No"));
    }
    if (k === "PhoneService" && v === "No") n.MultipleLines = "No";
    return n;
  });

  const { prob, drivers } = useMemo(() => predict(c), [c]);
  const t = tier(prob);
  const top = [...drivers].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 5).reverse();
  const noNet = c.InternetService === "No";

  // KPIs
  const ops = model.metrics.operating_points;
  const m = ops[Object.keys(ops)[1]]; // F1-tuned

  return (
    <>
      <header>
        <div className="brand">
          <span className="logo">⬡</span>
          <h1>CHURN</h1>
        </div>
        <div className="meta">
          <span><b>{model.meta.n_customers.toLocaleString()}</b> Customers</span>
          <span><b>{model.meta.n_features}</b> Features</span>
          <span><b>{pct(model.meta.churn_rate)}</b> Base Churn</span>
        </div>
      </header>
      
      <main>
        {/* Left Column: Customer Profile */}
        <div className="bento-col-left">
          <Card title="Customer Profile" className="profile-card">
            <div className="chips">
              {Object.keys(PRESETS).map((k) => (
                <button
                  key={k}
                  className={`chip ${activePreset === k ? "active" : ""}`}
                  onClick={() => {
                    setC(PRESETS[k]);
                    setActivePreset(k);
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="form-scroll">
              <div className="form">
                <Slider label="Tenure" value={c.tenure} min={0} max={72} step={1} unit="mo" onChange={set("tenure")} />
                <Slider label="Monthly charges" value={c.MonthlyCharges} min={18} max={120} step={0.5} unit="$" onChange={set("MonthlyCharges")} />
                {["Contract", "InternetService", "PaymentMethod", "PaperlessBilling", "Partner", "Dependents", "SeniorCitizen", "PhoneService"].map((k) => (
                  <Select key={k} label={k.replace(/([a-z])([A-Z])/g, "$1 $2")} value={c[k]} opts={OPTIONS[k]} onChange={set(k)} />
                ))}
                {c.PhoneService === "Yes" && <Select label="Multiple Lines" value={c.MultipleLines} opts={YN} onChange={set("MultipleLines")} />}
                {!noNet && ["OnlineSecurity", "OnlineBackup", "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies"].map((k) => (
                  <Select key={k} label={k.replace(/([a-z])([A-Z])/g, "$1 $2")} value={c[k]} opts={YN} onChange={set(k)} />
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Center Column: Risk Meter & Drivers */}
        <div className="bento-col-center">
          <Card className="hero-card">
            <Gauge p={prob} color={t.color} />
            <div className="badge" style={{ background: t.color }}>{t.name}</div>
            <p className="muted-tip">{t.tip}</p>
          </Card>
          
          <Card title="Top Prediction Drivers" className="chart-card">
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top} layout="vertical" margin={{ top: 4, right: 12, left: 12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={130} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} formatter={(v) => [v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2), 'Impact']} />
                  <Bar dataKey="contribution" radius={[0, 4, 4, 0]} barSize={20}>
                    {top.map((e, i) => (
                      <Cell key={i} fill={e.contribution > 0 ? "var(--danger)" : "var(--brand-primary)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Right Column: Model KPIs & Recommended Actions */}
        <div className="bento-col-right">
          <div className="kpi-grid">
            <div className="kpi-box">
              <small>Accuracy</small>
              <strong>{pct(m.accuracy)}</strong>
            </div>
            <div className="kpi-box">
              <small>Precision</small>
              <strong>{pct(m.precision)}</strong>
            </div>
            <div className="kpi-box">
              <small>Recall</small>
              <strong>{pct(m.recall)}</strong>
            </div>
            <div className="kpi-box">
              <small>F1 Score</small>
              <strong>{m.f1.toFixed(3)}</strong>
            </div>
          </div>
          
          <Card title="Recommended Actions" className="actions-card">
            <ul className="actions">
              {t.actions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </Card>
        </div>
      </main>
    </>
  );
}
