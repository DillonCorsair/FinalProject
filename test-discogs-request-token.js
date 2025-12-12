// Test script to get a request token from Discogs (verifies credentials)
import dotenv from 'dotenv';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

dotenv.config();

const discogsToken = process.env.DISCOGS_TOKEN;
const discogsSecret = process.env.DISCOGS_SECRET;

console.log('=== Testing Discogs Request Token (Verifies Credentials) ===\n');

if (!discogsToken || !discogsSecret) {
  console.error('❌ ERROR: Credentials not found in .env file');
  process.exit(1);
}

console.log('✓ Credentials loaded');
console.log('Consumer Key (first 10 chars):', discogsToken.substring(0, 10) + '...\n');

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

// Request token URL (from Discogs OAuth flow)
const requestTokenUrl = 'https://api.discogs.com/oauth/request_token';
console.log('Request Token URL:', requestTokenUrl);
console.log('Method: POST\n');

// Generate OAuth signature for request token
const requestData = {
  url: requestTokenUrl,
  method: 'POST'
};

console.log('Generating OAuth signature for request token...');
const authData = oauth.authorize(requestData);
const authHeader = oauth.toHeader(authData);

console.log('\nOAuth Authorization Header:');
console.log(authHeader['Authorization']);
console.log('\nMaking request to get request token...\n');

// Make the request
const headers = {
  'User-Agent': 'AlbumPosterDesignHub/1.0 (Test Script)',
  'Authorization': authHeader['Authorization']
};

fetch(requestTokenUrl, { 
  method: 'POST',
  headers 
})
  .then(async (response) => {
    console.log('Response Status:', response.status, response.statusText);
    
    const responseText = await response.text();
    
    if (response.ok) {
      console.log('\n✅ SUCCESS! Credentials are VALID!');
      console.log('Request Token Response:', responseText);
      console.log('\nThis means your Consumer Key and Secret are correct.');
      console.log('The issue is likely that Discogs requires the full OAuth flow');
      console.log('(request token → authorize → access token) for API access.');
    } else {
      console.log('\n❌ FAILED: Could not get request token');
      console.log('Response body:', responseText);
      
      if (response.status === 401) {
        console.log('\n⚠️  401 Unauthorized - This likely means:');
        console.log('  - Consumer Key or Secret is INCORRECT');
        console.log('  - OR the application is not properly set up in Discogs');
        console.log('\nPlease verify:');
        console.log('  1. Go to https://www.discogs.com/settings/developers');
        console.log('  2. Check that your Consumer Key matches:', discogsToken);
        console.log('  3. Check that your Consumer Secret is correct');
        console.log('  4. Make sure the application is active/enabled');
      }
    }
  })
  .catch((error) => {
    console.error('\n❌ ERROR making request:', error.message);
  });

