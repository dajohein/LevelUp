# 📦 Dependency Update Plan - February 2026

## 🔍 Current Status

**Last Security Audit:** February 2, 2026

- ✅ **7 vulnerabilities fixed** with `npm audit fix`
- ⚠️ **8 remaining vulnerabilities** (require breaking changes)
- 📊 **17 packages with updates available**

---

## 🚨 Phase 1: Security Fixes (COMPLETED ✅)

Applied automatic non-breaking security fixes:

```bash
npm audit fix
```

**Resolved:**

- react-router-dom XSS vulnerability (via dependency updates)
- qs DoS vulnerability
- tar file overwrite vulnerabilities
- diff DoS vulnerability
- esbuild development server issues

---

## ⚠️ Phase 2: Breaking Security Updates (REQUIRES TESTING)

### 2.1 ESLint Ecosystem Upgrade

**Current Vulnerability:** Stack overflow with circular references in ESLint 8

**Required Changes:**

```json
{
  "devDependencies": {
    "eslint": "^9.39.2", // v8.57.1 → v9.39.2
    "@typescript-eslint/eslint-plugin": "^8.54.0", // v5.62.0 → v8.54.0
    "@typescript-eslint/parser": "^8.54.0" // v5.62.0 → v8.54.0
  }
}
```

**Breaking Changes:**

- ESLint 9 uses new flat config format (`eslint.config.js`)
- Must migrate from `.eslintrc` style configuration
- Some plugin APIs changed

**Migration Steps:**

1. Review [ESLint v9 Migration Guide](https://eslint.org/docs/latest/use/migrate-to-9.0.0)
2. Create `eslint.config.js` using flat config
3. Update all plugin configurations
4. Test linting across entire codebase
5. Update CI/CD pipelines if applicable

**Risk:** Medium - Linting config changes may reveal new issues

---

### 2.2 Vercel Node Runtime Update

**Current Vulnerability:** Depends on vulnerable undici and path-to-regexp

**Required Changes:**

```json
{
  "devDependencies": {
    "@vercel/node": "^5.5.28" // v5.5.15 → v5.5.28 (or consider removing)
  }
}
```

**Note:** Check if you actually use `@vercel/node` in development. If only for production deployment on Vercel, you may not need it as a dev dependency.

**Risk:** Low - Primarily affects serverless function runtime

---

## 🎯 Phase 3: React 19 Ecosystem Migration (OPTIONAL - MAJOR BREAKING)

### Why Consider This?

**Pros:**

- Latest features (Actions, useOptimistic, use() hook)
- Performance improvements
- Better TypeScript support
- Security updates

**Cons:**

- **Major breaking changes** across ecosystem
- Significant testing required
- Potential third-party library incompatibilities
- Time investment for migration

### 3.1 React Core Update

```json
{
  "dependencies": {
    "react": "^19.2.4", // v18.3.1 → v19.2.4
    "react-dom": "^19.2.4" // v18.3.1 → v19.2.4
  },
  "devDependencies": {
    "@types/react": "^19.2.10", // v18.3.26 → v19.2.10
    "@types/react-dom": "^19.2.3" // v18.3.7 → v19.2.3
  }
}
```

**Breaking Changes:**

- `React.FC` children no longer implicit (already good practice to declare)
- Some deprecated APIs removed
- Stricter TypeScript types
- New concurrent rendering behaviors

**Migration Checklist:**

- [ ] Remove implicit `children` props from `React.FC` components
- [ ] Update to new TypeScript types for refs
- [ ] Test all components for rendering issues
- [ ] Review [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)

### 3.2 React Router Update

```json
{
  "dependencies": {
    "react-router-dom": "^7.13.0" // v6.30.2 → v7.13.0
  }
}
```

**Breaking Changes:**

- New data loading patterns
- Updated route configuration API
- Changes to navigation hooks

**Risk:** High - Routing is critical infrastructure

### 3.3 Redux Ecosystem Update

```json
{
  "dependencies": {
    "@reduxjs/toolkit": "^2.11.2", // v1.9.7 → v2.11.2
    "react-redux": "^9.2.0" // v8.1.3 → v9.2.0
  }
}
```

**Breaking Changes:**

- RTK 2.0 requires TypeScript 4.7+
- New listener middleware API
- react-redux 9.0 requires React 18+

**Current Status:** ✅ You have TypeScript 5.0.4, so compatible

---

## ✅ Phase 4: Safe Minor/Patch Updates (RECOMMENDED)

These updates have no breaking changes and should be safe:

```bash
npm update vite @vitejs/plugin-react prettier \
  @testing-library/react cors @vercel/analytics \
  @vercel/speed-insights
```

**Updates:**

- `vite`: 7.2.6 → 7.3.1
- `prettier`: 3.7.4 → 3.8.1
- `@vitejs/plugin-react`: 5.1.1 → 5.1.2
- `@testing-library/react`: 16.3.0 → 16.3.2
- `cors`: 2.8.5 → 2.8.6

**Risk:** Very Low - Patch/minor versions

---

## 🔧 Phase 5: TypeScript Update (RECOMMENDED)

```json
{
  "devDependencies": {
    "typescript": "^5.9.3" // v5.0.4 → v5.9.3
  }
}
```

**Benefits:**

- Better type inference
- Performance improvements
- Bug fixes
- New language features

**Risk:** Low - TypeScript is backward compatible for minor versions

---

## 📋 Recommended Implementation Order

### **Immediate (This Week)**

1. ✅ **DONE:** Applied `npm audit fix`
2. **Apply safe updates:**
   ```bash
   npm update vite @vitejs/plugin-react prettier \
     @testing-library/react cors typescript
   ```
3. **Test thoroughly** - Run full test suite
4. **Commit changes**

### **Near Term (Next 2 Weeks)**

5. **Migrate to ESLint 9** (fixes security vulnerability)
   - Create `eslint.config.js`
   - Test linting
   - Update CI/CD
6. **Run `npm audit` again** to verify security status

### **Future Consideration (Next Quarter)**

7. **Evaluate React 19 migration**
   - Create feature branch
   - Update React core
   - Update ecosystem (Router, Redux)
   - Extensive testing
   - Gradual rollout

---

## 🐳 DevContainer Updates

### Current Status: ✅ EXCELLENT

Your devcontainer is using:

- **Node.js 22.21.1** (Latest LTS) ✅
- **npm 10.9.4** ✅
- Modern base image ✅
- Proper VSCode extensions ✅

### Minor Documentation Fix Needed

**File:** `.devcontainer/README.md` line 22

```markdown
# Current (Incorrect):

- **Ubuntu 24.04** (Bookworm)

# Should be:

- **Debian 12** (Bookworm)
```

Bookworm is Debian 12, not Ubuntu. The image `mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm` is Debian-based.

---

## 🎯 Quick Start Commands

### Apply Safe Updates Now

```bash
# Safe minor/patch updates
npm update vite @vitejs/plugin-react prettier \
  @testing-library/react cors typescript

# Run tests
npm test

# Check for type errors
npm run type-check

# Verify build
npm run build
```

### Check Security Status

```bash
npm audit
npm outdated
```

### ESLint 9 Migration (When Ready)

```bash
# Install new versions
npm install -D eslint@^9.39.2 \
  @typescript-eslint/eslint-plugin@^8.54.0 \
  @typescript-eslint/parser@^8.54.0

# Create new config (migration required)
npx @eslint/migrate-config .eslintrc.json

# Test
npm run lint
```

---

## 📊 Risk Assessment Matrix

| Update         | Risk        | Impact         | Priority | Timeline     |
| -------------- | ----------- | -------------- | -------- | ------------ |
| npm audit fix  | ✅ None     | Security       | Critical | ✅ Done      |
| Safe patches   | 🟢 Very Low | Features/Bugs  | High     | This week    |
| TypeScript 5.9 | 🟢 Low      | DX/Performance | High     | This week    |
| ESLint 9       | 🟡 Medium   | Security       | High     | 2 weeks      |
| React 19       | 🔴 High     | Features       | Medium   | Next quarter |
| React Router 7 | 🔴 High     | Features       | Low      | Next quarter |

---

## 🧪 Testing Checklist

Before deploying any updates to production:

- [ ] **Unit Tests:** `npm test`
- [ ] **Type Check:** `npm run type-check`
- [ ] **Linting:** `npm run lint`
- [ ] **Build:** `npm run build`
- [ ] **Manual Testing:**
  - [ ] Language selection works
  - [ ] Word progress saves correctly
  - [ ] Storage system functions (localStorage, IndexedDB)
  - [ ] Navigation between pages
  - [ ] All game modes function
  - [ ] Settings persist
  - [ ] Mobile responsive
- [ ] **Performance:** Check bundle size hasn't increased significantly
- [ ] **Browser Testing:** Chrome, Firefox, Safari, Mobile

---

## 📚 Resources

- [ESLint v9 Migration Guide](https://eslint.org/docs/latest/use/migrate-to-9.0.0)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [TypeScript 5.x Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/overview.html)
- [React Router v7 Docs](https://reactrouter.com/en/main/upgrading/v6-to-v7)
- [npm audit documentation](https://docs.npmjs.com/cli/v9/commands/npm-audit)

---

**Last Updated:** February 2, 2026
**Next Review:** March 2026 (or when new vulnerabilities are reported)
