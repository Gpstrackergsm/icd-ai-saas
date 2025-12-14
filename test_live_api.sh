#!/bin/bash

# Test script to verify live API has the angina fixes

echo "🔍 Testing Live API - Angina Fix Verification"
echo "=============================================="
echo ""

# Test Case 1: HTN+ESRD+HF (should have I50.23 as primary)
echo "Test 1: Case 1 - Acute on Chronic HF"
echo "Expected Primary: I50.23"
echo "Testing..."

CASE1_TEXT="80-year-old male with long-standing hypertension, ESRD on chronic hemodialysis, and chronic systolic CHF admitted for worsening shortness of breath due to acute on chronic heart failure."

RESPONSE=$(curl -s -X POST https://www.icd-10-cm.online/api/encode-structured \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{\"text\": \"$CASE1_TEXT\"}")

echo "$RESPONSE" | jq -r '.data.primary.code' 2>/dev/null || echo "⚠️  Need to add auth token"
echo "$RESPONSE" | jq -r '.data._debug' 2>/dev/null
echo ""

# Test Case 2: CAD with stable angina (should have I25.111, NOT I25.10)
echo "Test 2: Case 10 - Stable Angina"
echo "Expected Primary: I25.111"
echo "Testing..."

CASE10_TEXT="65-year-old male with coronary artery disease and chronic stable angina admitted for exertional chest pain without MI."

RESPONSE=$(curl -s -X POST https://www.icd-10-cm.online/api/encode-structured \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{\"text\": \"$CASE10_TEXT\"}")

echo "$RESPONSE" | jq -r '.data.primary.code' 2>/dev/null || echo "⚠️  Need to add auth token"
echo ""

# Test Case 3: CAD without angina (should have I25.10)
echo "Test 3: Case 19 - CAD Without Angina"
echo "Expected Primary: I25.10"
echo "Testing..."

CASE19_TEXT="64-year-old female with coronary artery disease without angina admitted for elective cardiac evaluation."

RESPONSE=$(curl -s -X POST https://www.icd-10-cm.online/api/encode-structured \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{\"text\": \"$CASE19_TEXT\"}")

echo "$RESPONSE" | jq -r '.data.primary.code' 2>/dev/null || echo "⚠️  Need to add auth token"
echo ""

# Check API version
echo "API Version Check:"
echo "$RESPONSE" | jq -r '.data._debug.apiVersion' 2>/dev/null
echo ""

echo "=============================================="
echo "✅ Test complete. Check results above."
echo ""
echo "Expected API Version: v3.5-ANGINA-FIX"
echo "If you see v3.4 or older, Vercel rebuild is still in progress."
