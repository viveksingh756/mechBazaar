import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator, Platform, Alert, NativeModules } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { RootState, addToCart } from '../store';
import { Product, Brand } from '../types';

const getApiUrl = () => {
  const scriptURL = NativeModules.SourceCode?.scriptURL || '';
  if (scriptURL) {
    const address = scriptURL.split('://')[1];
    const host = address ? address.split(':')[0] : null;
    if (host) return `http://${host}:5000/api`;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : `${API_BASE_URL}`;
};

const API_URL = getApiUrl();

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'discount';

export default 
const BASE_URL = __DEV__ ? 'http://localhost:5000' : 'https://mech-bazaar-backend.vercel.app';
const API_BASE_URL = `${BASE_URL}/api`;

function CategoryProductsScreen({
  categoryId,
  categoryName,
  onNavigate
}: {
  categoryId: string;
  categoryName: string;
  onNavigate: (screen: string, params?: any) => void;
}) {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const activeVehicle = useSelector((state: RootState) => state.garage.activeVehicle);
  const cartCount = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);

  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [loading, setLoading] = useState(true);
  const [showCompatibleOnly, setShowCompatibleOnly] = useState(true);

  useEffect(() => {
    fetchProductsAndBrands();
  }, [categoryId, showCompatibleOnly, activeVehicle]);

  useEffect(() => {
    applyFilterAndSort();
  }, [rawProducts, selectedBrandId, searchQuery, sortBy]);

  const fetchProductsAndBrands = async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const params: any = { categoryId };
      if (showCompatibleOnly && activeVehicle) {
        if (activeVehicle.manufacturerId && activeVehicle.modelId && activeVehicle.modelYearId && activeVehicle.variantId) {
          params.manufacturerId = activeVehicle.manufacturerId;
          params.modelId = activeVehicle.modelId;
          params.modelYearId = activeVehicle.modelYearId;
          params.variantId = activeVehicle.variantId;
        } else {
          params.make = activeVehicle.make;
          params.model = activeVehicle.model;
          params.variant = activeVehicle.variant;
          params.fuelType = activeVehicle.fuelType;
          params.year = activeVehicle.year;
        }
      }

      // Fetch category specific products
      const prodRes = await axios.get(`${API_URL}/products`, { headers, params });
      if (prodRes.data && prodRes.data.success) {
        setRawProducts(prodRes.data.data || []);
      }

      // Fetch master brands to populate filter bar
      const brandRes = await axios.get(`${API_URL}/products/brands`, { headers });
      if (brandRes.data && brandRes.data.success) {
        setBrands(brandRes.data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching category catalog:', err);
      Alert.alert('Error', 'Could not load products for this category.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilterAndSort = () => {
    let result = [...rawProducts];

    // 1. Search Query Filter
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          (p.brand?.name && p.brand.name.toLowerCase().includes(query))
      );
    }

    // 2. Brand Filter
    if (selectedBrandId) {
      result = result.filter((p) => p.brandId === selectedBrandId);
    }

    // 3. Sorting
    if (sortBy === 'newest') {
      // By default backend returns desc order, so leave it or sort by ID/created
    } else if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'discount') {
      result.sort((a, b) => b.discount - a.discount);
    }

    setFilteredProducts(result);
  };

  const handleAddToCart = (product: Product) => {
    dispatch(addToCart(product));
    Alert.alert('Added', `${product.name} has been added to your cart.`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => onNavigate('home')}>
          <Text style={styles.headerBackText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{categoryName}</Text>
        <TouchableOpacity style={styles.headerCartBtn} onPress={() => onNavigate('cart')}>
          <Text style={styles.headerCartText}>🛒 {cartCount}</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search products in this category..."
          placeholderTextColor="#64748B"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Compatibility Filter Banner */}
      {activeVehicle && (
        <View style={styles.compatibilityBanner}>
          <View style={styles.compatibilityInfo}>
            <Text style={styles.compatibilityTitle}>🚗 MY GARAGE FILTER</Text>
            <Text style={styles.compatibilityText} numberOfLines={1}>
              Parts fit for <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{activeVehicle.make} {activeVehicle.model}</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.compatibilityToggle, showCompatibleOnly && styles.compatibilityToggleActive]}
            onPress={() => setShowCompatibleOnly(!showCompatibleOnly)}
          >
            <Text style={[styles.compatibilityToggleText, showCompatibleOnly && styles.compatibilityToggleTextActive]}>
              {showCompatibleOnly ? 'Show All' : 'Show Compatible Only'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Brands Filter Scroll */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandFilterScroll}>
          <TouchableOpacity
            style={[styles.brandPill, !selectedBrandId && styles.brandPillActive]}
            onPress={() => setSelectedBrandId(null)}
          >
            <Text style={[styles.brandPillText, !selectedBrandId && styles.brandPillTextActive]}>
              All Brands
            </Text>
          </TouchableOpacity>
          {brands.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={[styles.brandPill, selectedBrandId === b.id && styles.brandPillActive]}
              onPress={() => setSelectedBrandId(b.id)}
            >
              <Text style={[styles.brandPillText, selectedBrandId === b.id && styles.brandPillTextActive]}>
                {b.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sorting Tabs */}
      <View style={styles.sortContainer}>
        {([
          { id: 'newest', label: '🆕 Newest' },
          { id: 'price-asc', label: '📈 Price: Low' },
          { id: 'price-desc', label: '📉 Price: High' },
          { id: 'discount', label: '🏷️ Best Off' }
        ] as { id: SortOption; label: string }[]).map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.sortTab, sortBy === opt.id && styles.sortTabActive]}
            onPress={() => setSortBy(opt.id)}
          >
            <Text style={[styles.sortTabText, sortBy === opt.id && styles.sortTabTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#facc15" />
          <Text style={styles.loadingText}>Loading category catalog...</Text>
        </View>
      ) : (
        <ScrollView style={styles.productsScroll} contentContainerStyle={styles.productsScrollContent}>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No spare parts match your query.</Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {filteredProducts.map((prod) => {
                const primaryImage = prod.images?.find(img => img.isPrimary)?.imageUrl || 
                                     prod.images?.[0]?.imageUrl || 
                                     'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=500';
                return (
                  <TouchableOpacity
                    key={prod.id}
                    style={styles.productCard}
                    onPress={() => onNavigate('product-details', { productId: prod.id })}
                  >
                    <Image source={{ uri: primaryImage }} style={styles.productImage} />
                    {prod.discount > 0 && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{prod.discount}% OFF</Text>
                      </View>
                    )}
                    <View style={styles.productDetails}>
                      <Text style={styles.productBrand} numberOfLines={1}>{prod.brand?.name}</Text>
                      <Text style={styles.productName} numberOfLines={2}>{prod.name}</Text>
                      <View style={styles.priceRow}>
                        <View>
                          <Text style={styles.productPrice}>₹{prod.price.toLocaleString()}</Text>
                          {prod.mrp > prod.price && (
                            <Text style={styles.productMrp}>₹{prod.mrp.toLocaleString()}</Text>
                          )}
                        </View>
                        <TouchableOpacity style={styles.addCartBtn} onPress={() => handleAddToCart(prod)}>
                          <Text style={styles.addCartBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#64748B',
    marginTop: 10,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  headerBackBtn: {
    paddingVertical: 5,
  },
  headerBackText: {
    color: '#64748B',
    fontSize: 14,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    maxWidth: '60%',
  },
  headerCartBtn: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerCartText: {
    color: '#facc15',
    fontWeight: 'bold',
    fontSize: 12,
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    color: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  brandFilterScroll: {
    paddingHorizontal: 15,
  },
  brandPill: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  brandPillActive: {
    backgroundColor: '#facc15',
  },
  brandPillText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  brandPillTextActive: {
    color: '#FFFFFF',
  },
  sortContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  sortTab: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  sortTabActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  sortTabText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sortTabTextActive: {
    color: '#facc15',
  },
  productsScroll: {
    flex: 1,
  },
  productsScrollContent: {
    padding: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#FFFFFF',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#facc15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  productDetails: {
    padding: 10,
  },
  productBrand: {
    color: '#facc15',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  productName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    height: 36,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  productPrice: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productMrp: {
    color: '#64748B',
    fontSize: 10,
    textDecorationLine: 'line-through',
  },
  addCartBtn: {
    backgroundColor: '#facc15',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCartBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  compatibilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compatibilityInfo: {
    flex: 1,
    marginRight: 10,
  },
  compatibilityTitle: {
    color: '#facc15',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compatibilityText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  compatibilityToggle: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  compatibilityToggleActive: {
    backgroundColor: '#facc15',
  },
  compatibilityToggleText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: 'bold',
  },
  compatibilityToggleTextActive: {
    color: '#FFFFFF',
  },
});
