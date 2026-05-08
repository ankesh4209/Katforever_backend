
const products = [
    {
        name: 'Royal Maroon Banarasi Silk',
        description: 'Elegant Banarasi silk saree with intricate zari work, perfect for weddings and festive occasions. Comes with a matching blouse piece.',
        price: 12999,
        originalPrice: 15999,
        categoryId: '1',
        images: [
            'https://images.unsplash.com/photo-1574634534894-89d7576c8259?w=800&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&auto=format&fit=crop&q=60',
        ],
        availableSizes: ['Free Size'],
        availableColors: ['Maroon', 'Red'],
        isTrending: true,
        rating: 4.8,
        reviewCount: 120,
    },
    {
        name: 'Emerald Green Anarkali Suit',
        description: 'Floor-length georgette Anarkali suit with embroidery details. Lightweight and comfortable for day functions.',
        price: 5499,
        originalPrice: 7999,
        categoryId: '2',
        images: [
            'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1574634534894-89d7576c8259?w=1200&auto=format&fit=crop&q=60',
        ],
        availableSizes: ['S', 'M', 'L', 'XL'],
        availableColors: ['Green', 'Blue'],
        isNewArrival: true,
        rating: 4.6,
        reviewCount: 85,
    },
    {
        name: 'Golden Kanjivaram Masterpiece',
        description: 'Pure silk Kanjivaram saree with temple border design. A timeless classic for the modern woman.',
        price: 24999,
        originalPrice: 24999, // Assuming no discount if not specified, or leave undefined
        categoryId: '3',
        images: [
            'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1574634534894-89d7576c8259?w=1200&auto=format&fit=crop&q=60',
        ],
        availableSizes: ['Free Size'],
        availableColors: ['Gold'],
        isTrending: true,
        rating: 4.9,
        reviewCount: 200,
    },
    {
        name: 'Pastel Pink Georgette Saree',
        description: 'Soft georgette saree with pearl embellishments. Subtle and sophisticated.',
        price: 3999,
        originalPrice: 4999,
        categoryId: '4',
        images: [
            'https://images.unsplash.com/photo-1574634534894-89d7576c8259?w=1200&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=60',
        ],
        availableSizes: ['Free Size'],
        availableColors: ['Pink', 'Peach'],
        isNewArrival: true,
        rating: 4.3,
        reviewCount: 45,
    },
];

module.exports = products;
