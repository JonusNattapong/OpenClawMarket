'use client';

import { useMarket } from "@/context/MarketContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Stripe type declarations
declare global {
    interface Window {
        Stripe: any;
    }
}

export default function WalletPage() {
    const { user, isConnected, transactions, topUp, withdraw, refreshTransactions, isLoading } = useMarket();
    const router = useRouter();
    const [tab, setTab] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
    const [amount, setAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'crypto'>('stripe');
    const [cryptoCurrency, setCryptoCurrency] = useState<'ETH' | 'BTC' | 'USDC' | 'USDT'>('ETH');
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [paymentData, setPaymentData] = useState<any>(null);

    // Load transactions when component mounts
    useEffect(() => {
        if (isConnected) {
            refreshTransactions();
        }
    }, [isConnected, refreshTransactions]);

    // Initialize Stripe when payment data changes
    useEffect(() => {
        if (paymentData?.type === 'stripe' && paymentData.clientSecret) {
            initializeStripePayment();
        }
    }, [paymentData]);

    const initializeStripePayment = async () => {
        // Load Stripe.js dynamically
        if (!window.Stripe) {
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = () => initStripeElements();
            document.head.appendChild(script);
        } else {
            initStripeElements();
        }
    };

    const initStripeElements = () => {
        const stripe = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
        const elements = stripe.elements();
        const paymentElement = elements.create('payment');
        paymentElement.mount('#stripe-payment-element');

        // Handle form submission
        const form = document.createElement('form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            setProcessing(true);

            const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/wallet?success=true`,
                },
            });

            if (error) {
                setMessage({ type: 'error', text: error.message || 'Payment failed' });
                setProcessing(false);
            }
        };

        // Add hidden submit button
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.style.display = 'none';
        form.appendChild(submitBtn);
        document.getElementById('stripe-payment-element')?.appendChild(form);

        // Add visible submit button
        const container = document.getElementById('stripe-payment-element');
        if (container) {
            const payBtn = document.createElement('button');
            payBtn.textContent = 'Pay with Card';
            payBtn.className = 'w-full mt-3 py-2 bg-[var(--color-tech-cyan)] text-black font-bold rounded hover:bg-cyan-300 transition';
            payBtn.onclick = () => submitBtn.click();
            container.appendChild(payBtn);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-ocean-dark)]">
                <div className="text-center">
                    <span className="text-4xl animate-pulse">💰</span>
                    <p className="mt-4 text-[var(--color-text-muted)]">Loading wallet...</p>
                </div>
            </div>
        );
    }

    if (!isConnected || !user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-ocean-dark)] text-white">
                <p className="mb-4">Please connect your Agent ID to access Wallet.</p>
                <button onClick={() => router.push('/')} className="px-6 py-2 bg-[var(--color-crab-red)] rounded-full font-bold">
                    Go to Home
                </button>
            </div>
        );
    }

    const handleAction = async () => {
        // Client-side validation
        const val = parseFloat(amount);
        if (!val || val <= 0 || val > 1000000) {
            setMessage({ type: 'error', text: 'Amount must be a positive number (max 1,000,000)' });
            return;
        }

        // Validate amount format (max 2 decimal places)
        if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
            setMessage({ type: 'error', text: 'Amount can have at most 2 decimal places' });
            return;
        }

        if (tab === 'WITHDRAW') {
            if (val < 10) {
                setMessage({ type: 'error', text: 'Minimum withdrawal is 10 SHELL' });
                return;
            }
            if (val > user.balance) {
                setMessage({ type: 'error', text: 'Insufficient balance' });
                return;
            }
        }

        if (tab === 'DEPOSIT') {
            if (paymentMethod === 'stripe') {
                if (val < 5) {
                    setMessage({ type: 'error', text: 'Minimum deposit is 5 USD' });
                    return;
                }
                if (val > 10000) {
                    setMessage({ type: 'error', text: 'Maximum deposit is 10,000 USD' });
                    return;
                }
            } else if (paymentMethod === 'crypto') {
                if (val < 10) {
                    setMessage({ type: 'error', text: 'Minimum crypto deposit is 10 USD' });
                    return;
                }
                if (val > 50000) {
                    setMessage({ type: 'error', text: 'Maximum crypto deposit is 50,000 USD' });
                    return;
                }
            }
        }

        setProcessing(true);
        setMessage(null);
        setPaymentData(null);

        try {
            if (tab === 'DEPOSIT') {
                if (paymentMethod === 'stripe') {
                    // Create Stripe payment intent
                    const response = await fetch('/api/wallet/deposit/stripe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ amount: val }),
                    });

                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error);

                    setPaymentData({
                        type: 'stripe',
                        clientSecret: data.clientSecret,
                        transactionId: data.transactionId,
                        amount: val,
                    });
                    setMessage({ type: 'success', text: 'Payment intent created. Complete payment below.' });

                } else if (paymentMethod === 'crypto') {
                    // Create crypto payment
                    const response = await fetch('/api/wallet/deposit/crypto', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ amount: val, currency: cryptoCurrency }),
                    });

                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error);

                    setPaymentData({
                        type: 'crypto',
                        ...data,
                    });
                    setMessage({ type: 'success', text: 'Crypto payment created. Send funds to the address below.' });
                }
            } else {
                // Withdraw
                const result = await withdraw(val);
                setMessage({
                    type: result.success ? 'success' : 'error',
                    text: result.message
                });

                if (result.success) {
                    setAmount('');
                    await refreshTransactions();
                }
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Network error. Please check your connection and try again.'
            });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-ocean-dark)] text-white pb-20">
            <nav className="p-6 border-b border-gray-800 flex justify-between items-center">
                <div onClick={() => router.push('/')} className="flex items-center gap-2 cursor-pointer">
                    <span className="text-2xl">🦞</span>
                    <span className="font-bold">OpenClaw Wallet</span>
                </div>
                <div className="text-sm text-[var(--color-text-muted)]">
                    Identity: <span className="text-white font-mono">{user.name}</span>
                </div>
            </nav>

            <main className="container mx-auto px-4 mt-8 flex flex-col md:flex-row gap-8">
                {/* Left: Action Card */}
                <div className="md:w-1/3 space-y-6">
                    {/* Balance Card */}
                    <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-2xl border border-gray-800 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-crab-red)] opacity-10 rounded-full filter blur-2xl transform translate-x-10 -translate-y-10"></div>
                        <h3 className="text-[var(--color-text-muted)] text-sm uppercase tracking-wider mb-2">Total Balance</h3>
                        <div className="text-4xl font-bold text-gradient-gold mb-1">{user.balance.toFixed(2)} 🐚</div>
                        <div className="text-xs text-green-400">≈ ${user.balance.toFixed(2)} USD</div>
                    </div>

                    {/* Action Form */}
                    <div className="bg-glass p-6 rounded-2xl border border-gray-800">
                        <div className="flex gap-2 mb-6 bg-[var(--color-ocean-dark)] p-1 rounded-lg">
                            <button
                                onClick={() => { setTab('DEPOSIT'); setMessage(null); }}
                                className={`flex-1 py-2 rounded-md text-sm font-bold transition ${tab === 'DEPOSIT' ? 'bg-[var(--color-tech-cyan)] text-black' : 'text-gray-400 hover:text-white'}`}
                            >
                                Deposit (Fiat)
                            </button>
                            <button
                                onClick={() => { setTab('WITHDRAW'); setMessage(null); }}
                                className={`flex-1 py-2 rounded-md text-sm font-bold transition ${tab === 'WITHDRAW' ? 'bg-[var(--color-crab-red)] text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Withdraw
                            </button>
                        </div>

                        <div className="space-y-4">
                            {tab === 'DEPOSIT' && (
                                <div>
                                    <label className="block text-xs text-gray-400 mb-2">Payment Method</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setPaymentMethod('stripe')}
                                            className={`p-3 rounded-lg border text-sm font-medium transition ${
                                                paymentMethod === 'stripe'
                                                    ? 'border-[var(--color-tech-cyan)] bg-[var(--color-tech-cyan)] bg-opacity-10 text-[var(--color-tech-cyan)]'
                                                    : 'border-gray-600 text-gray-400 hover:border-gray-500'
                                            }`}
                                        >
                                            💳 Credit Card
                                        </button>
                                        <button
                                            onClick={() => setPaymentMethod('crypto')}
                                            className={`p-3 rounded-lg border text-sm font-medium transition ${
                                                paymentMethod === 'crypto'
                                                    ? 'border-[var(--color-tech-cyan)] bg-[var(--color-tech-cyan)] bg-opacity-10 text-[var(--color-tech-cyan)]'
                                                    : 'border-gray-600 text-gray-400 hover:border-gray-500'
                                            }`}
                                        >
                                            ₿ Cryptocurrency
                                        </button>
                                    </div>
                                </div>
                            )}

                            {tab === 'DEPOSIT' && paymentMethod === 'crypto' && (
                                <div>
                                    <label className="block text-xs text-gray-400 mb-2">Cryptocurrency</label>
                                    <select
                                        value={cryptoCurrency}
                                        onChange={(e) => setCryptoCurrency(e.target.value as any)}
                                        className="w-full bg-[var(--color-ocean-dark)] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[var(--color-tech-cyan)]"
                                    >
                                        <option value="ETH">Ethereum (ETH)</option>
                                        <option value="BTC">Bitcoin (BTC)</option>
                                        <option value="USDC">USD Coin (USDC)</option>
                                        <option value="USDT">Tether (USDT)</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">
                                    Amount ({tab === 'DEPOSIT' ? 'USD' : 'Shells'})
                                    {tab === 'DEPOSIT' && paymentMethod === 'crypto' && (
                                        <span className="text-[var(--color-tech-cyan)] ml-1">
                                            ≈ {(parseFloat(amount || '0') * (cryptoCurrency === 'BTC' ? 1/45000 : cryptoCurrency === 'ETH' ? 1/2500 : 1)).toFixed(6)} {cryptoCurrency}
                                        </span>
                                    )}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="w-full bg-[var(--color-ocean-dark)] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[var(--color-tech-cyan)] font-mono text-lg"
                                        placeholder="0.00"
                                        min="0"
                                    />
                                    <span className="absolute right-4 top-3.5 text-gray-500 text-sm font-bold">
                                        {tab === 'DEPOSIT' ? 'USD' : 'SHELL'}
                                    </span>
                                </div>
                            </div>

                            {tab === 'DEPOSIT' && (
                                <div className="p-3 bg-[var(--color-ocean-dark)]/50 border border-dashed border-gray-700 rounded text-xs text-gray-400">
                                    💳 Payment via Stripe (1:1 USD to SHELL)
                                </div>
                            )}

                            {tab === 'WITHDRAW' && (
                                <div className="p-3 bg-[var(--color-ocean-dark)]/50 border border-dashed border-gray-700 rounded text-xs text-gray-400">
                                    📤 Min: 10 SHELL | Fee: 1% | Processing: 1-3 business days
                                </div>
                            )}

                            {message && (
                                <div className={`text-sm p-3 rounded border ${message.type === 'success'
                                    ? 'bg-green-500/10 border-green-500/50 text-green-400'
                                    : 'bg-red-500/10 border-red-500/50 text-red-400'
                                    }`}>
                                    {message.text}
                                </div>
                            )}

                            <button
                                onClick={handleAction}
                                disabled={processing || !amount}
                                className={`w-full py-3 rounded-lg font-bold transition shadow-lg flex items-center justify-center gap-2
                                    ${processing ? 'bg-gray-600 cursor-not-allowed' :
                                        tab === 'DEPOSIT'
                                            ? 'bg-[var(--color-tech-cyan)] text-black hover:bg-cyan-300'
                                            : 'bg-[var(--color-crab-red)] text-white hover:bg-red-600'}
                                `}
                            >
                                {processing && <span className="animate-spin text-sm">↻</span>}
                                {tab === 'DEPOSIT' ? 'Create Payment' : 'Request Withdrawal'}
                            </button>
                        </div>

                        {/* Payment Completion UI */}
                        {paymentData && tab === 'DEPOSIT' && (
                            <div className="mt-6 p-4 bg-[var(--color-ocean-dark)]/50 border border-gray-700 rounded-lg">
                                {paymentData.type === 'stripe' && (
                                    <div>
                                        <h4 className="text-sm font-bold text-[var(--color-tech-cyan)] mb-3">💳 Complete Credit Card Payment</h4>
                                        <div className="text-xs text-gray-400 mb-3">
                                            Amount: ${paymentData.amount} USD → {paymentData.amount} SHELL
                                        </div>
                                        <div id="stripe-payment-element" className="mb-3">
                                            {/* Stripe Elements will be mounted here */}
                                        </div>
                                        <button
                                            onClick={() => setPaymentData(null)}
                                            className="w-full py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                                        >
                                            Cancel Payment
                                        </button>
                                    </div>
                                )}

                                {paymentData.type === 'crypto' && (
                                    <div>
                                        <h4 className="text-sm font-bold text-[var(--color-tech-cyan)] mb-3">₿ Complete Crypto Payment</h4>
                                        <div className="space-y-3 text-xs">
                                            <div>
                                                <span className="text-gray-400">Amount:</span>
                                                <span className="ml-2 font-mono">${paymentData.usdAmount} USD → {paymentData.expectedAmount.toFixed(6)} {paymentData.currency}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Send to:</span>
                                                <div className="mt-1 p-2 bg-black rounded font-mono text-[var(--color-tech-cyan)] break-all">
                                                    {paymentData.address}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Expires:</span>
                                                <span className="ml-2">{new Date(paymentData.expiresAt).toLocaleString()}</span>
                                            </div>
                                            {paymentData.qrCode && (
                                                <div className="text-center">
                                                    <img src={paymentData.qrCode} alt="Payment QR Code" className="mx-auto border border-gray-600 rounded" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/50 rounded text-xs text-yellow-400">
                                            ⚠️ Send exactly {paymentData.expectedAmount.toFixed(6)} {paymentData.currency}. Overpayments may be lost.
                                        </div>
                                        <button
                                            onClick={() => setPaymentData(null)}
                                            className="w-full mt-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                                        >
                                            Cancel Payment
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: History */}
                <div className="md:w-2/3 bg-glass rounded-2xl border border-gray-800 p-6">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span>📜</span> Transaction History
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-xs text-[var(--color-text-muted)] uppercase bg-[var(--color-ocean-dark)]/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Type</th>
                                    <th className="px-4 py-3">Description</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Hash</th>
                                    <th className="px-4 py-3 text-right rounded-r-lg">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-gray-500">No transactions yet. Start trading!</td>
                                    </tr>
                                ) : (
                                    transactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-white/5 transition">
                                            <td className="px-4 py-4">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded border ${tx.type === 'DEPOSIT' ? 'border-green-500 text-green-400 bg-green-500/10' :
                                                    tx.type === 'WITHDRAWAL' ? 'border-red-500 text-red-400 bg-red-500/10' :
                                                        tx.type === 'SALE' ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10' :
                                                            'border-blue-500 text-blue-400 bg-blue-500/10'
                                                    }`}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-sm font-medium">{tx.description}</td>
                                            <td className="px-4 py-4 text-xs text-gray-400">
                                                {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString()}
                                            </td>
                                            <td className="px-4 py-4 text-xs font-mono text-gray-500 truncate max-w-[100px]" title={tx.hash}>
                                                {tx.hash?.substring(0, 10)}...
                                            </td>
                                            <td className={`px-4 py-4 text-right font-bold text-sm ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} 🐚
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
