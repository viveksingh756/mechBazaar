import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Platform, Alert, NativeModules, Dimensions } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { RootState, addToCart } from '../store';
import { Product, ProductImage, ProductSpecification } from '../types';

const { width } = Dimensions.get('window');

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

interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  mrp: number;
  discount: number;
  brand?: { name: string };
  images?: ProductImage[];
}

export default 
const BASE_URL = __DEV__ ? 'http://localhost:5000' : 'https://mech-bazaar-backend.vercel.app';
const API_BASE_URL = `${BASE_URL}/api`;

function ProductDetailsScreen({
  productId,
  onNavigate
}: {
  productId: string;
  onNavigate: (screen: any, params?: any) => void;
}) {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartCount = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_URL}/products/${productId}`, { headers });
      if (response.data && response.data.success) {
        const data = response.data.data;
        setProduct(data);
        setRelatedProducts(data.relatedProducts || []);
      } else {
        Alert.alert('Error', 'Failed to retrieve product details.');
      }
    } catch (err: any) {
      console.error('Error fetching product details:', err);
      Alert.alert('Error', 'Could not load product details.');
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (event: any) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slide !== activeImageIndex) {
      setActiveImageIndex(slide);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    dispatch(addToCart(product));
    Alert.alert(
      'Added to Cart',
      `${product.name} has been added to your shopping cart.`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => onNavigate('cart') }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Fetching complete product details...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Product not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('home')}>
          <Text style={styles.backBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const primaryImage = product.images?.find(img => img.isPrimary)?.imageUrl || 
                       product.images?.[0]?.imageUrl || 
                       'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=500';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => onNavigate('home')}>
          <Text style={styles.headerBackText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Product Details</Text>
        <TouchableOpacity style={styles.headerCartBtn} onPress={() => onNavigate('cart')}>
          <Text style={styles.headerCartText}>🛒 {cartCount}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.imageCarousel}
          >
            {product.images && product.images.length > 0 ? (
              product.images.map((img) => (
                <Image
                  key={img.id}
                  source={{ uri: img.imageUrl }}
                  style={styles.carouselImage}
                  resizeMode="cover"
                />
              ))
            ) : (
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=500' }}
                style={styles.carouselImage}
                resizeMode="cover"
              />
            )}
          </ScrollView>

          {/* Dots Indicator */}
          {product.images && product.images.length > 1 && (
            <View style={styles.dotsContainer}>
              {product.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    activeImageIndex === index ? styles.activeDot : styles.inactiveDot
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Product Brand & Title */}
        <View style={styles.detailsCard}>
          {product.brand && (
            <View style={styles.brandRow}>
              {product.brand.logoUrl ? (
                <Image source={{ uri: product.brand.logoUrl }} style={styles.brandLogo} />
              ) : null}
              <Text style={styles.brandName}>{product.brand.name}</Text>
              <Text style={styles.categoryBadge}>{product.category?.name || 'Automotive'}</Text>
            </View>
          )}

          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.skuText}>SKU: {product.sku}</Text>

          {/* Price details */}
          <View style={styles.priceRow}>
            <View>
              <View style={styles.sellingPriceRow}>
                <Text style={styles.sellingPrice}>₹{product.price.toLocaleString()}</Text>
                {product.discount > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{product.discount}% OFF</Text>
                  </View>
                )}
              </View>
              {product.mrp > product.price && (
                <Text style={styles.mrpText}>MRP: ₹{product.mrp.toLocaleString()}</Text>
              )}
            </View>

            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>IN STOCK</Text>
            </View>
          </View>
        </View>

        {/* OEM Numbers */}
        {product.oemNumbers && product.oemNumbers.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>OEM Numbers</Text>
            <View style={styles.oemGrid}>
              {product.oemNumbers.map((oem) => (
                <View key={oem.id} style={styles.oemBadge}>
                  <Text style={styles.oemText}>{oem.oemNumber}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Specifications */}
        {product.specifications && product.specifications.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            <View style={styles.specsTable}>
              {product.specifications.map((spec) => (
                <View key={spec.id} style={styles.specsRow}>
                  <Text style={styles.specsKey}>{spec.specificationKey}</Text>
                  <Text style={styles.specsValue}>{spec.specificationValue}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Description */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Product Description</Text>
          <Text style={styles.descriptionText}>{product.description}</Text>

          <View style={styles.metaInfoRow}>
            <View style={styles.metaInfoCell}>
              <Text style={styles.metaInfoLabel}>Delivery</Text>
              <Text style={styles.metaInfoValue}>{product.deliveryTime || '15 mins'}</Text>
            </View>
            <View style={styles.metaInfoCell}>
              <Text style={styles.metaInfoLabel}>Return Policy</Text>
              <Text style={styles.metaInfoValue}>{product.returnPolicy || '7 Days Return'}</Text>
            </View>
            <View style={styles.metaInfoCell}>
              <Text style={styles.metaInfoLabel}>Warranty</Text>
              <Text style={styles.metaInfoValue}>1 Year Official</Text>
            </View>
          </View>
        </View>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <View style={styles.relatedCard}>
            <Text style={styles.sectionTitle}>Related Spare Parts</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relatedScroll}>
              {relatedProducts.map((item) => {
                const imgUrl = item.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=500';
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.relatedProductItem}
                    onPress={() => {
                      // Navigate to details page for the related product
                      onNavigate('product-details', { productId: item.id });
                    }}
                  >
                    <Image source={{ uri: imgUrl }} style={styles.relatedImage} />
                    <View style={styles.relatedDetails}>
                      <Text style={styles.relatedBrand} numberOfLines={1}>
                        {item.brand?.name || 'Spare Parts'}
                      </Text>
                      <Text style={styles.relatedName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.relatedPrice}>₹{item.price.toLocaleString()}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Floating Add to Cart Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.addToCartBtn} onPress={handleAddToCart}>
          <Text style={styles.addToCartBtnText}>Add To Cart</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#64748B',
    marginTop: 10,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: '#facc15',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  carouselContainer: {
    height: 250,
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  imageCarousel: {
    width: width,
    height: 250,
  },
  carouselImage: {
    width: width,
    height: 250,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#facc15',
    width: 12,
  },
  inactiveDot: {
    backgroundColor: '#E5E7EB',
  },
  detailsCard: {
    backgroundColor: '#F8FAFC',
    padding: 15,
    marginBottom: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
    backgroundColor: '#FFFFFF',
  },
  brandName: {
    color: '#64748B',
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 10,
  },
  categoryBadge: {
    backgroundColor: '#F8FAFC',
    color: '#facc15',
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  productName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  skuText: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 15,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 15,
  },
  sellingPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellingPrice: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginRight: 10,
  },
  mrpText: {
    color: '#64748B',
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  discountBadge: {
    backgroundColor: '#facc15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stockBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sectionCard: {
    backgroundColor: '#F8FAFC',
    padding: 15,
    marginVertical: 5,
    borderRadius: 16,
    marginHorizontal: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#facc15',
    paddingLeft: 8,
  },
  oemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  oemBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  oemText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  specsTable: {
    borderWidth: 1,
    borderColor: '#F8FAFC',
    borderRadius: 10,
    overflow: 'hidden',
  },
  specsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  specsKey: {
    color: '#64748B',
    flex: 1,
    fontSize: 12,
  },
  specsValue: {
    color: '#FFFFFF',
    flex: 2,
    fontSize: 12,
    fontWeight: 'bold',
  },
  descriptionText: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 15,
  },
  metaInfoRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 12,
  },
  metaInfoCell: {
    flex: 1,
    alignItems: 'center',
  },
  metaInfoLabel: {
    color: '#64748B',
    fontSize: 10,
    marginBottom: 2,
  },
  metaInfoValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  relatedCard: {
    backgroundColor: '#F8FAFC',
    padding: 15,
    marginVertical: 5,
    borderRadius: 16,
    marginHorizontal: 10,
  },
  relatedScroll: {
    flexDirection: 'row',
  },
  relatedProductItem: {
    width: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginRight: 10,
    overflow: 'hidden',
  },
  relatedImage: {
    width: 140,
    height: 100,
    backgroundColor: '#FFFFFF',
  },
  relatedDetails: {
    padding: 8,
  },
  relatedBrand: {
    color: '#facc15',
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  relatedName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    height: 32,
  },
  relatedPrice: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  addToCartBtn: {
    backgroundColor: '#facc15',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  addToCartBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
