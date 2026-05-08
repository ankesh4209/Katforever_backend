
const axios = require('axios');

const SHIPROCKET_API = 'https://apiv2.shiprocket.in/v1/external';
let authToken = null;
let tokenExpiry = null;

// @desc    Login to Shiprocket and get auth token
const shiprocketLogin = async () => {
    try {
        // Check if token is still valid
        if (authToken && tokenExpiry && new Date() < tokenExpiry) {
            return authToken;
        }

        const response = await axios.post(`${SHIPROCKET_API}/auth/login`, {
            email: process.env.SHIPROCKET_EMAIL,
            password: process.env.SHIPROCKET_PASSWORD
        });

        authToken = response.data.token;
        tokenExpiry = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);

        console.log('✅ Shiprocket authentication successful');
        return authToken;
    } catch (error) {
        console.error('❌ Shiprocket login failed:', error.response?.data || error.message);
        throw new Error('Shiprocket authentication failed');
    }
};


const createShipment = async (orderData) => {
    try {
        const token = await shiprocketLogin();

        const shipmentPayload = {
            order_id: orderData.orderId,
            order_date: new Date().toISOString().split('T')[0],
            pickup_location: "Primary",

            // Billing details (customer)
            billing_customer_name: orderData.customer.name,
            billing_last_name: "",
            billing_address: orderData.shippingAddress.address,
            billing_city: orderData.shippingAddress.city,
            billing_pincode: orderData.shippingAddress.postalCode,
            billing_state: orderData.shippingAddress.state || "Maharashtra",
            billing_country: orderData.shippingAddress.country || "India",
            billing_email: orderData.customer.email,
            billing_phone: orderData.customer.phone || "9999999999",

            // Shipping details (same as billing for most cases)
            shipping_is_billing: true,

            // Order items
            order_items: orderData.items.map(item => ({
                name: item.name,
                sku: item.product.toString().substring(0, 20),
                units: item.qty,
                selling_price: item.price,
                discount: 0,
                tax: 0,
                hsn: 0
            })),

            // Payment details
            payment_method: orderData.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
            shipping_charges: orderData.shippingPrice || 0,
            giftwrap_charges: 0,
            transaction_charges: 0,
            total_discount: 0,
            sub_total: orderData.itemsPrice,
            length: orderData.dimensions?.length || 10,
            breadth: orderData.dimensions?.breadth || 10,
            height: orderData.dimensions?.height || 10,
            weight: orderData.dimensions?.weight || 0.5
        };

        const response = await axios.post(
            `${SHIPROCKET_API}/orders/create/adhoc`,
            shipmentPayload,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Shiprocket shipment created:', response.data.order_id);

        return {
            success: true,
            shipmentId: response.data.shipment_id,
            orderId: response.data.order_id,
            channelOrderId: response.data.channel_order_id,
            awb: response.data.awb_code || null,
            courierName: response.data.courier_name || 'Pending',
            status: response.data.status
        };
    } catch (error) {
        console.error('❌ Shiprocket shipment creation failed:',
            error.response?.data || error.message);

        return {
            success: false,
            error: error.response?.data?.message || error.message
        };
    }
};

// @desc    Generate AWB (tracking number) for shipment
const generateAWB = async (shipmentId, courierId = null) => {
    try {
        const token = await shiprocketLogin();

        const payload = {
            shipment_id: shipmentId
        };

        if (courierId) {
            payload.courier_id = courierId;
        }

        const response = await axios.post(
            `${SHIPROCKET_API}/courier/assign/awb`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ AWB generated:', response.data.response.data.awb_code);

        return {
            success: true,
            awb: response.data.response.data.awb_code,
            courierName: response.data.response.data.courier_name
        };
    } catch (error) {
        console.error('❌ AWB generation failed:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message
        };
    }
};

// @desc    Track shipment by AWB code
const trackShipment = async (awbCode) => {
    try {
        const token = await shiprocketLogin();

        const response = await axios.get(
            `${SHIPROCKET_API}/courier/track/awb/${awbCode}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const trackingData = response.data.tracking_data;

        return {
            success: true,
            currentStatus: trackingData.shipment_status,
            currentLocation: trackingData.current_location || '',
            expectedDelivery: trackingData.edd || null,
            courier: trackingData.courier_name || '',
            trackingHistory: trackingData.shipment_track || [],
            trackUrl: trackingData.track_url || ''
        };
    } catch (error) {
        console.error('❌ Tracking failed:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || 'Tracking information not available'
        };
    }
};

// @desc    Schedule pickup for shipment
const schedulePickup = async (shipmentId) => {
    try {
        const token = await shiprocketLogin();

        const response = await axios.post(
            `${SHIPROCKET_API}/courier/generate/pickup`,
            {
                shipment_id: [shipmentId]
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Pickup scheduled');

        return {
            success: true,
            pickupStatus: response.data.pickup_status,
            message: response.data.response
        };
    } catch (error) {
        console.error('❌ Pickup scheduling failed:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message
        };
    }
};

// @desc    Cancel shipment
const cancelShipment = async (orderId) => {
    try {
        const token = await shiprocketLogin();

        const response = await axios.post(
            `${SHIPROCKET_API}/orders/cancel`,
            {
                ids: [orderId]
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Shipment cancelled');

        return {
            success: true,
            message: 'Shipment cancelled successfully'
        };
    } catch (error) {
        console.error('❌ Cancellation failed:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message
        };
    }
};

// @desc    Get available courier services for an order
const getServiceability = async (pickupPincode, deliveryPincode, weight, codAmount = 0) => {
    try {
        const token = await shiprocketLogin();

        const response = await axios.get(
            `${SHIPROCKET_API}/courier/serviceability`,
            {
                params: {
                    pickup_postcode: pickupPincode,
                    delivery_postcode: deliveryPincode,
                    weight: weight,
                    cod: codAmount > 0 ? 1 : 0
                },
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        return {
            success: true,
            availableCouriers: response.data.data.available_courier_companies || []
        };
    } catch (error) {
        console.error('❌ Serviceability check failed:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message
        };
    }
};

module.exports = {
    shiprocketLogin,
    createShipment,
    generateAWB,
    trackShipment,
    schedulePickup,
    cancelShipment,
    getServiceability
};
