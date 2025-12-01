import { promises as fs } from 'fs';
import path from 'path';

interface IcdEntry {
  code: string;
  title: string;
  type: 'billable' | 'header';
  chapter: string | null;
  block: string | null;
  includes: string[];
  excludes1: string[];
  excludes2: string[];
  notes: string[];
  rules: string[];
  children: string[];
}

const CODE_REGEX = /^([A-TV-Z][0-9]{2}(?:\.[A-Z0-9]+)?)(?:\s+|\t+)(.+)$/;
const BLOCK_REGEX = /^([A-Z][0-9]{2})\s*[–-]\s*([A-Z][0-9]{2})\b(.*)$/;
const CHAPTER_REGEX = /^Chapter\s+\d+\.\s*(.+)$/i;

const DATA_FILE = path.join(__dirname, '..', 'data', 'icd-10-cm-2025.txt');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'icd-master.json');

function createEntry(code: string, chapter: string | null, block: string | null, title: string): IcdEntry {
  return {
    code,
    title: title.trim(),
    type: 'billable',
    chapter,
    block,
    includes: [],
    excludes1: [],
    excludes2: [],
    notes: [],
    rules: [],
    children: [],
  };
}

function isContinuation(line: string): boolean {
  return Boolean(line) && !CODE_REGEX.test(line) && !BLOCK_REGEX.test(line) && !CHAPTER_REGEX.test(line);
}

async function build() {
  const content = await fs.readFile(DATA_FILE, 'utf8');
  const lines = content.split(/\r?\n/);

  const entries = new Map<string, IcdEntry>();

  let currentChapter: string | null = null;
  let currentBlock: string | null = null;
  let currentCode: string | null = null;
  let currentDetailType: keyof Pick<IcdEntry, 'includes' | 'excludes1' | 'excludes2' | 'notes'> | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      currentDetailType = null;
      continue;
    }

    const chapterMatch = line.match(CHAPTER_REGEX);
    if (chapterMatch) {
      currentChapter = chapterMatch[1].trim();
      currentBlock = null;
      currentCode = null;
      currentDetailType = null;
      continue;
    }

    const blockMatch = line.match(BLOCK_REGEX);
    if (blockMatch) {
      const [, start, end, rest] = blockMatch;
      const blockTitle = `${start}-${end}${rest ? ' ' + rest.trim() : ''}`;
      currentBlock = blockTitle;
      currentCode = null;
      currentDetailType = null;
      continue;
    }

    const codeMatch = line.match(CODE_REGEX);
    if (codeMatch) {
      const [, code, title] = codeMatch;
      if (title.trim().startsWith('–') || title.trim().startsWith('-')) {
        currentDetailType = null;
        continue;
      }

      const existing = entries.get(code);
      if (!existing) {
        entries.set(code, createEntry(code, currentChapter, currentBlock, title));
      } else if (!existing.title && title) {
        existing.title = title.trim();
      }

      currentCode = code;
      currentDetailType = null;
      continue;
    }

    if (!currentCode) {
      continue;
    }

    const lower = line.toLowerCase();

    if (line.startsWith('Includes:')) {
      entries.get(currentCode)?.includes.push(line.replace(/^Includes:/i, '').trim());
      currentDetailType = 'includes';
      continue;
    }

    if (line.startsWith('Excludes1:')) {
      entries.get(currentCode)?.excludes1.push(line.replace(/^Excludes1:/i, '').trim());
      currentDetailType = 'excludes1';
      continue;
    }

    if (line.startsWith('Excludes2:')) {
      entries.get(currentCode)?.excludes2.push(line.replace(/^Excludes2:/i, '').trim());
      currentDetailType = 'excludes2';
      continue;
    }

    if (line.startsWith('Note:')) {
      entries.get(currentCode)?.notes.push(line.replace(/^Note:/i, '').trim());
      currentDetailType = 'notes';
      continue;
    }

    if (
      lower.startsWith('code first') ||
      lower.startsWith('use additional code') ||
      lower.startsWith('code also')
    ) {
      entries.get(currentCode)?.rules.push(line.trim());
      currentDetailType = null;
      continue;
    }

    if (currentDetailType && isContinuation(line)) {
      const entry = entries.get(currentCode);
      if (entry) {
        entry[currentDetailType].push(line);
      }
      continue;
    }
  }

  for (const entry of entries.values()) {
    const parentCode = findParentCode(entry.code, entries);
    if (parentCode) {
      const parent = entries.get(parentCode);
      if (parent && !parent.children.includes(entry.code)) {
        parent.children.push(entry.code);
      }
    }
  }

  let billableCount = 0;
  let ruleCount = 0;
  for (const entry of entries.values()) {
    if (entry.children.length > 0) {
      entry.type = 'header';
    } else {
      billableCount += 1;
      entry.type = 'billable';
    }
    ruleCount +=
      entry.includes.length +
      entry.excludes1.length +
      entry.excludes2.length +
      entry.notes.length +
      entry.rules.length;
  }

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(Object.fromEntries(entries), null, 2), 'utf8');

  const chapters = new Set(Array.from(entries.values()).map((e) => e.chapter).filter(Boolean));

  console.log(`Chapters: ${chapters.size}`);
  console.log(`Blocks: ${new Set(Array.from(entries.values()).map((e) => e.block).filter(Boolean)).size}`);
  console.log(`Codes: ${entries.size}`);
  console.log(`Billable codes: ${billableCount}`);
  console.log(`Rules extracted: ${ruleCount}`);
}

function findParentCode(code: string, entries: Map<string, IcdEntry>): string | null {
  if (code.includes('.')) {
    const segments = code.split('.');
    segments.pop();
    while (segments.length) {
      const candidate = segments.join('.');
      if (entries.has(candidate)) {
        return candidate;
      }
      segments.pop();
    }
  }

  const base = code.slice(0, 3);
  if (base !== code && entries.has(base)) {
    return base;
  }

  return null;
}

build().catch((error) => {
  console.error('Failed to build ICD master file:', error);
  process.exit(1);
});
