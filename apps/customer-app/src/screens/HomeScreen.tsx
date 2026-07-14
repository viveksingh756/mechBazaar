import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  NativeModules,
  Dimensions,
  Animated,
  FlatList,
  Modal,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { RootState, setVehicles, setActiveVehicle, addToCart } from '../store';
import { UserVehicle, Product, Category, Banner, HomeData } from '../types';


const BASE_URL = __DEV__ ? 'http://localhost:5000' : 'https://mech-bazaar-backend.vercel.app';
const API_BASE_URL = `${BASE_URL}/api`;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 180;
const CATEGORY_EMOJI_MAP: Record<string, string> = {
  'engine parts': '⚙️',
  'brake system': '🛑',
  'suspension': '🛞',
  'filters': '🔄',
  'lubricants': '🛢️',
  'batteries': '🔋',
  'electrical': '⚡',
  'lighting': '💡',
  'cooling system': '❄️',
  'steering': '🎯',
  'clutch': '⚙️',
  'transmission': '🔧',
  'wheels & tyres': '🛞',
  'accessories': '🧰',
  'oils & lubricants': '🛢️',
  'body parts': '🚗',
};

const getApiUrl = () => {
  if (!__DEV__) {
    return API_BASE_URL;
  }
  const scriptURL = NativeModules.SourceCode?.scriptURL || '';
  if (scriptURL) {
    const address = scriptURL.split('://')[1];
    const host = address ? address.split(':')[0] : null;
    if (host) return `http://${host}:5000/api`;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : `${API_BASE_URL}`;
};

const API_URL = getApiUrl();

// ──────────────────────────────────────────────
// PRODUCT CARD COMPONENT
// ──────────────────────────────────────────────



function ProductCard({ product, onPress, onAddToCart, style }: {
  product: Product;
  onPress: () => void;
  onAddToCart: () => void;
  style?: any;
}) {
  const primaryImage = product.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=400';
  const discountPercent = product.discount > 0 ? Math.round(product.discount) : (product.mrp > product.price ? Math.round((1 - product.price / product.mrp) * 100) : 0);

  return (
    <TouchableOpacity style={[styles.productCard, style]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.productImageContainer}>
        <Image source={{ uri: primaryImage }} style={styles.productCardImage} />
        {discountPercent > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>{discountPercent}% OFF</Text>
          </View>
        )}
        {product.deliveryTime && (
          <View style={styles.deliveryTimeBadge}>
            <Text style={styles.deliveryTimeBadgeText}>⏱ {product.deliveryTime}</Text>
          </View>
        )}
      </View>

      <View style={styles.productCardInfo}>
        {product.brand && (
          <View style={styles.brandRow}>
            {product.brand.logoUrl ? (
              <Image source={{ uri: product.brand.logoUrl }} style={styles.brandLogo} />
            ) : null}
            <Text style={styles.brandName} numberOfLines={1}>{product.brand.name}</Text>
          </View>
        )}
        <Text style={styles.productCardName} numberOfLines={2}>{product.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.sellingPrice}>₹{product.price.toLocaleString()}</Text>
          {product.mrp > product.price && (
            <Text style={styles.mrpPrice}>₹{product.mrp.toLocaleString()}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.addToCartBtn}
          onPress={(e) => { e.stopPropagation?.(); onAddToCart(); }}
          activeOpacity={0.7}
        >
          <Text style={styles.addToCartBtnText}>+ ADD</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ──────────────────────────────────────────────
// SECTION HEADER COMPONENT
// ──────────────────────────────────────────────
function SectionHeader({ icon, title, onSeeAll }: { icon: string; title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAllText}>See All ›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────
// MAIN HOME SCREEN
// ──────────────────────────────────────────────
export default function HomeScreen({ onNavigate }: { onNavigate: (screen: any, params?: any) => void }) {
  const dispatch = useDispatch();
  const activeVehicle = useSelector((state: RootState) => state.garage.activeVehicle);
  const garageVehicles = useSelector((state: RootState) => state.garage.vehicles);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const token = useSelector((state: RootState) => state.auth.token);

  const [isLoading, setIsLoading] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [flashDeals, setFlashDeals] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);

  // Banner auto-scroll
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);
  const bannerTimerRef = useRef<any>(null);

  const cartCount = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);

  // ── Data Fetching ──
  const fetchHomeData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (activeVehicle?.manufacturerId && activeVehicle?.modelId && activeVehicle?.modelYearId && activeVehicle?.variantId) {
        params.manufacturerId = activeVehicle.manufacturerId;
        params.modelId = activeVehicle.modelId;
        params.modelYearId = activeVehicle.modelYearId;
        params.variantId = activeVehicle.variantId;
      }

      const response = await axios.get(`${API_URL}/products/home`, { params });
      if (response.data?.success) {
        const data: HomeData = response.data.data;
        setBanners(data.banners || []);
        setCategories(data.categories || []);
        setFeaturedProducts(data.featuredProducts || []);
        setFlashDeals(data.flashDeals || []);
        setNewArrivals(data.newArrivals || []);
        setRecommendedProducts(data.recommendedProducts || []);
      }
    } catch (err: any) {
      console.warn('Home data fetch error:', err.message);
      // Fallback: fetch categories at minimum
      try {
        const catRes = await axios.get(`${API_URL}/products/categories`);
        if (catRes.data?.success) setCategories(catRes.data.data || []);
      } catch {}
    } finally {
      setIsLoading(false);
    }
  }, [activeVehicle]);

  const fetchGarage = useCallback(async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/garage/vehicles`, { headers });
      if (response.data?.success) {
        dispatch(setVehicles(response.data.data || []));
      }
    } catch (err: any) {
      console.warn('Garage fetch error:', err.message);
    }
  }, [token, dispatch]);

  useEffect(() => {
    fetchGarage();
  }, [fetchGarage]);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  // Banner auto-scroll timer
  useEffect(() => {
    if (banners.length <= 1) return;
    bannerTimerRef.current = setInterval(() => {
      setActiveBannerIndex((prev) => {
        const next = (prev + 1) % banners.length;
        bannerScrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(bannerTimerRef.current);
  }, [banners.length]);

  const handleBannerScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveBannerIndex(index);
  };

  const handleAddToCart = (product: Product) => {
    dispatch(addToCart(product));
    Alert.alert('Added!', `${product.name} added to cart`);
  };

  // ── RENDER ──
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Loading MechBazar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* ═══════ HEADER ═══════ */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.deliveryRow}>
              <Text style={styles.deliveryTitle}>Delivery in 10 mins</Text>
              <View style={styles.deliveryBadge}>
                <Text style={styles.deliveryBadgeText}>10 MINS</Text>
              </View>
            </View>
            <Text style={styles.locationText}>📍 Sector 62, Noida ▾</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => onNavigate('tracking')}>
              <Text style={styles.headerIcon}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => onNavigate('cart')}>
              <Text style={styles.headerIcon}>👤</Text>
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══════ SEARCH BAR ═══════ */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => onNavigate('search')}
          activeOpacity={0.8}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Search 'Continental Timing Belt'</Text>
        </TouchableOpacity>

        {/* ═══════ VEHICLE CARD ═══════ */}
        {activeVehicle ? (
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleCardGradient}>
              <View style={styles.vehicleCardHeader}>
                <Text style={styles.vehicleCardLabel}>🔧  YOUR GARAGE</Text>
              </View>
              <Text style={styles.vehicleCardTitle}>
                {activeVehicle.make} {activeVehicle.model} {activeVehicle.year}
              </Text>
              <Text style={styles.vehicleCardVariant}>{activeVehicle.variant}</Text>
              <View style={styles.vehicleCardActions}>
                <TouchableOpacity
                  style={styles.vehicleCardBtnOutline}
                  onPress={() => setShowVehiclePicker(true)}
                >
                  <Text style={styles.vehicleCardBtnOutlineText}>CHANGE VEHICLE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.vehicleCardBtnFilled}
                  onPress={() => onNavigate('search')}
                >
                  <Text style={styles.vehicleCardBtnFilledText}>BROWSE PARTS</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addVehicleCard}
            onPress={() => setShowVehiclePicker(true)}
          >
            <Text style={styles.addVehicleIcon}>🚗</Text>
            <View>
              <Text style={styles.addVehicleTitle}>Add Your Vehicle</Text>
              <Text style={styles.addVehicleSub}>Get compatible parts recommendations</Text>
            </View>
            <Text style={styles.addVehicleArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* ═══════ BANNER SLIDER ═══════ */}
        {banners.length > 0 && (
          <View style={styles.bannerSection}>
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleBannerScroll}
              scrollEventThrottle={16}
            >
              {banners.map((banner, idx) => (
                <TouchableOpacity
                  key={banner.id}
                  style={styles.bannerSlide}
                  activeOpacity={0.9}
                  onPress={() => {
                    if (banner.linkType === 'category' && banner.linkValue) {
                      onNavigate('category-products', { categoryId: banner.linkValue, categoryName: banner.title });
                    } else if (banner.linkType === 'product' && banner.linkValue) {
                      onNavigate('product-details', { productId: banner.linkValue });
                    }
                  }}
                >
                  <Image source={{ uri: banner.imageUrl }} style={styles.bannerImage} />
                  <View style={styles.bannerOverlay}>
                    {banner.subtitle && (
                      <View style={styles.bannerTagBadge}>
                        <Text style={styles.bannerTagText}>{banner.subtitle}</Text>
                      </View>
                    )}
                    <Text style={styles.bannerTitle}>{banner.title}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {/* Banner dots */}
            {banners.length > 1 && (
              <View style={styles.bannerDots}>
                {banners.map((_, idx) => (
                  <View
                    key={idx}
                    style={[styles.bannerDot, activeBannerIndex === idx && styles.bannerDotActive]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ═══════ CATEGORIES ═══════ */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <SectionHeader icon="📦" title="Featured Categories" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map((cat) => {
                const emoji = CATEGORY_EMOJI_MAP[cat.name.toLowerCase()] || '🔩';
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.categoryCard}
                    onPress={() => onNavigate('category-products', { categoryId: cat.id, categoryName: cat.name })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryIconContainer}>
                      {cat.imageUrl ? (
                        <Image source={{ uri: cat.imageUrl }} style={styles.categoryImage} />
                      ) : (
                        <Text style={styles.categoryEmoji}>{emoji}</Text>
                      )}
                    </View>
                    <Text style={styles.categoryName} numberOfLines={1}>{cat.name}</Text>
                    {cat._count && cat._count.products > 0 && (
                      <Text style={styles.categoryCount}>{cat._count.products} items</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ═══════ FLASH DEALS ═══════ */}
        {flashDeals.length > 0 && (
          <View style={styles.section}>
            <SectionHeader icon="⚡" title="Flash Deals" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productScroll}>
              {flashDeals.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  style={styles.horizontalProductCard}
                  onPress={() => onNavigate('product-details', { productId: product.id })}
                  onAddToCart={() => handleAddToCart(product)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ═══════ FEATURED PRODUCTS ═══════ */}
        {featuredProducts.length > 0 && (
          <View style={styles.section}>
            <SectionHeader icon="⭐" title="Featured Products" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productScroll}>
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  style={styles.horizontalProductCard}
                  onPress={() => onNavigate('product-details', { productId: product.id })}
                  onAddToCart={() => handleAddToCart(product)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ═══════ RECOMMENDED FOR YOUR VEHICLE ═══════ */}
        {recommendedProducts.length > 0 && activeVehicle && (
          <View style={styles.section}>
            <SectionHeader
              icon="🚗"
              title={`For Your ${activeVehicle.make} ${activeVehicle.model}`}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productScroll}>
              {recommendedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  style={styles.horizontalProductCard}
                  onPress={() => onNavigate('product-details', { productId: product.id })}
                  onAddToCart={() => handleAddToCart(product)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ═══════ NEW ARRIVALS ═══════ */}
        {newArrivals.length > 0 && (
          <View style={styles.section}>
            <SectionHeader icon="🆕" title="New Arrivals" />
            <View style={styles.productGrid}>
              {newArrivals.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  style={styles.gridProductCard}
                  onPress={() => onNavigate('product-details', { productId: product.id })}
                  onAddToCart={() => handleAddToCart(product)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Empty state if no products */}
        {featuredProducts.length === 0 && flashDeals.length === 0 && newArrivals.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📦</Text>
            <Text style={styles.emptyStateTitle}>No products catalogued yet</Text>
            <Text style={styles.emptyStateSub}>Vendors are adding parts. Check back soon!</Text>
          </View>
        )}

        {/* Bottom spacer */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ═══════ VEHICLE PICKER MODAL ═══════ */}
      <Modal visible={showVehiclePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🚗 My Garage</Text>
              <TouchableOpacity onPress={() => setShowVehiclePicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {garageVehicles.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: '#64748B', fontSize: 14 }}>No vehicles registered yet.</Text>
                <Text style={{ color: '#64748B', fontSize: 12, marginTop: 8 }}>Add a vehicle from the Garage tab.</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {garageVehicles.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.vehiclePickerItem, activeVehicle?.id === v.id && styles.vehiclePickerItemActive]}
                    onPress={() => {
                      dispatch(setActiveVehicle(v));
                      setShowVehiclePicker(false);
                    }}
                  >
                    <View>
                      <Text style={styles.vehiclePickerName}>{v.make} {v.model}</Text>
                      <Text style={styles.vehiclePickerDetails}>{v.year} · {v.variant}</Text>
                    </View>
                    {activeVehicle?.id === v.id && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>ACTIVE</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ──────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 12,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#facc15',
  },
  headerLeft: {
    flex: 1,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  deliveryBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deliveryBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  locationText: {
    color: '#F8FAFC',
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 18,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  // ── Search Bar ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchPlaceholder: {
    color: '#64748B',
    fontSize: 14,
  },

  // ── Vehicle Card ──
  vehicleCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  vehicleCardGradient: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  vehicleCardHeader: {
    marginBottom: 8,
  },
  vehicleCardLabel: {
    color: '#facc15',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  vehicleCardTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  vehicleCardVariant: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 2,
  },
  vehicleCardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  vehicleCardBtnOutline: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  vehicleCardBtnOutlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  vehicleCardBtnFilled: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  vehicleCardBtnFilledText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  addVehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addVehicleIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  addVehicleTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  addVehicleSub: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  addVehicleArrow: {
    color: '#facc15',
    fontSize: 28,
    fontWeight: '300',
    marginLeft: 'auto',
  },

  // ── Banner Slider ──
  bannerSection: {
    marginBottom: 20,
  },
  bannerSlide: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    paddingHorizontal: 16,
  },
  bannerImage: {
    width: SCREEN_WIDTH - 32,
    height: BANNER_HEIGHT,
    borderRadius: 16,
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bannerTagBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  bannerTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  bannerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  bannerDotActive: {
    backgroundColor: '#facc15',
    width: 20,
    borderRadius: 4,
  },

  // ── Section Layout ──
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  seeAllText: {
    color: '#facc15',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Category Cards ──
  categoryScroll: {
    paddingLeft: 16,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 76,
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    overflow: 'hidden',
  },
  categoryImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  categoryEmoji: {
    fontSize: 28,
  },
  categoryName: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryCount: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 2,
  },

  // ── Product Cards ──
  productScroll: {
    paddingLeft: 16,
  },
  horizontalProductCard: {
    width: 165,
    marginRight: 12,
  },
  productCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  productImageContainer: {
    position: 'relative',
  },
  productCardImage: {
    width: '100%',
    height: 130,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: '#F8FAFC',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#22C55E',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  deliveryTimeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  deliveryTimeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  productCardInfo: {
    padding: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  brandLogo: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  brandName: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productCardName: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sellingPrice: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  mrpPrice: {
    color: '#64748B',
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  addToCartBtn: {
    backgroundColor: '#facc15',
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
  },
  addToCartBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Product Grid (for New Arrivals) ──
  productGrid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridProductCard: {
    width: (SCREEN_WIDTH - 44) / 2,
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyStateSub: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 6,
  },

  // ── Vehicle Picker Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  modalClose: {
    color: '#64748B',
    fontSize: 20,
    fontWeight: '300',
  },
  vehiclePickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  vehiclePickerItemActive: {
    borderColor: '#facc15',
    backgroundColor: '#F5F5F5',
  },
  vehiclePickerName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  vehiclePickerDetails: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: '#facc15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
