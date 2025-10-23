#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Discord Webhook Comprehensive Test                          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

BASE_URL="${1:-https://spec-beanbot-dpmetz5387en.lazhannya.deno.net}"

echo "Testing URL: $BASE_URL"
echo ""

# Test 1: Health Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Health Check Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s "${BASE_URL}/api/health")
echo "$response" | jq . 2>/dev/null || echo "$response"
publicKeyValid=$(echo "$response" | jq -r '.discord.publicKeyValid' 2>/dev/null)
if [ "$publicKeyValid" = "true" ]; then
    echo "✅ PUBLIC_KEY is configured correctly"
else
    echo "❌ PUBLIC_KEY is NOT valid (should be 64 hex characters)"
fi
echo ""

# Test 2: Main Webhook Endpoint (GET)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Main Webhook Endpoint (GET)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s "${BASE_URL}/api/webhook/discord")
echo "$response" | jq . 2>/dev/null || echo "$response"
echo ""

# Test 3: Debug Webhook Endpoint (GET)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Debug Webhook Endpoint (GET)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s "${BASE_URL}/api/webhook/discord-debug" 2>&1)
echo "$response" | jq . 2>/dev/null || echo "$response"
if echo "$response" | grep -q "debug"; then
    echo "✅ Debug endpoint is accessible"
else
    echo "❌ Debug endpoint not accessible yet (may still be deploying)"
fi
echo ""

# Test 4: POST to debug endpoint (simulating Discord)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: POST to Debug Endpoint (Simulating Discord PING)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s -X POST "${BASE_URL}/api/webhook/discord-debug" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Discord-Interactions/1.0" \
  -d '{"type":1,"application_id":"123456789","id":"test_interaction","token":"test_token"}')
echo "$response" | jq . 2>/dev/null || echo "$response"
echo ""
echo "⚠️  Check Deno Deploy logs for debug output!"
echo "    URL: https://dash.deno.com/projects/spec-beanbot/logs"
echo ""

# Test 5: DNS Resolution
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: DNS Resolution"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
domain=$(echo "$BASE_URL" | sed 's|https://||' | sed 's|http://||' | cut -d/ -f1)
echo "Domain: $domain"
ip=$(dig +short "$domain" | head -1)
if [ -n "$ip" ]; then
    echo "✅ DNS resolves to: $ip"
else
    echo "❌ DNS resolution failed"
fi
echo ""

# Test 6: SSL Certificate
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 6: SSL Certificate Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cert_info=$(echo | openssl s_client -servername "$domain" -connect "${domain}:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ SSL certificate is valid"
    echo "$cert_info"
else
    echo "⚠️  Could not verify SSL certificate"
fi
echo ""

# Summary
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Summary & Next Steps                                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "URLs to set in Discord Developer Portal:"
echo ""
echo "Option 1 (Debug - No signature verification):"
echo "  ${BASE_URL}/api/webhook/discord-debug"
echo ""
echo "Option 2 (Production - With signature verification):"
echo "  ${BASE_URL}/api/webhook/discord"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "IMPORTANT: When you set the URL in Discord Portal:"
echo "1. Clear any existing URL first"
echo "2. Wait 30 seconds"
echo "3. Paste the new URL"
echo "4. Click 'Save Changes'"
echo "5. IMMEDIATELY watch Deno Deploy logs:"
echo "   https://dash.deno.com/projects/spec-beanbot/logs"
echo ""
echo "You should see logs within 1-2 seconds of clicking Save!"
echo ""
