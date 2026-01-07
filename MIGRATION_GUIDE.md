# Portfolio Migration Guide

## Current Status: TEMPORARY IMPLEMENTATION

The current portfolio system includes temporary migration logic to handle old portfolios that don't have a `userId` field. This is **NOT production-ready** and needs to be migrated properly.

## What Needs to Be Done for Production

### 1. Create Migration Script

Create a one-time migration script (`scripts/migrate-portfolios.js`) that:

```javascript
// Pseudo-code for migration script
1. Find all portfolios without userId
2. For each portfolio:
   - Find user by email (from portfolio.email)
   - If user found: Update portfolio with user._id as userId
   - If user not found: Log for manual review or delete orphaned portfolio
3. Verify all portfolios now have userId
4. Remove any remaining portfolios without userId
```

### 2. Update Portfolio Model

After migration:
- Change `userId.required` from `false` to `true` in `models/Portfolio.js`
- Remove `sparse: true` from userId index
- Remove migration logic from `getPortfolio()` method
- Remove `userEmail` parameter from `getPortfolio()` method

### 3. Update Server Routes

After migration:
- Remove `userEmail` extraction from all portfolio routes
- Update all `Portfolio.getPortfolio()` calls to only pass `userId`

### 4. Testing Checklist

- [ ] Run migration script on staging database
- [ ] Verify all portfolios have userId
- [ ] Test that existing users can access their portfolios
- [ ] Test that new users get new portfolios
- [ ] Verify no orphaned portfolios exist
- [ ] Update code to remove temporary migration logic
- [ ] Deploy to production
- [ ] Run migration script on production database
- [ ] Monitor for any issues

### 5. Rollback Plan

If migration fails:
- Keep temporary migration logic in place
- Fix migration script
- Re-run migration
- Only remove temporary code after successful migration

## Files That Need Changes

1. `models/Portfolio.js` - Remove migration logic, make userId required
2. `server.js` - Remove userEmail from all portfolio routes
3. Create `scripts/migrate-portfolios.js` - Migration script
4. Update this guide with actual migration results

## Notes

- The current implementation works but is inefficient (checks email on every request)
- Production should have all portfolios migrated upfront
- Migration should be done during maintenance window
- Backup database before running migration

