# Deploying — private, with one collaborator

Everything below is one-time setup. After it, shipping a change is `git push`.

## Don't pay for GitHub Pro for this

GitHub Pro ($4/mo) lets you *publish* Pages from a private repo, but **the published site is still
public to anyone with the URL.** Restricting who can view a Pages site requires GitHub Enterprise
Cloud, not Pro. From GitHub's docs:

> "To publish a GitHub Pages site privately, your organization must use GitHub Enterprise Cloud."

The route below is free *and* actually private. Paying would buy strictly less.

| | Private repo | Private *site* | Cost |
|---|---|---|---|
| GitHub free + Pages | yes | **no — site is public** | $0 |
| GitHub Pro + Pages | yes | **no — site is public** | $4/mo |
| GitHub free + Cloudflare Pages + Access | yes | **yes — login gated** | $0 |

---

## Phase 1 — Private GitHub repo

1. Sign in at https://github.com (create an account if needed).
2. Go to https://github.com/new.
3. **Repository name:** `BartendersLedger`
4. **Visibility:** **Private** ← the important one.
5. Leave *every* initialise checkbox **unticked** — no README, no .gitignore, no licence. This repo
   already has all three, and ticking them creates a conflicting first commit you'd have to merge.
6. **Create repository.** You'll land on an empty-repo page showing setup commands. Ignore them; use ours.

## Phase 2 — Push

From `C:\Users\zpull\BartendersLedger`, with your real username:

```bash
git remote add origin https://github.com/YOUR-USERNAME/BartendersLedger.git
```

```bash
git push -u origin main
```

A browser window opens for GitHub sign-in (Git Credential Manager is already installed and
configured — no `gh` CLI, no personal access token). Authorise it once; it's remembered after that.

Expect ~2 MB to upload. Refresh the GitHub page and you should see 34 files.

## Phase 3 — Invite your collaborator

Repo → **Settings** → **Collaborators** → **Add people** → their GitHub username or email.

Private repos have unlimited free collaborators. They'll get an email invite; once accepted they can
clone, push, and open pull requests. Point them at [README.md](README.md) and [CLAUDE.md](CLAUDE.md).

## Phase 4 — Cloudflare Pages

1. Sign up at https://dash.cloudflare.com (free, no card for this).
2. **Compute (Workers & Pages)** in the sidebar → **Create** → **Pages** tab → **Connect to Git**.
   (Cloudflare renames this section periodically; look for Workers & Pages.)
3. Authorise Cloudflare's GitHub app. Choose **Only select repositories** and pick
   `BartendersLedger` — don't grant access to everything.
4. Select the repo → **Begin setup**.
5. **Build settings — the defaults are wrong for this project:**
   - **Framework preset:** `None`
   - **Build command:** **completely empty** (delete anything prefilled)
   - **Build output directory:** `/`

   There is no build step. If you let Cloudflare guess, it runs a build that doesn't exist and fails.
6. **Save and Deploy.** It takes under a minute and gives you
   `https://bartendersledger.pages.dev` (or similar) on HTTPS.

Every push to `main` now redeploys automatically.

## Phase 5 — Lock it to the two of you

Without this, anyone with the URL can read the whole app. Cloudflare Zero Trust's free tier covers
small teams (you'll see the plan and its user allowance during setup — it is generous and this
use is two people).

1. Dashboard → **Zero Trust** → complete the one-time team-name setup if prompted.
2. **Access** → **Applications** → **Add an application** → **Self-hosted**.
3. **Application domain:** your `bartendersledger.pages.dev` host.
4. Add a policy:
   - **Action:** `Allow`
   - **Include** → selector **Emails** → your address, and your collaborator's.

   > ⚠️ **Do not** build the Include rule from *Login Methods → One-time PIN*. That reads as "anyone
   > with any email that can receive a PIN," which is the whole internet. Cloudflare's own docs flag
   > this as the classic misconfiguration. The Include rule must list the **specific email addresses**.
   > One-time PIN is fine as the *authentication method*; it must not be the *inclusion rule*.
5. Save. Visit the URL in a private window — you should get a login wall, not the app.

**Do this before installing on a phone**, so there's never a window where the URL is open.

## Phase 6 — Install on your phone

1. Open the URL in Safari (iOS) or Chrome (Android).
2. Sign in at the Access gate — enter your email, get a one-time code, paste it. The session persists.
3. **iOS:** Share → *Add to Home Screen*. **Android:** the install prompt, or menu → *Install app*.
4. Launch from the home screen. It runs standalone and fully offline after the first load.

## Shipping a change

1. Edit files.
2. Bump `?v=N` on the changed assets in `index.html` **and** bump `CACHE` in `sw.js`
   (currently `ledger-v6`).
3. `git push`

Installed copies show the *"A new edition is pressed"* toast and update when tapped. **Skipping
step 2 means nobody ever sees the change** — that version string is the entire update mechanism.

## Going public later

- Delete `robots.txt` and the `noindex` meta in `index.html` (both are commented as such).
- Remove the Cloudflare Access policy.
- Revisit [COPYRIGHT.md](COPYRIGHT.md) — currently all-rights-reserved, correct for a commercial
  plan, but it means nobody may reuse the work.

## If something breaks

| Symptom | Cause |
|---|---|
| Cloudflare build fails | A build command is set. It must be empty, output `/`. |
| Site loads but is blank | Check the deploy log for a 404 on `js/data-core.js` — output dir should be `/`, not `dist`. |
| Push rejected, "fetch first" | You ticked an initialise box in Phase 1. `git pull --rebase origin main` then push. |
| Changes don't appear on phone | You skipped the `?v=` / `CACHE` bump. |
| Everyone can see the app | Your Access Include rule is a login method, not an email list. See Phase 5. |
