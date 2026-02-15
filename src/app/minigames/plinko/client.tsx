"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Configuration ---

const ROW_COUNT = 14;
const PEG_RADIUS = 4;
const BUCKET_COUNT = ROW_COUNT + 1; // 15 buckets
const PEG_GAP_Y = 24;

// Calculate layout from desired bucket width
const BUCKET_WIDTH = 34;
const BUCKET_GAP = 2;
const BUCKET_SPACING = BUCKET_WIDTH + BUCKET_GAP; // 36px per bucket slot
const PEG_GAP_X = BUCKET_SPACING; // Pegs match bucket spacing

// Board dimensions derived from content
const BOARD_PADDING_X = 40;
const BOTTOM_ROW_WIDTH = (BUCKET_COUNT - 1) * BUCKET_SPACING;
const BOARD_WIDTH = BOTTOM_ROW_WIDTH + BOARD_PADDING_X * 2;
const START_X = BOARD_WIDTH / 2;
const START_Y = 40;

// Physics
const DROP_DURATION = 2;
const BOUNCE_HEIGHT = 8;

const MULTIPLIERS = [
    110, 41, 10, 5, 3.5, 2, 1, 0.5, 0.3, 0.5, 1, 2, 3.5, 5, 10, 41, 110
];

const STORAGE_KEY = "plinko_bankroll_v1";
const HISTORY_STORAGE_KEY = "plinko_history_v1";
const DEFAULT_BANKROLL = 1000;
const MIN_BET = 10;
const MAX_HISTORY = 30;

// --- Types ---

type PlinkoHistoryEntry = {
    id: string;
    date: string;
    bet: number;
    multiplier: number;
    payout: number;
    outcomeIndex: number;
};

type BallState = {
    id: string;
    outcomeIndex: number;
    multiplier: number;
    payout: number;
    bet: number;
    pathX: number[];
    pathY: number[];
    hits: { x: number; y: number; delay: number }[];
};

// --- Helpers ---

function formatCurrency(n: number) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function precise(n: number) {
    return Math.floor(n * 100) / 100;
}

function generateId() {
    return `ball-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const getBucketColor = (mult: number) => {
    if (mult >= 10) return "fill-[#f43f5e]";
    if (mult >= 2) return "fill-[#f59e0b]";
    if (mult >= 1) return "fill-[#10b981]";
    return "fill-[#3f3f46]";
};

const getTextColor = (mult: number) => {
    if (mult < 1) return "rgb(161 161 170)";
    return "rgba(0,0,0,0.85)";
};

const getHistoryColor = (mult: number) => {
    if (mult >= 10) return "text-[#f43f5e]";
    if (mult >= 2) return "text-[#f59e0b]";
    if (mult >= 1) return "text-[#10b981]";
    return "text-neutral-500";
};

// --- Components ---

const PegPulse = ({ x, y, delay }: { x: number; y: number; delay: number }) => {
    return (
        <motion.circle
            cx={x}
            cy={y}
            r={PEG_RADIUS}
            fill="transparent"
            stroke="white"
            strokeWidth={2}
            initial={{ opacity: 0, scale: 1 }}
            animate={{
                opacity: [0, 0.6, 0],
                scale: [1, 1.5, 1.8],
                strokeWidth: [2, 0.5, 0],
            }}
            transition={{
                delay: delay,
                duration: 0.35,
                ease: "easeOut",
            }}
        />
    );
};

const PlinkoBall = ({
                        ball,
                        onFinish,
                    }: {
    ball: BallState;
    onFinish: (id: string, payout: number) => void;
}) => {
    return (
        <>
            {ball.hits.map((hit, i) => (
                <PegPulse key={`${ball.id}-pulse-${i}`} x={hit.x} y={hit.y} delay={hit.delay} />
            ))}
            <motion.circle
                cx={0}
                cy={0}
                r={PEG_RADIUS + 1}
                fill="#fbbf24"
                initial={{ x: ball.pathX[0], y: ball.pathY[0] }}
                animate={{ x: ball.pathX, y: ball.pathY }}
                transition={{
                    duration: DROP_DURATION,
                    ease: "linear",
                    times: ball.pathX.map((_, i) => i / (ball.pathX.length - 1)),
                }}
                onAnimationComplete={() => onFinish(ball.id, ball.payout)}
                className="drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
            />
        </>
    );
};

export default function PlinkoGame() {
    const [bankroll, setBankroll] = useState<number>(DEFAULT_BANKROLL);
    const [bet, setBet] = useState<number>(MIN_BET);
    const [balls, setBalls] = useState<BallState[]>([]);
    const [history, setHistory] = useState<PlinkoHistoryEntry[]>([]);
    const [lastWin, setLastWin] = useState<{ amount: number; mult: number } | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setBankroll(Number(saved));
        try {
            const h = localStorage.getItem(HISTORY_STORAGE_KEY);
            if (h) setHistory(JSON.parse(h));
        } catch {}
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, String(bankroll));
    }, [bankroll]);

    useEffect(() => {
        if (bankroll < MIN_BET && balls.length === 0) {
            const t = setTimeout(() => setBankroll(100), 2000);
            return () => clearTimeout(t);
        }
    }, [bankroll, balls.length]);

    const setBetSafe = (val: number) => {
        let v = precise(val);
        v = Math.max(MIN_BET, Math.min(v, bankroll));
        if (bankroll < MIN_BET && bankroll > 0) v = bankroll;
        setBet(v);
    };

    const dropBall = () => {
        if (bet > bankroll) return;
        if (bet <= 0) return;

        const currentBet = bet;
        setBankroll((prev) => precise(prev - currentBet));

        const pathX: number[] = [];
        const pathY: number[] = [];
        const hits: { x: number; y: number; delay: number }[] = [];

        let currentX = START_X;
        let currentY = START_Y;

        pathX.push(currentX);
        pathY.push(currentY);
        hits.push({ x: currentX, y: currentY, delay: 0 });

        let rightMoves = 0;
        const timeStep = DROP_DURATION / ROW_COUNT;

        for (let row = 0; row < ROW_COUNT; row++) {
            const isRight = Math.random() > 0.5;
            if (isRight) rightMoves++;
            const dir = isRight ? 1 : -1;

            const nextX = currentX + dir * (PEG_GAP_X / 2);
            const nextY = currentY + PEG_GAP_Y;
            const arcX = currentX + dir * (PEG_GAP_X / 4);
            const arcY = currentY - BOUNCE_HEIGHT;

            pathX.push(arcX);
            pathY.push(arcY);
            pathX.push(nextX);
            pathY.push(nextY);

            hits.push({ x: nextX, y: nextY, delay: (row + 1) * timeStep });

            currentX = nextX;
            currentY = nextY;
        }

        pathX.push(currentX);
        pathY.push(currentY + 30);

        // Find the closest bucket to the ball's final X position
        let bucketIndex = 0;
        let minDist = Infinity;
        for (let i = 0; i < MULTIPLIERS.length; i++) {
            const bx = START_X + (i - (MULTIPLIERS.length - 1) / 2) * BUCKET_SPACING;
            const dist = Math.abs(currentX - bx);
            if (dist < minDist) {
                minDist = dist;
                bucketIndex = i;
            }
        }

        const multiplier = MULTIPLIERS[bucketIndex];
        const payout = precise(currentBet * multiplier);

        const newBall: BallState = {
            id: generateId(),
            outcomeIndex: bucketIndex,
            multiplier,
            payout,
            bet: currentBet,
            pathX,
            pathY,
            hits,
        };

        setBalls((prev) => [...prev, newBall]);
    };

    const handleBallFinish = (id: string, payout: number) => {
        const ball = balls.find((b) => b.id === id);
        setBalls((prev) => prev.filter((b) => b.id !== id));

        if (payout > 0) {
            setBankroll((prev) => precise(prev + payout));
            if (ball) setLastWin({ amount: payout, mult: ball.multiplier });
        }

        if (ball) {
            const entry: PlinkoHistoryEntry = {
                id: ball.id,
                date: new Date().toISOString(),
                bet: ball.bet,
                multiplier: ball.multiplier,
                payout: ball.payout,
                outcomeIndex: ball.outcomeIndex,
            };
            setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
            localStorage.setItem(
                HISTORY_STORAGE_KEY,
                JSON.stringify([entry, ...history].slice(0, MAX_HISTORY))
            );
        }
    };

    const boardHeight = START_Y + ROW_COUNT * PEG_GAP_Y + 70;
    const viewBoxString = `0 0 ${BOARD_WIDTH} ${boardHeight}`;

    return (
        <div className="min-h-screen text-neutral-200 font-sans selection:bg-emerald-500/30 xl:pb-0 pb-24">
            <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-12">
                {/* Header */}
                <header className="mb-6 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Plinko</h1>
                        <p className="text-neutral-500 text-xs sm:text-sm mt-1">Rows: 14Rows • Risk: High</p>
                    </div>
                    <div className="box-primary rounded-xl px-4 py-2 sm:px-5 sm:py-3 text-right shadow-sm self-start sm:self-auto w-full sm:w-auto flex justify-between sm:block items-center">
                        <div className="text-[10px] sm:text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-0 sm:mb-1">
                            Balance
                        </div>
                        <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 tabular-nums">
                            {formatCurrency(bankroll)}
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 sm:gap-8">
                    {/* --- Controls --- */}
                    <div className="order-2 lg:order-1 space-y-4">
                        <div className="box-primary rounded-2xl p-5 shadow-xl">
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-neutral-500 uppercase mb-2 block">
                                        Bet Amount
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-neutral-500">
                                            $
                                        </div>
                                        <input
                                            type="number"
                                            value={bet}
                                            onChange={(e) => setBetSafe(Number(e.target.value))}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-3 pl-8 pr-3 font-mono font-bold text-white focus:outline-none focus:border-emerald-500/50 transition"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        <button
                                            onClick={() => setBetSafe(bet / 2)}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition"
                                        >
                                            1/2
                                        </button>
                                        <button
                                            onClick={() => setBetSafe(bet * 2)}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition"
                                        >
                                            2×
                                        </button>
                                        <button
                                            onClick={() => setBetSafe(bankroll)}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition"
                                        >
                                            MAX
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={dropBall}
                                    disabled={bet > bankroll || bet < 0.01}
                                    className={`w-full py-4 rounded-xl text-lg font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none
                                        ${
                                        bet > bankroll || bet < 0.01
                                            ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                            : "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20"
                                    }`}
                                >
                                    BET
                                </button>
                            </div>
                        </div>

                        {/* History */}
                        <div className="box-primary rounded-2xl p-4 max-h-[350px] flex flex-col">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                                History
                            </h3>
                            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                                {history.length === 0 && (
                                    <div className="text-neutral-600 text-xs text-center py-4">No drops yet</div>
                                )}
                                {history.map((h) => (
                                    <div
                                        key={h.id}
                                        className="flex items-center justify-between bg-neutral-950/30 p-2 rounded border border-neutral-800/30 text-xs animate-in fade-in slide-in-from-top-2 duration-300"
                                    >
                                        <div className={`font-mono font-bold ${getHistoryColor(h.multiplier)}`}>
                                            {h.multiplier}×
                                        </div>
                                        <div className="text-right">
                                            <div className={`${h.payout >= h.bet ? "text-white" : "text-neutral-500"}`}>
                                                {formatCurrency(h.payout)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* --- Game Board --- */}
                    <div className="order-1 lg:order-2 box-primary rounded-2xl p-3 sm:p-5 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center">
                        <div className="absolute top-4 left-0 right-0 flex justify-center z-30 pointer-events-none">
                            <AnimatePresence mode="wait">
                                {lastWin && (
                                    <motion.div
                                        key={Date.now()}
                                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="bg-neutral-900/95 backdrop-blur border border-neutral-700 px-6 py-2 rounded-full shadow-2xl flex items-center gap-3"
                                    >
                                        <span className={`text-2xl font-black ${getHistoryColor(lastWin.mult)}`}>
                                            {lastWin.mult}×
                                        </span>
                                        <div className="h-6 w-px bg-neutral-700"></div>
                                        <span className="text-white font-mono font-bold">
                                            {formatCurrency(lastWin.amount)}
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* The Game SVG */}
                        <div className="relative w-full">
                            <svg viewBox={viewBoxString} className="w-full h-auto overflow-visible">
                                {/* 1. Pegs */}
                                {Array.from({ length: ROW_COUNT + 1 }).map((_, rowIndex) => {
                                    const pegCount = rowIndex + 3;
                                    const rowY = START_Y + rowIndex * PEG_GAP_Y;
                                    const rowWidth = (pegCount - 1) * PEG_GAP_X;
                                    const xOffset = START_X - rowWidth / 2;

                                    return Array.from({ length: pegCount }).map((_, colIndex) => {
                                        const cx = xOffset + colIndex * PEG_GAP_X;
                                        return (
                                            <circle
                                                key={`${rowIndex}-${colIndex}`}
                                                cx={cx}
                                                cy={rowY}
                                                r={PEG_RADIUS}
                                                fill="#525252"
                                                className="opacity-50"
                                            />
                                        );
                                    });
                                })}

                                {/* 2. Balls */}
                                <AnimatePresence>
                                    {balls.map((ball) => (
                                        <PlinkoBall key={ball.id} ball={ball} onFinish={handleBallFinish} />
                                    ))}
                                </AnimatePresence>

                                {/* 3. Multiplier Buckets */}
                                <g transform={`translate(0, ${START_Y + ROW_COUNT * PEG_GAP_Y + 20})`}>
                                    {MULTIPLIERS.map((mult, i) => {
                                        const count = MULTIPLIERS.length;
                                        const x = START_X + (i - (count - 1) / 2) * BUCKET_SPACING;

                                        return (
                                            <g key={i} transform={`translate(${x}, 0)`}>
                                                <rect
                                                    x={-BUCKET_WIDTH / 2}
                                                    y={0}
                                                    width={BUCKET_WIDTH}
                                                    height={28}
                                                    rx={4}
                                                    className={`${getBucketColor(mult)}`}
                                                />
                                                <text
                                                    x={0}
                                                    y={18}
                                                    fontSize="10"
                                                    fontWeight="bold"
                                                    textAnchor="middle"
                                                    fill={getTextColor(mult)}
                                                    className="pointer-events-none select-none"
                                                >
                                                    {mult}×
                                                </text>
                                            </g>
                                        );
                                    })}
                                </g>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}