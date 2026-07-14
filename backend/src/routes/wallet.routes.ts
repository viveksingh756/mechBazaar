import { Router } from 'express';
import { getWalletDetails, depositMoney } from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate as any, getWalletDetails as any);
router.post('/deposit', authenticate as any, depositMoney as any);

export default router;
