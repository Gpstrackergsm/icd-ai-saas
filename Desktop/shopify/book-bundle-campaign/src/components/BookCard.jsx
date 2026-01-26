function BookCard({ book, isSelected, onToggle, onDetail }) {
    return (
        <div
            className={`relative group rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform bg-white dark:bg-zinc-800 ${isSelected ? 'ring-4 ring-indigo-500 scale-[1.02]' : 'hover:-translate-y-1'}`}
        >
            <div className="relative aspect-[2/3] overflow-hidden cursor-pointer" onClick={() => onDetail(book)}>
                <img
                    src={book.cover}
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                />
                {isSelected && (
                    <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center backdrop-blur-[2px]">
                        <div className="bg-white text-indigo-600 rounded-full p-2 shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 flex flex-col h-full">
                <h3
                    className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 cursor-pointer hover:text-indigo-500 transition-colors"
                    onClick={() => onDetail(book)}
                >
                    {book.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{book.author}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4 flex-grow cursor-pointer" onClick={() => onDetail(book)}>
                    {book.description}
                </p>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle(book);
                    }}
                    className={`w-full py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${isSelected
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-indigo-500/30'
                        }`}
                >
                    {isSelected ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Remove
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
    );
}

export default BookCard;
