import { readdir, readFile, writeFile, access } from 'fs/promises';
import { join, relative, basename } from 'path';

const APIDOC_DIR = 'release/apidoc';
const MD_DIR = join(APIDOC_DIR, 'md');

// Section heading labels for llms.txt
const GROUP_LABELS = {
  classes: 'Classes',
  interfaces: 'Interfaces',
  enums: 'Enumerations',
  types: 'Type Aliases',
  functions: 'Functions',
  variables: 'Variables',
  modules: 'Modules',
};

async function walkFiles(dir, ext) {
  let results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(await walkFiles(full, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

async function dirExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

// The full self-contained toggle HTML to inject before </body>
function buildToggleSnippet() {
  return `
<script>
(function () {
  function deriveMdUrl(htmlPath) {
    var path = htmlPath
      .replace(/[/]index.html$/, '/md/README.md')
      .replace(/[/]modules.html$/, '/md/modules.md')
      .replace(/html$/, 'md')
      .replace(/[/](?=classes|enums|interfaces)/, '/md/');
    return path;
  }

  // Insert "View Markdown" link after the Externals label in the toolbar
  var externalsLabel = document.querySelector('label[for="tsd-filter-externals"]');
  if (externalsLabel) {
    var a = document.createElement('a');
    a.href = deriveMdUrl(window.location.pathname);
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'tsd-widget';
    a.id = 'md-view-markdown';
    a.style.cssText = 'height:40px;line-height:40px;padding:0 6px 0 10px;overflow:visible;display:inline-flex;align-items:center;gap:5px;';
    a.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;vertical-align:middle;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>View Markdown';
    var style = document.createElement('style');
    style.textContent = '#md-view-markdown::before{display:none;}';
    document.head.appendChild(style);
    externalsLabel.parentNode.insertBefore(a, externalsLabel.nextSibling);
  }
})();
</script>`;
}

async function injectToggleButtons() {
  const htmlFiles = await walkFiles(APIDOC_DIR, '.html');
  let count = 0;
  for (const file of htmlFiles) {
    let html = await readFile(file, 'utf8');
    if (html.includes('deriveMdUrl')) continue; // already injected (idempotent)
    if (!html.includes('</body>')) continue;       // skip malformed files
    html = html.replace('</body>', buildToggleSnippet() + '\n</body>');
    await writeFile(file, html, 'utf8');
    count++;
  }
  console.log(`Injected toggle into ${count} HTML file(s).`);
}

async function extractTitle(mdPath) {
  try {
    const content = await readFile(mdPath, 'utf8');
    const match = content.match(/^#+\s+(.+)$/m);
    return match ? match[1].trim() : basename(mdPath, '.md');
  } catch {
    return basename(mdPath, '.md');
  }
}

async function extractDescription(mdPath) {
  // Return first non-heading, non-empty line as a short description
  try {
    const content = await readFile(mdPath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('>')) {
        // Truncate at 120 chars
        return trimmed.length > 120 ? trimmed.slice(0, 117) + '...' : trimmed;
      }
    }
  } catch {
    // ignore
  }
  return '';
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function generateLlmsTxt() {
  if (!(await dirExists(MD_DIR))) {
    console.warn('md/ directory not found, skipping llms.txt generation.');
    return;
  }

  const mdFiles = await walkFiles(MD_DIR, '.md');

  // Group files by first path segment (classes/, interfaces/, etc.)
  // Files directly in MD_DIR (like README.md) go into a '__root__' group
  const grouped = {};
  for (const file of mdFiles) {
    const rel = relative(MD_DIR, file);
    const parts = rel.split('/');
    const group = parts.length > 1 ? parts[0] : '__root__';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(rel);
  }

  const today = new Date().toISOString().slice(0, 10);
  let content = '# Nexconn ChatUI API Reference\n\n';
  content += '> NexConn ChatUI SDK API documentation for instant messaging UI components.\n';
  content += '> Each entry links to a Markdown file. Paths are relative to this file\'s location.\n\n';

  // Root-level files first (README, index)
  if (grouped['__root__']) {
    for (const rel of grouped['__root__'].sort()) {
      const title = await extractTitle(join(MD_DIR, rel));
      const desc = await extractDescription(join(MD_DIR, rel));
      content += `- [${title}](md/${rel})${desc ? ': ' + desc : ''}\n`;
    }
    content += '\n';
  }

  // Sorted sections
  const sectionOrder = ['classes', 'interfaces', 'enums', 'types', 'functions', 'variables', 'modules'];
  const otherGroups = Object.keys(grouped)
    .filter(g => g !== '__root__' && !sectionOrder.includes(g))
    .sort();
  const allGroups = [...sectionOrder.filter(g => grouped[g]), ...otherGroups];

  for (const group of allGroups) {
    if (!grouped[group]) continue;
    const label = GROUP_LABELS[group] || capitalize(group);
    content += `## ${label}\n\n`;
    for (const rel of grouped[group].sort()) {
      const title = await extractTitle(join(MD_DIR, rel));
      const desc = await extractDescription(join(MD_DIR, rel));
      content += `- [${title}](md/${rel})${desc ? ': ' + desc : ''}\n`;
    }
    content += '\n';
  }

  content += `---\n\n*Generated by TypeDoc. Last updated: ${today}*\n`;

  await writeFile(join(APIDOC_DIR, 'llms.txt'), content, 'utf8');
  console.log(`Generated llms.txt with ${mdFiles.length} entries.`);
}

async function main() {
  await injectToggleButtons();
  await generateLlmsTxt();
}

main().catch(err => {
  console.error('postprocess-apidoc failed:', err);
  process.exit(1);
});
