function StickyBar({ count, onCheckout, onReset }) {
    const isComplete = count === 7;
    const progress = (count / 7) * 100;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 p-4 transition-all duration-300">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

                {/* Progress Section */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex-1 md:flex-none">
                        <div className="flex items-end gap-2 mb-1">
                            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{count}</span>
                            <span className="text-gray-500 font-medium mb-1">/ 7 books selected</span>
                        </div>
                        <div className="h-2 w-full md:w-64 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Mobile Reset */}
                    <button
                        onClick={onReset}
                        className="md:hidden text-gray-400 font-medium hover:text-red-500 transition-colors"
                    >
                        Reset
                    </button>
                </div>

                {/* Action Section */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Desktop Reset */}
                    <button
                        onClick={onReset}
                        className="hidden md:block text-gray-500 hover:text-red-600 font-medium transition-colors px-4 py-2"
                    >
                        Reset Selection
                    </button>

                    <button
                        disabled={!isComplete}
                        onClick={onCheckout}
                        className={`flex-1 md:flex-none py-3 px-8 rounded-full font-bold text-lg shadow-lg transition-all duration-300 transform ${isComplete
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:scale-105 hover:shadow-indigo-500/50 cursor-pointer'
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        {isComplete ? 'Proceed to Checkout - $39' : `Select ${7 - count} more`}
                    </button>
                </div>

            </div>

            {/* Sticky Notification for Completion */}
            {isComplete && (
                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-2 rounded-full shadow-lg animate-bounce flex items-center gap-2 font-medium w-max max-w-[90vw] text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Great! You have selected 7 books. Checkout now for only $39.
                </div>
            )}
        </div>
    );
}

export default StickyBar;
