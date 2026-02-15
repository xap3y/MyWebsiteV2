"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

type Card = {
    suit: Suit;
    rank: Rank;
    id: string;
};

type GamePhase = "idle" | "betting" | "dealing" | "playerTurn" | "dealerTurn" | "roundEnd";
type RoundResult = "win" | "lose" | "push";
type InsuranceDecision = "none" | "taken" | "declined";

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
    insuranceBet: number;
    insuranceDecision: InsuranceDecision;
    insurancePayout: number;
};

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const STORAGE_KEY = "blackjack_bankroll_v1";
const HISTORY_STORAGE_KEY = "blackjack_history_v1";
const DEFAULT_BANKROLL = 1000;
const MIN_BET = 10;
const MAX_HISTORY_ENTRIES = 500;

function shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function cardValue(rank: Rank): number {
    if (rank === "A") return 11;
    if (["K", "Q", "J"].includes(rank)) return 10;
    return parseInt(rank, 10);
}

function scoreHand(cards: Card[]): { total: number; soft: boolean } {
    let total = 0;
    let aces = 0;
    for (const c of cards) {
        total += cardValue(c.rank);
        if (c.rank === "A") aces += 1;
    }
    let soft = false;
    while (total > 21 && aces > 0) {
        total -= 10;
        aces -= 1;
    }
    if (aces > 0 && total <= 21) soft = true;
    return { total, soft };
}

function isNaturalBlackjack(cards: Card[]): boolean {
    if (cards.length !== 2) return false;
    const { total } = scoreHand(cards);
    return total === 21;
}

function formatCurrency(n: number) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function precise(n: number) {
    return Math.floor(n * 100) / 100;
}

function safeReadHistory(): BlackjackHistoryEntry[] {
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

function writeHistory(entries: BlackjackHistoryEntry[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
}

function generateId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `bj-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isRed(suit: Suit) {
    return suit === "♥" || suit === "♦";
}

function getSuitColor(suit: Suit) {
    return isRed(suit) ? "#dc2626" : "#1a1a2e";
}

function getRankDisplay(rank: Rank) {
    if (rank === "J") return "J";
    if (rank === "Q") return "Q";
    if (rank === "K") return "K";
    if (rank === "A") return "A";
    return rank;
}

function getFaceSymbol(rank: Rank) {
    if (rank === "J") return "♞";
    if (rank === "Q") return "♛";
    if (rank === "K") return "♚";
    if (rank === "A") return "★";
    return null;
}

const chipValues = [10, 25, 50, 100, 250];

// --- Card Component ---
function CardFace({ card, index = 0 }: { card: Card; index?: number }) {
    const red = isRed(card.suit);
    const textColor = red ? "text-red-600" : "text-neutral-800";
    const suitColor = getSuitColor(card.suit);
    const face = getFaceSymbol(card.rank);
    const isFace = !!face;
    const isNumber = !isFace;
    const numValue = parseInt(card.rank, 10);
    const validNum = !isNaN(numValue) && numValue >= 2 && numValue <= 10;

    return (
        <motion.div
            initial={{ opacity: 0, y: -40, rotateY: 90, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
            transition={{
                duration: 0.4,
                delay: index * 0.1,
                ease: [0.4, 0, 0.2, 1],
            }}
            className="relative h-[100px] w-[70px] sm:h-[130px] sm:w-[90px] rounded-xl border border-neutral-300 bg-white shadow-lg select-none flex-shrink-0"
            style={{
                background: "linear-gradient(145deg, #ffffff 0%, #f8f8f8 50%, #f0f0f0 100%)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
        >
            {/* Inner border */}
            <div className="absolute inset-[3px] sm:inset-[4px] rounded-lg border border-neutral-200/60 pointer-events-none" />

            {/* Top-left rank + suit */}
            <div className={`absolute top-1.5 left-1.5 sm:top-2 sm:left-2.5 flex flex-col items-center leading-none ${textColor}`}>
                <span className="text-[11px] sm:text-sm font-black tracking-tight">{getRankDisplay(card.rank)}</span>
                <span className="text-[10px] sm:text-xs -mt-0.5">{card.suit}</span>
            </div>

            {/* Bottom-right rank + suit (rotated) */}
            <div className={`absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2.5 flex flex-col items-center leading-none rotate-180 ${textColor}`}>
                <span className="text-[11px] sm:text-sm font-black tracking-tight">{getRankDisplay(card.rank)}</span>
                <span className="text-[10px] sm:text-xs -mt-0.5">{card.suit}</span>
            </div>

            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
                {isFace ? (
                    <div className="flex flex-col items-center gap-0">
                        <span className="text-2xl sm:text-4xl" style={{ color: suitColor }}>
                            {face}
                        </span>
                        <span className="text-[8px] sm:text-[10px] font-bold mt-0.5" style={{ color: suitColor }}>
                            {card.suit}
                        </span>
                    </div>
                ) : validNum ? (
                    <SuitPattern count={numValue} suit={card.suit} />
                ) : (
                    // Ace
                    <span className="text-3xl sm:text-5xl" style={{ color: suitColor }}>
                        {card.suit}
                    </span>
                )}
            </div>
        </motion.div>
    );
}

// --- Suit pattern for number cards ---
function SuitPattern({ count, suit }: { count: number; suit: Suit }) {
    const color = getSuitColor(suit);

    const layouts: Record<number, [number, number][]> = {
        2: [[0.5, 0.2], [0.5, 0.8]],
        3: [[0.5, 0.2], [0.5, 0.5], [0.5, 0.8]],
        4: [[0.3, 0.2], [0.7, 0.2], [0.3, 0.8], [0.7, 0.8]],
        5: [[0.3, 0.2], [0.7, 0.2], [0.5, 0.5], [0.3, 0.8], [0.7, 0.8]],
        6: [[0.3, 0.2], [0.7, 0.2], [0.3, 0.5], [0.7, 0.5], [0.3, 0.8], [0.7, 0.8]],
        7: [[0.3, 0.2], [0.7, 0.2], [0.5, 0.35], [0.3, 0.5], [0.7, 0.5], [0.3, 0.8], [0.7, 0.8]],
        8: [[0.3, 0.2], [0.7, 0.2], [0.5, 0.35], [0.3, 0.5], [0.7, 0.5], [0.5, 0.65], [0.3, 0.8], [0.7, 0.8]],
        9: [[0.3, 0.18], [0.7, 0.18], [0.3, 0.39], [0.7, 0.39], [0.5, 0.5], [0.3, 0.61], [0.7, 0.61], [0.3, 0.82], [0.7, 0.82]],
        10: [[0.3, 0.15], [0.7, 0.15], [0.5, 0.28], [0.3, 0.39], [0.7, 0.39], [0.3, 0.61], [0.7, 0.61], [0.5, 0.72], [0.3, 0.85], [0.7, 0.85]],
    };

    const positions = layouts[count] || [];

    return (
        <div className="absolute inset-[14px] sm:inset-[18px]">
            {positions.map(([x, y], i) => (
                <span
                    key={i}
                    className="absolute text-[9px] sm:text-xs transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                        left: `${x * 100}%`,
                        top: `${y * 100}%`,
                        color,
                    }}
                >
                    {suit}
                </span>
            ))}
        </div>
    );
}

// --- Card Back ---
function CardBack({ index = 0 }: { index?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -40, rotateY: 90, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, rotateY: 90, scale: 0.95, transition: { duration: 0.3 } }}
            transition={{
                duration: 0.4,
                delay: index * 0.1,
                ease: [0.4, 0, 0.2, 1],
            }}
            className="h-[100px] w-[70px] sm:h-[130px] sm:w-[90px] rounded-xl border border-neutral-600 shadow-lg select-none flex-shrink-0 overflow-hidden relative"
            style={{
                background: "linear-gradient(135deg, #1e3a5f 0%, #1a2744 50%, #0f1b33 100%)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)",
            }}
        >
            <div className="absolute inset-[3px] sm:inset-[4px] rounded-lg border border-blue-400/20 pointer-events-none" />
            <div className="absolute inset-[6px] sm:inset-[8px] rounded-md overflow-hidden opacity-30">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id={`cardPattern-${index}`} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                            <path d="M6 0L12 6L6 12L0 6Z" fill="none" stroke="#60a5fa" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill={`url(#cardPattern-${index})`} />
                </svg>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-blue-400/30 flex items-center justify-center bg-blue-500/10">
                    <span className="text-blue-300/50 text-sm sm:text-lg">♠</span>
                </div>
            </div>
        </motion.div>
    );
}

// --- Hand Component ---
function Hand({ cards, hideSecond = false }: { cards: Card[]; hideSecond?: boolean }) {
    return (
        <div className="flex flex-wrap gap-2 sm:gap-3 items-end">
            {cards.map((card, i) => {
                const isHidden = hideSecond && i === 1;
                return (
                    <div key={card.id} className="relative">
                        <div style={{ opacity: isHidden ? 0 : 1, transition: "opacity 0.3s ease 0.15s" }}>
                            <CardFace card={card} index={i} />
                        </div>
                        <AnimatePresence>
                            {isHidden && (
                                <div className="absolute inset-0">
                                    <CardBack index={i} />
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
            <AnimatePresence>
                {cards.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        exit={{ opacity: 0 }}
                        className="rounded-xl border-2 border-dashed border-neutral-700 h-[100px] w-[70px] sm:h-[130px] sm:w-[90px] flex items-center justify-center"
                    >
                        <span className="text-[10px] text-neutral-600">Waiting...</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- Score Badge ---
function ScoreBadge({ total, soft, blackjack, busted }: { total: number; soft: boolean; blackjack: boolean; busted: boolean }) {
    let bgClass = "bg-neutral-800 border-neutral-700 text-neutral-300";
    if (blackjack) bgClass = "bg-amber-500/20 border-amber-500/40 text-amber-400";
    else if (busted) bgClass = "bg-red-500/20 border-red-500/40 text-red-400";
    else if (total === 21) bgClass = "bg-emerald-500/20 border-emerald-500/40 text-emerald-400";

    return (
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${bgClass}`}>
            <span className="text-xs font-bold font-mono">{total}</span>
            {soft && <span className="text-[9px] uppercase opacity-70">Soft</span>}
            {blackjack && <span className="text-[9px] uppercase font-bold">BJ</span>}
            {busted && <span className="text-[9px] uppercase font-bold">Bust</span>}
        </div>
    );
}

// --- Result Badge ---
function ResultBadge({ result }: { result: RoundResult }) {
    const config = {
        win: { bg: "bg-emerald-500/20 border-emerald-500/40", text: "text-emerald-400", label: "WIN" },
        lose: { bg: "bg-red-500/20 border-red-500/40", text: "text-red-400", label: "LOSE" },
        push: { bg: "bg-amber-500/20 border-amber-500/40", text: "text-amber-400", label: "PUSH" },
    }[result];

    return (
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className={`inline-flex items-center rounded-full border px-3 py-1 ${config.bg}`}
        >
            <span className={`text-[10px] sm:text-xs font-black tracking-wider ${config.text}`}>{config.label}</span>
        </motion.div>
    );
}

// --- AnimatedSection ---
function AnimatedSection({ show, children, delay = 0 }: { show: boolean; children: React.ReactNode; delay?: number }) {
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

// --- Main Component ---
export default function BlackJack() {
    const [playerHands, setPlayerHands] = useState<Card[][]>([[]]);
    const [activeHandIndex, setActiveHandIndex] = useState(0);
    const [bets, setBets] = useState<number[]>([MIN_BET]);
    const [dealer, setDealer] = useState<Card[]>([]);
    const [bankroll, setBankroll] = useState<number>(DEFAULT_BANKROLL);
    const [bet, setBet] = useState<number>(MIN_BET);
    const [phase, setPhase] = useState<GamePhase>("idle");
    const [message, setMessage] = useState<string>("Place your bet to begin.");
    const [dealerSoft17, setDealerSoft17] = useState<"stand" | "hit">("stand");
    const [revealDealer, setRevealDealer] = useState<boolean>(false);
    const [roundResult, setRoundResult] = useState<RoundResult[]>([]);
    const [roundDelta, setRoundDelta] = useState<number | null>(null);
    const [hasSplit, setHasSplit] = useState(false);
    const [hasDoubled, setHasDoubled] = useState(false);
    const [insuranceDecision, setInsuranceDecision] = useState<InsuranceDecision>("none");
    const [insuranceBet, setInsuranceBet] = useState(0);
    const [history, setHistory] = useState<BlackjackHistoryEntry[]>([]);

    const deckRef = useRef<Card[]>([]);
    const idCounter = useRef(0);
    const dealTimersRef = useRef<number[]>([]);
    const betTimestampRef = useRef<string | null>(null);
    const deckRefillThreshold = 15;

    const activeHand = playerHands[activeHandIndex] || [];
    const dealerScore = useMemo(() => scoreHand(dealer), [dealer]);

    const totalBet = useMemo(() => {
        if (bets.length === 0) return bet;
        return bets.reduce((a, b) => a + b, 0);
    }, [bets, bet]);

    // Stats
    const totalGames = history.length;
    const wins = history.filter((h) => h.net > 0).length;
    const losses = history.filter((h) => h.net < 0).length;
    const pushes = history.filter((h) => h.net === 0).length;
    const totalProfit = history.reduce((sum, h) => sum + h.net, 0);

    const createDeck = useCallback((): Card[] => {
        const deck: Card[] = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                idCounter.current += 1;
                deck.push({ suit, rank, id: `${rank}-${suit}-${idCounter.current}` });
            }
        }
        return shuffle(deck);
    }, []);

    const initDeck = useCallback(() => {
        deckRef.current = createDeck();
    }, [createDeck]);

    const drawCard = useCallback((): Card | null => {
        if (deckRef.current.length === 0) initDeck();
        return deckRef.current.pop() ?? null;
    }, [initDeck]);

    const clearDealTimers = useCallback(() => {
        dealTimersRef.current.forEach((t) => clearTimeout(t));
        dealTimersRef.current = [];
    }, []);

    useEffect(() => {
        if (bankroll <= 0 && (phase === "betting" || phase === "roundEnd")) {
            setBankroll(100);
        }
    }, [bankroll, phase]);

    useEffect(() => {
        initDeck();
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setBankroll(Number(saved));
        setHistory(safeReadHistory());
        setPhase("betting");
        return () => clearDealTimers();
    }, [initDeck, clearDealTimers]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, String(bankroll));
    }, [bankroll]);

    const giveCardToHand = useCallback(
        (handIndex: number) => {
            const card = drawCard();
            if (!card) return;
            setPlayerHands((hands) => {
                const next = hands.map((h) => [...h]);
                next[handIndex].push(card);
                return next;
            });
        },
        [drawCard]
    );

    const giveCardDealer = useCallback(() => {
        const card = drawCard();
        if (!card) return;
        setDealer((d) => [...d, card]);
    }, [drawCard]);

    const resetRound = (msg: string) => {
        setPhase("roundEnd");
        setMessage(msg);
    };

    const finalizeRound = useCallback(
        (dealerFinalTotal: number, dealerBJ: boolean) => {
            const results: RoundResult[] = [];
            let payout = 0;
            let insurancePayout = 0;

            playerHands.forEach((hand, idx) => {
                const p = scoreHand(hand).total;
                const betVal = bets[idx];
                const playerBJ = isNaturalBlackjack(hand);

                if (playerBJ && !dealerBJ) {
                    results[idx] = "win";
                    payout += betVal * 2.5;
                    return;
                }
                if (playerBJ && dealerBJ) {
                    results[idx] = "push";
                    payout += betVal;
                    return;
                }
                if (!playerBJ && dealerBJ) {
                    results[idx] = "lose";
                    return;
                }
                if (p > 21) {
                    results[idx] = "lose";
                } else if (dealerFinalTotal > 21) {
                    results[idx] = "win";
                    payout += betVal * 2;
                } else if (p > dealerFinalTotal) {
                    results[idx] = "win";
                    payout += betVal * 2;
                } else if (p < dealerFinalTotal) {
                    results[idx] = "lose";
                } else {
                    results[idx] = "push";
                    payout += betVal;
                }
            });

            if (insuranceDecision === "taken" && dealerBJ) {
                insurancePayout = insuranceBet * 3;
            }

            const net = payout + insurancePayout - totalBet - insuranceBet;
            setBankroll((b) => b + payout + insurancePayout);
            setRoundResult(results);
            setRoundDelta(net);
            resetRound("Round complete.");

            const entry: BlackjackHistoryEntry = {
                id: generateId(),
                date: betTimestampRef.current ?? new Date().toISOString(),
                bet,
                totalBet,
                bets: [...bets],
                result: results,
                dealerHand: [...dealer],
                playerHands: playerHands.map((h) => [...h]),
                doubled: hasDoubled,
                split: hasSplit,
                net,
                insuranceBet,
                insuranceDecision,
                insurancePayout,
            };

            setHistory((prev) => {
                const next = [entry, ...prev].slice(0, MAX_HISTORY_ENTRIES);
                writeHistory(next);
                return next;
            });
        },
        [playerHands, totalBet, dealer, bet, bets, hasDoubled, hasSplit, insuranceBet, insuranceDecision]
    );

    const startRound = () => {
        if (phase === "dealing" || phase === "playerTurn" || phase === "dealerTurn") return;
        if (bet < MIN_BET) { setMessage(`Minimum bet is ${formatCurrency(MIN_BET)}.`); return; }
        if (bet > bankroll) { setMessage("Not enough balance."); return; }

        clearDealTimers();
        setRoundResult([]);
        setRoundDelta(null);
        setHasSplit(false);
        setHasDoubled(false);
        setInsuranceDecision("none");
        setInsuranceBet(0);
        setMessage("Dealing...");
        setRevealDealer(false);
        setPlayerHands([[]]);
        setActiveHandIndex(0);
        setDealer([]);
        setPhase("dealing");
        setBets([bet]);
        setBankroll((b) => b - bet);
        betTimestampRef.current = new Date().toISOString();

        if (deckRef.current.length < deckRefillThreshold) initDeck();

        const schedule = (fn: () => void, delay: number) => {
            const id = window.setTimeout(fn, delay);
            dealTimersRef.current.push(id);
        };

        schedule(() => giveCardToHand(0), 150);
        schedule(() => giveCardDealer(), 400);
        schedule(() => giveCardToHand(0), 650);
        schedule(() => giveCardDealer(), 900);
        schedule(() => {
            setPhase("playerTurn");
            setMessage("Your turn.");
        }, 1100);
    };

    const hit = () => {
        if (phase !== "playerTurn") return;
        if (isNaturalBlackjack(activeHand)) return;
        if (scoreHand(activeHand).total >= 21) return;
        giveCardToHand(activeHandIndex);
    };

    const stand = () => {
        if (phase !== "playerTurn") return;
        nextHandOrDealer();
    };

    const canDouble =
        phase === "playerTurn" &&
        activeHand.length === 2 &&
        bankroll >= bets[activeHandIndex] &&
        !isNaturalBlackjack(activeHand);

    const doubleDown = () => {
        if (!canDouble) return;
        setHasDoubled(true);
        setBets((b) => {
            const next = [...b];
            next[activeHandIndex] *= 2;
            return next;
        });
        setBankroll((b) => b - bets[activeHandIndex]);
        giveCardToHand(activeHandIndex);
        nextHandOrDealer(true);
    };

    const canSplit =
        phase === "playerTurn" &&
        !hasSplit &&
        activeHand.length === 2 &&
        activeHand[0]?.rank === activeHand[1]?.rank &&
        bankroll >= bets[activeHandIndex];

    const splitHand = () => {
        if (!canSplit) return;
        setHasSplit(true);
        setBankroll((b) => b - bets[activeHandIndex]);

        setPlayerHands((hands) => {
            const current = hands[activeHandIndex];
            const left = [current[0]];
            const right = [current[1]];
            const next = hands.map((h) => [...h]);
            next.splice(activeHandIndex, 1, left, right);
            return next;
        });
        setBets((b) => {
            const next = [...b];
            next.splice(activeHandIndex, 1, b[activeHandIndex], b[activeHandIndex]);
            return next;
        });

        setTimeout(() => {
            giveCardToHand(activeHandIndex);
            giveCardToHand(activeHandIndex + 1);
        }, 50);
    };

    const nextHandOrDealer = (forceEnd?: boolean) => {
        const nextIndex = activeHandIndex + 1;
        if (nextIndex < playerHands.length && !forceEnd) {
            setActiveHandIndex(nextIndex);
            setMessage(`Playing hand ${nextIndex + 1} of ${playerHands.length}`);
        } else {
            setPhase("dealerTurn");
            setMessage("Dealer's turn...");
            setRevealDealer(true);
        }
    };

    useEffect(() => {
        if (phase === "playerTurn" && activeHand.length > 0) {
            const { total } = scoreHand(activeHand);
            if (isNaturalBlackjack(activeHand)) {
                nextHandOrDealer();
                return;
            }
            if (total > 21) {
                setRoundResult((r) => {
                    const next = [...r];
                    next[activeHandIndex] = "lose";
                    return next;
                });
                nextHandOrDealer();
            }
        }
    }, [activeHand, phase, activeHandIndex]);

    useEffect(() => {
        if (phase !== "dealerTurn") return;

        const dealerBJ = isNaturalBlackjack(dealer);
        const allBusted = playerHands.every((h) => scoreHand(h).total > 21);
        const allBlackjack = playerHands.every((h) => isNaturalBlackjack(h));

        if (allBusted || (allBlackjack && !dealerBJ)) {
            setRevealDealer(true);
            const early = setTimeout(() => finalizeRound(dealerScore.total, dealerBJ), 500);
            return () => clearTimeout(early);
        }

        const timer = setTimeout(() => {
            const { total, soft } = scoreHand(dealer);
            const shouldHit = total < 17 || (total === 17 && soft && dealerSoft17 === "hit");
            if (shouldHit) {
                giveCardDealer();
            } else {
                finalizeRound(total, dealerBJ);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [dealer, phase, dealerSoft17, playerHands, giveCardDealer, finalizeRound, dealerScore.total]);

    const setBetSafe = (value: number) => {
        if (phase === "dealing" || phase === "playerTurn" || phase === "dealerTurn") return;
        setBet(Math.max(MIN_BET, Math.min(value, bankroll)));
    };

    const showSplitHands = playerHands.length > 1;
    const hitDisabled = phase !== "playerTurn" || isNaturalBlackjack(activeHand) || scoreHand(activeHand).total >= 21;
    const canDeal = phase !== "playerTurn" && phase !== "dealerTurn" && phase !== "dealing";

    const canOfferInsurance =
        phase === "playerTurn" &&
        insuranceDecision === "none" &&
        dealer[0]?.rank === "A" &&
        playerHands.length === 1 &&
        activeHand.length === 2;

    const insuranceCost = bet / 2;
    const canTakeInsurance = canOfferInsurance && bankroll >= insuranceCost;

    const takeInsurance = () => {
        if (!canTakeInsurance) return;
        setInsuranceDecision("taken");
        setInsuranceBet(insuranceCost);
        setBankroll((b) => b - insuranceCost);
        setMessage(`Insurance taken for ${formatCurrency(insuranceCost)}.`);
    };

    const declineInsurance = () => {
        if (!canOfferInsurance) return;
        setInsuranceDecision("declined");
        setInsuranceBet(0);
        setMessage("Insurance declined.");
    };

    const isActive = phase === "playerTurn" || phase === "dealerTurn" || phase === "dealing";

    return (
        <div className="text-neutral-200 font-sans selection:bg-emerald-500/30 xl:pb-0 pb-24">
            <div className="mx-auto max-w-6xl px-3 sm:px-4">
                {/* Header */}
                <header className="mb-6 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Blackjack</h1>
                        <p className="text-neutral-500 text-xs sm:text-sm mt-1">
                            3:2 Blackjack • DAS • Insurance 2:1
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

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 sm:gap-8">
                    {/* --- Game Table --- */}
                    <div className="order-1 box-primary rounded-2xl shadow-2xl overflow-hidden self-start">
                        {/* Felt background */}
                        <div className="bg-gradient-to-b from-[#0d5c2e] via-[#0a4a25] to-[#07381c] p-4 sm:p-6 relative">
                            {/* Subtle felt texture */}
                            <div className="absolute inset-0 opacity-[0.03]" style={{
                                backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M5 0h1L0 5V4l5-4zM6 5v1H5l1-1z'/%3E%3C/g%3E%3C/svg%3E\")",
                            }} />

                            {/* Dealer Section */}
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] sm:text-xs uppercase tracking-widest text-emerald-200/60 font-semibold">
                                            Dealer
                                        </span>
                                        {dealer.length > 0 && phase !== "dealing" && (
                                            <ScoreBadge
                                                total={revealDealer ? dealerScore.total : scoreHand([dealer[0]]).total}
                                                soft={revealDealer ? dealerScore.soft : scoreHand([dealer[0]]).soft}
                                                blackjack={revealDealer && isNaturalBlackjack(dealer)}
                                                busted={revealDealer && dealerScore.total > 21}
                                            />
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isActive}
                                        onClick={() => setDealerSoft17((m) => (m === "stand" ? "hit" : "stand"))}
                                        className="rounded-full px-2.5 py-1 text-[10px] font-semibold bg-black/20 border border-emerald-300/20 text-emerald-200/60 hover:text-emerald-200 transition disabled:opacity-40"
                                    >
                                        {dealerSoft17 === "stand" ? "Stand S17" : "Hit S17"}
                                    </button>
                                </div>

                                <div className="min-h-[110px] sm:min-h-[140px] flex items-center">
                                    <Hand cards={dealer} hideSecond={!revealDealer} />
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="my-4 sm:my-6 border-t border-emerald-300/10 relative">
                                <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-900/80 border border-emerald-300/15 rounded-full px-3 py-0.5">
                                    <span className="text-[9px] uppercase tracking-widest text-emerald-200/40 font-semibold">vs</span>
                                </div>
                            </div>

                            {/* Player Section */}
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-[10px] sm:text-xs uppercase tracking-widest text-emerald-200/60 font-semibold">
                                        Player
                                    </span>
                                </div>

                                <div className={`grid gap-3 sm:gap-4 ${showSplitHands ? "md:grid-cols-2" : ""}`}>
                                    {playerHands.map((hand, idx) => {
                                        const { total, soft } = scoreHand(hand);
                                        const isActiveHand = phase === "playerTurn" && idx === activeHandIndex;
                                        const result = roundResult[idx];
                                        const isBJ = isNaturalBlackjack(hand);
                                        const busted = total > 21;

                                        return (
                                            <div
                                                key={`hand-${idx}`}
                                                className={`rounded-xl p-3 sm:p-4 transition-all duration-300 ${
                                                    isActiveHand
                                                        ? "bg-emerald-400/10 border border-emerald-400/30 shadow-lg shadow-emerald-500/10"
                                                        : "bg-black/15 border border-emerald-300/10"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {showSplitHands && (
                                                            <span className="text-[10px] text-emerald-200/40 font-semibold">
                                                                Hand {idx + 1}
                                                            </span>
                                                        )}
                                                        {hand.length > 0 && (
                                                            <ScoreBadge total={total} soft={soft} blackjack={isBJ} busted={busted} />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-emerald-200/40 font-mono">
                                                            {formatCurrency(bets[idx] ?? bet)}
                                                        </span>
                                                        {result && <ResultBadge result={result} />}
                                                    </div>
                                                </div>

                                                <div className="min-h-[110px] sm:min-h-[140px] flex items-center">
                                                    <Hand cards={hand} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="bg-neutral-950/80 border-t border-neutral-800 px-4 sm:px-6 py-3 sm:py-4">
                            {/* Insurance */}
                            <AnimatedSection show={canOfferInsurance}>
                                <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
                                    <span className="text-xs text-amber-300">
                                        Dealer shows Ace — Insurance for {formatCurrency(insuranceCost)}?
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={takeInsurance}
                                            disabled={!canTakeInsurance}
                                            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            Yes
                                        </button>
                                        <button
                                            onClick={declineInsurance}
                                            className="rounded-lg bg-neutral-700 px-3 py-1.5 text-xs font-bold text-neutral-200 transition hover:bg-neutral-600"
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>
                            </AnimatedSection>

                            {/* Round result */}
                            <AnimatedSection show={phase === "roundEnd" && roundDelta !== null}>
                                <div className="mb-3">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`rounded-xl px-4 py-2.5 text-sm font-bold text-center border ${
                                            (roundDelta ?? 0) > 0
                                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                                : (roundDelta ?? 0) < 0
                                                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                                                    : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                        }`}
                                    >
                                        {(roundDelta ?? 0) > 0 && `+${formatCurrency(roundDelta ?? 0)}`}
                                        {(roundDelta ?? 0) < 0 && `${formatCurrency(roundDelta ?? 0)}`}
                                        {(roundDelta ?? 0) === 0 && "Push — Bet returned"}
                                    </motion.div>
                                </div>
                            </AnimatedSection>

                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={hit}
                                    disabled={hitDisabled}
                                    className="rounded-xl bg-emerald-500 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600 active:scale-[0.97]"
                                >
                                    Hit
                                </button>
                                <button
                                    onClick={stand}
                                    disabled={phase !== "playerTurn"}
                                    className="rounded-xl bg-blue-500 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600 active:scale-[0.97]"
                                >
                                    Stand
                                </button>
                                <button
                                    onClick={doubleDown}
                                    disabled={!canDouble}
                                    className="rounded-xl bg-amber-500 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600 active:scale-[0.97]"
                                >
                                    Double
                                </button>
                                <button
                                    onClick={splitHand}
                                    disabled={!canSplit}
                                    className="rounded-xl bg-purple-500 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600 active:scale-[0.97]"
                                >
                                    Split
                                </button>
                            </div>

                            {/* Status */}
                            <div className="mt-2.5 text-[10px] sm:text-[11px] text-neutral-500">
                                {message}
                            </div>
                        </div>
                    </div>

                    {/* --- Right Panel --- */}
                    <div className="order-2 space-y-4">
                        {/* Betting */}
                        <motion.div
                            layout
                            transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
                            className="box-primary rounded-2xl p-5 shadow-xl"
                        >
                            <motion.div layout="position" className="flex flex-col gap-4">
                                <motion.div layout="position">
                                    <label className="text-xs font-semibold text-neutral-500 uppercase mb-2 block">
                                        Bet Amount
                                    </label>
                                    <div className="text-2xl font-bold font-mono text-amber-400 mb-3">
                                        {formatCurrency(bet)}
                                    </div>

                                    <div className="flex flex-wrap gap-1.5">
                                        {chipValues.map((v) => (
                                            <button
                                                key={v}
                                                onClick={() => setBetSafe(bet + v)}
                                                disabled={isActive}
                                                className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-300 hover:bg-amber-400/20 transition disabled:opacity-40 active:scale-95"
                                            >
                                                +{v}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {[10, 25, 50, 100].map((v) => (
                                            <button
                                                key={v}
                                                onClick={() => setBetSafe(bet - v)}
                                                disabled={isActive}
                                                className="rounded-lg bg-neutral-800 border border-neutral-700 px-2.5 py-1.5 text-[11px] font-bold text-neutral-400 hover:bg-neutral-700 transition disabled:opacity-40 active:scale-95"
                                            >
                                                -{v}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                                        <button
                                            onClick={() => setBetSafe(MIN_BET)}
                                            disabled={isActive}
                                            className="rounded-lg bg-neutral-800 border border-neutral-700 py-1.5 text-[11px] font-bold text-neutral-400 hover:bg-neutral-700 transition disabled:opacity-40"
                                        >
                                            MIN
                                        </button>
                                        <button
                                            onClick={() => setBetSafe(bet * 2)}
                                            disabled={isActive}
                                            className="rounded-lg bg-neutral-800 border border-neutral-700 py-1.5 text-[11px] font-bold text-neutral-400 hover:bg-neutral-700 transition disabled:opacity-40"
                                        >
                                            2×
                                        </button>
                                        <button
                                            onClick={() => setBetSafe(Math.floor(bankroll / 2))}
                                            disabled={isActive}
                                            className="rounded-lg bg-neutral-800 border border-neutral-700 py-1.5 text-[11px] font-bold text-neutral-400 hover:bg-neutral-700 transition disabled:opacity-40"
                                        >
                                            HALF
                                        </button>
                                        <button
                                            onClick={() => setBetSafe(bankroll)}
                                            disabled={isActive}
                                            className="rounded-lg bg-red-900/30 border border-red-700/40 py-1.5 text-[11px] font-bold text-red-400 hover:bg-red-800/40 transition disabled:opacity-40"
                                        >
                                            ALL IN
                                        </button>
                                    </div>
                                </motion.div>

                                <motion.div layout="position">
                                    <button
                                        onClick={startRound}
                                        disabled={!canDeal}
                                        className={`w-full py-4 rounded-xl text-lg font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none ${
                                            canDeal
                                                ? "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20"
                                                : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                        }`}
                                    >
                                        DEAL
                                    </button>
                                </motion.div>
                            </motion.div>
                        </motion.div>

                        {/* Stats */}
                        <div className="box-primary rounded-2xl p-4 shadow-xl">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Statistics</h3>
                            <div className="grid grid-cols-4 gap-2">
                                <div className="bg-neutral-950/50 rounded-lg p-2.5 text-center">
                                    <div className="text-[9px] uppercase text-neutral-500 font-semibold">Hands</div>
                                    <div className="text-base font-mono font-bold text-white">{totalGames}</div>
                                </div>
                                <div className="bg-neutral-950/50 rounded-lg p-2.5 text-center">
                                    <div className="text-[9px] uppercase text-neutral-500 font-semibold">Wins</div>
                                    <div className="text-base font-mono font-bold text-emerald-400">{wins}</div>
                                </div>
                                <div className="bg-neutral-950/50 rounded-lg p-2.5 text-center">
                                    <div className="text-[9px] uppercase text-neutral-500 font-semibold">Losses</div>
                                    <div className="text-base font-mono font-bold text-red-400">{losses}</div>
                                </div>
                                <div className="bg-neutral-950/50 rounded-lg p-2.5 text-center">
                                    <div className="text-[9px] uppercase text-neutral-500 font-semibold">Push</div>
                                    <div className="text-base font-mono font-bold text-amber-400">{pushes}</div>
                                </div>
                            </div>
                            <div className="mt-2 bg-neutral-950/50 rounded-lg p-2.5 flex items-center justify-between">
                                <span className="text-[9px] uppercase text-neutral-500 font-semibold">Total Profit</span>
                                <span className={`font-mono font-bold text-sm ${totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {totalProfit >= 0 ? "+" : ""}{formatCurrency(precise(totalProfit))}
                                </span>
                            </div>
                        </div>

                        {/* History */}
                        <div className="box-primary rounded-2xl p-4 max-h-[250px] flex flex-col">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">History</h3>
                            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                                {history.length === 0 && (
                                    <div className="text-neutral-600 text-xs text-center py-4">No hands yet</div>
                                )}
                                {history.slice(0, 30).map((h) => (
                                    <div key={h.id} className="flex items-center justify-between bg-neutral-950/30 p-2 rounded border border-neutral-800/30 text-xs">
                                        <div className="flex items-center gap-2">
                                            {h.result.map((r, i) => (
                                                <span
                                                    key={i}
                                                    className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${
                                                        r === "win" ? "bg-emerald-500/20 text-emerald-400"
                                                            : r === "lose" ? "bg-red-500/20 text-red-400"
                                                                : "bg-amber-500/20 text-amber-400"
                                                    }`}
                                                >
                                                    {r === "win" ? "W" : r === "lose" ? "L" : "P"}
                                                </span>
                                            ))}
                                            {h.split && <span className="text-[9px] text-purple-400">Split</span>}
                                            {h.doubled && <span className="text-[9px] text-amber-400">2x</span>}
                                        </div>
                                        <div className={`font-mono font-bold ${
                                            h.net > 0 ? "text-emerald-400" : h.net < 0 ? "text-red-400" : "text-amber-400"
                                        }`}>
                                            {h.net > 0 ? "+" : ""}{formatCurrency(h.net)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}