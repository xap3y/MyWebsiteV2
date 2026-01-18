"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Tweak these:
// - GROWTH_RATE_LINEAR: lower = slower linear climb
// - GROWTH_CAP: hard ceiling for the multiplier
const GROWTH_RATE_LINEAR = 0.15; // multiplier increases by this per second
const GROWTH_CAP = 40;

type GamePhase = "idle" | "running" | "crashed" | "cashed";
type HistoryEntry = {
    id: string;
    date: string;
    bet: number;
    cashOutAt: number | null;
    crashPoint: number;
    result: "win" | "lose";
    net: number;
};
type TrailEntry = { id: string; value: number; kind: "crash" | "cash" };

function useElementWidth<T extends HTMLElement>() {
    const ref = React.useRef<T | null>(null);
    const [width, setWidth] = React.useState(0);

    React.useEffect(() => {
        if (!ref.current) return;
        const el = ref.current;

        const ro = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect?.width ?? 0;
            setWidth(w);
        });

        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return { ref, width };
}

const STORAGE_KEY = "crash_bankroll_v1";
const HISTORY_KEY = "crash_history_v1";
const DEFAULT_BANKROLL = 10000;
const MIN_BET = 10;
const MAX_HISTORY = 500;
const MAX_TRAIL = 50; // stored

function formatCurrency(n: number) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function generateId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return `cr-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeReadHistory(): HistoryEntry[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeHistory(entries: HistoryEntry[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

/** Random crash point: skewed so low multipliers are more common */
function rollCrashPoint() {
    const r = Math.random();
    const point = 1 + -Math.log(1 - r) * 1.25;
    return Math.max(1.01, Math.min(point, 50));
}

export default function CrashGame() {
    const [bankroll, setBankroll] = useState(DEFAULT_BANKROLL);
    const [bet, setBet] = useState(100);
    const [autoCashAt, setAutoCashAt] = useState<number | null>(2);
    const [phase, setPhase] = useState<GamePhase>("idle");
    const [multiplier, setMultiplier] = useState(1);
    const [crashPoint, setCrashPoint] = useState(1);
    const [message, setMessage] = useState("Place your bet to start.");
    const [roundNet, setRoundNet] = useState<number | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [crashTrail, setCrashTrail] = useState<TrailEntry[]>([]);

    const rafRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const phaseRef = useRef<GamePhase>("idle");

    const { ref: tickerRef, width: tickerWidth } = useElementWidth<HTMLDivElement>();

    const CHIP_MIN_W = 54; // px (roughly)
    const CHIP_GAP = 8;    // px (gap-2 = 8px)
    const SIDE_PADDING = 16; // left fade / breathing room

    const visibleTrailCount = React.useMemo(() => {
        if (!tickerWidth) return 6; // initial guess during first render
        const usable = Math.max(0, tickerWidth - SIDE_PADDING);
        const perChip = CHIP_MIN_W + CHIP_GAP;
        return Math.max(1, Math.floor(usable / perChip));
    }, [tickerWidth]);

    const trailForRender = crashTrail.slice(-visibleTrailCount);
    const showLeftFade = crashTrail.length > trailForRender.length;

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setBankroll(Number(saved));
        setHistory(safeReadHistory());
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, String(bankroll));
        if (bankroll <= 0) setBankroll(DEFAULT_BANKROLL);
    }, [bankroll]);

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    const multiplierDisplay = useMemo(() => multiplier.toFixed(2) + "x", [multiplier]);

    const resetRoundState = useCallback(() => {
        setPhase("idle");
        setMultiplier(1);
        setCrashPoint(1);
        setRoundNet(null);
        setMessage("Place your bet to start.");
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        startTimeRef.current = null;
    }, []);

    const addHistory = (entry: HistoryEntry) => {
        const next = [entry, ...history].slice(0, MAX_HISTORY);
        setHistory(next);
        writeHistory(next);
    };

    const pushTrail = (value: number, kind: "crash" | "cash") => {
        setCrashTrail((prev) => {
            const next = [...prev, { id: generateId(), value, kind }];
            if (next.length > MAX_TRAIL) next.shift(); // keep storage bounded
            return next;
        });
    };

    const startRound = () => {
        if (phaseRef.current === "running") return;
        if (bet < MIN_BET) {
            setMessage(`Min bet is ${formatCurrency(MIN_BET)}.`);
            return;
        }
        if (bet > bankroll) {
            setMessage("Not enough balance.");
            return;
        }

        const cp = rollCrashPoint();
        setCrashPoint(cp);
        setPhase("running");
        setMessage("Rising... tap to cash out.");
        setRoundNet(null);
        setMultiplier(1);
        setBankroll((b) => b - bet);
        startTimeRef.current = null;

        const animate = (ts: number) => {
            if (phaseRef.current !== "running") return;

            if (!startTimeRef.current) startTimeRef.current = ts;
            const elapsed = (ts - startTimeRef.current) / 1000; // seconds

            // Linear growth with cap
            const nextMult = Math.min(1 + elapsed * GROWTH_RATE_LINEAR, GROWTH_CAP);
            setMultiplier(nextMult);

            const autoTrigger = autoCashAt && nextMult >= autoCashAt && phaseRef.current === "running";
            if (autoTrigger) {
                cashOut(nextMult);
                return;
            }

            if (nextMult >= cp) {
                handleCrash(cp);
                return;
            }

            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);
    };

    const cashOut = (multAt?: number) => {
        if (phaseRef.current !== "running") return; // guard
        const m = multAt ?? multiplier;
        const payout = bet * m;
        const net = payout - bet;
        setPhase("cashed");
        setRoundNet(net);
        setMessage(`Cashed out at ${m.toFixed(2)}x for ${formatCurrency(payout)}.`);
        setBankroll((b) => b + payout);
        pushTrail(m, "cash"); // actual cash-out multiplier

        addHistory({
            id: generateId(),
            date: new Date().toISOString(),
            bet,
            cashOutAt: m,
            crashPoint,
            result: "win",
            net,
        });

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    const handleCrash = (cp: number) => {
        if (phaseRef.current !== "running") return; // guard
        setPhase("crashed");
        setMessage("Crashed.");
        setRoundNet(-bet);
        pushTrail(cp, "crash");

        addHistory({
            id: generateId(),
            date: new Date().toISOString(),
            bet,
            cashOutAt: null,
            crashPoint: cp,
            result: "lose",
            net: -bet,
        });

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    const clearHistory = () => {
        setHistory([]);
        writeHistory([]);
    };

    // Single action button: Start -> Cash Out
    const actionLabel = phase === "running" ? "Cash Out" : "Start";
    const onAction = () => {
        if (phase === "running") {
            cashOut();
        } else {
            resetRoundState();
            startRound();
        }
    };

    return (
        <div className="w-full text-white lg:pb-0 pb-20">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
                <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Crash</h1>
                        <p className="text-[11px] sm:text-xs md:text-sm text-neutral-300 mt-1">
                            Bet, watch multiplier rise, and cash out before it crashes.
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] sm:text-[11px] text-neutral-400">Balance</div>
                        <div className="text-lg sm:text-xl md:text-2xl font-semibold text-emerald-400">
                            {formatCurrency(bankroll)}
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                    <div className="box-primary p-3 sm:p-4 md:p-6 shadow-2xl">
                        <div className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400">
                            Multiplier
                        </div>

                        <div className="mt-3 sm:mt-4 flex flex-col gap-3 sm:gap-4">
                            <div className="relative h-28 sm:h-32 md:h-40 box-primary bg-neutral-950/60 overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <motion.div
                                        key={phase === "running" ? "pulse" : "steady"}
                                        animate={{
                                            scale: phase === "running" ? [1, 1.03, 1] : 1,
                                            color: phase === "crashed" ? "#f43f5e" : "#34d399",
                                        }}
                                        transition={{ repeat: phase === "running" ? Infinity : 0, duration: 1.4 }}
                                        className={`text-3xl sm:text-4xl md:text-5xl font-black ${
                                            phase === "crashed" ? "text-rose-400" : "text-emerald-400"
                                        }`}
                                    >
                                        {multiplierDisplay}
                                    </motion.div>
                                </div>
                            </div>

                            {/* Recent crash/cash points ticker */}
                            <div className="relative w-full box-primary bg-neutral-950/60 px-3 py-2 overflow-hidden min-h-[67px]">
                                <div className="text-[10px] sm:text-[11px] text-neutral-400 mb-1.5 uppercase tracking-widest">
                                    Recent Crashes
                                </div>
                                <div
                                    ref={tickerRef}
                                    className="relative flex h-8 w-full items-center justify-end overflow-hidden"
                                >
                                    <div className="flex flex-row flex-nowrap items-center gap-2 w-max justify-end">
                                        <AnimatePresence initial={false} mode="popLayout">
                                            {trailForRender.map((entry) => (
                                                <motion.span
                                                    key={entry.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.5, x: 20 }}
                                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                                    exit={{ opacity: 0, scale: 0.5, x: -20 }}
                                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                    className={`inline-flex shrink-0 items-center justify-center rounded-lg px-2.5 py-1 text-[10px] sm:text-xs font-semibold whitespace-nowrap ${
                                                        entry.kind === "cash"
                                                            ? "bg-emerald-600/80 text-emerald-50"
                                                            : "bg-neutral-800 text-neutral-100"
                                                    }`}
                                                >
                                                    {entry.value.toFixed(2)}x
                                                </motion.span>
                                            ))}
                                        </AnimatePresence>
                                    </div>

                                    {showLeftFade && (
                                        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-neutral-950 via-neutral-950/95 to-transparent opacity-35 z-10" />
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={onAction}
                                    className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                                        phase === "running"
                                            ? "bg-amber-500 hover:bg-amber-400"
                                            : "bg-emerald-500 hover:bg-emerald-400"
                                    }`}
                                >
                                    {actionLabel}
                                </button>
                            </div>

                            <div className="text-[11px] sm:text-xs text-neutral-400">{message}</div>

                            {roundNet !== null && (
                                <div
                                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                                        roundNet >= 0
                                            ? "bg-emerald-500/15 text-emerald-300"
                                            : "bg-rose-500/15 text-rose-300"
                                    }`}
                                >
                                    {roundNet >= 0
                                        ? `You won ${formatCurrency(roundNet)}`
                                        : `You lost ${formatCurrency(Math.abs(roundNet))}`}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                        <div className="rounded-2xl box-primary p-3 sm:p-4 md:p-6 shadow-xl">
                            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400">
                                Betting
                            </div>
                            <div className="mt-1 text-lg sm:text-xl md:text-2xl font-semibold text-amber-300">
                                {formatCurrency(bet)}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                                {[10, 25, 50, 100, 250, 500, 1000].map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => setBet(Math.min(Math.max(MIN_BET, bet + v), bankroll))}
                                        className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[10px] sm:text-[11px] font-semibold text-amber-200 hover:bg-amber-400/20"
                                    >
                                        +{v}
                                    </button>
                                ))}
                                {[-10, -25, -50, -100].map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => setBet((prev) => Math.max(MIN_BET, prev + v))}
                                        className="rounded-full border border-neutral-700 bg-neutral-800 px-2 py-1 text-[10px] sm:text-[11px] font-semibold text-neutral-200 hover:bg-neutral-700"
                                    >
                                        {v}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setBet(MIN_BET)}
                                    className="rounded-full border border-zinc-700 bg-zinc-800/30 px-2 py-1 text-[10px] sm:text-[11px] font-semibold text-zinc-200 hover:bg-zinc-600/40"
                                >
                                    MIN
                                </button>
                                <button
                                    onClick={() => setBet(bankroll)}
                                    className="rounded-full border border-red-700 bg-red-800/30 px-2 py-1 text-[10px] sm:text-[11px] font-semibold text-red-400 hover:bg-red-600/40"
                                >
                                    ALL IN
                                </button>
                            </div>

                            <div className="mt-3 text-[10px] sm:text-[11px] text-neutral-400 space-y-1.5">
                                <div>Min bet: {formatCurrency(MIN_BET)}</div>
                                <div>Auto cash-out (optional):</div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={autoCashAt ?? ""}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setAutoCashAt(Number.isFinite(val) && val >= 1.01 ? val : null);
                                        }}
                                        placeholder="2.0"
                                        step="0.1"
                                        min="1.01"
                                        className="w-24 rounded-lg bg-neutral-900 px-2 py-1 text-sm text-white border border-neutral-700 focus:border-emerald-500 focus:outline-none"
                                    />
                                    <button
                                        onClick={() => setAutoCashAt(null)}
                                        className="text-[11px] text-neutral-400 hover:text-neutral-200"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl box-primary p-3 sm:p-4 md:p-6 shadow-xl]">
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400">
                                    History
                                </div>
                                <button
                                    onClick={clearHistory}
                                    className="text-[11px] text-neutral-400 hover:text-neutral-200"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="mt-3 space-y-2 max-h-60 sm:max-h-64 overflow-y-auto pr-1">
                                <AnimatePresence>
                                    {history.length === 0 && (
                                        <div className="text-[11px] text-neutral-500">No rounds yet.</div>
                                    )}
                                    {history.map((h) => (
                                        <motion.div
                                            key={h.id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            className="flex items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-[10px] sm:text-xs"
                                        >
                                            <div className="flex flex-col">
                        <span className="text-neutral-300">
                          Bet {formatCurrency(h.bet)} | Crash {h.crashPoint.toFixed(2)}x
                        </span>
                                                <span className="text-neutral-500">
                          {h.cashOutAt ? `Cashed @ ${h.cashOutAt.toFixed(2)}x` : "No cash-out"}
                        </span>
                                            </div>
                                            <div
                                                className={`font-semibold ${
                                                    h.net >= 0 ? "text-emerald-400" : "text-rose-400"
                                                }`}
                                            >
                                                {h.net >= 0 ? `+${formatCurrency(h.net)}` : `-${formatCurrency(Math.abs(h.net))}`}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}