/// <reference lib="es2021" />
// @ts-nocheck

import * as fs from 'fs';
import * as path from 'path';
import type { IcdCode } from './models.ts';

interface ParseResult {
  codes: IcdCode[];
  chapters: Set<string>;
  blocks: Set<string>;
  log: string[];
}

const BLOCK_PATTERN = /^([A-Z][0-9][0-9A-Z])[–-]([A-Z][0-9][0-9A-Z])\s+(.+)/;
const CHAPTER_PATTERN = /^Chapter\s+\d+\.\s*(.+?)\s*\(([^)]+)\)/;
const CODE_WITH_TITLE = /^([A-Z][0-9][0-9A-Z](?:\.[A-Z0-9]{1,4})?)\s+(.+)/;
const CODE_ONLY = /^([A-Z][0-9][0-9A-Z](?:\.[A-Z0-9]{1,4})?)$/;

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function parseIcd2025Tabular(rawText: string): ParseResult {
  const lines = rawText.split(/\r?\n/);
  const startAt = lines.findIndex((line) => /^Chapter\s+1\./.test(line.trim()))
    ?? lines.findIndex((line) => /^A00[–-]A09/.test(line.trim()));
  const logs: string[] = [];

  let currentChapter: string | undefined;
  let currentBlock: string | undefined;
  let pendingCode: { code: string; line: number } | null = null;
  let pendingChapterLine: string | null = null;

  const codes: IcdCode[] = [];
  const chapters = new Set<string>();
  const blocks = new Set<string>();

  const firstMatches: IcdCode[] = [];

  const appendCode = (code: string, title: string, line: number) => {
    const entry: IcdCode = {
      code,
      shortDescription: title,
      longDescription: title,
      chapter: currentChapter,
      block: currentBlock,
      isBillable: true,
      isHeader: false,
    };
    codes.push(entry);
    if (firstMatches.length < 10) {
      firstMatches.push(entry);
    }
    if (currentChapter) chapters.add(currentChapter);
    if (currentBlock) blocks.add(currentBlock);
  };

  for (let idx = startAt >= 0 ? startAt : 0; idx < lines.length; idx += 1) {
    const raw = lines[idx];
    const line = clean(raw.replace(/[\u2013]/g, '-'));
    if (!line) continue;

    const chapterTarget = pendingChapterLine ? `${pendingChapterLine} ${line}` : line;
    const chapterMatch = CHAPTER_PATTERN.exec(chapterTarget);
    if (chapterMatch) {
      currentChapter = chapterMatch[1];
      pendingCode = null;
      pendingChapterLine = null;
      continue;
    }
    if (/^Chapter\s+\d+\./.test(line)) {
      pendingChapterLine = line;
      continue;
    }

    const blockMatch = BLOCK_PATTERN.exec(line);
    if (blockMatch) {
      currentBlock = `${blockMatch[1]}-${blockMatch[2]} ${clean(blockMatch[3])}`;
      pendingCode = null;
      continue;
    }

    const withTitle = CODE_WITH_TITLE.exec(line);
    if (withTitle) {
      const [, code, title] = withTitle;
      if (!code.includes('-')) {
        appendCode(code, clean(title), idx + 1);
      }
      pendingCode = null;
      continue;
    }

    const onlyCode = CODE_ONLY.exec(line);
    if (onlyCode) {
      pendingCode = { code: onlyCode[1], line: idx + 1 };
      continue;
    }

    if (pendingCode) {
      appendCode(pendingCode.code, line, pendingCode.line);
      pendingCode = null;
      continue;
    }
  }

  if (pendingCode) {
    logs.push(`Dangling code at EOF: ${pendingCode.code} (line ${pendingCode.line})`);
  }

  logs.push(`Matched codes: ${codes.length}`);
  logs.push(`Chapters: ${chapters.size}`);
  logs.push(`Blocks: ${blocks.size}`);
  logs.push(`First 10 matches: ${firstMatches.map((c) => `${c.code} ${c.shortDescription}`).join('; ')}`);
  logs.push(`Stopped at line: ${lines.length}`);

  return { codes, chapters, blocks, log: logs };
}

export function parseIcdFile(filePath: string): ParseResult {
  const resolved = path.resolve(filePath);
  const text = fs.readFileSync(resolved, 'utf8');
  return parseIcd2025Tabular(text);
}

if (require.main === module) {
  const filePath = process.argv[2] || path.resolve(process.cwd(), 'data/icd-10-cm-2025.txt');
  const { codes, chapters, blocks, log } = parseIcdFile(filePath);
  const summary = {
    totalCodes: codes.length,
    chapters: chapters.size,
    blocks: blocks.size,
    first5: codes.slice(0, 5).map((c) => `${c.code} ${c.shortDescription}`),
    last5: codes.slice(-5).map((c) => `${c.code} ${c.shortDescription}`),
  };

  console.log('[ICD parser] Summary:', summary);
  log.forEach((entry) => console.log('[ICD parser]', entry));
}
