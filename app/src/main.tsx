// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { WalletContextProvider } from './utils/wallet-config';
import './App.css'; // 改用 App.css 而不是 index.css

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <WalletContextProvider>
            <App />
        </WalletContextProvider>
    </React.StrictMode>
);