const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const money = (c) => `$${(c/100).toFixed(2)}`;

async function fetchJSON(url, opts={}){ const r = await fetch(url, opts); if(!r.ok) throw new Error('bad status'); return r.json(); }

async function loadProducts(){ const d = await fetchJSON('http://localhost:3000/api/products'); return d.products||[]; }
async function loadOrders(){ const d = await fetchJSON('http://localhost:3000/api/orders'); return d.orders||[]; }

function renderProducts(products){ const tbody = $('#products-body'); tbody.innerHTML = products.map(p=>`
  <tr class="border-t">
    <td class="py-2 pr-4">${p.id}</td>
    <td class="py-2 pr-4 max-w-[16rem] truncate">${p.title}</td>
    <td class="py-2 pr-4">${p.category||''}</td>
    <td class="py-2 pr-4">${money(p.price_cents)}</td>
    <td class="py-2 pr-4">${p.featured? 'Yes':'No'}</td>
    <td class="py-2 pr-4">
      <button data-edit="${p.id}" class="px-2 py-1 border rounded mr-2">Edit</button>
      <button data-del="${p.id}" class="px-2 py-1 border rounded text-red-600">Delete</button>
    </td>
  </tr>
`).join('');
  $$('#products-body [data-edit]').forEach(b=> b.addEventListener('click',()=> openEdit(products.find(p=>p.id===Number(b.dataset.edit)))));
  $$('#products-body [data-del]').forEach(b=> b.addEventListener('click',()=> delProduct(Number(b.dataset.del))));
}

function renderOrders(orders){ const root = $('#orders-list'); root.innerHTML = orders.map(o=>`
  <div class="border border-slate-200 rounded-xl p-3">
    <div class="flex items-center justify-between text-sm">
      <div>Order #${o.id}</div>
      <div class="text-slate-500">${new Date(o.created_at).toLocaleString()}</div>
    </div>
    <div class="text-sm mt-2">Status: <span class="font-semibold">${o.status}</span></div>
    <div class="mt-2 text-sm space-y-1">
      ${(o.items||[]).map(i=>`<div class="flex justify-between"><span>${i.title} × ${i.quantity}</span><span>${money(i.price_cents*i.quantity)}</span></div>`).join('')}
      <div class="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>${money(o.total_cents)}</span></div>
    </div>
  </div>
`).join(''); }

function modal(content){ const root = $('#modal-root'); root.innerHTML = `
  <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-close>
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-xl" onclick="event.stopPropagation()">
      ${content}
    </div>
  </div>`;
  root.querySelector('[data-close]').addEventListener('click', ()=> root.innerHTML='');
}

function productForm(p={}){
  const isEdit = !!p.id;
  return `
  <div class="border-b px-5 py-3 flex justify-between items-center">
    <h3 class="font-semibold">${isEdit?'Edit':'New'} Product</h3>
    <button data-x class="p-2 hover:bg-slate-100 rounded-lg">✕</button>
  </div>
  <div class="p-5 space-y-3 text-sm">
    <div class="grid grid-cols-2 gap-3">
      <label class="space-y-1"><div class="text-slate-600">ID</div><input id="pid" type="number" class="w-full border rounded px-3 py-2" value="${p.id??''}" ${isEdit?'disabled':''}></label>
      <label class="space-y-1"><div class="text-slate-600">Title</div><input id="ptitle" class="w-full border rounded px-3 py-2" value="${p.title??''}"></label>
      <label class="space-y-1"><div class="text-slate-600">Category</div><input id="pcat" class="w-full border rounded px-3 py-2" value="${p.category??''}"></label>
      <label class="space-y-1"><div class="text-slate-600">Subcategory</div><input id="psub" class="w-full border rounded px-3 py-2" value="${p.subcategory??''}"></label>
      <label class="space-y-1"><div class="text-slate-600">Price (cents)</div><input id="pprice" type="number" class="w-full border rounded px-3 py-2" value="${p.price_cents??0}"></label>
      <label class="space-y-1"><div class="text-slate-600">Image URL</div><input id="pimg" class="w-full border rounded px-3 py-2" value="${(p.images&&p.images['1x'])||''}"></label>
      <label class="space-y-1 col-span-2"><div class="text-slate-600">Description</div><textarea id="pdesc" rows="3" class="w-full border rounded px-3 py-2">${p.description??''}</textarea></label>
      <label class="space-y-1"><div class="text-slate-600">Featured</div><select id="pfeat" class="w-full border rounded px-3 py-2"><option value="0" ${p.featured? '':'selected'}>No</option><option value="1" ${p.featured? 'selected':''}>Yes</option></select></label>
      <label class="space-y-1"><div class="text-slate-600">Rating</div><input id="prating" type="number" step="0.1" min="0" max="5" class="w-full border rounded px-3 py-2" value="${p.rating??0}"></label>
    </div>
  </div>
  <div class="border-t px-5 py-3 flex justify-end gap-2">
    <button data-cancel class="px-4 py-2 border rounded">Cancel</button>
    <button data-save class="px-4 py-2 bg-teal-600 text-white rounded">Save</button>
  </div>`;
}

function openEdit(p){
  modal(productForm(p));
  const root = $('#modal-root');
  root.querySelector('[data-x]').addEventListener('click', ()=> root.innerHTML='');
  root.querySelector('[data-cancel]').addEventListener('click', ()=> root.innerHTML='');
  root.querySelector('[data-save]').addEventListener('click', async()=>{
    const payload = {
      id: Number(root.querySelector('#pid').value),
      title: root.querySelector('#ptitle').value,
      category: root.querySelector('#pcat').value,
      subcategory: root.querySelector('#psub').value,
      description: root.querySelector('#pdesc').value,
      price_cents: Number(root.querySelector('#pprice').value),
      image: root.querySelector('#pimg').value,
      featured: root.querySelector('#pfeat').value==='1',
      rating: Number(root.querySelector('#prating').value)
    };
    try{
      if (p.id) {
        await fetch(`http://localhost:3000/api/products/${p.id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
      } else {
        await fetch('http://localhost:3000/api/products', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
      }
      root.innerHTML='';
      await refresh();
    }catch(e){ alert('Save failed'); }
  });
}

async function delProduct(id){ if(!confirm('Delete product?')) return; try{ await fetch(`http://localhost:3000/api/products/${id}`, {method:'DELETE'}); await refresh(); } catch { alert('Delete failed'); } }

async function refresh(){
  const [products, orders] = await Promise.all([loadProducts(), loadOrders()]);
  renderProducts(products);
  renderOrders(orders);
}

$('#new-product').addEventListener('click', ()=> openEdit({}));
$('#refresh-orders').addEventListener('click', refresh);

refresh();
