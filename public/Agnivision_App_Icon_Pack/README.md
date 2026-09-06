# AgniVision React Native App Icon Pack

This pack was generated from the approved AgniVision artwork with the dark premium background.

## What is included

### Master
- `master/Agnivision_AppIcon_Master_1024.png`
- Use this as the canonical raster source for future exports.

### Expo / Expo Router
Copy the files from `expo/` to something like `assets/icons/` in your project.

Example config is included as:
- `expo/app.json-snippet.json`

Recommended:
- `icon.png` for the standard iOS / Android app icon
- `adaptive-icon-foreground.png` for Android adaptive icon foreground
- Background color: `#0D121C`

### Bare React Native iOS
Replace your existing Xcode app icon set with:
- `ios/AppIcon.appiconset`

Typical location:
`ios/<YourApp>/Images.xcassets/AppIcon.appiconset`

The folder includes a ready `Contents.json`.

Important:
- Do not manually round the iOS icon. iOS applies the mask.
- The App Store marketing asset is 1024x1024.

### Bare React Native Android
Copy the contents of:
- `android/app/src/main/res/`

into your project's:
- `android/app/src/main/res/`

Included:
- Legacy launcher icons for mdpi through xxxhdpi
- Round launcher icons
- Android adaptive foreground assets
- `mipmap-anydpi-v26` XML
- Dark background color resource

### Store assets
- `store-assets/app-store-icon-1024.png`
- `store-assets/google-play-icon-512.png`

## Design notes
- The dark background is intentionally part of the standard icon artwork.
- Android adaptive icons use a separate transparent foreground plus the dark background color so the OS can safely apply circle, squircle, rounded-square, and other launcher masks.
- Keep the master artwork unrounded. Platform launchers apply their own masks.

## Recommended React Native workflow
If using Expo/EAS, the `expo/` files are usually all you need.
If using bare React Native, use both the iOS AppIcon asset set and Android `res` folders.
