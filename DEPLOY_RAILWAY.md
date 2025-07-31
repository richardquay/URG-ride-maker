# Deploying to Railway (Recommended for Discord Bots)

## Why Railway is Better for Discord Bots

✅ **Always Running** - Discord bots need to stay online 24/7  
✅ **Free Tier** - 500 hours/month free (enough for most bots)  
✅ **Simple Setup** - Just connect GitHub and deploy  
✅ **Auto-restart** - Automatically restarts if the bot crashes  
✅ **Easy Environment Variables** - Simple web interface  

## Quick Setup (5 minutes)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/URG-RideMaker_DB.git
git push -u origin main
```

### 2. Deploy to Railway
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Railway will automatically detect it's a Node.js app

### 3. Set Environment Variables
In Railway dashboard:
- Go to your project
- Click "Variables" tab
- Add these variables:
  ```
  DISCORD_TOKEN=your_discord_token_here
  DISCORD_CLIENT_ID=your_client_id_here
  FIREBASE_PROJECT_ID=urg-ridemaker
  FIREBASE_PRIVATE_KEY_ID=your_private_key_id
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
  FIREBASE_CLIENT_EMAIL=your_client_email
  FIREBASE_CLIENT_ID=your_client_id
  FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
  FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
  FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
  FIREBASE_CLIENT_X509_CERT_URL=your_cert_url
  ```

### 4. Deploy Discord Commands
```bash
node src/deploy-commands.js
```

## Benefits Over Firebase Functions

| Feature | Firebase Functions | Railway |
|---------|-------------------|---------|
| **Always Running** | ❌ No | ✅ Yes |
| **Discord Bot Support** | ❌ Poor | ✅ Excellent |
| **Free Tier** | ❌ Requires Blaze | ✅ 500 hours/month |
| **Setup Complexity** | ❌ Complex | ✅ Simple |
| **Auto-restart** | ❌ No | ✅ Yes |

## Railway Commands

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy from CLI
railway up

# View logs
railway logs

# Open dashboard
railway open
```

## Environment Variables

Copy from your `.env` file to Railway Variables tab:
- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- All `FIREBASE_*` variables

## Monitoring

- **Logs**: Railway dashboard → Logs tab
- **Status**: Railway dashboard → Deployments tab
- **Uptime**: Railway automatically restarts failed deployments

## Cost

- **Free**: 500 hours/month (enough for 24/7 bot)
- **Paid**: $5/month for unlimited hours

Your Discord bot will likely stay within the free tier! 