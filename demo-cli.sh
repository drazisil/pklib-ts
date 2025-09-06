#!/bin/bash

# PKLib-TS CLI Demo Script
# Demonstrates the usage of the CLI tool

echo "🎯 PKLib-TS CLI Demo"
echo "==================="
echo ""

echo "📝 1. Compressing 'Hello World' (ASCII mode):"
echo "   Input: Hello World"
echo "   Hex:   48656c6c6f20576f726c64"
echo ""
npx ts-node cli.ts implode "48656c6c6f20576f726c64" --ascii
echo ""

echo "📝 2. Compressing 'Hello World' (Binary mode, 2048 dict):"
echo ""
npx ts-node cli.ts implode "48656c6c6f20576f726c64" --dict=2048
echo ""

echo "📝 3. Decompressing a test fixture (first 100 bytes of small.imploded):"
echo ""
# Get first 100 bytes as hex
HEX=$(xxd -p test-fixtures/small.imploded | tr -d '\n' | head -c 200)
npx ts-node cli.ts explode "$HEX" | head -15
echo ""

echo "📝 4. Round-trip test (compress then decompress):"
echo "   Original: The quick brown fox jumps over the lazy dog"
ORIGINAL_HEX="54686520717569636b2062726f776e20666f78206a756d7073206f76657220746865206c617a7920646f67"
echo "   Hex: $ORIGINAL_HEX"
echo ""

# Compress
echo "   🔒 Compressing..."
COMPRESSED=$(npx ts-node cli.ts implode "$ORIGINAL_HEX" --ascii 2>&1 | grep "^[0-9A-F]" | tr -d ' ')
echo "   Compressed hex: $COMPRESSED"
echo ""

# Decompress
echo "   🔓 Decompressing..."
npx ts-node cli.ts explode "$COMPRESSED" | tail -5
echo ""

echo "✅ Demo complete!"
