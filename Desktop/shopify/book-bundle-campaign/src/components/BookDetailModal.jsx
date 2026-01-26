function BookDetailModal({ book, isOpen, onClose, isSelected, onToggle }) {
    if (!isOpen || !book) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-zinc-700 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors z-10"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-2/5 aspect-[2/3]">
                        <img
                            src={book.cover}
                            alt={book.title}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    <div className="p-6 md:p-8 flex-1">
                        <div className="mb-2">
                            <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                                {book.genre}
                            </span>
                        </div>

                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                            {book.title}
                        </h2>
                        <p className="text-lg text-gray-500 dark:text-gray-400 mb-6 font-medium">
                            by {book.author}
                        </p>

                        <div className="flex items-center gap-1 mb-6">
                            {[...Array(5)].map((_, i) => (
                                <svg key={i} xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${i < Math.round(book.rating) ? 'text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ))}
                            <span className="ml-2 text-gray-500">({book.rating})</span>
                        </div>

                        <div className="prose dark:prose-invert mb-8">
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                {book.description} {book.description} {book.description}
                                <br /><br />
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
                            </p>
                        </div>

                        <button
                            onClick={() => onToggle(book)}
                            className={`w-full md:w-auto min-w-[200px] py-3 px-6 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2 ${isSelected
                                ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-900'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl hover:shadow-indigo-500/30'
                                }`}
                        >
                            {isSelected ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Remove from Bundle
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                    </svg>
                                    Add to Bundle
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BookDetailModal;
