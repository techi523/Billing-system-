# Regression Prevention Guide

## Critical Build System Safeguards

### 1. CSS Entry Point Validation
**Rule**: Exactly ONE CSS entry file must exist with Tailwind directives.

**File**: `src/index.css`
**Required Content**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Validation Script** (add to package.json):
```json
{
  "scripts": {
    "validate:css": "node scripts/validate-css.js"
  }
}
```

### 2. PostCSS Configuration
**File**: `postcss.config.js`
**Required Content**:
```javascript
export default {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
    },
}
```

### 3. Package Dependencies
**Required Dependencies**:
- `tailwindcss`
- `autoprefixer`
- `postcss`

**Forbidden Dependencies**:
- `@tailwindcss/postcss` (does not exist)

### 4. Build Verification Checklist
Before deploying, verify:

- [ ] CSS file size > 10KB
- [ ] Contains `@tailwind` directives in source
- [ ] Contains utility classes in compiled output
- [ ] No PostCSS import errors
- [ ] All components render with styles

### 5. Automated Checks
Add to CI/CD pipeline:
```bash
# Check CSS size
if [ $(wc -c < dist/assets/index-*.css) -lt 10000 ]; then
  echo "ERROR: CSS too small - Tailwind may not be working"
  exit 1
fi

# Check for Tailwind utilities
if ! grep -q "bg-sky-500" dist/assets/index-*.css; then
  echo "ERROR: Tailwind utilities not found"
  exit 1
fi
```

### 6. Development Workflow
1. Always import CSS in `src/main.tsx`
2. Never modify compiled CSS directly
3. Use Tailwind classes, not custom CSS
4. Test responsive behavior on multiple screen sizes

### 7. Emergency Recovery
If Tailwind fails again:
1. Check `src/index.css` has `@tailwind` directives
2. Verify `postcss.config.js` uses `tailwindcss` (not `@tailwindcss/postcss`)
3. Remove `@tailwindcss/postcss` from dependencies if present
4. Rebuild with `npm run build`
5. Verify CSS file size > 10KB

## Root Cause Summary
**Original Failure**: CSS entry file lacked `@tailwind` directives, causing empty Tailwind output.
**Fix Applied**: Added proper Tailwind directives to `src/index.css`.
**Prevention**: Automated validation and documentation to prevent recurrence.
