import BookCard from './BookCard';

function BookGrid({ books, selectedIds, onToggle, onDetail }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8 pb-32">
            {books.map((book) => (
                <BookCard
                    key={book.id}
                    book={book}
                    isSelected={selectedIds.includes(book.id)}
                    onToggle={onToggle}
                    onDetail={onDetail}
                />
            ))}
        </div>
    );
}

export default BookGrid;
