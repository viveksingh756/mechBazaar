import { Router } from 'express';
import { register, login, getProfile, registerDeliveryDetails, registerVendorByAdmin, forgotPassword, resetPassword, getVendors, updateVendorByAdmin, getDeliveryPartners } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticate as any, getProfile as any);
router.post('/delivery-details', authenticate as any, registerDeliveryDetails as any);
router.post('/admin/register-vendor', authenticate as any, registerVendorByAdmin as any);
router.get('/admin/vendors', authenticate as any, getVendors as any);
router.put('/admin/vendors/:id', authenticate as any, updateVendorByAdmin as any);
router.get('/admin/delivery-partners', authenticate as any, getDeliveryPartners as any);
router.post('/forgot-password', forgotPassword as any);
router.post('/reset-password', resetPassword as any);

export default router;
