import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = [
  path.join(ROOT, "src", "pages"),
  path.join(ROOT, "src", "components", "aura"),
];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const STRICT = process.argv.includes("--strict");

// Raw palette classes we want to phase out in app code.
const FORBIDDEN_PATTERNS = [
  /\b(?:bg|text|border|from|to|via|ring|stroke|fill)-(?:emerald|slate|sky|teal|blue|cyan|green|lime|indigo|violet|fuchsia|pink|rose|amber|orange|yellow|red|gray|zinc|neutral|stone)-\d{2,3}(?:\/\d+)?\b/g,
  /\b(?:bg|text|border)-white(?:\/\d+)?\b/g,
  /\bbg-aura-primary(?:\/\d+)?\b/g,
  /\btext-aura-primary(?:\/\d+)?\b/g,
  /\bborder-aura-primary(?:\/\d+)?\b/g,
];

const shouldScanFile = (filePath) => SOURCE_EXTENSIONS.has(path.extname(filePath));

const walk = async (dirPath) => {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }
    if (entry.isFile() && shouldScanFile(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
};

const scanFile = async (filePath) => {
  const fileStat = await stat(filePath);
  if (fileStat.size === 0) return [];

  const content = await readFile(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const findings = [];

  lines.forEach((line, lineIndex) => {
    const compact = line.trim();
    if (compact.startsWith("//") || compact.startsWith("*")) return;

    for (const pattern of FORBIDDEN_PATTERNS) {
      pattern.lastIndex = 0;
      const matches = compact.match(pattern);
      if (!matches) continue;
      findings.push({
        filePath,
        line: lineIndex + 1,
        values: [...new Set(matches)],
      });
    }
  });

  return findings;
};

const relative = (filePath) => path.relative(ROOT, filePath).replaceAll("\\", "/");

const main = async () => {
  const files = (await Promise.all(TARGET_DIRS.map((dir) => walk(dir)))).flat();
  const findings = (await Promise.all(files.map((file) => scanFile(file)))).flat();

  if (findings.length === 0) {
    console.log("Theme color check: no raw palette classes found.");
    return;
  }

  console.log("Theme color check: raw palette classes found.");
  findings.forEach((finding) => {
    console.log(
      `- ${relative(finding.filePath)}:${finding.line} -> ${finding.values.join(", ")}`,
    );
  });
  console.log(
    STRICT
      ? "Strict mode enabled: exiting with failure."
      : "Non-strict mode: reporting only. Run with --strict to fail CI.",
  );

  if (STRICT) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error("Theme color check failed:", error);
  process.exitCode = 1;
});
