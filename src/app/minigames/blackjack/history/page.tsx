"use client";

import React, { useEffect, useMemo, useState } from "react";

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank =
    | "A"
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "10"
    | "J"
    | "Q"
    | "K";

type Card = {
    suit: Suit;
    rank: Rank;
    id: string;
};

type RoundResult = "win" | "lose" | "push";

type BlackjackHistoryEntry = {
    id: string;
    date: string;
    bet: number;
    totalBet: number;
    bets: number[];
    result: RoundResult[];
    dealerHand: Card[];
    playerHands: Card[][];
    doubled: boolean;
    split: boolean;
    net: number;
};

const HISTORY_STORAGE_KEY = "blackjack_history_v1";
const PAGE_SIZE = 10;

function formatCurrency(n: number) {
    if (!n) return "$0";
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
}

function loadHistory(): BlackjackHistoryEntry[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function cardLabel(card: Card) {
    return `${card.rank} ${card.suit}`;
}

export default function BlackJackHistory() {
    const [history, setHistory] = useState<BlackjackHistoryEntry[]>([]);
    const [page, setPage] = useState(1);

    useEffect(() => {
        setHistory(loadHistory());
    }, []);

    const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const pageEntries = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return history.slice(start, start + PAGE_SIZE);
    }, [history, page]);

    return (
        <section className="w-full box-primary p-4 sm:p-6 text-white shadow-2xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold">Blackjack History</h2>
                    <p className="text-xs sm:text-sm text-neutral-400">
                        {history.length} rounds logged • Page {page} of {totalPages}
                    </p>
                </div>
                <button
                    onClick={() => setHistory(loadHistory())}
                    className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-[11px] text-neutral-200 hover:bg-neutral-800"
                >
                    Refresh
                </button>
            </div>

            {history.length === 0 && (
                <div className="mt-6 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 p-6 text-center text-sm text-neutral-400">
                    No history yet. Play a round to start logging.
                </div>
            )}

            <div className="mt-4 space-y-4">
                {pageEntries.map((entry) => (
                    <div
                        key={entry.id}
                        className="box-primary p-4 sm:p-5 shadow-xl"
                    >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="text-[11px] uppercase tracking-widest text-neutral-400">
                                    {formatDate(entry.date)}
                                </div>
                                <div className="mt-1 text-sm text-neutral-200">
                                    Bet:{" "}
                                    <span className="font-semibold text-amber-300">
                                        {formatCurrency(entry.totalBet)}
                                    </span>
                                </div>
                                <div className="mt-1 text-xs text-neutral-400">
                                    Base bet: {formatCurrency(entry.bet)}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                        entry.net > 0
                                            ? "bg-emerald-500/20 text-emerald-300"
                                            : entry.net < 0
                                                ? "bg-rose-500/20 text-rose-300"
                                                : "bg-amber-500/20 text-amber-300"
                                    }`}
                                >
                                    {entry.net > 0
                                        ? `Won ${formatCurrency(entry.net)}`
                                        : entry.net < 0
                                            ? `Lost ${formatCurrency(Math.abs(entry.net))}`
                                            : "Push"}
                                </span>
                                {entry.doubled && (
                                    <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] text-amber-300">
                                        Double
                                    </span>
                                )}
                                {entry.split && (
                                    <span className="rounded-full bg-purple-500/20 px-2.5 py-1 text-[11px] text-purple-300">
                                        Split
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
                            <div className="box-primary p-3">
                                <div className="text-[10px] uppercase tracking-widest text-neutral-400">
                                    Dealer
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {entry.dealerHand.map((card) => (
                                        <span
                                            key={card.id}
                                            className="box-primary px-2 py-1 text-xs text-neutral-200 font-extrabold"
                                        >
                                            {cardLabel(card)}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="box-primary p-3">
                                <div className="text-[10px] uppercase tracking-widest text-neutral-400">
                                    Player Hands
                                </div>
                                <div className="mt-3 space-y-3">
                                    {entry.playerHands.map((hand, idx) => (
                                        <div key={`${entry.id}-hand-${idx}`}>
                                            <div className="flex items-center gap-2 text-xs text-neutral-300">
                                                <span className="font-semibold">Hand {idx + 1}</span>
                                                <span className="text-neutral-500">
                                                    Bet {formatCurrency(entry.bets[idx] ?? entry.bet)}
                                                </span>
                                                {entry.result[idx] && (
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                            entry.result[idx] === "win"
                                                                ? "bg-emerald-500/20 text-emerald-300"
                                                                : entry.result[idx] === "lose"
                                                                    ? "bg-rose-500/20 text-rose-300"
                                                                    : "bg-amber-500/20 text-amber-300"
                                                        }`}
                                                    >
                                                        {entry.result[idx].toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {hand.map((card) => (
                                                    <span
                                                        key={card.id}
                                                        className="box-primary px-2 py-1 text-xs text-neutral-200 font-extrabold"
                                                    >
                                                        {cardLabel(card)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {history.length > 0 && (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    <button
                        onClick={() => setPage(1)}
                        disabled={page === 1}
                        className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-[11px] text-neutral-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        First
                    </button>
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-[11px] text-neutral-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Prev
                    </button>
                    <div className="text-[11px] text-neutral-400">
                        Page {page} of {totalPages}
                    </div>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-[11px] text-neutral-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Next
                    </button>
                    <button
                        onClick={() => setPage(totalPages)}
                        disabled={page === totalPages}
                        className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-[11px] text-neutral-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Last
                    </button>
                </div>
            )}
        </section>
    );
}