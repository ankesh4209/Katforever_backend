const Product = require('../models/Product');

const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

const runDatabaseMigration = async () => {
    try {
        console.log('🔄 Starting Automatic Database Product Integrity Check...');

        // 1. Duplicate SKU Products Cleanup
        const products = await Product.find({}).sort({ createdAt: 1 });
        console.log(`[DB Migration] Total products in database: ${products.length}`);

        const seenSkus = new Set();
        const duplicateIds = [];

        for (const product of products) {
            const sku = product.sku?.trim();
            if (!sku) continue;

            if (seenSkus.has(sku)) {
                duplicateIds.push(product._id);
            } else {
                seenSkus.add(sku);
            }
        }

        if (duplicateIds.length > 0) {
            console.log(`[DB Migration] Found ${duplicateIds.length} duplicate SKU products. Purging...`);
            const deleteResult = await Product.deleteMany({ _id: { $in: duplicateIds } });
            console.log(`[DB Migration] Purged ${deleteResult.deletedCount} duplicate products successfully.`);
        } else {
            console.log('[DB Migration] No duplicate products found.');
        }

        // 2. Generate Unique Slugs for All Remaining Products
        const remainingProducts = await Product.find({});
        console.log(`[DB Migration] Validating unique slugs for ${remainingProducts.length} products...`);

        let slugUpdatedCount = 0;

        for (const product of remainingProducts) {
            const baseSlug = slugify(product.name || 'product');
            let uniqueSlug = baseSlug;
            let count = 1;

            // Resolve slug collisions
            while (true) {
                const exists = await Product.findOne({
                    slug: uniqueSlug,
                    _id: { $ne: product._id }
                });
                if (!exists) break;

                uniqueSlug = `${baseSlug}-${count}`;
                count++;
            }

            if (product.slug !== uniqueSlug) {
                await Product.updateOne({ _id: product._id }, { $set: { slug: uniqueSlug } });
                slugUpdatedCount++;
            }
        }

        if (slugUpdatedCount > 0) {
            console.log(`[DB Migration] Successfully updated unique slugs for ${slugUpdatedCount} products.`);
        } else {
            console.log('[DB Migration] All product slugs are already unique.');
        }

        // 3. Drop & Rebuild Strict Unique Indexes
        console.log('[DB Migration] Verifying unique database indexes for SKU and Slug...');

        try {
            await Product.collection.dropIndex('sku_1');
        } catch (e) {
            // Index might not exist, ignore
        }

        try {
            await Product.collection.dropIndex('slug_1');
        } catch (e) {
            // Index might not exist, ignore
        }

        await Product.collection.createIndex({ sku: 1 }, { unique: true });
        await Product.collection.createIndex({ slug: 1 }, { unique: true });

        console.log('✅ Database Product Integrity Check and Unique Indexes established successfully!');
    } catch (error) {
        console.error('❌ Error during automatic database migration process:', error);
    }
};

module.exports = { runDatabaseMigration };
