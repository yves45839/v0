#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "app");
const COMPONENTS_DIR = path.join(ROOT, "components");
const HOOKS_DIR = path.join(ROOT, "hooks");
const LIB_DIR = path.join(ROOT, "lib");
const OUTPUT_FILE = path.join(ROOT, "docs", "frontend-inventory.md");

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const ERROR_KEYWORDS = [
  "erreur",
  "error",
  "impossible",
  "echec",
  "echoue",
  "failed",
  "failure",
  "invalide",
  "invalid",
  "introuvable",
  "not found",
  "obligatoire",
  "required",
  "missing",
  "forbidden",
  "unauthorized",
  "permission",
];

const MODAL_PATTERNS = [
  { key: "Dialog", regex: /<Dialog(?:\s|>)/g },
  { key: "Drawer", regex: /<Drawer(?:\s|>)/g },
  { key: "AlertDialog", regex: /<AlertDialog(?:\s|>)/g },
  { key: "Popover", regex: /<Popover(?:\s|>)/g },
  { key: "DropdownMenu", regex: /<DropdownMenu(?:\s|>)/g },
];

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function walkFiles(startDir) {
  if (!fs.existsSync(startDir)) return [];
  const output = [];
  const stack = [startDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === ".next" || entry.name === "node_modules") {
        continue;
      }

      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
        continue;
      }

      const ext = path.extname(entry.name);
      if (SOURCE_EXTENSIONS.has(ext)) {
        output.push(absolute);
      }
    }
  }

  return output.sort((left, right) => left.localeCompare(right));
}

function readText(absolutePath) {
  return fs.readFileSync(absolutePath, "utf8");
}

function countMatches(text, regex) {
  return (text.match(regex) || []).length;
}

function compactWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeMessage(raw) {
  const compact = compactWhitespace(raw.replace(/\\n/g, " ").replace(/\\t/g, " "));
  if (!compact) return null;
  if (compact.includes("${")) return null;
  if (compact.length < 6 || compact.length > 260) return null;
  return compact;
}

function looksLikeError(message) {
  const lower = message.toLowerCase();
  return ERROR_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function looksLikeCssToken(message) {
  const cssMarkers = [
    "bg-",
    "text-",
    "border-",
    "ring-",
    "hover:",
    "focus:",
    "aria-",
    "data-[",
    "group/",
    "dark:",
    "rounded-",
    "px-",
    "py-",
  ];
  return cssMarkers.some((marker) => message.includes(marker));
}

function isValidErrorMessage(message) {
  if (!message) return false;
  if (/^[A-Z0-9_]+$/.test(message)) return false;
  if (/^[a-z0-9_/-]+$/i.test(message) && message.includes("-")) return false;
  if (looksLikeCssToken(message)) return false;

  const hasReadableStructure = /\s|['".,;:!?()-]/.test(message);
  if (!hasReadableStructure && message.length < 20) return false;
  return true;
}

function extractErrorMessages(content) {
  const messages = new Set();
  const patterns = [
    /throw new Error\(\s*([`'"])([\s\S]*?)\1\s*\)/g,
    /set[A-Za-z0-9_]*Error\(\s*([`'"])([\s\S]*?)\1\s*\)/g,
    /set[A-Za-z0-9_]*Message\(\s*([`'"])([\s\S]*?)\1\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const candidate = normalizeMessage(match[2] || "");
      if (candidate && looksLikeError(candidate) && isValidErrorMessage(candidate)) {
        messages.add(candidate);
      }
    }
  }

  for (const line of content.split(/\r?\n/)) {
    if (!/error|erreur|impossible|echec|invalid|required|missing|obligatoire/i.test(line)) {
      continue;
    }

    const stringMatches = [...line.matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g)];
    for (const stringMatch of stringMatches) {
      const candidate = normalizeMessage(stringMatch[2] || "");
      if (candidate && looksLikeError(candidate) && isValidErrorMessage(candidate)) {
        messages.add(candidate);
      }
    }
  }

  return Array.from(messages).sort((left, right) => left.localeCompare(right));
}

function extractDialogTitles(content) {
  const titles = [];
  const titleMatches = content.matchAll(/<DialogTitle[^>]*>([\s\S]*?)<\/DialogTitle>/g);
  for (const match of titleMatches) {
    const normalized = compactWhitespace(match[1].replace(/<[^>]+>/g, ""));
    if (!normalized || normalized.includes("{")) continue;
    titles.push(normalized);
  }
  return Array.from(new Set(titles));
}

function detectPageTitle(content, route) {
  const fromContextBar = content.match(/<PageContextBar[\s\S]*?title="([^"]+)"/);
  if (fromContextBar?.[1]) return fromContextBar[1];

  const fromHeading = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (fromHeading?.[1]) return compactWhitespace(fromHeading[1]);

  const fromFunction = content.match(/export default (?:async )?function ([A-Za-z0-9_]+)/);
  if (fromFunction?.[1]) return fromFunction[1];

  return route === "/" ? "Dashboard" : route;
}

function extractExportedSymbols(content) {
  const symbols = new Set();
  const patterns = [
    /export function ([A-Za-z0-9_]+)/g,
    /export const ([A-Za-z0-9_]+)/g,
    /export default function ([A-Za-z0-9_]+)/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      symbols.add(match[1]);
    }
  }

  for (const exportList of content.matchAll(/export\s*\{([^}]+)\}/g)) {
    const items = exportList[1]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const parts = item.split(/\s+as\s+/i);
        return (parts[parts.length - 1] || "").trim();
      })
      .filter((item) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(item));

    for (const item of items) {
      symbols.add(item);
    }
  }

  for (const defaultExport of content.matchAll(/export default ([A-Za-z_][A-Za-z0-9_]*)/g)) {
    symbols.add(defaultExport[1]);
  }

  return Array.from(symbols).sort((left, right) => left.localeCompare(right));
}

function formatModalSummary(modalCounts, confirmCount) {
  const parts = [];
  for (const [key, value] of Object.entries(modalCounts)) {
    if (value > 0) parts.push(`${key} x${value}`);
  }
  if (confirmCount > 0) {
    parts.push(`window.confirm x${confirmCount}`);
  }
  return parts.length > 0 ? parts.join(", ") : "-";
}

function safeRelative(absolutePath) {
  return toPosix(path.relative(ROOT, absolutePath));
}

function buildInventory() {
  const appFiles = walkFiles(APP_DIR);
  const componentFiles = walkFiles(COMPONENTS_DIR);
  const hookFiles = walkFiles(HOOKS_DIR);
  const libFiles = walkFiles(LIB_DIR);
  const sourceFiles = [...appFiles, ...componentFiles, ...hookFiles, ...libFiles];

  const pageFiles = appFiles.filter((filePath) => /page\.tsx?$/.test(filePath));
  const pages = pageFiles.map((filePath) => {
    const content = readText(filePath);
    const relInApp = path.relative(APP_DIR, filePath);
    const routeDir = path.dirname(relInApp);
    const route = routeDir === "." ? "/" : `/${toPosix(routeDir)}`;
    const modalCounts = Object.fromEntries(
      MODAL_PATTERNS.map(({ key, regex }) => [key, countMatches(content, regex)])
    );
    const confirmCount = countMatches(content, /window\.confirm\(/g);
    const errorMessages = extractErrorMessages(content);

    return {
      route,
      title: detectPageTitle(content, route),
      file: safeRelative(filePath),
      modalSummary: formatModalSummary(modalCounts, confirmCount),
      errorCount: errorMessages.length,
    };
  });

  const popupFiles = [...appFiles, ...componentFiles]
    .map((filePath) => {
      const content = readText(filePath);
      const isPrimitiveUiFile = safeRelative(filePath).startsWith("components/ui/");
      if (isPrimitiveUiFile) return null;

      const modalCounts = Object.fromEntries(
        MODAL_PATTERNS.map(({ key, regex }) => [key, countMatches(content, regex)])
      );
      const confirmCount = countMatches(content, /window\.confirm\(/g);
      const totalPopups =
        Object.values(modalCounts).reduce((sum, value) => sum + value, 0) + confirmCount;
      if (totalPopups === 0) return null;

      return {
        file: safeRelative(filePath),
        counts: formatModalSummary(modalCounts, confirmCount),
        dialogTitles: extractDialogTitles(content),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.file.localeCompare(right.file));

  const errorFiles = sourceFiles
    .map((filePath) => {
      const content = readText(filePath);
      const messages = extractErrorMessages(content);
      if (messages.length === 0) return null;
      return {
        file: safeRelative(filePath),
        messages,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.file.localeCompare(right.file));

  const componentCatalog = componentFiles
    .map((filePath) => {
      const content = readText(filePath);
      const rel = safeRelative(filePath);
      const relFromComponents = rel.replace(/^components\//, "");
      const category = relFromComponents.includes("/") ? relFromComponents.split("/")[0] : "root";
      const exports = extractExportedSymbols(content);
      return {
        file: rel,
        category,
        exports,
      };
    })
    .sort((left, right) => left.file.localeCompare(right.file));

  const hookCatalog = hookFiles
    .map((filePath) => ({
      file: safeRelative(filePath),
      exports: extractExportedSymbols(readText(filePath)),
    }))
    .sort((left, right) => left.file.localeCompare(right.file));

  const componentsByCategory = new Map();
  for (const item of componentCatalog) {
    const bucket = componentsByCategory.get(item.category) || [];
    bucket.push(item);
    componentsByCategory.set(item.category, bucket);
  }

  return { pages, popupFiles, errorFiles, componentCatalog, hookCatalog, componentsByCategory };
}

function renderMarkdown(inventory) {
  const generatedAt = new Date().toISOString();
  const { pages, popupFiles, errorFiles, componentCatalog, hookCatalog, componentsByCategory } = inventory;
  const pageLines = pages
    .map(
      (page) =>
        `| \`${page.route}\` | ${page.title} | \`${page.file}\` | ${page.modalSummary} | ${page.errorCount} |`
    )
    .join("\n");

  const popupLines = popupFiles
    .map((entry) => {
      const titles =
        entry.dialogTitles.length > 0
          ? entry.dialogTitles.map((title) => `\`${title}\``).join(", ")
          : "-";
      return `| \`${entry.file}\` | ${entry.counts} | ${titles} |`;
    })
    .join("\n");

  const errorSections = errorFiles
    .map((entry) => {
      const messages = entry.messages.map((message) => `- ${message}`).join("\n");
      return `### \`${entry.file}\`\n${messages}`;
    })
    .join("\n\n");

  const categorySections = Array.from(componentsByCategory.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, files]) => {
      const rows = files
        .map((item) => {
          const exported = item.exports.length > 0 ? item.exports.map((name) => `\`${name}\``).join(", ") : "-";
          return `| \`${item.file}\` | ${exported} |`;
        })
        .join("\n");

      return `### ${category}\n| Fichier | Exports |\n| --- | --- |\n${rows}`;
    })
    .join("\n\n");

  const hookRows =
    hookCatalog.length === 0
      ? "| - | - |"
      : hookCatalog
          .map((item) => {
            const exported = item.exports.length > 0 ? item.exports.map((name) => `\`${name}\``).join(", ") : "-";
            return `| \`${item.file}\` | ${exported} |`;
          })
          .join("\n");

  return `# Frontend Inventory

Genere automatiquement le ${generatedAt}.

## Resume
- Pages (routes): ${pages.length}
- Fichiers avec popups/fenetres contextuelles: ${popupFiles.length}
- Fichiers avec messages d'erreurs detectes: ${errorFiles.length}
- Fichiers composants (dans \`components/\`): ${componentCatalog.length}
- Fichiers hooks (dans \`hooks/\`): ${hookCatalog.length}

## Pages
| Route | Titre | Fichier | Fenetres contextuelles detectees | Nb messages d'erreurs |
| --- | --- | --- | --- | --- |
${pageLines}

## Fenetres contextuelles (Dialog, Drawer, Popover, Dropdown, Confirm)
| Fichier | Occurrences | Titres de dialogue detectes |
| --- | --- | --- |
${popupLines}

## Messages D'Erreurs
${errorSections}

## Catalogue Des Composants
${categorySections}

## Hooks Frontend
| Fichier | Exports |
| --- | --- |
${hookRows}
`;
}

function ensureParentDir(filePath) {
  const parent = path.dirname(filePath);
  fs.mkdirSync(parent, { recursive: true });
}

function main() {
  const inventory = buildInventory();
  const markdown = renderMarkdown(inventory);
  ensureParentDir(OUTPUT_FILE);
  fs.writeFileSync(OUTPUT_FILE, markdown, "utf8");
  process.stdout.write(`Inventory generated: ${safeRelative(OUTPUT_FILE)}\n`);
}

main();
