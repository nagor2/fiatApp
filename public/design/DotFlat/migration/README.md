# DotFlat redesign — migration package

This folder mirrors your CRA project structure. Copy each file into the matching path inside `app-dotflat/`.

## File map

```
migration/                            →  app-dotflat/
├── public/
│   └── assets/                       →  public/assets/
│       (logo, robot, hero-*.jpeg, etc.)
└── src/
    ├── styles/
    │   ├── index.css                 →  src/styles/index.css   (NEW — replaces App.css import)
    │   ├── tokens.css                →  src/styles/tokens.css
    │   ├── shell.css                 →  src/styles/shell.css
    │   └── pages.css                 →  src/styles/pages.css
    ├── components/
    │   ├── Layout.js                 →  src/components/Layout.js   (REPLACE existing)
    │   └── redesign/
    │       ├── Icons.jsx
    │       ├── Topbar.jsx
    │       ├── Sidebar.jsx
    │       ├── BottomNav.jsx
    │       └── PageHead.jsx
    ├── pages/
    │   └── _Stub.js                  →  src/pages/_Stub.js          (temporary, deleted in Step 4)
    └── App.js                        →  src/App.js                  (REPLACE existing)
```

## Step 1 install (10 minutes)

1. **Copy files** as mapped above.
2. Open `src/index.js` — make sure it still imports `./App`.
3. **Delete** the `import './App.css'` from `src/App.js` if you copied my version; tokens come in via `src/styles/index.css`.
4. Keep `src/App.css` for now (other components still reference its classes). We'll delete it in Step 4.
5. `npm start`. You should see the new shell on every route, with stub content inside.

What works after Step 1:
- New brand chrome: topbar, sidebar, bottom nav, theme toggle (persists), mobile drawer
- Wallet connect/disconnect via `useWeb3` (your existing context)
- All routes navigate; back/forward works
- Mobile-responsive

## Step 2 — Migrate Balances (next)

In Step 2 we'll add:
- `src/hooks/useBalances.js` — lifts the token-balance fetching out of `MyPanel`/`Transfers` into a clean hook
- `src/pages/BalancesPage.js` — replaces the stub with the real Balances grid
- Optional: a `<TransfersDrawer>` that opens when you click "Transfers" on a token card, hosting your existing `<Transfers>` component

Then we repeat that pattern for Deposits → Credits → Auctions → Pools → Commodities → Contracts → Watcher → Home.

## Step 4 — Cleanup

After all pages migrate:
- Delete `src/components/MyPanel.js`
- Delete `src/layouts/MainLayout.js`
- Delete `src/App.css` (or strip down to just what `WalletTest`/etc. need)
- Existing forms (`Borrow`, `OpenDeposit`, `UpdateCDP`, `MakeBidTSCBuyout`, `WithDrawDeposit`, `PayInterestCDP`, `CloseCDP`, `WithdrawEtherCDP`, `ImproveBid`) will be opened as modal/drawer content from the new screens. Their internal logic doesn't change — only the surrounding chrome.

## Notes / gotchas

- **Asset paths:** the new code uses `${process.env.PUBLIC_URL}/assets/logo.png`. CRA already serves `public/` at the root, so this works in dev and prod.
- **Theme toggle** persists to `localStorage` under `df-theme`. Add `data-theme="light"` to your `public/index.html` `<html>` tag if you want to avoid a first-paint flash.
- **Routing:** I kept all your existing routes (`/cdp`, `/debtPositions/:id`, `/deposit/:depositId`, etc.) so deep-links keep working.
- **Web3Context:** `Topbar` and `Sidebar` use `useWeb3()` directly. Make sure your context exposes: `account`, `walletConnected`, `ethPrice`, `getAccount`, `disconnectWallet`. (It already does.)

Ready for Step 2 when you are. Just say "go".
