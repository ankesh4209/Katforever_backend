const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Configure dotenv
dotenv.config({ path: path.join(__dirname, '../.env') });

const Product = require('../models/Product');
const connectDB = require('../config/db');

const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

const cleanup = async () => {
    try {
        await connectDB();
        console.log('=== Database Connection Established ===');

        console.log('1. Starting Duplicate Products Cleanup...');
        // Sort by createdAt ascending to ensure we keep the oldest record
        const products = await Product.find({}).sort({ createdAt: 1 });
        console.log(`Found ${products.length} total products in database.`);

        const seenSkus = new Set();
        const duplicateIds = [];

        for (const product of products) {
            const sku = product.sku?.trim();
            if (!sku) {
                console.log(`Warning: Product ID ${product._id} has no SKU.`);
                continue;
            }
            if (seenSkus.has(sku)) {
                duplicateIds.push(product._id);
            } else {
                seenSkus.add(sku);
            }
        }

        console.log(`Found ${duplicateIds.length} duplicate products to remove.`);

        if (duplicateIds.length > 0) {
            const deleteResult = await Product.deleteMany({ _id: { $in: duplicateIds } });
            console.log(`Purged ${deleteResult.deletedCount} duplicate documents from database.`);
        }

        console.log('2. Migrating Unique Slugs for All Remaining Products...');
        const remainingProducts = await Product.find({});
        console.log(`Processing slugs for ${remainingProducts.length} remaining unique products.`);

        for (const product of remainingProducts) {
            let baseSlug = slugify(product.name || 'product');
            let uniqueSlug = baseSlug;
            let count = 1;

            // Generate unique slug by querying database for collisons
            while (true) {
                const exists = await Product.findOne({
                    slug: uniqueSlug,
                    _id: { $ne: product._id }
                });
                if (!exists) {
                    break;
                }
                uniqueSlug = `${baseSlug}-${count}`;
                count++;
            }

            product.slug = uniqueSlug;
            // Bypass validation during index setup
            await Product.updateOne({ _id: product._id }, { $set: { slug: uniqueSlug } });
        }

        console.log('Generated unique slugs for all active products successfully.');

        console.log('3. Rebuilding Database Unique Indexes...');
        // Rebuild SKU index to be unique
        try {
            await Product.collection.dropIndex('sku_1');
            console.log('Dropped old SKU index.');
        } catch (e) {
            // Index might not exist
        }
        
        try {
            await Product.collection.dropIndex('slug_1');
            console.log('Dropped old Slug index.');
        } catch (e) {
            // Index might not exist
        }

        await Product.collection.createIndex({ sku: 1 }, { unique: true });
        console.log('Created unique index for SKU.');

        await Product.collection.createIndex({ slug: 1 }, { unique: true });
        console.log('Created unique index for Slug.');

        console.log('=== Cleanup and Slug Migration Script Completed Successfully! ===');
        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup migration process:', error);
        process.exit(1);
    }
};

cleanup();
