"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Color = "red" | "black" | "green";
type BetType = "red" | "black" | "green" | "straight";

type NumberCell = {
    value: number;
    color: Color;
};

type Bet = {
    id: string;
    type: BetType;
    amount: number;
    number?: number;
};

type RoundResult = "win" | "lose";

type RouletteHistoryEntry = {
    id: string;
    date: string;
    bankrollBefore: number;
    bankrollAfter: number;
    bets: Bet[];
    spinResult: NumberCell;
    net: number;
    result: RoundResult;
};

const NUMBERS: NumberCell[] = [
    { value: 0, color: "green" },
    { value: 1, color: "red" },
    { value: 2, color: "black" },
    { value: 3, color: "red" },
    { value: 4, color: "black" },
    { value: 5, color: "red" },
    { value: 6, color: "black" },
    { value: 7, color: "red" },
    { value: 8, color: "black" },
    { value: 9, color: "red" },
    { value: 10, color: "black" },
    { value: 11, color: "black" },
    { value: 12, color: "red" },
    { value: 13, color: "black" },
    { value: 14, color: "red" },
    { value: 15, color: "black" },
    { value: 16, color: "red" },
    { value: 17, color: "black" },
    { value: 18, color: "red" },
    { value: 19, color: "red" },
    { value: 20, color: "black" },
    { value: 21, color: "red" },
    { value: 22, color: "black" },
    { value: 23, color: "red" },
    { value: 24, color: "black" },
    { value: 25, color: "red" },
    { value: 26, color: "black" },
    { value: 27, color: "red" },
    { value: 28, color: "black" },
    { value: 29, color: "black" },
    { value: 30, color: "red" },
    { value: 31, color: "black" },
    { value: 32, color: "red" },
    { value: 33, color: "black" },
    { value: 34, color: "red" },
    { value: 35, color: "black" },
    { value: 36, color: "red" },
];

const STORAGE_KEY = "roulette_bankroll_v1";
const HISTORY_STORAGE_KEY = "roulette_history_v1";
const DEFAULT_BANKROLL = 10000;
const MIN_BET = 10;
const MAX_HISTORY = 500;

const chipValues = [10, 25, 50, 100, 250, 500];

function formatCurrency(n: number) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function generateId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `rlt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeReadHistory(): RouletteHistoryEntry[] {
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

function writeHistory(entries: RouletteHistoryEntry[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
}

function colorClass(color: Color) {
    if (color === "green") return "bg-emerald-500";
    if (color === "black") return "bg-neutral-900";
    return "bg-rose-500";
}

function textClass(color: Color) {
    if (color === "black") return "text-neutral-100";
    return "text-white";
}

function getRandomResult() {
    return NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
}

export default function RouletteGame() {
    const [bankroll, setBankroll] = useState(DEFAULT_BANKROLL);
    const [betAmount, setBetAmount] = useState(MIN_BET);
    const [bets, setBets] = useState<Bet[]>([]);
    const [spinning, setSpinning] = useState(false);
    const [message, setMessage] = useState("Place your bets.");
    const [lastResult, setLastResult] = useState<NumberCell | null>(null);
    const [roundNet, setRoundNet] = useState<number | null>(null);
    const [roundResult, setRoundResult] = useState<RoundResult | null>(null);

    const [ticker, setTicker] = useState<NumberCell[]>([]);
    const spinTimer = useRef<number | null>(null);

    const totalBet = useMemo(
        () => bets.reduce((sum, b) => sum + b.amount, 0),
        [bets]
    );

    const betTotals = useMemo(() => {
        const totals = { red: 0, black: 0, green: 0, straight: 0 };
        for (const b of bets) {
            totals[b.type] += b.amount;
        }
        return totals;
    }, [bets]);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setBankroll(Number(saved));
        setTicker(generateTicker());
        return () => {
            if (spinTimer.current) window.clearTimeout(spinTimer.current);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, String(bankroll));
        if (bankroll <= 0) {
            setBankroll(DEFAULT_BANKROLL);
        }
    }, [bankroll]);

    const placeBet = (bet: Bet) => {
        if (spinning) return;
        if (bet.amount < MIN_BET) {
            setMessage(`Minimum bet is ${formatCurrency(MIN_BET)}.`);
            return;
        }
        if (bet.amount > bankroll) {
            setMessage("Not enough balance.");
            return;
        }
        setBets((prev) => [...prev, bet]);
        setBankroll((b) => b - bet.amount);
        setMessage("Bet placed.");
    };

    const clearBets = () => {
        if (spinning) return;
        const refund = bets.reduce((sum, b) => sum + b.amount, 0);
        setBankroll((b) => b + refund);
        setBets([]);
        setMessage("Bets cleared.");
    };

    const spin = useCallback(() => {
        if (spinning) return;
        if (bets.length === 0) {
            setMessage("Place at least one bet.");
            return;
        }

        setSpinning(true);
        setRoundNet(null);
        setRoundResult(null);
        setMessage("Spinning...");

        let frames = 0;
        let speed = 40;
        const targetFrames = 70;

        const tick = () => {
            setTicker((prev) => {
                const next = [...prev];
                const last = next.pop()!;
                next.unshift(last);
                return next;
            });

            frames += 1;
            if (frames > 20) speed += 6;
            if (frames >= targetFrames) {
                const result = tickerCenterResult();
                resolveSpin(result);
                return;
            }
            spinTimer.current = window.setTimeout(tick, speed);
        };

        tick();
    }, [bets, spinning]);

    const resolveSpin = (result: NumberCell) => {
        setLastResult(result);

        let payout = 0;
        bets.forEach((bet) => {
            if (bet.type === "black" && result.color === "black") {
                payout += bet.amount * 2;
            }
            if (bet.type === "red" && result.color === "red") {
                payout += bet.amount * 2;
            }
            if (bet.type === "green" && result.color === "green") {
                payout += bet.amount * 36;
            }
            if (bet.type === "straight" && bet.number === result.value) {
                payout += bet.amount * 36;
            }
        });

        const net = payout - totalBet;
        setBankroll((b) => b + payout);
        setRoundNet(net);
        setRoundResult(net >= 0 ? "win" : "lose");
        setMessage(net >= 0 ? "You won!" : "You lost.");
        setSpinning(false);

        const entry: RouletteHistoryEntry = {
            id: generateId(),
            date: new Date().toISOString(),
            bankrollBefore: bankroll,
            bankrollAfter: bankroll + payout,
            bets: [...bets],
            spinResult: result,
            net,
            result: net >= 0 ? "win" : "lose",
        };

        const history = safeReadHistory();
        writeHistory([entry, ...history].slice(0, MAX_HISTORY));
        setBets([]);
    };

    const tickerCenterResult = () => {
        const centerIndex = Math.floor(ticker.length / 2);
        return ticker[centerIndex] ?? getRandomResult();
    };

    const generateTicker = () => {
        const arr: NumberCell[] = [];
        for (let i = 0; i < 60; i++) {
            arr.push(getRandomResult());
        }
        return arr;
    };

    return (
        <div className="w-full text-white">
            <div className="mx-auto max-w-6xl px-4 py-8">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Roulette</h1>
                        <p className="text-xs sm:text-sm text-neutral-300 mt-2">
                            Straight bet pays 35:1. Red/Black pay 1:1. Green (0) pays 35:1.
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-[11px] text-neutral-400">Balance</div>
                        <div className="text-xl sm:text-2xl font-semibold text-emerald-400">
                            {formatCurrency(bankroll)}
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                    <div className="box-primary p-4 sm:p-6 shadow-2xl">
                        <div className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400">
                            Horizontal Roulette (Right → Left)
                        </div>

                        <div className="relative mt-4 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/60">
                            <div className="absolute left-1/2 top-0 h-full w-[2px] bg-emerald-400/70 z-10" />
                            <div className="flex items-center gap-2 px-3 py-4">
                                {ticker.map((cell, idx) => (
                                    <div
                                        key={`${cell.value}-${idx}`}
                                        className={`h-10 w-12 sm:h-12 sm:w-14 flex items-center justify-center rounded-lg ${colorClass(
                                            cell.color
                                        )} ${textClass(cell.color)} text-xs sm:text-sm font-semibold`}
                                    >
                                        {cell.value}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                onClick={() =>
                                    placeBet({ id: generateId(), type: "red", amount: betAmount })
                                }
                                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                            >
                                Bet Red
                            </button>
                            <button
                                onClick={() =>
                                    placeBet({ id: generateId(), type: "black", amount: betAmount })
                                }
                                className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                            >
                                Bet Black
                            </button>
                            <button
                                onClick={() =>
                                    placeBet({ id: generateId(), type: "green", amount: betAmount })
                                }
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                            >
                                Bet Green (0)
                            </button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                onClick={spin}
                                disabled={spinning}
                                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                                    spinning
                                        ? "bg-emerald-800 cursor-not-allowed"
                                        : "bg-emerald-500 hover:bg-emerald-400"
                                }`}
                            >
                                Spin
                            </button>
                            <button
                                onClick={clearBets}
                                disabled={spinning || bets.length === 0}
                                className="rounded-lg bg-neutral-700 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-600 disabled:cursor-not-allowed"
                            >
                                Clear Bets
                            </button>
                        </div>

                        <div className="mt-4 text-xs text-neutral-400">{message}</div>

                        <div className="mt-4">
                            <AnimatePresence>
                                {lastResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="inline-flex items-center gap-3 rounded-lg border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-sm"
                                    >
                                        <span className="text-neutral-400">Last Spin:</span>
                                        <span
                                            className={`inline-flex h-7 w-7 items-center justify-center rounded ${colorClass(
                                                lastResult.color
                                            )} ${textClass(lastResult.color)} text-xs font-semibold`}
                                        >
                                            {lastResult.value}
                                        </span>
                                        {roundNet !== null && (
                                            <span
                                                className={`text-xs font-semibold ${
                                                    roundNet >= 0 ? "text-emerald-400" : "text-rose-400"
                                                }`}
                                            >
                                                {roundNet >= 0
                                                    ? `+${formatCurrency(roundNet)}`
                                                    : `-${formatCurrency(Math.abs(roundNet))}`}
                                            </span>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl box-primary p-4 sm:p-6 shadow-xl">
                            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400">Betting</div>
                            <div className="mt-1 text-xl sm:text-2xl font-semibold text-amber-300">
                                {formatCurrency(betAmount)}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                                {chipValues.map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => setBetAmount(Math.min(bankroll, betAmount + v))}
                                        className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-400/20"
                                    >
                                        +{v}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setBetAmount(Math.max(MIN_BET, betAmount - 10))}
                                    className="rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-[11px] font-semibold text-neutral-200 hover:bg-neutral-700"
                                >
                                    -10
                                </button>
                                <button
                                    onClick={() => setBetAmount(MIN_BET)}
                                    className="rounded-full border border-yellow-700 bg-yellow-800/30 px-2.5 py-1 text-[11px] font-semibold text-yellow-200 hover:bg-yellow-600/40"
                                >
                                    MIN
                                </button>
                                <button
                                    onClick={() => setBetAmount(bankroll)}
                                    className="rounded-full border border-red-700 bg-red-800/30 px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-600/40"
                                >
                                    ALL IN
                                </button>
                            </div>

                            <div className="mt-4 text-[11px] text-neutral-400 space-y-1">
                                <div>Active Bets: {bets.length}</div>
                                <div>Total Wagered: {formatCurrency(totalBet)}</div>
                                <div className="mt-2 text-[11px] text-neutral-300 font-semibold">Bet Breakdown</div>
                                <div>Red: {formatCurrency(betTotals.red)}</div>
                                <div>Black: {formatCurrency(betTotals.black)}</div>
                                <div>Green: {formatCurrency(betTotals.green)}</div>
                                <div>Straight: {formatCurrency(betTotals.straight)}</div>
                            </div>
                        </div>

                        {roundResult && roundNet !== null && (
                            <div className="rounded-2xl box-primary p-4 sm:p-6 shadow-xl">
                                <div className="text-xs uppercase tracking-widest text-neutral-400">Round Result</div>
                                <div
                                    className={`mt-2 text-sm font-semibold ${
                                        roundNet >= 0 ? "text-emerald-400" : "text-rose-400"
                                    }`}
                                >
                                    {roundResult === "win"
                                        ? `You won ${formatCurrency(roundNet)}`
                                        : `You lost ${formatCurrency(Math.abs(roundNet))}`}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}