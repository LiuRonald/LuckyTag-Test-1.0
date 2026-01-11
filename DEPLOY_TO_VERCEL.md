# Deploying to Vercel - Quick Start

Your Lost & Found System is now ready for production deployment on Vercel!

## What We've Prepared

✅ **vercel.json** - Vercel configuration for optimal deployment
✅ **Environment variables** - Configured to use Vercel secrets
✅ **CORS configuration** - Production-ready with domain support
✅ **Node.js version** - Specified in .nvmrc (v18.16.0)
✅ **Package.json** - Updated with build script and engine requirements

## Quick Deployment Steps

### 1. Create GitHub Repository (if not already done)
```bash
git add .
git commit -m "Production-ready app for Vercel deployment"
git push origin main
```

### 2. Deploy to Vercel
1. Visit https://vercel.com
2. Sign in with your GitHub account
3. Click **"Add New..."** → **"Project"**
4. Select your repository
5. Click **"Import"**

### 3. Set Environment Variables
In the Vercel dashboard, add these variables under **Settings → Environment Variables**:

**Required:**
```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_ANON_KEY = your-anon-key-here
NODE_ENV = production
```

**Optional (for email notifications):**
```
EMAIL_USER = your-email@gmail.com
EMAIL_PASS = your-gmail-app-password
```

### 4. Deploy
Click the **"Deploy"** button and wait for completion!

## After Deployment

### ⚠️ Important: Update CORS
After your Vercel URL is generated (e.g., `your-app.vercel.app`):

1. Edit `server.js` line ~19
2. Update the `allowedOrigins` array to include your Vercel URL:
```javascript
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://your-app.vercel.app']  // ← Add your actual URL here
  : ['http://localhost:3000'];
```

3. Commit and push:
```bash
git add server.js
git commit -m "Update CORS for production URL"
git push
```

4. Vercel will automatically redeploy!

## Testing Your Live App

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Test creating an account
3. Try creating a tag
4. Search for tags in staff-admin
5. Verify all features work

## Monitoring & Support

- **Vercel Dashboard**: Monitor deployment logs and performance
- **Supabase Dashboard**: Check database status and usage
- **Error Tracking**: Enable Vercel Analytics for insights

## Need Help?

- See **VERCEL_DEPLOYMENT.md** for detailed deployment guide
- Check **PRODUCTION_CHECKLIST.md** for production readiness items
- Review Vercel docs: https://vercel.com/docs

## Your App is Production-Ready! 🚀

All code, configuration files, and documentation are in place. Follow the steps above to deploy!
