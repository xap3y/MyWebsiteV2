"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Configuration ---
const STORAGE_KEY = "hilo_bankroll_v1";
const HISTORY_STORAGE_KEY = "hilo_history_v1";
const DEFAULT_BANKROLL = 1000;
const MIN_BET = 10;
const MAX_HISTORY = 30;
const MAX_ROUNDS = 10;

type GameState = "idle" | "selecting" | "playing" | "won" | "lost";

type Card = {
    value: number; // 2-14
    suit: string;  // ♠ ♥ ♦ ♣
};

type HiLoHistoryEntry = {
    id: string;
    date: string;
    bet: number;
    multiplier: number;
    payout: number;
    roundsPlayed: number;
};

// --- Helpers ---
function formatCurrency(n: number) {
    if (!n) return "$0";
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function precise(n: number) {
    return Math.floor(n * 100) / 100;
}

function generateId() {
    return `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

function createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
        for (const value of VALUES) {
            deck.push({ value, suit });
        }
    }
    return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function cardLabel(value: number): string {
    if (value <= 10) return String(value);
    if (value === 11) return "J";
    if (value === 12) return "Q";
    if (value === 13) return "K";
    if (value === 14) return "A";
    return "?";
}

function isRedSuit(suit: string): boolean {
    return suit === "♥" || suit === "♦";
}

// Probability-based multipliers (51 remaining cards from a full deck minus current)
function getHighMultiplier(value: number): number {
    const higher = (14 - value) * 4;
    if (higher === 0) return 0;
    return precise((51 / higher) * 0.97);
}

function getLowMultiplier(value: number): number {
    const lower = (value - 2) * 4;
    if (lower === 0) return 0;
    return precise((51 / lower) * 0.97);
}

function getOptimalChoice(card: Card): "high" | "low" {
    const higher = (14 - card.value) * 4;
    const lower = (card.value - 2) * 4;
    return higher >= lower ? "high" : "low";
}

function getMultiplierColor(mult: number) {
    if (mult >= 10) return "text-[#f43f5e]";
    if (mult >= 3) return "text-[#f59e0b]";
    if (mult >= 1.5) return "text-[#10b981]";
    return "text-neutral-400";
}

// --- Animated collapse wrapper ---
function AnimatedSection({
                             show,
                             children,
                             delay = 0,
                         }: {
    show: boolean;
    children: React.ReactNode;
    delay?: number;
}) {
    return (
        <AnimatePresence initial={false}>
            {show && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                        height: { duration: 0.35, ease: [0.4, 0, 0.2, 1], delay },
                        opacity: { duration: 0.25, ease: "easeInOut", delay: delay + 0.05 },
                    }}
                    className="overflow-hidden"
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// --- Card Components ---
function CardFace({ card, size = "md" }: { card: Card; size?: "sm" | "md" | "lg" }) {
    const red = isRedSuit(card.suit);
    const sizeClasses = {
        sm: "w-12 h-16 sm:w-14 sm:h-[76px] text-sm",
        md: "w-16 h-[88px] sm:w-20 sm:h-28 text-lg sm:text-xl",
        lg: "w-24 h-[132px] sm:w-32 sm:h-44 text-3xl sm:text-4xl",
    };

    return (
        <div className={`${sizeClasses[size]} rounded-lg sm:rounded-xl bg-neutral-100 border-2 border-neutral-300 shadow-lg flex flex-col items-center justify-center gap-0.5 select-none`}>
            <span className={`font-black leading-none ${red ? "text-red-500" : "text-neutral-900"}`}>
                {cardLabel(card.value)}
            </span>
            <span className={`leading-none ${red ? "text-red-500" : "text-neutral-900"} ${size === "sm" ? "text-xs" : size === "md" ? "text-base" : "text-2xl"}`}>
                {card.suit}
            </span>
        </div>
    );
}

function CardBack({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
    const sizeClasses = {
        sm: "w-12 h-16 sm:w-14 sm:h-[76px]",
        md: "w-16 h-[88px] sm:w-20 sm:h-28",
        lg: "w-24 h-[132px] sm:w-32 sm:h-44",
    };

    return (
        <div className={`${sizeClasses[size]} rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-900 border-2 border-emerald-600 shadow-lg flex items-center justify-center select-none`}>
            <span className="text-emerald-400/40 text-2xl font-bold">?</span>
        </div>
    );
}

// --- Component ---
export default function HiLoGame() {
    const [bankroll, setBankroll] = useState<number>(DEFAULT_BANKROLL);
    const [bet, setBet] = useState<number>(MIN_BET);
    const [gameState, setGameState] = useState<GameState>("idle");
    const [deck, setDeck] = useState<Card[]>([]);
    const [cardIndex, setCardIndex] = useState<number>(0);
    const [revealedCards, setRevealedCards] = useState<Card[]>([]);
    const [choices, setChoices] = useState<("high" | "low")[]>([]);
    const [currentMultiplier, setCurrentMultiplier] = useState<number>(1);
    const [history, setHistory] = useState<HiLoHistoryEntry[]>([]);
    const [lastResult, setLastResult] = useState<{ type: "win" | "loss"; amount: number; mult: number } | null>(null);
    const [currentBet, setCurrentBet] = useState<number>(0);

    // Autoplay state
    const [autoRounds, setAutoRounds] = useState<number>(3);
    const [autoRevealing, setAutoRevealing] = useState(false);
    const [autoLooping, setAutoLooping] = useState(false);
    const [autoSpeed, setAutoSpeed] = useState<number>(200);
    const [autoRoundsPlayed, setAutoRoundsPlayed] = useState(0);
    const [autoProfit, setAutoProfit] = useState(0);
    const autoTimerRef = useRef<NodeJS.Timeout | null>(null);
    const autoLoopingRef = useRef(false);
    const bankrollRef = useRef(bankroll);
    const betRef = useRef(bet);
    const autoRoundsTargetRef = useRef(autoRounds);
    const autoSpeedRef = useRef(autoSpeed);

    // Keep refs in sync
    useEffect(() => { autoLoopingRef.current = autoLooping; }, [autoLooping]);
    useEffect(() => { bankrollRef.current = bankroll; }, [bankroll]);
    useEffect(() => { betRef.current = bet; }, [bet]);
    useEffect(() => { autoRoundsTargetRef.current = autoRounds; }, [autoRounds]);
    useEffect(() => { autoSpeedRef.current = autoSpeed; }, [autoSpeed]);

    // --- Load/Save ---
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
        if (bankroll < MIN_BET && gameState === "idle" && !autoLooping) {
            const t = setTimeout(() => setBankroll(100), 2000);
            return () => clearTimeout(t);
        }
    }, [bankroll, gameState, autoLooping]);

    useEffect(() => {
        return () => {
            if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
        };
    }, []);

    // --- Game Logic ---
    const setBetSafe = (val: number) => {
        let v = precise(val);
        v = Math.max(MIN_BET, Math.min(v, bankroll));
        if (bankroll < MIN_BET && bankroll > 0) v = bankroll;
        setBet(v);
    };

    const addHistory = useCallback((betAmt: number, mult: number, payout: number, rounds: number) => {
        const entry: HiLoHistoryEntry = {
            id: generateId(),
            date: new Date().toISOString(),
            bet: betAmt,
            multiplier: mult,
            payout,
            roundsPlayed: rounds,
        };
        setHistory((prev) => {
            const newHistory = [entry, ...prev].slice(0, MAX_HISTORY);
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
            return newHistory;
        });
    }, []);

    const currentCard = revealedCards.length > 0 ? revealedCards[revealedCards.length - 1] : null;
    const roundsPlayed = revealedCards.length > 1 ? revealedCards.length - 1 : 0;

    const startGame = () => {
        if (bet > bankroll || bet <= 0) return;

        const betAmount = bet;
        setBankroll((prev) => precise(prev - betAmount));
        setCurrentBet(betAmount);

        const newDeck = shuffleDeck(createDeck());
        setDeck(newDeck);
        setCardIndex(1);
        setRevealedCards([newDeck[0]]);
        setChoices([]);
        setCurrentMultiplier(1);
        setGameState("playing");
        setLastResult(null);
        setAutoRevealing(false);
    };

    const enterSelectMode = () => {
        if (bet > bankroll || bet <= 0) return;
        setGameState("selecting");
        setLastResult(null);
        setAutoRoundsPlayed(0);
        setAutoProfit(0);
    };

    const cancelSelection = () => {
        setGameState("idle");
        setAutoLooping(false);
    };

    const stopAutoLoop = () => {
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
        setAutoLooping(false);
        setAutoRevealing(false);
        if (roundsPlayed === 0 && gameState === "playing") {
            setBankroll((prev) => precise(prev + currentBet));
            setGameState("idle");
        }
    };

    const makeChoice = (choice: "high" | "low") => {
        if (gameState !== "playing") return;
        if (!currentCard) return;
        if (autoRevealing || autoLooping) return;
        if (cardIndex >= deck.length) return;

        const nextCard = deck[cardIndex];
        const newRevealed = [...revealedCards, nextCard];
        const newChoices = [...choices, choice];
        setRevealedCards(newRevealed);
        setChoices(newChoices);
        setCardIndex(cardIndex + 1);

        const isCorrect =
            (choice === "high" && nextCard.value > currentCard.value) ||
            (choice === "low" && nextCard.value < currentCard.value);

        if (!isCorrect) {
            setGameState("lost");
            setLastResult({ type: "loss", amount: currentBet, mult: 0 });
            addHistory(currentBet, 0, 0, roundsPlayed + 1);
        } else {
            const roundMult = choice === "high"
                ? getHighMultiplier(currentCard.value)
                : getLowMultiplier(currentCard.value);
            const newMult = precise(currentMultiplier * roundMult);
            setCurrentMultiplier(newMult);

            if (roundsPlayed + 1 >= MAX_ROUNDS || cardIndex + 1 >= deck.length) {
                const payout = precise(currentBet * newMult);
                setBankroll((prev) => precise(prev + payout));
                setGameState("won");
                setLastResult({ type: "win", amount: payout, mult: newMult });
                addHistory(currentBet, newMult, payout, roundsPlayed + 1);
            }
        }
    };

    const cashout = () => {
        if (gameState !== "playing" || roundsPlayed === 0) return;
        if (autoRevealing || autoLooping) return;

        const payout = precise(currentBet * currentMultiplier);
        setBankroll((prev) => precise(prev + payout));
        setGameState("won");
        setLastResult({ type: "win", amount: payout, mult: currentMultiplier });
        addHistory(currentBet, currentMultiplier, payout, roundsPlayed);
    };

    const resetGame = () => {
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
        setAutoRevealing(false);
        setAutoLooping(false);
        setGameState("idle");
        setDeck([]);
        setCardIndex(0);
        setRevealedCards([]);
        setChoices([]);
        setCurrentMultiplier(1);
        setLastResult(null);
        setCurrentBet(0);
        setAutoRoundsPlayed(0);
        setAutoProfit(0);
    };

    const runAutoRound = useCallback((currentBankroll: number) => {
        if (!autoLoopingRef.current) return;

        const betAmount = betRef.current;
        const rounds = autoRoundsTargetRef.current;
        const speed = autoSpeedRef.current;

        if (currentBankroll < betAmount || betAmount <= 0) {
            setAutoLooping(false);
            setGameState("idle");
            return;
        }

        const newBankroll = precise(currentBankroll - betAmount);
        setBankroll(newBankroll);
        setCurrentBet(betAmount);

        const newDeck = shuffleDeck(createDeck());
        setDeck(newDeck);
        setCardIndex(1);
        setRevealedCards([newDeck[0]]);
        setChoices([]);
        setCurrentMultiplier(1);
        setGameState("playing");
        setAutoRevealing(true);
        setLastResult(null);

        const revealSequence = (
            gameDeck: Card[],
            idx: number,
            currentRevealed: Card[],
            currentChoices: ("high" | "low")[],
            mult: number,
            roundNum: number,
            betAmt: number,
            runningBankroll: number
        ) => {
            if (!autoLoopingRef.current) {
                setAutoRevealing(false);
                return;
            }

            if (roundNum >= rounds || idx >= gameDeck.length) {
                const payout = precise(betAmt * mult);
                const profit = precise(payout - betAmt);
                const afterBankroll = precise(runningBankroll + payout);

                setBankroll(afterBankroll);
                setGameState("won");
                setAutoRevealing(false);
                setLastResult({ type: "win", amount: payout, mult });
                addHistory(betAmt, mult, payout, roundNum);
                setAutoRoundsPlayed((prev) => prev + 1);
                setAutoProfit((prev) => precise(prev + profit));

                autoTimerRef.current = setTimeout(() => {
                    if (autoLoopingRef.current) {
                        runAutoRound(afterBankroll);
                    }
                }, speed + 500);

                return;
            }

            const prevCard = currentRevealed[currentRevealed.length - 1];
            const choice = getOptimalChoice(prevCard);
            const nextCard = gameDeck[idx];

            const newRevealed = [...currentRevealed, nextCard];
            const newChoices = [...currentChoices, choice];
            setRevealedCards(newRevealed);
            setChoices(newChoices);
            setCardIndex(idx + 1);

            const isCorrect =
                (choice === "high" && nextCard.value > prevCard.value) ||
                (choice === "low" && nextCard.value < prevCard.value);

            if (!isCorrect) {
                setAutoRevealing(false);
                setGameState("lost");
                setLastResult({ type: "loss", amount: betAmt, mult: 0 });
                addHistory(betAmt, 0, 0, roundNum + 1);
                setAutoRoundsPlayed((prev) => prev + 1);
                setAutoProfit((prev) => precise(prev - betAmt));

                autoTimerRef.current = setTimeout(() => {
                    if (autoLoopingRef.current) {
                        runAutoRound(runningBankroll);
                    }
                }, speed + 800);

                return;
            }

            const roundMult = choice === "high"
                ? getHighMultiplier(prevCard.value)
                : getLowMultiplier(prevCard.value);
            const newMult = precise(mult * roundMult);
            setCurrentMultiplier(newMult);

            if (roundNum + 1 >= rounds || idx + 1 >= gameDeck.length) {
                const payout = precise(betAmt * newMult);
                const profit = precise(payout - betAmt);
                const afterBankroll = precise(runningBankroll + payout);

                setBankroll(afterBankroll);
                setGameState("won");
                setAutoRevealing(false);
                setLastResult({ type: "win", amount: payout, mult: newMult });
                addHistory(betAmt, newMult, payout, roundNum + 1);
                setAutoRoundsPlayed((prev) => prev + 1);
                setAutoProfit((prev) => precise(prev + profit));

                autoTimerRef.current = setTimeout(() => {
                    if (autoLoopingRef.current) {
                        runAutoRound(afterBankroll);
                    }
                }, speed + 500);

                return;
            }

            autoTimerRef.current = setTimeout(() => {
                revealSequence(gameDeck, idx + 1, newRevealed, newChoices, newMult, roundNum + 1, betAmt, runningBankroll);
            }, speed);
        };

        autoTimerRef.current = setTimeout(() => {
            revealSequence(newDeck, 1, [newDeck[0]], [], 1, 0, betAmount, newBankroll);
        }, 300);
    }, [addHistory]);

    const startAutoLoop = () => {
        if (autoRounds <= 0) return;
        if (bet > bankroll || bet <= 0) return;

        setAutoLooping(true);
        setAutoRoundsPlayed(0);
        setAutoProfit(0);

        setTimeout(() => {
            runAutoRound(bankrollRef.current);
        }, 100);
    };

    // Derived
    const highMult = currentCard ? getHighMultiplier(currentCard.value) : 0;
    const lowMult = currentCard ? getLowMultiplier(currentCard.value) : 0;
    const canPickHigh = highMult > 0;
    const canPickLow = lowMult > 0;
    const isLocked = gameState === "playing" || gameState === "selecting" || autoLooping;
    const isPlaying = gameState === "playing" && !autoRevealing && !autoLooping;
    const previousCards = revealedCards.slice(0, -1);

    return (
        <div className="text-neutral-200 font-sans selection:bg-emerald-500/30 xl:pb-0 pb-24">
            <div className="mx-auto max-w-6xl px-3 sm:px-4">
                {/* Header */}
                <header className="mb-2 sm:mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Hi-Lo</h1>
                        <p className="text-neutral-500 text-xs sm:text-sm mt-1">
                            Guess Higher or Lower • {MAX_ROUNDS} Rounds Max • Tie = Loss
                        </p>
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
                        <motion.div
                            layout
                            transition={{ layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}
                            className="box-primary rounded-2xl p-5 shadow-xl"
                        >
                            <motion.div layout="position" className="flex flex-col gap-4">
                                {/* Bet Amount */}
                                <motion.div layout="position">
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
                                            disabled={isLocked}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-3 pl-8 pr-3 font-mono font-bold text-white focus:outline-none focus:border-emerald-500/50 transition disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        <button
                                            onClick={() => setBetSafe(bet / 2)}
                                            disabled={isLocked}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition disabled:opacity-50"
                                        >
                                            1/2
                                        </button>
                                        <button
                                            onClick={() => setBetSafe(bet * 2)}
                                            disabled={isLocked}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition disabled:opacity-50"
                                        >
                                            2×
                                        </button>
                                        <button
                                            onClick={() => setBetSafe(bankroll)}
                                            disabled={isLocked}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition disabled:opacity-50"
                                        >
                                            MAX
                                        </button>
                                    </div>
                                </motion.div>

                                {/* Auto Rounds Slider */}
                                <AnimatedSection show={gameState === "selecting"}>
                                    <div className="pt-1">
                                        <label className="text-xs font-semibold text-neutral-500 uppercase mb-2 block">
                                            Auto Rounds: <span className="text-white">{autoRounds}</span>
                                        </label>
                                        <input
                                            type="range"
                                            min={1}
                                            max={MAX_ROUNDS}
                                            value={autoRounds}
                                            onChange={(e) => setAutoRounds(Number(e.target.value))}
                                            className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                        />
                                        <div className="flex justify-between text-[10px] text-neutral-600 mt-1 px-0.5">
                                            <span>1</span>
                                            <span>5</span>
                                            <span>10</span>
                                        </div>
                                    </div>
                                </AnimatedSection>

                                {/* Autoplay Speed */}
                                <AnimatedSection show={gameState === "selecting"}>
                                    <div className="pt-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                                                Reveal Speed
                                            </span>
                                            <span className="text-xs font-mono font-bold text-white">
                                                {autoSpeed <= 100 ? "Fast" : autoSpeed <= 250 ? "Normal" : "Slow"}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min={50}
                                            max={500}
                                            step={50}
                                            value={500 - autoSpeed + 50}
                                            onChange={(e) => setAutoSpeed(500 - Number(e.target.value) + 50)}
                                            className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                        />
                                    </div>
                                </AnimatedSection>

                                {/* Selection preview */}
                                <AnimatedSection show={gameState === "selecting"} delay={0.05}>
                                    <div className="bg-neutral-950/50 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                                                Strategy
                                            </span>
                                            <span className="text-xs font-mono font-bold text-amber-400">
                                                Optimal
                                            </span>
                                        </div>
                                        <div className="bg-neutral-900/50 rounded p-2 text-[10px] text-neutral-600 text-center">
                                            Picks the side with higher probability each round
                                        </div>
                                    </div>
                                </AnimatedSection>

                                {/* Auto loop stats */}
                                <AnimatedSection show={autoLooping}>
                                    <div className="bg-neutral-950/50 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                                                Games
                                            </span>
                                            <span className="text-xs font-mono font-bold text-white">
                                                {autoRoundsPlayed}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                                                Session Profit
                                            </span>
                                            <span className={`text-xs font-mono font-bold ${autoProfit >= 0 ? "text-emerald-400" : "text-[#f43f5e]"}`}>
                                                {autoProfit >= 0 ? "+" : ""}{formatCurrency(autoProfit)}
                                            </span>
                                        </div>
                                    </div>
                                </AnimatedSection>

                                {/* Action Buttons */}
                                <motion.div layout="position">
                                    <AnimatePresence mode="wait">
                                        {gameState === "idle" && !autoLooping ? (
                                            <motion.div
                                                key="idle-buttons"
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                                className="grid grid-cols-2 gap-2"
                                            >
                                                <button
                                                    onClick={startGame}
                                                    disabled={bet > bankroll || bet < 0.01}
                                                    className={`py-4 rounded-xl text-sm font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none ${
                                                        bet > bankroll || bet < 0.01
                                                            ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                                            : "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20"
                                                    }`}
                                                >
                                                    BET
                                                </button>
                                                <button
                                                    onClick={enterSelectMode}
                                                    disabled={bet > bankroll || bet < 0.01}
                                                    className={`py-4 rounded-xl text-sm font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none ${
                                                        bet > bankroll || bet < 0.01
                                                            ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                                            : "bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20"
                                                    }`}
                                                >
                                                    AUTO
                                                </button>
                                            </motion.div>
                                        ) : gameState === "selecting" ? (
                                            <motion.div
                                                key="selecting-buttons"
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                                className="grid grid-cols-2 gap-2"
                                            >
                                                <button
                                                    onClick={cancelSelection}
                                                    className="py-4 rounded-xl text-sm font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none bg-neutral-700 hover:bg-neutral-600 text-neutral-200"
                                                >
                                                    CANCEL
                                                </button>
                                                <button
                                                    onClick={startAutoLoop}
                                                    className="py-4 rounded-xl text-sm font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20"
                                                >
                                                    START
                                                </button>
                                            </motion.div>
                                        ) : autoLooping ? (
                                            <motion.div
                                                key="autoloop-button"
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                            >
                                                <button
                                                    onClick={stopAutoLoop}
                                                    className="w-full py-4 rounded-xl text-lg font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none bg-[#f43f5e] hover:bg-[#e11d48] text-white shadow-red-500/20"
                                                >
                                                    STOP AUTO
                                                </button>
                                            </motion.div>
                                        ) : (gameState === "won" || gameState === "lost") && !autoLooping ? (
                                            <motion.div
                                                key="newgame-button"
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                            >
                                                <button
                                                    onClick={resetGame}
                                                    className="w-full py-4 rounded-xl text-lg font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20"
                                                >
                                                    NEW GAME
                                                </button>
                                            </motion.div>
                                        ) : gameState === "playing" && !autoLooping ? (
                                            <motion.div
                                                key="playing-buttons"
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                                className="grid grid-cols-2 gap-2"
                                            >
                                                <button
                                                    onClick={cashout}
                                                    disabled={roundsPlayed === 0 || autoRevealing}
                                                    className={`py-4 rounded-xl text-sm font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none ${
                                                        roundsPlayed === 0 || autoRevealing
                                                            ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                                            : "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20"
                                                    }`}
                                                >
                                                    CASHOUT
                                                </button>
                                                <div className="bg-neutral-950/50 rounded-xl flex flex-col items-center justify-center p-2">
                                                    <span className="text-[9px] uppercase text-neutral-500 font-semibold">Payout</span>
                                                    <span className="text-sm font-mono font-bold text-emerald-400">
                                                        {formatCurrency(precise(currentBet * currentMultiplier))}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        ) : null}
                                    </AnimatePresence>
                                </motion.div>
                            </motion.div>
                        </motion.div>

                        {/* History */}
                        <div className="box-primary rounded-2xl p-4 max-h-[250px] flex flex-col">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                                History
                            </h3>
                            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                                {history.length === 0 && (
                                    <div className="text-neutral-600 text-xs text-center py-4">No games yet</div>
                                )}
                                {history.map((h) => (
                                    <div
                                        key={h.id}
                                        className="flex items-center justify-between bg-neutral-950/30 p-2 rounded border border-neutral-800/30 text-xs"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-neutral-600">R{h.roundsPlayed}</span>
                                            <span
                                                className={`font-mono font-bold ${
                                                    h.multiplier > 0 ? getMultiplierColor(h.multiplier) : "text-[#f43f5e]"
                                                }`}
                                            >
                                                {h.multiplier > 0 ? `${h.multiplier}×` : "💥"}
                                            </span>
                                        </div>
                                        <div className={`font-mono ${h.payout > 0 ? "text-lime-400" : "text-red-600"}`}>
                                            {h.payout > 0 ? formatCurrency(h.payout) : `-${formatCurrency(h.bet)}`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* --- Game Board --- */}
                    <div className="order-1 lg:order-2 box-primary rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]">
                        {/* Result Banner */}
                        <div className="absolute top-4 left-0 right-0 flex justify-center z-30 pointer-events-none">
                            <AnimatePresence mode="wait">
                                {lastResult && (
                                    <motion.div
                                        key={`${lastResult.amount}-${lastResult.type}-${autoRoundsPlayed}`}
                                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className={`backdrop-blur border px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 ${
                                            lastResult.type === "win"
                                                ? "bg-emerald-950/90 border-emerald-700"
                                                : "bg-red-950/90 border-red-700"
                                        }`}
                                    >
                                        {lastResult.type === "win" ? (
                                            <>
                                                <span className={`text-2xl font-black ${getMultiplierColor(lastResult.mult)}`}>
                                                    {lastResult.mult}×
                                                </span>
                                                <div className="h-6 w-px bg-neutral-700" />
                                                <span className="text-emerald-400 font-mono font-bold text-lg">
                                                    +{formatCurrency(lastResult.amount)}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-[#f43f5e] font-bold text-lg">
                                                💥 Wrong! -{formatCurrency(lastResult.amount)}
                                            </span>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Auto loop indicator */}
                        <AnimatePresence>
                            {autoLooping && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1.5"
                                >
                                    <motion.div
                                        animate={{ scale: [1, 1.3, 1] }}
                                        transition={{ duration: 0.8, repeat: Infinity }}
                                        className="w-2 h-2 rounded-full bg-amber-400"
                                    />
                                    <span className="text-[10px] font-bold text-amber-400 uppercase">
                                        Auto #{autoRoundsPlayed + 1}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Stats bar */}
                        <AnimatePresence>
                            {(gameState === "playing" || gameState === "won" || gameState === "lost") && revealedCards.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: "auto" }}
                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                    transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                                    className="w-full max-w-[500px] mb-6"
                                >
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-neutral-950/50 rounded-lg p-2 sm:p-3 text-center">
                                            <div className="text-[9px] sm:text-[10px] uppercase text-neutral-500 font-semibold">
                                                Round
                                            </div>
                                            <div className="text-sm sm:text-lg font-mono font-bold text-white">
                                                {roundsPlayed}/{MAX_ROUNDS}
                                            </div>
                                        </div>
                                        <div className="bg-neutral-950/50 rounded-lg p-2 sm:p-3 text-center">
                                            <div className="text-[9px] sm:text-[10px] uppercase text-neutral-500 font-semibold">
                                                Multiplier
                                            </div>
                                            <div className={`text-sm sm:text-lg font-mono font-bold ${getMultiplierColor(currentMultiplier)}`}>
                                                {currentMultiplier}×
                                            </div>
                                        </div>
                                        <div className="bg-neutral-950/50 rounded-lg p-2 sm:p-3 text-center">
                                            <div className="text-[9px] sm:text-[10px] uppercase text-neutral-500 font-semibold">
                                                Profit
                                            </div>
                                            <div className="text-sm sm:text-lg font-mono font-bold text-white">
                                                {formatCurrency(precise(currentBet * currentMultiplier - currentBet))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Card trail */}
                        <AnimatePresence>
                            {previousCards.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-1.5 sm:gap-2 mb-4 overflow-x-auto max-w-full pb-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent"
                                >
                                    {previousCards.map((card, i) => (
                                        <motion.div
                                            key={`prev-${i}-${card.value}-${card.suit}`}
                                            initial={{ opacity: 0, scale: 0.5, x: 30 }}
                                            animate={{ opacity: 0.6, scale: 1, x: 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            className="relative shrink-0"
                                        >
                                            <CardFace card={card} size="sm" />
                                            {choices[i] && (
                                                <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                                    choices[i] === "high"
                                                        ? "bg-blue-500 text-white"
                                                        : "bg-orange-500 text-white"
                                                }`}>
                                                    {choices[i] === "high" ? "↑" : "↓"}
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Current card + next card */}
                        <AnimatePresence mode="wait">
                            {currentCard && (
                                <motion.div
                                    key={`current-${revealedCards.length}-${currentCard.value}-${currentCard.suit}`}
                                    initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    className="flex items-center gap-4 sm:gap-6 mb-6"
                                >
                                    <CardFace card={currentCard} size="lg" />
                                    {gameState === "playing" && roundsPlayed < MAX_ROUNDS && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="flex flex-col items-center gap-1"
                                        >
                                            <span className="text-neutral-600 text-lg">→</span>
                                            <CardBack size="lg" />
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* HIGH / LOW buttons */}
                        <AnimatePresence>
                            {isPlaying && currentCard && roundsPlayed < MAX_ROUNDS && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                    className="grid grid-cols-2 gap-3 w-full max-w-[340px]"
                                >
                                    <button
                                        onClick={() => makeChoice("high")}
                                        disabled={!canPickHigh}
                                        className={`py-4 sm:py-5 rounded-xl font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.97] select-none flex flex-col items-center gap-1 ${
                                            !canPickHigh
                                                ? "bg-neutral-800 text-neutral-600 cursor-not-allowed"
                                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                                        }`}
                                    >
                                        <span className="text-lg sm:text-xl">⬆</span>
                                        <span className="text-sm sm:text-base">HIGHER</span>
                                        {canPickHigh && (
                                            <span className="text-[10px] sm:text-xs font-mono opacity-80">{highMult}×</span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => makeChoice("low")}
                                        disabled={!canPickLow}
                                        className={`py-4 sm:py-5 rounded-xl font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.97] select-none flex flex-col items-center gap-1 ${
                                            !canPickLow
                                                ? "bg-neutral-800 text-neutral-600 cursor-not-allowed"
                                                : "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-500/20"
                                        }`}
                                    >
                                        <span className="text-lg sm:text-xl">⬇</span>
                                        <span className="text-sm sm:text-base">LOWER</span>
                                        {canPickLow && (
                                            <span className="text-[10px] sm:text-xs font-mono opacity-80">{lowMult}×</span>
                                        )}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Idle state message */}
                        <AnimatePresence>
                            {gameState === "idle" && !autoLooping && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                >
                                    <div className="text-neutral-600 text-sm font-semibold bg-neutral-900/80 backdrop-blur px-6 py-3 rounded-full">
                                        Place a bet to start
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Selecting state message */}
                        <AnimatePresence>
                            {gameState === "selecting" && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center gap-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <CardBack size="lg" />
                                    </div>
                                    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-2">
                                        <span className="text-xs font-bold text-amber-400">
                                            Auto: {autoRounds} rounds • Optimal strategy
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
