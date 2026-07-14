import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// List user's garage vehicles
export const getUserVehicles = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const vehicles = await prisma.userVehicle.findMany({
      where: { userId: req.user.id },
      orderBy: { isDefault: 'desc' },
    });

    return res.json({ success: true, data: vehicles });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Add a vehicle to garage
export const addUserVehicle = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const userId = req.user.id;
    const { manufacturerId, modelId, modelYearId, variantId, registrationNumber, isDefault, year } = req.body;

    if (!manufacturerId || !modelId || !modelYearId || !variantId) {
      return res.status(400).json({ success: false, message: 'Missing vehicle ID specifications' });
    }

    // Fetch details from DB to build names
    const mfg = await prisma.manufacturer.findUnique({ where: { id: manufacturerId } });
    const mdl = await prisma.vehicleModel.findUnique({ where: { id: modelId } });
    const yr = await prisma.vehicleModelYear.findUnique({ where: { id: modelYearId } });
    const vrt = await prisma.vehicleVariant.findUnique({ where: { id: variantId } });

    if (!mfg || !mdl || !yr || !vrt) {
      return res.status(404).json({ success: false, message: 'Invalid vehicle specification components.' });
    }

    const count = await prisma.userVehicle.count({ where: { userId } });
    const setAsDefault = count === 0 ? true : !!isDefault;

    const vehicle = await prisma.$transaction(async (tx) => {
      if (setAsDefault) {
        await tx.userVehicle.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      return tx.userVehicle.create({
        data: {
          userId,
          make: mfg.name,
          model: mdl.name,
          year: year ? parseInt(String(year)) : yr.startYear,
          variant: vrt.name,
          fuelType: vrt.fuelType,
          registrationNumber,
          isDefault: setAsDefault,
          manufacturerId,
          modelId,
          modelYearId,
          variantId
        },
      });
    });

    return res.status(201).json({ success: true, data: vehicle });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Set a vehicle as default
export const setDefaultUserVehicle = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { id } = req.params;

    const vehicle = await prisma.userVehicle.findUnique({ where: { id } });
    if (!vehicle || vehicle.userId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Vehicle not found in garage' });
    }

    await prisma.$transaction([
      prisma.userVehicle.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false },
      }),
      prisma.userVehicle.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    return res.json({ success: true, message: 'Default vehicle updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Delete vehicle from garage
export const deleteUserVehicle = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { id } = req.params;

    const vehicle = await prisma.userVehicle.findUnique({ where: { id } });
    if (!vehicle || vehicle.userId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    await prisma.userVehicle.delete({ where: { id } });

    // If we deleted the default vehicle, mark the next available one as default
    if (vehicle.isDefault) {
      const nextVehicle = await prisma.userVehicle.findFirst({
        where: { userId: req.user.id },
      });
      if (nextVehicle) {
        await prisma.userVehicle.update({
          where: { id: nextVehicle.id },
          data: { isDefault: true },
        });
      }
    }

    return res.json({ success: true, message: 'Vehicle removed from garage' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Helper lookup data endpoints for driving UI filters
export const getManufacturers = async (req: AuthRequest, res: Response) => {
  try {
    const manufacturers = await prisma.manufacturer.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: manufacturers });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const getModels = async (req: AuthRequest, res: Response) => {
  try {
    const { manufacturerId } = req.query;
    const models = await prisma.vehicleModel.findMany({
      where: manufacturerId ? { manufacturerId: String(manufacturerId) } : {},
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: models });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const getVariants = async (req: AuthRequest, res: Response) => {
  try {
    const { modelYearId } = req.query;
    const variants = await prisma.vehicleVariant.findMany({
      where: modelYearId ? { modelYearId: String(modelYearId) } : {},
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: variants });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

// Manufacturer CRUD
export const createManufacturer = async (req: AuthRequest, res: Response) => {
  try {
    const { name, logoUrl } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Manufacturer name is required.' });
    }

    const manufacturer = await prisma.manufacturer.create({
      data: { name, logoUrl },
    });
    return res.status(201).json({ success: true, data: manufacturer });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateManufacturer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, logoUrl } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Manufacturer name is required.' });
    }

    const manufacturer = await prisma.manufacturer.update({
      where: { id },
      data: { name, logoUrl },
    });
    return res.json({ success: true, data: manufacturer });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const deleteManufacturer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const modelsCount = await prisma.vehicleModel.count({ where: { manufacturerId: id } });
    if (modelsCount > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete Manufacturer: Models exist for this manufacturer.' });
    }

    await prisma.manufacturer.delete({ where: { id } });
    return res.json({ success: true, message: 'Manufacturer deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Model CRUD
export const createModel = async (req: AuthRequest, res: Response) => {
  try {
    const { manufacturerId, name } = req.body;
    if (!manufacturerId || !name) {
      return res.status(400).json({ success: false, message: 'Manufacturer ID and model name are required.' });
    }

    const model = await prisma.vehicleModel.create({
      data: { manufacturerId, name },
    });
    return res.status(201).json({ success: true, data: model });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateModel = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Model name is required.' });
    }

    const model = await prisma.vehicleModel.update({
      where: { id },
      data: { name },
    });
    return res.json({ success: true, data: model });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const deleteModel = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const yearsCount = await prisma.vehicleModelYear.count({ where: { modelId: id } });
    if (yearsCount > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete Model: Model Years exist for this model.' });
    }

    await prisma.vehicleModel.delete({ where: { id } });
    return res.json({ success: true, message: 'Model deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Model Year CRUD
export const getModelYears = async (req: AuthRequest, res: Response) => {
  try {
    const { modelId } = req.query;
    const years = await prisma.vehicleModelYear.findMany({
      where: modelId ? { modelId: String(modelId) } : {},
      orderBy: { startYear: 'desc' },
    });

    const mapped = years.map(y => ({
      ...y,
      year: y.startYear === y.endYear ? String(y.startYear) : `${y.startYear}-${y.endYear}`
    }));

    return res.json({ success: true, data: mapped });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const createModelYear = async (req: AuthRequest, res: Response) => {
  try {
    const { modelId, year } = req.body;
    if (!modelId || year === undefined) {
      return res.status(400).json({ success: false, message: 'Model ID and Year/Range are required.' });
    }

    const yearStr = String(year).trim();
    let startYear: number;
    let endYear: number;

    const rangeRegex = /^(\d{4})-(\d{4})$/;
    const singleRegex = /^(\d{4})$/;

    if (rangeRegex.test(yearStr)) {
      const match = yearStr.match(rangeRegex);
      if (match) {
        startYear = parseInt(match[1]);
        endYear = parseInt(match[2]);
      } else {
        return res.status(400).json({ success: false, message: 'Invalid year format. Must be YYYY or YYYY-YYYY.' });
      }
    } else if (singleRegex.test(yearStr)) {
      const val = parseInt(yearStr);
      startYear = val;
      endYear = val;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid year format. Must be YYYY or YYYY-YYYY.' });
    }

    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 2;

    if (startYear < 1950 || startYear > maxYear || endYear < 1950 || endYear > maxYear) {
      return res.status(400).json({ success: false, message: `Model Years must be between 1950 and ${maxYear}.` });
    }

    if (startYear > endYear) {
      return res.status(400).json({ success: false, message: 'Start year cannot be greater than end year.' });
    }

    // Check duplicate range
    const existing = await prisma.vehicleModelYear.findFirst({
      where: { modelId, startYear, endYear }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'This Model Year Range is already registered for this model.' });
    }

    const modelYear = await prisma.vehicleModelYear.create({
      data: { modelId, startYear, endYear }
    });

    const mapped = {
      ...modelYear,
      year: modelYear.startYear === modelYear.endYear ? String(modelYear.startYear) : `${modelYear.startYear}-${modelYear.endYear}`
    };

    return res.status(201).json({ success: true, data: mapped });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateModelYear = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { year } = req.body;
    if (year === undefined) {
      return res.status(400).json({ success: false, message: 'Year/Range is required.' });
    }

    const yearStr = String(year).trim();
    let startYear: number;
    let endYear: number;

    const rangeRegex = /^(\d{4})-(\d{4})$/;
    const singleRegex = /^(\d{4})$/;

    if (rangeRegex.test(yearStr)) {
      const match = yearStr.match(rangeRegex);
      if (match) {
        startYear = parseInt(match[1]);
        endYear = parseInt(match[2]);
      } else {
        return res.status(400).json({ success: false, message: 'Invalid year format. Must be YYYY or YYYY-YYYY.' });
      }
    } else if (singleRegex.test(yearStr)) {
      const val = parseInt(yearStr);
      startYear = val;
      endYear = val;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid year format. Must be YYYY or YYYY-YYYY.' });
    }

    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 2;

    if (startYear < 1950 || startYear > maxYear || endYear < 1950 || endYear > maxYear) {
      return res.status(400).json({ success: false, message: `Model Years must be between 1950 and ${maxYear}.` });
    }

    if (startYear > endYear) {
      return res.status(400).json({ success: false, message: 'Start year cannot be greater than end year.' });
    }

    const currentYearRecord = await prisma.vehicleModelYear.findUnique({ where: { id } });
    if (!currentYearRecord) {
      return res.status(404).json({ success: false, message: 'Model Year record not found.' });
    }

    // Check duplicate range excluding self
    const duplicate = await prisma.vehicleModelYear.findFirst({
      where: {
        id: { not: id },
        modelId: currentYearRecord.modelId,
        startYear,
        endYear
      }
    });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'This Model Year Range is already registered for this model.' });
    }

    const modelYear = await prisma.vehicleModelYear.update({
      where: { id },
      data: { startYear, endYear }
    });

    const mapped = {
      ...modelYear,
      year: modelYear.startYear === modelYear.endYear ? String(modelYear.startYear) : `${modelYear.startYear}-${modelYear.endYear}`
    };

    return res.json({ success: true, data: mapped });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const deleteModelYear = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const variantsCount = await prisma.vehicleVariant.count({ where: { modelYearId: id } });
    if (variantsCount > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete Model Year: Engine variants exist for this year.' });
    }

    await prisma.vehicleModelYear.delete({ where: { id } });
    return res.json({ success: true, message: 'Model Year deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Engine Variant CRUD
export const createVariant = async (req: AuthRequest, res: Response) => {
  try {
    const { modelYearId, name, fuelType } = req.body;
    if (!modelYearId || !name) {
      return res.status(400).json({ success: false, message: 'Model Year ID and Engine Variant name are required.' });
    }

    const variant = await prisma.vehicleVariant.create({
      data: {
        modelYearId,
        name,
        fuelType: fuelType || 'Petrol'
      },
    });
    return res.status(201).json({ success: true, data: variant });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateVariant = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, fuelType } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Engine Variant name is required.' });
    }

    const data: any = { name };
    if (fuelType) data.fuelType = fuelType;

    const variant = await prisma.vehicleVariant.update({
      where: { id },
      data,
    });
    return res.json({ success: true, data: variant });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const deleteVariant = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const compatCount = await prisma.productVehicleCompatibility.count({ where: { engineVariantId: id } });
    if (compatCount > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete Engine Variant: It is linked to products as compatible.' });
    }

    await prisma.vehicleVariant.delete({ where: { id } });
    return res.json({ success: true, message: 'Engine Variant deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
