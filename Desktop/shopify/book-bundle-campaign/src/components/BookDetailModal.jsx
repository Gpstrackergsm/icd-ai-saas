function BookDetailModal({ book, isOpen, onClose, isSelected, onToggle }) {
    if (!isOpen || !book) return null;

    const coverImage = book.coverUrl || book.cover;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300"
                onClick={onClose}
            />

            <div className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row transform transition-all animate-in fade-in zoom-in-95 duration-200 border border-white/10">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all z-20"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Left Side: Image */}
                <div className="w-full md:w-2/5 lg:w-1/3 relative bg-gray-100 dark:bg-zinc-950 flex items-center justify-center p-6 md:p-0">
                    <div className="relative w-48 md:w-full md:h-full shadow-2xl md:shadow-none aspect-[2/3] md:aspect-auto">
                        <img
                            src={coverImage}
                            alt={book.title}
                            className="w-full h-full object-cover md:absolute md:inset-0"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://placehold.co/400x600?text=No+Cover';
                            }}
                        />
                        {/* Gradient Overlay for desktop text protection if needed, though we have side-by-side layout */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent pointer-events-none md:hidden"></div>
                    </div>
                </div>

                {/* Right Side: Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white dark:bg-zinc-900">
                    <div className="mb-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                            {book.genre || 'General'}
                        </span>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 leading-tight tracking-tight">
                        {book.title}
                    </h2>

                    <div className="flex items-center gap-3 mb-6">
                        <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                            by <span className="text-indigo-600 dark:text-indigo-400">{book.author}</span>
                        </p>
                        <div className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                        <div className="flex items-center text-yellow-400">
                            <span className="font-bold text-gray-900 dark:text-white mr-1">{book.rating || '4.5'}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        </div>
                    </div>

                    <div className="prose prose-lg dark:prose-invert max-w-none mb-10 text-gray-600 dark:text-gray-300 leading-relaxed">
                        <p>
                            {book.description || "No description available for this title."}
                        </p>
                        <p className="mt-4">
                            This book is an essential addition to your collection, offering deep insights and practical knowledge.
                        </p>
                    </div>

                    <div className="border-t border-gray-100 dark:border-zinc-800 pt-6 mt-auto">
                        <button
                            onClick={() => onToggle(book)}
                            className={`w-full md:w-auto min-w-[240px] py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 transform hover:-translate-y-1 ${isSelected
                                ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-900'
                                : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:shadow-xl hover:shadow-indigo-500/30'
                                }`}
                        >
                            {isSelected ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Remove from Bundle
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Add to Bundle
                                </>
                            )}
                        </button>
                        <p className="text-center md:text-left mt-3 text-sm text-gray-400">
                            {isSelected ? 'This book is currently in your selection.' : 'Select this book to add it to your 7-book bundle.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BookDetailModal;
