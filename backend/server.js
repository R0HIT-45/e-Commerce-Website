import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import Stripe from 'stripe';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const db = new Database('database.sqlite');

// Initialize DB schema
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    subcategory TEXT,
    description TEXT,
    price_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    image TEXT,
    featured INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    stock INTEGER DEFAULT 100
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_cents INTEGER NOT NULL,
    status TEXT DEFAULT 'created',
    stripe_session_id TEXT
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id)
  );
  CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    type TEXT NOT NULL,
    product_id INTEGER,
    meta TEXT
  );
`);

// Attempt to add missing columns for existing DBs
try { db.exec(`ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 100;`); } catch {}
try { db.exec(`ALTER TABLE orders ADD COLUMN stripe_session_id TEXT;`); } catch {}

const seedProducts = [
  { id: 1, title: 'Wireless Premium Headphones', category: 'Electronics', subcategory: 'Audio', description: 'Experience crystal-clear sound with active noise cancellation. 40-hour battery life and premium comfort.', price_cents: 29999, currency: 'USD', images: { '1x': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop&auto=format' }, featured: true, tags: ['wireless','audio','premium'], rating: 4.8 },
  { id: 2, title: 'Minimalist Leather Backpack', category: 'Fashion', subcategory: 'Bags', description: 'Handcrafted genuine leather backpack with laptop compartment. Perfect for professionals and travelers.', price_cents: 14999, currency: 'USD', images: { '1x': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=800&fit=crop&auto=format' }, featured: false, tags: ['leather','travel','professional'], rating: 4.6 },
  { id: 3, title: 'Smart Fitness Watch', category: 'Electronics', subcategory: 'Wearables', description: 'Track your health with precision. Heart rate monitoring, sleep tracking, and 50+ sport modes.', price_cents: 19999, currency: 'USD', images: { '1x': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop&auto=format' }, featured: true, tags: ['fitness','smartwatch','health'], rating: 4.7 },
  { id: 4, title: 'Artisan Coffee Maker', category: 'Home', subcategory: 'Kitchen', description: 'Brew barista-quality coffee at home. Precision temperature control and elegant stainless steel design.', price_cents: 24999, currency: 'USD', images: { '1x': 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&h=800&fit=crop&auto=format' }, featured: false, tags: ['coffee','kitchen','artisan'], rating: 4.9 },
  { id: 5, title: 'Designer Ceramic Vase Set', category: 'Home', subcategory: 'Decor', description: 'Handmade ceramic vases in modern geometric shapes. Set of 3 pieces to elevate your home decor.', price_cents: 8999, currency: 'USD', images: { '1x': 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=800&h=800&fit=crop&auto=format' }, featured: false, tags: ['decor','ceramic','handmade'], rating: 4.5 },
  { id: 6, title: 'Premium Yoga Mat', category: 'Sports', subcategory: 'Fitness', description: 'Non-slip, eco-friendly yoga mat with alignment guides. 6mm thickness for ultimate comfort.', price_cents: 5999, currency: 'USD', images: { '1x': 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&h=800&fit=crop&auto=format' }, featured: true, tags: ['yoga','fitness','eco-friendly'], rating: 4.7 },
  { id: 7, title: 'Organic Cotton T-Shirt', category: 'Fashion', subcategory: 'Clothing', description: 'Soft, breathable organic cotton tee. Available in 8 colors with a perfect relaxed fit.', price_cents: 3499, currency: 'USD', images: { '1x': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop&auto=format' }, featured: false, tags: ['organic','cotton','casual'], rating: 4.6 },
  { id: 8, title: 'Portable Bluetooth Speaker', category: 'Electronics', subcategory: 'Audio', description: 'Waterproof portable speaker with 360° sound. 20-hour battery and rugged outdoor design.', price_cents: 7999, currency: 'USD', images: { '1x': 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&h=800&fit=crop&auto=format' }, featured: false, tags: ['bluetooth','portable','waterproof'], rating: 4.4 }
];

// Seed DB if empty
const rowCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
if (rowCount === 0) {
  const insert = db.prepare(`INSERT INTO products (id, title, category, subcategory, description, price_cents, currency, image, featured, rating, stock) VALUES (@id,@title,@category,@subcategory,@description,@price_cents,@currency,@image,@featured,@rating,@stock)`);
  const txn = db.transaction((items)=>{ items.forEach(p=> insert.run({
    id: p.id,
    title: p.title,
    category: p.category,
    subcategory: p.subcategory,
    description: p.description,
    price_cents: p.price_cents,
    currency: p.currency,
    image: p.images['1x'],
    featured: p.featured ? 1 : 0,
    rating: p.rating,
    stock: 100
  })); });
  txn(seedProducts);
}

// Products API
// Admin auth (simple token)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'devtoken';
const adminAuth = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (token === ADMIN_TOKEN) return next();
  return res.status(401).json({ error: 'Unauthorized' });
};

app.get('/api/products', (req, res) => {
  const list = db.prepare('SELECT * FROM products ORDER BY id').all().map(p=>({
    id: p.id,
    title: p.title,
    category: p.category,
    subcategory: p.subcategory,
    description: p.description,
    price_cents: p.price_cents,
    currency: p.currency,
    images: { '1x': p.image },
    featured: !!p.featured,
    rating: p.rating,
    stock: p.stock,
    tags: []
  }));
  res.json({ products: list });
});

app.post('/api/products', adminAuth, (req, res) => {
  const { id, title, category, subcategory, description, price_cents, currency='USD', image, featured=false, rating=0, stock=100 } = req.body;
  const stmt = db.prepare(`INSERT INTO products (id, title, category, subcategory, description, price_cents, currency, image, featured, rating, stock) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  stmt.run(id, title, category, subcategory, description, price_cents, currency, image, featured?1:0, rating, stock);
  res.json({ ok: true });
});

app.put('/api/products/:id', adminAuth, (req, res) => {
  const id = Number(req.params.id);
  const { title, category, subcategory, description, price_cents, currency='USD', image, featured=false, rating=0, stock=100 } = req.body;
  const stmt = db.prepare(`UPDATE products SET title=?, category=?, subcategory=?, description=?, price_cents=?, currency=?, image=?, featured=?, rating=?, stock=? WHERE id=?`);
  stmt.run(title, category, subcategory, description, price_cents, currency, image, featured?1:0, rating, stock, id);
  res.json({ ok: true });
});

app.delete('/api/products/:id', adminAuth, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM products WHERE id=?').run(id);
  res.json({ ok: true });
});

// Orders API
app.get('/api/orders', adminAuth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  const itemsByOrder = db.prepare('SELECT * FROM order_items WHERE order_id=?');
  const full = orders.map(o=> ({
    ...o,
    items: itemsByOrder.all(o.id)
  }));
  res.json({ orders: full });
});

app.post('/api/orders', (req, res) => {
  const { items = [], total_cents = 0, status = 'created' } = req.body;
  // Enforce stock
  for (const it of items) {
    const p = db.prepare('SELECT stock FROM products WHERE id=?').get(it.id);
    if (!p || p.stock < it.quantity) {
      return res.status(400).json({ error: `Insufficient stock for product ${it.id}` });
    }
  }
  const insertOrder = db.prepare('INSERT INTO orders (total_cents, status) VALUES (?, ?)');
  const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, title, price_cents, quantity) VALUES (?, ?, ?, ?, ?)');
  const decStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id=?');
  const txn = db.transaction(() => {
    const info = insertOrder.run(total_cents, status);
    const orderId = info.lastInsertRowid;
    items.forEach(it => { insertItem.run(orderId, it.id, it.title, it.price_cents, it.quantity); decStock.run(it.quantity, it.id); });
    return orderId;
  });
  const orderId = txn();
  res.json({ status: 'ok', orderId });
});

// Recommendations: similar category or top rated
app.get('/api/recommendations', (req, res) => {
  const productId = Number(req.query.productId);
  let base = null;
  if (!Number.isNaN(productId)) {
    base = db.prepare('SELECT * FROM products WHERE id=?').get(productId);
  }
  let recs;
  if (base) {
    recs = db.prepare('SELECT * FROM products WHERE category=? AND id<>? ORDER BY rating DESC LIMIT 4').all(base.category, productId);
  } else {
    recs = db.prepare('SELECT * FROM products ORDER BY rating DESC LIMIT 4').all();
  }
  res.json({
    products: recs.map(p=>({ id:p.id, title:p.title, category:p.category, price_cents:p.price_cents, images:{'1x':p.image}, featured:!!p.featured, rating:p.rating }))
  });
});

// Stripe Checkout Session
const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

app.post('/api/pay/checkout-session', async (req, res) => {
  try {
    if (!stripe) return res.status(400).json({ error: 'Stripe not configured' });
    const { items = [] } = req.body;
    // Create pending order
    const total = items.reduce((s,it)=> s + it.price_cents*it.quantity, 0);
    const insertOrder = db.prepare('INSERT INTO orders (total_cents, status) VALUES (?, ?)');
    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, title, price_cents, quantity) VALUES (?, ?, ?, ?, ?)');
    const orderId = db.transaction(()=>{
      const info = insertOrder.run(total, 'pending_payment');
      const id = info.lastInsertRowid;
      items.forEach(it => insertItem.run(id, it.id, it.title, it.price_cents, it.quantity));
      return id;
    })();
    const line_items = items.map(it => ({
      price_data: {
        currency: 'usd',
        product_data: { name: it.title },
        unit_amount: it.price_cents,
      },
      quantity: it.quantity,
    }));
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${FRONTEND_URL}/?success=true`,
      cancel_url: `${FRONTEND_URL}/?canceled=true`,
      metadata: { orderId: String(orderId) }
    });
    db.prepare('UPDATE orders SET stripe_session_id=? WHERE id=?').run(session.id, orderId);
    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Stripe webhook (raw body)
import bodyParser from 'body-parser';
app.post('/api/pay/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) return res.status(400).send('Not configured');
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderRow = db.prepare('SELECT id FROM orders WHERE stripe_session_id=?').get(session.id);
    if (orderRow) {
      const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id=?').all(orderRow.id);
      const dec = db.prepare('UPDATE products SET stock = stock - ? WHERE id=?');
      const setStatus = db.prepare('UPDATE orders SET status=? WHERE id=?');
      db.transaction(()=>{
        items.forEach(it => dec.run(it.quantity, it.product_id));
        setStatus.run('paid', orderRow.id);
      })();
    }
  }
  res.json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
