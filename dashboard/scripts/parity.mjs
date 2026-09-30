// Verifies JS inference == Python inference on customers exported from the notebook.
import { readFileSync } from "node:fs";
const model = JSON.parse(readFileSync(new URL("../src/model.json", import.meta.url)));
const src = readFileSync(new URL("../src/predict.js", import.meta.url), "utf8").replace(/^import model.*$/m, "const model = null;").replace(/^export \{ model \};$/m, "");
const { engineer } = await import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));
let maxDiff = 0;
for (const s of model.samples) {
  const c = engineer(s.raw);
  const z = model.features.reduce((a, f, i) => {
    const x = f.type === "num" ? Number(c[f.key]) : c[f.key] === f.level ? 1 : 0;
    return a + (model.weights[i] * (x - model.mean[i])) / model.std[i];
  }, model.bias);
  maxDiff = Math.max(maxDiff, Math.abs(1 / (1 + Math.exp(-z)) - s.prob));
}
console.log(`Checked ${model.samples.length} customers · max |JS - Python| probability difference = ${maxDiff.toExponential(2)}`);
process.exit(maxDiff < 1e-9 ? 0 : 1);
