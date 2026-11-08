# 🚀 LevelUp Deployment Guide

Your LevelUp PWA is ready for deployment! 

## Pull request quality gate

`.github/workflows/quality-gate.yml` runs on every pull request (including forks),
push to `main`, and merge-queue group. There are no path filters or secrets.
The stable job name is **Quality gate**. It runs `npm ci`, app/API type-checks,
lint-policy tests, the ESLint regression check, Jest and the Vite build on Node 22.
An unsuccessful step fails the job; no check uses `continue-on-error`.

Run the same checks locally with Node 22 and npm 10:

```bash
npm ci --no-audit --no-fund
npm run type-check
npm run type-check:api
npm run test:quality-gate
npm run lint:ci
npm test -- --ci --runInBand
npm run build
```

`tsconfig.api.json` extends the existing strict app options, uses Node types and
NodeNext resolution, and explicitly includes `api/**/*.ts`. The app configuration
still covers `src`; no runtime or storage behavior is changed. These checks verify
types, not serverless deployment or API behavior. They do not newly lint the API,
public scripts or configuration files excluded by the existing ESLint setup.

### Lint debt policy

The initial baseline has **582 warnings, zero errors** (November 2026).
`npm run lint` retains its existing 50-warning ceiling and therefore still fails
until that debt is reduced. CI instead uses `npm run lint:ci` with exactly the
same ESLint rules, ignored files and source scope. It prints every existing
warning and the debt/regression totals, without raising that ceiling or
disabling rules.

`scripts/lint-baseline.json` records counts keyed by file, rule, message and
trimmed diagnostic source line. Line-number shifts and indentation do not
invalidate old allowances. A new file, rule, diagnostic text, source line or
extra occurrence fails, even if unrelated old warnings were removed.
Identical source-line diagnostics within the same file share a count; this is
not an AST-level identity check. All errors and parser failures always fail.
The policy tests cover these matching and failure behaviors.

After fixing warnings, run `npm run lint:baseline:prune` and commit the
reductions with the fixes. Pruning first checks for regressions and cannot add
allowances. Once pruned, reintroducing the removed warning fails. Until pruning,
an old recorded warning can return within its original allowance, so include
pruning in debt-reduction PRs. Review baseline and workflow changes as policy
changes: do not manually enlarge the snapshot to pass a PR. Configuration and
dependency changes need explicit review too; no in-repository workflow can
prevent an authorized maintainer from changing its policy.

Formatting is **explicitly deferred**, not ignored accidentally:
`npm run format:check` currently fails on 29 files. It is not a required step
until maintainers repair that baseline in a separate formatting-only change.
Format new/modified files using the existing Prettier configuration; do not
mass-format unrelated application files in this gate change.
ESLint dependency/config modernization and runtime policy remain separate
maintenance work. Refresh the snapshot only through reviewed debt reductions
or an explicitly reviewed policy migration, never automatically in CI.

### Owner action: require the check

No repository settings were changed, and this workflow alone does **not**
guarantee that merging is blocked. Once a real PR has completed the workflow,
a repository owner must configure a branch ruleset or branch protection for
`main`, require the **Quality gate** check from GitHub Actions, and choose the
appropriate bypass and up-to-date/merge-queue policy. Select the check shown
in the live PR UI rather than assuming its external status-context spelling.
External CI and existing protection settings have not been exhaustively audited.

Verify enforcement in a disposable PR: introduce a failing Jest assertion or
a TypeScript error, confirm the check is red and merging is blocked without
bypass, then remove the failure and confirm the new run passes. A new
`console.log` in a linted source file must also fail `lint:ci`. Check API
coverage with a type error in an `api/*.ts` file. These negative checks can be
run locally before owner configuration, but merge blocking requires the live
repository test. If the check is missing, first check Actions permissions and
fork-workflow approval, then rerun the PR workflow; do not remove the required
check to work around a code failure. Recover by fixing/reverting the regression.
For workflow outages, any temporary bypass is an explicit owner decision and
must be removed after recovery.

The workflow uses only `contents: read` and does not retain checkout credentials
or use `pull_request_target`. Checkout v7.0.1 and setup-node v7.1.0 are pinned to
full upstream commit SHAs and use Node 24 internally on the hosted runner.
Review upstream releases before updating those pins.
The Node 22 major tracks supported patch updates; no dependency upgrades or
repository runtime configuration changes are part of this gate.
Npm's cache stores downloads, not `node_modules`, so each run installs from the
lockfile. Concurrency cancels superseded runs and a 15-minute timeout bounds
runner use; logs show step durations for monitoring.

## 📋 Pre-Deployment Checklist

### ✅ **Ready to Deploy**
- [x] PWA manifest.json configured
- [x] Service Worker implemented
- [x] All icons generated (16x16 to 512x512)
- [x] Environment variables set (.env for VAPID keys)
- [x] Build process working (`npm run build`)
- [x] Production-ready code (no debug components)

## 🌟 **Recommended: Vercel** 

**Perfect for React/Vite apps with zero configuration**

### **One-Click Deploy**
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Import Project"
4. Select your LevelUp repository
5. Add environment variable: `VITE_VAPID_PUBLIC_KEY=BI8OflKtDyI1am3VQ-pZa2qLBiUnXLAoYzkkq233ylHP3U4EC-N7reTeyzj9d2XPAOcGYsANPMfW5C5Gms5C_T0`
6. Click "Deploy"

**Your app will be live at**: `https://your-app-name.vercel.app`

### **Why Vercel?**
- ✅ **Zero configuration** for Vite/React
- ✅ **Automatic deployments** on git push
- ✅ **Global CDN** included
- ✅ **Free HTTPS** and custom domains
- ✅ **Perfect PWA support**
- ✅ **Generous free tier**

## 🔧 **Environment Variables**

Add this to your deployment platform:

```bash
# Public VAPID key for push notifications
VITE_VAPID_PUBLIC_KEY=BI8OflKtDyI1am3VQ-pZa2qLBiUnXLAoYzkkq233ylHP3U4EC-N7reTeyzj9d2XPAOcGYsANPMfW5C5Gms5C_T0
```

## 📱 **Production Cache Management**

### **For Production Deployments:**
Use the normal build command for production and preview deployments. This is
already the command in `vercel.json`; no deployment-setting change is required:

```bash
npm run build
```

Vite versions only `dist/sw.js`, after writing application output. A SHA-256
identifier covers the worker template and every other emitted file's relative
name and bytes, including copied public files. Identical output produces the
same identifier; changed output produces a different one, even without `.git`
metadata or when environment variables change the generated application.
There is no timestamp or commit-history dependency. Failed or interrupted builds
never mutate `public/sw.js`; only deploy a successfully completed output.
`npm run build:production` remains a compatibility alias for this same path.

### **Cache Versioning System:**
- **Development server**: The unbuilt worker uses timestamps for cache busting.
- **Built output**, including localhost previews: Uses version + content hash.
- **Offline shell**: Installation precaches HTML, the manifest, and all emitted
  JavaScript/CSS (including lazy chunks). This adds one download per emitted asset
  at install; an unavailable asset prevents the new worker from installing.
- **Activation**: Retains the existing immediate activation/update notification
  behavior and deletes outdated LevelUp caches, retaining unrelated caches.
  Offline SPA navigation falls back to the precached index in the current cache.

### **Verify Release Versioning**

Run `npm run test:sw` for fixture builds, failed-build/source-integrity checks,
and real Chromium install/update/cache cleanup/offline navigation coverage.
Offline phases reject fixture-server connections as well as emulating page
offline conditions, so worker fetches cannot silently use the network. Negative
controls remove the shell and a lazy chunk and verify that offline loading fails.
The browser test uses `CHROME_BIN` or a system Chrome/Chromium executable; it
reports a skip when none is installed. Use Node 22.12+ for this build/browser suite. The fixture
builds do not need git metadata and verify that identical bytes retain the ID,
while JavaScript, public assets, and worker changes invalidate it.

A maintainer must still verify a hosted Vercel preview: confirm its build log
runs `npm run build`, fetch `/sw.js` and check that `RELEASE_ID` is a SHA-256 value
with no template markers, then compare two changed previews. The repository
configuration uses this path, but dashboard overrides, preview access controls,
CDN behavior, and the actual hosted output cannot be inferred from local tests.
Project/dashboard build settings remain owner-controlled and are not changed here.

### **Troubleshooting Cache Issues:**
If users report not seeing latest changes:
1. Check service worker version in browser DevTools
2. Force refresh with Ctrl+Shift+R (desktop)  
3. Clear application data in browser settings (mobile)
4. Update notification should appear automatically on next visit

## 🎯 **Post-Deployment Testing**

### **Test PWA Features**
- [ ] App installation works
- [ ] Offline functionality
- [ ] Push notifications (with permission)
- [ ] Service Worker caching
- [ ] Responsive design on mobile

### **Test Language Learning**
- [ ] Language selection works
- [ ] Word practice sessions
- [ ] Progress tracking
- [ ] Module navigation
- [ ] User profile and XP

## � **Quick Start Commands**

```bash
# Ensure everything is committed
git add .
git commit -m "Ready for deployment"
git push origin main

# Test build locally
npm run build
npm run preview

# Deploy to Vercel (after connecting GitHub)
# Just push to main branch - auto-deploys!
```

## 📱 **Expected Features After Deployment**

✅ **PWA Installation**: Users can install your app on desktop/mobile  
✅ **Offline Mode**: Works without internet connection  
✅ **Push Notifications**: Smart permission handling  
✅ **Responsive Design**: Works perfectly on all devices  
✅ **Fast Loading**: Optimized build with Service Worker caching  
✅ **Green Rocket Icon**: Your custom branding everywhere  

## 🔮 **Future Backend (Optional)**

When you're ready to add user accounts and cloud sync, see [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) for adding Supabase integration.

Your language learning app will be accessible worldwide! 🌍