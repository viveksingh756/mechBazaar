import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserVehicle, Product } from '../types';

interface CartItem {
  product: Product;
  quantity: number;
}

interface GarageState {
  vehicles: UserVehicle[];
  activeVehicle: UserVehicle | null;
}

interface CartState {
  items: CartItem[];
  coupon: string | null;
  discount: number;
}

interface AuthState {
  token: string | null;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  } | null;
  isAuthenticated: boolean;
}

const initialGarageState: GarageState = {
  vehicles: [],
  activeVehicle: null,
};

const initialCartState: CartState = {
  items: [],
  coupon: null,
  discount: 0,
};

const initialAuthState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<{ token: string; user: any }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

const garageSlice = createSlice({
  name: 'garage',
  initialState: initialGarageState,
  reducers: {
    setVehicles: (state, action: PayloadAction<UserVehicle[]>) => {
      state.vehicles = action.payload;
      const defaultVehicle = action.payload.find((v) => v.isDefault);
      state.activeVehicle = defaultVehicle || action.payload[0] || null;
    },
    setActiveVehicle: (state, action: PayloadAction<UserVehicle | null>) => {
      state.activeVehicle = action.payload;
    },
    addVehicle: (state, action: PayloadAction<UserVehicle>) => {
      state.vehicles.push(action.payload);
      if (action.payload.isDefault || !state.activeVehicle) {
        state.activeVehicle = action.payload;
      }
    },
  },
});

const cartSlice = createSlice({
  name: 'cart',
  initialState: initialCartState,
  reducers: {
    addToCart: (state, action: PayloadAction<Product>) => {
      const existing = state.items.find((item) => item.product.id === action.payload.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.items.push({ product: action.payload, quantity: 1 });
      }
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.product.id !== action.payload);
    },
    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const item = state.items.find((item) => item.product.id === action.payload.id);
      if (item) {
        item.quantity = Math.max(1, action.payload.quantity);
      }
    },
    applyCoupon: (state, action: PayloadAction<{ code: string; discount: number }>) => {
      state.coupon = action.payload.code;
      state.discount = action.payload.discount;
    },
    clearCart: (state) => {
      state.items = [];
      state.coupon = null;
      state.discount = 0;
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export const { setVehicles, setActiveVehicle, addVehicle } = garageSlice.actions;
export const { addToCart, removeFromCart, updateQuantity, applyCoupon, clearCart } = cartSlice.actions;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    garage: garageSlice.reducer,
    cart: cartSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
