import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, Alert, NativeModules, StatusBar } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import { RootState, toggleOnline, assignOrder, rejectOrder, completeDelivery } from '../store';

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
const API_URL = host ? `http://${host}:5000/api` : (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : `${API_BASE_URL}`);
const WS_URL = host ? `http://${host}:5000` : (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : BASE_URL);

// Delhi-Noida coordinates path progression for simulation
const NoidaHub = { latitude: 28.6276, longitude: 77.3784 };
const CustomerHome = { latitude: 28.6200, longitude: 77.3600 };

export default 
const BASE_URL = __DEV__ ? 'http://localhost:5000' : 'https://mech-bazaar-backend.vercel.app';
const API_BASE_URL = `${BASE_URL}/api`;

function RiderDashboard() {
  const dispatch = useDispatch();
  const isOnline = useSelector((state: RootState) => state.rider.isOnline);
  const activeOrder = useSelector((state: RootState) => state.rider.activeOrder);
  const earnings = useSelector((state: RootState) => state.rider.earningsToday);
  const completedCount = useSelector((state: RootState) => state.rider.completedOrdersCount);
  const token = useSelector((state: RootState) => state.auth.token);
  const user = useSelector((state: RootState) => state.auth.user);

  const [isLoading, setIsLoading] = useState(false);
  const [hasIncomingAlert, setHasIncomingAlert] = useState(false);
  const [incomingOrderDetails, setIncomingOrderDetails] = useState<any>(null);
  const [deliveryStep, setDeliveryStep] = useState<'PICKUP' | 'OTP' | 'SIGNATURE'>('PICKUP');
  
  // Signature & OTP inputs
  const [otpInput, setOtpInput] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Live Location stream coordinates
  const [currentCoords, setCurrentCoords] = useState(NoidaHub);

  // 1. Fetch Active Delivery Assignments from Backend
  const checkForIncomingOrders = async () => {
    if (!token || !isOnline || activeOrder) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/orders/delivery-active`, { headers });
      
      const orderList = response.data && response.data.success ? response.data.data : (Array.isArray(response.data) ? response.data : []);
      if (orderList && orderList.length > 0) {
        const order = orderList[0];
        
        if (order.status === 'PACKED') {
          // Unaccepted order request, trigger alert popup
          setIncomingOrderDetails(order);
          setHasIncomingAlert(true);
        } else {
          // Already accepted / active order, restore active state silently
          dispatch(assignOrder({
            id: order.id,
            customerName: order.customer?.name || order.user?.name || 'Vivek Kumar',
            address: order.address?.addressLine1 || 'Noida Sector 62',
            items: order.items?.map((i: any) => `${i.product?.name} x ${i.quantity}`) || [],
            total: order.totalAmount
          }));
          
          if (order.status === 'PICKED_UP') {
            setDeliveryStep('OTP');
          } else if (order.status === 'ON_THE_WAY') {
            setDeliveryStep('SIGNATURE');
          } else {
            setDeliveryStep('PICKUP');
          }
        }
      }
    } catch (err: any) {
      console.warn('Could not poll for active dispatches:', err.message);
    }
  };

  useEffect(() => {
    const pollInterval = setInterval(() => {
      checkForIncomingOrders();
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [token, isOnline, activeOrder]);

  // 2. WebSocket Real-Time Location Broadcasting Loop
  useEffect(() => {
    if (!isOnline || !token || !user) return;

    const socket = io(WS_URL, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Rider connected to WebSocket Gateway');
    });

    // Simulate location movements from Hub to Customer when order is active
    let stepsCount = 0;
    const trackingInterval = setInterval(() => {
      let lat = NoidaHub.latitude;
      let lng = NoidaHub.longitude;

      if (activeOrder) {
        // Linearly interpolate coordinates to show real-time transit
        const steps = 10;
        const currentStep = Math.min(stepsCount, steps);
        lat = NoidaHub.latitude + (CustomerHome.latitude - NoidaHub.latitude) * (currentStep / steps);
        lng = NoidaHub.longitude + (CustomerHome.longitude - NoidaHub.longitude) * (currentStep / steps);
        setCurrentCoords({ latitude: lat, longitude: lng });
        stepsCount++;
      } else {
        stepsCount = 0;
        setCurrentCoords(NoidaHub);
      }

      // Stream locations to backend
      socket.emit('update_partner_location', {
        partnerId: user.id || 'rider1',
        orderId: activeOrder?.id,
        latitude: lat,
        longitude: lng,
        etaMinutes: activeOrder ? Math.max(2, 10 - stepsCount) : undefined,
        distanceKm: activeOrder ? Math.max(0.4, 2.4 - stepsCount * 0.2) : undefined
      });

    }, 4000);

    return () => {
      clearInterval(trackingInterval);
      socket.disconnect();
    };
  }, [isOnline, activeOrder, token, user]);

  const handleAcceptOrder = async () => {
    if (!incomingOrderDetails || !token) return;
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.put(`${API_URL}/orders/${incomingOrderDetails.id}/status`, {
        status: 'ASSIGNED'
      }, { headers });

      if (response.data && response.data.success) {
        dispatch(assignOrder({
          id: incomingOrderDetails.id,
          customerName: incomingOrderDetails.customer?.name || incomingOrderDetails.user?.name || 'Vivek Kumar',
          address: incomingOrderDetails.address?.addressLine1 || 'Noida Sector 62',
          items: incomingOrderDetails.items?.map((i: any) => `${i.product?.name} x ${i.quantity}`) || [],
          total: incomingOrderDetails.totalAmount
        }));
        setHasIncomingAlert(false);
        setDeliveryStep('PICKUP');
      }
    } catch (err: any) {
      console.error('Accept order failed on backend:', err.message);
      Alert.alert('Assignment Error', 'Failed to accept order on server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineOrder = async () => {
    if (!incomingOrderDetails || !token) return;
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/orders/${incomingOrderDetails.id}/status`, {
        status: 'PACKED',
        deliveryPartnerId: null
      }, { headers });
    } catch (err: any) {
      console.error('Decline order failed on backend:', err.message);
    } finally {
      setIsLoading(false);
      setHasIncomingAlert(false);
      setIncomingOrderDetails(null);
    }
  };

  const updateStatusOnBackend = async (status: string) => {
    if (!activeOrder || !token) return false;
    setIsUpdatingStatus(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/orders/${activeOrder.id}/status`, { status }, { headers });
      setIsUpdatingStatus(false);
      return true;
    } catch (err: any) {
      console.error('Failed to update status on server:', err.message);
      Alert.alert('Status Error', 'Could not sync status with server: ' + (err.response?.data?.message || err.message));
      setIsUpdatingStatus(false);
      return false;
    }
  };

  const handleVerifyPickup = async () => {
    const synced = await updateStatusOnBackend('PICKED_UP');
    if (synced) {
      setDeliveryStep('OTP');
      Alert.alert('On The Way', 'Package picked up. Navigate to customer for delivery.');
    }
  };

  const handleVerifyOtp = async () => {
    if (otpInput === '1234') {
      setDeliveryStep('SIGNATURE');
    } else {
      Alert.alert('Invalid OTP', 'Ask customer for correct 4-digit code (e.g. 1234).');
    }
  };

  const handleCompleteDelivery = async () => {
    if (!signatureName.trim()) {
      Alert.alert('Signature Required', 'Please ask customer to sign (enter name).');
      return;
    }

    const synced = await updateStatusOnBackend('DELIVERED');
    if (synced) {
      const deliveryBonus = 75.00; // ₹75 earned per delivery
      dispatch(completeDelivery(deliveryBonus));
      setSignatureName('');
      setOtpInput('');
      setPhotoUploaded(false);
      setIncomingOrderDetails(null);
      Alert.alert('Success', 'Delivery completed successfully! Payout added to wallet.');
    }
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.riderTitle}>{user?.name || 'Rider Panel'}</Text>
          <Text style={styles.vehicleNo}>{user?.email || 'UP-16-AB-1234'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => dispatch(toggleOnline())}
            style={[styles.statusBtn, isOnline ? styles.btnOnline : styles.btnOffline]}
          >
            <Text style={styles.statusBtnText}>{isOnline ? '🟢 ONLINE' : '⚪ OFFLINE'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Today's Earnings</Text>
          <Text style={styles.metricVal}>₹{earnings.toFixed(2)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Delivered</Text>
          <Text style={styles.metricVal}>{completedCount} Orders</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Active Shift</Text>
          <Text style={styles.metricVal}>{isOnline ? 'Active' : 'Paused'}</Text>
        </View>
      </View>

      {/* Simulated alert popup */}
      {hasIncomingAlert && incomingOrderDetails && (
        <View style={styles.alertPopup}>
          <Text style={styles.alertTitle}>⚡ New Order Dispatch Request</Text>
          <Text style={styles.alertMeta}>Est. Payout: ₹75.00 | Hub ➔ {incomingOrderDetails.address?.addressLine1 || 'Noida Hub'}</Text>
          <View style={styles.alertActions}>
            <TouchableOpacity onPress={handleDeclineOrder} style={[styles.alertBtn, styles.declineBtn]}>
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAcceptOrder} style={[styles.alertBtn, styles.acceptBtn]}>
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Accept Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Active Order view */}
      <ScrollView style={styles.scroll}>
        {activeOrder ? (
          <View style={styles.activeOrderCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.orderId}>Order ID: {activeOrder.id.substring(0, 8)}...</Text>
              <Text style={styles.timerBadge}>⏱️ Express</Text>
            </View>

            <Text style={styles.sectionHeading}>Items to deliver:</Text>
            {activeOrder.items.map((item: string, idx: number) => (
              <Text key={idx} style={styles.itemText}>• {item}</Text>
            ))}

            <Text style={styles.sectionHeading}>Delivery Address:</Text>
            <Text style={styles.addressText}>{activeOrder.address}</Text>

            {/* Navigation route simulation */}
            <View style={styles.mapWidget}>
              <Text style={{ color: '#64748B', fontSize: 11, marginBottom: 4 }}>🛰️ GPS Coordinates Broadcasting</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' }}>
                Lat: {currentCoords.latitude.toFixed(5)} | Lng: {currentCoords.longitude.toFixed(5)}
              </Text>
            </View>

            {/* Workflow steps */}
            <View style={styles.workflowContainer}>
              {isUpdatingStatus ? (
                <ActivityIndicator size="small" color="#facc15" />
              ) : (
                <>
                  {deliveryStep === 'PICKUP' && (
                    <TouchableOpacity onPress={handleVerifyPickup} style={styles.actionBtn}>
                      <Text style={styles.actionBtnText}>Confirm Pickup at Hub</Text>
                    </TouchableOpacity>
                  )}

                  {deliveryStep === 'OTP' && (
                    <View style={styles.otpRow}>
                      <TextInput
                        placeholder="Enter Customer OTP (1234)"
                        placeholderTextColor="#64748B"
                        keyboardType="number-pad"
                        style={styles.otpInput}
                        value={otpInput}
                        onChangeText={setOtpInput}
                        maxLength={4}
                      />
                      <TouchableOpacity onPress={handleVerifyOtp} style={styles.otpVerifyBtn}>
                        <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Verify</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {deliveryStep === 'SIGNATURE' && (
                    <View style={styles.signatureCol}>
                      <TextInput
                        placeholder="Customer Name for Signature"
                        placeholderTextColor="#64748B"
                        style={styles.sigInput}
                        value={signatureName}
                        onChangeText={setSignatureName}
                      />
                      <TouchableOpacity
                        onPress={() => setPhotoUploaded(true)}
                        style={[styles.uploadBtn, photoUploaded && { backgroundColor: '#064e3b' }]}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 13 }}>
                          {photoUploaded ? '✓ Delivery Proof Uploaded' : '📸 Take Delivery Proof Photo'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleCompleteDelivery} style={styles.completeBtn}>
                        <Text style={styles.completeBtnText}>Complete Delivery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.idleContainer}>
            <Text style={styles.idleEmoji}>😴</Text>
            <Text style={styles.idleText}>Waiting for incoming spare parts delivery dispatches...</Text>
            <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              Ensure your status is set to ONLINE above to poll database orders.
            </Text>
          </View>
        )}
      </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  riderTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16
  },
  vehicleNo: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2
  },
  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10
  },
  btnOnline: {
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#059669'
  },
  btnOffline: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  statusBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11
  },
  metricsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5F5F5'
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 10,
    textTransform: 'uppercase'
  },
  metricVal: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 4
  },
  alertPopup: {
    backgroundColor: '#facc15',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#facc15'
  },
  alertTitle: {
    color: '#facc15',
    fontWeight: 'bold',
    fontSize: 14
  },
  alertMeta: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16
  },
  alertBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10
  },
  declineBtn: {
    backgroundColor: '#ef4444'
  },
  acceptBtn: {
    backgroundColor: '#facc15'
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16
  },
  activeOrderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F5F5F5',
    marginBottom: 32
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingBottom: 12,
    marginBottom: 12
  },
  orderId: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15
  },
  timerBadge: {
    backgroundColor: '#ef4444',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  sectionHeading: {
    color: '#facc15',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 6
  },
  itemText: {
    color: '#111827',
    fontSize: 13,
    marginTop: 2
  },
  addressText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18
  },
  mapWidget: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  workflowContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingTop: 16
  },
  actionBtn: {
    backgroundColor: '#facc15',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center'
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8
  },
  otpInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    color: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  otpVerifyBtn: {
    backgroundColor: '#facc15',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 10
  },
  signatureCol: {
    gap: 10
  },
  sigInput: {
    backgroundColor: '#F5F5F5',
    color: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  uploadBtn: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center'
  },
  completeBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center'
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  idleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80
  },
  idleEmoji: {
    fontSize: 48
  },
  idleText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20
  }
});
