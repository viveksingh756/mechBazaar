import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Get wallet details and transaction history
export const getWalletDetails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    let wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // If wallet doesn't exist for some reason, create it
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: req.user.id,
          balance: 0.0,
          points: 0,
        },
        include: {
          transactions: true,
        },
      });
    }

    return res.json({ success: true, data: wallet });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Deposit money into wallet (Simulated Razorpay transaction completion)
export const depositMoney = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { amount, transactionId } = req.body;

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid deposit amount' });
    }

    const txId = transactionId || `TXN-DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const wallet = await prisma.$transaction(async (tx) => {
      // Find or create wallet
      let userWallet = await tx.wallet.findUnique({ where: { userId: req.user!.id } });
      if (!userWallet) {
        userWallet = await tx.wallet.create({
          data: {
            userId: req.user!.id,
            balance: 0.0,
            points: 0,
          },
        });
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: userWallet.id },
        data: {
          balance: {
            increment: depositAmount,
          },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: userWallet.id,
          amount: depositAmount,
          type: 'CREDIT',
          description: `Deposited money via online payment`,
        },
      });

      return updatedWallet;
    });

    return res.json({
      success: true,
      message: 'Deposit successful',
      data: wallet,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
