
const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    sku: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    images: [{ type: String }],
    categoryId: { type: String, required: true },
    categoryName: { type: String },
    description: { type: String, required: true },
    additionalSections: [{
        title: { type: String, required: true },
        content: { type: String, required: true }
    }],
    reviewCount: { type: Number, default: 12 },
    rating: { type: Number, default: 4.5 },
    mrp: { type: Number, default: 0 },
    price: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    availableSizes: [{ type: String }],
    availableColors: [{ type: String }],
    stock: {
        type: Number,
        required: true,
        default: 0
    },
    inStock: {
        type: Boolean,
        default: true
    },
    isTrending: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isCODAvailable: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Pre-validate hook to auto-generate unique slug from product name
productSchema.pre('validate', async function () {
    if (this.isModified('name') || !this.slug) {
        const slugify = (text) => {
            return text
                .toString()
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-');
        };

        let baseSlug = slugify(this.name || 'product');
        let uniqueSlug = baseSlug;
        let count = 1;
        const Product = mongoose.model('Product');

        // Dynamic collision check
        while (true) {
            const exists = await Product.findOne({
                slug: uniqueSlug,
                _id: { $ne: this._id }
            });
            if (!exists) {
                break;
            }
            uniqueSlug = `${baseSlug}-${count}`;
            count++;
        }
        this.slug = uniqueSlug;
    }
});

module.exports = mongoose.model('Product', productSchema);
