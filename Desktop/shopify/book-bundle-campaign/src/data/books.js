const genres = ["Fiction", "Mystery", "Sci-Fi", "Fantasy", "Romance", "History", "Self-Help", "Business"];
const authors = ["Jane Doe", "John Smith", "Alice Wonderland", "Bob Builder", "Charlie Chocolate", "Eve Adams"];
const descriptions = [
    "A gripping tale of mystery and intrigue that keeps you on the edge of your seat.",
    "An inspiring journey of self-discovery and personal growth.",
    "A classic novel that has captured the hearts of millions.",
    "A deep dive into the complexities of modern life and relationships.",
    "An epic adventure across time and space."
];

export const books = Array.from({ length: 165 }, (_, i) => {
    const id = i + 1;
    const genre = genres[i % genres.length];
    const author = authors[i % authors.length];
    const desc = descriptions[i % descriptions.length];

    return {
        id,
        title: `Book Title ${id}`,
        author: author,
        description: desc,
        genre: genre,
        cover: `https://placehold.co/300x450/2${i % 9}2${i % 9}2${i % 9}/FFFFFF?text=Book+${id}`,
        price: 15.00, // Individual value (bundle price is fixed)
        rating: (Math.random() * 2 + 3).toFixed(1) // 3.0 to 5.0
    };
});
