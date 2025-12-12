# Deployment Guide

## Step 1: Push to GitHub

### 1.1 Initialize Git (if not already done)
```bash
cd "/Users/dilloncorsair/Desktop/Sam Fox/Fall 2025/Web Development/final-website"
git init
```

### 1.2 Create a GitHub Repository
1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "+" icon in the top right → "New repository"
3. Name it (e.g., "album-poster-design-hub")
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### 1.3 Add and Commit Files
```bash
# Add all files (except those in .gitignore)
git add .

# Commit the files
git commit -m "Initial commit: Album Poster Design Hub"

# Add the remote repository (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Note:** Replace `YOUR_USERNAME` with your GitHub username and `REPO_NAME` with your repository name.

---

## Step 2: Deploy to a Live URL

Since this project uses a Node.js/Express server, you need a hosting service that supports Node.js. Here are the best options:

### Option A: Render (Recommended - Free Tier Available)

1. **Sign up at [render.com](https://render.com)** (free account)

2. **Create a New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your repository

3. **Configure the Service:**
   - **Name:** album-poster-design-hub (or your choice)
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or paid if you need more resources)

4. **Set Environment Variables:**
   - Go to "Environment" tab
   - Add these variables (get values from your `apiKey.env` file):
     - `OPENAI_API_KEY` = (your OpenAI API key)
     - `DISCOGS_TOKEN` = (your Discogs token)
     - `DISCOGS_SECRET` = (your Discogs secret)
     - `DISCOGS_ACCESS_TOKEN` = (your Discogs access token)
     - `DISCOGS_ACCESS_TOKEN_SECRET` = (your Discogs access token secret)
     - `PORT` = 3000 (or leave blank, Render will set it)

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Your site will be live at: `https://your-app-name.onrender.com`

---

### Option B: Railway (Alternative - Free Trial)

1. **Sign up at [railway.app](https://railway.app)** (free trial available)

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure:**
   - Railway auto-detects Node.js
   - Add environment variables (same as Render above)
   - Deploy automatically

4. **Get Your URL:**
   - Railway provides a URL like: `https://your-app-name.up.railway.app`

---

### Option C: Vercel (For Frontend + Serverless Functions)

**Note:** Vercel is better for static sites. You'd need to refactor your Express server into serverless functions.

---

## Step 3: Update Your Code for Production

### 3.1 Update API Base URL Function

Make sure `getApiBaseUrl()` in `script.js` works in production:

```javascript
function getApiBaseUrl() {
    // In production, use the deployed URL
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return window.location.origin; // Use the current domain
    }
    // For local development
    return 'http://localhost:3000';
}
```

### 3.2 Test Your Deployment

1. Visit your live URL
2. Test creating a poster
3. Check browser console for any errors
4. Verify API calls are working

---

## Important Notes:

1. **Environment Variables:** Never commit `apiKey.env` or `.env` files to GitHub. They're already in `.gitignore`.

2. **CORS:** Your server should handle CORS properly. Make sure your `server.js` allows requests from your frontend domain.

3. **Free Tier Limitations:**
   - Render free tier: Services spin down after 15 minutes of inactivity
   - Railway free trial: Limited hours per month
   - Consider upgrading if you need 24/7 uptime

4. **Custom Domain (Optional):**
   - Both Render and Railway allow custom domains
   - You can point your own domain to your deployed app

---

## Troubleshooting:

- **Build fails:** Check that all dependencies are in `package.json`
- **API errors:** Verify environment variables are set correctly
- **CORS errors:** Ensure your server allows requests from your frontend URL
- **Port issues:** Use `process.env.PORT` in your server (already done)

