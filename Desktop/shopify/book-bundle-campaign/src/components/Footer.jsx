function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-zinc-900 text-gray-400 py-12 pb-28 border-t border-zinc-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    {/* Brand / About */}
                    <div>
                        <h3 className="text-white text-lg font-bold mb-4">Book Bundle</h3>
                        <p className="text-sm leading-relaxed max-w-xs">
                            Curated reading lists for the modern mind.
                            Select your favorite 7 books and save over 70% today.
                        </p>
                    </div>

                    {/* Trust & Security */}
                    <div>
                        <h3 className="text-white text-lg font-bold mb-4">100% Secure Checkout</h3>
                        <div className="flex flex-col gap-2 text-sm">
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Encrypted Payment Processing</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>30-Day Money Back Guarantee</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Support */}
                    <div>
                        <h3 className="text-white text-lg font-bold mb-4">Need Help?</h3>
                        <p className="text-sm mb-2">Questions about your bundle?</p>
                        <a href="mailto:support@example.com" className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium">
                            Contact Support
                        </a>
                    </div>
                </div>

                <div className="border-t border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
                    <p>&copy; {currentYear} Book Bundle Campaign. All rights reserved.</p>
                    <div className="flex gap-4">
                        <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
                        <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
