function BookCard({ book, isSelected, onToggle, onDetail }) {
    return (
        <div
            className={`relative group rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform bg-white dark:bg-zinc-800 ${isSelected ? 'ring-4 ring-indigo-500 scale-[1.02]' : 'hover:-translate-y-1'}`}
        >
            <div className="relative aspect-[2/3] overflow-hidden cursor-pointer" onClick={() => onDetail(book)}>
                <img
                    src={book.coverUrl || book.cover} // Fallback for mixed data sources
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                />

                {/* Selection Overlay (Always visible when selected) */}
                {isSelected && (
                    <div className="absolute inset-0 bg-indigo-500/40 flex items-center justify-center backdrop-blur-[2px]">
                        <div className="bg-white text-indigo-600 rounded-full p-3 shadow-lg transform scale-110">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* Hover Overlay for Add/Remove (Desktop) */}
                <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-center bg-gradient-to-t from-black/60 to-transparent pt-12">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle(book);
                        }}
                        className={`w-full py-3 px-4 rounded-lg font-bold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 ${isSelected
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-white hover:bg-indigo-50 text-indigo-600'
                            }`}
                    >
                        {isSelected ? 'Remove' : 'Select'}
                    </button>
                </div>
            </div>

            {/* Mobile Action Button (Visible below image only on mobile/touch) */}
            <div className="md:hidden p-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle(book);
                    }}
                    className={`w-full py-2 rounded-lg font-semibold text-sm ${isSelected
                        ? 'bg-red-100 text-red-600'
                        : 'bg-indigo-50 text-indigo-600'
                        }`}
                >
                    {isSelected ? 'Remove' : 'Select'}
                </button>
            </div>
        </div>
    );
}

export default BookCard;
