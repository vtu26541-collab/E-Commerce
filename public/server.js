require('dotenv').config();
const express    = require('express');
const mysql      = require('mysql2/promise');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'luminary_secret_key_change_in_production';

/* ─── MIDDLEWARE ──────────────────────────────────── */
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ─── DATABASE POOL ───────────────────────────────── */
const db = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || 'loka',
  database: process.env.DB_NAME     || 'luminary_shop',
  waitForConnections: true,
  connectionLimit: 10,
});

/* ─── DATABASE INIT ───────────────────────────────── */
async function initDatabase() {
  const conn = await db.getConnection();
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`luminary_shop\``);
    await conn.query(`USE \`luminary_shop\``);

    // USERS TABLE
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        first_name   VARCHAR(80),
        last_name    VARCHAR(80),
        email        VARCHAR(191) NOT NULL UNIQUE,
        phone        VARCHAR(30),
        password     VARCHAR(255) NOT NULL,
        newsletter   TINYINT(1) DEFAULT 0,
        role         ENUM('user','admin') DEFAULT 'user',
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // PRODUCTS TABLE
    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        name        VARCHAR(255) NOT NULL,
        category    VARCHAR(80),
        price       DECIMAL(10,2) NOT NULL,
        old_price   DECIMAL(10,2),
        rating      DECIMAL(3,2) DEFAULT 0,
        reviews     INT DEFAULT 0,
        badge       VARCHAR(20),
        image       VARCHAR(512),
        description TEXT,
        stock       INT DEFAULT 100,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // CART TABLE
    await conn.query(`
      CREATE TABLE IF NOT EXISTS cart (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        user_id     INT NOT NULL,
        product_id  INT NOT NULL,
        qty         INT DEFAULT 1,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY uq_cart (user_id, product_id)
      )
    `);

    // ORDERS TABLE
    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        user_id     INT NOT NULL,
        subtotal    DECIMAL(10,2),
        tax         DECIMAL(10,2),
        total       DECIMAL(10,2),
        status      ENUM('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending',
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // ORDER ITEMS TABLE
    await conn.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        order_id    INT NOT NULL,
        product_id  INT NOT NULL,
        qty         INT NOT NULL,
        price       DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (order_id)  REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    // SEED PRODUCTS if empty
    const [rows] = await conn.query(`SELECT COUNT(*) AS cnt FROM products`);
    if (rows[0].cnt === 0) {
      await seedProducts(conn);
    }

    console.log('✅ Database initialized successfully.');
  } finally {
    conn.release();
  }
}

async function seedProducts(conn) {
  const products = [
    ['Wireless Noise-Cancelling Headphones','electronics',14999,19999,4.8,312,'sale','https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400','Premium audio experience with 30h battery.'],
    ['Minimalist Leather Watch','fashion',8999,null,4.9,188,'new','https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400','Swiss movement, sapphire crystal glass.'],
    ['Aroma Diffuser Set','home',2499,3499,4.7,94,'sale','https://images.unsplash.com/photo-1616594266894-c6f57f40e57d?w=400','Ultrasonic diffuser with 10 essential oil blends.'],
    ['Luxury Face Serum','beauty',3299,null,4.6,227,'new','https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400','Vitamin C & hyaluronic acid for radiant skin.'],
    ['Ultra-Slim Laptop Stand','electronics',1899,2499,4.5,65,'sale','https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400','Aluminium alloy, adjustable height.'],
    ['Handwoven Linen Shirt','fashion',4599,null,4.7,143,null,'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400','100% pure linen, relaxed fit, ethically sourced.'],
    ['Ceramic Pour-Over Coffee Set','home',3199,3999,4.9,78,'sale','https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400','Handmade ceramic dripper with matching mug.'],
    ['Botanical Perfume Oil','beauty',1799,null,4.8,201,'new','https://images.unsplash.com/photo-1541643600914-78b084683702?w=400','Long-lasting roll-on with natural floral notes.'],
    ['Mechanical Keyboard','electronics',9999,12999,4.6,521,'sale','https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400','Tactile switches, RGB backlit, TKL layout.'],
    ['Silk Slip Dress','fashion',6499,null,4.7,89,'new','https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400','100% mulberry silk, adjustable straps.'],
    ['Himalayan Salt Lamp','home',1299,1899,4.4,156,'sale','https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=400','Authentic Himalayan pink salt, warm amber glow.'],
    ['Retinol Night Cream','beauty',2699,null,4.5,312,null,'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400','Advanced retinol formula for smoother skin.'],
  ];
  for (const p of products) {
    await conn.query(
      `INSERT INTO products (name,category,price,old_price,rating,reviews,badge,image,description) VALUES (?,?,?,?,?,?,?,?,?)`, p
    );
  }
  console.log('✅ Products seeded.');
}

/* ─── JWT MIDDLEWARE ──────────────────────────────── */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorised: no token provided.' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorised: invalid token.' });
  }
}

/* ─── AUTH ROUTES ─────────────────────────────────── */

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { first_name, last_name, email, phone, password, newsletter } = req.body;

  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ message: 'An account with this email already exists.' });

    const hashed = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO users (first_name, last_name, email, phone, password, newsletter) VALUES (?,?,?,?,?,?)',
      [first_name || '', last_name || '', email, phone || '', hashed, newsletter ? 1 : 0]
    );

    const user = { id: result.insertId, first_name, last_name, email };
    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ token, user, cart: [] });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!users.length) return res.status(401).json({ message: 'Invalid email or password.' });

    const user = users[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password.' });

    // Fetch cart
    const [cartRows] = await db.query(
      `SELECT c.product_id AS id, c.qty, p.name, p.price, p.image, p.category
       FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?`,
      [user.id]
    );

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    const safeUser = { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email };
    return res.json({ token, user: safeUser, cart: cartRows });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, first_name, last_name, email, phone, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found.' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

/* ─── PRODUCT ROUTES ──────────────────────────────── */

// GET /api/products
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    if (category) { query += ' AND category = ?'; params.push(category); }
    if (search)   { query += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (sort === 'price-asc')  query += ' ORDER BY price ASC';
    else if (sort === 'price-desc') query += ' ORDER BY price DESC';
    else if (sort === 'rating')     query += ' ORDER BY rating DESC';
    else if (sort === 'name')       query += ' ORDER BY name ASC';
    else query += ' ORDER BY id ASC';

    const [rows] = await db.query(query, params);
    return res.json(rows);
  } catch (err) {
    console.error('Products error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/products/:id
app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Product not found.' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

/* ─── CART ROUTES ─────────────────────────────────── */

// GET /api/cart  (auth required)
app.get('/api/cart', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.product_id AS id, c.qty, p.name, p.price, p.image, p.category
       FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?`,
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/cart  (add or update item)
app.post('/api/cart', authMiddleware, async (req, res) => {
  const { product_id, qty = 1 } = req.body;
  if (!product_id) return res.status(400).json({ message: 'product_id is required.' });
  try {
    await db.query(
      `INSERT INTO cart (user_id, product_id, qty) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)`,
      [req.user.id, product_id, qty]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/cart/:productId  (set exact qty)
app.put('/api/cart/:productId', authMiddleware, async (req, res) => {
  const { qty } = req.body;
  try {
    if (!qty || qty <= 0) {
      await db.query('DELETE FROM cart WHERE user_id = ? AND product_id = ?', [req.user.id, req.params.productId]);
    } else {
      await db.query(
        `INSERT INTO cart (user_id, product_id, qty) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE qty = VALUES(qty)`,
        [req.user.id, req.params.productId, qty]
      );
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/cart/:productId
app.delete('/api/cart/:productId', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM cart WHERE user_id = ? AND product_id = ?', [req.user.id, req.params.productId]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/cart  (clear entire cart)
app.delete('/api/cart', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM cart WHERE user_id = ?', [req.user.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

/* ─── ORDER ROUTES ────────────────────────────────── */

// POST /api/orders  (create order from cart)
app.post('/api/orders', authMiddleware, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Fetch cart
    const [cartRows] = await conn.query(
      `SELECT c.product_id, c.qty, p.price FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?`,
      [req.user.id]
    );
    if (!cartRows.length) { await conn.rollback(); return res.status(400).json({ message: 'Cart is empty.' }); }

    const subtotal = cartRows.reduce((s, r) => s + r.price * r.qty, 0);
    const tax      = subtotal * 0.18;
    const total    = subtotal + tax;

    const [orderResult] = await conn.query(
      'INSERT INTO orders (user_id, subtotal, tax, total) VALUES (?,?,?,?)',
      [req.user.id, subtotal.toFixed(2), tax.toFixed(2), total.toFixed(2)]
    );
    const orderId = orderResult.insertId;

    for (const item of cartRows) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, qty, price) VALUES (?,?,?,?)',
        [orderId, item.product_id, item.qty, item.price]
      );
    }

    await conn.query('DELETE FROM cart WHERE user_id = ?', [req.user.id]);
    await conn.commit();

    return res.status(201).json({ order_id: orderId, total: total.toFixed(2) });
  } catch (err) {
    await conn.rollback();
    console.error('Order error:', err);
    return res.status(500).json({ message: 'Server error.' });
  } finally {
    conn.release();
  }
});

// GET /api/orders  (user order history)
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]
    );
    for (const order of orders) {
      const [items] = await db.query(
        `SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }
    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

/* ─── SERVE FRONTEND ──────────────────────────────── */
// ✅ FIXED: Added 'public' to all sendFile paths
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

/* ─── START ───────────────────────────────────────── */
(async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`\n🛍  LUMINARY server running at http://localhost:${PORT}`);
      console.log(`   Press Ctrl+C to stop.\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
})();