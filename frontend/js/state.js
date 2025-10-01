// App state and helpers (scaffold)
export const state = {
  products: [],
  cart: [],
  wishlist: new Set(),
  selectedProduct: null,
  search: '',
  category: 'All',
  priceRange: [0, 300],
  sortBy: 'featured',
  showCart: false,
  showFilters: false,
  heroIndex: 0,
  modalQuantity: 1,
};

export const formatPrice = (cents) => `$${(cents / 100).toFixed(2)}`;
export const cartCount = () => state.cart.reduce((s, i) => s + i.quantity, 0);
export const cartTotal = () => state.cart.reduce((s, i) => s + i.quantity * i.price_cents, 0);

export function computeFiltered() {
  const { products, category, search, priceRange, sortBy } = state;
  let filtered = [...products];
  if (category !== 'All') filtered = filtered.filter(p => p.category === category);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || (p.tags||[]).some(t => t.toLowerCase().includes(q)));
  }
  filtered = filtered.filter(p => {
    const price = p.price_cents / 100;
    return price >= priceRange[0] && price <= priceRange[1];
  });
  filtered.sort((a,b)=>{
    switch (sortBy) {
      case 'price-asc': return a.price_cents - b.price_cents;
      case 'price-desc': return b.price_cents - a.price_cents;
      case 'rating': return b.rating - a.rating;
      case 'featured': return (b.featured?1:0) - (a.featured?1:0);
      default: return 0;
    }
  });
  return filtered;
}
