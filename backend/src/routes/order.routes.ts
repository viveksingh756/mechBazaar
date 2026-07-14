import { Router } from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getAllOrders,
  getActiveDeliveryOrders
} from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Customer specific
router.post('/', authenticate as any, createOrder as any);
router.get('/my-orders', authenticate as any, getMyOrders as any);

// Delivery specific
router.get('/delivery-active', authenticate as any, getActiveDeliveryOrders as any);

// Admin specific
router.get('/admin-all', authenticate as any, authorize([Role.ADMIN, Role.VENDOR]) as any, getAllOrders as any);

// Shared / General
router.get('/:id', authenticate as any, getOrderById as any);
router.put('/:id/status', authenticate as any, updateOrderStatus as any);
router.post('/:id/cancel', authenticate as any, cancelOrder as any);

export default router;
