import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState, logout } from './store';
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import CartCheckoutScreen from './screens/CartCheckoutScreen';
import TrackingScreen from './screens/TrackingScreen';
import LoginScreen from './screens/LoginScreen';

import ProductDetailsScreen from './screens/ProductDetailsScreen';
import CategoryProductsScreen from './screens/CategoryProductsScreen';

type Screen = 'home' | 'search' | 'cart' | 'tracking' | 'product-details' | 'category-products';

function AppContent() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  const handleNavigate = (screen: string, params?: any) => {
    if (screen === 'product-details' && params?.productId) {
      setSelectedProductId(params.productId);
    } else if (screen === 'category-products' && params?.categoryId) {
      setSelectedCategoryId(params.categoryId);
      setSelectedCategoryName(params.categoryName || 'Category');
    }
    setCurrentScreen(screen as Screen);
  };

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => handleNavigate('home')} />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home': return <HomeScreen onNavigate={handleNavigate} />;
      case 'search': return <SearchScreen onNavigate={handleNavigate} />;
      case 'cart': return <CartCheckoutScreen onNavigate={handleNavigate} />;
      case 'tracking': return <TrackingScreen onNavigate={handleNavigate} />;
      case 'product-details': 
        return <ProductDetailsScreen productId={selectedProductId!} onNavigate={handleNavigate} />;
      case 'category-products': 
        return <CategoryProductsScreen categoryId={selectedCategoryId!} categoryName={selectedCategoryName!} onNavigate={handleNavigate} />;
      default: return <HomeScreen onNavigate={handleNavigate} />;
    }
  };

  const cartCount = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);

  const navTabs: { id: Screen | 'logout'; icon: string; label: string }[] = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'search', icon: '📋', label: 'Categories' },
    { id: 'tracking', icon: '✅', label: 'Orders' },
    { id: 'cart', icon: '🛒', label: 'My Cart' },
    { id: 'logout', icon: '🚪', label: 'Log Out' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <SafeAreaView style={{ flex: 1 }}>
        {renderScreen()}
        {/* Bottom Navigation */}
        <View style={styles.navBar}>
          {navTabs.map((tab) => {
            if (tab.id === 'logout') {
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={styles.navItem}
                  onPress={() => dispatch(logout())}
                >
                  <Text style={styles.navIcon}>{tab.icon}</Text>
                  <Text style={styles.navLabel}>{tab.label}</Text>
                </TouchableOpacity>
              );
            }

            const isActive = currentScreen === tab.id;
            const isCart = tab.id === 'cart';

            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => handleNavigate(tab.id)}
              >
                <View style={{ position: 'relative' }}>
                  <Text style={styles.navIcon}>{tab.icon}</Text>
                  {isCart && cartCount > 0 && (
                    <View style={styles.navCartBadge}>
                      <Text style={styles.navCartBadgeText}>{cartCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Provider store={store}>
        <AppContent />
      </Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#facc15',
  },
  navIcon: {
    fontSize: 20,
  },
  navLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#facc15',
    fontWeight: '700',
  },
  navCartBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navCartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
