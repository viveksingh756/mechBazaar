import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Image, ActivityIndicator, Platform, Alert, NativeModules } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { RootState, addToCart } from '../store';
import { Product } from '../types';

const getApiUrl = () => {
  const scriptURL = NativeModules.SourceCode?.scriptURL || '';
  if (scriptURL) {
    const address = scriptURL.split('://')[1];
    const host = address ? address.split(':')[0] : null;
    if (host) return `http://${host}:5000/api`;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : `\${API_BASE_URL}`;
};

const API_URL = getApiUrl();

export default 
const BASE_URL = __DEV__ ? 'http://localhost:5000' : 'https://mech-bazaar-backend.vercel.app';
const API_BASE_URL = `${BASE_URL}/api`;

function SearchScreen({ onNavigate }: { onNavigate: (screen: any, params?: any) => void }) {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const activeVehicle = useSelector((state: RootState) => state.garage.activeVehicle);

  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (text: string) => {
    setSearchInput(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params: any = { search: text };

      // Optional: enforce vehicle compatibility scope during search
      if (activeVehicle) {
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

      const response = await axios.get(`${API_URL}/products`, { headers, params });
      if (response.data && response.data.success) {
        setResults(response.data.data || []);
      } else {
        setResults([]);
      }
    } catch (err: any) {
      console.warn('Search query error, using placeholder fallbacks:', err.message);
      // Sim fallback
      const searchMock = [
        {
          id: 'p1',
          name: 'Bosch Premium Brake Pads (Front)',
          sku: 'BOS-BP-FR-09',
          oemNumber: '04465-0K340',
          description: 'High performance brake pads for Toyota SUV stopping power.',
          price: 2450.0,
          mrp: 3200.0,
          discount: 23.4,
          brandId: 'b1',
          brand: { id: 'b1', name: 'Bosch' },
          categoryId: 'c1',
          category: { id: 'c1', name: 'Brake System', slug: 'brakes' },
          returnPolicy: '7 Days Return',
          deliveryTime: '12 mins',
          rating: 4.8,
          reviewCount: 42,
          images: [{ id: 'img1', imageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=500', displayOrder: 0, isPrimary: true }]
        }
      ];
      setResults(searchMock.filter(p => p.name.toLowerCase().includes(text.toLowerCase()) || p.sku.toLowerCase().includes(text.toLowerCase())));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('home')} style={styles.backBtn}>
          <Text style={{ color: '#FFFFFF', fontSize: 16 }}>◀ Back</Text>
        </TouchableOpacity>
        <TextInput
          placeholder="Search parts, brand, OEM number..."
          placeholderTextColor="#64748B"
          style={styles.input}
          value={searchInput}
          onChangeText={handleSearch}
          autoFocus
        />
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#facc15" />
        </View>
      ) : (
        <ScrollView style={styles.scroll}>
          <Text style={styles.resultsHeading}>
            {searchInput ? `Search results for "${searchInput}"` : 'Type to search genuine parts catalogue'}
          </Text>

          {results.length === 0 && searchInput ? (
            <View style={styles.emptyContainer}>
              <Text style={{ color: '#64748B', fontSize: 13 }}>No parts matching your description or vehicle compatibility found.</Text>
            </View>
          ) : (
            results.map((prod) => {
              const primaryImage = prod.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=500';
              return (
                <TouchableOpacity
                  key={prod.id}
                  style={styles.productCard}
                  onPress={() => onNavigate('product-details', { productId: prod.id })}
                >
                  <Image source={{ uri: primaryImage }} style={styles.productImg} />
                  <View style={styles.productMeta}>
                    <Text style={styles.skuBadge}>{prod.sku}</Text>
                    <Text style={styles.prodName}>{prod.name}</Text>
                    <Text style={{ color: '#64748B', fontSize: 11, marginTop: 4 }}>OEM: {prod.oemNumber || 'N/A'}</Text>
                    <Text style={styles.deliveryBadge}>⏱️ {prod.deliveryTime || '10 mins'}</Text>
                    
                    <View style={styles.priceRow}>
                      <View>
                        <Text style={styles.price}>₹{prod.price}</Text>
                        <Text style={styles.mrp}>₹{prod.mrp} ({prod.discount}% OFF)</Text>
                      </View>
                      <TouchableOpacity onPress={() => {
                        dispatch(addToCart(prod));
                        Alert.alert('Added', `${prod.name} added to cart!`);
                      }} style={styles.addBtn}>
                        <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 }}>+ Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backBtn: {
    marginRight: 12
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    color: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scroll: {
    padding: 16
  },
  resultsHeading: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 16
  },
  emptyContainer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center'
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  productImg: {
    width: 90,
    height: 90,
    borderRadius: 16
  },
  productMeta: {
    flex: 1,
    marginLeft: 12
  },
  skuBadge: {
    backgroundColor: '#E5E7EB',
    color: '#64748B',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start'
  },
  prodName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 6
  },
  deliveryBadge: {
    color: '#facc15',
    fontSize: 11,
    marginTop: 4
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10
  },
  price: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16
  },
  mrp: {
    color: '#64748B',
    fontSize: 10,
    textDecorationLine: 'line-through'
  },
  addBtn: {
    backgroundColor: '#facc15',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10
  }
});
