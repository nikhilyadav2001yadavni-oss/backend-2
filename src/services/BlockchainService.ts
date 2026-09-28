import axios from 'axios';
import { createBadRequestError } from '../middleware/authentication';

export enum BlockchainChain {
    ETH = 'ETH',
    BNB = 'BNB',
    TRX = 'TRX',
    SOL = 'SOL',
    POLYGON = 'POLYGON'
}

interface EtherscanTransactionResponse {
    status: string;
    message: string;
    result: {
        blockNumber: string;
        timeStamp: string;
        hash: string;
        from: string;
        to: string;
        value: string;
        contractAddress: string;
        input: string;
        type: string;
        gas: string;
        gasUsed: string;
        traceId: string;
        isError: string;
        errCode: string;
    };
}

interface TronScanTransactionResponse {
    data: Array<{
        block: number;
        hash: string;
        timestamp: number;
        ownerAddress: string;
        toAddress: string;
        contractType: number;
        confirmed: boolean;
        contractData: {
            amount: number;
            asset_name: string;
            owner_address: string;
            to_address: string;
        };
        contractRet: string;
        cost: {
            net_fee: number;
            energy_usage: number;
            energy_fee: number;
            energy_usage_total: number;
        };
    }>;
}

interface TransactionVerificationResult {
    isValid: boolean;
    transactionDetails?: {
        from: string;
        to: string;
        value: string;
        valueInEther: number;
        blockNumber: string;
        timestamp: string;
        isError: boolean;
    };
    error?: string;
}

const BlockchainServiceObject = {
    /**
     * Get API configuration based on chain
     */
    getChainConfig(chain: BlockchainChain): { apiUrl: string; apiKey: string } {
        switch (chain) {
            case BlockchainChain.ETH:
                if (!process.env.ETHSCAN_API_TOKEN) {
                    throw new Error('ETHSCAN_API_TOKEN not configured');
                }
                return {
                    apiUrl: 'https://api.etherscan.io/api',
                    apiKey: process.env.ETHSCAN_API_TOKEN,
                };
            case BlockchainChain.BNB:
                if (!process.env.BSCSCAN_API_TOKEN) {
                    throw new Error('BSCSCAN_API_TOKEN not configured');
                }
                return {
                    apiUrl: 'https://api.bscscan.com/api',
                    apiKey: process.env.BSCSCAN_API_TOKEN,
                };
            case BlockchainChain.TRX:
                if (!process.env.TRONSCAN_API_TOKEN) {
                    throw new Error('TRONSCAN_API_TOKEN not configured');
                }
                return {
                    apiUrl: 'https://apilist.tronscanapi.com/api',
                    apiKey: process.env.TRONSCAN_API_TOKEN,
                };
            case BlockchainChain.SOL:
                if (!process.env.SOLSCAN_API_TOKEN) {
                    throw new Error('SOLSCAN_API_TOKEN not configured');
                }
                return {
                    apiUrl: 'https://api.solscan.io',
                    apiKey: process.env.SOLSCAN_API_TOKEN,
                };
            case BlockchainChain.POLYGON:
                if (!process.env.POLYGONSCAN_API_TOKEN) {
                    throw new Error('POLYGONSCAN_API_TOKEN not configured');
                }
                return {
                    apiUrl: 'https://api.polygonscan.com/api',
                    apiKey: process.env.POLYGONSCAN_API_TOKEN,
                };
            default:
                throw new Error('Unsupported blockchain');
        }
    },

    /**
     * Verify transaction on blockchain
     * @param chain - The blockchain to verify on (ETH, BNB, TRX)
     * @param transactionHash - The transaction hash to verify
     * @param expectedToAddress - The expected recipient address
     * @param expectedFromAddress - The expected sender address (optional)
     * @param expectedAmount - The expected amount (optional, for validation)
     */
    async verifyTransaction(
        chain: BlockchainChain,
        transactionHash: string,
        expectedToAddress: string,
        expectedFromAddress?: string,
        expectedAmount?: number
    ): Promise<TransactionVerificationResult> {
        try {
            if (chain === BlockchainChain.TRX) {
                return await this.verifyTronTransaction(
                    transactionHash,
                    expectedToAddress,
                    expectedFromAddress,
                    expectedAmount
                );
            }

            // For ETH and BNB (both use Etherscan-like API)
            const config = this.getChainConfig(chain);

            // Get transaction receipt using Etherscan/BscScan API
            const response = await axios.get<EtherscanTransactionResponse>(
                config.apiUrl,
                {
                    params: {
                        module: 'proxy',
                        action: 'eth_getTransactionByHash',
                        txhash: transactionHash,
                        apikey: config.apiKey,
                    },
                }
            );

            // Check if transaction exists
            if (!response.data.result) {
                return {
                    isValid: false,
                    error: 'Transaction not found on blockchain',
                };
            }

            const tx = response.data.result;

            // Check if transaction failed
            if (tx.isError === '1') {
                return {
                    isValid: false,
                    error: 'Transaction failed on blockchain',
                };
            }

            // Normalize addresses (lowercase for comparison)
            const toAddress = tx.to?.toLowerCase();
            const fromAddress = tx.from?.toLowerCase();
            const expectedTo = expectedToAddress.toLowerCase();
            const expectedFrom = expectedFromAddress?.toLowerCase();

            // Verify recipient address
            if (toAddress !== expectedTo) {
                return {
                    isValid: false,
                    error: `Recipient address mismatch. Expected: ${expectedTo}, Got: ${toAddress}`,
                };
            }

            // Verify sender address if provided
            if (expectedFrom && fromAddress !== expectedFrom) {
                return {
                    isValid: false,
                    error: `Sender address mismatch. Expected: ${expectedFrom}, Got: ${fromAddress}`,
                };
            }

            // Convert value from Wei to Ether/BNB
            const valueInWei = BigInt(tx.value);
            const valueInToken = Number(valueInWei) / 1e18;

            // Verify amount if provided (with small tolerance for gas/rounding)
            if (expectedAmount !== undefined) {
                const tolerance = 0.0001; // 0.01% tolerance
                const difference = Math.abs(valueInToken - expectedAmount);
                if (difference > tolerance) {
                    return {
                        isValid: false,
                        error: `Amount mismatch. Expected: ${expectedAmount}, Got: ${valueInToken}`,
                    };
                }
            }

            // Transaction is valid
            return {
                isValid: true,
                transactionDetails: {
                    from: tx.from,
                    to: tx.to,
                    value: tx.value,
                    valueInEther: valueInToken,
                    blockNumber: tx.blockNumber,
                    timestamp: tx.timeStamp,
                    isError: tx.isError === '1',
                },
            };
        } catch (error: any) {
            if (error.response?.status === 429) {
                throw createBadRequestError('Rate limit exceeded. Please try again later.');
            }
            throw createBadRequestError(
                error.message || 'Failed to verify transaction on blockchain'
            );
        }
    },

    /**
     * Verify Tron (TRX) transaction using TronScan API
     */
    async verifyTronTransaction(
        transactionHash: string,
        expectedToAddress: string,
        expectedFromAddress?: string,
        expectedAmount?: number
    ): Promise<TransactionVerificationResult> {
        try {
            const config = this.getChainConfig(BlockchainChain.TRX);

            // Get transaction details from TronScan
            const response = await axios.get<TronScanTransactionResponse>(
                `${config.apiUrl}/transaction-info`,
                {
                    params: {
                        hash: transactionHash,
                    },
                    headers: {
                        'TRON-PRO-API-KEY': config.apiKey,
                    },
                }
            );

            // Check if transaction exists
            if (!response.data.data || response.data.data.length === 0) {
                return {
                    isValid: false,
                    error: 'Transaction not found on Tron blockchain',
                };
            }

            const tx = response.data.data[0];

            // Check if transaction is confirmed
            if (!tx.confirmed) {
                return {
                    isValid: false,
                    error: 'Transaction not yet confirmed on Tron blockchain',
                };
            }

            // Check if transaction failed
            if (tx.contractRet !== 'SUCCESS') {
                return {
                    isValid: false,
                    error: 'Transaction failed on Tron blockchain',
                };
            }

            // Normalize addresses (Tron addresses are case-sensitive but we'll lowercase for comparison)
            const toAddress = tx.toAddress?.toLowerCase() || tx.contractData?.to_address?.toLowerCase();
            const fromAddress = tx.ownerAddress?.toLowerCase() || tx.contractData?.owner_address?.toLowerCase();
            const expectedTo = expectedToAddress.toLowerCase();
            const expectedFrom = expectedFromAddress?.toLowerCase();

            // Verify recipient address
            if (toAddress !== expectedTo) {
                return {
                    isValid: false,
                    error: `Recipient address mismatch. Expected: ${expectedTo}, Got: ${toAddress}`,
                };
            }

            // Verify sender address if provided
            if (expectedFrom && fromAddress !== expectedFrom) {
                return {
                    isValid: false,
                    error: `Sender address mismatch. Expected: ${expectedFrom}, Got: ${fromAddress}`,
                };
            }

            // Convert amount from Sun to TRX (1 TRX = 1,000,000 Sun)
            const amountInSun = tx.contractData?.amount || 0;
            const amountInTRX = amountInSun / 1e6;

            // Verify amount if provided
            if (expectedAmount !== undefined) {
                const tolerance = 0.0001; // 0.01% tolerance
                const difference = Math.abs(amountInTRX - expectedAmount);
                if (difference > tolerance) {
                    return {
                        isValid: false,
                        error: `Amount mismatch. Expected: ${expectedAmount} TRX, Got: ${amountInTRX} TRX`,
                    };
                }
            }

            // Transaction is valid
            return {
                isValid: true,
                transactionDetails: {
                    from: fromAddress || '',
                    to: toAddress || '',
                    value: amountInSun.toString(),
                    valueInEther: amountInTRX,
                    blockNumber: tx.block?.toString() || '',
                    timestamp: tx.timestamp?.toString() || '',
                    isError: false,
                },
            };
        } catch (error: any) {
            if (error.response?.status === 429) {
                throw createBadRequestError('Rate limit exceeded. Please try again later.');
            }
            throw createBadRequestError(
                error.message || 'Failed to verify transaction on Tron blockchain'
            );
        }
    },

    /**
     * Verify ERC-20/BEP-20/TRC-20 token transaction (USDT, USDC, etc.)
     */
    async verifyTokenTransaction(
        chain: BlockchainChain,
        transactionHash: string,
        expectedToAddress: string,
        tokenContractAddress: string,
        expectedFromAddress?: string
    ): Promise<TransactionVerificationResult> {
        try {
            if (chain === BlockchainChain.TRX) {
                // TRC-20 token verification uses the same API as TRX
                return await this.verifyTronTransaction(
                    transactionHash,
                    expectedToAddress,
                    expectedFromAddress
                );
            }

            // For ETH and BNB (both use Etherscan-like API for ERC-20/BEP-20)
            const config = this.getChainConfig(chain);

            // Get transaction receipt
            const receiptResponse = await axios.get(
                config.apiUrl,
                {
                    params: {
                        module: 'proxy',
                        action: 'eth_getTransactionReceipt',
                        txhash: transactionHash,
                        apikey: config.apiKey,
                    },
                }
            );

            const receipt = receiptResponse.data.result;

            if (!receipt) {
                return {
                    isValid: false,
                    error: 'Transaction not found on blockchain',
                };
            }

            // Check transaction status (0x1 = success, 0x0 = failed)
            if (receipt.status === '0x0') {
                return {
                    isValid: false,
                    error: 'Transaction failed on blockchain',
                };
            }

            // For token transfers, we need to decode logs
            // Token transfers emit a Transfer event with topic0 = keccak256("Transfer(address,address,uint256)")
            const transferEventTopic =
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

            const transferLog = receipt.logs?.find(
                (log: any) =>
                    log.topics[0] === transferEventTopic &&
                    log.address.toLowerCase() === tokenContractAddress.toLowerCase()
            );

            if (!transferLog) {
                return {
                    isValid: false,
                    error: 'Token transfer event not found in transaction',
                };
            }

            // Decode addresses from topics (topics[1] = from, topics[2] = to)
            const fromAddressHex = '0x' + transferLog.topics[1].slice(26);
            const toAddressHex = '0x' + transferLog.topics[2].slice(26);

            // Verify addresses
            if (toAddressHex.toLowerCase() !== expectedToAddress.toLowerCase()) {
                return {
                    isValid: false,
                    error: `Recipient address mismatch. Expected: ${expectedToAddress}, Got: ${toAddressHex}`,
                };
            }

            if (expectedFromAddress && fromAddressHex.toLowerCase() !== expectedFromAddress.toLowerCase()) {
                return {
                    isValid: false,
                    error: `Sender address mismatch. Expected: ${expectedFromAddress}, Got: ${fromAddressHex}`,
                };
            }

            // Decode amount from data (for most ERC-20 tokens with 6 decimals like USDT)
            const amountHex = transferLog.data;
            const amountInSmallestUnit = BigInt(amountHex);
            const amountInTokens = Number(amountInSmallestUnit) / 1e6; // Assuming 6 decimals (USDT/USDC)

            return {
                isValid: true,
                transactionDetails: {
                    from: fromAddressHex,
                    to: toAddressHex,
                    value: amountHex,
                    valueInEther: amountInTokens,
                    blockNumber: receipt.blockNumber,
                    timestamp: receipt.timeStamp || '',
                    isError: false,
                },
            };
        } catch (error: any) {
            if (error.response?.status === 429) {
                throw createBadRequestError('Rate limit exceeded. Please try again later.');
            }
            throw createBadRequestError(
                error.message || 'Failed to verify token transaction on blockchain'
            );
        }
    },

    /**
     * Verify Solana (SOL) transaction using Solscan API
     */
    async verifySolanaTransaction(
        transactionHash: string,
        expectedToAddress: string,
        expectedFromAddress?: string,
        expectedAmount?: number
    ): Promise<TransactionVerificationResult> {
        try {
            const config = this.getChainConfig(BlockchainChain.SOL);

            // Get transaction details from Solscan
            const response = await axios.get(
                `${config.apiUrl}/transaction`,
                {
                    params: {
                        tx: transactionHash,
                    },
                    headers: {
                        'token': config.apiKey,
                    },
                }
            );

            if (!response.data || !response.data.success) {
                return {
                    isValid: false,
                    error: 'Transaction not found on Solana blockchain',
                };
            }

            const tx = response.data.data;

            // Check if transaction succeeded
            if (tx.err !== null) {
                return {
                    isValid: false,
                    error: 'Transaction failed on Solana blockchain',
                };
            }

            // Find the transfer instruction
            const transferInstruction = tx.parsedInstruction?.find(
                (inst: any) => inst.type === 'transfer' || inst.program === 'system'
            );

            if (!transferInstruction) {
                return {
                    isValid: false,
                    error: 'Transfer instruction not found in transaction',
                };
            }

            // Extract addresses from transaction
            const toAddress = transferInstruction.parsed?.info?.destination || 
                            transferInstruction.parsed?.info?.to ||
                            expectedToAddress;
            const fromAddress = transferInstruction.parsed?.info?.source ||
                              transferInstruction.parsed?.info?.from ||
                              expectedFromAddress;

            // Normalize addresses (Solana addresses are base58)
            const normalizedTo = toAddress?.toLowerCase();
            const normalizedExpectedTo = expectedToAddress.toLowerCase();

            // Verify recipient address
            if (normalizedTo !== normalizedExpectedTo) {
                return {
                    isValid: false,
                    error: `Recipient address mismatch. Expected: ${expectedToAddress}, Got: ${toAddress}`,
                };
            }

            // Verify sender address if provided
            if (expectedFromAddress && fromAddress?.toLowerCase() !== expectedFromAddress.toLowerCase()) {
                return {
                    isValid: false,
                    error: `Sender address mismatch. Expected: ${expectedFromAddress}, Got: ${fromAddress}`,
                };
            }

            // Extract amount (in lamports, 1 SOL = 1,000,000,000 lamports)
            const amountInLamports = transferInstruction.parsed?.info?.lamports || 
                                    transferInstruction.parsed?.info?.amount || 0;
            const amountInSOL = amountInLamports / 1e9;

            // Verify amount if provided
            if (expectedAmount !== undefined) {
                const tolerance = 0.0001; // 0.01% tolerance
                const difference = Math.abs(amountInSOL - expectedAmount);
                if (difference > tolerance) {
                    return {
                        isValid: false,
                        error: `Amount mismatch. Expected: ${expectedAmount} SOL, Got: ${amountInSOL} SOL`,
                    };
                }
            }

            return {
                isValid: true,
                transactionDetails: {
                    from: fromAddress || '',
                    to: toAddress || '',
                    value: amountInLamports.toString(),
                    valueInEther: amountInSOL,
                    blockNumber: tx.slot?.toString() || '',
                    timestamp: tx.blockTime?.toString() || '',
                    isError: false,
                },
            };
        } catch (error: any) {
            if (error.response?.status === 429) {
                throw createBadRequestError('Rate limit exceeded. Please try again later.');
            }
            throw createBadRequestError(
                error.message || 'Failed to verify transaction on Solana blockchain'
            );
        }
    },

    /**
     * Verify Polygon transaction using PolygonScan API (similar to Etherscan)
     */
    async verifyPolygonTransaction(
        transactionHash: string,
        expectedToAddress: string,
        expectedFromAddress?: string,
        expectedAmount?: number
    ): Promise<TransactionVerificationResult> {
        try {
            const config = this.getChainConfig(BlockchainChain.POLYGON);

            // Polygon uses Etherscan-like API
            const response = await axios.get(
                config.apiUrl,
                {
                    params: {
                        module: 'proxy',
                        action: 'eth_getTransactionByHash',
                        txhash: transactionHash,
                        apikey: config.apiKey,
                    },
                }
            );

            // Check if transaction exists
            if (!response.data.result) {
                return {
                    isValid: false,
                    error: 'Transaction not found on Polygon blockchain',
                };
            }

            const tx = response.data.result;

            // Check if transaction failed
            if (tx.isError === '1') {
                return {
                    isValid: false,
                    error: 'Transaction failed on Polygon blockchain',
                };
            }

            // Normalize addresses (lowercase for comparison)
            const toAddress = tx.to?.toLowerCase();
            const fromAddress = tx.from?.toLowerCase();
            const expectedTo = expectedToAddress.toLowerCase();
            const expectedFrom = expectedFromAddress?.toLowerCase();

            // Verify recipient address
            if (toAddress !== expectedTo) {
                return {
                    isValid: false,
                    error: `Recipient address mismatch. Expected: ${expectedTo}, Got: ${toAddress}`,
                };
            }

            // Verify sender address if provided
            if (expectedFrom && fromAddress !== expectedFrom) {
                return {
                    isValid: false,
                    error: `Sender address mismatch. Expected: ${expectedFrom}, Got: ${fromAddress}`,
                };
            }

            // Convert value from Wei to MATIC (1 MATIC = 1e18 Wei)
            const valueInWei = BigInt(tx.value);
            const valueInToken = Number(valueInWei) / 1e18;

            // Verify amount if provided (with small tolerance for gas/rounding)
            if (expectedAmount !== undefined) {
                const tolerance = 0.0001; // 0.01% tolerance
                const difference = Math.abs(valueInToken - expectedAmount);
                if (difference > tolerance) {
                    return {
                        isValid: false,
                        error: `Amount mismatch. Expected: ${expectedAmount}, Got: ${valueInToken}`,
                    };
                }
            }

            // Transaction is valid
            return {
                isValid: true,
                transactionDetails: {
                    from: tx.from,
                    to: tx.to,
                    value: tx.value,
                    valueInEther: valueInToken,
                    blockNumber: tx.blockNumber,
                    timestamp: tx.timeStamp,
                    isError: tx.isError === '1',
                },
            };
        } catch (error: any) {
            if (error.response?.status === 429) {
                throw createBadRequestError('Rate limit exceeded. Please try again later.');
            }
            throw createBadRequestError(
                error.message || 'Failed to verify transaction on Polygon blockchain'
            );
        }
    },
};

export default BlockchainServiceObject;

