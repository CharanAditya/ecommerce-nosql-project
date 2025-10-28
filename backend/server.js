import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import 'dotenv/config'; 

// --- Express & Middleware Setup ---
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors()); // Allow requests from your frontend
app.use(express.json()); // Allow app to accept JSON in request bodies

// --- Mongoose Model Schemas ---


// --- User Schema ---
// Defines the structure for documents in the 'users' collection
const userSchema = new mongoose.Schema({
  name: {
    first: { type: String, required: true },
    middle: { type: String },
    last: { type: String, required: true },
  },
  phone: { type: String, required: true },
  address: {
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
  },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
}, { timestamps: true }); // Added timestamps here

const User = mongoose.model('User', userSchema);

// --- Product Schema ---
// Defines the structure for documents in the 'products' collection
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  imageUrl: { type: String, default: 'https://placehold.co/600x400/27272a/a5a5a5?text=Product' },
  avg_rating: { type: Number, default: 0 },
  review_count: { type: Number, default: 0 }
}, { strict: false, timestamps: true }); // Added strict: false and timestamps

const Product = mongoose.model('Product', productSchema);

// --- Review Schema ---
// Defines the structure for documents in the 'reviews' collection
const reviewSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },

}, { timestamps: true });

const Review = mongoose.model('Review', reviewSchema);

// --- Order Schema ---
// Defines the structure for documents in the 'orders' collection
const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      // "Snapshotting" product data at the time of purchase
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true, min: 1 }
    }
  ],
  total_amount: { type: Number, required: true },
  status: { type: String, default: 'Pending' },
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);


// --- Mongoose Connection ---
const mongoUri = process.env.MONGODB_URI;
mongoose.connect(mongoUri)
  .then(() => console.log('Successfully connected to MongoDB using Mongoose!'))
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1); // Exit the application if connection fails
  });


// === API ENDPOINTS ===

// --- AUTH ENDPOINTS ---

// POST /api/auth/register (Create a new user)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, phone, address } = req.body;

    // Simple validation
    if (!email || !password || !name || !name.first || !name.last || !phone || !address || !address.city || !address.state || !address.country) {
        return res.status(400).json({ message: "All required fields must be provided." });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists." });
    }

    // For this project, we'll store it in plaintext.
    const newUser = new User({
      email: email.toLowerCase(),
      password: password,
      name,
      phone,
      address
    });

    const savedUser = await newUser.save();

    // Don't send the password back, even on register
    const userToReturn = {
      _id: savedUser._id,
      name: savedUser.name,
      email: savedUser.email,
      isAdmin: savedUser.isAdmin,
      address: savedUser.address, // Include address
      phone: savedUser.phone      // Include phone
    };

    res.status(201).json(userToReturn);
  } catch (error) {
    console.error("Error registering user:", error);
    // Provide more specific error if it's a validation error
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Error registering user", error: error.message });
  }
});

// POST /api/auth/login (Authenticate a user)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Don't send the password back.
    const userToReturn = {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      address: user.address,
      phone: user.phone
    };

    res.status(200).json(userToReturn);

  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
});


// --- USER ENDPOINTS ---

// GET /api/users (Get all users - for potential future use, e.g., admin panel)
app.get('/api/users', async (req, res) => {
  try {
    // We only select fields we need. CRITICAL: Never send passwords!
    const users = await User.find().select('_id name email isAdmin address phone createdAt'); // Added more fields
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
});


// --- PRODUCT ENDPOINTS ---

// GET /api/products (Get all products)
app.get('/api/products', async (req, res) => {
  try {
    // We sort by 'createdAt' in descending order to show newest products first
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
});

// GET /api/products/:id (Get a single product) - Useful for refreshing after review
app.get('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
    }
    try {
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.status(200).json(product);
    } catch (error) {
        console.error("Error fetching single product:", error);
        res.status(500).json({ message: "Error fetching product", error: error.message });
    }
});


// POST /api/products (Create a new product)
app.post('/api/products', async (req, res) => {
  try {
    // Basic validation
    const { name, price, category } = req.body;
    if (!name || price === undefined || !category) {
        return res.status(400).json({ message: "Name, price, and category are required." });
    }
    if (isNaN(Number(price)) || Number(price) < 0) {
        return res.status(400).json({ message: "Price must be a non-negative number." });
    }

    // In a real app, add admin authorization check here

    const newProduct = new Product({
      name: req.body.name,
      description: req.body.description,
      price: Number(req.body.price),
      category: req.body.category,
      imageUrl: req.body.imageUrl || undefined // Use default if empty
      // Allow any other fields due to strict: false
    });
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Error creating product", error: error.message });
  }
});

// PUT /api/products/:id
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  try {

    // 1. Fetch the existing product to see its current fields
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 2. Identify fields to remove (present in DB but not in req.body)
    const unsetFields = {};
    const existingKeys = Object.keys(existingProduct.toObject()); // Get all keys from the document in DB
    const newKeys = Object.keys(req.body); // Keys sent from the frontend

    // Define core/protected keys that should NEVER be unset this way
    const protectedKeys = ['_id', 'name', 'description', 'price', 'category', 'imageUrl', 'avg_rating', 'review_count', 'createdAt', 'updatedAt', '__v'];

    existingKeys.forEach(key => {
      // If a key exists in the DB, is NOT protected, and is NOT in the incoming data, mark it for removal
      if (!newKeys.includes(key) && !protectedKeys.includes(key)) {
        unsetFields[key] = ""; // The value for $unset doesn't matter
      }
    });

    // 3. Perform the update using both $set and $unset
    const updatePayload = {
        $set: req.body,      // Update/add fields from the request
    };
    // Only include $unset if there are fields to remove
    if (Object.keys(unsetFields).length > 0) {
        updatePayload.$unset = unsetFields; // Remove fields marked for deletion
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true, runValidators: true, omitUndefined: false } // Return the updated document
      // omitUndefined: false ensures $unset works correctly
    );
    // --- END CORRECTED LOGIC ---

    // Double check if update somehow failed (shouldn't happen if existingProduct was found)
    if (!updatedProduct) {
       return res.status(404).json({ message: "Product not found during update process." });
    }

    res.status(200).json(updatedProduct); // Send back the fully updated product

  } catch (error) {
    console.error("Error updating product:", error);
     if (error.name === 'ValidationError') {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Error updating product", error: error.message });
  }
});

// DELETE /api/products/:id (Delete a product)
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  try {
    // Also delete all reviews associated with this product
    const reviewDeleteResult = await Review.deleteMany({ product_id: id });
    console.log(`Deleted ${reviewDeleteResult.deletedCount} reviews for product ${id}.`);

    // Delete the product itself
    const productDeleteResult = await Product.findByIdAndDelete(id);

    if (!productDeleteResult) {
      return res.status(404).json({ message: "Product not found" });
    }

    console.log(`Successfully deleted product ${id}.`);
    res.status(204).send(); // 204 No Content is standard for successful delete
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Error deleting product", error: error.message });
  }
});


// --- REVIEW ENDPOINTS ---

// GET /api/products/:productId/reviews (Get reviews for a specific product)
app.get('/api/products/:productId/reviews', async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }
  try {
    const reviews = await Review.find({ product_id: productId })
      .populate('user_id', 'name email') // "Join" with User collection, get name/email
      .sort({ createdAt: -1 });
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Error fetching reviews", error: error.message });
  }
});

// POST /api/reviews (Add a new review for a product)
app.post('/api/reviews', async (req, res) => {
  const { product_id, user_id, rating, comment } = req.body;

  if (!mongoose.Types.ObjectId.isValid(product_id) || !mongoose.Types.ObjectId.isValid(user_id)) {
    return res.status(400).json({ message: "Invalid Product or User ID" });
  }
  if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
  }

  try {
    // 1. Create the new review
    const newReview = new Review({
      product_id,
      user_id,
      rating: Number(rating),
      comment
    });
    const savedReview = await newReview.save();

    // 2. Recalculate the average rating and count for the product
    const stats = await Review.aggregate([
      { $match: { product_id: new mongoose.Types.ObjectId(product_id) } },
      {
        $group: {
          _id: '$product_id',
          avg_rating: { $avg: '$rating' },
          review_count: { $sum: 1 }
        }
      }
    ]);

    // 3. Update the product with the new stats
    if (stats.length > 0) {
      const { avg_rating, review_count } = stats[0];
      await Product.findByIdAndUpdate(product_id, {
        // Ensure avg_rating is stored with reasonable precision
        avg_rating: parseFloat(avg_rating.toFixed(2)),
        review_count: review_count
      });
    } else {
      // Handle case where this is the first review (or aggregate failed)
      await Product.findByIdAndUpdate(product_id, {
         avg_rating: Number(rating),
         review_count: 1
      });
    }

    // 4. Populate the user data for the review we just created to send to frontend
    const populatedReview = await Review.findById(savedReview._id)
      .populate('user_id', 'name email');

    res.status(201).json(populatedReview); // Send back the new, populated review

  } catch (error) {
    console.error("Error adding review:", error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Error adding review", error: error.message });
  }
});


// --- ORDER ENDPOINTS ---

/**
 * POST /api/orders (Create a new order)
 * Expects a body like:
 * {
 * user_id: "...",
 * items: [
 * { product_id: "...", quantity: 2 },
 * { product_id: "...", quantity: 1 }
 * ]
 * }
 */
app.post('/api/orders', async (req, res) => {
  const { user_id, items } = req.body;

  if (!mongoose.Types.ObjectId.isValid(user_id) || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Invalid user ID or empty/invalid items array." });
  }

  try {
    // 1. Get all product details from the DB to prevent "price tampering"
    const productIds = items.map(item => item.product_id).filter(id => mongoose.Types.ObjectId.isValid(id)); // Filter invalid IDs
    if (productIds.length !== items.length) {
        return res.status(400).json({ message: "One or more product IDs are invalid." });
    }
    const productsFromDB = await Product.find({ _id: { $in: productIds } });

    // Check if all requested products were found
    if (productsFromDB.length !== productIds.length) {
       const foundIds = productsFromDB.map(p => p._id.toString());
       const missingIds = productIds.filter(id => !foundIds.includes(id));
       return res.status(400).json({ message: `Could not find products with IDs: ${missingIds.join(', ')}` });
    }


    let total_amount = 0;
    const orderItems = [];

    // 2. Create "snapshot" items and calculate total
    for (const item of items) {
      const product = productsFromDB.find(p => p._id.toString() === item.product_id);
      // We already checked above if product exists, but double-check for safety
      if (!product) {
        // Should not happen due to the check above, but good practice
        throw new Error(`Critical error: Product with ID ${item.product_id} was expected but not found.`);
      }

      // --- ROBUSTNESS FIX ---
      // Ensure price and quantity are treated as numbers, defaulting to 0 or 1
      const price = Number(product.price) || 0;
      const quantity = Number(item.quantity);
      if (isNaN(quantity) || quantity < 1) {
          return res.status(400).json({ message: `Invalid quantity for product ${product.name}: ${item.quantity}` });
      }
      // --- END FIX ---

      const itemTotal = price * quantity;
      total_amount += itemTotal;

      orderItems.push({
        product_id: product._id,
        name: product.name,
        price: price, // Use the safe, numeric price
        quantity: quantity // Use the safe, numeric quantity
      });
    }

    // 3. Create the new order
    const newOrder = new Order({
      user_id,
      items: orderItems,
      total_amount: parseFloat(total_amount.toFixed(2)), // Ensure total is stored correctly
      status: 'Pending'
    });

    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);

  } catch (error) {
    console.error("Error creating order:", error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Error creating order", error: error.message });
  }
});

// GET /api/orders/user/:userId (Get order history for a specific user)
app.get('/api/orders/user/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  try {
    const orders = await Order.find({ user_id: userId })
      .sort({ createdAt: -1 }); // Show most recent orders first
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ message: "Error fetching user orders", error: error.message });
  }
});


// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});

