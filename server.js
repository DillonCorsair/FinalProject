// Simple Express server for OpenAI API proxy
// Run with: npm start
// Requires: npm install express dotenv

import express from 'express';
import { generateWithReasoning } from './openai-service.js';
import dotenv from 'dotenv';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('.')); // Serve static files

// Initialize OAuth 1.0a for Discogs API
// Discogs requires the full OAuth flow - you need access tokens (not just consumer key/secret)
function createDiscogsOAuth() {
  const discogsToken = process.env.DISCOGS_TOKEN; // Consumer Key
  const discogsSecret = process.env.DISCOGS_SECRET; // Consumer Secret
  const accessToken = process.env.DISCOGS_ACCESS_TOKEN; // Access Token (from OAuth flow)
  const accessTokenSecret = process.env.DISCOGS_ACCESS_TOKEN_SECRET; // Access Token Secret
  
  // Debug logging
  console.log('OAuth Config Check:');
  console.log('  DISCOGS_TOKEN:', discogsToken ? '✓ Set' : '✗ Missing');
  console.log('  DISCOGS_SECRET:', discogsSecret ? '✓ Set' : '✗ Missing');
  console.log('  DISCOGS_ACCESS_TOKEN:', accessToken ? '✓ Set' : '✗ Missing');
  console.log('  DISCOGS_ACCESS_TOKEN_SECRET:', accessTokenSecret ? '✓ Set' : '✗ Missing');
  
  if (!discogsToken || !discogsSecret) {
    return null;
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
  
  // Return both OAuth instance and tokens
  return {
    oauth,
    accessToken: accessToken || '',
    accessTokenSecret: accessTokenSecret || ''
  };
}

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  next();
});

// Image proxy endpoint to handle CORS for external images
app.get('/api/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    const decodedUrl = decodeURIComponent(url);
    console.log('Proxying image:', decodedUrl);
    
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AlbumPosterDesignHub/1.0)',
        'Accept': 'image/*'
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Failed to fetch image',
        message: `HTTP ${response.status}`
      });
    }
    
    // Get the content type from the response
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Content-Type', contentType);
    res.header('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    
    // Stream the image data
    const imageBuffer = await response.arrayBuffer();
    res.send(Buffer.from(imageBuffer));
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to proxy image',
      message: error.message 
    });
  }
});

// OpenAI API proxy endpoint (kept for potential future use)
app.post('/api/generate', async (req, res) => {
  try {
    const { input, reasoning, text } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }

    const result = await generateWithReasoning(
      input,
      reasoning?.effort || "low",
      text?.verbosity || "low"
    );

    res.json(result);
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate text',
      message: error.message 
    });
  }
});

// Discogs API proxy endpoint (to handle CORS)
app.get('/api/discogs/search', async (req, res) => {
  try {
    const { q, type, format } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    // Discogs requires a proper User-Agent with contact info
    const userAgent = 'AlbumPosterDesignHub/1.0 (https://github.com/yourusername)';
    
    // Build search URL
    const searchUrl = `https://api.discogs.com/database/search?q=${encodeURIComponent(q)}${type ? '&type=' + type : ''}${format ? '&format=' + format : ''}`;
    
    console.log('Fetching from Discogs:', searchUrl);
    
    // Prepare headers
    const headers = {
      'User-Agent': userAgent,
      'Accept': 'application/json'
    };
    
    // Add OAuth 1.0a authentication if credentials are provided
    const oauthConfig = createDiscogsOAuth();
    if (oauthConfig) {
      const { oauth, accessToken, accessTokenSecret } = oauthConfig;
      
      // Sign the request using OAuth 1.0a with access tokens
      const requestData = {
        url: searchUrl,
        method: 'GET'
      };
      
      // Use access tokens if available, otherwise try empty (won't work but shows the issue)
      const tokenData = accessToken && accessTokenSecret 
        ? { key: accessToken, secret: accessTokenSecret }
        : { key: '', secret: '' };
      
      const authHeader = oauth.toHeader(oauth.authorize(requestData, tokenData));
      headers['Authorization'] = authHeader['Authorization'];
      
      if (accessToken && accessTokenSecret) {
        console.log('Discogs OAuth authentication applied (with access tokens)');
      } else {
        console.warn('Discogs OAuth applied but access tokens missing - API will return 401');
        console.warn('Run: node get-discogs-access-token.js to get access tokens');
      }
    } else {
      console.warn('Discogs authentication not configured - API may return 401 errors');
      console.warn('Add DISCOGS_TOKEN (Consumer Key) and DISCOGS_SECRET (Consumer Secret) to your .env file');
      console.warn('Get credentials at: https://www.discogs.com/settings/developers');
    }
    
    let response;
    try {
      response = await fetch(searchUrl, {
        headers: headers,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
    } catch (fetchError) {
      console.error('Network error fetching from Discogs:', fetchError);
      if (fetchError.name === 'AbortError') {
        return res.status(500).json({ 
          error: 'Discogs API timeout',
          message: 'The request to Discogs took too long. Please try again.'
        });
      }
      return res.status(500).json({ 
        error: 'Network error',
        message: fetchError.message || 'Failed to connect to Discogs API'
      });
    }

    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = `HTTP ${response.status}`;
      }
      
      console.error('Discogs API error:', response.status);
      console.error('Discogs API error response:', errorText);
      console.error('Request URL:', searchUrl);
      console.error('Headers sent:', JSON.stringify(headers, null, 2));
      
      // Provide more helpful error messages
      let errorMessage = errorText;
      if (response.status === 401) {
        errorMessage = 'Discogs API authentication failed. Please check your DISCOGS_ACCESS_TOKEN and DISCOGS_ACCESS_TOKEN_SECRET in your .env file.';
      } else if (response.status === 429) {
        errorMessage = 'Discogs API rate limit exceeded. Please wait a moment and try again.';
      } else if (response.status >= 500) {
        errorMessage = `Discogs API returned ${response.status}: ${errorText || 'Server error'}`;
      }
      
      // Pass through the actual status code from Discogs
      const statusCode = response.status >= 500 ? 500 : response.status;
      
      return res.status(statusCode).json({ 
        error: 'Discogs API error',
        message: errorMessage,
        discogsStatus: response.status,
        details: errorText
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Discogs API Error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Unknown error';
    if (error.message.includes('fetch')) {
      errorMessage = 'Failed to connect to Discogs API. Please check your internet connection.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Discogs API request timed out. Please try again.';
    }
    
    // If it's a network error or other issue, return 500
    res.status(500).json({ 
      error: 'Failed to search Discogs',
      message: errorMessage,
      errorName: error.name,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Discogs API proxy endpoint for release details
app.get('/api/discogs/release/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Release ID is required' });
    }

    // Discogs requires a proper User-Agent with contact info
    const userAgent = 'AlbumPosterDesignHub/1.0 (https://github.com/yourusername)';
    
    const releaseUrl = `https://api.discogs.com/releases/${id}`;
    
    console.log('Fetching release from Discogs:', releaseUrl);
    
    // Prepare headers
    const headers = {
      'User-Agent': userAgent,
      'Accept': 'application/json'
    };
    
    // Add OAuth 1.0a authentication if credentials are provided
    const oauthConfig = createDiscogsOAuth();
    if (oauthConfig) {
      const { oauth, accessToken, accessTokenSecret } = oauthConfig;
      
      // Sign the request using OAuth 1.0a with access tokens
      const requestData = {
        url: releaseUrl,
        method: 'GET'
      };
      
      // Use access tokens if available
      const tokenData = accessToken && accessTokenSecret 
        ? { key: accessToken, secret: accessTokenSecret }
        : { key: '', secret: '' };
      
      const authHeader = oauth.toHeader(oauth.authorize(requestData, tokenData));
      headers['Authorization'] = authHeader['Authorization'];
      
      if (accessToken && accessTokenSecret) {
        console.log('Discogs OAuth authentication applied (with access tokens)');
      } else {
        console.warn('Discogs OAuth applied but access tokens missing - API will return 401');
      }
    } else {
      console.warn('Discogs authentication not configured - API may return 401 errors');
      console.warn('Add DISCOGS_TOKEN (Consumer Key) and DISCOGS_SECRET (Consumer Secret) to your .env file');
    }
    
    const response = await fetch(releaseUrl, {
      headers: headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discogs API error:', response.status, errorText);
      
      // Pass through the actual status code from Discogs
      const statusCode = response.status >= 500 ? 500 : response.status;
      
      return res.status(statusCode).json({ 
        error: 'Discogs API error',
        message: errorText || `HTTP ${response.status}`,
        discogsStatus: response.status
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Discogs API Error:', error);
    
    // If it's a network error or other issue, return 500
    res.status(500).json({ 
      error: 'Failed to fetch release from Discogs',
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Make sure OPENAI_API_KEY is set in your .env file');
  console.log('For Discogs API: Add DISCOGS_TOKEN and DISCOGS_SECRET to your .env file');
  console.log('Get credentials at: https://www.discogs.com/settings/developers');
});

