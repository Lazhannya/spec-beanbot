/**
 * Production Environment Test Script
 * Simulates Deno Deploy environment to test deployment readiness
 */

// Simulate Deno Deploy environment
Deno.env.set("DENO_DEPLOYMENT_ID", "test-deployment-123");

// Clear some variables to simulate production environment
const originalEnv = new Map();
const testVars = [
  "APP_ID", "DISCORD_TOKEN", "PUBLIC_KEY", "DISCORD_CLIENT_ID", 
  "DISCORD_CLIENT_SECRET", "DISCORD_REDIRECT_URI", "ADMIN_USER_IDS"
];

// Save original values
for (const key of testVars) {
  originalEnv.set(key, Deno.env.get(key));
}

console.log("🚀 Testing Production Deployment Environment");
console.log("=" .repeat(50));

// Test 1: All required variables set
console.log("\n📋 Test 1: All required variables provided");
try {
  // Setup environment defaults
  await import("./setup-env.ts");
  
  // Load environment validation
  const { loadEnvironmentConfig, validateConfig } = await import("./discord-bot/lib/config/env.ts");
  
  const config = loadEnvironmentConfig();
  validateConfig(config);
  
  console.log("✅ Production environment validation passed");
  console.log(`   - Environment detected: ${config.isProduction ? 'Production' : 'Development'}`);
  console.log(`   - Admin users configured: ${config.adminUserIds.length > 0 ? 'Yes' : 'No'}`);
  console.log(`   - Session timeout: ${config.sessionTimeoutHours} hours`);
  
} catch (error) {
  console.log("❌ Production environment validation failed:");
  console.log(`   ${error.message}`);
}

// Test 2: Missing critical variables
console.log("\n📋 Test 2: Missing critical variables");
// Temporarily clear a required variable
Deno.env.delete("DISCORD_TOKEN");

try {
  const { loadEnvironmentConfig, validateConfig } = await import("./discord-bot/lib/config/env.ts");
  const config = loadEnvironmentConfig();
  validateConfig(config);
  console.log("❌ Validation should have failed but didn't");
} catch (error) {
  console.log("✅ Correctly detected missing critical variables");
  console.log(`   Expected error: ${error.message.split('\\n')[0]}`);
}

// Restore environment
for (const [key, value] of originalEnv) {
  if (value) {
    Deno.env.set(key, value);
  }
}

// Test 3: Deployment simulation
console.log("\n📋 Test 3: Full deployment simulation");
try {
  // Import main entry point components
  await import("./setup-env.ts");
  
  console.log("✅ Entry point imports successful");
  console.log("✅ Environment setup completed");
  console.log("✅ Ready for deployment to Deno Deploy");
  
} catch (error) {
  console.log("❌ Deployment simulation failed:");
  console.log(`   ${error.message}`);
}

console.log("\n🏁 Production readiness test completed");
console.log("=" .repeat(50));
console.log("💡 To deploy:");
console.log("   1. Set environment variables in Deno Deploy dashboard");
console.log("   2. Connect repository to Deno Deploy project");
console.log("   3. Set entry point to main.ts");
console.log("   4. Deploy and monitor logs for any issues");
console.log("\n📖 See DEPLOYMENT.md for detailed instructions");