#!/bin/bash

# Test script for Discord webhook endpoint
# Usage: ./test-webhook.sh [URL]

URL="${1:-https://spec-beanbot-adyp6j75vwy3.lazhannya.deno.net}"
WEBHOOK_URL="${URL}/api/webhook/discord"

echo "===================================="
echo "Discord Webhook Endpoint Test"
echo "===================================="
echo ""
echo "Testing endpoint: $WEBHOOK_URL"
echo ""

# Test 1: Check if endpoint is reachable
echo "Test 1: GET request (endpoint accessibility)"
echo "------------------------------------"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$WEBHOOK_URL")
http_code=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')

echo "HTTP Status: $http_code"
echo "Response:"
echo "$body" | jq . 2>/dev/null || echo "$body"
echo ""

if [ "$http_code" = "200" ]; then
    echo "✅ Endpoint is reachable"
else
    echo "❌ Endpoint returned status $http_code"
fi

echo ""
echo "===================================="
echo "Next Steps:"
echo "===================================="
echo ""
echo "1. Check your Deno Deploy logs for detailed debugging output"
echo "   URL: https://dash.deno.com/projects/spec-beanbot/logs"
echo ""
echo "2. When you click a button in Discord, look for these log entries:"
echo "   - '=== DISCORD WEBHOOK RECEIVED ==='"
echo "   - 'Signature verification result: true/false'"
echo "   - 'Button clicked - Custom ID: ...'"
echo ""
echo "3. If signature verification fails, double-check:"
echo "   - PUBLIC_KEY environment variable in Deno Deploy"
echo "   - Match it exactly with Discord Developer Portal"
echo ""
echo "4. Discord Developer Portal settings:"
echo "   - Application: https://discord.com/developers/applications"
echo "   - General Information > Interactions Endpoint URL"
echo "   - Should be: $WEBHOOK_URL"
echo ""
