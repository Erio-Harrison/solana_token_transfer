// src/utils/wallet-config.tsx

import { FC, ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

import "@solana/wallet-adapter-react-ui/styles.css";

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    // 使用 Devnet
    const endpoint = useMemo(() => clusterApiUrl("devnet"), []);
    
    // 配置 Phantom 钱包
    const wallets = useMemo(
        () => [new PhantomWalletAdapter()],
        []
    );

    console.log("Initializing wallet provider with endpoint:", endpoint);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};