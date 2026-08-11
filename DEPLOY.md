# Deploying — private, with one collaborator

The repo is committed and ready. Everything below is a one-time setup; after that, deploying is
`git push`.

Two accounts are involved and **both auth steps are yours** — no credentials are stored in this repo.

---

## 1. Private GitHub repo (free, unlimited collaborators)

Create an **empty private repo** at https://github.com/new — name it `BartendersLedger`, set
**Private**, and do *not* add a README, .gitignore or licence (this repo already has them).

Then, from `C:\Users\zpull\BartendersLedger`:

```bash
git remote add origin https://github.com/YOUR-USERNAME/BartendersLedger.git
```

```bash
git push -u origin main
```

Git Credential Manager is already installed and configured, so that push opens a browser window to
sign in to GitHub. No `gh` CLI or personal access token needed.

**Invite your collaborator:** repo → Settings → Collaborators → Add people. They get full read/write
on a private repo at no cost to either of you.

---

## 2. Cloudflare Pages for the hosted app (free)

GitHub Pages will *not* serve a private repo without a paid plan. Cloudflare Pages will.

1. Sign up at https://dash.cloudflare.com (free).
2. **Workers & Pages → Create → Pages → Connect to Git**, authorise GitHub, pick `BartendersLedger`.
3. Build settings — this matters, and the defaults are wrong for a no-build project:
   - **Framework preset:** `None`
   - **Build command:** *leave completely empty*
   - **Build output directory:** `/`
4. Deploy. You get `https://bartendersledger.pages.dev` (or similar) over HTTPS.

Every `git push` to `main` redeploys automatically.

### Lock it to just the two of you

Cloudflare Access is free for up to 50 users and puts a login in front of the whole site:

**Zero Trust → Access → Applications → Add an application → Self-hosted**, point it at your
`.pages.dev` domain, and add a policy of type *Allow* with **Emails** → your address and your
collaborator's. Anyone else gets a login wall instead of the app.

> Do this **before** you install it on a phone. Once Access is on, the install still works — you
> sign in once and the session persists.

---

## 3. Install on your phone

Open the URL in mobile Safari or Chrome, sign in through the Access gate, then **Share → Add to Home
Screen** (iOS) or the install prompt (Android). It runs standalone and fully offline after first load.

---

## Shipping a change after this

1. Edit files.
2. Bump `?v=N` on the changed assets in `index.html` **and** bump `CACHE` in `sw.js` (currently `ledger-v6`).
3. `git push`.

Installed copies show the *"A new edition is pressed"* toast and update when tapped. Skipping step 2
means nobody ever sees the change — that version string is the entire update mechanism.

---

## When you're ready to go public

- Delete `robots.txt` and the `noindex` meta in `index.html` (both are commented as such).
- Revisit [COPYRIGHT.md](COPYRIGHT.md) — it is currently all-rights-reserved, which is the right
  posture for a commercial plan but means nobody may reuse the work.
- Remove the Cloudflare Access policy.
