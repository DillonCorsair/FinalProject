// Step 2: Exchange the verifier for access token
// Usage: node step2-exchange-for-access-token.js YOUR_VERIFIER_CODE
import dotenv from 'dotenv';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import fs from 'fs';

dotenv.config();

const verifier = process.argv[2];

if (!verifier) {
  console.error('❌ ERROR: Please provide the oauth_verifier code');
  console.error('Usage: node step2-exchange-for-access-token.js YOUR_VERIFIER_CODE');
  process.exit(1);
}

// Load temp data from step 1
let tempData;
try {
  const tempFile = fs.readFileSync('.discogs-temp.json', 'utf8');
  tempData = JSON.parse(tempFile);
} catch (error) {
  console.error('❌ ERROR: Could not find .discogs-temp.json');
  console.error('Please run step1-get-authorization-url.js first');
  process.exit(1);
}

const discogsToken = process.env.DISCOGS_TOKEN;
const discogsSecret = process.env.DISCOGS_SECRET;

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

async function exchangeForAccessToken() {
  try {
    console.log('=== Step 2: Exchange Verifier for Access Token ===\n');
    console.log('Exchanging verifier code for access token...\n');
    
    const accessTokenUrl = 'https://api.discogs.com/oauth/access_token';
    
    const accessTokenData = {
      url: accessTokenUrl,
      method: 'POST',
      data: {
        oauth_verifier: verifier.trim()
      }
    };
    
    const accessTokenAuth = oauth.authorize(accessTokenData, {
      key: tempData.oauthToken,
      secret: tempData.oauthTokenSecret
    });
    
    const accessTokenHeader = oauth.toHeader(accessTokenAuth);
    
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
    
    // Clean up temp file
    fs.unlinkSync('.discogs-temp.json');
    
    console.log('✅ SUCCESS! Access token obtained!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Add these lines to your .env file:\n');
    console.log('DISCOGS_ACCESS_TOKEN=' + accessToken);
    console.log('DISCOGS_ACCESS_TOKEN_SECRET=' + accessTokenSecret);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nAfter adding these, restart your server with: npm start');
    console.log('Then your Discogs API calls should work! 🎉\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

exchangeForAccessToken();

