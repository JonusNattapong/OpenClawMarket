'use client';

import { useMarket } from "@/context/MarketContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WalletPage() {
    const { user, isConnected, transactions, topUp, withdraw, refreshTransactions, isLoading } = useMarket();
    const router = useRouter();
    const [tab, setTab] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
    const [amount, setAmount] = useState<string>('');
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Load transactions when component mounts
    useEffect(() => {
        if (isConnected) {
            refreshTransactions();
        }
    }, [isConnected, refreshTransactions]);

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

        if (tab === 'DEPOSIT' && val > 10000) {
            setMessage({ type: 'error', text: 'Maximum deposit is 10,000 USD' });
            return;
        }

        setProcessing(true);
        setMessage(null);

        try {
            const result = tab === 'DEPOSIT' ? await topUp(val) : await withdraw(val);
            setMessage({
                type: result.success ? 'success' : 'error',
                text: result.message
            });

            if (result.success) {
                setAmount('');
                // Refresh transactions after successful operation
                await refreshTransactions();
            }
        } catch {
            setMessage({ type: 'error', text: 'Network error. Please check your connection and try again.' });
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
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Amount ({tab === 'DEPOSIT' ? 'USD' : 'Shells'})</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="w-full bg-[var(--color-ocean-dark)] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[var(--color-tech-cyan)] font-mono text-lg"
                                        placeholder="0.00"
                                        min="0"
                                    />
                                    <span className="absolute right-4 top-3.5 text-gray-500 text-sm font-bold">{tab === 'DEPOSIT' ? 'USD' : 'SHELL'}</span>
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
                                {tab === 'DEPOSIT' ? 'Confirm Payment' : 'Request Withdrawal'}
                            </button>
                        </div>
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
