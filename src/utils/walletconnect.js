import EthereumProvider from '@walletconnect/ethereum-provider';
import { BrowserProvider } from 'ethers';
import QRCode from 'qrcode';

const PROJECT_ID = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'YOUR_WALLETCONNECT_PROJECT_ID';

let wcProvider = null;
let qrModal = null;

function clearWcStorage() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('wc@') || k.startsWith('walletconnect') || k.includes('WALLETCONNECT_DEEPLINK'))
      .forEach(k => localStorage.removeItem(k));
  } catch (e) { /* ignore */ }
}

function showQrModal(uri) {
  removeQrModal();

  const deepLink = `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`;

  const overlay = document.createElement('div');
  overlay.id = '__wc_qr_overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: '99999',
  });

  const box = document.createElement('div');
  Object.assign(box.style, {
    background: '#fff', borderRadius: '16px', padding: '28px 24px',
    textAlign: 'center', maxWidth: '360px', width: '92%',
    boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
  });

  // ── Tab bar ─────────────────────────────────────────────────────────────
  const tabs = document.createElement('div');
  Object.assign(tabs.style, { display: 'flex', borderBottom: '2px solid #eee', marginBottom: '16px' });

  function makeTab(label, active) {
    const t = document.createElement('button');
    t.textContent = label;
    Object.assign(t.style, {
      flex: '1', padding: '8px 0', border: 'none', background: 'none',
      cursor: 'pointer', fontWeight: active ? '700' : '400',
      fontSize: '13px', color: active ? '#F6851B' : '#666',
      borderBottom: active ? '2px solid #F6851B' : '2px solid transparent',
      marginBottom: '-2px',
    });
    return t;
  }

  const tabAny    = makeTab('Any wallet (QR)', true);
  const tabMM     = makeTab('MetaMask (QR)', false);
  tabs.append(tabAny, tabMM);

  // ── Panel A: raw wc: URI QR ──────────────────────────────────────────────
  const panelAny = document.createElement('div');
  const qrTitle = document.createElement('p');
  qrTitle.textContent = 'Scan with any WalletConnect-compatible wallet';
  Object.assign(qrTitle.style, { margin: '0 0 12px', fontSize: '12px', color: '#555' });
  const canvas = document.createElement('canvas');
  panelAny.append(qrTitle, canvas);

  // ── Panel B: MetaMask deep-link QR ───────────────────────────────────────
  const panelMM = document.createElement('div');
  panelMM.style.display = 'none';
  const mmTitle = document.createElement('p');
  mmTitle.textContent = 'Scan with your phone camera — it will open MetaMask directly';
  Object.assign(mmTitle.style, { margin: '0 0 12px', fontSize: '12px', color: '#555' });
  const canvasMM = document.createElement('canvas');
  const mmHint = document.createElement('p');
  mmHint.textContent = 'Do NOT scan with MetaMask scanner — use your phone\'s default camera app';
  Object.assign(mmHint.style, { margin: '10px 0 0', fontSize: '11px', color: '#F6851B', lineHeight: '1.4' });
  panelMM.append(mmTitle, canvasMM, mmHint);

  tabAny.onclick = () => {
    panelAny.style.display = ''; panelMM.style.display = 'none';
    tabAny.style.fontWeight = '700'; tabAny.style.color = '#F6851B'; tabAny.style.borderBottom = '2px solid #F6851B';
    tabMM.style.fontWeight = '400'; tabMM.style.color = '#666';   tabMM.style.borderBottom = '2px solid transparent';
  };
  tabMM.onclick = () => {
    panelAny.style.display = 'none'; panelMM.style.display = '';
    tabMM.style.fontWeight = '700'; tabMM.style.color = '#F6851B'; tabMM.style.borderBottom = '2px solid #F6851B';
    tabAny.style.fontWeight = '400'; tabAny.style.color = '#666';  tabAny.style.borderBottom = '2px solid transparent';
  };

  // ── Copy URI ────────────────────────────────────────────────────────────
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy URI';
  Object.assign(copyBtn.style, {
    display: 'block', margin: '14px auto 0', padding: '7px 18px',
    border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer',
    fontSize: '12px', background: '#f5f5f5',
  });
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(uri).then(() => { copyBtn.textContent = 'Copied!'; });
  };

  // ── Close ───────────────────────────────────────────────────────────────
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ Close';
  Object.assign(closeBtn.style, {
    display: 'block', margin: '8px auto 0', background: 'none',
    border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '12px',
  });
  closeBtn.onclick = removeQrModal;
  overlay.onclick = (e) => { if (e.target === overlay) removeQrModal(); };

  box.append(tabs, panelAny, panelMM, copyBtn, closeBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  qrModal = overlay;

  QRCode.toCanvas(canvas,   uri,      { width: 240, margin: 1, color: { dark: '#000', light: '#fff' } });
  QRCode.toCanvas(canvasMM, deepLink, { width: 240, margin: 1, color: { dark: '#7b3f00', light: '#fff' } });
  console.log('[WC] URI:', uri);
  console.log('[WC] MetaMask deep-link:', deepLink);
}

function removeQrModal() {
  if (qrModal) { qrModal.remove(); qrModal = null; }
}

async function getProvider() {
  if (!wcProvider) {
    clearWcStorage();
    wcProvider = await EthereumProvider.init({
      projectId: PROJECT_ID,
      chains: [1],
      showQrModal: false,   // we render our own QR with the raw wc: URI
      metadata: {
        name: 'DotFlat',
        description: 'Decentralized flatcoin backed by a commodities basket',
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`],
      },
    });

    wcProvider.on('display_uri', showQrModal);
    wcProvider.on('connect', (info) => { console.log('[WC] connected', info); removeQrModal(); });
    wcProvider.on('accountsChanged', (a) => console.log('[WC] accountsChanged', a));
    wcProvider.on('chainChanged', (c) => console.log('[WC] chainChanged', c));
    wcProvider.on('disconnect', () => { console.log('[WC] disconnected'); wcProvider = null; });
  }
  return wcProvider;
}

export async function connectWithWalletConnect() {
  console.log('[WC] connecting...');
  const provider = await getProvider();

  try {
    await provider.connect();
  } catch (err) {
    removeQrModal();
    wcProvider = null;
    throw err;
  }

  removeQrModal();
  const address = provider.accounts?.[0];
  console.log('[WC] session established, address:', address);

  const ethersProvider = new BrowserProvider(provider);
  let signer = null;
  try { signer = await ethersProvider.getSigner(); } catch (e) { /* ok */ }

  return { address, provider, ethersProvider, signer };
}

export async function disconnectWalletConnect() {
  removeQrModal();
  if (wcProvider) {
    try { await wcProvider.disconnect(); } catch (e) { /* ignore */ }
    wcProvider = null;
  }
}

export function isWalletConnectConnected() {
  return !!(wcProvider?.connected);
}

export function getWalletConnectProvider() {
  return wcProvider;
}

export function subscribeToWalletConnectEvents(onAccountChange, onChainChange, onDisconnect) {
  if (!wcProvider) return;
  if (onAccountChange) wcProvider.on('accountsChanged', onAccountChange);
  if (onChainChange)   wcProvider.on('chainChanged', onChainChange);
  if (onDisconnect)    wcProvider.on('disconnect', onDisconnect);
}

export default {
  connectWithWalletConnect,
  disconnectWalletConnect,
  isWalletConnectConnected,
  getWalletConnectProvider,
  subscribeToWalletConnectEvents,
};
