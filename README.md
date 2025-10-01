# LUXE MARKET (Lightweight E‑commerce Showcase)

A modular, frontend-only product gallery (HTML5/CSS3/JavaScript) with a minimal Node.js backend for products and order submission. Built to be lightweight, visually appealing, and easy to manage for small businesses.

## Project Structure

- `frontend/`
  - `index.html` — UI layout and mounting roots for modals/drawers
  - `styles.css` — custom styles (fonts, animations, utilities)
  - `app.js` — all interactive features (browse, search, filter, sort, wishlist, cart, checkout)
- `backend/`
  - `package.json` — dependencies and scripts
  - `server.js` — Express API for products and orders

## Features

- **Browse & Filter**: Category chips, search, sorting, price range (desktop inputs + mobile sliders)
- **Quick View Modal**: Product details with quantity controls
- **Cart Drawer**: Add, remove, quantity +/- with real-time totals
- **Checkout Modal**: Contact + shipping placeholders and order summary
- **Mobile Responsive**: Hero, grid, and filters optimized

## Getting Started

### 1) Start the Backend API (Node.js)

```bash
# In Windows PowerShell or terminal
cd backend
npm install
npm run dev
# API runs at http://localhost:3000
```

Endpoints:
- `GET /api/products` — returns mock products
- `POST /api/orders` — accepts `{ items: [...], total_cents: number }`

### 2) Open the Frontend

Option A: Double-click `frontend/index.html` to open in your browser.

Option B: Serve statically (recommended for CORS consistency):

```bash
# Using PowerShell with Python (optional)
# From the frontend directory
python -m http.server 5173
# Visit http://localhost:5173
```

The frontend automatically tries `http://localhost:3000/api/products` and falls back to local sample data if the backend is not running.

## Customization

- Update product data in `backend/server.js` or wire to a real database.
- Adjust styling in `frontend/styles.css`. Tailwind CDN is used for utility classes.
- Modify UI interactions in `frontend/app.js` (vanilla JS, no frameworks).

## Future Scope

- Persist orders in a database (e.g., Postgres/MongoDB)
- Add secure payment integration
- Admin dashboard for inventory updates
- AI-based product recommendations

## Notes

- Designed to be lightweight and avoid complex platforms.
- Uses CORS to allow browser access to the local API.
