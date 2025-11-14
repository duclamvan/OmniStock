#!/bin/bash
# Dark Mode Audit Script - Find hard-coded light-only colors

FILE=$1
if [ -z "$FILE" ]; then
  echo "Usage: ./dark-mode-audit.sh <file-path>"
  exit 1
fi

echo "🔍 Auditing dark mode in: $FILE"
echo "===================================="

# Check for hard-coded color backgrounds
echo "\n📦 Hard-coded backgrounds without dark: variants:"
grep -nE "bg-(red|yellow|green|blue|purple|pink|amber|orange|emerald|cyan|indigo|violet|rose)-(50|100|200|500)" "$FILE" | grep -v "dark:" | cat

# Check for hard-coded text colors
echo "\n📝 Hard-coded text colors without dark: variants:"
grep -nE "text-(red|green|blue|yellow|purple|pink|amber|orange|emerald|cyan|indigo|violet|rose)-(600|700|800)" "$FILE" | grep -v "dark:" | cat

# Check for gradients
echo "\n🌈 Gradients without dark: variants:"
grep -nE "from-.*-[0-9]|to-.*-[0-9]" "$FILE" | grep -v "dark:" | cat

# Check for borders
echo "\n🔲 Hard-coded borders without dark: variants:"
grep -nE "border-(red|yellow|green|blue|purple|pink|amber|orange|emerald|cyan|indigo|violet|rose)-(200|300|400)" "$FILE" | grep -v "dark:" | cat

echo "\n✅ Audit complete!"
