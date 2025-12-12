# Step-by-Step Submission Guide

Follow these steps **in order** to ensure nothing breaks.

---

## 🔍 PRE-FLIGHT CHECK (Do This First!)

### 1. Test Everything Locally

```bash
cd "/Users/dilloncorsair/Desktop/Sam Fox/Fall 2025/Web Development/final-website"
npm start
```

**Open http://localhost:3000 and test:**
- [ ] Website loads
- [ ] Enter album name and artist
- [ ] Upload/enter image URL
- [ ] Click CREATE button
- [ ] Poster preview appears
- [ ] Try all customize options (size, layout, colors, font, scale, text)
- [ ] Save a poster
- [ ] Go to gallery (click GALLERY in nav)
- [ ] View saved poster
- [ ] Edit a poster
- [ ] Export a poster
- [ ] Check browser console (F12) - no errors
- [ ] Test responsive design (resize browser, test portrait mode)

**If anything doesn't work, fix it BEFORE proceeding!**

---

## 📦 STEP 1: Prepare Files for Git

### 1.1 Verify .gitignore is Correct

Your `.gitignore` should contain:
```
node_modules/
.env
apiKey.env
.DS_Store
*.log
```

✅ **Already done!**

### 1.2 Check What Will Be Committed

```bash
cd "/Users/dilloncorsair/Desktop/Sam Fox/Fall 2025/Web Development/final-website"
git init
git add .
git status
```

**Verify:**
- ✅ You see: index.html, gallery.html, styles.css, gallery.css, script.js, gallery.js, server.js, package.json, etc.
- ❌ You do NOT see: node_modules/, .env, apiKey.env

**If you see sensitive files, STOP and fix .gitignore!**

---

## 📝 STEP 2: Create Initial Commit

```bash
# Make sure you're in the project directory
cd "/Users/dilloncorsair/Desktop/Sam Fox/Fall 2025/Web Development/final-website"

# Create initial commit
git add .
git commit -m "Initial commit: Album Poster Design Hub - Complete project with gallery, poster creation, and export features"
```

**Verify commit was created:**
```bash
git log
```
You should see your commit.

---

## 🐙 STEP 3: Create GitHub Repository

### 3.1 Go to GitHub
1. Open [github.com](https://github.com) in your browser
2. Sign in (or create account if needed)

### 3.2 Create New Repository
1. Click the **"+"** icon in top right
2. Click **"New repository"**

### 3.3 Repository Settings
- **Repository name:** `album-poster-design-hub` (or your choice)
- **Description:** "Create custom music album posters with color palettes, lyrics, and typography"
- **Visibility:** 
  - Choose **Public** (if you want to share)
  - Choose **Private** (if you want it private)
- **⚠️ CRITICAL - DO NOT CHECK:**
  - ❌ Add a README file
  - ❌ Add .gitignore  
  - ❌ Choose a license
  *(We already have these files)*

4. Click **"Create repository"**

### 3.4 Copy Repository URL
After creating, GitHub will show you a page with setup instructions.
**Copy the HTTPS URL** - it looks like:
```
https://github.com/YOUR_USERNAME/album-poster-design-hub.git
```

---

## 🔗 STEP 4: Connect Local Repository to GitHub

```bash
# Make sure you're in the project directory
cd "/Users/dilloncorsair/Desktop/Sam Fox/Fall 2025/Web Development/final-website"

# Add the remote (REPLACE with YOUR actual URL from step 3.4)
git remote add origin https://github.com/YOUR_USERNAME/album-poster-design-hub.git

# Verify remote was added
git remote -v
# Should show your repository URL

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**If you get authentication errors:**
- You may need to use a **Personal Access Token** instead of password
- Or use SSH: `git@github.com:YOUR_USERNAME/album-poster-design-hub.git`

**After successful push, you should see:**
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
Writing objects: 100% (X/X), done.
To https://github.com/YOUR_USERNAME/album-poster-design-hub.git
 * [new branch]      main -> main
```

---

## ✅ STEP 5: Verify GitHub Upload

1. **Refresh your GitHub repository page** in browser
2. **Check that all files are present:**
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

3. **Verify sensitive files are NOT present:**
   - [ ] node_modules/ (should NOT be visible)
   - [ ] .env (should NOT be visible)
   - [ ] apiKey.env (should NOT be visible)

**If sensitive files are visible, STOP and fix immediately!**

---

## 🚀 STEP 6: Deploy to Render.com

### 6.1 Sign Up/Login
1. Go to [render.com](https://render.com)
2. Click **"Get Started for Free"** or **"Sign In"**
3. Sign up with GitHub (recommended) or email

### 6.2 Create New Web Service
1. Click **"New +"** button (top right)
2. Click **"Web Service"**
3. Click **"Connect account"** next to GitHub
4. Authorize Render to access your GitHub
5. Select your repository: `album-poster-design-hub`

### 6.3 Configure Service

Fill in these fields:

- **Name:** `album-poster-design-hub` (or your choice)
- **Region:** Choose closest to you (e.g., "Oregon (US West)")
- **Branch:** `main`
- **Root Directory:** *(leave blank)*
- **Environment:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Plan:** `Free` (or upgrade if needed)

### 6.4 Add Environment Variables

**This is CRITICAL - your app won't work without these!**

1. Scroll down to **"Environment Variables"** section
2. Click **"Add Environment Variable"** for each:

   **Variable 1:**
   - Key: `OPENAI_API_KEY`
   - Value: *(paste from your apiKey.env file)*
   - Click "Save Changes"

   **Variable 2:**
   - Key: `DISCOGS_TOKEN`
   - Value: *(paste from your apiKey.env file)*
   - Click "Save Changes"

   **Variable 3:**
   - Key: `DISCOGS_SECRET`
   - Value: *(paste from your apiKey.env file)*
   - Click "Save Changes"

   **Variable 4:**
   - Key: `DISCOGS_ACCESS_TOKEN`
   - Value: *(paste from your apiKey.env file)*
   - Click "Save Changes"

   **Variable 5:**
   - Key: `DISCOGS_ACCESS_TOKEN_SECRET`
   - Value: *(paste from your apiKey.env file)*
   - Click "Save Changes"

   **Variable 6 (Optional):**
   - Key: `PORT`
   - Value: `3000`
   - Click "Save Changes"
   *(Render will set this automatically, but it's good to be explicit)*

### 6.5 Deploy

1. Scroll to bottom
2. Click **"Create Web Service"**
3. **Wait for deployment** (5-10 minutes)
   - Watch the "Logs" tab for progress
   - You'll see: "Installing dependencies...", "Building...", "Starting..."

4. **When deployment succeeds:**
   - You'll see: "Your service is live at https://your-app-name.onrender.com"
   - **Copy this URL!**

---

## 🧪 STEP 7: Test Live Deployment

### 7.1 Visit Your Live URL
Open `https://your-app-name.onrender.com` in your browser

### 7.2 Test Everything

**Basic Functionality:**
- [ ] Website loads
- [ ] No console errors (press F12, check Console tab)
- [ ] Can see the interface

**Poster Creation:**
- [ ] Enter album name and artist
- [ ] Enter/upload image URL
- [ ] Click CREATE button
- [ ] Poster preview appears
- [ ] Image loads in preview

**Customization:**
- [ ] Change size (Paper/Tabloid)
- [ ] Change orientation
- [ ] Change layout (A/B/C)
- [ ] Change colors
- [ ] Change font
- [ ] Adjust scale slider
- [ ] Change text type

**Gallery:**
- [ ] Save a poster
- [ ] Click GALLERY in nav
- [ ] See saved poster
- [ ] Click EDIT on a poster
- [ ] Poster loads for editing
- [ ] Click EXPORT
- [ ] Image downloads

**If anything doesn't work:**
- Check Render logs (click your service → "Logs" tab)
- Check browser console (F12)
- Verify environment variables are set correctly

---

## 📋 STEP 8: Final Verification

### 8.1 Update README.md with Live URL

Edit `README.md` and update the live URL:

```markdown
## 🌐 Live Demo

[View Live Site](https://your-actual-url.onrender.com)
```

Then commit and push:
```bash
git add README.md
git commit -m "Update README with live URL"
git push
```

### 8.2 Create Final Checklist

Before submitting, verify:

- [ ] Code is on GitHub
- [ ] All files are in GitHub (except ignored files)
- [ ] Site is deployed and live
- [ ] Live site works (all features tested)
- [ ] No console errors on live site
- [ ] Environment variables are set in Render
- [ ] README.md has live URL
- [ ] You have both URLs ready:
  - GitHub: `https://github.com/YOUR_USERNAME/album-poster-design-hub`
  - Live: `https://your-app-name.onrender.com`

---

## 🎉 You're Done!

Your project is now:
- ✅ Version controlled on GitHub
- ✅ Deployed and live on the internet
- ✅ Ready to submit!

**Share these URLs:**
- **GitHub Repository:** `https://github.com/YOUR_USERNAME/album-poster-design-hub`
- **Live Website:** `https://your-app-name.onrender.com`

---

## 🆘 Troubleshooting

### Issue: "Cannot push to GitHub"
**Solution:** 
- Make sure you're authenticated (use Personal Access Token)
- Verify repository URL is correct
- Check you have write access to the repository

### Issue: "Build failed on Render"
**Solution:**
- Check Render logs for specific error
- Verify `package.json` has correct "start" script
- Ensure all dependencies are listed in `package.json`

### Issue: "API calls not working on live site"
**Solution:**
- Verify all environment variables are set in Render
- Check that variable names match exactly (case-sensitive)
- Restart the service after adding variables

### Issue: "CORS errors"
**Solution:**
- Verify `getApiBaseUrl()` returns empty string in production (uses relative URLs)
- Check server.js has CORS headers configured (already done)

### Issue: "Service keeps spinning down"
**Solution:**
- Free tier services sleep after 15 min inactivity
- First request after sleep takes ~30 seconds
- This is normal for free tier
- Consider upgrading for 24/7 uptime

---

## 📞 Need Help?

If you encounter issues:
1. Check the error message carefully
2. Review Render logs
3. Check browser console
4. Verify all steps were followed correctly

Good luck with your submission! 🚀

