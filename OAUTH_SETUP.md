# OAuth Setup Guide - Google Sign In

This guide will help you configure Google authentication for your Water Towers app.

## Google OAuth Setup

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:

   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:

   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     ```
     Replace `YOUR_PROJECT_REF` with your Supabase project reference ID

5. Copy your:
   - **Client ID**
   - **Client Secret**

### Step 2: Configure in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to: **Authentication** → **Providers**
3. Find **Google** in the list
4. Enable Google provider
5. Paste your:
   - **Client ID**
   - **Client Secret**
6. Click **Save**

### Step 3: Add Authorized Domains (Production)

When deploying to production, add your domain to Google Console:

- Go back to Google Cloud Console → Credentials
- Edit your OAuth client
- Add authorized origins: `https://yourdomain.com`
- Add authorized redirect URIs: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

---

## Testing

### Local Testing (localhost)

Google OAuth works with `http://localhost:3001` by default - no special configuration needed!

### Production Testing

1. Deploy your app to production (Vercel, Netlify, etc.)
2. Update Google authorized domains
3. Add your production domain to Supabase Auth settings:
   - Go to **Authentication** → **URL Configuration**
   - Add your site URL: `https://yourdomain.com`
   - Add redirect URLs if needed

---

## Callback URL Reference

Your Supabase callback URL will always be:

```
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

To find your Project Ref:

1. Go to Supabase Dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Look at your **Project URL**: `https://YOUR_PROJECT_REF.supabase.co`

---

## Troubleshooting

### Google Issues

- **Redirect URI mismatch**: Make sure the callback URL in Google Console exactly matches Supabase
- **Access blocked**: Your app needs to be verified for production use (small user base is fine for testing)
- Clear browser cache and cookies
- Check Supabase logs: **Authentication** → **Logs**
- Verify redirect URLs don't have trailing slashes
- Check that Google provider is enabled in Supabase

---

## Additional Security (Recommended)

### Supabase Auth Settings

Go to **Authentication** → **Settings**:

1. **Site URL**: Set to your production URL
2. **Redirect URLs**: Add allowed redirect URLs
3. **Email Templates**: Customize confirmation emails
4. **Rate Limiting**: Configure to prevent abuse

### Google Additional Setup

- Configure OAuth consent screen
- Add privacy policy URL
- Add terms of service URL
- Request verification for production (if needed)

---

## Done! 🎉

Your app now supports:

- ✅ Email/Password authentication
- ✅ Google Sign In

Users can choose their preferred sign-in method on the login page.

1. **Site URL**: Set to your production URL
2. **Redirect URLs**: Add allowed redirect URLs
3. **Email Templates**: Customize confirmation emails
4. **Rate Limiting**: Configure to prevent abuse

### Google Additional Setup

- Configure OAuth consent screen
- Add privacy policy URL
- Add terms of service URL
- Request verification for production (if needed)

---

## Done! 🎉

Your app now supports:

- ✅ Email/Password authentication
- ✅ Google Sign In
- ✅ Apple Sign In

Users can choose their preferred sign-in method on the login page.
