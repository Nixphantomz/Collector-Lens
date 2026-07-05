'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, base } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Collector Lens',
  projectId: '4dacbc8afa96670f4ed5b2f56d6a0187', // WalletConnect project ID
  chains: [mainnet, polygon, base],
  ssr: true,
});