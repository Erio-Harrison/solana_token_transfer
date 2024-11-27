// app/src/App.tsx

import { FC, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import IDL from './idl/solana_token_transfer.json';
console.log('IDL:', IDL);

import { 
    TOKEN_PROGRAM_ID, 
    getAssociatedTokenAddress, 
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createInitializeMintInstruction,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction
} from '@solana/spl-token';
import '@solana/wallet-adapter-react-ui/styles.css';


const PROGRAM_ID = new PublicKey('8Ug7bHrGSb2HwxNrX3JYuSE9Ny34dLA5jX3zssGty3ai');

const App: FC = () => {
    const { connection } = useConnection();
    const wallet = useWallet();
    
    // 状态变量
    const [tokenName, setTokenName] = useState('');
    const [tokenSymbol, setTokenSymbol] = useState('');
    const [decimals, setDecimals] = useState('9');
    const [mintAmount, setMintAmount] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [recipient, setRecipient] = useState('');
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mintAddress, setMintAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<number | null>(null);
    

    const getProvider = () => {
        if (!wallet.publicKey || !wallet.signTransaction) {
            throw new Error('Wallet not connected!');
        }
        const provider = new AnchorProvider(
            connection,
            wallet as any,
            { commitment: 'processed' }
        );
        console.log('Provider details:', {
            connection: connection.rpcEndpoint,
            wallet: wallet.publicKey.toString(),
            opts: provider.opts
        });
        return provider;
    };

    const initializeToken = async () => {
        if (!wallet.publicKey) {
            setStatus('Please connect your wallet first');
            return;
        }
    
        try {
            setIsLoading(true);
            setStatus('Initializing token...');
            
            const provider = getProvider();
    
            // 创建正确的 IDL 格式
            const formattedIDL = {
                version: "0.1.0",
                name: "solana_token_transfer",
                instructions: [{
                    name: "initializeToken",
                    accounts: [
                        {
                            name: "tokenInfo",
                            isMut: true,
                            isSigner: true
                        },
                        {
                            name: "mint",
                            isMut: true,
                            isSigner: true
                        },
                        {
                            name: "authority",
                            isMut: true,
                            isSigner: true
                        },
                        {
                            name: "systemProgram",
                            isMut: false,
                            isSigner: false
                        },
                        {
                            name: "tokenProgram",
                            isMut: false,
                            isSigner: false
                        },
                        {
                            name: "rent",
                            isMut: false,
                            isSigner: false
                        }
                    ],
                    args: [
                        {
                            name: "name",
                            type: "string"
                        },
                        {
                            name: "symbol",
                            type: "string"
                        },
                        {
                            name: "decimals",
                            type: "u8"
                        }
                    ]
                }],
                accounts: [
                    {
                        name: "TokenInfo",
                        type: {
                            kind: "struct",
                            fields: [
                                {
                                    name: "name",
                                    type: "string"
                                },
                                {
                                    name: "symbol",
                                    type: "string"
                                },
                                {
                                    name: "decimals",
                                    type: "u8"
                                },
                                {
                                    name: "mint",
                                    type: "publicKey"
                                },
                                {
                                    name: "authority",
                                    type: "publicKey"
                                }
                            ]
                        }
                    }
                ]
            };
    
            const program = new Program(
                formattedIDL,
                PROGRAM_ID,
                provider
            );
    
            const mintKeypair = web3.Keypair.generate();
            const tokenInfoKeypair = web3.Keypair.generate();
    
            console.log('Initializing token with params:', {
                tokenName,
                tokenSymbol,
                decimals: Number(decimals),
                mint: mintKeypair.publicKey.toString(),
                tokenInfo: tokenInfoKeypair.publicKey.toString()
            });
    
            const tx = await program.methods
                .initializeToken(
                    tokenName,
                    tokenSymbol,
                    Number(decimals)
                )
                .accounts({
                    tokenInfo: tokenInfoKeypair.publicKey,
                    mint: mintKeypair.publicKey,
                    authority: wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    rent: web3.SYSVAR_RENT_PUBKEY,
                })
                .signers([mintKeypair, tokenInfoKeypair])
                .rpc();
    
            setMintAddress(mintKeypair.publicKey.toString());
            setStatus(`Token initialized successfully!\nMint Address: ${mintKeypair.publicKey.toString()}\nTransaction: ${tx}`);
    
        } catch (error) {
            console.error('Error details:', error);
            setStatus(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    // 创建 Mint 账户的辅助函数
    const createMintAccountInstruction = async (
        connection: web3.Connection,
        payer: web3.PublicKey,
        mintPubkey: web3.PublicKey,
        decimals: number
    ) => {
        // 获取所需的租金
        const lamports = await connection.getMinimumBalanceForRentExemption(
            82
        );
    
        // 创建账户
        const createAccountIx = web3.SystemProgram.createAccount({
            fromPubkey: payer,
            newAccountPubkey: mintPubkey,
            space: 82,
            lamports,
            programId: TOKEN_PROGRAM_ID,
        });
    
        // 初始化 Mint
        const initializeMintIx = createInitializeMintInstruction(
            mintPubkey,    // mint pubkey
            decimals,      // decimals
            payer,         // mint authority
            payer,         // freeze authority (optional)
            TOKEN_PROGRAM_ID
        );
    
        return [createAccountIx, initializeMintIx];
    };
    
    // 创建 Token 账户的辅助函数
    const createTokenAccountInstruction = async (
        connection: web3.Connection,
        payer: web3.PublicKey,
        mintPubkey: web3.PublicKey,
        tokenAccountPubkey: web3.PublicKey
    ) => {
        const lamports = await connection.getMinimumBalanceForRentExemption(165);
        
        return web3.SystemProgram.createAccount({
            fromPubkey: payer,
            newAccountPubkey: tokenAccountPubkey,
            space: 165,
            lamports,
            programId: TOKEN_PROGRAM_ID,
        });
    };

    const mintToken = async () => {
        if (!wallet.publicKey || !mintAddress) {
            setStatus('Please initialize token first');
            return;
        }
    
        try {
            setIsLoading(true);
            setStatus('Minting tokens...');
    
            const provider = getProvider();
            const program = new Program(idl as any, PROGRAM_ID, provider);
            
            const mintPubkey = new PublicKey(mintAddress);
            
            // 获取或创建关联代币账户
            const associatedTokenAccount = await getAssociatedTokenAddress(
                mintPubkey,
                wallet.publicKey
            );
    
            // 检查账户是否存在，如果不存在则创建
            const account = await connection.getAccountInfo(associatedTokenAccount);
            if (!account) {
                const createAtaIx = await createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    associatedTokenAccount,
                    wallet.publicKey,
                    mintPubkey
                );
                // 创建关联代币账户的交易
                const createAtaTx = new web3.Transaction().add(createAtaIx);
                await provider.sendAndConfirm(createAtaTx);
            }
    
            // 执行铸币操作
            const tx = await program.methods
                .mintToken(new web3.BN(Number(mintAmount)))
                .accounts({
                    mint: mintPubkey,
                    tokenAccount: associatedTokenAccount,
                    authority: wallet.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .rpc();
    
            setStatus(`Tokens minted successfully! Transaction: ${tx}`);
        } catch (error) {
            console.error('Error:', error);
            setStatus(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const transferToken = async () => {
        if (!wallet.publicKey || !mintAddress) {
            setStatus('Please initialize token first');
            return;
        }

        try {
            setIsLoading(true);
            setStatus('Transferring tokens...');

            const provider = getProvider();
            const program = new Program(idl as any, PROGRAM_ID, provider);
            
            const mintPubkey = new PublicKey(mintAddress);
            const fromTokenAccount = await getAssociatedTokenAddress(
                mintPubkey,
                wallet.publicKey
            );
            const toTokenAccount = await getAssociatedTokenAddress(
                mintPubkey,
                new PublicKey(recipient)
            );

            await program.methods
                .transferToken(new web3.BN(Number(transferAmount)))
                .accounts({
                    from: fromTokenAccount,
                    to: toTokenAccount,
                    authority: wallet.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .rpc();

            setStatus('Tokens transferred successfully!');
        } catch (error) {
            console.error('Error:', error);
            setStatus(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const checkBalance = async (mintAddress: string, owner: PublicKey) => {
        try {
            const mintPubkey = new PublicKey(mintAddress);
            const tokenAccount = await getAssociatedTokenAddress(
                mintPubkey,
                owner
            );
            
            const accountInfo = await connection.getParsedAccountInfo(tokenAccount);
            if (accountInfo.value) {
                const data = (accountInfo.value.data as any).parsed.info;
                setBalance(Number(data.tokenAmount.amount) / Math.pow(10, Number(data.tokenAmount.decimals)));
            }
        } catch (error) {
            console.error('Error checking balance:', error);
        }
    };

    useEffect(() => {
        if (wallet.publicKey && mintAddress) {
            checkBalance(mintAddress, wallet.publicKey);
        }
    }, [wallet.publicKey, mintAddress, connection]);

    const fetchTokenInfo = async () => {
        if (!mintAddress) return;
    
        try {
            const provider = getProvider();
            const program = new Program(idl as any, PROGRAM_ID, provider);
            
            // 1. 获取 TokenInfo 账户数据
            const tokenInfo = await program.account.tokenInfo.all([
                {
                    memcmp: {
                        offset: 8, // 跳过账户判别器
                        bytes: mintAddress
                    }
                }
            ]);
            console.log('Token Info:', tokenInfo);
    
            // 2. 获取 Mint 账户数据
            const mintAccount = await connection.getAccountInfo(new PublicKey(mintAddress));
            console.log('Mint Account:', mintAccount);
    
            // 3. 获取当前用户的 Token 账户数据
            if (wallet.publicKey) {
                const tokenAccount = await getAssociatedTokenAddress(
                    new PublicKey(mintAddress),
                    wallet.publicKey
                );
                const tokenAccountInfo = await connection.getParsedAccountInfo(tokenAccount);
                console.log('Token Account:', tokenAccountInfo);
            }
    
            // 可以添加到UI显示
            setStatus(`
                Token Name: ${tokenInfo[0]?.account.name}
                Symbol: ${tokenInfo[0]?.account.symbol}
                Decimals: ${tokenInfo[0]?.account.decimals}
                Authority: ${tokenInfo[0]?.account.authority}
            `);
    
        } catch (error) {
            console.error('Error fetching token info:', error);
        }
    };

    return (
        <div style={{
            padding: '20px',
            maxWidth: '600px',
            margin: '0 auto',
            fontFamily: 'Arial, sans-serif'
        }}>
            <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
                Solana Token Manager
            </h1>

            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <WalletMultiButton />
            </div>

            {wallet.publicKey && (
                <>
                    <div style={{
                        background: '#f5f5f5',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <h2>Initialize Token</h2>
                        <input
                            type="text"
                            placeholder="Token Name"
                            value={tokenName}
                            onChange={(e) => setTokenName(e.target.value)}
                            style={inputStyle}
                        />
                        <input
                            type="text"
                            placeholder="Token Symbol"
                            value={tokenSymbol}
                            onChange={(e) => setTokenSymbol(e.target.value)}
                            style={inputStyle}
                        />
                        <input
                            type="number"
                            placeholder="Decimals"
                            value={decimals}
                            onChange={(e) => setDecimals(e.target.value)}
                            style={inputStyle}
                        />
                        <button
                            onClick={initializeToken}
                            disabled={isLoading}
                            style={buttonStyle}
                        >
                            {isLoading ? 'Initializing...' : 'Initialize Token'}
                        </button>
                    </div>

                    {mintAddress && (
                        <>
                            <div style={{
                                background: '#f5f5f5',
                                padding: '20px',
                                borderRadius: '8px',
                                marginBottom: '20px'
                            }}>
                                <h2>Mint Token</h2>
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    value={mintAmount}
                                    onChange={(e) => setMintAmount(e.target.value)}
                                    style={inputStyle}
                                />
                                <button
                                    onClick={mintToken}
                                    disabled={isLoading}
                                    style={buttonStyle}
                                >
                                    {isLoading ? 'Minting...' : 'Mint Tokens'}
                                </button>
                            </div>

                            <div style={{
                                background: '#f5f5f5',
                                padding: '20px',
                                borderRadius: '8px',
                                marginBottom: '20px'
                            }}>
                                <h2>Transfer Token</h2>
                                <input
                                    type="text"
                                    placeholder="Recipient Address"
                                    value={recipient}
                                    onChange={(e) => setRecipient(e.target.value)}
                                    style={inputStyle}
                                />
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    value={transferAmount}
                                    onChange={(e) => setTransferAmount(e.target.value)}
                                    style={inputStyle}
                                />
                                <button
                                    onClick={transferToken}
                                    disabled={isLoading}
                                    style={buttonStyle}
                                >
                                    {isLoading ? 'Transferring...' : 'Transfer Tokens'}
                                </button>
                            </div>
                        </>
                    )}

                    {mintAddress && balance !== null && (
                        <div style={{
                            background: '#f5f5f5',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <h2>Token Balance</h2>
                            <p style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
                                {balance} {tokenSymbol}
                            </p>
                        </div>
                    )}

                    {mintAddress && (
                        <div style={{
                            background: '#f5f5f5',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <h2>Token Information</h2>
                            <button
                                onClick={fetchTokenInfo}
                                style={buttonStyle}
                            >
                                Fetch Token Info
                            </button>
                        </div>
                    )}

                    {status && (
                        <div style={{
                            padding: '10px',
                            marginTop: '20px',
                            background: status.includes('Error') ? '#ffe6e6' : '#e6ffe6',
                            borderRadius: '4px'
                        }}>
                            {status}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const inputStyle = {
    width: '100%',
    padding: '8px',
    marginBottom: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
};

const buttonStyle = {
    width: '100%',
    padding: '10px',
    backgroundColor: '#9945FF',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px',
};

export default App;