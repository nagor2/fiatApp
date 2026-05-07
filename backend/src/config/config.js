module.exports = {
  daoAddress: process.env.DAO_ADDRESS || '0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122',

  // Names used in dao.addresses(name) — order doesn't matter
  contracts: ['rule', 'flatCoin', 'cdp', 'oracle', 'deposit', 'basket', 'auction'],
};
