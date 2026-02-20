import { useState, useEffect } from 'react';
import Header from './components/Header';
import BookGrid from './components/BookGrid';
import StickyBar from './components/StickyBar';
import Footer from './components/Footer';
import BookDetailModal from './components/BookDetailModal';
import { books } from './data/books';

function App() {
  // Use real Shopify data if available, otherwise use mock data
  const [bookData] = useState(() => {
    if (window.shopifyBookData && window.shopifyBookData.length > 0) {
      return window.shopifyBookData;
    }
    return books;
  });

  // Identify Main Product (CBT Flip Chart) and Selectable Books
  const mainProduct = bookData.find(b => b.title.toLowerCase().includes("cbt flip chart") || b.title.toLowerCase().includes("evidence-based psychoeducational")) || bookData[0];
  const selectableBooks = bookData.filter(b => b.id !== mainProduct.id);

  const [selectedBooks, setSelectedBooks] = useState([mainProduct.id]);
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
    // Prevent unselecting the main product
    if (book.id === mainProduct.id) {
      setToastMessage("This main product is included in your bundle!");
      return;
    }

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

  // TODO: REPLACE THIS WITH YOUR REAL PRODUCT VARIANT ID FOR THE 7-BOOK BUNDLE
  // You can find this in your Shopify Admin URL for the product variant.
  // Example: .../variants/44665544332211 -> ID is 44665544332211
  // No longer using the single bundle variant ID because we are adding individual items
  // const BUNDLE_VARIANT_ID = 48328424063205;

  const handleCheckout = async () => {
    if (selectedBooks.length !== 7) {
      setToastMessage("Please select exactly 7 books.");
      return;
    }

    try {
      // 1. Prepare items for cart (7 individual books)
      const items = selectedBooks.map(bookId => {
        const book = bookData.find(b => b.id === bookId);
        // Use variantId if available, fall back to id for dev/mock but that won't work in real Shopify cart
        return {
          id: book?.variantId,
          quantity: 1
        };
      });

      // Validate we have IDs
      if (items.some(i => !i.id)) {
        setToastMessage("Error: Some books are missing Variant IDs.");
        console.error("Missing variant IDs for books:", selectedBooks);
        return;
      }

      // 2. Add to Cart via Shopify AJAX API
      const response = await fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: items
        })
      });

      if (response.ok) {
        // 3. Redirect to Checkout
        window.location.href = '/checkout';
      } else {
        const errorData = await response.json();
        console.error("Cart Error:", errorData);
        setToastMessage("Error adding to cart. Check console.");
        alert("Error: Could not add bundle to cart. potentially missing Variant ID configuration.");
      }
    } catch (error) {
      console.error("Checkout Error:", error);
      // Fallback for development/testing outside Shopify
      if (!window.Shopify) {
        alert(`[DEV MODE] Would checkout with books: \n${selectedBooks.join('\n')}`);
      } else {
        setToastMessage("Network error. Please try again.");
      }
    }
  };

  const handleReset = () => {
    // Reset to only the main product
    setSelectedBooks([mainProduct.id]);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-500 selection:text-white pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Main Product Hero Section */}
        <div className="mb-12 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-indigo-100 dark:border-indigo-900/50 flex flex-col md:flex-row transform md:-translate-y-6">
          <div className="md:w-1/3 relative aspect-[2/3] md:aspect-auto">
            <img
              src={mainProduct.coverUrl || mainProduct.cover}
              alt={mainProduct.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
              Included Main Product
            </div>
          </div>
          <div className="p-6 md:p-8 md:w-2/3 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm uppercase tracking-wide">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Automatically Included
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">{mainProduct.title}</h2>
            <div className="prose dark:prose-invert text-gray-600 dark:text-gray-300 mb-6 line-clamp-4 text-sm md:text-base">
              {mainProduct.description}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-auto">
              <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold px-4 py-3 rounded-lg flex items-center gap-2 border border-green-100 dark:border-green-800/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                1 Item Selected
              </div>
              <p className="text-sm text-gray-500 font-medium">Please select 6 more books below to complete your bundle.</p>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="flex items-center gap-4 py-8 mb-4">
          <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
          <span className="text-gray-400 font-medium uppercase tracking-widest text-sm">Select 6 More Books</span>
          <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
        </div>

        <BookGrid
          books={selectableBooks}
          selectedIds={selectedBooks}
          onToggle={handleToggleBook}
          onDetail={setSelectedDetailBook}
        />
      </main>

      <Footer />

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
