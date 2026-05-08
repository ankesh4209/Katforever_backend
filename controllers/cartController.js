
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Robust cart lookup: try user first, then sessionId as fallback
// This ensures we ALWAYS find the cart regardless of auth state
const findCart = async (req, sessionId, populate = true) => {
    let cart = null;

    // Try user cart first
    if (req.user) {
        cart = await Cart.findOne({ user: req.user._id });
    }

    // Fallback to sessionId (handles stale tokens, race conditions)
    if (!cart && sessionId) {
        cart = await Cart.findOne({ sessionId });
    }

    if (cart && populate) {
        await cart.populate('items.product', 'name images price');
    }

    return cart;
};

// Find or create cart
const findOrCreateCart = async (req, sessionId) => {
    let cart = await findCart(req, sessionId, false);

    if (!cart) {
        if (req.user) {
            cart = new Cart({ user: req.user._id, items: [] });
        } else if (sessionId) {
            cart = new Cart({ sessionId, items: [] });
        }
    }

    return cart;
};

// Build standardized response with all totals calculated
const buildCartResponse = (cart) => {
    if (!cart || !cart.items || cart.items.length === 0) {
        return { items: [], itemCount: 0, subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0 };
    }

    const items = cart.items.map(item => {
        const product = item.product;
        const price = product?.price || item.price;
        const lineTotal = price * item.quantity;
        return {
            _id: item._id,
            product: product || { _id: item.product, name: item.name, images: [item.image], price: item.price },
            quantity: item.quantity,
            price: price,
            lineTotal: lineTotal
        };
    });

    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    const itemCount = items.reduce((count, i) => count + i.quantity, 0);
    const shipping = 0;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + shipping + tax;

    return { _id: cart._id, items, itemCount, subtotal, discount: 0, shipping, tax, total };
};

// Helper to extract sessionId from body OR query
const getSessionId = (req) => {
    return req.body?.sessionId || req.query?.sessionId || null;
};

// GET /api/cart
// Unified: if user is logged in AND sessionId is provided, auto-merge guest cart
const getCart = async (req, res) => {
    try {
        const sessionId = getSessionId(req);
        if (!req.user && !sessionId) return res.json(buildCartResponse(null));

        // Auto-merge: logged-in user with a guest sessionId
        if (req.user && sessionId) {
            let userCart = await Cart.findOne({ user: req.user._id });
            if (!userCart) {
                userCart = new Cart({ user: req.user._id, items: [] });
            }

            const guestCart = await Cart.findOne({ sessionId });
            if (guestCart && guestCart.items.length > 0) {
                for (const guestItem of guestCart.items) {
                    const existing = userCart.items.find(
                        item => item.product.toString() === guestItem.product.toString()
                    );
                    if (existing) {
                        existing.quantity += guestItem.quantity;
                    } else {
                        userCart.items.push(guestItem);
                    }
                }
                await Cart.deleteOne({ sessionId });
            }

            await userCart.save();
            await userCart.populate('items.product', 'name images price');
            return res.json(buildCartResponse(userCart));
        }

        const cart = await findCart(req, sessionId);
        res.json(buildCartResponse(cart));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/cart/add
const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const sessionId = getSessionId(req);

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        if (!req.user && !sessionId) return res.status(400).json({ message: 'Login or session required' });

        let cart = await findOrCreateCart(req, sessionId);

        const existingItem = cart.items.find(item => item.product.toString() === productId);
        if (existingItem) {
            existingItem.quantity += quantity || 1;
        } else {
            cart.items.push({
                product: productId,
                quantity: quantity || 1,
                price: product.price,
                name: product.name,
                image: product.images?.[0] || ''
            });
        }

        await cart.save();
        await cart.populate('items.product', 'name images price');
        res.status(201).json(buildCartResponse(cart));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PUT /api/cart/:itemId
const updateCartItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;
        const sessionId = getSessionId(req);

        if (quantity < 1) return res.status(400).json({ message: 'Quantity must be at least 1' });

        const cart = await findCart(req, sessionId, false);
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        const item = cart.items.id(itemId);
        if (!item) return res.status(404).json({ message: 'Item not found in cart' });

        item.quantity = quantity;
        await cart.save();
        await cart.populate('items.product', 'name images price');
        res.json(buildCartResponse(cart));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/cart/:itemId
const removeFromCart = async (req, res) => {
    try {
        const { itemId } = req.params;
        const sessionId = getSessionId(req);

        const cart = await findCart(req, sessionId, false);
        if (!cart) return res.json(buildCartResponse(null));

        cart.items = cart.items.filter(item => item._id.toString() !== itemId);
        await cart.save();
        await cart.populate('items.product', 'name images price');
        res.json(buildCartResponse(cart));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/cart/clear
const clearCart = async (req, res) => {
    try {
        const sessionId = getSessionId(req);
        const cart = await findCart(req, sessionId, false);
        if (cart) {
            cart.items = [];
            await cart.save();
        }
        res.json(buildCartResponse(null));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/cart/merge (requires login)
const mergeCart = async (req, res) => {
    try {
        const { sessionId } = req.body;

        let userCart = await Cart.findOne({ user: req.user._id });
        if (!userCart) {
            userCart = new Cart({ user: req.user._id, items: [] });
        }

        // Merge guest cart items if exists
        if (sessionId) {
            const guestCart = await Cart.findOne({ sessionId });
            if (guestCart && guestCart.items.length > 0) {
                for (const guestItem of guestCart.items) {
                    const existing = userCart.items.find(
                        item => item.product.toString() === guestItem.product.toString()
                    );
                    if (existing) {
                        existing.quantity += guestItem.quantity;
                    } else {
                        userCart.items.push(guestItem);
                    }
                }
                await Cart.deleteOne({ sessionId });
            }
        }

        await userCart.save();
        await userCart.populate('items.product', 'name images price');
        res.json(buildCartResponse(userCart));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart, mergeCart };
