import { useState, useEffect } from 'react';

function Header() {
    const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime <= 0) {
                    clearInterval(timer);
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    return (
        <header className="relative py-12 px-4 text-center border-b border-gray-100 dark:border-gray-800 overflow-hidden">
            {/* Background Texture Orb */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4 leading-tight">
                    The CBT Flip Chart: An Evidence-Based Psychoeducational Tool for Anxiety, Depression, Stress, Insomnia, PTSD, and More
                </h1>

                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-6 mt-8 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg shadow-sm animate-pulse">
                        Offer Expires in {formatTime(timeLeft)}
                    </div>

                    <h2 className="text-xl md:text-2xl font-bold text-indigo-700 dark:text-indigo-400 mb-2">
                        🎁 SURPRISE GIFT! 🎁
                    </h2>
                    <p className="text-lg text-gray-700 dark:text-gray-300">
                        We've upgraded your order. Add <span className="font-bold text-gray-900 dark:text-white">6 more books</span> from the list below for the <span className="font-bold text-green-600 dark:text-green-400">SAME PRICE</span>.
                    </p>
                </div>
            </div>
        </header>
    );
}

export default Header;
