# Rheum Revise — Rheumatology SCE question bank

A self-contained revision app built from your `Rheumatology_SCE_BOF.pdf`: **455 questions**,
auto-sorted into 15 disease/topic categories, with three ways to study plus a flagged/missed
review queue. No account, no server — everything runs in the browser and your progress is
saved on your own device.

## What's inside

| File | Purpose |
|---|---|
| `index.html` | App shell and screen templates |
| `style.css` | Visual design (light + dark, calm teal/pine palette) |
| `app.js` | All app logic — quiz engine, scoring, progress storage |
| `data.js` | The 455 questions, options, answers and explanations, extracted from your PDF |
| `manifest.json` | Makes the app installable on Android/iOS/desktop |
| `sw.js` | Service worker — caches everything so it works fully offline after first load |
| `icons/` | App icons |

Study modes:
- **Random practice** — one question at a time from the full bank, instant feedback.
- **Mock exam** — pick 25/50/100 questions, optionally timed at the real SCE pace
  (≈1.8 min/question), answers revealed only at the end with a per-category score.
- **By disease/category** — pick one or more of the 15 categories (Rheumatoid Arthritis,
  SLE & Lupus, Vasculitis, Spondyloarthritis & AS, Crystal Arthropathy, Connective Tissue
  Disease, Psoriatic Arthritis, Metabolic Bone Disease, Infection & Immunosuppression,
  Pregnancy & Reproductive, Paediatric Rheumatology, Osteoarthritis & Mechanical,
  Investigations & Imaging, Drug Monitoring & Safety, General Rheumatology) and drill just those.
- **Review flagged & missed** — anything you've starred or got wrong, resurfaced for re-testing.

The home screen always shows a **Resume** band if you left a session partway through, so you
pick up exactly where you stopped — on that same device/browser.

## 1. Put it on GitHub

1. Go to [github.com/new](https://github.com/new), create a repository (e.g. `rheum-revise`),
   public, no README/license (you already have one).
2. On the new repo's page, choose **"uploading an existing file"**, then drag in every file
   and the `icons/` folder from this package, keeping them at the repository root (not inside
   a subfolder). Commit.
3. Go to **Settings → Pages**. Under "Build and deployment", set **Source: Deploy from a
   branch**, branch **main**, folder **/ (root)**. Save.
4. After a minute, GitHub shows your live URL — something like
   `https://yourusername.github.io/rheum-revise/`. Open it.

(If you'd rather use git locally: `git init`, `git add .`, `git commit -m "Rheum Revise"`,
add your GitHub remote, `git push`, then do step 3.)

## 2. Install it as an Android app

Open your GitHub Pages URL in **Chrome on Android**:
- Tap the **⋮** menu → **"Add to Home screen"** / **"Install app"**.
- It installs with its own icon and opens full-screen, like a native app — no address bar.
- After the first load it keeps working **offline** (the service worker caches everything,
  including all 455 questions).

This is a Progressive Web App (PWA): it behaves like an Android app without needing the Play
Store, and there's nothing to approve or review.

### If you want an actual installable `.apk`

Use **[PWABuilder](https://www.pwabuilder.com)** (free, made by Microsoft, no coding needed):
1. Paste your GitHub Pages URL in.
2. Click **Package for stores → Android**.
3. Download the generated `.apk`/`.aab`. You can sideload the `.apk` directly on a phone, or
   submit the `.aab` to the Play Store if you want it listed there.

## Notes on your progress data

- Progress (what you've answered, right/wrong, flags) lives in your browser's local storage
  on that device only — there's no account and nothing is sent anywhere. Reset is available
  from the home screen ("Reset all progress").
- Because this is a fresh build, there's no prior progress to import — from this point on,
  the app itself tracks and resumes your sessions.
- Clearing your browser's site data, or switching to a different phone/browser, starts you
  fresh. If you want progress that syncs across devices later, that needs a small backend —
  say so and I can add it.

## Updating the question bank later

If you ever want to add questions or fix one: edit `data.js` (same format as the existing
entries), then bump `CACHE_NAME` in `sw.js` (e.g. `v1` → `v2`) so installed copies pick up the
change, and push again.
