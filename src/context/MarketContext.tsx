'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Types
export interface User {
    id: string;
    name: string;
    role: 'Agent' | 'Human' | 'Admin';
    balance: number;
    inventory: string[];
    reputation: number;
    verified: boolean;
    apiKey?: string;
}

export interface Listing {
    id: string;
    title: string;
    description: string;
    price: number;
    category: 'Knowledge' | 'Service' | 'Compute' | 'Art' | 'Access' | 'Data';
    tags: string[];
    imageUrl?: string;
    seller: {
        id: string;
        name: string;
        reputation: number;
        verified: boolean;
    };
    purchaseCount?: number;
    createdAt: string;
}

export interface Transaction {
    id: string;
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'PURCHASE' | 'SALE' | 'FEE' | 'REFUND';
    amount: number;
    description: string;
    date: string;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    hash?: string;
}

interface MarketContextType {
    user: User | null;
    listings: Listing[];
    transactions: Transaction[];
    isConnected: boolean;
    isLoading: boolean;
    login: (name: string, password?: string) => Promise<{ success: boolean; message: string }>;
    register: (name: string, password?: string, role?: 'AGENT' | 'HUMAN') => Promise<{ success: boolean; message: string }>;
    logout: () => Promise<void>;
    buyItem: (listingId: string) => Promise<{ success: boolean; message: string; newBalance?: number }>;
    postItem: (listing: Omit<Listing, 'id' | 'seller' | 'createdAt'>) => Promise<{ success: boolean; message: string; listing?: Listing }>;
    topUp: (amount: number) => Promise<{ success: boolean; message: string; newBalance?: number }>;
    withdraw: (amount: number) => Promise<{ success: boolean; message: string; newBalance?: number }>;
    refreshListings: () => Promise<void>;
    refreshUser: () => Promise<void>;
    refreshTransactions: () => Promise<void>;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export function MarketProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [listings, setListings] = useState<Listing[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Refresh user data
    const refreshUser = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();

            if (data.user) {
                setUser({
                    id: data.user.id,
                    name: data.user.name,
                    role: data.user.role === 'AGENT' ? 'Agent' : data.user.role === 'HUMAN' ? 'Human' : 'Admin',
                    balance: data.user.balance,
                    inventory: data.user.inventory || [],
                    reputation: data.user.reputation,
                    verified: data.user.verified,
                    apiKey: data.user.apiKey,
                });
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Failed to fetch user:', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Refresh listings
    const refreshListings = useCallback(async () => {
        try {
            const res = await fetch('/api/listings');
            const data = await res.json();

            if (data.listings) {
                setListings(data.listings);
            }
        } catch (error) {
            console.error('Failed to fetch listings:', error);
        }
    }, []);

    // Refresh transactions
    const refreshTransactions = useCallback(async () => {
        try {
            const res = await fetch('/api/wallet');
            const data = await res.json();

            if (data.transactions) {
                setTransactions(data.transactions);
            }
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        }
    }, []);

    // Fetch current user on mount
    useEffect(() => {
        refreshUser();
        refreshListings();
    }, [refreshUser, refreshListings]);

    // Register new agent
    const register = async (name: string, password?: string, role: 'AGENT' | 'HUMAN' = 'AGENT'): Promise<{ success: boolean; message: string }> => {
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, password, role }),
            });

            const data = await res.json();

            if (!res.ok) {
                return { success: false, message: data.error || 'Registration failed' };
            }

            // Set user from response
            setUser({
                id: data.user.id,
                name: data.user.name,
                role: data.user.role === 'AGENT' ? 'Agent' : data.user.role === 'HUMAN' ? 'Human' : 'Admin',
                balance: data.user.balance,
                inventory: [],
                reputation: data.user.reputation,
                verified: data.user.verified,
                apiKey: data.user.apiKey,
            });

            // Refresh transactions to get welcome bonus
            setTimeout(() => refreshTransactions(), 500);

            return { success: true, message: `Welcome ${data.user.name}! You received 100 SHELL bonus.` };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    };

    // Login
    const login = async (name: string, password?: string): Promise<{ success: boolean; message: string }> => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                return { success: false, message: data.error || 'Login failed' };
            }

            setUser({
                id: data.user.id,
                name: data.user.name,
                role: data.user.role === 'AGENT' ? 'Agent' : data.user.role === 'HUMAN' ? 'Human' : 'Admin',
                balance: data.user.balance,
                inventory: [],
                reputation: data.user.reputation,
                verified: data.user.verified,
                apiKey: data.user.apiKey,
            });

            // Refresh user to get inventory
            setTimeout(() => refreshUser(), 300);

            return { success: true, message: `Welcome back, ${data.user.name}!` };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    };

    // Logout
    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            setTransactions([]);
        }
    };

    // Buy item
    const buyItem = async (listingId: string): Promise<{ success: boolean; message: string; newBalance?: number }> => {
        try {
            const res = await fetch(`/api/listings/${listingId}/buy`, {
                method: 'POST',
            });

            const data = await res.json();

            if (!res.ok) {
                return { success: false, message: data.error || 'Purchase failed' };
            }

            // Update user balance and inventory
            if (user) {
                setUser(prev => prev ? {
                    ...prev,
                    balance: data.newBalance,
                    inventory: [...prev.inventory, listingId],
                } : null);
            }

            // Refresh transactions
            refreshTransactions();

            return {
                success: true,
                message: data.message,
                newBalance: data.newBalance,
            };
        } catch (error) {
            console.error('Purchase error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    };

    // Post new item
    const postItem = async (newItem: Omit<Listing, 'id' | 'seller' | 'createdAt'>): Promise<{ success: boolean; message: string; listing?: Listing }> => {
        try {
            const res = await fetch('/api/listings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem),
            });

            const data = await res.json();

            if (!res.ok) {
                return { success: false, message: data.error || 'Failed to create listing' };
            }

            // Add to local listings
            setListings(prev => [data.listing, ...prev]);

            return {
                success: true,
                message: 'Listing created successfully!',
                listing: data.listing,
            };
        } catch (error) {
            console.error('Post item error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    };

    // Deposit/Top up
    const topUp = async (amount: number): Promise<{ success: boolean; message: string; newBalance?: number }> => {
        try {
            const res = await fetch('/api/wallet/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount }),
            });

            const data = await res.json();

            if (!res.ok) {
                return { success: false, message: data.error || 'Deposit failed' };
            }

            // Update user balance
            if (user) {
                setUser(prev => prev ? { ...prev, balance: data.newBalance } : null);
            }

            // Refresh transactions
            refreshTransactions();

            return {
                success: true,
                message: data.message,
                newBalance: data.newBalance,
            };
        } catch (error) {
            console.error('Deposit error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    };

    // Withdraw
    const withdraw = async (amount: number): Promise<{ success: boolean; message: string; newBalance?: number }> => {
        try {
            const res = await fetch('/api/wallet/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount }),
            });

            const data = await res.json();

            if (!res.ok) {
                return { success: false, message: data.error || 'Withdrawal failed' };
            }

            // Update user balance
            if (user) {
                setUser(prev => prev ? { ...prev, balance: data.newBalance } : null);
            }

            // Refresh transactions
            refreshTransactions();

            return {
                success: true,
                message: data.message,
                newBalance: data.newBalance,
            };
        } catch (error) {
            console.error('Withdrawal error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    };

    return (
        <MarketContext.Provider value={{
            user,
            listings,
            transactions,
            isConnected: !!user,
            isLoading,
            login,
            register,
            logout,
            buyItem,
            postItem,
            topUp,
            withdraw,
            refreshListings,
            refreshUser,
            refreshTransactions,
        }}>
            {children}
        </MarketContext.Provider>
    );
}

export function useMarket() {
    const context = useContext(MarketContext);
    if (context === undefined) {
        throw new Error('useMarket must be used within a MarketProvider');
    }
    return context;
}
