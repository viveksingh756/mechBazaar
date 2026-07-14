export type UserRole = 'CUSTOMER' | 'DELIVERY' | 'VENDOR' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  title: string; // 'Home', 'Work', etc.
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface UserVehicle {
  id: string;
  userId: string;
  registrationNumber?: string;
  make: string;
  model: string;
  variant: string;
  fuelType: string;
  year: number;
  isDefault: boolean;
}

export interface Manufacturer {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface VehicleModel {
  id: string;
  manufacturerId: string;
  name: string;
}

export interface VehicleVariant {
  id: string;
  modelId: string;
  name: string;
  fuelType: string;
  startYear: number;
  endYear: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  iconUrl?: string;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  oemNumber?: string;
  description: string;
  price: number;
  mrp: number;
  discount: number;
  stock: number;
  brandId: string;
  brand?: Brand;
  categoryId: string;
  category?: Category;
  returnPolicy: string;
  deliveryTime: string; // e.g. "15 mins"
  rating: number;
  reviewCount: number;
  images: string[];
  videos?: string[];
  isFlashSale?: boolean;
}

export interface ProductCompatibility {
  id: string;
  productId: string;
  variantId: string;
  notes?: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PACKED'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'ON_THE_WAY'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'COD' | 'UPI' | 'CARD' | 'NET_BANKING' | 'WALLET';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  addressId: string;
  address?: Address;
  deliveryPartnerId?: string;
  deliveryPartner?: DeliveryPartner;
  status: OrderStatus;
  totalAmount: number;
  deliveryCharge: number;
  gstAmount: number;
  discountAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export interface DeliveryPartner {
  id: string;
  userId: string;
  name?: string;
  phone?: string;
  vehicleNumber: string;
  vehicleType: string;
  licenseNumber: string;
  rating: number;
  status: 'OFFLINE' | 'ONLINE' | 'BUSY';
  verified: boolean;
}

export interface LiveLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface LocationBroadcast {
  orderId: string;
  partnerId: string;
  location: LiveLocation;
  etaMinutes: number;
  distanceKm: number;
}

export interface WalletInfo {
  id: string;
  userId: string;
  balance: number;
  points: number;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
}
