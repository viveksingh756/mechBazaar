
const BASE_URL = import.meta.env.DEV ? 'http://localhost:5000' : 'https://mech-bazaar-backend.vercel.app';
const API_BASE_URL = `${BASE_URL}/api`;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import logo from './assets/logo.png';
import {
  LayoutDashboard,
  ShoppingBag,
  Wrench,
  Truck,
  Users,
  Compass,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  TrendingUp,
  DollarSign,
  Package,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ChevronRight,
  LogOut,
  Tag,
  Layers,
  Image as ImageIcon,
  X
} from 'lucide-react';

// Pre-seeded database items for UI simulation (matching backend seed data)
const INITIAL_MANUFACTURERS = [
  { id: '1', name: 'Toyota' },
  { id: '2', name: 'Maruti Suzuki' },
  { id: '3', name: 'Honda' }
];

const INITIAL_MODELS = [
  { id: '1', manufacturerId: '1', name: 'Fortuner' },
  { id: '2', manufacturerId: '1', name: 'Innova Crysta' },
  { id: '3', manufacturerId: '2', name: 'Swift' },
  { id: '4', manufacturerId: '2', name: 'Baleno' },
  { id: '5', manufacturerId: '3', name: 'City' }
];

const INITIAL_VARIANTS = [
  { id: 'v1', modelId: '1', name: '2.8L Sigma 4', fuelType: 'Diesel', startYear: 2021, endYear: 2026 },
  { id: 'v2', modelId: '1', name: '2.7L 2WD', fuelType: 'Petrol', startYear: 2021, endYear: 2026 },
  { id: 'v3', modelId: '3', name: '1.2L DualJet LXI/VXI', fuelType: 'Petrol', startYear: 2020, endYear: 2026 },
  { id: 'v4', modelId: '5', name: '1.5L i-VTEC V/VX', fuelType: 'Petrol', startYear: 2020, endYear: 2026 }
];

const INITIAL_PRODUCTS = [
  {
    id: 'p1',
    name: 'Bosch Premium Brake Pads (Front)',
    sku: 'BOS-BP-FR-09',
    oemNumber: '04465-0K340',
    description: 'High performance ceramic brake pads offering excellent stopping power.',
    price: 2450.0,
    mrp: 3200.0,
    discount: 23.4,
    brand: 'Bosch',
    category: 'Brake System',
    stock: 45,
    compatibilities: ['v1', 'v2']
  },
  {
    id: 'p2',
    name: 'Bosch Premium Brake Pads (Swift)',
    sku: 'BOS-BP-SW-11',
    oemNumber: '55810-74P00',
    description: 'Bosch brake pads for Swift. Heavy duty performance, long life.',
    price: 1100.0,
    mrp: 1450.0,
    discount: 24.1,
    brand: 'Bosch',
    category: 'Brake System',
    stock: 120,
    compatibilities: ['v3']
  },
  {
    id: 'p3',
    name: 'Mobil1 Synthetic Engine Oil 5W-30 (4L)',
    sku: 'MOB-5W30-SYN-4L',
    description: 'Advanced full synthetic motor oil designed to keep your engine running like new.',
    price: 3600.0,
    mrp: 4500.0,
    discount: 20.0,
    brand: 'Mobil1',
    category: 'Oils & Lubricants',
    stock: 35,
    compatibilities: ['v2', 'v3', 'v4']
  }
];


export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  
  // Auth Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('admin@mechbazar.com');
  const [password, setPassword] = useState('Password@123');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      if (response.data && response.data.success && response.data.data) {
        const userRole = response.data.data.user?.role;
        if (userRole !== 'ADMIN') {
          setAuthError('Access denied: You must be an ADMIN to access this portal.');
          return;
        }
        localStorage.setItem('admin_token', response.data.data.token);
        setToken(response.data.data.token);
      } else {
        setAuthError('Invalid credentials');
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.message || 'Login connection failed. Ensure backend API is online.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsAuthLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        name,
        phone,
        email,
        password,
        role: 'ADMIN'
      });
      if (response.data && response.data.success) {
        setAuthSuccess('Admin registered successfully! Please sign in.');
        setAuthMode('login');
        setPassword('');
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsAuthLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
      if (response.data && response.data.success) {
        setAuthSuccess(`Reset code generated: ${response.data.code}. (SMTP is bypassed for testing)`);
        setResetCode(response.data.code); // Pre-fill reset code for easier testing
        setAuthMode('reset');
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.message || 'Forgot password failed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsAuthLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        email,
        code: resetCode,
        newPassword
      });
      if (response.data && response.data.success) {
        setAuthSuccess('Password has been reset successfully. Please login.');
        setAuthMode('login');
        setPassword('');
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.message || 'Reset password failed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'products' | 'vehicles' | 'partners' | 'map' | 'vendors' | 'brands' | 'categories' | 'banners'>('dashboard');
  const [vendors, setVendors] = useState<any[]>([]);

  // Categories CRUD States
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatImageUrl, setNewCatImageUrl] = useState('');
  const [newCatIconUrl, setNewCatIconUrl] = useState('');
  
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatImageUrl, setEditCatImageUrl] = useState('');
  const [editCatIconUrl, setEditCatIconUrl] = useState('');
  const [editCatActive, setEditCatActive] = useState(true);

  // Banners CRUD States
  const [bannersList, setBannersList] = useState<any[]>([]);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerSubtitle, setNewBannerSubtitle] = useState('');
  const [newBannerImageUrl, setNewBannerImageUrl] = useState('');
  const [newBannerLinkType, setNewBannerLinkType] = useState('none');
  const [newBannerLinkValue, setNewBannerLinkValue] = useState('');
  const [newBannerDisplayOrder, setNewBannerDisplayOrder] = useState('0');

  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [editBannerTitle, setEditBannerTitle] = useState('');
  const [editBannerSubtitle, setEditBannerSubtitle] = useState('');
  const [editBannerImageUrl, setEditBannerImageUrl] = useState('');
  const [editBannerLinkType, setEditBannerLinkType] = useState('none');
  const [editBannerLinkValue, setEditBannerLinkValue] = useState('');
  const [editBannerActive, setEditBannerActive] = useState(true);
  const [editBannerDisplayOrder, setEditBannerDisplayOrder] = useState('0');

  // Vendor register form states
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorPassword, setNewVendorPassword] = useState('');
  const [newVendorGst, setNewVendorGst] = useState('');
  const [vendorSuccess, setVendorSuccess] = useState('');
  const [vendorError, setVendorError] = useState('');
  const [isRegisteringVendor, setIsRegisteringVendor] = useState(false);

  // Vendor edit form states
  const [editingVendor, setEditingVendor] = useState<any | null>(null);
  const [editVendorName, setEditVendorName] = useState('');
  const [editVendorPhone, setEditVendorPhone] = useState('');
  const [editVendorEmail, setEditVendorEmail] = useState('');
  const [editVendorGst, setEditVendorGst] = useState('');
  const [editVendorActive, setEditVendorActive] = useState(true);
  const [editSuccess, setEditSuccess] = useState('');
  const [editError, setEditError] = useState('');
  const [isUpdatingVendor, setIsUpdatingVendor] = useState(false);

  const fetchVendors = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_BASE_URL}/auth/admin/vendors`, { headers });
      if (response.data && response.data.success) {
        setVendors(response.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching vendors:', err.message);
    }
  };

  const fetchCategoriesList = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/products/categories?all=true`);
      if (response.data && response.data.success) {
        setCategoriesList(response.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching categories:', err.message);
    }
  };

  const fetchBannersList = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/products/banners?all=true`);
      if (response.data && response.data.success) {
        setBannersList(response.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching banners:', err.message);
    }
  };

  useEffect(() => {
    if (token) {
      fetchVendors();
      fetchCategoriesList();
      fetchBannersList();
    }
  }, [token, activeTab]);

  const handleRegisterVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setVendorError('');
    setVendorSuccess('');
    if (!newVendorName || !newVendorPhone || !newVendorEmail || !newVendorPassword) {
      setVendorError('Please fill in all vendor register fields.');
      return;
    }
    setIsRegisteringVendor(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API_BASE_URL}/auth/admin/register-vendor`, {
        name: newVendorName,
        phone: newVendorPhone,
        email: newVendorEmail,
        password: newVendorPassword,
        gstNo: newVendorGst || undefined
      }, { headers });
      
      if (response.data && response.data.success) {
        setVendorSuccess('Vendor registered successfully! The vendor can now log in using these credentials.');
        setNewVendorName('');
        setNewVendorPhone('');
        setNewVendorEmail('');
        setNewVendorPassword('');
        setNewVendorGst('');
        fetchVendors();
      }
    } catch (err: any) {
      setVendorError(err.response?.data?.message || 'Failed to register vendor.');
    } finally {
      setIsRegisteringVendor(false);
    }
  };

  const handleStartEditVendor = (vendor: any) => {
    setEditingVendor(vendor);
    setEditVendorName(vendor.name);
    setEditVendorPhone(vendor.phone);
    setEditVendorEmail(vendor.email);
    setEditVendorGst(vendor.gstNo || '');
    setEditVendorActive(vendor.isActive);
    setEditError('');
    setEditSuccess('');
  };

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    if (!editingVendor) return;
    if (!editVendorName || !editVendorPhone || !editVendorEmail) {
      setEditError('Name, phone, and email are required.');
      return;
    }
    setIsUpdatingVendor(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.put(`http://localhost:5000/api/auth/admin/vendors/${editingVendor.id}`, {
        name: editVendorName,
        phone: editVendorPhone,
        email: editVendorEmail,
        gstNo: editVendorGst || undefined,
        isActive: editVendorActive
      }, { headers });

      if (response.data && response.data.success) {
        setEditSuccess('Vendor updated successfully!');
        fetchVendors();
        setTimeout(() => {
          setEditingVendor(null);
          setEditSuccess('');
        }, 1200);
      }
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update vendor.');
    } finally {
      setIsUpdatingVendor(false);
    }
  };

  const handleToggleVendorStatus = async (vendor: any) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`http://localhost:5000/api/auth/admin/vendors/${vendor.id}`, {
        name: vendor.name,
        phone: vendor.phone,
        email: vendor.email,
        gstNo: vendor.gstNo || undefined,
        isActive: !vendor.isActive
      }, { headers });
      fetchVendors();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle vendor status.');
    }
  };
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [modelYears, setModelYears] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);

  // Rider Management States
  const [riderSearchInput, setRiderSearchInput] = useState('');
  const [riderFilterStatus, setRiderFilterStatus] = useState('ALL');
  const [showAddRiderModal, setShowAddRiderModal] = useState(false);
  const [selectedRiderDetails, setSelectedRiderDetails] = useState<any>(null);

  const [newRiderData, setNewRiderData] = useState({
    name: '', email: '', phone: '', password: '', dob: '', gender: '',
    vehicleNumber: '', vehicleType: 'Bike', vehicleBrand: '', vehicleModel: '',
    licenseNumber: '', dlExpiry: '', aadhaarNumber: '',
    dlFrontUrl: '', dlBackUrl: '', aadhaarUrl: '', panUrl: '', rcUrl: '', insuranceUrl: '',
    status: 'PENDING_VERIFICATION',
    addressLine: '', city: '', state: '', pincode: ''
  });

  const handleRiderInputChange = (e: any) => {
    const { name, value } = e.target;
    setNewRiderData(prev => ({ ...prev, [name]: value }));
  };

  
  const handleRiderFileUpload = async (e: any, fieldName: string) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result;
      try {
        const res = await axios.post(`${API_BASE_URL}/upload/base64`, {
          file: base64,
          filename: file.name
        }, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) {
          setNewRiderData(prev => ({ ...prev, [fieldName]: res.data.url }));
        }
      } catch (err) {
        console.error('Upload failed', err);
      }
    };
  };

  const submitAddRider = async (e: any) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_BASE_URL}/admin/delivery-partners`, newRiderData, { headers });
      if (res.data.success) {
        alert('Rider added successfully!');
        setShowAddRiderModal(false);
        // Refresh partners
        const partnerRes = await axios.get(`${API_BASE_URL}/admin/delivery-partners`, { headers });
        if (partnerRes.data && partnerRes.data.success) {
          setPartners(partnerRes.data.data);
        }
      } else {
        alert('Failed to add rider: ' + res.data.message);
      }
    } catch (err: any) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const changeRiderStatus = async (id: string, status: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`http://localhost:5000/api/admin/delivery-partners/${id}/status`, { status }, { headers });
      if (res.data.success) {
        const partnerRes = await axios.get(`${API_BASE_URL}/admin/delivery-partners`, { headers });
        if (partnerRes.data && partnerRes.data.success) {
          setPartners(partnerRes.data.data);
        }
      }
    } catch (err: any) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };


  // Centralized Brand Master states
  const [brands, setBrands] = useState<any[]>([]);
  const [brandSearchInput, setBrandSearchInput] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandLogo, setNewBrandLogo] = useState('');
  const [newBrandDesc, setNewBrandDesc] = useState('');
  const [newBrandWebsite, setNewBrandWebsite] = useState('');

  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [editBrandName, setEditBrandName] = useState('');
  const [editBrandLogo, setEditBrandLogo] = useState('');
  const [editBrandDesc, setEditBrandDesc] = useState('');
  const [editBrandWebsite, setEditBrandWebsite] = useState('');
  const [editBrandActive, setEditBrandActive] = useState(true);

  // Selection states for cascading database panels
  const [selectedMfgId, setSelectedMfgId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedModelYearId, setSelectedModelYearId] = useState<string | null>(null);

  // CRUD Editing states
  const [editingMfgId, setEditingMfgId] = useState<string | null>(null);
  const [editMfgName, setEditMfgName] = useState('');

  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editModelName, setEditModelName] = useState('');

  const [editingModelYearId, setEditingModelYearId] = useState<string | null>(null);
  const [editModelYearValue, setEditModelYearValue] = useState('');

  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editVariantName, setEditVariantName] = useState('');

  // Form input states
  const [newMfgInput, setNewMfgInput] = useState('');
  const [newModelInput, setNewModelInput] = useState('');
  const [newModelYearInput, setNewModelYearInput] = useState('');
  const [newVariantInput, setNewVariantInput] = useState('');

  // Product addition inputs
  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdBrand, setNewProdBrand] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [selectedCompatibilities, setSelectedCompatibilities] = useState<string[]>([]);

  // Live Map Simulation coordinates
  const [riderPosition, setRiderPosition] = useState({ lat: 50, lng: 55 });
  const [eta, setEta] = useState(8);

  const fetchVehicleDatabase = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const mfgRes = await axios.get(`${API_BASE_URL}/garage/manufacturers`, { headers });
      if (mfgRes.data && mfgRes.data.success) {
        setManufacturers(mfgRes.data.data);
      }

      const mdlRes = await axios.get(`${API_BASE_URL}/garage/models`, { headers });
      if (mdlRes.data && mdlRes.data.success) {
        setModels(mdlRes.data.data);
      }

      const yrRes = await axios.get(`${API_BASE_URL}/garage/years`, { headers });
      if (yrRes.data && yrRes.data.success) {
        setModelYears(yrRes.data.data);
      }

      const vrtRes = await axios.get(`${API_BASE_URL}/garage/variants`, { headers });
      if (vrtRes.data && vrtRes.data.success) {
        setVariants(vrtRes.data.data);
      }

      const brandRes = await axios.get(`${API_BASE_URL}/products/brands?all=true`, { headers });
      if (brandRes.data && brandRes.data.success) {
        setBrands(brandRes.data.data);
      }

      const prodRes = await axios.get(`${API_BASE_URL}/products?all=true`, { headers });
      if (prodRes.data && prodRes.data.success) {
        setProducts(prodRes.data.data);
      }

      const orderRes = await axios.get(`${API_BASE_URL}/orders/admin-all`, { headers });
      if (orderRes.data && orderRes.data.success) {
        setOrders(orderRes.data.data);
      }

      const partnerRes = await axios.get(`${API_BASE_URL}/admin/delivery-partners`, { headers });
      if (partnerRes.data && partnerRes.data.success) {
        setPartners(partnerRes.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching database catalog telemetry:', err.message);
    }
  };

  useEffect(() => {
    if (token) {
      fetchVehicleDatabase();
    }
  }, [token, activeTab]);

  useEffect(() => {
    if (!token) return;
    
    // Connect to tracking socket for real-time updates
    const socket = io(BASE_URL);
    
    socket.on('connect', () => {
      console.log('Admin socket connected to tracking gateway.');
    });

    socket.on('admin_order_update', () => {
      fetchVehicleDatabase(); // Refresh data to see new order status
    });

    socket.on('partnerLocationUpdate', () => {
      fetchVehicleDatabase(); // Optionally refresh partners if needed, or we can just let it be.
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Simulation: Move rider marker on map
  useEffect(() => {
    const interval = setInterval(() => {
      setRiderPosition((prev) => {
        const destLat = 35;
        const destLng = 35;
        const latStep = (destLat - prev.lat) * 0.15;
        const lngStep = (destLng - prev.lng) * 0.15;
        const newLat = prev.lat + latStep;
        const newLng = prev.lng + lngStep;
        
        const dist = Math.sqrt(Math.pow(destLat - newLat, 2) + Math.pow(destLng - newLng, 2));
        setEta(Math.max(1, Math.round(dist * 0.3)));
        
        if (Math.abs(latStep) < 0.1 && Math.abs(lngStep) < 0.1) {
          return { lat: 80, lng: 90 };
        }
        return { lat: newLat, lng: newLng };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Manufacturer CRUD Action Handlers
  const handleCreateMfg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMfgInput.trim()) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_BASE_URL}/garage/manufacturers`, { name: newMfgInput }, { headers });
      if (res.data && res.data.success) {
        setNewMfgInput('');
        fetchVehicleDatabase();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create manufacturer.');
    }
  };

  const handleUpdateMfg = async (id: string) => {
    if (!editMfgName.trim()) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`http://localhost:5000/api/garage/manufacturers/${id}`, { name: editMfgName }, { headers });
      if (res.data && res.data.success) {
        setEditingMfgId(null);
        fetchVehicleDatabase();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update manufacturer.');
    }
  };

  const handleDeleteMfg = async (id: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.delete(`http://localhost:5000/api/garage/manufacturers/${id}`, { headers });
      if (res.data && res.data.success) {
        if (selectedMfgId === id) {
          setSelectedMfgId(null);
          setSelectedModelId(null);
          setSelectedModelYearId(null);
        }
        fetchVehicleDatabase();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete manufacturer.');
    }
  };

  // Model CRUD Action Handlers
  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMfgId || !newModelInput.trim()) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_BASE_URL}/garage/models`, { manufacturerId: selectedMfgId, name: newModelInput }, { headers });
      if (res.data && res.data.success) {
        setNewModelInput('');
        fetchVehicleDatabase();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create model.');
    }
  };

  const handleUpdateModel = async (id: string) => {
    if (!editModelName.trim()) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`http://localhost:5000/api/garage/models/${id}`, { name: editModelName }, { headers });
      if (res.data && res.data.success) {
        setEditingModelId(null);
        fetchVehicleDatabase();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update model.');
    }
  };

  const handleDeleteModel = async (id: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.delete(`http://localhost:5000/api/garage/models/${id}`, { headers });
      if (res.data && res.data.success) {
        if (selectedModelId === id) {
          setSelectedModelId(null);
          setSelectedModelYearId(null);
        }
        fetchVehicleDatabase();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete model.');
    }
  };

  // Model Year CRUD Action Handlers
  const handleCreateModelYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelId || !newModelYearInput.trim()) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_BASE_URL}/garage/years`, { modelId: selectedModelId, year: newModelYearInput }, { headers });
      if (res.data && res.data.success) {
        setNewModelYearInput('');
        fetchVehicleDatabase();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create model year.');
    }
  };

  const handleUpdateModelYear = async (id: string) => {
    if (!editModelYearValue.trim()) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`http://localhost:5000/api/garage/years/${id}`, { year: editModelYearValue }, { headers });
      if (res.data && res.data.success) {
        setEditingModelYearId(null);
        fetchVehicleDatabase();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update model year.');
    }
  };

  const handleDeleteModelYear = async (id: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.delete(`http://localhost:5000/api/garage/years/${id}`, { headers });
      if (res.data && res.data.success) {
        if (selectedModelYearId === id) {
          setSelectedModelYearId(null);
        }
        fetchVehicleDatabase();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete model year.');
    }
  };

  // Variant CRUD Action Handlers
  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelYearId || !newVariantInput.trim()) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_BASE_URL}/garage/variants`, { modelYearId: selectedModelYearId, name: newVariantInput }, { headers });
      if (res.data && res.data.success) {
        setNewVariantInput('');
        fetchVehicleDatabase();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create engine variant.');
    }
  };

  const handleUpdateVariant = async (id: string) => {
    if (!editVariantName.trim()) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`http://localhost:5000/api/garage/variants/${id}`, { name: editVariantName }, { headers });
      if (res.data && res.data.success) {
        setEditingVariantId(null);
        fetchVehicleDatabase();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update engine variant.');
    }
  };

  const handleDeleteVariant = async (id: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.delete(`http://localhost:5000/api/garage/variants/${id}`, { headers });
      if (res.data && res.data.success) {
        fetchVehicleDatabase();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete engine variant.');
    }
  };

  // Centralized Brand Master CRUD Action Handlers
  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_BASE_URL}/products/brands`, {
        name: newBrandName,
        logoUrl: newBrandLogo || undefined,
        description: newBrandDesc || undefined,
        website: newBrandWebsite || undefined,
        isActive: true
      }, { headers });
      if (res.data && res.data.success) {
        setNewBrandName('');
        setNewBrandLogo('');
        setNewBrandDesc('');
        setNewBrandWebsite('');
        fetchVehicleDatabase();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create brand.');
    }
  };

  const handleUpdateBrand = async (id: string) => {
    if (!editBrandName.trim()) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`http://localhost:5000/api/products/brands/${id}`, {
        name: editBrandName,
        logoUrl: editBrandLogo || undefined,
        description: editBrandDesc || undefined,
        website: editBrandWebsite || undefined,
        isActive: editBrandActive
      }, { headers });
      if (res.data && res.data.success) {
        setEditingBrandId(null);
        fetchVehicleDatabase();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update brand.');
    }
  };

  const handleToggleBrandStatus = async (brand: any) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`http://localhost:5000/api/products/brands/${brand.id}`, {
        isActive: !brand.isActive
      }, { headers });
      if (res.data && res.data.success) {
        fetchVehicleDatabase();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update brand status.');
    }
  };

  const handleDeleteBrand = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this brand?')) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.delete(`http://localhost:5000/api/products/brands/${id}`, { headers });
      if (res.data && res.data.success) {
        fetchVehicleDatabase();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete brand.');
    }
  };

  // Categories CRUD Handlers
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const slug = newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const res = await axios.post(`${API_BASE_URL}/products/categories`, {
        name: newCatName,
        slug,
        imageUrl: newCatImageUrl || undefined,
        iconUrl: newCatIconUrl || undefined,
        isActive: true
      }, { headers });
      if (res.data && res.data.success) {
        setNewCatName('');
        setNewCatImageUrl('');
        setNewCatIconUrl('');
        fetchCategoriesList();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create category.');
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editCatName.trim()) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`http://localhost:5000/api/products/categories/${id}`, {
        name: editCatName,
        imageUrl: editCatImageUrl || undefined,
        iconUrl: editCatIconUrl || undefined,
        isActive: editCatActive
      }, { headers });
      if (res.data && res.data.success) {
        setEditingCatId(null);
        fetchCategoriesList();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update category.');
    }
  };

  const handleToggleCategoryStatus = async (cat: any) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`http://localhost:5000/api/products/categories/${cat.id}`, {
        isActive: !cat.isActive
      }, { headers });
      if (res.data && res.data.success) {
        fetchCategoriesList();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update category status.');
    }
  };

  // Banners CRUD Handlers
  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerTitle.trim() || !newBannerImageUrl.trim()) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_BASE_URL}/products/banners`, {
        title: newBannerTitle,
        subtitle: newBannerSubtitle || undefined,
        imageUrl: newBannerImageUrl,
        linkType: newBannerLinkType,
        linkValue: newBannerLinkValue || undefined,
        displayOrder: parseInt(newBannerDisplayOrder) || 0
      }, { headers });
      if (res.data && res.data.success) {
        setNewBannerTitle('');
        setNewBannerSubtitle('');
        setNewBannerImageUrl('');
        setNewBannerLinkType('none');
        setNewBannerLinkValue('');
        setNewBannerDisplayOrder('0');
        fetchBannersList();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create banner.');
    }
  };

  const handleUpdateBanner = async (id: string) => {
    if (!editBannerTitle.trim() || !editBannerImageUrl.trim()) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`http://localhost:5000/api/products/banners/${id}`, {
        title: editBannerTitle,
        subtitle: editBannerSubtitle || undefined,
        imageUrl: editBannerImageUrl,
        linkType: editBannerLinkType,
        linkValue: editBannerLinkValue || undefined,
        isActive: editBannerActive,
        displayOrder: parseInt(editBannerDisplayOrder) || 0
      }, { headers });
      if (res.data && res.data.success) {
        setEditingBannerId(null);
        fetchBannersList();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update banner.');
    }
  };

  const handleToggleBannerStatus = async (banner: any) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`http://localhost:5000/api/products/banners/${banner.id}`, {
        isActive: !banner.isActive
      }, { headers });
      if (res.data && res.data.success) {
        fetchBannersList();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update banner status.');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.delete(`http://localhost:5000/api/products/banners/${id}`, { headers });
      if (res.data && res.data.success) {
        fetchBannersList();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete banner.');
    }
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdSku || !newProdPrice) return;
    const newProduct = {
      id: Date.now().toString(),
      name: newProdName,
      sku: newProdSku,
      oemNumber: 'OEM-' + Math.floor(Math.random() * 1000000),
      description: 'Automotive spare parts premium grade replacement component.',
      price: parseFloat(newProdPrice),
      mrp: parseFloat(newProdPrice) * 1.25,
      discount: 20,
      brand: newProdBrand || 'Genuine Parts',
      category: newProdCategory || 'Filters',
      stock: parseInt(newProdStock) || 10,
      compatibilities: selectedCompatibilities
    };
    setProducts([newProduct, ...products]);
    setNewProdName('');
    setNewProdSku('');
    setNewProdPrice('');
    setNewProdStock('');
    setSelectedCompatibilities([]);
  };

  const handleToggleCompatibility = (variantId: string) => {
    setSelectedCompatibilities((prev) =>
      prev.includes(variantId)
        ? prev.filter((id) => id !== variantId)
        : [...prev, variantId]
    );
  };

  const handleAssignRider = async (orderId: string, partnerId: string | null) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.put(`http://localhost:5000/api/orders/${orderId}/status`, {
        status: 'PACKED', // Keep status PACKED, but set rider, so rider gets new order request alert to accept
        deliveryPartnerId: partnerId
      }, { headers });
      
      if (response.data && response.data.success) {
        fetchVehicleDatabase(); // reload orders list from DB
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign delivery rider');
    }
  };

  if (!token) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090d16', color: '#111827', fontFamily: 'system-ui' }}>
        {authMode === 'login' && (
          <form onSubmit={handleLogin} style={{ background: '#F8FAFC', padding: '32px', borderRadius: '16px', border: '1px solid #F8FAFC', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <img src={logo} alt="MechBazar" style={{ height: '32px' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>Admin Management Portal</p>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Sign In</h2>

            {authError ? (
              <div style={{ backgroundColor: '#7f1d1d', border: '1px solid #b91c1c', padding: '10px', borderRadius: '10px', color: '#fca5a5', fontSize: '13px', textAlign: 'center' }}>
                {authError}
              </div>
            ) : null}

            {authSuccess ? (
              <div style={{ backgroundColor: '#064e3b', border: '1px solid #059669', padding: '10px', borderRadius: '10px', color: '#a7f3d0', fontSize: '13px', textAlign: 'center' }}>
                {authSuccess}
              </div>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#d1d5db', fontSize: '13px', fontWeight: 'bold' }}>Admin Email</label>
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
              disabled={isAuthLoading}
              style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: '0.2s', marginTop: '8px' }}
            >
              {isAuthLoading ? 'Signing In...' : 'Sign In'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '8px' }}>
              <button type="button" onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>Create Admin Account</button>
              <button type="button" onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthSuccess(''); }} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>Forgot Password?</button>
            </div>

            <div style={{ borderTop: '1px solid #F8FAFC', paddingTop: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Test login: <span style={{ color: 'var(--accent)' }}>admin@mechbazar.com / Password@123</span>
            </div>
          </form>
        )}

        {authMode === 'signup' && (
          <form onSubmit={handleSignUp} style={{ background: '#F8FAFC', padding: '32px', borderRadius: '16px', border: '1px solid #F8FAFC', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <img src={logo} alt="MechBazar" style={{ height: '32px' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>Register Admin Account</p>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Sign Up</h2>

            {authError ? (
              <div style={{ backgroundColor: '#7f1d1d', border: '1px solid #b91c1c', padding: '10px', borderRadius: '10px', color: '#fca5a5', fontSize: '13px', textAlign: 'center' }}>
                {authError}
              </div>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#d1d5db', fontSize: '13px', fontWeight: 'bold' }}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', color: '#111827', padding: '10px 14px', borderRadius: '10px', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#d1d5db', fontSize: '13px', fontWeight: 'bold' }}>Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', color: '#111827', padding: '10px 14px', borderRadius: '10px', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#d1d5db', fontSize: '13px', fontWeight: 'bold' }}>Email Address</label>
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
              disabled={isAuthLoading}
              style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: '0.2s', marginTop: '8px' }}
            >
              {isAuthLoading ? 'Creating Account...' : 'Register Admin'}
            </button>

            <button type="button" onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', textAlign: 'center' }}>Already have an account? Sign In</button>
          </form>
        )}

        {authMode === 'forgot' && (
          <form onSubmit={handleForgotPassword} style={{ background: '#F8FAFC', padding: '32px', borderRadius: '16px', border: '1px solid #F8FAFC', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <img src={logo} alt="MechBazar" style={{ height: '32px' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>Recover Admin Password</p>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Forgot Password</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Enter your email address and we will generate a password reset code for you.</p>

            {authError ? (
              <div style={{ backgroundColor: '#7f1d1d', border: '1px solid #b91c1c', padding: '10px', borderRadius: '10px', color: '#fca5a5', fontSize: '13px', textAlign: 'center' }}>
                {authError}
              </div>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#d1d5db', fontSize: '13px', fontWeight: 'bold' }}>Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', color: '#111827', padding: '10px 14px', borderRadius: '10px', fontSize: '14px' }}
              />
            </div>

            <button
              type="submit"
              disabled={isAuthLoading}
              style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: '0.2s', marginTop: '8px' }}
            >
              {isAuthLoading ? 'Sending...' : 'Request Reset Code'}
            </button>

            <button type="button" onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', textAlign: 'center' }}>Back to Sign In</button>
          </form>
        )}

        {authMode === 'reset' && (
          <form onSubmit={handleResetPassword} style={{ background: '#F8FAFC', padding: '32px', borderRadius: '16px', border: '1px solid #F8FAFC', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <img src={logo} alt="MechBazar" style={{ height: '32px' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>Reset Admin Password</p>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Reset Password</h2>

            {authError ? (
              <div style={{ backgroundColor: '#7f1d1d', border: '1px solid #b91c1c', padding: '10px', borderRadius: '10px', color: '#fca5a5', fontSize: '13px', textAlign: 'center' }}>
                {authError}
              </div>
            ) : null}

            {authSuccess ? (
              <div style={{ backgroundColor: '#064e3b', border: '1px solid #059669', padding: '10px', borderRadius: '10px', color: '#a7f3d0', fontSize: '12px', textAlign: 'center' }}>
                {authSuccess}
              </div>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#d1d5db', fontSize: '13px', fontWeight: 'bold' }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled
                style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', color: '#64748B', padding: '10px 14px', borderRadius: '10px', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#d1d5db', fontSize: '13px', fontWeight: 'bold' }}>6-Digit Reset Code</label>
              <input
                type="text"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                required
                style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', color: '#111827', padding: '10px 14px', borderRadius: '10px', fontSize: '14px', letterSpacing: '2px', textAlign: 'center', fontWeight: 'bold' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#d1d5db', fontSize: '13px', fontWeight: 'bold' }}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', color: '#111827', padding: '10px 14px', borderRadius: '10px', fontSize: '14px' }}
              />
            </div>

            <button
              type="submit"
              disabled={isAuthLoading}
              style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: '0.2s', marginTop: '8px' }}
            >
              {isAuthLoading ? 'Resetting...' : 'Change Password'}
            </button>

            <button type="button" onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', textAlign: 'center' }}>Cancel and Sign In</button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar Navigation */}
      <aside className="glass" style={{ width: '260px', padding: '24px 16px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px', paddingLeft: '8px' }}>
          <img src={logo} alt="MechBazar" style={{ height: '24px' }} />
          <span style={{ fontSize: '10px', background: '#3f3f46', padding: '2px 6px', borderRadius: '16px' }}>Admin</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'orders', label: 'Order Tracking', icon: ShoppingBag },
            { id: 'products', label: 'Product Manager', icon: Package },
            { id: 'vehicles', label: 'Vehicle Database', icon: Wrench },
            { id: 'brands', label: 'Brand Master', icon: Tag },
            { id: 'categories', label: 'Category Master', icon: Layers },
            { id: 'banners', label: 'Banner Master', icon: ImageIcon },
            { id: 'partners', label: 'Delivery Riders', icon: Truck },
            { id: 'vendors', label: 'Vendor Manager', icon: Users },
            { id: 'map', label: 'Live Operations Map', icon: Compass }
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

        <button 
          onClick={handleLogout} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            width: '100%', 
            padding: '12px 16px', 
            background: 'transparent', 
            color: '#ef4444', 
            border: 'none', 
            borderRadius: '10px', 
            cursor: 'pointer', 
            textAlign: 'left',
            marginTop: 'auto',
            fontWeight: 'bold'
          }}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main View Area */}
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        {activeTab === 'dashboard' && (
          <div>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Overview Dashboard</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Welcome back! Here is MechBazar performance today.</p>
              </div>
              <button className="btn btn-secondary">
                <RefreshCw size={16} />
                Refresh Data
              </button>
            </header>

            {/* Metrics cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
              {[
                { title: 'Today\'s Sales', value: '₹18,450.00', icon: DollarSign, change: '+12.5%', color: 'var(--success)' },
                { title: 'Active Orders', value: '14 Pending', icon: ShoppingBag, change: '8 in delivery', color: 'var(--accent)' },
                { title: 'Total Riders', value: '8 Riders', icon: Truck, change: '6 Online', color: 'var(--success)' },
                { title: 'Parts Inventory', value: '3,842 items', icon: Package, change: '4 low-stock alerts', color: '#38bdf8' }
              ].map((metric, i) => {
                const Icon = metric.icon;
                return (
                  <div key={i} className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{metric.title}</span>
                      <Icon size={20} color={metric.color} />
                    </div>
                    <h3 style={{ fontSize: '28px', marginBottom: '8px' }}>{metric.value}</h3>
                    <span style={{ fontSize: '12px', color: metric.color }}>{metric.change}</span>
                  </div>
                );
              })}
            </div>

            {/* Analytics Dashboard Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
              <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                <h3 style={{ marginBottom: '20px' }}>Recent Order Logs</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px' }}>Order ID</th>
                      <th style={{ padding: '12px' }}>Customer</th>
                      <th style={{ padding: '12px' }}>Value</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px' }}>Rider</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((ord) => (
                      <tr key={ord.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '16px 12px', fontWeight: 'bold' }}>{ord.id}</td>
                        <td style={{ padding: '16px 12px' }}>{ord.customerName}</td>
                        <td style={{ padding: '16px 12px' }}>₹{ord.totalAmount}</td>
                        <td style={{ padding: '16px 12px' }}>
                          <span
                            style={{
                              background: ord.status === 'DELIVERED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(250, 204, 21, 0.1)',
                              color: ord.status === 'DELIVERED' ? 'var(--success)' : 'var(--accent)',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{ord.rider || 'Unassigned'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Warehouse Inventory Alerts */}
              <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                <h3 style={{ marginBottom: '20px' }}>Quick Warehouse Alert</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#E5E7EB', padding: '12px', borderRadius: '16px' }}>
                    <MapPin size={24} color="var(--accent)" />
                    <div>
                      <h4 style={{ fontSize: '14px' }}>Noida Sector 63 Hub</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>12 mins delivery threshold active</p>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Status Metrics</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span>Pack Speed Average</span>
                      <span style={{ color: 'var(--success)' }}>1.8 mins</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span>Rider Fleet Load</span>
                      <span style={{ color: 'var(--accent)' }}>60% Busy</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <header style={{ marginBottom: '32px' }}>
              <h2>Active Operations & Dispatch Control</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Monitor and assign delivery partners for fast quick-commerce order dispatch.</p>
            </header>

            <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No active orders found.</p>
                ) : (
                  orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').map((ord) => {
                    const customerName = ord.customer?.name || ord.customerName || 'Vivek Kumar';
                    const addressStr = ord.address 
                      ? `${ord.address.addressLine1}${ord.address.addressLine2 ? `, ${ord.address.addressLine2}` : ''}, ${ord.address.city}, ${ord.address.state} - ${ord.address.zipCode}`
                      : (ord.address || 'Noida Sector 62');
                    
                    const isRiderAssigned = !!ord.deliveryPartner;
                    const isRiderAccepted = ord.status !== 'PACKED' && ord.status !== 'PENDING';
                    
                    return (
                      <div
                        key={ord.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)',
                          padding: '20px',
                          borderRadius: '16px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--accent)' }}>#{ord.id.substring(0, 8)}...</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {new Date(ord.createdAt).toLocaleDateString()} {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p style={{ fontSize: '14px', marginBottom: '4px' }}>Customer: <strong>{customerName}</strong></p>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Address: {addressStr}</p>
                          <p style={{ fontSize: '14px', marginTop: '6px', color: 'var(--accent)', fontWeight: 'bold' }}>Order Value: ₹{ord.totalAmount.toFixed(2)}</p>
                          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <strong>Items:</strong> {ord.items?.map((i: any) => `${i.product?.name} (${i.quantity}x)`).join(', ') || 'No items'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                          <div>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Dispatch Telemetry</span>
                            {isRiderAssigned ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)' }}>
                                  <CheckCircle size={16} />
                                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{ord.deliveryPartner.user.name}</span>
                                </div>
                                <span style={{ fontSize: '12px', color: isRiderAccepted ? 'var(--success)' : 'var(--accent)', fontWeight: '500' }}>
                                  {isRiderAccepted ? '⚡ Accepted Order' : '⏳ Waiting for Acceptance'}
                                </span>
                                {ord.deliveryPartner.location && (
                                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    <div>Loc: {ord.deliveryPartner.location.latitude.toFixed(4)}, {ord.deliveryPartner.location.longitude.toFixed(4)}</div>
                                    <div>ETA: 8 mins (2.1 km away)</div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)' }}>
                                <XCircle size={16} />
                                <span style={{ fontSize: '14px' }}>Waiting for Rider</span>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {isRiderAssigned ? (
                              <button
                                onClick={() => handleAssignRider(ord.id, null)}
                                className="btn"
                                style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#7f1d1d', color: '#fca5a5', border: '1px solid #b91c1c' }}
                              >
                                Reassign Rider
                              </button>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Select Rider</label>
                                <select
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val) handleAssignRider(ord.id, val);
                                  }}
                                  style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', color: '#111827', padding: '8px 12px', borderRadius: '10px', fontSize: '13px', minWidth: '160px', cursor: 'pointer' }}
                                  defaultValue=""
                                >
                                  <option value="" disabled>Assign Rider</option>
                                  {partners.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.user?.name || 'Rider'} ({p.vehicleType || 'Motorcycle'})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <header style={{ marginTop: '48px', marginBottom: '32px' }}>
              <h2>Completed Orders & History</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Review delivered and cancelled orders.</p>
            </header>

            <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {orders.filter(o => o.status === 'DELIVERED' || o.status === 'CANCELLED').length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No completed orders found.</p>
                ) : (
                  orders.filter(o => o.status === 'DELIVERED' || o.status === 'CANCELLED').map((ord) => {
                    const customerName = ord.customer?.name || ord.customerName || 'Vivek Kumar';
                    const addressStr = ord.address 
                      ? `${ord.address.addressLine1}${ord.address.addressLine2 ? `, ${ord.address.addressLine2}` : ''}, ${ord.address.city}, ${ord.address.state} - ${ord.address.zipCode}`
                      : (ord.address || 'Noida Sector 62');
                    
                    return (
                      <div
                        key={ord.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)',
                          padding: '20px',
                          borderRadius: '16px',
                          opacity: 0.8
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--text-secondary)' }}>#{ord.id.substring(0, 8)}...</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {new Date(ord.createdAt).toLocaleDateString()} {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p style={{ fontSize: '14px', marginBottom: '4px' }}>Customer: <strong>{customerName}</strong></p>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Address: {addressStr}</p>
                          <p style={{ fontSize: '14px', marginTop: '6px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Order Value: ₹{ord.totalAmount.toFixed(2)}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <span
                            style={{
                              background: ord.status === 'DELIVERED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: ord.status === 'DELIVERED' ? 'var(--success)' : 'var(--danger)',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: 'bold'
                            }}
                          >
                            {ord.status}
                          </span>
                          {ord.deliveryPartner && (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              Rider: {ord.deliveryPartner.user.name}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Product & Compatibility Manager</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Add new automotive products and map them to compatible vehicle variants.</p>
              </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              {/* Product Creation & Compatibility link */}
              <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                <h3 style={{ marginBottom: '20px' }}>Add Spare Part Product</h3>
                <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <input
                    type="text"
                    placeholder="Product Name"
                    className="input-field"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    required
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="SKU Code"
                      className="input-field"
                      value={newProdSku}
                      onChange={(e) => setNewProdSku(e.target.value)}
                      required
                    />
                    <input
                      type="number"
                      placeholder="Price (₹)"
                      className="input-field"
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="Brand"
                      className="input-field"
                      value={newProdBrand}
                      onChange={(e) => setNewProdBrand(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Stock Qty"
                      className="input-field"
                      value={newProdStock}
                      onChange={(e) => setNewProdStock(e.target.value)}
                    />
                  </div>

                  {/* Compatibility Checklist */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                      Select Compatible Vehicle Variants (Required for smart filter)
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                      {variants.map((vrt) => (
                        <label key={vrt.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedCompatibilities.includes(vrt.id)}
                            onChange={() => handleToggleCompatibility(vrt.id)}
                          />
                          <span>
                            {INITIAL_MODELS.find(m => m.id === vrt.modelId)?.name} - {vrt.name} ({vrt.fuelType})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button className="btn" type="submit">
                    <Plus size={16} />
                    Register Product & Mappings
                  </button>
                </form>
              </div>

              {/* Active Products List */}
              <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                <h3 style={{ marginBottom: '20px' }}>Active Parts List</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
                  {products.map((prod) => (
                    <div
                      key={prod.id}
                      style={{
                        padding: '16px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <h4 style={{ fontSize: '15px' }}>{prod.name}</h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>SKU: {prod.sku} | Brand: {prod.brand}</p>
                        <p style={{ fontSize: '14px', color: 'var(--accent)', marginTop: '4px', fontWeight: 'bold' }}>₹{prod.price}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                          {prod.compatibilities && Array.isArray(prod.compatibilities) && prod.compatibilities.map((c: any) => {
                            const vrtObj = typeof c === 'string' ? variants.find((v: any) => v.id === c) : c.variant;
                            const modelObj = vrtObj ? models.find((m: any) => m.id === vrtObj.modelId) : null;
                            const label = modelObj ? `${modelObj.name} ${vrtObj.name}` : 'Car';
                            return (
                              <span
                                key={typeof c === 'string' ? c : c.id}
                                style={{ fontSize: '9px', background: '#E5E7EB', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <button
                        onClick={() => setProducts(products.filter(p => p.id !== prod.id))}
                        style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vehicles' && (
          <div>
            <header style={{ marginBottom: '32px' }}>
              <h2>Vehicle Schema Database</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Configure vehicle manufacturers, models, and engine variants which drive customer compatibility search filters.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
              
              {/* Left Panel: Manufacturers */}
              <div className="glass" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Manufacturers</h3>
                
                <form onSubmit={handleCreateMfg} style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="New Manufacturer"
                    className="input-field"
                    style={{ flex: 1 }}
                    value={newMfgInput}
                    onChange={(e) => setNewMfgInput(e.target.value)}
                  />
                  <button className="btn" type="submit">Add</button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '450px' }}>
                  {manufacturers.map((mfg) => (
                    <div
                      key={mfg.id}
                      onClick={() => {
                        setSelectedMfgId(mfg.id);
                        setSelectedModelId(null);
                        setSelectedModelYearId(null);
                      }}
                      style={{
                        padding: '12px 16px',
                        background: selectedMfgId === mfg.id ? 'rgba(251, 191, 36, 0.08)' : 'var(--bg-secondary)',
                        border: selectedMfgId === mfg.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: '0.2s'
                      }}
                    >
                      {editingMfgId === mfg.id ? (
                        <div style={{ display: 'flex', gap: '8px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editMfgName}
                            onChange={(e) => setEditMfgName(e.target.value)}
                            className="input-field"
                            style={{ flex: 1, padding: '4px 8px', fontSize: '13px' }}
                          />
                          <button onClick={() => handleUpdateMfg(mfg.id)} style={{ padding: '4px 8px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Save</button>
                          <button onClick={() => setEditingMfgId(null)} style={{ padding: '4px 8px', background: '#E5E7EB', color: '#111827', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                        </div>
                      ) : (
                        <>
                          <span style={{ fontWeight: selectedMfgId === mfg.id ? 'bold' : 'normal', color: selectedMfgId === mfg.id ? 'var(--accent)' : '#111827' }}>{mfg.name}</span>
                          <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setEditingMfgId(mfg.id);
                                setEditMfgName(mfg.name);
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '12px' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteMfg(mfg.id)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Second Panel: Models */}
              <div className="glass" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Models</h3>
                
                {selectedMfgId ? (
                  <>
                    <form onSubmit={handleCreateModel} style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="New Model"
                        className="input-field"
                        style={{ flex: 1 }}
                        value={newModelInput}
                        onChange={(e) => setNewModelInput(e.target.value)}
                      />
                      <button className="btn" type="submit">Add</button>
                    </form>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '450px' }}>
                      {models
                        .filter((mdl) => mdl.manufacturerId === selectedMfgId)
                        .map((mdl) => (
                          <div
                            key={mdl.id}
                            onClick={() => {
                              setSelectedModelId(mdl.id);
                              setSelectedModelYearId(null);
                            }}
                            style={{
                              padding: '12px 16px',
                              background: selectedModelId === mdl.id ? 'rgba(251, 191, 36, 0.08)' : 'var(--bg-secondary)',
                              border: selectedModelId === mdl.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                              borderRadius: '10px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              transition: '0.2s'
                            }}
                          >
                            {editingModelId === mdl.id ? (
                              <div style={{ display: 'flex', gap: '8px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editModelName}
                                  onChange={(e) => setEditModelName(e.target.value)}
                                  className="input-field"
                                  style={{ flex: 1, padding: '4px 8px', fontSize: '13px' }}
                                />
                                <button onClick={() => handleUpdateModel(mdl.id)} style={{ padding: '4px 8px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Save</button>
                                <button onClick={() => setEditingModelId(null)} style={{ padding: '4px 8px', background: '#E5E7EB', color: '#111827', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                              </div>
                            ) : (
                              <>
                                <span style={{ fontWeight: selectedModelId === mdl.id ? 'bold' : 'normal', color: selectedModelId === mdl.id ? 'var(--accent)' : '#111827' }}>{mdl.name}</span>
                                <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => {
                                      setEditingModelId(mdl.id);
                                      setEditModelName(mdl.name);
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '12px' }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteModel(mdl.id)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '14px', border: '1px dashed var(--border)', borderRadius: '10px', padding: '40px 20px', textAlign: 'center' }}>
                    Select a manufacturer to view models
                  </div>
                )}
              </div>

              {/* Third Panel: Model Years */}
              <div className="glass" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Model Years</h3>
                
                {selectedModelId ? (
                  <>
                    <form onSubmit={handleCreateModelYear} style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="Year/Range (e.g. 2016-2020)"
                        className="input-field"
                        style={{ flex: 1 }}
                        value={newModelYearInput}
                        onChange={(e) => setNewModelYearInput(e.target.value)}
                      />
                      <button className="btn" type="submit">Add</button>
                    </form>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '450px' }}>
                      {modelYears
                        .filter((yr) => yr.modelId === selectedModelId)
                        .map((yr) => (
                          <div
                            key={yr.id}
                            onClick={() => setSelectedModelYearId(yr.id)}
                            style={{
                              padding: '12px 16px',
                              background: selectedModelYearId === yr.id ? 'rgba(251, 191, 36, 0.08)' : 'var(--bg-secondary)',
                              border: selectedModelYearId === yr.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                              borderRadius: '10px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              transition: '0.2s'
                            }}
                          >
                            {editingModelYearId === yr.id ? (
                              <div style={{ display: 'flex', gap: '8px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editModelYearValue}
                                  onChange={(e) => setEditModelYearValue(e.target.value)}
                                  className="input-field"
                                  style={{ flex: 1, padding: '4px 8px', fontSize: '13px' }}
                                />
                                <button onClick={() => handleUpdateModelYear(yr.id)} style={{ padding: '4px 8px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Save</button>
                                <button onClick={() => setEditingModelYearId(null)} style={{ padding: '4px 8px', background: '#E5E7EB', color: '#111827', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                              </div>
                            ) : (
                              <>
                                <span style={{ fontWeight: selectedModelYearId === yr.id ? 'bold' : 'normal', color: selectedModelYearId === yr.id ? 'var(--accent)' : '#111827' }}>{yr.year}</span>
                                <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => {
                                      setEditingModelYearId(yr.id);
                                      setEditModelYearValue(String(yr.year));
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '12px' }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteModelYear(yr.id)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '14px', border: '1px dashed var(--border)', borderRadius: '10px', padding: '40px 20px', textAlign: 'center' }}>
                    Select a model to view model years
                  </div>
                )}
              </div>

              {/* Fourth Panel: Engine Variants */}
              <div className="glass" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Engine Variants</h3>
                
                {selectedModelYearId ? (
                  <>
                    <form onSubmit={handleCreateVariant} style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="New Engine Variant"
                        className="input-field"
                        style={{ flex: 1 }}
                        value={newVariantInput}
                        onChange={(e) => setNewVariantInput(e.target.value)}
                      />
                      <button className="btn" type="submit">Add</button>
                    </form>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '450px' }}>
                      {variants
                        .filter((vrt) => vrt.modelYearId === selectedModelYearId)
                        .map((vrt) => (
                          <div
                            key={vrt.id}
                            style={{
                              padding: '12px 16px',
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border)',
                              borderRadius: '10px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            {editingVariantId === vrt.id ? (
                              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                <input
                                  type="text"
                                  value={editVariantName}
                                  onChange={(e) => setEditVariantName(e.target.value)}
                                  className="input-field"
                                  style={{ flex: 1, padding: '4px 8px', fontSize: '13px' }}
                                />
                                <button onClick={() => handleUpdateVariant(vrt.id)} style={{ padding: '4px 8px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Save</button>
                                <button onClick={() => setEditingVariantId(null)} style={{ padding: '4px 8px', background: '#E5E7EB', color: '#111827', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                              </div>
                            ) : (
                              <>
                                <span style={{ color: '#111827' }}>{vrt.name}</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={() => {
                                      setEditingVariantId(vrt.id);
                                      setEditVariantName(vrt.name);
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '12px' }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteVariant(vrt.id)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '14px', border: '1px dashed var(--border)', borderRadius: '10px', padding: '40px 20px', textAlign: 'center' }}>
                    Select a model year to view engine variants
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {activeTab === 'partners' && (
          <div>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Delivery Riders (Verification Center)</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Manage delivery partners, view documents, and verify rider profiles.</p>
              </div>
              <button className="btn" onClick={() => setShowAddRiderModal(true)} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Plus size={18} /> Add Delivery Rider
              </button>
            </header>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <input
                type="text"
                placeholder="Search by name, phone, or vehicle..."
                className="input-field"
                style={{ flex: 1 }}
                value={riderSearchInput}
                onChange={(e) => setRiderSearchInput(e.target.value)}
              />
              <select
                className="input-field"
                value={riderFilterStatus}
                onChange={(e) => setRiderFilterStatus(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_VERIFICATION">Pending Verification</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {partners
                  .filter(p => riderFilterStatus === 'ALL' ? true : p.accountStatus === riderFilterStatus)
                  .filter(p => !riderSearchInput || (p.user?.name?.toLowerCase().includes(riderSearchInput.toLowerCase()) || p.user?.phone?.includes(riderSearchInput) || p.vehicleNumber?.toLowerCase().includes(riderSearchInput.toLowerCase())))
                  .map((partner) => (
                  <div
                    key={partner.id}
                    style={{
                      background: 'var(--bg-secondary)',
                      padding: '20px',
                      borderRadius: '16px',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#333', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {partner.user?.profilePhoto ? (
                           <img src={BASE_URL + partner.user.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                           <span style={{ fontSize: 20 }}>👤</span>
                        )}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{partner.user?.name || partner.name}</span>
                          <span
                            style={{
                              background: partner.accountStatus === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                              color: partner.accountStatus === 'ACTIVE' ? 'var(--success)' : 'var(--accent)',
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '10px'
                            }}
                          >
                            {partner.accountStatus}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Phone: {partner.user?.phone}</p>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Vehicle: {partner.vehicleType} - {partner.vehicleNumber}</p>
                        <p style={{ fontSize: '14px', marginTop: '6px', color: 'var(--accent)' }}>Rating: ⭐ {partner.rating}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button onClick={() => setSelectedRiderDetails(partner)} className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', padding: '6px 12px' }}>
                        View Details
                      </button>
                      {partner.accountStatus !== 'ACTIVE' ? (
                        <button
                          onClick={() => changeRiderStatus(partner.id, 'ACTIVE')}
                          className="btn"
                          style={{ padding: '8px 16px', fontSize: '13px', background: 'var(--success)', color: '#111827' }}
                        >
                          Approve
                        </button>
                      ) : (
                        <button
                          onClick={() => changeRiderStatus(partner.id, 'SUSPENDED')}
                          className="btn"
                          style={{ padding: '8px 16px', fontSize: '13px', background: '#ef4444', color: '#111827' }}
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {partners.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No riders found.</p>}
              </div>
            </div>

            {/* Rider Details Modal */}
            {selectedRiderDetails && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                <div className="glass" style={{ background: '#F8FAFC', width: '100%', maxWidth: '600px', borderRadius: '16px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h2 style={{ color: '#111827', margin: 0 }}>Rider Details</h2>
                    <button onClick={() => setSelectedRiderDetails(null)} style={{ background: 'none', border: 'none', color: '#111827', cursor: 'pointer' }}><X size={24} /></button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <h4 style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Personal Info</h4>
                      <p><strong>Name:</strong> {selectedRiderDetails.user?.name}</p>
                      <p><strong>Phone:</strong> {selectedRiderDetails.user?.phone}</p>
                      <p><strong>Email:</strong> {selectedRiderDetails.user?.email}</p>
                      <p><strong>DOB:</strong> {selectedRiderDetails.user?.dob ? new Date(selectedRiderDetails.user.dob).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <h4 style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Vehicle Info</h4>
                      <p><strong>Type:</strong> {selectedRiderDetails.vehicleType}</p>
                      <p><strong>Brand:</strong> {selectedRiderDetails.vehicleBrand || 'N/A'}</p>
                      <p><strong>Model:</strong> {selectedRiderDetails.vehicleModel || 'N/A'}</p>
                      <p><strong>Reg No:</strong> {selectedRiderDetails.vehicleNumber}</p>
                    </div>
                  </div>

                  <h4 style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Documents</h4>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {['dlFrontUrl', 'dlBackUrl', 'aadhaarUrl', 'rcUrl', 'insuranceUrl'].map(doc => selectedRiderDetails[doc] ? (
                      <a key={doc} href={BASE_URL + selectedRiderDetails[doc]} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '8px', background: '#F8FAFC', borderRadius: '10px', color: 'var(--accent)', textDecoration: 'none' }}>
                        View {doc.replace('Url', '')}
                      </a>
                    ) : null)}
                  </div>
                </div>
              </div>
            )}

            {/* Add Rider Modal */}
            {showAddRiderModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                <div className="glass" style={{ background: '#F8FAFC', width: '100%', maxWidth: '600px', borderRadius: '16px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h2 style={{ color: '#111827', margin: 0 }}>Add New Delivery Rider</h2>
                    <button onClick={() => setShowAddRiderModal(false)} style={{ background: 'none', border: 'none', color: '#111827', cursor: 'pointer' }}><X size={24} /></button>
                  </div>
                  
                  <form onSubmit={submitAddRider} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <select name="status" className="input-field" value={newRiderData.status} onChange={handleRiderInputChange} style={{ width: '200px' }}>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="PENDING_VERIFICATION">Pending Verification</option>
                        <option value="SUSPENDED">Suspended</option>
                      </select>
                    </div>

                    <h4 style={{ color: 'var(--accent)', margin: 0 }}>Personal Information</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <input type="text" name="name" placeholder="Full Name *" required className="input-field" value={newRiderData.name} onChange={handleRiderInputChange} />
                      <input type="tel" name="phone" placeholder="Mobile Number *" required className="input-field" value={newRiderData.phone} onChange={handleRiderInputChange} />
                      <input type="email" name="email" placeholder="Email Address" className="input-field" value={newRiderData.email} onChange={handleRiderInputChange} />
                      <input type="date" name="dob" className="input-field" value={newRiderData.dob} onChange={handleRiderInputChange} />
                      <select name="gender" className="input-field" value={newRiderData.gender} onChange={handleRiderInputChange}>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <h4 style={{ color: 'var(--accent)', margin: 0 }}>Address</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <input type="text" name="addressLine" placeholder="Address Line" className="input-field" value={newRiderData.addressLine} onChange={handleRiderInputChange} style={{ gridColumn: 'span 2' }} />
                      <input type="text" name="city" placeholder="City" className="input-field" value={newRiderData.city} onChange={handleRiderInputChange} />
                      <input type="text" name="state" placeholder="State" className="input-field" value={newRiderData.state} onChange={handleRiderInputChange} />
                      <input type="text" name="pincode" placeholder="Pincode" className="input-field" value={newRiderData.pincode} onChange={handleRiderInputChange} />
                    </div>

                    <h4 style={{ color: 'var(--accent)', margin: 0 }}>Login Credentials</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <input type="password" name="password" placeholder="Temporary Password *" required className="input-field" value={newRiderData.password} onChange={handleRiderInputChange} />
                    </div>

                    <h4 style={{ color: 'var(--accent)', margin: 0 }}>Vehicle Information</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <select name="vehicleType" className="input-field" value={newRiderData.vehicleType} onChange={handleRiderInputChange}>
                        <option value="Bike">Bike</option>
                        <option value="Scooter">Scooter</option>
                        <option value="Bicycle">Bicycle</option>
                      </select>
                      <input type="text" name="vehicleNumber" placeholder="Reg Number *" required className="input-field" value={newRiderData.vehicleNumber} onChange={handleRiderInputChange} />
                      <input type="text" name="vehicleBrand" placeholder="Vehicle Brand" className="input-field" value={newRiderData.vehicleBrand} onChange={handleRiderInputChange} />
                      <input type="text" name="vehicleModel" placeholder="Vehicle Model" className="input-field" value={newRiderData.vehicleModel} onChange={handleRiderInputChange} />
                    </div>

                    <h4 style={{ color: 'var(--accent)', margin: 0 }}>Identity & Documents</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <input type="text" name="licenseNumber" placeholder="DL Number *" required className="input-field" value={newRiderData.licenseNumber} onChange={handleRiderInputChange} />
                      <input type="date" name="dlExpiry" className="input-field" value={newRiderData.dlExpiry} onChange={handleRiderInputChange} />
                      <input type="text" name="aadhaarNumber" placeholder="Aadhaar Number" className="input-field" value={newRiderData.aadhaarNumber} onChange={handleRiderInputChange} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Driving License Front</label>
                        <input type="file" className="input-field" onChange={(e) => handleRiderFileUpload(e, 'dlFrontUrl')} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Aadhaar Card</label>
                        <input type="file" className="input-field" onChange={(e) => handleRiderFileUpload(e, 'aadhaarUrl')} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Vehicle RC</label>
                        <input type="file" className="input-field" onChange={(e) => handleRiderFileUpload(e, 'rcUrl')} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Insurance (Optional)</label>
                        <input type="file" className="input-field" onChange={(e) => handleRiderFileUpload(e, 'insuranceUrl')} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '16px', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setShowAddRiderModal(false)} className="btn" style={{ padding: '12px', background: 'transparent', border: '1px solid var(--border)' }}>Cancel</button>
                      <button type="submit" className="btn" style={{ padding: '12px' }}>Save Rider</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'map' && (
          <div>
            <header style={{ marginBottom: '32px' }}>
              <h2>Live Operations Dispatch Terminal</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Simulate real-time delivery rider tracking from Noida warehouse to the customer.</p>
            </header>

            <div className="glass" style={{ padding: '24px', borderRadius: '16px', display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px' }}>
              {/* Simulated Map Container */}
              <div
                style={{
                  height: '450px',
                  background: '#111827',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* Visual grid representing map roads */}
                <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: 'linear-gradient(#E5E7EB 1px, transparent 1px), linear-gradient(90deg, #E5E7EB 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                {/* Noida Warehouse Hub (Anchor) */}
                <div style={{ position: 'absolute', top: '80%', left: '85%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 10 }}>
                  <div style={{ background: '#2563EB', color: '#FFFFFF', padding: '6px', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 0 15px rgba(250, 204, 21, 0.4)' }}>
                    🏢
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginTop: '4px' }}>Noida Hub</span>
                </div>

                {/* Customer Location (Destination) */}
                <div style={{ position: 'absolute', top: '35%', left: '35%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 10 }}>
                  <div style={{ background: '#ef4444', color: '#111827', padding: '6px', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)' }}>
                    📍
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginTop: '4px' }}>Vivek (Home)</span>
                </div>

                {/* Live Moving Delivery Rider */}
                <div
                  style={{
                    position: 'absolute',
                    top: `${riderPosition.lat}%`,
                    left: `${riderPosition.lng}%`,
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    zIndex: 20,
                    transition: 'all 3s linear'
                  }}
                >
                  <div style={{ background: '#10b981', color: '#111827', padding: '6px', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '2px solid white', boxShadow: '0 0 15px rgba(16, 185, 129, 0.6)' }}>
                    🏍️
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#10b981', display: 'block', marginTop: '2px' }}>Rahul (Rider)</span>
                </div>

                {/* Map Details Overlay */}
                <div className="glass" style={{ position: 'absolute', bottom: '16px', left: '16px', padding: '12px 18px', borderRadius: '10px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Telemetry status: Broadcast Active (5s delay)</p>
                </div>
              </div>

              {/* Order Telemetry Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="glass" style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-secondary)' }}>
                  <h4 style={{ marginBottom: '12px' }}>Live Dispatch Info</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Tracking Order</span>
                      <strong style={{ color: 'var(--accent)' }}>ORD-89472</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Rider</span>
                      <span>Rahul Sharma</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                      <span style={{ color: 'var(--success)' }}>ON THE WAY</span>
                    </div>
                  </div>
                </div>

                <div className="glass" style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-secondary)', textAlign: 'center' }}>
                  <h4 style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '14px' }}>Estimated Time to Deliver</h4>
                  <p style={{ fontSize: '32px', fontWeight: '8px', color: 'var(--accent)' }}>{eta} mins</p>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Distance Remaining: {(eta * 0.35).toFixed(1)} km</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vendors' && (
          <div>
            <header style={{ marginBottom: '32px' }}>
              <h2>Vendor Management Console</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Add new suppliers to the ecosystem and manage authorized vendor accounts.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              {/* Form to Register or Edit Vendor */}
              <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                {editingVendor ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Edit Vendor Account</h3>
                      <button onClick={() => setEditingVendor(null)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Cancel Edit</button>
                    </div>

                    {editError && (
                      <div style={{ backgroundColor: '#7f1d1d', border: '1px solid #b91c1c', padding: '10px', borderRadius: '10px', color: '#fca5a5', fontSize: '13px', textAlign: 'center', marginBottom: '16px' }}>
                        {editError}
                      </div>
                    )}
                    {editSuccess && (
                      <div style={{ backgroundColor: '#064e3b', border: '1px solid #059669', padding: '10px', borderRadius: '10px', color: '#a7f3d0', fontSize: '13px', textAlign: 'center', marginBottom: '16px' }}>
                        {editSuccess}
                      </div>
                    )}

                    <form onSubmit={handleUpdateVendor} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Vendor Store / Owner Name</label>
                        <input type="text" value={editVendorName} onChange={e => setEditVendorName(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Vendor Phone Number</label>
                        <input type="text" value={editVendorPhone} onChange={e => setEditVendorPhone(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Vendor Email</label>
                        <input type="email" value={editVendorEmail} onChange={e => setEditVendorEmail(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>GST Number (Optional)</label>
                        <input type="text" value={editVendorGst} onChange={e => setEditVendorGst(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                        <input
                          type="checkbox"
                          id="editVendorActive"
                          checked={editVendorActive}
                          onChange={(e) => setEditVendorActive(e.target.checked)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        <label htmlFor="editVendorActive" style={{ fontSize: '14px', color: '#111827', cursor: 'pointer', fontWeight: 'bold' }}>
                          Account Active Status
                        </label>
                      </div>

                      <button type="submit" disabled={isUpdatingVendor} style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>
                        {isUpdatingVendor ? 'Saving...' : 'Save Changes'}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <h3 style={{ marginBottom: '20px' }}>Register New Vendor Store</h3>
                    
                    {vendorError && (
                      <div style={{ backgroundColor: '#7f1d1d', border: '1px solid #b91c1c', padding: '10px', borderRadius: '10px', color: '#fca5a5', fontSize: '13px', textAlign: 'center', marginBottom: '16px' }}>
                        {vendorError}
                      </div>
                    )}
                    {vendorSuccess && (
                      <div style={{ backgroundColor: '#064e3b', border: '1px solid #059669', padding: '10px', borderRadius: '10px', color: '#a7f3d0', fontSize: '13px', textAlign: 'center', marginBottom: '16px' }}>
                        {vendorSuccess}
                      </div>
                    )}

                    <form onSubmit={handleRegisterVendor} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Vendor Store / Owner Name</label>
                        <input type="text" placeholder="Rana Auto Parts Store" value={newVendorName} onChange={e => setNewVendorName(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Vendor Phone Number</label>
                        <input type="text" placeholder="+91 9988776655" value={newVendorPhone} onChange={e => setNewVendorPhone(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Vendor Email</label>
                        <input type="email" placeholder="vendor@domain.com" value={newVendorEmail} onChange={e => setNewVendorEmail(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Initial Password</label>
                        <input type="password" placeholder="••••••••" value={newVendorPassword} onChange={e => setNewVendorPassword(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>GST Number (Optional)</label>
                        <input type="text" placeholder="27AAAAA1111A1Z1" value={newVendorGst} onChange={e => setNewVendorGst(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>

                      <button type="submit" disabled={isRegisteringVendor} style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>
                        {isRegisteringVendor ? 'Registering...' : 'Add Vendor Account'}
                      </button>
                    </form>
                  </>
                )}
              </div>

              {/* Authorized Vendors List */}
              <div className="glass" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginBottom: '20px' }}>Active Ecosystem Vendors</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto' }}>
                  {vendors.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No vendors registered yet.</p>
                  ) : (
                    vendors.map((v) => (
                      <div key={v.id} style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#111827' }}>{v.name}</div>
                            {v.gstNo && <p style={{ fontSize: '13px', color: 'var(--accent)', marginTop: '2px', fontWeight: '500' }}>GST: {v.gstNo}</p>}
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Email: {v.email}</p>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Phone: {v.phone}</p>
                          </div>
                          <span
                            style={{
                              fontSize: '10px',
                              background: v.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: v.isActive ? 'var(--success)' : 'var(--danger)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontWeight: 'bold'
                            }}
                          >
                            {v.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                          <button
                            onClick={() => handleStartEditVendor(v)}
                            style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', color: '#111827', cursor: 'pointer', transition: '0.2s' }}
                          >
                            Edit Details
                          </button>
                          <button
                            onClick={() => handleToggleVendorStatus(v)}
                            style={{
                              background: 'transparent',
                              border: `1px solid ${v.isActive ? '#ef4444' : '#10b981'}`,
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: v.isActive ? '#ef4444' : '#10b981',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              transition: '0.2s'
                            }}
                          >
                            {v.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'brands' && (
          <div>
            <header style={{ marginBottom: '32px' }}>
              <h2>Brand Master</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Manage all automotive brands available for product registration.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
              {/* Form to Register or Edit Brand */}
              <div className="glass" style={{ padding: '24px', borderRadius: '16px', height: 'fit-content' }}>
                {editingBrandId ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Edit Brand Master</h3>
                      <button onClick={() => setEditingBrandId(null)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Cancel Edit</button>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleUpdateBrand(editingBrandId); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Brand Name</label>
                        <input type="text" value={editBrandName} onChange={e => setEditBrandName(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Brand Logo URL (Optional)</label>
                        <input type="text" placeholder="https://logo.clearbit.com/bosch.com" value={editBrandLogo} onChange={e => setEditBrandLogo(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Description</label>
                        <textarea value={editBrandDesc} onChange={e => setEditBrandDesc(e.target.value)} placeholder="Enter brand description..." style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px', minHeight: '80px', resize: 'vertical' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Website URL</label>
                        <input type="text" placeholder="https://www.brand.com" value={editBrandWebsite} onChange={e => setEditBrandWebsite(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                        <input
                          type="checkbox"
                          id="editBrandActive"
                          checked={editBrandActive}
                          onChange={(e) => setEditBrandActive(e.target.checked)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        <label htmlFor="editBrandActive" style={{ fontSize: '14px', color: '#111827', cursor: 'pointer', fontWeight: 'bold' }}>
                          Active Status
                        </label>
                      </div>

                      <button type="submit" style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>
                        Save Brand Details
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <h3 style={{ marginBottom: '20px' }}>Add Brand</h3>
                    <form onSubmit={handleCreateBrand} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Brand Name</label>
                        <input type="text" placeholder="Bosch" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Brand Logo URL (Optional)</label>
                        <input type="text" placeholder="https://logo.clearbit.com/bosch.com" value={newBrandLogo} onChange={e => setNewBrandLogo(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Description</label>
                        <textarea value={newBrandDesc} onChange={e => setNewBrandDesc(e.target.value)} placeholder="Enter brand description..." style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px', minHeight: '80px', resize: 'vertical' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Website URL</label>
                        <input type="text" placeholder="https://www.brand.com" value={newBrandWebsite} onChange={e => setNewBrandWebsite(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>

                      <button type="submit" style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>
                        Add Brand
                      </button>
                    </form>
                  </>
                )}
              </div>

              {/* Brands Directory & Search */}
              <div className="glass" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Brand Master Registry</h3>
                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                    <input
                      type="text"
                      placeholder="Search Brand"
                      value={brandSearchInput}
                      onChange={e => setBrandSearchInput(e.target.value)}
                      style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '8px 12px 8px 36px', borderRadius: '10px', color: '#111827', fontSize: '13px', width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        <th style={{ padding: '12px 8px' }}>Brand</th>
                        <th style={{ padding: '12px 8px' }}>Logo</th>
                        <th style={{ padding: '12px 8px' }}>Status</th>
                        <th style={{ padding: '12px 8px' }}>Products</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brands
                        .filter(b => b.name.toLowerCase().includes(brandSearchInput.toLowerCase()))
                        .map((b) => (
                          <tr key={b.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                            <td style={{ padding: '14px 8px', fontWeight: 'bold', color: '#111827' }}>
                              <div>{b.name}</div>
                              {b.website && <a href={b.website} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: 'var(--accent)', textDecoration: 'none' }}>{b.website}</a>}
                            </td>
                            <td style={{ padding: '14px 8px' }}>
                              {b.logoUrl ? (
                                <img src={b.logoUrl} alt={b.name} style={{ height: '24px', width: 'auto', borderRadius: '4px', objectFit: 'contain' }} onError={(e) => { (e.target as any).style.display = 'none'; }} />
                              ) : (
                                <span style={{ background: '#E5E7EB', color: '#111827', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', textTransform: 'uppercase' }}>{b.name.substring(0,2)}</span>
                              )}
                            </td>
                            <td style={{ padding: '14px 8px' }}>
                              <button
                                onClick={() => handleToggleBrandStatus(b)}
                                style={{
                                  background: b.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: b.isActive ? 'var(--success)' : 'var(--danger)',
                                  border: 'none',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                              >
                                {b.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td style={{ padding: '14px 8px', color: 'var(--text-secondary)' }}>
                              {b.productsCount || 0}
                            </td>
                            <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => {
                                    setEditingBrandId(b.id);
                                    setEditBrandName(b.name);
                                    setEditBrandLogo(b.logoUrl || '');
                                    setEditBrandDesc(b.description || '');
                                    setEditBrandWebsite(b.website || '');
                                    setEditBrandActive(b.isActive);
                                  }}
                                  style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', color: '#111827', cursor: 'pointer' }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteBrand(b.id)}
                                  disabled={b.productsCount > 0}
                                  style={{
                                    background: 'transparent',
                                    border: '1px solid var(--danger)',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    color: 'var(--danger)',
                                    cursor: b.productsCount > 0 ? 'not-allowed' : 'pointer',
                                    opacity: b.productsCount > 0 ? 0.5 : 1
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'categories' && (
          <div>
            <header style={{ marginBottom: '32px' }}>
              <h2>Category Master</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Manage automotive spare part categories, statuses, and cover images.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
              {/* Form to Register or Edit Category */}
              <div className="glass" style={{ padding: '24px', borderRadius: '16px', height: 'fit-content' }}>
                {editingCatId ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Edit Category</h3>
                      <button onClick={() => setEditingCatId(null)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Cancel Edit</button>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleUpdateCategory(editingCatId); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Category Name</label>
                        <input type="text" value={editCatName} onChange={e => setEditCatName(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Cover Image URL</label>
                        <input type="text" placeholder="https://images.unsplash.com/..." value={editCatImageUrl} onChange={e => setEditCatImageUrl(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Icon URL (Optional)</label>
                        <input type="text" placeholder="https://..." value={editCatIconUrl} onChange={e => setEditCatIconUrl(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                        <input
                          type="checkbox"
                          id="editCatActive"
                          checked={editCatActive}
                          onChange={(e) => setEditCatActive(e.target.checked)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        <label htmlFor="editCatActive" style={{ fontSize: '14px', color: '#111827', cursor: 'pointer', fontWeight: 'bold' }}>
                          Active Status
                        </label>
                      </div>

                      <button type="submit" style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>
                        Save Category
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <h3 style={{ marginBottom: '20px' }}>Add Category</h3>
                    <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Category Name</label>
                        <input type="text" placeholder="Engine parts" value={newCatName} onChange={e => setNewCatName(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Cover Image URL</label>
                        <input type="text" placeholder="https://images.unsplash.com/..." value={newCatImageUrl} onChange={e => setNewCatImageUrl(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Icon URL (Optional)</label>
                        <input type="text" placeholder="https://..." value={newCatIconUrl} onChange={e => setNewCatIconUrl(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>

                      <button type="submit" style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>
                        Add Category
                      </button>
                    </form>
                  </>
                )}
              </div>

              {/* Categories Directory */}
              <div className="glass" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>Ecosystem Categories</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        <th style={{ padding: '12px 8px' }}>Category</th>
                        <th style={{ padding: '12px 8px' }}>Cover Image</th>
                        <th style={{ padding: '12px 8px' }}>Status</th>
                        <th style={{ padding: '12px 8px' }}>Linked Products</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoriesList.map((cat) => (
                        <tr key={cat.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                          <td style={{ padding: '14px 8px', fontWeight: 'bold', color: '#111827' }}>
                            {cat.name}
                          </td>
                          <td style={{ padding: '14px 8px' }}>
                            {cat.imageUrl ? (
                              <img src={cat.imageUrl} alt={cat.name} style={{ height: '36px', width: '36px', borderRadius: '6px', objectFit: 'cover' }} onError={(e) => { (e.target as any).style.display = 'none'; }} />
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No image</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 8px' }}>
                            <button
                              onClick={() => handleToggleCategoryStatus(cat)}
                              style={{
                                background: cat.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: cat.isActive ? 'var(--success)' : 'var(--danger)',
                                border: 'none',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                            >
                              {cat.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td style={{ padding: '14px 8px', color: 'var(--text-secondary)' }}>
                            {cat._count?.products || 0}
                          </td>
                          <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                setEditingCatId(cat.id);
                                setEditCatName(cat.name);
                                setEditCatImageUrl(cat.imageUrl || '');
                                setEditCatIconUrl(cat.iconUrl || '');
                                setEditCatActive(cat.isActive);
                              }}
                              style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', color: '#111827', cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'banners' && (
          <div>
            <header style={{ marginBottom: '32px' }}>
              <h2>Promotional Banner Master</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Manage the Customer App home screen slider banners.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
              {/* Form to Register or Edit Banner */}
              <div className="glass" style={{ padding: '24px', borderRadius: '16px', height: 'fit-content' }}>
                {editingBannerId ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Edit Banner</h3>
                      <button onClick={() => setEditingBannerId(null)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Cancel Edit</button>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleUpdateBanner(editingBannerId); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Banner Header / Title</label>
                        <input type="text" value={editBannerTitle} onChange={e => setEditBannerTitle(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Tag Line / Subtitle</label>
                        <input type="text" placeholder="LIMITED DEALS" value={editBannerSubtitle} onChange={e => setEditBannerSubtitle(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Cover Image URL</label>
                        <input type="text" value={editBannerImageUrl} onChange={e => setEditBannerImageUrl(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Banner Action Navigation Type</label>
                        <select value={editBannerLinkType} onChange={e => setEditBannerLinkType(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827' }}>
                          <option value="none">None (Static Banner)</option>
                          <option value="category">CategoryProducts Screen</option>
                          <option value="product">ProductDetails Screen</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Navigation Target ID / Value</label>
                        <input type="text" placeholder="Category or Product UUID" value={editBannerLinkValue} onChange={e => setEditBannerLinkValue(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Display Order Index</label>
                        <input type="number" value={editBannerDisplayOrder} onChange={e => setEditBannerDisplayOrder(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                        <input
                          type="checkbox"
                          id="editBannerActive"
                          checked={editBannerActive}
                          onChange={(e) => setEditBannerActive(e.target.checked)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        <label htmlFor="editBannerActive" style={{ fontSize: '14px', color: '#111827', cursor: 'pointer', fontWeight: 'bold' }}>
                          Active Status
                        </label>
                      </div>

                      <button type="submit" style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>
                        Save Banner
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <h3 style={{ marginBottom: '20px' }}>Add Banner</h3>
                    <form onSubmit={handleCreateBanner} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Banner Header / Title</label>
                        <input type="text" placeholder="Limited Offers" value={newBannerTitle} onChange={e => setNewBannerTitle(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Tag Line / Subtitle</label>
                        <input type="text" placeholder="LIMITED DEALS" value={newBannerSubtitle} onChange={e => setNewBannerSubtitle(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Cover Image URL</label>
                        <input type="text" placeholder="https://images.unsplash.com/..." value={newBannerImageUrl} onChange={e => setNewBannerImageUrl(e.target.value)} required style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Banner Action Navigation Type</label>
                        <select value={newBannerLinkType} onChange={e => setNewBannerLinkType(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827' }}>
                          <option value="none">None (Static Banner)</option>
                          <option value="category">CategoryProducts Screen</option>
                          <option value="product">ProductDetails Screen</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Navigation Target ID / Value</label>
                        <input type="text" placeholder="Category or Product UUID" value={newBannerLinkValue} onChange={e => setNewBannerLinkValue(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: '#d1d5db' }}>Display Order Index</label>
                        <input type="number" placeholder="0" value={newBannerDisplayOrder} onChange={e => setNewBannerDisplayOrder(e.target.value)} style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: '10px', color: '#111827', fontSize: '14px' }} />
                      </div>

                      <button type="submit" style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>
                        Add Banner
                      </button>
                    </form>
                  </>
                )}
              </div>

              {/* Banners Registry */}
              <div className="glass" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>Ecosystem Banners</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        <th style={{ padding: '12px 8px' }}>Banner Info</th>
                        <th style={{ padding: '12px 8px' }}>Image</th>
                        <th style={{ padding: '12px 8px' }}>Status</th>
                        <th style={{ padding: '12px 8px' }}>Order</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bannersList.map((banner) => (
                        <tr key={banner.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                          <td style={{ padding: '14px 8px', color: '#111827' }}>
                            <div style={{ fontWeight: 'bold' }}>{banner.title}</div>
                            {banner.subtitle && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{banner.subtitle}</div>}
                            <div style={{ fontSize: '11px', color: 'var(--accent)' }}>Link: {banner.linkType} ({banner.linkValue || 'N/A'})</div>
                          </td>
                          <td style={{ padding: '14px 8px' }}>
                            <img src={banner.imageUrl} alt={banner.title} style={{ height: '48px', width: '80px', borderRadius: '6px', objectFit: 'cover' }} onError={(e) => { (e.target as any).style.display = 'none'; }} />
                          </td>
                          <td style={{ padding: '14px 8px' }}>
                            <button
                              onClick={() => handleToggleBannerStatus(banner)}
                              style={{
                                background: banner.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: banner.isActive ? 'var(--success)' : 'var(--danger)',
                                border: 'none',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                            >
                              {banner.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td style={{ padding: '14px 8px', color: 'var(--text-secondary)' }}>
                            {banner.displayOrder}
                          </td>
                          <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => {
                                  setEditingBannerId(banner.id);
                                  setEditBannerTitle(banner.title);
                                  setEditBannerSubtitle(banner.subtitle || '');
                                  setEditBannerImageUrl(banner.imageUrl);
                                  setEditBannerLinkType(banner.linkType);
                                  setEditBannerLinkValue(banner.linkValue || '');
                                  setEditBannerActive(banner.isActive);
                                  setEditBannerDisplayOrder(String(banner.displayOrder));
                                }}
                                style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', color: '#111827', cursor: 'pointer' }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteBanner(banner.id)}
                                style={{ background: 'transparent', border: '1px solid var(--danger)', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', color: 'var(--danger)', cursor: 'pointer' }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
