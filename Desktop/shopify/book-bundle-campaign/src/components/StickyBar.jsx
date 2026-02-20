import React, { useState, useEffect } from 'react';

function StickyBar({ count, onCheckout, onReset }) {
    const isComplete = count === 7;
    const progress = (count / 7) * 100;

    // Countdown Timer State (15 minutes)
    const [timeLeft, setTimeLeft] = useState(15 * 60);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-8px_30px_rgba(0,0,0,0.15)] z-50 p-4 transition-all duration-300">
            {/* Urgency Banner - Mobile Only (Top of sticky bar) */}
            <div className="md:hidden w-full flex justify-center mb-3">
                <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse border border-rose-100 dark:border-rose-900/50">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Offer expires in {formatTime(timeLeft)}
                </div>
            </div>

            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

                {/* Left Side: Progress + Timer (Desktop) */}
                <div className="flex items-center gap-6 w-full md:w-auto">

                    {/* Progress */}
                    <div className="flex-1 md:flex-none min-w-[240px]">
                        <div className="flex items-end justify-between gap-2 mb-1.5">
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{count}</span>
                                <span className="text-gray-500 font-medium text-sm">/ 7 books selected</span>
                            </div>
                            {/* Desktop Timer */}
                            <div className="hidden md:flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-sm font-bold bg-rose-50 dark:bg-rose-900/20 px-2.5 py-0.5 rounded-full border border-rose-100 dark:border-rose-800/50">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="tabular-nums">{formatTime(timeLeft)}</span>
                            </div>
                        </div>
                        <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 ease-out rounded-full shadow-sm"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Mobile Reset (Hidden on desktop) */}
                    <button
                        onClick={onReset}
                        className="md:hidden text-gray-400 font-medium text-sm hover:text-rose-500 transition-colors whitespace-nowrap"
                    >
                        Reset
                    </button>
                </div>

                {/* Right Side: Actions */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Desktop Reset */}
                    <button
                        onClick={onReset}
                        className="hidden md:block text-gray-600 hover:text-gray-900 font-bold transition-colors px-4 py-2 text-sm underline decoration-gray-300 hover:underline"
                    >
                        Reset Selection
                    </button>

                    <button
                        disabled={!isComplete}
                        onClick={onCheckout}
                        className={`group relative flex-1 md:flex-none py-3.5 px-8 rounded-xl font-bold text-lg shadow-xl shadow-indigo-500/20 transition-all duration-300 transform flex flex-col items-center justify-center leading-tight overflow-hidden ${isComplete
                            ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white hover:scale-[1.02] hover:shadow-indigo-500/40 cursor-pointer'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed border-2 border-zinc-300 dark:border-zinc-700'
                            }`}
                    >
                        {isComplete ? (
                            <>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 mix-blend-overlay" />
                                <div className="relative flex items-center gap-2">
                                    <span>Proceed to Checkout</span>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </div>
                                <span className="relative text-xs font-medium text-indigo-100 mt-0.5">
                                    Save $171 today
                                </span>
                            </>
                        ) : (
                            <span className="text-base font-bold opacity-100">Select {7 - count} more</span>
                        )}
                    </button>
                </div>

            </div>

            {/* Success Notification */}
            {isComplete && (
                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white px-6 py-2.5 rounded-full shadow-xl animate-bounce flex items-center gap-2 font-medium w-max max-w-[90vw] text-center z-50 ring-4 ring-emerald-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Bundle complete! checkout now.</span>
                </div>
            )}
        </div>
    );
}

export default StickyBar;
