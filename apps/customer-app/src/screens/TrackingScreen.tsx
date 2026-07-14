import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Platform, Alert, NativeModules, StatusBar } from 'react-native';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import { RootState } from '../store';

const getHostAddress = () => {
  const scriptURL = NativeModules.SourceCode?.scriptURL || '';
  if (scriptURL) {
    const address = scriptURL.split('://')[1];
    const host = address ? address.split(':')[0] : null;
    if (host) return host;
  }
  return null;
};

const host = getHostAddress();
const API_URL = host ? `http://${host}:5000/api` : (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api');
const WS_URL = host ? `http://${host}:5000` : (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000');

const STATUS_MAPPING: { [key: string]: number } = {
  'PENDING': 0,
  'CONFIRMED': 1,
  'PACKED': 2,
  'ASSIGNED': 3,
  'PICKED_UP': 4,
  'ON_THE_WAY': 5,
  'DELIVERED': 6
};

const statuses = [
  { label: 'Order Placed', sub: 'Awaiting hub confirmation' },
  { label: 'Confirmed', sub: 'Hub accepted spare part order' },
  { label: 'Packed & Ready', sub: 'Preparing package at Noida Hub' },
  { label: 'Rider Assigned', sub: 'Rider is picking up' },
  { label: 'Picked Up', sub: 'Rider received the spare parts' },
  { label: 'On The Way', sub: 'Rider is enroute to your location' },
  { label: 'Delivered', sub: 'Handed over successfully' }
];

export default function TrackingScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const token = useSelector((state: RootState) => state.auth.token);
  
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const [riderLatLng, setRiderLatLng] = useState({ x: 180, y: 150, lat: 28.6276, lng: 77.3784 });
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Noida Hub: 28.6276, 77.3784 (X: 180, Y: 150)
  // Customer Home: 28.6200, 77.3600 (X: 80, Y: 60)
  const convertLatToX = (lat: number) => {
    const minLat = 28.6200;
    const maxLat = 28.6276;
    const ratio = (lat - minLat) / (maxLat - minLat);
    return Math.max(80, Math.min(180, 80 + ratio * 100));
  };

  const convertLngToY = (lng: number) => {
    const minLng = 77.3600;
    const maxLng = 77.3784;
    const ratio = (lng - minLng) / (maxLng - minLng);
    return Math.max(60, Math.min(150, 60 + ratio * 90));
  };

  // Fetch customer latest order
  const fetchLatestOrder = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/orders/my-orders`, { headers });
      const orderList = response.data && response.data.success ? response.data.data : (Array.isArray(response.data) ? response.data : []);
      
      if (orderList && orderList.length > 0) {
        const latest = orderList[0]; // first item is newest
        setActiveOrder(latest);
        setStatusIndex(STATUS_MAPPING[latest.status] ?? 0);
      }
    } catch (err: any) {
      console.warn('Failed to load tracking order details:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestOrder();
  }, [token]);

  // Connect WebSockets for Real-Time Coordinates & Order Status
  useEffect(() => {
    if (!activeOrder || !token) return;

    const socket = io(WS_URL, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Connected to Tracking WebSocket Server');
      socket.emit('join_order_track', { orderId: activeOrder.id });
    });

    // Listen to rider updates broadcast
    socket.on('rider_location_broadcast', (data: any) => {
      if (data && data.location) {
        const { latitude, longitude } = data.location;
        setRiderLatLng({
          lat: latitude,
          lng: longitude,
          x: convertLatToX(latitude),
          y: convertLngToY(longitude)
        });
        if (data.etaMinutes !== undefined) setEta(data.etaMinutes);
        if (data.distanceKm !== undefined) setDistance(data.distanceKm);
      }
    });

    // Listen to real-time status updates broadcast
    socket.on('order_status_update', (data: any) => {
      if (data && data.status) {
        setActiveOrder((prev: any) => {
          if (!prev || prev.id !== data.id) return prev;
          return { ...prev, ...data };
        });
        setStatusIndex(STATUS_MAPPING[data.status] ?? 0);
        if (data.notification) {
          Alert.alert('Order Update', data.notification);
        }
      }
    });

    return () => {
      socket.emit('leave_order_track', { orderId: activeOrder.id });
      socket.disconnect();
    };
  }, [activeOrder?.id, token]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('home')} style={styles.backBtn}>
          <Text style={{ color: '#FFFFFF', fontSize: 16 }}>◀ Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {activeOrder ? `Order #${activeOrder.id.substring(0, 8)}...` : 'Tracking Console'}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#facc15" />
        </View>
      ) : !activeOrder ? (
        <View style={styles.emptyContainer}>
          <Text style={{ color: '#64748B', fontSize: 14 }}>No active order found to track.</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Live Tracking Map */}
          <View style={styles.mapContainer}>
            {/* Map Grid Background */}
            <View style={styles.mapGrid} />

            {/* Noida Warehouse Hub */}
            <View style={[styles.mapPin, { top: 150, left: 180 }]}>
              <Text style={styles.pinEmoji}>🏢</Text>
              <Text style={styles.pinText}>Noida Hub</Text>
            </View>

            {/* Customer Location */}
            <View style={[styles.mapPin, { top: 60, left: 80 }]}>
              <Text style={styles.pinEmoji}>📍</Text>
              <Text style={styles.pinText}>Home</Text>
            </View>

            {/* Moving Delivery Rider */}
            {statusIndex >= 3 && (
              <View style={[styles.riderPin, { top: riderLatLng.y, left: riderLatLng.x }]}>
                <Text style={styles.riderPinEmoji}>🏍️</Text>
                <Text style={styles.riderPinText}>
                  {activeOrder.deliveryPartner?.user?.name || 'Rahul'} (Rider)
                </Text>
              </View>
            )}

            {/* ETA Overlay Box */}
            <View style={styles.etaOverlay}>
              <Text style={styles.etaTitle}>Arriving in</Text>
              <Text style={styles.etaTime}>{eta !== null ? `${eta} Mins` : 'calculating...'}</Text>
              {distance !== null && <Text style={{ color: '#64748B', fontSize: 10 }}>({distance.toFixed(1)} km left)</Text>}
            </View>
          </View>

          {/* Delivery Status & Rider Profile */}
          <ScrollView style={styles.detailsScroll}>
            {statusIndex >= 3 && activeOrder.deliveryPartner ? (
              <View style={styles.riderCard}>
                <View style={styles.riderInfo}>
                  <View style={styles.avatar}>
                    <Text style={{ fontSize: 24 }}>👦</Text>
                  </View>
                  <View>
                    <Text style={styles.riderName}>
                      {activeOrder.deliveryPartner.user?.name || 'Rahul Sharma'}
                    </Text>
                    <Text style={styles.riderVehicle}>
                      {activeOrder.deliveryPartner.vehicleNumber || 'UP-16-AB-1234'} • {activeOrder.deliveryPartner.vehicleType || 'Motorcycle'}
                    </Text>
                    <Text style={styles.riderRating}>
                      ⭐ {activeOrder.deliveryPartner.rating || '4.8'} Rating
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.callBtn} 
                  onPress={() => Alert.alert('Rider Contact', `Calling rider: ${activeOrder.deliveryPartner.user?.phone || '+91 9999912345'}`)}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>📞 Call Rider</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.riderCard, { justifyContent: 'center', paddingVertical: 20 }]}>
                <View style={{ alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#facc15" style={{ marginBottom: 8 }} />
                  <Text style={[styles.riderName, { textAlign: 'center' }]}>Waiting for rider assignment...</Text>
                  <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>Your order is packed and ready at Noida Hub</Text>
                </View>
              </View>
            )}

            {/* GPS Telemetry Box */}
            {statusIndex >= 3 && activeOrder.deliveryPartner && (
              <View style={styles.telemetryBox}>
                <Text style={styles.telemetryTitle}>🛰️ Real-Time GPS Telemetry</Text>
                <Text style={styles.telemetryVal}>Latitude: <Text style={{ color: '#FFFFFF' }}>{riderLatLng.lat.toFixed(5)}</Text></Text>
                <Text style={styles.telemetryVal}>Longitude: <Text style={{ color: '#FFFFFF' }}>{riderLatLng.lng.toFixed(5)}</Text></Text>
              </View>
            )}

            {/* Delivery Progress */}
            <View style={styles.timeline}>
              <Text style={styles.timelineTitle}>Delivery Progress</Text>
              {statuses.map((status, idx) => {
                const isCompleted = idx <= statusIndex;
                const isCurrent = idx === statusIndex;
                return (
                  <View key={idx} style={styles.timelineItem}>
                    <View style={[styles.circle, isCompleted && styles.circleCompleted, isCurrent && styles.circleCurrent]}>
                      {isCompleted && <Text style={{ color: '#FFFFFF', fontSize: 9 }}>✓</Text>}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineLabel, isCompleted && styles.textCompleted]}>{status.label}</Text>
                      <Text style={styles.timelineSub}>{status.sub}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Detailed Order Summary Section */}
            <View style={styles.orderSummarySection}>
              <Text style={styles.sectionHeader}>Order Details</Text>
              
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Order ID:</Text>
                <Text style={styles.metaValue}>{activeOrder.id}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Placed On:</Text>
                <Text style={styles.metaValue}>
                  {new Date(activeOrder.createdAt).toLocaleDateString()} {new Date(activeOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Order Status:</Text>
                <Text style={[styles.metaValue, { color: '#f59e0b', fontWeight: 'bold' }]}>{activeOrder.status}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Payment Status:</Text>
                <Text style={[styles.metaValue, { color: activeOrder.paymentStatus === 'COMPLETED' ? '#10b981' : '#f59e0b', fontWeight: 'bold' }]}>
                  {activeOrder.paymentStatus} ({activeOrder.paymentMethod})
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Delivery Address:</Text>
                <Text style={[styles.metaValue, { flex: 1, textAlign: 'right' }]}>
                  {activeOrder.address 
                    ? `${activeOrder.address.addressLine1}${activeOrder.address.addressLine2 ? `, ${activeOrder.address.addressLine2}` : ''}, ${activeOrder.address.city}, ${activeOrder.address.state} - ${activeOrder.address.zipCode}`
                    : 'Noida Sector 62'}
                </Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.itemsHeader}>Items Ordered</Text>
              {activeOrder.items?.map((item: any, idx: number) => {
                const product = item.product;
                const images = product?.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [];
                const imageUrl = images[0] || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=400';
                
                return (
                  <View key={idx} style={styles.itemRow}>
                    <Image source={{ uri: imageUrl }} style={styles.itemImage} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.itemName}>{product?.name || 'Automotive Product'}</Text>
                      {product?.brand?.name && (
                        <Text style={styles.itemBrand}>Brand: {product.brand.name}</Text>
                      )}
                      <Text style={styles.itemQtyPrice}>
                        {item.quantity} x ₹{item.price.toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.itemTotal}>
                      ₹{(item.quantity * item.price).toFixed(2)}
                    </Text>
                  </View>
                );
              })}

              <View style={styles.divider} />

              <View style={[styles.metaRow, { marginTop: 12 }]}>
                <Text style={[styles.metaLabel, { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' }]}>Grand Total:</Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#facc15' }}>
                  ₹{activeOrder.totalAmount.toFixed(2)}
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
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
    marginRight: 16
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  mapContainer: {
    height: 240,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderStyle: 'dashed'
  },
  mapPin: {
    position: 'absolute',
    alignItems: 'center'
  },
  pinEmoji: {
    fontSize: 24
  },
  pinText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2
  },
  riderPin: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10
  },
  riderPinEmoji: {
    fontSize: 26
  },
  riderPinText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: '#facc15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2
  },
  etaOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(9, 9, 11, 0.95)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center'
  },
  etaTitle: {
    color: '#64748B',
    fontSize: 10,
    textTransform: 'uppercase'
  },
  etaTime: {
    color: '#facc15',
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: 2
  },
  detailsScroll: {
    flex: 1,
    padding: 16
  },
  riderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12
  },
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  riderName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  riderVehicle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2
  },
  riderRating: {
    color: '#facc15',
    fontSize: 11,
    marginTop: 2
  },
  callBtn: {
    backgroundColor: '#facc15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10
  },
  telemetryBox: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16
  },
  telemetryTitle: {
    color: '#facc15',
    fontWeight: 'bold',
    fontSize: 11,
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  telemetryVal: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2
  },
  timeline: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20
  },
  timelineTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 16
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20
  },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    marginTop: 2
  },
  circleCompleted: {
    backgroundColor: '#10b981',
    borderColor: '#10b981'
  },
  circleCurrent: {
    borderColor: '#facc15',
    backgroundColor: '#facc15'
  },
  timelineContent: {
    flex: 1
  },
  timelineLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600'
  },
  textCompleted: {
    color: '#FFFFFF'
  },
  timelineSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2
  },
  orderSummarySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 32
  },
  sectionHeader: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 16
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  metaLabel: {
    color: '#64748B',
    fontSize: 12
  },
  metaValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500'
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16
  },
  itemsHeader: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 12
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#E5E7EB'
  },
  itemName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600'
  },
  itemBrand: {
    color: '#facc15',
    fontSize: 10,
    marginTop: 1
  },
  itemQtyPrice: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2
  },
  itemTotal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold'
  }
});
