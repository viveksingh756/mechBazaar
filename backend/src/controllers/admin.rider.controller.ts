import { Request, Response } from 'express';
import { PrismaClient, Role, PartnerAccountStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Create Rider
export const createRider = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, dob, gender, vehicleNumber, vehicleType, vehicleBrand, vehicleModel, licenseNumber, dlExpiry, aadhaarNumber, dlFrontUrl, dlBackUrl, aadhaarUrl, panUrl, rcUrl, insuranceUrl, status } = req.body;

    if (!name || !phone || !vehicleNumber || !vehicleType || !licenseNumber) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: email || undefined }, { phone }] }
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this phone or email already exists' });
    }

    let passwordHash = '';
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    // Default email if not provided
    const riderEmail = email || `rider_${phone}@mechbazar.com`;

    const user = await prisma.user.create({
      data: {
        name,
        email: riderEmail,
        phone,
        passwordHash,
        role: Role.DELIVERY,
        dob: dob ? new Date(dob) : null,
        gender,
        addresses: {
          create: {
            title: 'Home',
            addressLine1: req.body.addressLine || 'N/A',
            city: req.body.city || 'N/A',
            state: req.body.state || 'N/A',
            zipCode: req.body.pincode || 'N/A',
            latitude: 0,
            longitude: 0,
            isDefault: true
          }
        }
      }
    });

    const deliveryPartner = await prisma.deliveryPartner.create({
      data: {
        userId: user.id,
        vehicleNumber,
        vehicleType,
        vehicleBrand,
        vehicleModel,
        licenseNumber,
        dlExpiry: dlExpiry ? new Date(dlExpiry) : null,
        aadhaarNumber,
        dlFrontUrl,
        dlBackUrl,
        aadhaarUrl,
        panUrl,
        rcUrl,
        insuranceUrl,
        accountStatus: status || PartnerAccountStatus.PENDING_VERIFICATION,
        verified: status === PartnerAccountStatus.ACTIVE,
      }
    });

    return res.status(201).json({ success: true, data: { ...user, deliveryInfo: deliveryPartner } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Rider
export const updateRider = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, dob, gender, vehicleNumber, vehicleType, vehicleBrand, vehicleModel, licenseNumber, dlExpiry, aadhaarNumber, dlFrontUrl, dlBackUrl, aadhaarUrl, panUrl, rcUrl, insuranceUrl, status } = req.body;

    const partner = await prisma.deliveryPartner.findUnique({ where: { id }, include: { user: true } });
    if (!partner) return res.status(404).json({ success: false, message: 'Rider not found' });

    if (email || phone) {
      const duplicate = await prisma.user.findFirst({
        where: { id: { not: partner.userId }, OR: [{ email: email || undefined }, { phone: phone || undefined }] }
      });
      if (duplicate) return res.status(400).json({ success: false, message: 'Phone or email already in use' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: partner.userId },
      data: { name, email, phone, dob: dob ? new Date(dob) : undefined, gender }
    });

    const updatedPartner = await prisma.deliveryPartner.update({
      where: { id },
      data: {
        vehicleNumber, vehicleType, vehicleBrand, vehicleModel, licenseNumber,
        dlExpiry: dlExpiry ? new Date(dlExpiry) : undefined,
        aadhaarNumber, dlFrontUrl, dlBackUrl, aadhaarUrl, panUrl, rcUrl, insuranceUrl,
        accountStatus: status,
        verified: status === PartnerAccountStatus.ACTIVE ? true : undefined
      }
    });

    return res.json({ success: true, data: { ...updatedUser, deliveryInfo: updatedPartner } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Rider List
export const getRidersList = async (req: Request, res: Response) => {
  try {
    const partners = await prisma.deliveryPartner.findMany({
      where: { isDeleted: false },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, profilePhoto: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: partners });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Rider Details
export const getRiderDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const partner = await prisma.deliveryPartner.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!partner || partner.isDeleted) return res.status(404).json({ success: false, message: 'Rider not found' });
    return res.json({ success: true, data: partner });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Soft Delete Rider
export const deleteRider = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.deliveryPartner.update({
      where: { id },
      data: { isDeleted: true }
    });
    return res.json({ success: true, message: 'Rider soft deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Change Status
export const changeRiderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const partner = await prisma.deliveryPartner.update({
      where: { id },
      data: { 
        accountStatus: status,
        verified: status === PartnerAccountStatus.ACTIVE ? true : false
      }
    });
    return res.json({ success: true, data: partner });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Verify Rider
export const verifyRider = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const partner = await prisma.deliveryPartner.update({
      where: { id },
      data: { verified: true, accountStatus: PartnerAccountStatus.ACTIVE }
    });
    return res.json({ success: true, data: partner });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Reset Password
export const resetRiderPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const partner = await prisma.deliveryPartner.findUnique({ where: { id } });
    if (!partner) return res.status(404).json({ success: false, message: 'Rider not found' });
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    
    await prisma.user.update({
      where: { id: partner.userId },
      data: { passwordHash }
    });
    
    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
