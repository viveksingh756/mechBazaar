import { Router } from 'express';
import { createRider, updateRider, getRidersList, getRiderDetails, deleteRider, changeRiderStatus, verifyRider, resetRiderPassword } from '../controllers/admin.rider.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate as any);

router.post('/', createRider as any);
router.get('/', getRidersList as any);
router.get('/:id', getRiderDetails as any);
router.put('/:id', updateRider as any);
router.delete('/:id', deleteRider as any);
router.put('/:id/status', changeRiderStatus as any);
router.put('/:id/verify', verifyRider as any);
router.put('/:id/reset-password', resetRiderPassword as any);

export default router;
