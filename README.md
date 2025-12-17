# Keyo Identities Admin

Admin tool for managing Keyo identities.

## What You Need To Setup

1. KEYO_AUTH_TOKEN - Your Keyo API token
2. USERS - Login credentials (JSON format: email -> password)
3. KEYO_ORG_ID - (Optional) Your Keyo organization ID (for future use)

## Deploy on Replit

1. Go to https://replit.com
2. Click "Import from GitHub"
3. Paste this URL: [GITHUB_REPO_URL]
4. Wait for import to finish
5. Click "Secrets" (lock icon)
6. Add these 2 secrets:
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
6. Click "Add Variable" 2 times:
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

