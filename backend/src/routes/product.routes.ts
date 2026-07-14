import { Router } from 'express';
import {
  getProducts,
  getProductById,
  addReview,
  getCategories,
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  createProduct,
  updateProductStock,
  getHomeData,
  getBanners,
  getFeaturedProducts,
  getFlashDeals,
  getNewArrivals,
  updateCategory,
  createBanner,
  updateBanner,
  deleteBanner,
} from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Home screen unified endpoint
router.get('/home', getHomeData);

// Product listing & details
router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/brands', getBrands);
router.get('/featured', getFeaturedProducts);
router.get('/flash-deals', getFlashDeals);
router.get('/new-arrivals', getNewArrivals);
router.get('/banners', getBanners);

// Admin: Brand CRUD
router.post('/brands', authenticate as any, authorize([Role.ADMIN]) as any, createBrand as any);
router.put('/brands/:id', authenticate as any, authorize([Role.ADMIN]) as any, updateBrand as any);
router.delete('/brands/:id', authenticate as any, authorize([Role.ADMIN]) as any, deleteBrand as any);

// Admin: Category management
router.put('/categories/:id', authenticate as any, authorize([Role.ADMIN]) as any, updateCategory as any);

// Admin: Banner CRUD
router.post('/banners', authenticate as any, authorize([Role.ADMIN]) as any, createBanner as any);
router.put('/banners/:id', authenticate as any, authorize([Role.ADMIN]) as any, updateBanner as any);
router.delete('/banners/:id', authenticate as any, authorize([Role.ADMIN]) as any, deleteBanner as any);

// Product details (must be after other named routes)
router.get('/:id', getProductById);
router.post('/:productId/reviews', authenticate as any, addReview as any);
router.post('/', createProduct);
router.put('/:id/stock', updateProductStock);

export default router;
