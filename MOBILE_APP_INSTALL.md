# Installing as a Full-Screen Mobile App

The UK Water Towers Map can be installed as a full-screen web app on your mobile device, giving you a native app-like experience.

## 📱 iOS (iPhone/iPad)

1. **Open in Safari** (must use Safari, not Chrome)

   - Navigate to your app URL in Safari

2. **Add to Home Screen**

   - Tap the Share button (square with arrow pointing up)
   - Scroll down and tap "Add to Home Screen"
   - Edit the name if desired (default: "Water Towers")
   - Tap "Add"

3. **Launch the App**
   - Find the app icon on your home screen
   - Tap to launch in full-screen mode
   - The app will run without Safari's address bar and navigation

### Features on iOS:

- ✅ Full-screen mode (no browser UI)
- ✅ Black translucent status bar
- ✅ Appears as standalone app
- ✅ Works offline (once loaded)
- ✅ Push to home screen

## 🤖 Android

1. **Open in Chrome or Edge**

   - Navigate to your app URL

2. **Install App**

   - Method 1: Tap the "Install" or "Add to Home Screen" prompt that appears
   - Method 2: Tap the three-dot menu → "Install app" or "Add to Home Screen"

3. **Launch the App**
   - Find the app icon in your app drawer or home screen
   - Tap to launch in full-screen mode

### Features on Android:

- ✅ Full-screen standalone mode
- ✅ No browser UI
- ✅ Appears in app drawer
- ✅ Can be uninstalled like regular apps
- ✅ Works offline (once loaded)

## 🖥️ Desktop (Chrome, Edge)

You can also install the app on desktop:

1. **Install via Browser**

   - Look for the install icon in the address bar (⊕ or computer icon)
   - Click "Install"

2. **Or via Menu**

   - Chrome: Menu → "Install Water Towers Map"
   - Edge: Menu → Apps → "Install this site as an app"

3. **Launch**
   - App appears in your Start Menu/Applications folder
   - Opens in its own window without browser UI

## 🎨 Customizing Icons

The current app uses placeholder blue icons. To use custom icons:

1. Replace these files in `public/`:

   - `icon-192.png` (192x192 pixels)
   - `icon-512.png` (512x512 pixels)
   - `apple-touch-icon.png` (180x180 pixels)

2. Use the icon generator:

   - Open `public/generate-icons.html` in a browser
   - It will generate icons with the tower emoji
   - Save the generated images to the `public/` folder

3. Design custom icons:
   - Use tools like Figma, Photoshop, or Canva
   - Export as PNG with transparent background
   - Recommended: Blue gradient background (#2563eb to #1d4ed8)
   - Include tower imagery or "🗼" emoji

## ⚙️ Technical Details

### Manifest Configuration

The app uses a web manifest (`/manifest.json`) that defines:

- App name: "UK Water Towers Map"
- Short name: "Water Towers"
- Display mode: `standalone` (full-screen, no browser UI)
- Theme color: `#2563eb` (blue)
- Background color: `#ffffff` (white)
- Start URL: `/dashboard`

### Browser Support

- ✅ iOS Safari 11.3+
- ✅ Chrome (Android) 40+
- ✅ Samsung Internet 4+
- ✅ Edge (Desktop/Mobile)
- ✅ Firefox (limited PWA support)

### Offline Support

Currently, the app requires an internet connection for:

- Map tiles (Leaflet/OpenStreetMap)
- Tower data (Supabase)
- Authentication

Future enhancement: Add service worker for offline caching.

## 🚀 Testing

1. **Test on Local Network**

   - Run `npm run dev`
   - Access from mobile on same network: `http://[your-ip]:3000`
   - PWA features require HTTPS (won't work on local HTTP)

2. **Test on Production**
   - Deploy to Vercel (automatic HTTPS)
   - Open on mobile device
   - Verify "Add to Home Screen" prompt appears

## 📝 Notes

- **HTTPS Required**: PWA features (install prompt, manifest) only work on HTTPS
- **Safari Limitations**: iOS Safari doesn't show install prompts automatically; users must manually add to home screen
- **Update Detection**: When you deploy updates, installed apps will update automatically on next launch
- **Uninstalling**: Users can uninstall like any app (long-press icon → Remove/Uninstall)

## 🔧 Troubleshooting

**"Add to Home Screen" not appearing:**

- Ensure you're on HTTPS (production, not local)
- On iOS: Must use Safari browser
- Check that `manifest.json` is accessible at `/manifest.json`
- Verify icons exist in `/public/` folder

**App not running in full-screen:**

- Check `manifest.json` has `"display": "standalone"`
- Verify `apple-mobile-web-app-capable` meta tag is present
- Try uninstalling and reinstalling the app

**Icons not showing:**

- Verify PNG files exist and are valid
- Check file names match exactly in `manifest.json`
- Clear browser cache and reinstall

## 📚 Resources

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev: Install criteria](https://web.dev/install-criteria/)
- [Apple: Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
