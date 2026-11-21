# Security deployment checklist

## Required server configuration

Set these values in the server runtime (never expose them with a `VITE_` prefix):

- `GEMINI_API_KEY`: server-side Gemini API key.
- `FIREBASE_PROJECT_ID=gen-lang-client-0638260382`: Firebase project ID.
- `FIRESTORE_DATABASE_ID=ai-studio-abyapi-930a6131-e544-4748-ad41-70a4db7c4e48`: named Firestore database used by this app.

The API now verifies Firebase ID tokens with the Firebase Admin SDK and checks the user's active license before running paid AI operations. On Google Cloud Run, grant the runtime service account permission to verify Firebase Authentication tokens and access the named Firestore database. For local development, configure Application Default Credentials (for example, with `gcloud auth application-default login`) or a dedicated service account through `GOOGLE_APPLICATION_CREDENTIALS`. Never commit service-account JSON files.

## Firestore rules deployment

Publish the updated `firestore.rules` to the same named Firestore database configured above. Confirm the rules are deployed before releasing the frontend. Users can access only their own user documents and only while their license is active and its expiry is a Firestore Timestamp in the future. The Admin License panel now writes expiry values as Firestore Timestamps; re-save each existing license once in the admin panel after deploying these rules to migrate legacy ISO-string expiry values. Only the verified administrator account `alpaslan.beyoglu@gmail.com` can list or modify license documents.

## Authentication setup

- Enable Google as a Firebase Authentication provider.
- Add each production and preview hostname to Firebase Authentication's authorized domains.
- The administrator must sign in with the verified Google account `alpaslan.beyoglu@gmail.com`.
- There is no client-side admin PIN or localStorage-based admin session.

## API limits

The AI endpoints enforce per-user in-memory limits: offer generation 10/minute, caption generation 15/minute, and blueprint generation 4/minute. For multiple server instances, replace the in-memory limiter with a shared store such as Redis so limits apply across instances.
