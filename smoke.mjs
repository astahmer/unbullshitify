// Headless smoke test: boots the built bundle in jsdom with mocked
// fetch/localStorage and asserts the app renders. Run after any frontend
// change: `node smoke.mjs` (requires a prior `pnpm build`).
import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { JSDOM } from "jsdom";

const html = readFileSync("dist/index.html", "utf8");
const assets = readdirSync("dist/assets");
const js = assets.find((f) => f.endsWith(".js"));
const css = assets.find((f) => f.endsWith(".css"));

if (!js || !css) {
  console.error("FAIL: missing bundle in dist/assets");
  process.exit(1);
}

const dom = new JSDOM(html, {
  url: "https://unbullshitify.test/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
});

const { window } = dom;
window.localStorage.getItem("unbullshitify.settings.v1");
window.fetch = async () =>
  new window.Response('{"error":"smoke: no network"}', { status: 599 });

let failures = 0;
const check = (name, cond) => {
  console.log(cond ? `  ok  ${name}` : `FAIL  ${name}`);
  if (!cond) failures++;
};

try {
  window.eval(readFileSync(`dist/assets/${js}`, "utf8"));
} catch (e) {
  console.error("FAIL: bundle threw during eval:", e.message);
  process.exit(1);
}

// let React flush
await new Promise((r) => setTimeout(r, 150));
await new Promise((r) => setTimeout(r, 350));

const doc = window.document;
check("header renders", doc.body.textContent.includes("unbullshitify"));
check(
  "input textarea present",
  doc.querySelector("textarea") !== null,
);
check(
  'BYOK configure button present',
  [...doc.querySelectorAll("button")].some((b) =>
    b.textContent.includes("Configure"),
  ),
);
check(
  "pipeline hint rendered",
  doc.body.textContent.includes("Round-trip inversion"),
);
check(
  "settings dialog closed initially",
  !doc.body.textContent.includes("Provider settings"),
);

// open the settings dialog and check fields
const settingsBtn = [...doc.querySelectorAll("button")].find((b) =>
  b.textContent.includes("Add API key"),
);
settingsBtn?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await new Promise((r) => setTimeout(r, 100));
check(
  "settings dialog opens",
  doc.body.textContent.includes("Provider settings"),
);
check(
  "base URL field present",
  [...doc.querySelectorAll("input")].some(
    (i) => i.id === "baseurl" && i.value.includes("openrouter"),
  ),
);
check(
  "save disabled without key",
  [...doc.querySelectorAll("button")].find((b) => b.textContent === "Save")
    ?.disabled === true,
);

console.log(failures === 0 ? "\nSMOKE OK" : `\nSMOKE FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
