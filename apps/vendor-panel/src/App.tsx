import { useState, useEffect } from 'react';
import axios from 'axios';
import logo from './assets/logo.png';
import {
  LayoutDashboard,
  Boxes,
  BellRing,
  Wallet,
  RefreshCw,
  PackageCheck,
  Check,
  AlertTriangle,
  LineChart,
  PlusCircle,
  LogOut,
  X
} from 'lucide-react';

const API_BASE_URL = `\${API_BASE_URL}`;

export default 
const BASE_URL = import.meta.env.DEV ? 'http://localhost:5000' : 'https://mech-bazaar-backend.vercel.app';
const API_BASE_URL = `${BASE_URL}/api`;

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('vendor_token'));
  const [email, setEmail] = useState('vendor@mechbazar.com');
  const [password, setPassword] = useState('Password@123');
  const [loginError, setLoginError] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'orders' | 'settlement'>('dashboard');
  const [inventory, setInventory] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [modelYears, setModelYears] = useState<any[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Settlement Request state
  const [settlementRequests, setSettlementRequests] = useState([
    { id: 'SET-901', date: '2026-07-08', amount: 15400, status: 'COMPLETED' },
    { id: 'SET-902', date: '2026-07-09', amount: 8900, status: 'PENDING' }
  ]);

  // Product Addition modal state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductMrp, setNewProductMrp] = useState('');
  const [newProductDiscount, setNewProductDiscount] = useState('0');
  const [newProductStock, setNewProductStock] = useState('10');
  const [newProductCategoryId, setNewProductCategoryId] = useState('');
  const [newProductBrandId, setNewProductBrandId] = useState('');
  const [newProductVariantIds, setNewProductVariantIds] = useState<string[]>([]);
  const [addProductError, setAddProductError] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Multiple OEM Numbers
  const [oemNumbers, setOemNumbers] = useState<string[]>(['']);

  // Specifications key-value pairs
  const [specEntries, setSpecEntries] = useState<{key: string; value: string}[]>([{ key: '', value: '' }]);

  // Product Images (URLs)
  const [productImages, setProductImages] = useState<string[]>([]);

  // Product Status
  const [productStatus, setProductStatus] = useState('PUBLISHED');

  // Advanced Stock Management
  const [minStockAlert, setMinStockAlert] = useState('5');
  const [maxStock, setMaxStock] = useState('100');
  const [warehouseBin, setWarehouseBin] = useState('A-1');
  const [shelfNumber, setShelfNumber] = useState('S-1');

  // Searchable Brand & Category filters
  const [brandSearch, setBrandSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  // Cascading dropdown states
  const [selectedMfgId, setSelectedMfgId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedModelYearId, setSelectedModelYearId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [chosenCompatibilities, setChosenCompatibilities] = useState<any[]>([]);

  // 1. Authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoginLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      if (response.data && response.data.success && response.data.data) {
        const userRole = response.data.data.user?.role;
        if (userRole !== 'VENDOR' && userRole !== 'ADMIN') {
          setLoginError('Access denied: You must be a VENDOR or ADMIN.');
          return;
        }
        localStorage.setItem('vendor_token', response.data.data.token);
        setToken(response.data.data.token);
      } else {
        setLoginError('Invalid credentials');
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.message || 'Login connection failed. Ensure backend API is online.');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('vendor_token');
    setToken(null);
  };

  // 2. Fetch Catalog, Orders, Metadata
  const fetchData = async () => {
    if (!token) return;
    setIsDataLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Get Products
      const prodRes = await axios.get(`${API_BASE_URL}/products?all=true`);
      if (prodRes.data && prodRes.data.success) {
        setInventory(prodRes.data.data);
      }

      // Get Orders
      const orderRes = await axios.get(`${API_BASE_URL}/orders/admin-all`, { headers });
      if (orderRes.data && orderRes.data.success) {
        setOrders(orderRes.data.data);
      }

      // Get Categories and Brands
      const catRes = await axios.get(`${API_BASE_URL}/products/categories`);
      if (catRes.data && catRes.data.success) {
        setCategories(catRes.data.data);
        if (catRes.data.data.length > 0) setNewProductCategoryId(catRes.data.data[0].id);
      }

      const brandRes = await axios.get(`${API_BASE_URL}/products/brands`);
      if (brandRes.data && brandRes.data.success) {
        setBrands(brandRes.data.data);
        if (brandRes.data.data.length > 0) setNewProductBrandId(brandRes.data.data[0].id);
      }

      // Get Manufacturers, Models, Model Years, and Engine Variants for compatibility mapping
      const mfgRes = await axios.get(`${API_BASE_URL}/garage/manufacturers`);
      if (mfgRes.data && mfgRes.data.success) {
        setManufacturers(mfgRes.data.data);
      }

      const modelRes = await axios.get(`${API_BASE_URL}/garage/models`);
      if (modelRes.data && modelRes.data.success) {
        setModels(modelRes.data.data);
      }

      const yearRes = await axios.get(`${API_BASE_URL}/garage/years`);
      if (yearRes.data && yearRes.data.success) {
        setModelYears(yearRes.data.data);
      }

      const variantRes = await axios.get(`${API_BASE_URL}/garage/variants`);
      if (variantRes.data && variantRes.data.success) {
        setVariants(variantRes.data.data);
      }

    } catch (err: any) {
      console.error('Error fetching dashboard catalog details:', err.message);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  // 3. Update stock levels on DB
  const handleUpdateStock = async (id: string, newStock: number) => {
    const updatedStock = Math.max(0, newStock);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_BASE_URL}/products/${id}/stock`, { stock: updatedStock }, { headers });
      
      // Update local state
      setInventory((prev) =>
        prev.map((item) => (item.id === id ? { ...item, stock: updatedStock } : item))
      );
    } catch (err: any) {
      alert('Stock adjustment error: ' + (err.response?.data?.message || err.message));
    }
  };

  // 4. Update order status to PACKED in database
  const handleMarkPacked = async (orderId: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_BASE_URL}/orders/${orderId}/status`, { status: 'PACKED' }, { headers });
      
      // Update local state
      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, status: 'PACKED' } : ord))
      );
    } catch (err: any) {
      alert('Order status update error: ' + (err.response?.data?.message || err.message));
    }
  };

  // Auto-discount calculation helpers
  const handlePriceChange = (val: string) => {
    setNewProductPrice(val);
    if (val && newProductMrp) {
      const p = parseFloat(val);
      const m = parseFloat(newProductMrp);
      if (m > 0 && p <= m) {
        setNewProductDiscount(((1 - p / m) * 100).toFixed(1));
      }
    }
  };

  const handleMrpChange = (val: string) => {
    setNewProductMrp(val);
    if (val && newProductPrice) {
      const p = parseFloat(newProductPrice);
      const m = parseFloat(val);
      if (m > 0 && p <= m) {
        setNewProductDiscount(((1 - p / m) * 100).toFixed(1));
      }
    }
  };

  const handleDiscountChange = (val: string) => {
    setNewProductDiscount(val);
    if (val && newProductMrp) {
      const m = parseFloat(newProductMrp);
      const d = parseFloat(val);
      if (m > 0) {
        setNewProductPrice((m * (1 - d / 100)).toFixed(2));
      }
    }
  };

  // 5. Add product to Database
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddProductError('');
    
    if (!newProductName || !newProductSku || !newProductPrice || !newProductMrp) {
      setAddProductError('Please fill in Name, SKU, Price, and MRP.');
      return;
    }

    setIsAddingProduct(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Build OEM numbers (filter out empty strings)
      const filteredOems = oemNumbers.filter(o => o.trim() !== '');

      // Build specifications object from key-value entries
      const specsObj: Record<string, string> = {};
      specEntries.forEach(entry => {
        if (entry.key.trim() && entry.value.trim()) {
          specsObj[entry.key.trim()] = entry.value.trim();
        }
      });

      const productPayload = {
        name: newProductName,
        sku: newProductSku,
        oemNumber: filteredOems.length > 0 ? filteredOems[0] : undefined,
        oemNumbers: filteredOems,
        description: newProductDesc || 'Genuine high-performance spare part.',
        price: newProductPrice,
        mrp: newProductMrp,
        discount: newProductDiscount,
        stock: newProductStock,
        minStockAlert,
        maxStock,
        warehouseBin,
        shelfNumber,
        status: productStatus,
        specifications: Object.keys(specsObj).length > 0 ? specsObj : undefined,
        brandId: newProductBrandId,
        categoryId: newProductCategoryId,
        images: productImages.filter(img => img.trim() !== ''),
        variantIds: chosenCompatibilities.length > 0 ? chosenCompatibilities.map(c => c.variantId) : undefined
      };

      const response = await axios.post(`${API_BASE_URL}/products`, productPayload, { headers });
      if (response.data && response.data.success) {
        alert('Product added successfully!');
        setShowAddProductModal(false);
        // Clear forms
        setNewProductName('');
        setNewProductSku('');
        setNewProductDesc('');
        setNewProductPrice('');
        setNewProductMrp('');
        setNewProductDiscount('0');
        setNewProductStock('10');
        setNewProductVariantIds([]);
        setChosenCompatibilities([]);
        setSelectedMfgId('');
        setSelectedModelId('');
        setSelectedModelYearId('');
        setSelectedVariantId('');
        setOemNumbers(['']);
        setSpecEntries([{ key: '', value: '' }]);
        setProductImages([]);
        setProductStatus('PUBLISHED');
        setMinStockAlert('5');
        setMaxStock('100');
        setWarehouseBin('A-1');
        setShelfNumber('S-1');
        setBrandSearch('');
        setCategorySearch('');
        // Reload catalogue
        fetchData();
      }
    } catch (err: any) {
      setAddProductError(err.response?.data?.message || 'Could not add product.');
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleAddCompatibility = () => {
    if (!selectedVariantId) return;
    
    // Avoid duplicates
    if (chosenCompatibilities.some(c => c.variantId === selectedVariantId)) {
      return;
    }
    
    const selectedVariant = variants.find(v => v.id === selectedVariantId);
    const selectedYear = modelYears.find(y => y.id === selectedModelYearId);
    const selectedModel = models.find(m => m.id === selectedModelId);
    const selectedMfg = manufacturers.find(m => m.id === selectedMfgId);
    
    if (selectedVariant && selectedYear && selectedModel && selectedMfg) {
      setChosenCompatibilities([
        ...chosenCompatibilities,
        {
          variantId: selectedVariantId,
          mfgName: selectedMfg.name,
          modelName: selectedModel.name,
          yearValue: selectedYear.startYear && selectedYear.endYear
            ? `${selectedYear.startYear}-${selectedYear.endYear}`
            : selectedYear.year || `${selectedYear.startYear || ''}`,
          variantName: selectedVariant.name
        }
      ]);
    }
  };

  const handleRemoveCompatibility = (variantId: string) => {
    setChosenCompatibilities(chosenCompatibilities.filter(c => c.variantId !== variantId));
  };

  const handleRequestSettlement = () => {
    const newReq = {
      id: 'SET-' + Math.floor(Math.random() * 1000),
      date: new Date().toISOString().split('T')[0],
      amount: 14800,
      status: 'PENDING'
    };
    setSettlementRequests([newReq, ...settlementRequests]);
  };

  // Render Login page if not authenticated
  if (!token) {
    return (
      <div className="login-container" style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090d16' }}>
        <form onSubmit={handleLogin} style={{ background: '#F8FAFC', padding: '32px', borderRadius: '16px', border: '1px solid #F8FAFC', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <img src={logo} alt="MechBazar" style={{ height: '32px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>Vendor & Admin Management Console</p>
          </div>

          <h2 style={{ color: '#111827', fontSize: '20px', marginBottom: '8px' }}>Sign In</h2>

          {loginError ? (
            <div style={{ backgroundColor: '#7f1d1d', border: '1px solid #b91c1c', padding: '12px', borderRadius: '10px', color: '#fca5a5', fontSize: '13px', textAlign: 'center' }}>
              {loginError}
            </div>
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#d1d5db', fontSize: '13px', fontWeight: 'bold' }}>Vendor Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', color: '#111827', padding: '10px 14px', borderRadius: '10px', fontSize: '14px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#d1d5db', fontSize: '13px', fontWeight: 'bold' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', color: '#111827', padding: '10px 14px', borderRadius: '10px', fontSize: '14px' }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoginLoading}
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: '0.2s', marginTop: '8px' }}
          >
            {isLoginLoading ? 'Signing In...' : 'Sign In'}
          </button>

          <div style={{ borderTop: '1px solid #F8FAFC', paddingTop: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Test login: <span style={{ color: 'var(--accent)' }}>vendor@mechbazar.com / Password@123</span>
          </div>
        </form>
      </div>
    );
  }

  const activeOrdersList = orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'ASSIGNED');
  const revenueAmount = orders.filter((o) => o.status === 'DELIVERED').reduce((acc, curr) => acc + curr.totalAmount, 0);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#111827', color: '#111827' }}>
      {/* Sidebar */}
      <aside className="glass" style={{ width: '260px', padding: '24px 16px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px', paddingLeft: '8px' }}>
            <div>
              <img src={logo} alt="MechBazar" style={{ height: '24px' }} />
              <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Rana Auto Parts Store</p>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { id: 'dashboard', label: 'Store Dashboard', icon: LayoutDashboard },
              { id: 'inventory', label: 'Inventory (Stock)', icon: Boxes },
              { id: 'orders', label: 'Packing Queue', icon: BellRing },
              { id: 'settlement', label: 'Settlements', icon: Wallet }
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '12px 16px',
                    background: active ? 'var(--accent)' : 'transparent',
                    color: active ? '#FFFFFF' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: active ? 'bold' : 'normal',
                    transition: '0.2s'
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Container */}
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        {isDataLoading && (
          <div style={{ padding: '8px', background: 'rgba(250, 204, 21, 0.1)', color: 'var(--accent)', borderRadius: '10px', textAlign: 'center', marginBottom: '16px', fontSize: '13px' }}>
            🔄 Updating catalogue and queue parameters from live PostgreSQL DB...
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Vendor Analytics Dashboard</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Manage catalog stock levels, invoices, and receive express spare parts orders.</p>
              </div>
              <button onClick={fetchData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={16} />
                Refresh Data
              </button>
            </header>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
              {[
                { title: 'Delivered Sales Payout', value: `₹${revenueAmount.toFixed(2)}`, icon: LineChart, subtitle: 'Total processed payments', color: 'var(--success)' },
                { title: 'Active Orders in Queue', value: `${activeOrdersList.length} Active`, icon: PackageCheck, subtitle: 'Express 5-min pack target', color: 'var(--accent)' },
                { title: 'Low Stock Alerts', value: `${inventory.filter(i => i.stock < 15).length} Items`, icon: AlertTriangle, subtitle: 'Reorder suggested soon', color: 'var(--danger)' }
              ].map((metric, i) => {
                const Icon = metric.icon;
                return (
                  <div key={i} className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{metric.title}</span>
                      <Icon size={20} color={metric.color} />
                    </div>
                    <h3 style={{ fontSize: '28px', marginBottom: '8px' }}>{metric.value}</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{metric.subtitle}</span>
                  </div>
                );
              })}
            </div>

            {/* Layout Split */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
              {/* Order alerts */}
              <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                <h3 style={{ marginBottom: '20px' }}>Urgent Incoming Orders</h3>
                {activeOrdersList.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No pending orders. All caught up!</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {activeOrdersList.map((ord) => (
                      <div
                        key={ord.id}
                        style={{
                          background: 'var(--bg-secondary)',
                          padding: '16px',
                          borderRadius: '16px',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px' }}>
                            <strong style={{ fontSize: '14px' }}>ORD-{ord.id.substring(0, 8)}</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span style={{ fontSize: '10px', color: '#2563EB', background: 'rgba(250, 204, 21, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                              {ord.status}
                            </span>
                          </div>
                          {ord.items.map((it: any, idx: number) => (
                            <p key={idx} style={{ fontSize: '13px', color: '#e4e4e7' }}>{it.product?.name} x {it.quantity}</p>
                          ))}
                          {ord.notes && <p style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '4px' }}>Note: "{ord.notes}"</p>}
                        </div>
                        {ord.status === 'PENDING' || ord.status === 'CONFIRMED' ? (
                          <button onClick={() => handleMarkPacked(ord.id)} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                            <Check size={16} />
                            Pack & Ready
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#64748B' }}>Handed to Partner</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Warehouse Dispatch Guidelines */}
              <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                <h3 style={{ marginBottom: '20px' }}>Dispatch Guide</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <p>1. Double check OEM number matches product package before sealing.</p>
                  <p>2. Paste QR code on outer packaging.</p>
                  <p>3. Hand over package immediately upon delivery partner arrival.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Local Store Catalog & Stock Levels</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Monitor shelf stock, update shelf bins, and add catalogued parts.</p>
              </div>
              <button onClick={() => setShowAddProductModal(true)} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                <PlusCircle size={18} />
                Add Spare Part
              </button>
            </header>

            <div className="glass" style={{ padding: '24px', borderRadius: '16px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px' }}>Spare Part</th>
                    <th style={{ padding: '12px' }}>SKU</th>
                    <th style={{ padding: '12px' }}>OEM Number</th>
                    <th style={{ padding: '12px' }}>Price</th>
                    <th style={{ padding: '12px' }}>Current Stock</th>
                    <th style={{ padding: '12px' }}>Adjust Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.category?.name || 'Uncategorized'}</div>
                      </td>
                      <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{item.sku}</td>
                      <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{item.oemNumber || 'N/A'}</td>
                      <td style={{ padding: '16px 12px' }}>₹{item.price}</td>
                      <td style={{ padding: '16px 12px' }}>
                        <span
                          style={{
                            color: item.stock < 15 ? 'var(--danger)' : 'var(--success)',
                            fontWeight: 'bold'
                          }}
                        >
                          {item.stock} left
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => handleUpdateStock(item.id, item.stock - 1)}
                            style={{ width: '28px', height: '28px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', cursor: 'pointer', color: '#111827' }}
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleUpdateStock(item.id, item.stock + 1)}
                            style={{ width: '28px', height: '28px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', cursor: 'pointer', color: '#111827' }}
                          >
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <header style={{ marginBottom: '32px' }}>
              <h2>Express Packing queue</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Mark orders as packed to signal dispatch to delivery partners.</p>
            </header>

            <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      padding: '20px',
                      borderRadius: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>ORD-{ord.id.substring(0, 8)}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {new Date(ord.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      {ord.items.map((it: any, idx: number) => (
                        <p key={idx} style={{ fontSize: '14px', color: '#cbd5e1' }}>{it.product?.name} x {it.quantity}</p>
                      ))}
                      <p style={{ fontSize: '14px', marginTop: '6px', color: 'var(--accent)' }}>Order Value: ₹{ord.totalAmount}</p>
                    </div>

                    <div>
                      {ord.status === 'PACKED' || ord.status === 'ASSIGNED' || ord.status === 'PICKED_UP' || ord.status === 'ON_THE_WAY' || ord.status === 'DELIVERED' ? (
                        <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                          <Check size={16} /> Packed & Handed Over
                        </span>
                      ) : (
                        <button onClick={() => handleMarkPacked(ord.id)} className="btn" style={{ background: 'var(--accent)', color: '#FFFFFF', padding: '10px 20px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                          Confirm Packed
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settlement' && (
          <div>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Store Settlements & Margin Logs</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Review completed sales payouts and request account settlements.</p>
              </div>
              <button onClick={handleRequestSettlement} className="btn" style={{ background: 'var(--accent)', color: '#FFFFFF', padding: '10px 20px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                Request Instant Settlement
              </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
              <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                <h3 style={{ marginBottom: '20px' }}>Payout Transactions</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px' }}>Request ID</th>
                      <th style={{ padding: '12px' }}>Date</th>
                      <th style={{ padding: '12px' }}>Amount</th>
                      <th style={{ padding: '12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlementRequests.map((req) => (
                      <tr key={req.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 12px', fontWeight: 'bold' }}>{req.id}</td>
                        <td style={{ padding: '14px 12px' }}>{req.date}</td>
                        <td style={{ padding: '14px 12px' }}>₹{req.amount}</td>
                        <td style={{ padding: '14px 12px' }}>
                          <span
                            style={{
                              background: req.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(250, 204, 21, 0.1)',
                              color: req.status === 'COMPLETED' ? 'var(--success)' : 'var(--accent)',
                              fontSize: '12px',
                              padding: '2px 8px',
                              borderRadius: '6px'
                            }}
                          >
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                <h3 style={{ marginBottom: '16px' }}>Margin Breakdown</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Sales Margin</span>
                    <strong>88% (Standard)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>MechBazar Commission</span>
                    <strong>12%</strong>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pending Settlement</span>
                    <strong style={{ color: 'var(--accent)' }}>₹8,900.00</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Product Modal Overlay */}
      {showAddProductModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#F8FAFC', padding: '32px', borderRadius: '16px', border: '1px solid #F8FAFC', width: '100%', maxWidth: '960px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>Register Part in Catalogue</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Fill in product details, pricing, specifications, and vehicle compatibility.</p>
              </div>
              <button onClick={() => setShowAddProductModal(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {addProductError && (
              <div style={{ backgroundColor: '#7f1d1d', border: '1px solid #b91c1c', padding: '10px', borderRadius: '10px', color: '#fca5a5', fontSize: '13px', textAlign: 'center', marginBottom: '16px' }}>
                {addProductError}
              </div>
            )}

            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* === SECTION 1: Basic Info === */}
              <div style={{ borderBottom: '1px solid #F8FAFC', paddingBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--accent)', marginBottom: '12px', fontWeight: 'bold' }}>Basic Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: '#d1d5db' }}>Part Name *</label>
                    <input type="text" placeholder="Brake Pad" value={newProductName} onChange={e => setNewProductName(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: '10px', color: '#111827' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: '#d1d5db' }}>SKU (Unique code) *</label>
                    <input type="text" placeholder="BOS-BP-09" value={newProductSku} onChange={e => setNewProductSku(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: '10px', color: '#111827' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#d1d5db' }}>Description</label>
                  <textarea placeholder="Product description..." value={newProductDesc} onChange={e => setNewProductDesc(e.target.value)} rows={2} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: '10px', color: '#111827', resize: 'vertical', fontSize: '13px' }} />
                </div>
              </div>

              {/* === SECTION 2: Pricing & Discount (Auto-Calculate) === */}
              <div style={{ borderBottom: '1px solid #F8FAFC', paddingBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--accent)', marginBottom: '12px', fontWeight: 'bold' }}>Pricing & Discount</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: '#d1d5db' }}>Discounted Price (₹) *</label>
                    <input type="number" placeholder="2450" value={newProductPrice} onChange={e => handlePriceChange(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: '10px', color: '#111827' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: '#d1d5db' }}>MRP Price (₹) *</label>
                    <input type="number" placeholder="3200" value={newProductMrp} onChange={e => handleMrpChange(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: '10px', color: '#111827' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: '#d1d5db' }}>Discount (%)</label>
                    <input type="number" placeholder="23" value={newProductDiscount} onChange={e => handleDiscountChange(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: '10px', color: '#10b981', fontWeight: 'bold' }} />
                  </div>
                </div>
              </div>

              {/* === SECTION 3: Brand & Category (Searchable) === */}
              <div style={{ borderBottom: '1px solid #F8FAFC', paddingBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--accent)', marginBottom: '12px', fontWeight: 'bold' }}>Brand & Category</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: '#d1d5db' }}>Brand (from Master)</label>
                    <input type="text" placeholder="Search brand..." value={brandSearch} onChange={e => setBrandSearch(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '6px 10px', borderRadius: '8px 8px 0 0', color: '#111827', fontSize: '12px' }} />
                    <select value={newProductBrandId} onChange={e => setNewProductBrandId(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: '0 0 8px 8px', color: '#111827', height: '38px' }}>
                      <option value="">Select Brand</option>
                      {brands
                        .filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase()))
                        .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: '#d1d5db' }}>Category</label>
                    <input type="text" placeholder="Search category..." value={categorySearch} onChange={e => setCategorySearch(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '6px 10px', borderRadius: '8px 8px 0 0', color: '#111827', fontSize: '12px' }} />
                    <select value={newProductCategoryId} onChange={e => setNewProductCategoryId(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: '0 0 8px 8px', color: '#111827', height: '38px' }}>
                      <option value="">Select Category</option>
                      {categories
                        .filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                        .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* === SECTION 4: Multiple OEM Numbers === */}
              <div style={{ borderBottom: '1px solid #F8FAFC', paddingBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--accent)', marginBottom: '12px', fontWeight: 'bold' }}>OEM Numbers</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {oemNumbers.map((oem, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder={`OEM #${idx + 1} (e.g. 04465-0K340)`}
                        value={oem}
                        onChange={e => {
                          const updated = [...oemNumbers];
                          updated[idx] = e.target.value;
                          setOemNumbers(updated);
                        }}
                        style={{ flex: 1, background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: '10px', color: '#111827', fontSize: '13px' }}
                      />
                      {oemNumbers.length > 1 && (
                        <button type="button" onClick={() => setOemNumbers(oemNumbers.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>✕</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setOemNumbers([...oemNumbers, ''])} style={{ alignSelf: 'flex-start', background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '6px 12px', borderRadius: '10px', color: 'var(--accent)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    + Add OEM
                  </button>
                </div>
              </div>

              {/* === SECTION 5: Specifications (Key-Value) === */}
              <div style={{ borderBottom: '1px solid #F8FAFC', paddingBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--accent)', marginBottom: '12px', fontWeight: 'bold' }}>Product Specifications</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {specEntries.map((entry, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Key (e.g. Material)"
                        value={entry.key}
                        onChange={e => {
                          const updated = [...specEntries];
                          updated[idx].key = e.target.value;
                          setSpecEntries(updated);
                        }}
                        style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: '10px', color: '#111827', fontSize: '13px' }}
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. Ceramic)"
                        value={entry.value}
                        onChange={e => {
                          const updated = [...specEntries];
                          updated[idx].value = e.target.value;
                          setSpecEntries(updated);
                        }}
                        style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: '10px', color: '#111827', fontSize: '13px' }}
                      />
                      {specEntries.length > 1 && (
                        <button type="button" onClick={() => setSpecEntries(specEntries.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setSpecEntries([...specEntries, { key: '', value: '' }])} style={{ alignSelf: 'flex-start', background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '6px 12px', borderRadius: '10px', color: 'var(--accent)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    + Add Spec
                  </button>
                </div>
              </div>

              {/* === SECTION 6: Stock Management & Status === */}
              <div style={{ borderBottom: '1px solid #F8FAFC', paddingBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--accent)', marginBottom: '12px', fontWeight: 'bold' }}>Stock & Inventory</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#64748B' }}>Current Stock</label>
                    <input type="number" value={newProductStock} onChange={e => setNewProductStock(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: '10px', color: '#111827', fontSize: '13px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#64748B' }}>Min Stock Alert</label>
                    <input type="number" value={minStockAlert} onChange={e => setMinStockAlert(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: '10px', color: '#111827', fontSize: '13px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#64748B' }}>Max Stock</label>
                    <input type="number" value={maxStock} onChange={e => setMaxStock(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: '10px', color: '#111827', fontSize: '13px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#64748B' }}>Warehouse Bin</label>
                    <input type="text" value={warehouseBin} onChange={e => setWarehouseBin(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: '10px', color: '#111827', fontSize: '13px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#64748B' }}>Shelf Number</label>
                    <input type="text" value={shelfNumber} onChange={e => setShelfNumber(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: '10px', color: '#111827', fontSize: '13px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px', maxWidth: '200px' }}>
                  <label style={{ fontSize: '11px', color: '#64748B' }}>Product Status</label>
                  <select value={productStatus} onChange={e => setProductStatus(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: '10px', color: '#111827', fontSize: '13px' }}>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                    <option value="DISCONTINUED">Discontinued</option>
                  </select>
                </div>
              </div>

              {/* === SECTION 7: Product Images === */}
              <div style={{ borderBottom: '1px solid #F8FAFC', paddingBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--accent)', marginBottom: '12px', fontWeight: 'bold' }}>Product Images</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {productImages.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden' }}>
                      <img src={img} alt={`img-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as any).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="%231f2937" width="80" height="80"/><text fill="%239ca3af" font-size="10" x="20" y="45">Error</text></svg>'; }} />
                      <button type="button" onClick={() => setProductImages(productImages.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  ))}
                  {productImages.length < 10 && (
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt('Enter image URL:');
                        if (url && url.trim()) {
                          setProductImages([...productImages, url.trim()]);
                        }
                      }}
                      style={{ width: '80px', height: '80px', background: '#F8FAFC', border: '2px dashed #E5E7EB', borderRadius: '10px', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}
                    >
                      +
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>Maximum 10 images. Click + to add image URL.</p>
              </div>

              {/* === SECTION 8: Vehicle Compatibility === */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--accent)', fontWeight: 'bold' }}>Vehicle Compatibility Mapping</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#64748B' }}>Manufacturer</label>
                    <select
                      value={selectedMfgId}
                      onChange={e => {
                        setSelectedMfgId(e.target.value);
                        setSelectedModelId('');
                        setSelectedModelYearId('');
                        setSelectedVariantId('');
                      }}
                      style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px', borderRadius: '10px', color: '#111827', fontSize: '13px' }}
                    >
                      <option value="">Select Manufacturer</option>
                      {manufacturers.map(mfg => (
                        <option key={mfg.id} value={mfg.id}>{mfg.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#64748B' }}>Model</label>
                    <select
                      value={selectedModelId}
                      onChange={e => {
                        setSelectedModelId(e.target.value);
                        setSelectedModelYearId('');
                        setSelectedVariantId('');
                      }}
                      disabled={!selectedMfgId}
                      style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px', borderRadius: '10px', color: '#111827', fontSize: '13px' }}
                    >
                      <option value="">Select Model</option>
                      {models
                        .filter(m => m.manufacturerId === selectedMfgId)
                        .map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#64748B' }}>Model Year</label>
                    <select
                      value={selectedModelYearId}
                      onChange={e => {
                        setSelectedModelYearId(e.target.value);
                        setSelectedVariantId('');
                      }}
                      disabled={!selectedModelId}
                      style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px', borderRadius: '10px', color: '#111827', fontSize: '13px' }}
                    >
                      <option value="">Select Year</option>
                      {modelYears
                        .filter(y => y.modelId === selectedModelId)
                        .map(y => (
                          <option key={y.id} value={y.id}>{y.year}</option>
                        ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#64748B' }}>Engine Variant</label>
                    <select
                      value={selectedVariantId}
                      onChange={e => setSelectedVariantId(e.target.value)}
                      disabled={!selectedModelYearId}
                      style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px', borderRadius: '10px', color: '#111827', fontSize: '13px' }}
                    >
                      <option value="">Select Variant</option>
                      {variants
                        .filter(v => v.modelYearId === selectedModelYearId)
                        .map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddCompatibility}
                  disabled={!selectedVariantId}
                  style={{
                    backgroundColor: selectedVariantId ? 'var(--accent)' : '#E5E7EB',
                    color: selectedVariantId ? '#FFFFFF' : '#d1d5db',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: selectedVariantId ? 'pointer' : 'not-allowed',
                    alignSelf: 'flex-start',
                    marginTop: '4px'
                  }}
                >
                  Add Compatibility
                </button>

                {/* Compatibility List Display */}
                {chosenCompatibilities.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>Compatible Vehicles</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', maxHeight: '160px', overflowY: 'auto', background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px', borderRadius: '10px' }}>
                      {chosenCompatibilities.map((c) => (
                        <div
                          key={c.variantId}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#F8FAFC',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            border: '1px solid #E5E7EB'
                          }}
                        >
                          <div>
                            <span style={{ color: '#10b981', marginRight: '6px' }}>✔</span>
                            <strong style={{ color: '#111827' }}>{c.mfgName}</strong>
                            <span style={{ margin: '0 4px', color: '#64748B' }}>›</span>
                            <span style={{ color: '#cbd5e1' }}>{c.modelName}</span>
                            <span style={{ margin: '0 4px', color: '#64748B' }}>›</span>
                            <span style={{ color: '#93c5fd' }}>{c.yearValue}</span>
                            <span style={{ margin: '0 4px', color: '#64748B' }}>›</span>
                            <span style={{ color: 'var(--accent)' }}>{c.variantName}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCompatibility(c.variantId)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              fontSize: '11px'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowAddProductModal(false)} style={{ flex: 1, padding: '12px', background: '#E5E7EB', color: '#111827', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isAddingProduct} style={{ flex: 1, padding: '12px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {isAddingProduct ? 'Creating...' : 'Register Spare Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
