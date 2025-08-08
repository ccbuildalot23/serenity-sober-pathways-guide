# Lighthouse CI Configuration

This document explains the Lighthouse CI setup for the Serenity Sober Pathways Guide platform, ensuring consistent performance, accessibility, and best practices auditing.

## Overview

Our Lighthouse CI configuration is designed specifically for a HIPAA-compliant mental health platform with strict accessibility requirements. It integrates with GitHub Actions and Vercel deployments to provide automated quality assurance.

## Configuration Files

### `lighthouse.config.js`
Main configuration file defining audit rules, thresholds, and collection settings.

### GitHub Actions Integration
Located in `.github/workflows/pr-checks.yml`, the Lighthouse job:
1. Waits for Vercel deployment completion
2. Runs comprehensive audits on the preview URL
3. Updates PR comments with detailed results
4. Fails builds on accessibility violations

## Thresholds & Requirements

### Core Categories
- **Performance**: ≥80 (Warning)
- **Accessibility**: ≥95 (Error - Blocking)
- **Best Practices**: ≥90 (Warning)
- **SEO**: ≥90 (Warning)

### Core Web Vitals
- **LCP (Largest Contentful Paint)**: ≤2.5s
- **FCP (First Contentful Paint)**: ≤1.8s
- **CLS (Cumulative Layout Shift)**: ≤0.1 (Blocking)
- **TBT (Total Blocking Time)**: ≤300ms

### Critical Accessibility Audits
All marked as **Error** (blocking):
- Color contrast compliance
- Proper heading hierarchy
- HTML language attributes
- Image alt text
- Form labels
- Link names
- ARIA attributes
- Focus management
- Keyboard navigation

## Usage

### Local Testing
```bash
# Validate configuration
npm run lighthouse:validate

# Test against local dev server
npm run dev
npm run lighthouse:test

# Test specific URL
npm run lighthouse:local
```

### CI/CD Pipeline
Lighthouse runs automatically on every PR:
1. PR opened/updated → Vercel deploys preview
2. Lighthouse waits for deployment completion
3. Runs 3 audit rounds on preview URL
4. Updates PR comment with results
5. Fails build if accessibility < 95%

### Manual Validation
```bash
node scripts/lighthouse-validate.js
node scripts/lighthouse-validate.js --test
node scripts/lighthouse-validate.js --test --url https://your-preview-url.vercel.app
```

## Integration with Vercel

### Deployment Flow
1. **PR Creation**: Vercel automatically creates preview deployment
2. **URL Detection**: GitHub Action extracts preview URL from Vercel comment
3. **Readiness Check**: Waits up to 5 minutes for deployment to be accessible
4. **Audit Execution**: Runs Lighthouse with desktop settings
5. **Result Reporting**: Updates PR with detailed scoring table

### Preview URL Pattern
Vercel URLs follow pattern: `https://project-name-hash-team.vercel.app`

## Scoring & Reporting

### Score Interpretation
- 🟢 90-100: Excellent
- 🟡 50-89: Needs improvement  
- 🔴 0-49: Poor

### Report Sections
1. **Category Scores**: Performance, Accessibility, Best Practices, SEO
2. **Core Web Vitals**: LCP, CLS, TBT metrics
3. **Detailed Report Link**: Full Lighthouse report with recommendations
4. **Pass/Fail Status**: Against defined thresholds

## HIPAA Compliance Focus

### Accessibility Requirements
- WCAG 2.1 AA compliance (95% threshold)
- Screen reader compatibility
- Keyboard navigation support
- Color contrast validation
- Focus management
- Semantic HTML structure

### Security Audits
- HTTPS enforcement
- CSP (Content Security Policy)
- No vulnerable dependencies
- No console errors
- Secure cookie handling

### Privacy Considerations
- No tracking pixels in critical paths
- Minimal third-party scripts
- Secure form handling
- No sensitive data in URLs

## Troubleshooting

### Common Issues

#### "No Vercel URL found"
- Ensure Vercel integration is properly configured
- Check VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID secrets
- Verify Vercel comments are being posted

#### "Deployment not ready"
- Increase timeout in GitHub Action
- Check for build errors in Vercel dashboard
- Verify all environment variables are set

#### Accessibility Failures
- Use browser dev tools accessibility panel
- Install axe-core browser extension
- Check color contrast with online tools
- Validate HTML with W3C validator

### Debug Mode
Add to Lighthouse config:
```javascript
settings: {
  onlyAudits: ['accessibility'], // Test only accessibility
  skipAudits: ['performance'],   // Skip performance temporarily
}
```

## Best Practices

### Development Workflow
1. Test locally before pushing
2. Address accessibility issues immediately
3. Monitor Core Web Vitals trends
4. Review detailed reports for optimization opportunities

### Performance Optimization
- Optimize images (WebP format)
- Minimize JavaScript bundles
- Use efficient CSS
- Implement proper caching
- Preload critical resources

### Accessibility Guidelines
- Use semantic HTML elements
- Provide alternative text for images
- Ensure proper heading structure
- Test with keyboard navigation
- Verify screen reader compatibility
- Maintain color contrast ratios

## Maintenance

### Regular Updates
- Update Lighthouse CI action versions
- Review and adjust thresholds based on improvements
- Add new audit rules as they become available
- Monitor for deprecated audits

### Performance Monitoring
- Track score trends over time
- Set up alerts for significant regressions
- Regular accessibility testing with real users
- Monitor Core Web Vitals in production

## Resources

- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Web.dev Performance](https://web.dev/performance/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/)
- [Core Web Vitals](https://web.dev/vitals/)
- [HIPAA Compliance Guide](https://www.hhs.gov/hipaa/)

## Support

For issues with Lighthouse CI configuration:
1. Check GitHub Actions logs
2. Review Lighthouse report details
3. Test locally with validation script
4. Consult team for accessibility questions