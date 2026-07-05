'use client';

import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { config } from './web3config';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

export function Web3Providers({
  children,
  isDark,
}: {
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={
            isDark
              ? darkTheme({
                  accentColor: '#dddae8',
                  accentColorForeground: '#08080f',
                  borderRadius: 'medium',
                  fontStack: 'system',
                })
              : lightTheme({
                  accentColor: '#4a4868',
                  accentColorForeground: '#ffffff',
                  borderRadius: 'medium',
                  fontStack: 'system',
                })
          }
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}