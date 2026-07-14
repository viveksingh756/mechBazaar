import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

interface OrderPayload {
  id: string;
  customerName: string;
  address: string;
  items: string[];
  total: number;
}

interface RiderState {
  isOnline: boolean;
  activeOrder: OrderPayload | null;
  earningsToday: number;
  completedOrdersCount: number;
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

const initialRiderState: RiderState = {
  isOnline: true,
  activeOrder: null,
  earningsToday: 380.00,
  completedOrdersCount: 3,
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

const riderSlice = createSlice({
  name: 'rider',
  initialState: initialRiderState,
  reducers: {
    toggleOnline: (state) => {
      state.isOnline = !state.isOnline;
    },
    assignOrder: (state, action: PayloadAction<OrderPayload>) => {
      state.activeOrder = action.payload;
    },
    completeDelivery: (state, action: PayloadAction<number>) => {
      state.earningsToday += action.payload;
      state.completedOrdersCount += 1;
      state.activeOrder = null;
    },
    rejectOrder: (state) => {
      state.activeOrder = null;
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export const { toggleOnline, assignOrder, completeDelivery, rejectOrder } = riderSlice.actions;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    rider: riderSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
