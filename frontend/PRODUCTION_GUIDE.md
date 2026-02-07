# Frontend Production Guide

## Overview

The frontend is built with **React 19 + Vite + TailwindCSS 4** and includes comprehensive features for tenant management, analytics, and user interfaces.

---

## Frontend Stack

### Core Technologies
- **React**: 19.2.0
- **React Router**: 7.12.0 (for routing)
- **Vite**: 7.2.4 (build tool)
- **TypeScript**: 5.9.3
- **TailwindCSS**: 4.1.18 (styling)

### UI Libraries
- **Framer Motion**: 12.26.2 (animations)
- **Lucide React**: 0.562.0 (icons)
- **Axios**: 1.13.2 (HTTP client)

---

## Production Build

### Build Commands

```bash
# Install dependencies
npm install

# Type check
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### Build Output
- **Directory**: `frontend/dist/`
- **Assets**: Optimized and minified
- **Code Splitting**: Automatic via Vite

---

## Frontend Features Audit

### ✅ Core Components (58 files)

**Admin Dashboard**:
- `components/Admin/Dashboard.tsx`
- `components/Admin/DashboardTest.tsx`
- `components/Modern/AdminDashboard.tsx`

**Authentication**:
- `components/Modern/Login.tsx`
- `components/ProtectedRoute.tsx`
- `context/AuthContext.tsx`

**Theming**:
- `components/Common/ThemeToggle.tsx`
- `context/ThemeContext.tsx`

**Support Features**:
- `components/Common/SupportButton.tsx`
- `components/Common/SupportFooter.tsx`
- `components/Common/SupportSection.tsx`
- `context/SupportContext.tsx`

**Navigation**:
- `components/Common/BackButton.tsx`
- `components/PageTransition.tsx`

**Business Features**:
- `components/Packages/PackagePlans.tsx`
- `components/Subscribers/SubscriberList.tsx`
- `components/Routers/RouterList.tsx`
- `components/Vouchers/VoucherManager.tsx`
- `components/Modern/CaptivePortal.tsx`

**Analytics**:
- `pages/Analytics.tsx`
- `components/Dashboard/TenantOverview.tsx`

**Super Admin**:
- `components/SuperAdmin/SuperAdminDashboard.tsx`
- `components/SuperAdmin/PlatformSettings.tsx`

---

## Frontend Production Checklist

### Pre-Deployment

#### Build Verification
- [ ] Run `npm run build` successfully
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Build output size is reasonable (<5MB)

#### Routing
- [ ] All routes defined in App.tsx
- [ ] Protected routes use `ProtectedRoute` component
- [ ] 404 page configured
- [ ] Navigation works without errors
- [ ] Back button functionality tested

#### Theming
- [ ] Dark mode toggle works
- [ ] Theme persists on page reload
- [ ] All components respect theme
- [ ] No color contrast issues

#### Support & Contact
- [ ] Support button visible on all pages
- [ ] Support contact information updated
- [ ] Support footer shows correct details
- [ ] Help documentation links work

#### Performance
- [ ] Code splitting implemented
- [ ] Lazy loading for heavy components
- [ ] Images optimized
- [ ] No console errors in production

#### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] ARIA labels present
- [ ] Focus indicators visible

---

## Environment Configuration

### Frontend Environment Variables

Create `frontend/.env.production`:

```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_APP_NAME=SurfBill
VITE_SUPPORT_EMAIL=support@yourdomain.com
VITE_SUPPORT_PHONE=+254-XXX-XXXXXX
```

### API Configuration

Ensure `src/constants.ts` or API client uses environment variables:

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
```

---

## Deployment Options

### Option 1: Static Hosting (Recommended)

**Platforms**: Vercel, Netlify, Cloudflare Pages

```bash
# Build
npm run build

# Deploy (example: Vercel)
vercel --prod
```

**Configuration**:
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

### Option 2: Nginx (Self-hosted)

Use the provided `nginx.conf`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/frontend/dist;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Option 3: Docker

Use the provided `Dockerfile`:

```bash
# Build image
docker build -t billing-frontend .

# Run container
docker run -p 80:80 billing-frontend
```

---

## Testing Checklist

### Manual Testing

#### Authentication Flow
- [ ] Login page loads
- [ ] Login with valid credentials works
- [ ] Login with invalid credentials shows error
- [ ] Logout works
- [ ] Protected routes redirect to login
- [ ] Token refresh works

#### Navigation
- [ ] All menu items work
- [ ] Back button navigates correctly
- [ ] Browser back/forward buttons work
- [ ] Deep links work (direct URL access)
- [ ] 404 page shows for invalid routes

#### Admin Dashboard
- [ ] Dashboard loads without errors
- [ ] Charts render correctly
- [ ] Real-time updates work (if applicable)
- [ ] Data refreshes properly

#### Package Management
- [ ] Package list loads
- [ ] Create package form works
- [ ] Edit package works
- [ ] Delete package works
- [ ] Package sync to router works

#### Subscriber Management
- [ ] Subscriber list loads
- [ ] Search/filter works
- [ ] Subscriber details show correctly
- [ ] Session management works

#### Router Management
- [ ] Router list loads
- [ ] Add router works
- [ ] Test connection works
- [ ] Router stats display correctly

#### Captive Portal
- [ ] Portal loads for guests
- [ ] Package selection works
- [ ] Payment initiation works
- [ ] Voucher redemption works

#### Theme & UI
- [ ] Dark mode toggle works
- [ ] Theme persists across pages
- [ ] All components styled correctly
- [ ] Responsive design works (mobile/tablet/desktop)

#### Support Features
- [ ] Support button accessible
- [ ] Contact information correct
- [ ] Help links work

---

## Common Issues & Fixes

### Issue 1: Blank Pages

**Symptoms**: Page loads but shows blank screen

**Causes**:
- JavaScript errors in console
- Missing route configuration
- API endpoint not responding

**Fixes**:
1. Check browser console for errors
2. Verify route exists in `App.tsx`
3. Check API endpoint is accessible
4. Verify authentication token is valid

### Issue 2: Routing Not Working

**Symptoms**: Navigation doesn't change URL or page

**Causes**:
- React Router not configured correctly
- Missing `BrowserRouter` wrapper
- Server not configured for SPA

**Fixes**:
1. Ensure `BrowserRouter` wraps app
2. Configure server to serve `index.html` for all routes
3. Check `basename` prop if deployed to subdirectory

### Issue 3: API Calls Failing

**Symptoms**: Data not loading, network errors

**Causes**:
- CORS issues
- Wrong API base URL
- Missing authentication headers

**Fixes**:
1. Verify `VITE_API_BASE_URL` is correct
2. Check CORS configuration on backend
3. Ensure auth token is included in requests
4. Check network tab in browser DevTools

### Issue 4: Dark Mode Not Persisting

**Symptoms**: Theme resets on page reload

**Causes**:
- Theme not saved to localStorage
- ThemeContext not initialized properly

**Fixes**:
1. Check `ThemeContext.tsx` saves to localStorage
2. Verify theme is loaded on app initialization
3. Check browser localStorage is enabled

---

## Performance Optimization

### Code Splitting

```typescript
// Lazy load heavy components
const Analytics = lazy(() => import('./pages/Analytics'));
const MikrotikCenter = lazy(() => import('./pages/MikrotikCenter'));

// Wrap with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Analytics />
</Suspense>
```

### Image Optimization

```typescript
// Use WebP format
<img src="image.webp" alt="Description" loading="lazy" />

// Responsive images
<img 
  srcSet="image-320w.webp 320w, image-640w.webp 640w"
  sizes="(max-width: 640px) 100vw, 640px"
  src="image-640w.webp"
  alt="Description"
/>
```

### Bundle Size Optimization

```bash
# Analyze bundle size
npm run build -- --mode production

# Check for large dependencies
npx vite-bundle-visualizer
```

---

## Security Best Practices

### XSS Prevention
- ✅ React escapes output by default
- ✅ Avoid `dangerouslySetInnerHTML`
- ✅ Sanitize user input before rendering

### Authentication
- ✅ Store tokens in httpOnly cookies (if possible)
- ✅ Or use secure localStorage with short expiry
- ✅ Clear tokens on logout
- ✅ Redirect to login on 401 errors

### API Security
- ✅ Use HTTPS in production
- ✅ Include CSRF tokens for mutations
- ✅ Validate API responses
- ✅ Handle errors gracefully

---

## Monitoring & Analytics

### Error Tracking

Integrate Sentry (optional):

```bash
npm install @sentry/react
```

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
});
```

### Analytics

Integrate Google Analytics or Plausible:

```typescript
// Add to index.html or main.tsx
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Update environment variables
- [ ] Update support contact information
- [ ] Update API base URL
- [ ] Test production build locally
- [ ] Run lighthouse audit
- [ ] Check accessibility

### Deployment
- [ ] Build passes without errors
- [ ] Deploy to staging first
- [ ] Test all critical flows
- [ ] Verify API connectivity
- [ ] Check SSL certificate
- [ ] Test on multiple browsers

### Post-Deployment
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Verify analytics tracking
- [ ] Test from different devices
- [ ] Collect user feedback

---

## Browser Support

### Supported Browsers
- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile Safari: iOS 14+
- Chrome Android: Last 2 versions

### Polyfills
Modern browsers are targeted. Add polyfills if supporting older browsers:

```bash
npm install core-js regenerator-runtime
```

---

## Maintenance

### Regular Updates
- Update dependencies monthly: `npm update`
- Check for security vulnerabilities: `npm audit`
- Review and update deprecated packages
- Test after each update

### Performance Monitoring
- Monitor bundle size
- Track page load times
- Check Core Web Vitals
- Optimize based on metrics

---

## Support & Documentation

### Internal Documentation
- Component documentation in code
- README.md for setup instructions
- REGRESSION_PREVENTION.md for known issues

### External Resources
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [TailwindCSS Documentation](https://tailwindcss.com)
- [React Router Documentation](https://reactrouter.com)

---

## Conclusion

The frontend is production-ready with modern tooling and comprehensive features. Follow this guide for deployment and maintenance to ensure optimal performance and user experience.

**Recommended Action**: Deploy to staging environment and complete the testing checklist before production launch.
