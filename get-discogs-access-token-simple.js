// Simplified script to complete Discogs OAuth flow
// Run this, then follow the prompts
import dotenv from 'dotenv';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import readline from 'readline';

dotenv.config();

const discogsToken = process.env.DISCOGS_TOKEN;
const discogsSecret = process.env.DISCOGS_SECRET;

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
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
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

async function getAccessToken() {
  try {
    console.log('=== Discogs OAuth Flow - Get Access Token ===\n');
    
    // Step 1: Get request token
    console.log('Step 1: Getting request token...');
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
    
    console.log('✓ Request token obtained\n');
    
    // Step 2: Get user authorization
    const authorizeUrl = `https://www.discogs.com/oauth/authorize?oauth_token=${oauthToken}`;
    console.log('Step 2: Authorize the application');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Please visit this URL in your browser:');
    console.log('\n' + authorizeUrl + '\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nAfter authorizing, you will see a page with a verification code.');
    console.log('The code will be in the URL as "oauth_verifier=XXXXX" or shown on the page.');
    console.log('Copy that code and paste it below.\n');
    
    const verifier = await question('Enter the oauth_verifier code: ');
    
    if (!verifier || verifier.trim() === '') {
      throw new Error('OAuth verifier is required');
    }
    
    // Step 3: Exchange for access token
    console.log('\nStep 3: Exchanging for access token...');
    const accessTokenUrl = 'https://api.discogs.com/oauth/access_token';
    
    const accessTokenData = {
      url: accessTokenUrl,
      method: 'POST',
      data: {
        oauth_verifier: verifier.trim()
      }
    };
    
    const accessTokenAuth = oauth.authorize(accessTokenData, {
      key: oauthToken,
      secret: oauthTokenSecret
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
    
    console.log('\n✅ SUCCESS! Access token obtained!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Add these lines to your .env file:\n');
    console.log('DISCOGS_ACCESS_TOKEN=' + accessToken);
    console.log('DISCOGS_ACCESS_TOKEN_SECRET=' + accessTokenSecret);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nAfter adding these, restart your server with: npm start');
    
    rl.close();
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    rl.close();
    process.exit(1);
  }
}

getAccessToken();

