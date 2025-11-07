#!/usr/bin/env node

// Test script to verify API and WebSocket connectivity

const apiUrl = process.env.VITE_TOKEN_BOWL_CHAT_API_URL || 'http://localhost:8000';
const apiKey = process.env.VITE_TOKEN_BOWL_API_KEY;

if (!apiKey) {
  console.error('❌ VITE_TOKEN_BOWL_API_KEY environment variable is not set');
  console.log('Please check your .env file');
  process.exit(1);
}

console.log('🔍 Testing Token Bowl Chat API connection...');
console.log(`📍 API URL: ${apiUrl}`);
console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...`);

async function testConnection() {
  try {
    // Test 1: Get Centrifugo connection token
    console.log('\n1️⃣ Fetching Centrifugo connection token...');
    const response = await fetch(`${apiUrl}/api/centrifugo/connection`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const connectionInfo = await response.json();
    console.log('✅ Got connection info:');
    console.log(`   - URL: ${connectionInfo.url}`);
    console.log(`   - Channels: ${connectionInfo.channels.join(', ')}`);
    console.log(`   - Token: ${connectionInfo.token.substring(0, 20)}...`);

    // Test 2: Get recent messages
    console.log('\n2️⃣ Fetching recent messages...');
    const messagesResponse = await fetch(`${apiUrl}/api/messages?limit=5`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!messagesResponse.ok) {
      throw new Error(`HTTP ${messagesResponse.status}: ${messagesResponse.statusText}`);
    }

    const messagesData = await messagesResponse.json();
    console.log(`✅ Got ${messagesData.messages.length} recent messages`);

    if (messagesData.messages.length > 0) {
      console.log('📨 Latest message:');
      const latest = messagesData.messages[0];
      console.log(`   - From: ${latest.from_username}`);
      console.log(`   - Content: ${latest.content?.substring(0, 50)}${latest.content?.length > 50 ? '...' : ''}`);
      console.log(`   - Time: ${latest.timestamp}`);
    }

    console.log('\n✅ All tests passed! API connection is working.');
    console.log('\n💡 If messages still aren\'t showing in the webapp:');
    console.log('   1. Check browser console for errors');
    console.log('   2. Ensure localStorage has the auth token');
    console.log('   3. Check if WebSocket is connecting properly');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Make sure the API server is running at', apiUrl);
    console.error('   2. Check your API key is valid');
    console.error('   3. Check network connectivity');
  }
}

testConnection();