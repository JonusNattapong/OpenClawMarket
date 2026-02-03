'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMarket, Listing } from '@/context/MarketContext';

// Unwrap params for Next.js 15+
export default function ListingDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { user, buyItem, isConnected } = useMarket();
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Fetch listing from API
    useEffect(() => {
        async function fetchListing() {
            try {
                const res = await fetch(`/api/listings/${id}`);
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                const data = await res.json();

                if (data.listing) {
                    setListing(data.listing);
                } else {
                    throw new Error('Listing not found');
                }
            } catch (error) {
                console.error('Failed to fetch listing:', error);
                setMessage({
                    type: 'error',
                    text: error instanceof Error ? error.message : 'Failed to load listing'
                });
            } finally {
                setLoading(false);
            }
        }

        fetchListing();
    }, [id]);

    const handleBuy = async () => {
        if (!isConnected) {
            router.push('/');
            return;
        }

        if (!listing) return;

        if (!confirm(`Confirm purchase of "${listing.title}" for ${listing.price} Shells?`)) {
            return;
        }

        setBuying(true);
        setMessage(null);

        try {
            const result = await buyItem(id);

            setMessage({
                type: result.success ? 'success' : 'error',
                text: result.message
            });

            if (result.success) {
                // Refresh to show purchased state
                setTimeout(() => router.push('/'), 2000);
            }
        } catch {
            setMessage({
                type: 'error',
                text: 'Network error. Please check your connection and try again.'
            });
        } finally {
            setBuying(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-ocean-dark)]">
                <div className="text-center">
                    <span className="text-6xl animate-pulse">📦</span>
                    <p className="mt-4 text-[var(--color-text-muted)]">Loading item...</p>
                </div>
            </div>
        );
    }

    if (!listing) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-ocean-dark)] text-white">
                <span className="text-6xl mb-4">🔍</span>
                <p className="text-xl mb-4">Item not found</p>
                <button onClick={() => router.push('/')} className="px-6 py-2 bg-[var(--color-crab-red)] rounded-full font-bold">
                    Back to Market
                </button>
            </div>
        );
    }

    const isOwner = user?.inventory.includes(listing.id);
    const isSeller = user?.id === listing.seller.id;

    return (
        <div className="min-h-screen bg-[var(--color-ocean-dark)] text-white pb-20">
            <nav className="p-6 border-b border-gray-800 flex justify-between">
                <button onClick={() => router.back()} className="text-[var(--color-text-muted)] hover:text-white flex items-center gap-2">
                    ← Back
                </button>
                <div className="font-mono text-sm text-gray-500">ID: {id.substring(0, 12)}...</div>
            </nav>

            <main className="container mx-auto px-4 mt-10 max-w-4xl">
                <div className="bg-glass rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col md:flex-row">
                    {/* Left: Image/Preview */}
                    <div className="md:w-1/2 bg-[var(--color-ocean-light)] p-10 flex items-center justify-center relative">
                        <div className="text-9xl animate-pulse">
                            {getCategoryEmoji(listing.category)}
                        </div>
                    </div>

                    {/* Right: Info */}
                    <div className="md:w-1/2 p-8 flex flex-col">
                        <div className="mb-2">
                            <span className="bg-[var(--color-tech-cyan)] text-black text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                                {listing.category}
                            </span>
                            {listing.purchaseCount !== undefined && listing.purchaseCount > 0 && (
                                <span className="ml-2 text-xs text-gray-400">
                                    {listing.purchaseCount} sold
                                </span>
                            )}
                        </div>

                        <h1 className="text-3xl font-bold mb-4 leading-tight">{listing.title}</h1>

                        <div className="flex items-center gap-4 mb-6 text-sm text-[var(--color-text-muted)] border-b border-gray-700 pb-4">
                            <div className="flex items-center gap-2">
                                <span>Seller:</span>
                                <span className="font-bold text-white">{listing.seller.name}</span>
                                {listing.seller.verified && <span className="text-blue-400">✓</span>}
                            </div>
                            <div>Rep: <span className="text-green-400">{listing.seller.reputation}%</span></div>
                        </div>

                        <p className="text-gray-300 leading-relaxed mb-8 flex-grow">
                            {listing.description}
                        </p>

                        <div className="bg-[var(--color-ocean-dark)] p-4 rounded-lg mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[var(--color-text-muted)]">Price</span>
                                <span className="text-2xl font-bold text-gradient-gold">{listing.price} SHELL</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                                <span>≈ ${(listing.price * 1.0).toFixed(2)} USD</span>
                                <span>Gas: 0.00 SHELL (Sponsored)</span>
                            </div>
                        </div>

                        {message && (
                            <div className={`mb-4 p-3 rounded border text-sm ${message.type === 'success'
                                ? 'bg-green-500/10 border-green-500/50 text-green-400'
                                : 'bg-red-500/10 border-red-500/50 text-red-400'
                                }`}>
                                {message.text}
                            </div>
                        )}

                        {isSeller ? (
                            <button disabled className="w-full py-4 bg-gray-600/20 text-gray-400 font-bold rounded-lg border border-gray-600 cursor-default">
                                📦 This is your listing
                            </button>
                        ) : isOwner ? (
                            <button disabled className="w-full py-4 bg-green-600/20 text-green-400 font-bold rounded-lg border border-green-600 cursor-default">
                                ✓ Purchased & Access Granted
                            </button>
                        ) : (
                            <button
                                onClick={handleBuy}
                                disabled={buying}
                                className={`w-full py-4 font-bold rounded-lg transition text-lg shadow-lg
                                ${buying ? 'bg-gray-600' : 'bg-[var(--color-crab-red)] hover:bg-[var(--color-crab-dark)] hover:scale-[1.02]'}
                            `}
                            >
                                {buying ? '⏳ Processing...' : `Buy Now for ${listing.price} 🐚`}
                            </button>
                        )}

                        {!isConnected && !isOwner && (
                            <p className="text-center text-xs text-gray-500 mt-2">
                                *You need to connect an Agent ID first.
                            </p>
                        )}
                    </div>
                </div>

                {/* Tags */}
                <div className="mt-8 flex flex-wrap gap-2">
                    {listing.tags.map(tag => (
                        <span key={tag} className="text-xs font-mono text-[var(--color-text-muted)] bg-glass px-3 py-1 rounded-full">
                            #{tag}
                        </span>
                    ))}
                </div>

                {/* Created date */}
                <div className="mt-4 text-xs text-gray-500">
                    Listed: {new Date(listing.createdAt).toLocaleDateString()} at {new Date(listing.createdAt).toLocaleTimeString()}
                </div>
            </main>
        </div>
    );
}

function getCategoryEmoji(category: string) {
    switch (category) {
        case 'Knowledge': return '🧠';
        case 'Service': return '🔧';
        case 'Compute': return '⚡';
        case 'Data': return '💾';
        case 'Access': return '🔑';
        case 'Art': return '🎨';
        default: return '📦';
    }
}
