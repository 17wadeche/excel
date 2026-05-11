const fs = require("fs");
const path = require("path");
const manifestPath = process.argv[2] || "manifest.xml";
const manifest = fs.readFileSync(path.resolve(manifestPath), "utf8");
const isProduction = process.env.NODE_ENV === "production" || process.argv.includes("--production");
const forbidden = ["https://example.com"];
if (isProduction) {
  forbidden.push("https://localhost", "http://localhost");
}
const failures = forbidden.filter((value) => manifest.includes(value));
if (failures.length) {
  console.error(`Manifest ${manifestPath} contains placeholder URLs: ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`Manifest ${manifestPath} passed environment URL checks.`);