# grail-market-mobile

Not started yet. This repo exists so the mobile client has somewhere to land.

The backend is client-agnostic — the web client uses nothing a phone could not —
so a mobile app is a new front end over the same API rather than new backend
work.

## What it will talk to

`grail-market-backend`, over plain HTTP/JSON. No SDK, no auth today.

```
POST /scans                     multipart: front (required), back (optional)
                                -> the identification, the grading label, and
                                   the valuation, in one response

GET  /market/search?q=          search by name, or by a card code like OP13-119
GET  /market/price?name=&number=&grader=&grade=
                                price a card found by search
GET  /market/listings?name=&number=&grader=&grade=
                                live listings for a card
GET  /market/fx                 currency rates, USD base
```

`POST /scans` takes 10–30 seconds: it reads the card, resolves it against
several catalogues, and prices it. Design the capture screen around that — the
web client shows the pipeline stage as it goes rather than a spinner.

## Worth knowing before building the camera screen

Identification lives or dies on the photograph. The two failures that have cost
the most are a collector number too small to read, and a grading label cropped
out of frame. Both are capture problems, and a phone is the one place they can
actually be fixed — guide the frame, hold for focus, and check sharpness before
uploading rather than after.

Do not downscale before upload. Shrinking to 2000px once lost a collector
number and mispriced a card by thirty times.

## Running it

```
npm install
npx expo start          # then i / a, or scan with Expo Go
npx expo start --web    # quickest way to eyeball a screen
```

Identity verification (Didit) and the camera both need native modules, so
those screens need a **dev build** — `npx expo run:ios` / `run:android`, or
EAS. Expo Go will not run them, and from SDK 52 Expo Go cannot render the
native splash faithfully either.

## Brand

`theme/` is the only place a colour or a type size is named. `assets/source/`
holds the artwork as supplied; `assets/brand/` holds what the app actually
uses.

Two colour directions came with the assets and they disagree — Navy + Gold
(brand sheet, app icon, splash, all 44 wireframes) and "Harbour" (pale marine,
direction 2 of 5, marked *for review*). Navy is built. If Harbour wins,
`theme/colors.ts` is the only file that changes.

The wordmark is set as text in Poppins SemiBold — the brand sheet's own logo
face — rather than shipped as an image. The supplied artwork is JPEG on a light
ground, and keying it to transparency left halos on every stroke.

## Phone verification (Firebase)

The SMS code is Firebase Phone Auth, behind `lib/phoneauth.ts`. Screens only
see `sendCode` / `confirmCode` and a handful of plain-English errors, so
swapping to Twilio Verify later is one file.

**It cannot run in Expo Go** — the native module does not exist there, and
`sendCode` returns `unavailable` rather than crashing. You need a dev build:

```
npx expo run:ios      # or run:android
```

### What has to exist before it works

1. A Firebase project with **Phone** enabled under Authentication → Sign-in method.
2. `GoogleService-Info.plist` (iOS) and `google-services.json` (Android) in the
   repo root. Both are already referenced from `app.json`. **Neither is in git** —
   see `.gitignore`.
3. **Android:** the SHA-1 of every signing key registered in Firebase — your
   debug keystore *and* the Play App Signing key. Miss the second and it works
   in development and fails in production.
4. **iOS:** an APNs key uploaded to Firebase. Without it, verification falls
   back to a reCAPTCHA web view instead of a silent push, which works but is
   an extra screen the user did not ask for.
5. Add test numbers under Authentication → Phone numbers for testing, so
   development does not burn real messages.

### Before launch

Australia's **SMS Sender ID Register** became mandatory on 1 July 2026.
Unregistered alphanumeric sender IDs are delivered labelled `Unverified`.
Register through an ACMA-approved provider, or accept a plain long number.
