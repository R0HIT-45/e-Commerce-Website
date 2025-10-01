// API client (scaffold)
const API = () => (window.API_BASE || 'http://localhost:3000');

export async function getProducts() {
  const r = await fetch(`${API()}/api/products`);
  if (!r.ok) throw new Error('Failed to load products');
  const d = await r.json();
  return d.products || d;
}

export async function getOrders(token) {
  const r = await fetch(`${API()}/api/orders`, { headers: token ? { 'x-admin-token': token } : {} });
  if (!r.ok) throw new Error('Failed to load orders');
  return (await r.json()).orders || [];
}

export async function createOrder(items, total_cents) {
  const r = await fetch(`${API()}/api/orders`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ items, total_cents }) });
  if (!r.ok) throw new Error('Failed to create order');
  return await r.json();
}

export async function createCheckoutSession(items) {
  const r = await fetch(`${API()}/api/pay/checkout-session`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ items }) });
  if (!r.ok) throw new Error('Failed to create checkout session');
  return await r.json();
}

export async function getRecommendations(productId) {
  const r = await fetch(`${API()}/api/recommendations?productId=${productId}`);
  if (!r.ok) throw new Error('Failed to load recommendations');
  return (await r.json()).products || [];
}
