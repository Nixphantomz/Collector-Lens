'use client';

import { PrivyProvider } from '@privy-io/react-auth';

export function Web3Providers({
  children,
  isDark,
}: {
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "clwrqiqpv00h4l70fkbj2k8h9"}
      config={{
        appearance: {
          theme: isDark ? 'dark' : 'light',
          accentColor: isDark ? '#dddae8' : '#4a4868',
          logo: undefined,
          showWalletLoginFirst: false,
        },
        loginMethods: ['wallet', 'google', 'email'],
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },
        defaultChain: {
          id: 56,
          name: 'BNB Smart Chain',
          network: 'bsc',
          nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
          rpcUrls: {
            default: { http: ['https://bsc-dataseed.binance.org'] },
            public: { http: ['https://bsc-dataseed.binance.org'] },
          },
        },
        supportedChains: [
          {
            id: 56,
            name: 'BNB Smart Chain',
            network: 'bsc',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
            rpcUrls: {
              default: { http: ['https://bsc-dataseed.binance.org'] },
              public: { http: ['https://bsc-dataseed.binance.org'] },
            },
          },
        ],
      }}
    >
      {children}
    </PrivyProvider>
  );
}