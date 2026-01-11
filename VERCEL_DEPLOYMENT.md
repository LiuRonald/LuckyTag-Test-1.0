# Vercel Deployment Guide

## Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository with your code
- Supabase project already set up

## Step-by-Step Deployment

### 1. Push Code to GitHub
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Connect to Vercel
1. Go to https://vercel.com and sign in
2. Click "Add New..." → "Project"
3. Select your GitHub repository
4. Click "Import"

### 3. Configure Environment Variables
In the Vercel dashboard, go to **Settings** → **Environment Variables** and add:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
EMAIL_USER=your-email@gmail.com (optional)
EMAIL_PASS=your-gmail-app-password (optional)
NODE_ENV=production
```

### 4. Deploy
1. Click "Deploy"
2. Wait for the build to complete
3. Your app will be available at `https://your-project.vercel.app`

## Post-Deployment

### Update CORS Origins
After getting your Vercel URL, update the `allowedOrigins` in `server.js`:

```javascript
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://your-project.vercel.app']
  : ['http://localhost:3000'];
```

Then commit and push the changes to trigger a new deployment.

### Testing
1. Visit your Vercel URL
2. Test the signup and login functionality
3. Create a tag and verify it works
4. Search for tags in staff-admin page
5. Test all features in the admin dashboard

## Troubleshooting

### Build Fails
- Check that all dependencies are in package.json
- Ensure .env variables are set in Vercel dashboard
- Check Vercel deployment logs for errors

### Runtime Errors
- Check Supabase connection: Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct
- Check CORS issues: Make sure Vercel URL is in allowedOrigins
- Check database: Ensure all tables exist in Supabase

### Performance Issues
- Consider adding caching headers for static files
- Monitor Vercel analytics dashboard
- Check Supabase database performance

## Custom Domain (Optional)
1. Go to your project settings in Vercel
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Monitoring
- Enable Vercel Analytics for performance monitoring
- Set up error tracking with Sentry (optional)
- Monitor Supabase database usage

## Rollback
To rollback to a previous deployment:
1. Go to Vercel dashboard
2. Select your project
3. Go to "Deployments"
4. Click the three dots on a previous deployment
5. Select "Promote to Production"
