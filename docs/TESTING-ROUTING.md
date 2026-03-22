# Testing React Router Implementation

## Manual Testing Checklist

### 1. Basic Navigation
- [ ] Open http://localhost:3008
- [ ] Verify home page loads with all panels
- [ ] Click on various panels to verify content loads
- [ ] Verify URL changes when clicking on items in panels

### 2. URL Navigation
Test each route directly:

**Base Routes:**
- [ ] http://localhost:3008/ - Home page
- [ ] http://localhost:3008/balances - Balances page (requires wallet)
- [ ] http://localhost:3008/credits - Credits/CDP page (requires wallet)
- [ ] http://localhost:3008/cdp - Alternative CDP route (requires wallet)
- [ ] http://localhost:3008/deposits - Deposits page (requires wallet)
- [ ] http://localhost:3008/auctions - Auctions page
- [ ] http://localhost:3008/pools - Pools page
- [ ] http://localhost:3008/contracts - Contracts page
- [ ] http://localhost:3008/commodities - Commodities page
- [ ] http://localhost:3008/charts-demo - Charts demo page
- [ ] http://localhost:3008/invalid-route - Should show 404 page

**Dynamic Routes:**
- [ ] http://localhost:3008/contracts/DFC - DFC contract details
- [ ] http://localhost:3008/contracts/CDP - CDP contract details
- [ ] http://localhost:3008/commodity/Gold - Gold commodity details
- [ ] http://localhost:3008/auction/1 - Auction #1 details
- [ ] http://localhost:3008/deposit/123 - Deposit #123 details (requires wallet)
- [ ] http://localhost:3008/debtPositions/456 - Debt position #456 (requires wallet)
- [ ] http://localhost:3008/pool/DFC/ETH - DFC/ETH pool details

### 3. Browser Navigation
- [ ] Navigate to different pages using menu
- [ ] Click browser back button - verify previous page loads
- [ ] Click browser forward button - verify next page loads
- [ ] Verify URL updates correctly in address bar

### 4. Wallet Integration
- [ ] Navigate to a public page (pools, auctions)
- [ ] Click "connect wallet" button
- [ ] Connect MetaMask or other wallet
- [ ] Verify wallet connection persists when navigating between pages
- [ ] Navigate to protected page (balances, credits, deposits)
- [ ] Verify protected pages show wallet-required message when not connected
- [ ] Verify protected pages show content when wallet is connected

### 5. Deep Linking
- [ ] Copy URL from browser when on specific page
- [ ] Open URL in new browser tab/window
- [ ] Verify page loads directly without redirects
- [ ] Test with and without wallet connected

### 6. Dynamic Route Navigation
- [ ] Click on a contract in the Contracts panel
- [ ] Verify URL changes to `/contracts/:contractName`
- [ ] Verify panel opens with contract details
- [ ] Click on a commodity in the Commodities panel
- [ ] Verify URL changes to `/commodity/:commodityName`
- [ ] Click on an auction in the Auctions panel
- [ ] Verify URL changes to `/auction/:auctionId`
- [ ] Click on a pool in the Pools panel
- [ ] Verify URL changes to `/pool/:token1/:token2`
- [ ] (With wallet) Click on a deposit
- [ ] Verify URL changes to `/deposit/:depositId`
- [ ] (With wallet) Click on a debt position
- [ ] Verify URL changes to `/debtPositions/:id`

### 7. State Persistence
- [ ] Connect wallet on home page
- [ ] Navigate to balances page
- [ ] Verify contracts are initialized (balances load)
- [ ] Navigate to credits page
- [ ] Verify no re-initialization occurs (check console logs)
- [ ] Navigate back to home
- [ ] Verify wallet still connected

### 7. EventEmitter Integration
- [ ] On home page, click on a product (e.g., DFC token in Balances)
- [ ] Verify detailed view opens in middle panel
- [ ] Click Plus (+) button on panels
- [ ] Verify action modal/form opens correctly
- [ ] Verify EventEmitter still works across route changes

### 8. Responsive Design
- [ ] Resize browser to mobile width (<768px)
- [ ] Verify hamburger menu (☰) appears
- [ ] Click hamburger menu
- [ ] Verify menu expands
- [ ] Click menu item
- [ ] Verify menu collapses and navigation works

### 9. 404 Page
- [ ] Navigate to http://localhost:3008/nonexistent-page
- [ ] Verify 404 page displays
- [ ] Click "Go to Home Page" link
- [ ] Verify redirects to home page

### 10. Performance
- [ ] Monitor console for errors
- [ ] Verify no infinite re-renders
- [ ] Check Network tab for unnecessary requests
- [ ] Verify contracts initialize only once
- [ ] Check for memory leaks (long navigation session)

## Known Issues

### Test Environment
- Unit tests may fail due to Web3 initialization in test environment
- Solution: Mock window.ethereum or skip Web3-dependent tests
- Integration tests work better for this use case

### Deprecation Warnings
- React Router v6 future flags warnings (v7_startTransition, v7_relativeSplatPath)
- These are informational and don't affect functionality
- Can be addressed when upgrading to React Router v7

## Testing Commands

### Run development server
```bash
docker compose --profile dev up
```

### Access application
```bash
open http://localhost:3008
```

### Check logs
```bash
docker logs dotflat-dev --tail 50
```

### Run tests (with limitations)
```bash
docker exec dotflat-dev npm test -- --watchAll=false
```

## Success Criteria

✅ All routes accessible via URL  
✅ Navigation menu works  
✅ Browser back/forward buttons work  
✅ URL reflects current page  
✅ Deep linking works  
✅ Wallet connection persists across routes  
✅ No contract re-initialization on navigation  
✅ EventEmitter still functions  
✅ 404 page shows for invalid routes  
✅ Responsive design works  

## Next Steps

If all tests pass:
1. Test with real wallet connection
2. Test all DApp features (borrow, deposit, auction)
3. Verify transactions work across routes
4. Test with different browsers
5. Consider adding route guards for protected pages
6. Add loading states during route transitions
