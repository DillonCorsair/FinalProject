// Step 1: Get the authorization URL
// Run this first, then visit the URL and get the verifier code
import dotenv from 'dotenv';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import fs from 'fs';

dotenv.config();

const discogsToken = process.env.DISCOGS_TOKEN;
const discogsSecret = process.env.DISCOGS_SECRET;

if (!discogsToken || !discogsSecret) {
  console.error('❌ ERROR: DISCOGS_TOKEN and DISCOGS_SECRET must be in your .env file');
  process.exit(1);
}

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

async function getAuthorizationUrl() {
  try {
    console.log('=== Step 1: Get Authorization URL ===\n');
    console.log('Getting request token from Discogs...\n');
    
    const requestTokenUrl = 'https://api.discogs.com/oauth/request_token';
    
    const requestData = {
      url: requestTokenUrl,
      method: 'POST',
      data: {
        oauth_callback: 'oob'
      }
    };
    
    const authData = oauth.authorize(requestData);
    const authHeader = oauth.toHeader(authData);
    
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
      const errorText = await requestTokenResponse.text();
      throw new Error(`Failed to get request token: ${requestTokenResponse.status} - ${errorText}`);
    }
    
    const requestTokenText = await requestTokenResponse.text();
    const requestTokenParams = new URLSearchParams(requestTokenText);
    const oauthToken = requestTokenParams.get('oauth_token');
    const oauthTokenSecret = requestTokenParams.get('oauth_token_secret');
    
    if (!oauthToken || !oauthTokenSecret) {
      throw new Error('Failed to parse request token response');
    }
    
    // Save tokens to a temp file for step 2
    const tempData = {
      oauthToken,
      oauthTokenSecret
    };
    fs.writeFileSync('.discogs-temp.json', JSON.stringify(tempData));
    
    const authorizeUrl = `https://www.discogs.com/oauth/authorize?oauth_token=${oauthToken}`;
    
    console.log('✅ Request token obtained!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Visit this URL in your browser:\n');
    console.log(authorizeUrl);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nAfter authorizing, you will see a verification code.');
    console.log('Copy the code (it will look like: oauth_verifier=XXXXX)');
    console.log('\nThen run: node step2-exchange-for-access-token.js YOUR_VERIFIER_CODE');
    console.log('\n(Replace YOUR_VERIFIER_CODE with the actual code you received)\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

getAuthorizationUrl();

