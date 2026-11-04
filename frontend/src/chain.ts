import { defineChain } from 'viem';

export const botTestnet = defineChain({
  id: 968,
  name: 'BOT Testnet',
  nativeCurrency: {
    name: 'BOT',
    symbol: 'BOT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.bohr.life'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BohrScan',
      url: 'https://scan.bohr.life',
    },
  },
});
