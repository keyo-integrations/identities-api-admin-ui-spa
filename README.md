# Keyo Identities Admin

A low or no code, rapidly deployable tool to easily manage Keyo identity accounts. This tool is mobile friendly and can be cloned for customization and deployment to your stack as needed, or follow our guide to deploy for free on platforms like Replit and Railway.

## What You Need To Setup

1. KEYO_ORG_ID - Log into the Keyo Admin Dashboard to retrieve the org id (in the url)
2. KEYO_AUTH_TOKEN - Log into the Keyo Admin Dashboard to retrieve a token [as shown in the developer docs](https://developers.keyo.co/rest-api/authentication#id-1.-obtaining-client-credentials)
3. USERS - Add users (email / password) that are allowed to login (follow the steps below for a particular platform)

## Deploy on Replit

1. Go to https://replit.com
2. Click "Import from GitHub"
3. Paste this URL: [GITHUB_REPO_URL]
4. Wait for import to finish
5. Click "Secrets" (lock icon)
6. Add these secrets:
   - KEYO_ORG_ID = [org id]
   - KEYO_AUTH_TOKEN = [your token]
   - USERS = {"user@example.com":"password1","admin@example.com":"password2"}
7. Click "Run"
8. Copy the URL shown
9. Open URL in browser

## Deploy on Railway

1. Go to https://railway.app
2. Click "New Project"
3. Click "Deploy from GitHub repo"
4. Select your GitHub account
5. Select this repository
6. Click "Add Variable" 3 times:
   - KEYO_ORG_ID = [org id]
   - KEYO_AUTH_TOKEN = [your token]
   - USERS = {"user@example.com":"password1","admin@example.com":"password2"}
7. Wait for deploy (2-3 minutes)
8. Click "Generate Domain"
9. Open the domain URL

## Configure Users

USERS must be JSON format with email as the key:
{"email":"password","another@email.com":"anotherpassword"}

Example:
{"admin@example.com":"secret123","user@example.com":"pass456"}

## Test

1. Open your deployed URL
2. Enter email and password (from USERS)
3. Click Login
4. You should see the identities list

## Appendix: Changing Keyo API Base URL

The Keyo API base URL is hardcoded in the source code for easy configuration.

To change it:

1. Open `src/config.ts`
2. Update the `KEYO_API_BASE` constant:

```typescript
export const KEYO_API_BASE = 'https://your-keyo-api-url.com';
```

3. Rebuild and restart the server:
   ```bash
   npm run build
   npm start
   ```

Examples:
- Production: `https://api.keyo.com`
- Staging: `https://api-staging.keyo.com`
- Custom: `https://your-keyo-instance.com`

