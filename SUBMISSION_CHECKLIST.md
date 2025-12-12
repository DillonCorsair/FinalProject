# Submission Checklist - Album Poster Design Hub

## ✅ Pre-Submission Verification

### 1. Code Review
- [ ] All files are saved and up to date
- [ ] No console errors in browser
- [ ] All features work locally (test thoroughly)
- [ ] No hardcoded localhost URLs (except in getApiBaseUrl for development)

### 2. Security Check
- [ ] `apiKey.env` is in `.gitignore` ✓ (already done)
- [ ] `.env` is in `.gitignore` ✓ (already done)
- [ ] No API keys hardcoded in any files
- [ ] All sensitive data uses environment variables

### 3. File Structure
- [ ] All HTML files present (index.html, gallery.html)
- [ ] All CSS files present (styles.css, gallery.css)
- [ ] All JS files present (script.js, gallery.js, server.js)
- [ ] package.json is up to date with all dependencies
- [ ] .gitignore is properly configured

### 4. Dependencies
- [ ] All npm packages are listed in package.json
- [ ] node_modules is in .gitignore (should not be committed)

---

## 📝 Step-by-Step Submission Process

### STEP 1: Final Local Testing

```bash
# Make sure everything works locally first
cd "/Users/dilloncorsair/Desktop/Sam Fox/Fall 2025/Web Development/final-website"

# Test the server starts
npm start
# (In another terminal, test the website at http://localhost:3000)
```

**Test Checklist:**
- [ ] Website loads at http://localhost:3000
- [ ] Can create a poster
- [ ] Can save a poster to gallery
- [ ] Can edit a poster from gallery
- [ ] Can export a poster
- [ ] All customize options work
- [ ] Responsive design works (portrait/landscape)
- [ ] No console errors

---

### STEP 2: Prepare for Git

```bash
# Check what files will be committed (should NOT include node_modules, .env, apiKey.env)
git status
```

**Verify these files are NOT tracked:**
- [ ] node_modules/ (should be ignored)
- [ ] .env (should be ignored)
- [ ] apiKey.env (should be ignored)
- [ ] .DS_Store (should be ignored)

**Verify these files ARE tracked:**
- [ ] index.html
- [ ] gallery.html
- [ ] styles.css
- [ ] gallery.css
- [ ] script.js
- [ ] gallery.js
- [ ] server.js
- [ ] package.json
- [ ] package-lock.json
- [ ] .gitignore
- [ ] README.md

---

### STEP 3: Initialize Git Repository

```bash
# Navigate to project directory
cd "/Users/dilloncorsair/Desktop/Sam Fox/Fall 2025/Web Development/final-website"

# Initialize git (if not already done)
git init

# Check status
git status
```

---

### STEP 4: Create Initial Commit

```bash
# Add all files (respecting .gitignore)
git add .

# Verify what's being added (should NOT see node_modules, .env, apiKey.env)
git status

# Create initial commit
git commit -m "Initial commit: Album Poster Design Hub - Complete project with gallery, poster creation, and export features"
```

---

### STEP 5: Create GitHub Repository

1. **Go to GitHub:**
   - Visit [github.com](https://github.com) and sign in
   - Click the **"+"** icon in top right corner
   - Select **"New repository"**

2. **Repository Settings:**
   - **Repository name:** `album-poster-design-hub` (or your preferred name)
   - **Description:** "Create custom music album posters with color palettes, lyrics, and typography"
   - **Visibility:** Choose Public or Private
   - **⚠️ IMPORTANT:** DO NOT check:
     - ❌ Add a README file
     - ❌ Add .gitignore
     - ❌ Choose a license
   - (We already have these files)

3. **Click "Create repository"**

4. **Copy the repository URL** (you'll see it on the next page)
   - It will look like: `https://github.com/YOUR_USERNAME/album-poster-design-hub.git`

---

### STEP 6: Connect Local Repository to GitHub

```bash
# Add the remote repository (replace with YOUR actual URL)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Verify the remote was added
git remote -v

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**If you get authentication errors:**
- You may need to use a Personal Access Token instead of password
- Or use SSH: `git@github.com:YOUR_USERNAME/REPO_NAME.git`

---

### STEP 7: Verify GitHub Upload

1. **Refresh your GitHub repository page**
2. **Verify all files are present:**
   - [ ] index.html
   - [ ] gallery.html
   - [ ] styles.css
   - [ ] gallery.css
   - [ ] script.js
   - [ ] gallery.js
   - [ ] server.js
   - [ ] package.json
   - [ ] .gitignore
   - [ ] README.md

3. **Verify sensitive files are NOT present:**
   - [ ] node_modules/ (should NOT be visible)
   - [ ] .env (should NOT be visible)
   - [ ] apiKey.env (should NOT be visible)

---

### STEP 8: Deploy to Render.com

1. **Sign up/Login:**
   - Go to [render.com](https://render.com)
   - Sign up or log in (free account works)

2. **Create New Web Service:**
   - Click **"New +"** button
   - Select **"Web Service"**
   - Click **"Connect account"** next to GitHub
   - Authorize Render to access your GitHub
   - Select your repository: `album-poster-design-hub`

3. **Configure Service:**
   - **Name:** `album-poster-design-hub` (or your choice)
   - **Region:** Choose closest to you
   - **Branch:** `main`
   - **Root Directory:** (leave blank)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free` (or upgrade if needed)

4. **Add Environment Variables:**
   Click on **"Environment"** tab and add these (get values from your `apiKey.env` file):
   
   ```
   OPENAI_API_KEY = (your OpenAI API key)
   DISCOGS_TOKEN = (your Discogs consumer key)
   DISCOGS_SECRET = (your Discogs consumer secret)
   DISCOGS_ACCESS_TOKEN = (your Discogs access token)
   DISCOGS_ACCESS_TOKEN_SECRET = (your Discogs access token secret)
   PORT = 3000
   ```
   
   **How to add:**
   - Click "Add Environment Variable"
   - Enter key name (e.g., `OPENAI_API_KEY`)
   - Enter value (paste from your apiKey.env)
   - Click "Save Changes"
   - Repeat for each variable

5. **Deploy:**
   - Scroll down and click **"Create Web Service"**
   - Wait for build to complete (5-10 minutes)
   - Watch the logs for any errors

6. **Get Your Live URL:**
   - Once deployed, you'll see: `https://your-app-name.onrender.com`
   - Copy this URL

---

### STEP 9: Verify Deployment

1. **Visit your live URL:**
   - Open `https://your-app-name.onrender.com` in a browser

2. **Test Everything:**
   - [ ] Website loads
   - [ ] Can enter album/artist name
   - [ ] Can upload/enter image URL
   - [ ] CREATE button works
   - [ ] Poster preview displays
   - [ ] Can customize poster
   - [ ] Can save poster
   - [ ] Can view gallery
   - [ ] Can edit poster from gallery
   - [ ] Can export poster
   - [ ] Check browser console for errors (F12)

3. **If something doesn't work:**
   - Check Render logs (click on your service → "Logs" tab)
   - Verify all environment variables are set correctly
   - Check browser console for errors

---

### STEP 10: Update README.md (Optional but Recommended)

Add deployment information to README.md:

```markdown
## Live Demo
🌐 [View Live Site](https://your-app-name.onrender.com)

## Local Development
1. Clone the repository
2. Run `npm install`
3. Create `apiKey.env` file with your API keys
4. Run `npm start`
5. Visit http://localhost:3000
```

---

## 🔍 Common Issues & Solutions

### Issue: "Cannot find module" error
**Solution:** Make sure all dependencies are in `package.json` and run `npm install` locally first

### Issue: CORS errors in production
**Solution:** Verify `getApiBaseUrl()` returns empty string in production (it should use relative URLs)

### Issue: Environment variables not working
**Solution:** 
- Double-check variable names match exactly (case-sensitive)
- Verify values are correct (no extra spaces)
- Restart the service after adding variables

### Issue: Build fails on Render
**Solution:**
- Check Render logs for specific error
- Verify `package.json` has correct "start" script
- Ensure Node.js version is compatible (Render uses latest LTS)

### Issue: Service spins down (free tier)
**Solution:** 
- Free tier services sleep after 15 min inactivity
- First request after sleep takes ~30 seconds to wake up
- Consider upgrading to paid plan for 24/7 uptime

---

## 📋 Final Verification Checklist

Before submitting, verify:

- [ ] Code is pushed to GitHub
- [ ] All files are in GitHub (except ignored files)
- [ ] Site is deployed and live
- [ ] Live site works (test all features)
- [ ] No console errors on live site
- [ ] Environment variables are set in hosting service
- [ ] README.md is updated (optional)
- [ ] You have the live URL to share

---

## 🎉 You're Done!

Your project is now:
- ✅ On GitHub (version controlled)
- ✅ Live on the internet (deployed)
- ✅ Ready to share!

**Share your project:**
- GitHub URL: `https://github.com/YOUR_USERNAME/album-poster-design-hub`
- Live URL: `https://your-app-name.onrender.com`

