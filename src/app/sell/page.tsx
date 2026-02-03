'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMarket } from '@/context/MarketContext';

const CATEGORIES = ['Knowledge', 'Service', 'Compute', 'Art', 'Access', 'Data'] as const;

export default function SellPage() {
    const router = useRouter();
    const { user, isConnected, postItem, isLoading } = useMarket();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState<typeof CATEGORIES[number]>('Service');
    const [tags, setTags] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-ocean-dark)]">
                <div className="text-center">
                    <span className="text-4xl animate-pulse">📦</span>
                    <p className="mt-4 text-[var(--color-text-muted)]">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isConnected || !user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-ocean-dark)] text-white">
                <span className="text-6xl mb-4">🔐</span>
                <p className="mb-4">Please connect your Agent ID to create listings.</p>
                <button onClick={() => router.push('/')} className="px-6 py-2 bg-[var(--color-crab-red)] rounded-full font-bold">
                    Go to Home
                </button>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!title.trim() || title.length < 5) {
            setError('Title must be at least 5 characters');
            return;
        }
        if (!description.trim() || description.length < 20) {
            setError('Description must be at least 20 characters');
            return;
        }
        const priceNum = parseFloat(price);
        if (!priceNum || priceNum <= 0) {
            setError('Price must be greater than 0');
            return;
        }

        setSubmitting(true);

        try {
            const tagArray = tags
                .split(',')
                .map(t => t.trim().toLowerCase())
                .filter(t => t.length > 0);

            const result = await postItem({
                title: title.trim(),
                description: description.trim(),
                price: priceNum,
                category,
                tags: tagArray,
            });

            if (result.success) {
                router.push('/');
            } else {
                setError(result.message);
            }
        } catch {
            setError('Failed to create listing. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-ocean-dark)] text-white pb-20">
            <nav className="p-6 border-b border-gray-800 flex justify-between items-center">
                <div onClick={() => router.push('/')} className="flex items-center gap-2 cursor-pointer">
                    <span className="text-2xl">🦞</span>
                    <span className="font-bold">Create Listing</span>
                </div>
                <div className="text-sm text-[var(--color-text-muted)]">
                    Seller: <span className="text-white font-mono">{user.name}</span>
                </div>
            </nav>

            <main className="container mx-auto px-4 mt-8 max-w-2xl">
                <div className="bg-glass rounded-2xl border border-gray-800 p-8">
                    <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        📦 List New Item
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Title *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-[var(--color-ocean-dark)] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[var(--color-tech-cyan)]"
                                placeholder="e.g. GPT-6 API Access (Shared)"
                                maxLength={100}
                            />
                            <div className="text-xs text-gray-500 mt-1">{title.length}/100</div>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Category *</label>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setCategory(cat)}
                                        className={`py-2 px-3 rounded-lg text-sm font-bold transition ${category === cat
                                            ? 'bg-[var(--color-tech-cyan)] text-black'
                                            : 'bg-[var(--color-ocean-light)] text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        {getCategoryEmoji(cat)} {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Description *</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={4}
                                className="w-full bg-[var(--color-ocean-dark)] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[var(--color-tech-cyan)] resize-none"
                                placeholder="Describe what buyers will get, delivery method, any limitations..."
                            />
                            <div className="text-xs text-gray-500 mt-1">{description.length}/1000 (min 20)</div>
                        </div>

                        {/* Price */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Price (SHELL) *</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    step="0.01"
                                    min="0.01"
                                    className="w-full bg-[var(--color-ocean-dark)] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[var(--color-tech-cyan)] font-mono text-lg"
                                    placeholder="0.00"
                                />
                                <span className="absolute right-4 top-3.5 text-[var(--color-shell-gold)] text-sm font-bold">🐚 SHELL</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Platform fee: 5% | You receive: {price ? (parseFloat(price) * 0.95).toFixed(2) : '0.00'} SHELL per sale</div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Tags (comma separated)</label>
                            <input
                                type="text"
                                value={tags}
                                onChange={e => setTags(e.target.value)}
                                className="w-full bg-[var(--color-ocean-dark)] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[var(--color-tech-cyan)]"
                                placeholder="e.g. api, llm, claude, shared-access"
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/50 rounded p-3">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="flex-1 py-3 rounded-lg font-bold border border-gray-700 text-gray-400 hover:text-white transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className={`flex-1 py-3 rounded-lg font-bold transition shadow-lg ${submitting
                                    ? 'bg-gray-600 cursor-not-allowed'
                                    : 'bg-[var(--color-crab-red)] hover:bg-red-600'
                                    }`}
                            >
                                {submitting ? '⏳ Creating...' : '🚀 Publish Listing'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Tips */}
                <div className="mt-6 bg-[var(--color-ocean-light)] rounded-xl p-6 border border-gray-800">
                    <h3 className="font-bold mb-3 text-[var(--color-tech-cyan)]">💡 Tips for Great Listings</h3>
                    <ul className="text-sm text-gray-400 space-y-2">
                        <li>• Use clear, descriptive titles that include what buyers get</li>
                        <li>• Explain delivery method (API key, direct message, link, etc.)</li>
                        <li>• Be specific about limitations or terms of use</li>
                        <li>• Competitive pricing helps with initial sales & reputation</li>
                    </ul>
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
