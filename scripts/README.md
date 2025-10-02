# Language Validation Scripts

This directory contains validation scripts for the language configuration system.

## Scripts

### `validate-languages.cjs`
Basic validation script that checks:
- Language directory structure
- Required JSON files (index.json, module files)
- Basic configuration completeness
- Language rules configuration

**Usage:**
```bash
node scripts/validate-languages.cjs
```

### `comprehensive-validation.cjs`
Comprehensive validation script that performs in-depth testing:
- Language metadata validation
- Module content verification
- Language rules testing
- Sample word verification
- Configuration integration testing

**Usage:**
```bash
node scripts/comprehensive-validation.cjs
```

## When to Use

- **During development**: Use these scripts to verify language configurations
- **Before deployment**: Run comprehensive validation to ensure all languages work
- **Adding new languages**: Use to verify new language setups
- **CI/CD**: Include in automated testing pipelines

## Adding to CI/CD

Add to your package.json scripts:
```json
{
  "scripts": {
    "validate:languages": "node scripts/validate-languages.cjs",
    "validate:comprehensive": "node scripts/comprehensive-validation.cjs"
  }
}
```

## Requirements

- Node.js (CommonJS compatible)
- Access to src/data and src/config directories
- Read access to language configuration files