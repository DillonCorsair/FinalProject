// Test script to verify Discogs API credentials
import dotenv from 'dotenv';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

dotenv.config();

const discogsToken = process.env.DISCOGS_TOKEN;
const discogsSecret = process.env.DISCOGS_SECRET;

console.log('=== Discogs Credentials Test ===\n');

// Check if credentials are loaded
if (!discogsToken || !discogsSecret) {
  console.error('❌ ERROR: Credentials not found in .env file');
  console.log('DISCOGS_TOKEN:', discogsToken ? 'Found' : 'NOT FOUND');
  console.log('DISCOGS_SECRET:', discogsSecret ? 'Found' : 'NOT FOUND');
  process.exit(1);
}

console.log('✓ Credentials loaded from .env');
console.log('Consumer Key (first 10 chars):', discogsToken.substring(0, 10) + '...');
console.log('Consumer Secret (first 10 chars):', discogsSecret.substring(0, 10) + '...\n');

// Initialize OAuth
const oauth = new OAuth({
  consumer: {
    key: discogsToken,
    secret: discogsSecret
  },
  signature_method: 'HMAC-SHA1',
  hash_function(baseString, key) {
    return crypto.createHmac('sha1', key).update(baseString).digest('base64');
  }
});

// Test URL
const testUrl = 'https://api.discogs.com/database/search?q=daft%20punk&type=release';
console.log('Test URL:', testUrl);
console.log('Method: GET\n');

// Generate OAuth signature
const requestData = {
  url: testUrl,
  method: 'GET'
};

console.log('Generating OAuth signature...');
const authData = oauth.authorize(requestData);
const authHeader = oauth.toHeader(authData);

console.log('\nOAuth Authorization Header:');
console.log(authHeader['Authorization']);
console.log('\nMaking request to Discogs API...\n');

// Make the request
const headers = {
  'User-Agent': 'AlbumPosterDesignHub/1.0 (Test Script)',
  'Accept': 'application/json',
  'Authorization': authHeader['Authorization']
};

fetch(testUrl, { headers })
  .then(async (response) => {
    console.log('Response Status:', response.status, response.statusText);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    
    if (response.ok) {
      console.log('\n✅ SUCCESS! Credentials are working!');
      try {
        const data = JSON.parse(responseText);
        console.log('Results found:', data.results?.length || 0);
        if (data.results && data.results.length > 0) {
          console.log('\nFirst result:');
          console.log('  Title:', data.results[0].title);
          console.log('  Type:', data.results[0].type);
          console.log('  ID:', data.results[0].id);
        }
      } catch (e) {
        console.log('Response (first 200 chars):', responseText.substring(0, 200));
      }
    } else {
      console.log('\n❌ FAILED: Discogs API returned an error');
      console.log('Response body:', responseText);
      
      if (response.status === 401) {
        console.log('\n⚠️  401 Unauthorized - Possible issues:');
        console.log('  1. Consumer Key or Secret is incorrect');
        console.log('  2. Application not activated in Discogs settings');
        console.log('  3. OAuth signature format not accepted by Discogs');
        console.log('  4. Discogs requires full OAuth flow (not application-only)');
      }
    }
  })
  .catch((error) => {
    console.error('\n❌ ERROR making request:', error.message);
  });

