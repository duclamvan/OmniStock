#!/usr/bin/env tsx

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface Finding {
  file: string;
  line: number;
  type: 'placeholder' | 'toast' | 'jsx_literal';
  content: string;
}

const WHITELISTED_PATTERNS = [
  // Technical constants
  /^(EUR|CZK|USD|SKU|COD|VAT|API|URL|ID|PDF|PNG|JPG|JPEG|WEBP|CSV|XLSX)$/,
  // Format examples
  /^\d+x\d+x\d+$/, // "120x80x80"
  /^[\d.,]+$/, // "0,100,150,250"
  /^e\.g\.,/, // "e.g., PPL Parcel CZ Private"
  // Developer/technical strings
  /^(console|log|error|warn|info|debug)/,
  /^(https?:\/\/|www\.)/,
  // Single characters or very short strings
  /^.{1,3}$/,
  // Email placeholders
  /@example\.(com|org)/,
  // Date format strings
  /^(yyyy|MM|dd|HH|mm|ss|PPP|p)/,
  
  // Contextual examples (person names, addresses)
  /^(John|Jane|Doe|Smith|Main Street|Prague|Prague 1|Czech Republic)$/,
  // Common single-word helpers
  /^(Optional|Note|Name|Type|Status|ID|Code)$/,
  // Multiline instructional examples (contains "Example:" or bullet points)
  /Example:|•|\\n\\n/,
];

const WHITELISTED_FILES = [
  'vite-env.d.ts',
  'i18n.ts',
  'i18n/locales',
  'GLSAutofillButton.tsx', // Contains German DOM selectors
];

function shouldWhitelist(content: string): boolean {
  const trimmed = content.trim();
  return WHITELISTED_PATTERNS.some(pattern => pattern.test(trimmed));
}

function shouldSkipFile(filePath: string): boolean {
  return WHITELISTED_FILES.some(skip => filePath.includes(skip));
}

function scanFile(filePath: string): Finding[] {
  if (shouldSkipFile(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const findings: Finding[] = [];

  lines.forEach((line, index) => {
    // Skip comments and imports
    if (line.trim().startsWith('//') || line.trim().startsWith('import')) {
      return;
    }

    // Check for hardcoded placeholders
    const placeholderMatch = line.match(/placeholder=["']([A-Z][^"']+)["']/);
    if (placeholderMatch && !line.includes('t(') && !shouldWhitelist(placeholderMatch[1])) {
      findings.push({
        file: filePath,
        line: index + 1,
        type: 'placeholder',
        content: placeholderMatch[1],
      });
    }

    // Check for hardcoded toast titles
    const toastMatch = line.match(/title:\s*["']([A-Z][^"']+)["']/);
    if (toastMatch && !line.includes('t(') && !shouldWhitelist(toastMatch[1])) {
      findings.push({
        file: filePath,
        line: index + 1,
        type: 'toast',
        content: toastMatch[1],
      });
    }

    // Check for JSX literal strings (>10 chars, starts with capital)
    const jsxMatch = line.match(/>([A-Z][a-zA-Z\s]{10,})</);
    if (jsxMatch && !line.includes('t(') && !shouldWhitelist(jsxMatch[1])) {
      findings.push({
        file: filePath,
        line: index + 1,
        type: 'jsx_literal',
        content: jsxMatch[1],
      });
    }
  });

  return findings;
}

function scanDirectory(dir: string): Finding[] {
  let findings: Finding[] = [];

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === 'build') {
        continue;
      }
      findings = findings.concat(scanDirectory(fullPath));
    } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
      findings = findings.concat(scanFile(fullPath));
    }
  }

  return findings;
}

function main() {
  console.log('🔍 Scanning for hardcoded English strings in i18n implementation...\n');

  const clientDir = join(process.cwd(), 'client/src');
  const findings = scanDirectory(clientDir);

  if (findings.length === 0) {
    console.log('✅ SUCCESS: No hardcoded English strings found!');
    console.log('🎉 100% bilingual coverage achieved!\n');
    process.exit(0);
  }

  console.log(`⚠️  Found ${findings.length} potential hardcoded strings:\n`);

  // Group by type
  const byType = findings.reduce((acc, finding) => {
    if (!acc[finding.type]) acc[finding.type] = [];
    acc[finding.type].push(finding);
    return acc;
  }, {} as Record<string, Finding[]>);

  for (const [type, items] of Object.entries(byType)) {
    console.log(`\n📋 ${type.toUpperCase()} (${items.length}):`);
    items.slice(0, 10).forEach(finding => {
      const relativePath = finding.file.replace(process.cwd() + '/', '');
      console.log(`  ${relativePath}:${finding.line}`);
      console.log(`    "${finding.content}"\n`);
    });
    if (items.length > 10) {
      console.log(`  ... and ${items.length - 10} more\n`);
    }
  }

  console.log(`\n⚠️  Total: ${findings.length} hardcoded strings need translation`);
  console.log('Run this script again after fixing to verify 100% coverage.\n');
  
  process.exit(1);
}

main();
