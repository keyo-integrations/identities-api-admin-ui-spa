# Keyo Identities Admin

A low or no code, rapidly deployable tool to easily create and manage Keyo identity accounts. This tool is mobile friendly and can be cloned for customization and deployment to your own server stack as needed, or follow our guides to deploy for free on platforms like Replit or Railway.

> **Note:** This tool does not support management of users who created their accounts via the Keyo Dashboard.

## What You Need To Get Started

1. Keyo account-specific data
   - KEYO_AUTH_TOKEN - Log into the Keyo Admin Dashboard and create a token [as shown in the developer docs](https://developers.keyo.co/rest-api/authentication#id-1.-obtaining-client-credentials)
   - KEYO_ORG_ID - Log into the Keyo Admin Dashboard to retrieve the org id (in the url)
2. Deploy the application on any laptop/server/cloud-platform of your choice. To quickly test, we recommend opening a free Replit account and following the instructions below
3. Log into the app and follow the "Test" section below to start managing Keyo identity accounts

## Deploy on Replit

1. Go to https://replit.com and create free account
2. On the left-side menu click, "Import code or design" and select GitHub
3. Paste this URL: https://github.com/keyo-integrations/identities-api-admin-ui-spa
4. Click "Import", and replit will start setting up the application
5. While it is setting up, click the link at the top titled, "Tools & Files" and search for the word "Secrets"
6. Add these secrets:
   - KEYO_ORG_ID = [Your org id from Keyo admin dashboard]
   - KEYO_AUTH_TOKEN = [Your token from Keyo admin dashboard]
   - USERS = {"user@example.com":"password1","admin@example.com":"password2"}
     - For deployment, change the email/password as needed
7. In the upper left, near the name of the repository, click the square, which "stops" the application. 
8. Then click the trangle to "start" the app again so it can read the secrets you added before
9. Click "Tools & Files" again and search for "Preview". This window will show the application
10. Log into the app with any of the "USERS" added in step 6


## Test

1. Open your deployed URL
2. Enter email and password (from USERS)
3. Click Login
4. Next to where it says, "Enrollment Device", click the gear icon and add one Keyo device using the last 8 digits on the device's sticker, located on the back
5. On the create account form, click "Create and enroll" button if you want to create an account and trigger the device for enrollment
6. Enroll (or re-enroll) the biometric data for any identity account by clicking "Manage identities", click on a user name and then click the "Enroll" button. Even if the user already has biometrics enrolled it will allow them to re-enroll


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

## Deploy on your own server
1. Copy .env.example to .env
2. In the .env file, update the values accordingly
3. Restart the application after updating the .env file

## Configure Users

In the "Secrets" or .env file, USERS must be added in JSON format with email as the key:
{"email":"password","another@email.com":"anotherpassword"}

Example:
{"admin@example.com":"secret123","user@example.com":"pass456"}




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

