function Header() {
    return (
        <header className="py-12 px-4 text-center bg-gradient-to-b from-gray-50 to-white dark:from-zinc-900 dark:to-zinc-950">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
                Reddit Readers’ <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">Favorite Books</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 font-light max-w-2xl mx-auto">
                Curated top picks from the community. <br className="hidden md:block" />
                <strong className="text-indigo-600 dark:text-indigo-400 font-bold">Pick 7 for $39</strong>. Free Shipping.
            </p>
        </header>
    );
}

export default Header;
