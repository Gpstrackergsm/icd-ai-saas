import { useState, useEffect } from 'react';
import Header from './components/Header';
import BookGrid from './components/BookGrid';
import StickyBar from './components/StickyBar';
import BookDetailModal from './components/BookDetailModal';
import { books } from './data/books';

function App() {
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [selectedDetailBook, setSelectedDetailBook] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Clear toast after 3 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleToggleBook = (book) => {
    if (selectedBooks.includes(book.id)) {
      setSelectedBooks(prev => prev.filter(id => id !== book.id));
    } else {
      if (selectedBooks.length >= 7) {
        setToastMessage("You can only pick 7 books for this bundle.");
        return;
      }
      setSelectedBooks(prev => [...prev, book.id]);
    }
  };

  const handleCheckout = () => {
    // In a real app, this would send data to backend
    const selectedData = books.filter(b => selectedBooks.includes(b.id));
    console.log("Checkout with:", selectedData);
    alert(`Proceeding to checkout with ${selectedBooks.length} books!`);
  };

  const handleReset = () => {
    setSelectedBooks([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-500 selection:text-white pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BookGrid
          books={books}
          selectedIds={selectedBooks}
          onToggle={handleToggleBook}
          onDetail={setSelectedDetailBook}
        />
      </main>

      <StickyBar
        count={selectedBooks.length}
        onCheckout={handleCheckout}
        onReset={handleReset}
      />

      <BookDetailModal
        book={selectedDetailBook}
        isOpen={!!selectedDetailBook}
        onClose={() => setSelectedDetailBook(null)}
        isSelected={selectedDetailBook ? selectedBooks.includes(selectedDetailBook.id) : false}
        onToggle={handleToggleBook}
      />

      {/* Toast Notification */}
      <div
        className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${toastMessage ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
          }`}
      >
        <div className="bg-red-500 text-white px-6 py-3 rounded-full shadow-xl font-medium flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {toastMessage}
        </div>
      </div>
    </div>
  );
}

export default App;
