import { Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_mechbazar_key';

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { email, phone, name, password, role } = req.body;

    if (!email || !phone || !name || !password) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email or phone already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userRole = role && Object.values(Role).includes(role) ? (role as Role) : Role.CUSTOMER;

    if (userRole === Role.VENDOR) {
      return res.status(400).json({ success: false, message: 'Vendor registration is restricted to the Admin Portal.' });
    }

    // Create the user transactionally, creating their wallet if they are a customer
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          phone,
          name,
          passwordHash,
          role: userRole,
        },
      });

      if (userRole === Role.CUSTOMER) {
        await tx.wallet.create({
          data: {
            userId: newUser.id,
            balance: 0.0,
            points: 0,
          },
        });
      }

      return newUser;
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        deliveryInfo: true,
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.role === Role.VENDOR && user.name.includes('STATUS: DEACTIVATED')) {
      return res.status(403).json({ success: false, message: 'Your vendor account has been deactivated by the administrator.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          deliveryInfo: user.deliveryInfo || undefined,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        wallet: true,
        addresses: true,
        vehicles: true,
        deliveryInfo: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { passwordHash, ...userData } = user;

    return res.json({
      success: true,
      data: userData,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const registerDeliveryDetails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== Role.DELIVERY) {
      return res.status(403).json({ success: false, message: 'Access denied: Only delivery partners can register vehicle details' });
    }

    const { vehicleNumber, vehicleType, licenseNumber } = req.body;

    if (!vehicleNumber || !vehicleType || !licenseNumber) {
      return res.status(400).json({ success: false, message: 'Missing required vehicle or license parameters' });
    }

    const deliveryPartner = await prisma.deliveryPartner.upsert({
      where: { userId: req.user.id },
      update: {
        vehicleNumber,
        vehicleType,
        licenseNumber,
      },
      create: {
        userId: req.user.id,
        vehicleNumber,
        vehicleType,
        licenseNumber,
        rating: 5.0,
        verified: false, // requires admin approval
      },
    });

    return res.json({
      success: true,
      message: 'Delivery partner details saved successfully. Awaiting Admin verification.',
      data: deliveryPartner,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const registerVendorByAdmin = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== Role.ADMIN) {
      return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }

    const { email, phone, name, password, gstNo } = req.body;
    if (!email || !phone || !name || !password) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email or phone already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const dbName = `${name}${gstNo ? ` | GST: ${gstNo}` : ''} | STATUS: ACTIVE`;

    const vendor = await prisma.user.create({
      data: {
        email,
        phone,
        name: dbName,
        passwordHash,
        role: Role.VENDOR,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Vendor registered successfully by Admin',
      data: {
        id: vendor.id,
        name,
        gstNo: gstNo || '',
        email: vendor.email,
        role: vendor.role,
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// In-memory store for password reset codes (expires after 10 mins)
const resetCodes = new Map<string, { code: string; expiresAt: number }>();

export const forgotPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account registered with this email address' });
    }

    // Generate a 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    resetCodes.set(email.toLowerCase(), { code, expiresAt });

    return res.json({
      success: true,
      message: 'Reset code generated successfully.',
      code // Return the code directly so user can reset without SMTP configuration!
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const resetPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, code, and new password are required' });
    }

    const record = resetCodes.get(email.toLowerCase());
    if (!record) {
      return res.status(400).json({ success: false, message: 'No reset request found for this email' });
    }

    if (record.code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid reset code' });
    }

    if (Date.now() > record.expiresAt) {
      resetCodes.delete(email.toLowerCase());
      return res.status(400).json({ success: false, message: 'Reset code has expired' });
    }

    // Update user password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { passwordHash }
    });

    // Clear reset code
    resetCodes.delete(email.toLowerCase());

    return res.json({
      success: true,
      message: 'Password has been reset successfully. Please sign in.'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const getVendors = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== Role.ADMIN) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const vendors = await prisma.user.findMany({
      where: { role: Role.VENDOR },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const parsedVendors = vendors.map((v) => {
      let cleanName = v.name;
      let gstNo = '';
      let isActive = true;

      if (cleanName.includes(' | STATUS: ')) {
        const parts = cleanName.split(' | STATUS: ');
        isActive = parts[1] === 'ACTIVE';
        cleanName = parts[0];
      }

      if (cleanName.includes(' | GST: ')) {
        const parts = cleanName.split(' | GST: ');
        cleanName = parts[0];
        gstNo = parts[1];
      }

      return {
        id: v.id,
        name: cleanName,
        gstNo,
        isActive,
        email: v.email,
        phone: v.phone,
        createdAt: v.createdAt
      };
    });

    return res.json({ success: true, data: parsedVendors });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateVendorByAdmin = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== Role.ADMIN) {
      return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }

    const { id } = req.params;
    const { name, phone, email, gstNo, isActive } = req.body;

    if (!name || !phone || !email) {
      return res.status(400).json({ success: false, message: 'Name, phone, and email are required.' });
    }

    const vendor = await prisma.user.findFirst({
      where: { id, role: Role.VENDOR }
    });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found.' });
    }

    // Check unique email/phone constraints (excluding the current vendor)
    const duplicate = await prisma.user.findFirst({
      where: {
        id: { not: id },
        OR: [{ email }, { phone }]
      }
    });

    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Another user with this email or phone already exists' });
    }

    // Formulate database serialized name column
    const dbName = `${name}${gstNo ? ` | GST: ${gstNo}` : ''} | STATUS: ${isActive ? 'ACTIVE' : 'DEACTIVATED'}`;

    await prisma.user.update({
      where: { id },
      data: {
        name: dbName,
        email,
        phone
      }
    });

    return res.json({
      success: true,
      message: 'Vendor account updated successfully'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const getDeliveryPartners = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== Role.ADMIN) {
      return res.status(403).json({ success: false, message: 'Access denied: Admin privileges required.' });
    }

    const partners = await prisma.deliveryPartner.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        location: true,
      },
    });

    return res.json({ success: true, data: partners });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
