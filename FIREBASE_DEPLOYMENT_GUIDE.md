# Firebase Deployment Guide for ParkPass

## Prerequisites
- Firebase CLI installed ✓
- Firebase project created in Firebase Console
- Environment variables ready

## Required Environment Variables

Your app needs these secrets in Firebase:

1. **DATABASE_URL** - Your PostgreSQL connection string
2. **SESSION_SECRET** - Session encryption key
3. **SENDGRID_API_KEY** - Email service API key
4. **OPENAI_API_KEY** - AI image generation key
5. **VITE_STRIPE_PUBLIC_KEY** - Stripe public key

## Deployment Steps

### 1. Login to Firebase
```bash
firebase login
```

### 2. Initialize Firebase App Hosting
```bash
firebase init hosting
```

Select:
- Use an existing project (or create new)
- Choose "Configure as a single-page app" = **NO**
- Choose "Set up automatic builds and deploys with GitHub" = **NO**
- Choose "File to serve for 404 errors" = **index.html**
- Overwrite existing files = **NO**

### 3. Configure Environment Variables
In Firebase Console:
1. Go to your project
2. Navigate to Project Settings > Service Accounts
3. Go to "Environment Variables" section
4. Add each variable listed above

### 4. Update firebase.json
The firebase.json file is already configured for App Hosting.

### 5. Deploy
```bash
npm run build
firebase deploy
```

## Alternative: Deploy to Other Platforms

Your app might work better on these platforms:

### Vercel (Recommended for Node.js apps)
```bash
npm install -g vercel
vercel
```

### Railway
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Render
1. Connect your GitHub repo
2. Set environment variables
3. Deploy automatically

## Current Build Configuration

Your app builds to:
- Frontend: `dist/public/` (static files)
- Backend: `dist/index.js` (Node.js server)

## Database Setup

Make sure your PostgreSQL database is accessible from Firebase:
- Use a cloud database like Neon, Supabase, or Google Cloud SQL
- Update DATABASE_URL with the external connection string

## Testing Before Deployment

1. Run build locally:
   ```bash
   npm run build
   ```

2. Test production build:
   ```bash
   npm start
   ```

3. Verify all environment variables are set

## Troubleshooting

### Build Issues
- Build might take 3-5 minutes due to many dependencies
- If build fails, try clearing node_modules: `rm -rf node_modules package-lock.json && npm install`

### Database Connection
- Ensure DATABASE_URL is accessible from Firebase servers
- Check firewall settings on your database

### Environment Variables
- All secrets must be set in Firebase Console
- VITE_ variables are embedded at build time

## Post-Deployment

After deployment:
1. Test login with existing accounts
2. Verify database connections
3. Test email notifications
4. Check all application features

## Current User Accounts

You have these accounts to test with:
- sierra.sahleen@parkspass.org (Admin)
- chrisharamoto (Staff)
- yellow (Manager)
- peaches (Staff)
- jaredgoodspeed (Manager)
- joshdelmonte (Manager)