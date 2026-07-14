import { Router } from 'express';
import {
  getUserVehicles,
  addUserVehicle,
  setDefaultUserVehicle,
  deleteUserVehicle,
  getManufacturers,
  getModels,
  getVariants,
  createManufacturer,
  updateManufacturer,
  deleteManufacturer,
  createModel,
  updateModel,
  deleteModel,
  createVariant,
  updateVariant,
  deleteVariant,
  getModelYears,
  createModelYear,
  updateModelYear,
  deleteModelYear
} from '../controllers/garage.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Dropdowns for garage selector filters (public)
router.get('/manufacturers', getManufacturers as any);
router.get('/models', getModels as any);
router.get('/years', getModelYears as any);
router.get('/variants', getVariants as any);

// Manufacturer CRUD (authenticated admin)
router.post('/manufacturers', authenticate as any, createManufacturer as any);
router.put('/manufacturers/:id', authenticate as any, updateManufacturer as any);
router.delete('/manufacturers/:id', authenticate as any, deleteManufacturer as any);

// Model CRUD (authenticated admin)
router.post('/models', authenticate as any, createModel as any);
router.put('/models/:id', authenticate as any, updateModel as any);
router.delete('/models/:id', authenticate as any, deleteModel as any);

// Model Year CRUD (authenticated admin)
router.post('/years', authenticate as any, createModelYear as any);
router.put('/years/:id', authenticate as any, updateModelYear as any);
router.delete('/years/:id', authenticate as any, deleteModelYear as any);

// Engine Variant CRUD (authenticated admin)
router.post('/variants', authenticate as any, createVariant as any);
router.put('/variants/:id', authenticate as any, updateVariant as any);
router.delete('/variants/:id', authenticate as any, deleteVariant as any);

// User garage CRUD (authenticated)
router.get('/vehicles', authenticate as any, getUserVehicles as any);
router.post('/vehicles', authenticate as any, addUserVehicle as any);
router.put('/vehicles/:id/default', authenticate as any, setDefaultUserVehicle as any);
router.delete('/vehicles/:id', authenticate as any, deleteUserVehicle as any);

export default router;
