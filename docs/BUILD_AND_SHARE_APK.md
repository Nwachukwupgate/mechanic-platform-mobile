# Step-by-step: Build an APK and share it with your client

This guide assumes you’re on **macOS** and new to building Android apps. Follow the steps in order.

---

## Part 1: Install Android Studio (one-time setup)

### Step 1.1 – Download Android Studio

1. Open: **https://developer.android.com/studio**
2. Click **“Download Android Studio”**.
3. Accept the terms and download the **.dmg** for Mac.
4. Open the downloaded file and drag **Android Studio** into your **Applications** folder.

### Step 1.2 – First run and SDK setup

1. Open **Android Studio** from Applications.
2. If it says “Android Studio was downloaded from the internet”, click **Open**.
3. On the welcome screen, click **Next** until you see **Install Type**.
4. Choose **Standard** → **Next** → **Finish**.
5. Wait for the download to finish (this installs the Android SDK and tools). It can take 5–15 minutes.
6. When it says “Finishing installation”, click **Finish**.

### Step 1.3 – Accept SDK licenses (needed for building)

1. Open **Terminal** (search “Terminal” in Spotlight).
2. Run:

   ```bash
   yes | ~/Library/Android/sdk/cmdline-tools/latest/bin/sdkmanager --licenses
   ```

   If that path doesn’t exist, try:

   ```bash
   yes | $HOME/Library/Android/sdk/tools/bin/sdkmanager --licenses
   ```

3. When asked, type **y** and press Enter for each license (or run with `yes |` as above to accept all).

You only need to do Part 1 once. After this, you can build APKs from this project whenever you want.

---

## Part 2: Build the APK from your project

Do this from the **project folder** (where `package.json` and `app.json` are).

### Step 2.1 – Open Terminal in the project folder

1. In **Finder**, go to: `Documents/mechanic-platform-mobile` (or wherever the project is).
2. Right-click the **mechanic-platform-mobile** folder → **New Terminal at Folder** (or open Terminal and run: `cd /Users/mac/Documents/mechanic-platform-mobile`).

### Step 2.2 – Install dependencies (if you haven’t already)

Run:

```bash
npm install
```

Wait until it finishes.

### Step 2.3 – Generate the Android project

Run:

```bash
npx expo prebuild --platform android
```

- If it asks “What would you like to do?” → choose **Use existing android folder** or **Overwrite** (Overwrite is fine if you want a clean build).
- This creates an `android` folder with the native Android project. It may take a minute.

### Step 2.4 – Build the APK

Run:

```bash
cd android
./gradlew assembleRelease
cd ..
```

- The first time can take several minutes (downloads Gradle and dependencies).
- If you see **BUILD SUCCESSFUL** at the end, the APK was created.

**If you get “permission denied” on `./gradlew`**, run once:

```bash
chmod +x android/gradlew
```

Then run `./gradlew assembleRelease` again.

### Step 2.5 – Find your APK file

The APK path is:

```
mechanic-platform-mobile/android/app/build/outputs/apk/release/app-release.apk
```

- In Finder: open the project → **android** → **app** → **build** → **outputs** → **apk** → **release**.
- The file is **app-release.apk**. This is the file you will share with your client.

**Note:** The first time you build **release**, Gradle might ask for a keystore (signing). If it does, you can create a debug APK instead for client testing:

```bash
cd android
./gradlew assembleDebug
cd ..
```

Debug APK path: `android/app/build/outputs/apk/debug/app-debug.apk`. You can share that for testing; for a “final” demo, use the release APK once signing is set up.

---

## Part 3: Share the APK with your client

### Option A – Google Drive (simple and professional)

1. Upload **app-release.apk** (or **app-debug.apk**) to **Google Drive**.
2. Right-click the file → **Share** → set to **“Anyone with the link”** (Viewer).
3. Copy the link and send it to your client (email, WhatsApp, etc.).
4. Tell them: “Download the APK from this link and install it on your Android phone (see steps below).”

### Option B – Other file sharing

You can use **Dropbox**, **WeTransfer**, **OneDrive**, or any service that gives a download link. Upload the APK and send the link.

### Option C – Send the file directly

If you meet in person or use AirDrop/email: send **app-release.apk** (or **app-debug.apk**) and ask them to copy it to their phone and open it to install.

---

## Part 4: What to tell your client (how to install the APK)

Send them something like this (you can copy and edit):

---

**How to install the app on your Android phone**

1. Open the link I sent and **download the APK file** (e.g. “app-release.apk”) to your phone.
2. If your phone says “For your security, your phone is not allowed to install unknown apps from this source”:
   - Open **Settings** → **Security** (or **Apps** → **Special app access**).
   - Find **“Install unknown apps”** or **“Unknown sources”**.
   - Select **Chrome** (or the app you used to download the file) and turn **Allow from this source** ON.
3. Open your **Files** or **Downloads** app and tap the downloaded APK file.
4. Tap **Install** and accept if the phone asks for confirmation.
5. When installation finishes, tap **Open** or find the app icon in your app drawer.

**Note:** The app needs **location permission** when you use “Find mechanics” so it can show nearby mechanics. Please allow when the app asks.

---

## Part 5: Quick reference – build again later

Whenever you change the code and want a **new APK** to send:

1. Open Terminal in the project folder:  
   `cd /Users/mac/Documents/mechanic-platform-mobile`
2. Run:

   ```bash
   npx expo prebuild --platform android --clean
   cd android
   ./gradlew assembleRelease
   cd ..
   ```

3. Get the new APK from:  
   `android/app/build/outputs/apk/release/app-release.apk`  
   (or `.../debug/app-debug.apk` if you use `assembleDebug`).
4. Upload and share the new link with your client.

---

## If something goes wrong

### “Unexpected end of ZLIB input stream” during Android Studio / SDK install

This means an SDK package (e.g. **Google Play Intel x86_64 Atom System Image**) downloaded incompletely or got corrupted. Fix it like this:

1. **Quit Android Studio** completely.

2. **Remove the corrupted SDK package** so it can be re-downloaded. In **Terminal**, run:

   ```bash
   rm -rf ~/Library/Android/sdk/system-images/android-*/*/x86_64*
   ```

   That removes the system image that failed. If you prefer to remove only the “Google Play” one:

   ```bash
   rm -rf ~/Library/Android/sdk/system-images/android-*/google_apis_playstore/x86_64
   ```

3. **Clear Android Studio’s download cache** (optional but often helps):

   ```bash
   rm -rf ~/Library/Android/sdk/.temp
   rm -rf ~/Library/Caches/Google/AndroidStudio*
   ```

4. **Reopen Android Studio.**

5. Open **SDK Manager**: **Settings** (or **Preferences**) → **Languages & Frameworks** → **Android SDK** (or **Appearance & Behavior** → **System Settings** → **Android SDK**).

6. In the **SDK Platforms** or **SDK Tools** tab, **uncheck** “Google Play Intel x86_64 Atom System Image” if it’s checked (you don’t need it just to build an APK for a real device). Click **Apply** and finish.

   - If you **do** want that image (for the emulator), leave it checked and click **Apply** so it downloads again. Use a **stable Wi‑Fi** connection and don’t put the Mac to sleep until it finishes.

7. For **building an APK to test on a real phone**, you only need:
   - **Android SDK Platform** (e.g. latest or the one your project uses)
   - **Android SDK Build-Tools**
   - **Android SDK Command-line Tools**

   You can **skip** system images and emulators if you’re only building APKs for your client.

---

| Problem | What to try |
|--------|-------------|
| **ZLIB / “Unexpected end of ZLIB input stream”** | See section above: quit Studio, remove corrupted package and cache, reopen SDK Manager, re-download or uncheck the failing component. |
| “ANDROID_HOME not set” | In Terminal: `echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc` then `source ~/.zshrc`. |
| “sdkmanager not found” | Install Android Studio and complete Part 1, then run the license command again. |
| “Build failed” (Gradle) | Run `cd android && ./gradlew clean && ./gradlew assembleRelease` then try again. |
| Release build asks for keystore | Use `./gradlew assembleDebug` and share **app-debug.apk** for testing. |
| Client can’t install | Remind them to allow “Install unknown apps” for the browser or file app they used to download the APK. |

---

## Summary checklist

- [ ] Android Studio installed and SDK/licenses done (Part 1)
- [ ] `npm install` and `npx expo prebuild --platform android` (Part 2)
- [ ] `cd android && ./gradlew assembleRelease` (or `assembleDebug`) (Part 2)
- [ ] APK found in `android/app/build/outputs/apk/...` (Part 2)
- [ ] APK uploaded to Drive (or similar) and link set to “Anyone with the link” (Part 3)
- [ ] Client told how to download and install the APK (Part 4)

After this, you can repeat Part 5 whenever you have a new version to show your client.
