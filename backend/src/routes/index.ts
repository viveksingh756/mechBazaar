import { Router } from 'express';
import authRoutes from './auth.routes';
import garageRoutes from './garage.routes';
import productRoutes from './product.routes';
import orderRoutes from './order.routes';
import walletRoutes from './wallet.routes';
import adminRiderRoutes from './admin.rider.routes';
import uploadRoutes from './upload.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/garage', garageRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/wallet', walletRoutes);
router.use('/admin/delivery-partners', adminRiderRoutes);
router.use('/upload', uploadRoutes);

export default router;
