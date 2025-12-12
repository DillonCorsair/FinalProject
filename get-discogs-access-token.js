// Script to complete Discogs OAuth flow and get an access token
// This only needs to be run ONCE to get your access token
import dotenv from 'dotenv';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import readline from 'readline';

dotenv.config();

const discogsToken = process.env.DISCOGS_TOKEN;
const discogsSecret = process.env.DISCOGS_SECRET;

console.log('=== Discogs OAuth Flow - Get Access Token ===\n');
console.log('This script will help you complete the OAuth flow to get an access token.');
console.log('You only need to run this ONCE. The access token will be saved to your .env file.\n');

if (!discogsToken || !discogsSecret) {
  console.error('❌ ERROR: DISCOGS_TOKEN and DISCOGS_SECRET must be in your .env file');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

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

async function getAccessToken() {
  try {
    // Step 1: Get request token
    console.log('Step 1: Getting request token...');
    console.log('According to Discogs docs: POST to https://api.discogs.com/oauth/request_token');
    const requestTokenUrl = 'https://api.discogs.com/oauth/request_token';
    
    // For request token, we may need to include oauth_callback
    // Discogs allows 'oob' (out-of-band) for desktop/non-web apps
    const requestData = {
      url: requestTokenUrl,
      method: 'POST',
      data: {
        oauth_callback: 'oob' // 'oob' = out-of-band (manual verifier entry)
      }
    };
    
    const authData = oauth.authorize(requestData);
    const authHeader = oauth.toHeader(authData);
    
    // Request body should include oauth_callback
    const requestTokenBody = new URLSearchParams({
      oauth_callback: 'oob'
    });
    
    const requestTokenResponse = await fetch(requestTokenUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'AlbumPosterDesignHub/1.0',
        'Authorization': authHeader['Authorization'],
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: requestTokenBody.toString()
    });
    
    if (!requestTokenResponse.ok) {
      throw new Error(`Failed to get request token: ${requestTokenResponse.status}`);
    }
    
    const requestTokenText = await requestTokenResponse.text();
    const requestTokenParams = new URLSearchParams(requestTokenText);
    const oauthToken = requestTokenParams.get('oauth_token');
    const oauthTokenSecret = requestTokenParams.get('oauth_token_secret');
    
    if (!oauthToken || !oauthTokenSecret) {
      throw new Error('Failed to parse request token response');
    }
    
    console.log('✓ Request token obtained\n');
    
    // Step 2: Get user authorization
    const authorizeUrl = `https://www.discogs.com/oauth/authorize?oauth_token=${oauthToken}`;
    console.log('Step 2: Authorize the application');
    console.log('\nPlease visit this URL in your browser:');
    console.log(authorizeUrl);
    console.log('\nAfter authorizing, you will be redirected to a page.');
    console.log('Copy the "oauth_verifier" value from the URL or the page.\n');
    
    const verifier = await question('Enter the oauth_verifier: ');
    
    if (!verifier || verifier.trim() === '') {
      throw new Error('OAuth verifier is required');
    }
    
    // Step 3: Exchange for access token
    console.log('\nStep 3: Exchanging for access token...');
    const accessTokenUrl = 'https://api.discogs.com/oauth/access_token';
    
    // In OAuth 1.0a, oauth_verifier should be included in the signature
    // The oauth-1.0a library handles this when we pass it as a data parameter
    const accessTokenData = {
      url: accessTokenUrl,
      method: 'POST',
      data: {
        oauth_verifier: verifier.trim()
      }
    };
    
    // Authorize with the request token and verifier
    const accessTokenAuth = oauth.authorize(accessTokenData, {
      key: oauthToken,
      secret: oauthTokenSecret
    });
    
    const accessTokenHeader = oauth.toHeader(accessTokenAuth);
    
    // Send verifier in request body (standard OAuth 1.0a)
    const accessTokenBody = new URLSearchParams({
      oauth_verifier: verifier.trim()
    });
    
    const accessTokenResponse = await fetch(accessTokenUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'AlbumPosterDesignHub/1.0',
        'Authorization': accessTokenHeader['Authorization'],
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: accessTokenBody.toString()
    });
    
    if (!accessTokenResponse.ok) {
      const errorText = await accessTokenResponse.text();
      throw new Error(`Failed to get access token: ${accessTokenResponse.status} - ${errorText}`);
    }
    
    const accessTokenText = await accessTokenResponse.text();
    const accessTokenParamsParsed = new URLSearchParams(accessTokenText);
    const accessToken = accessTokenParamsParsed.get('oauth_token');
    const accessTokenSecret = accessTokenParamsParsed.get('oauth_token_secret');
    
    if (!accessToken || !accessTokenSecret) {
      throw new Error('Failed to parse access token response');
    }
    
    console.log('✓ Access token obtained!\n');
    console.log('Access Token:', accessToken);
    console.log('Access Token Secret:', accessTokenSecret);
    console.log('\n✅ SUCCESS! Add these to your .env file:');
    console.log('DISCOGS_ACCESS_TOKEN=' + accessToken);
    console.log('DISCOGS_ACCESS_TOKEN_SECRET=' + accessTokenSecret);
    console.log('\nThen update server.js to use these tokens for API requests.');
    
    rl.close();
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    rl.close();
    process.exit(1);
  }
}

getAccessToken();

