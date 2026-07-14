import { Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// List products with optional search, categories, and smart vehicle compatibility filtering
export const getProducts = async (req: Request, res: Response) => {
  try {
    const {
      search,
      category,
      brand,
      flashSale,
      all,
      // Compatibility legacy query parameters
      make,
      model,
      variant,
      fuelType,
      year,
      // Compatibility ID parameters
      manufacturerId,
      modelId,
      modelYearId,
      engineVariantId,
      variantId
    } = req.query;

    const whereClause: any = {};
    if (all !== 'true') {
      whereClause.status = 'PUBLISHED';
      whereClause.brand = { isActive: true };
    }

    // 1. Category filter
    if (category) {
      whereClause.category = { slug: String(category) };
    } else if (req.query.categoryId) {
      whereClause.categoryId = String(req.query.categoryId);
    }

    // 2. Brand filter
    if (brand) {
      whereClause.brand = {
        ...(whereClause.brand || {}),
        name: String(brand)
      };
    }

    // 3. Flash sale filter
    if (flashSale === 'true') {
      whereClause.isFlashSale = true;
    }

    // 4. Keyword search
    if (search) {
      const keyword = String(search);
      whereClause.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { sku: { contains: keyword, mode: 'insensitive' } },
        { oemNumber: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { brand: { name: { contains: keyword, mode: 'insensitive' } } },
        { category: { name: { contains: keyword, mode: 'insensitive' } } },
      ];
    }

    // 5. Smart Vehicle Compatibility Filter (Crucial Feature)
    const targetVariantId = engineVariantId || variantId;
    if (manufacturerId && modelId && modelYearId && targetVariantId) {
      whereClause.compatibilities = {
        some: {
          manufacturerId: String(manufacturerId),
          modelId: String(modelId),
          modelYearId: String(modelYearId),
          engineVariantId: String(targetVariantId)
        }
      };
    } else if (make && model && variant && fuelType) {
      const yearVal = year ? parseInt(String(year)) : undefined;
      // Find the variant matching these text credentials in the DB
      const dbVariant = await prisma.vehicleVariant.findFirst({
        where: {
          name: String(variant),
          fuelType: String(fuelType),
          modelYear: {
            startYear: yearVal ? { lte: yearVal } : undefined,
            endYear: yearVal ? { gte: yearVal } : undefined,
            model: {
              name: String(model),
              manufacturer: {
                name: String(make)
              }
            }
          }
        }
      });

      if (dbVariant) {
        whereClause.compatibilities = {
          some: {
            engineVariantId: dbVariant.id
          }
        };
      } else {
        return res.json({ success: true, data: [], message: 'Vehicle configuration not registered' });
      }
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        brand: true,
        category: true,
        images: { orderBy: { displayOrder: 'asc' } },
        oemNumbers: true,
        compatibilities: {
          include: {
            model: true,
            engineVariant: {
              include: {
                modelYear: {
                  include: {
                    model: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: products });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Get product details by ID
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        images: { orderBy: { displayOrder: 'asc' } },
        specifications: true,
        oemNumbers: true,
        reviews: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        compatibilities: {
          include: {
            engineVariant: {
              include: {
                modelYear: {
                  include: {
                    model: {
                      include: {
                        manufacturer: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        status: 'PUBLISHED'
      },
      take: 5,
      include: {
        brand: true,
        category: true,
        images: { orderBy: { displayOrder: 'asc' } }
      }
    });

    const responsePayload = {
      ...product,
      relatedProducts
    };

    return res.json({ success: true, data: responsePayload });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Create a product review
export const addReview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { productId } = req.params;
    const { rating, comment, images } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ success: false, message: 'Rating and comment are required' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const review = await prisma.review.create({
      data: {
        productId,
        userId: req.user.id,
        rating: parseInt(rating),
        comment,
        images: images || [],
      },
    });

    // Update product rating average
    const allReviews = await prisma.review.findMany({
      where: { productId },
      select: { rating: true },
    });

    const averageRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: averageRating,
        reviewCount: allReviews.length,
      },
    });

    return res.status(201).json({ success: true, data: review });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Get categories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const { all } = req.query;
    const whereClause: any = { parentId: null };
    if (all !== 'true') {
      whereClause.isActive = true;
    }

    const categories = await prisma.category.findMany({
      where: whereClause,
      include: {
        children: true,
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: categories });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Get brands
export const getBrands = async (req: Request, res: Response) => {
  try {
    const { all } = req.query;
    const whereClause = all === 'true' ? {} : { isActive: true };

    const brands = await prisma.brand.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });

    const data = await Promise.all(
      brands.map(async (b) => {
        const productsCount = await prisma.product.count({ where: { brandId: b.id } });
        return {
          ...b,
          productsCount
        };
      })
    );

    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Create a new brand (Admin only)
export const createBrand = async (req: AuthRequest, res: Response) => {
  try {
    const { name, logoUrl, isActive, description, website } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Brand name is required' });
    }

    const existing = await prisma.brand.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Brand name must be unique' });
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        logoUrl: logoUrl || null,
        isActive: isActive !== undefined ? !!isActive : true,
        description: description || null,
        website: website || null
      }
    });

    return res.status(201).json({ success: true, data: brand });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Update an existing brand (Admin only)
export const updateBrand = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, logoUrl, isActive, description, website } = req.body;

    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    if (name && name !== brand.name) {
      const existing = await prisma.brand.findUnique({ where: { name } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Brand name must be unique' });
      }
    }

    const updated = await prisma.brand.update({
      where: { id },
      data: {
        name: name !== undefined ? name : brand.name,
        logoUrl: logoUrl !== undefined ? logoUrl : brand.logoUrl,
        isActive: isActive !== undefined ? !!isActive : brand.isActive,
        description: description !== undefined ? description : brand.description,
        website: website !== undefined ? website : brand.website
      }
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Delete an existing brand (Admin only)
export const deleteBrand = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const productsCount = await prisma.product.count({ where: { brandId: id } });
    if (productsCount > 0) {
      return res.status(400).json({ success: false, message: 'Brand cannot be deleted: it is linked to existing products' });
    }

    await prisma.brand.delete({ where: { id } });
    return res.json({ success: true, message: 'Brand deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Create product (Vendor/Admin endpoint)
export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      name,
      sku,
      oemNumber,
      oemNumbers,
      description,
      price,
      mrp,
      discount,
      stock,
      minStockAlert,
      maxStock,
      warehouseBin,
      shelfNumber,
      status,
      specifications,
      brandId,
      categoryId,
      images,
      returnPolicy,
      deliveryTime,
      variantIds // Array of variant IDs for compatibility mapping
    } = req.body;

    if (!name || !sku || !description || !price || !mrp || !brandId || !categoryId) {
      return res.status(400).json({ success: false, message: 'Missing required product parameters' });
    }

    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Product with SKU ${sku} already exists` });
    }

    const parsedOemNumbers = oemNumbers && Array.isArray(oemNumbers) ? oemNumbers : (oemNumber ? [oemNumber] : []);
    const parsedOemNumber = parsedOemNumbers.length > 0 ? parsedOemNumbers[0] : (oemNumber || null);

    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name,
          sku,
          oemNumber: parsedOemNumber,
          description,
          price: parseFloat(price),
          mrp: parseFloat(mrp),
          discount: discount ? parseFloat(discount) : 0,
          stock: stock ? parseInt(stock) : 0,
          minStockAlert: minStockAlert ? parseInt(minStockAlert) : 5,
          maxStock: maxStock ? parseInt(maxStock) : 100,
          warehouseBin: warehouseBin || 'A-1',
          shelfNumber: shelfNumber || 'S-1',
          status: status || 'PUBLISHED',
          brandId,
          categoryId,
          returnPolicy: returnPolicy || '7 Days Return',
          deliveryTime: deliveryTime || '15 mins',
          images: {
            create: images && Array.isArray(images) && images.length > 0
              ? images.map((img: string, idx: number) => ({
                  imageUrl: img,
                  displayOrder: idx,
                  isPrimary: idx === 0
                }))
              : [{ imageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=500', displayOrder: 0, isPrimary: true }]
          },
          oemNumbers: {
            create: parsedOemNumbers.map((oem: string) => ({ oemNumber: oem }))
          },
          specifications: {
            create: specifications && typeof specifications === 'object'
              ? Object.entries(specifications).map(([key, val]) => ({
                  specificationKey: key,
                  specificationValue: String(val)
                }))
              : []
          }
        }
      });

      if (variantIds && Array.isArray(variantIds)) {
        for (const variantId of variantIds) {
          const variantObj = await tx.vehicleVariant.findUnique({
            where: { id: variantId },
            include: {
              modelYear: {
                include: {
                  model: true
                }
              }
            }
          });
          if (variantObj) {
            await tx.productVehicleCompatibility.create({
              data: {
                productId: newProduct.id,
                manufacturerId: variantObj.modelYear.model.manufacturerId,
                modelId: variantObj.modelYear.modelId,
                modelYearId: variantObj.modelYearId,
                engineVariantId: variantId
              }
            });
          }
        }
      }

      return newProduct;
    });

    return res.status(201).json({ success: true, data: product });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Update product stock (Vendor/Admin endpoint)
export const updateProductStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (stock === undefined) {
      return res.status(400).json({ success: false, message: 'Stock value is required' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { stock: parseInt(stock) }
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// ──────────────────────────────────────────────
// HOME SCREEN APIs
// ──────────────────────────────────────────────

const productInclude = {
  brand: true,
  category: true,
  images: { orderBy: { displayOrder: 'asc' as const } },
  oemNumbers: true,
};

// Unified Home Screen Data (single API call)
export const getHomeData = async (req: Request, res: Response) => {
  try {
    const { manufacturerId, modelId, modelYearId, variantId } = req.query;

    // 1. Active banners
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    // 2. Active categories with product count
    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });

    // 3. Featured products
    const featuredProducts = await prisma.product.findMany({
      where: { status: 'PUBLISHED', isFeatured: true, brand: { isActive: true } },
      take: 10,
      include: productInclude,
      orderBy: { createdAt: 'desc' },
    });

    // 4. Flash deals
    const flashDeals = await prisma.product.findMany({
      where: { status: 'PUBLISHED', isFlashSale: true, brand: { isActive: true } },
      take: 10,
      include: productInclude,
      orderBy: { discount: 'desc' },
    });

    // 5. New arrivals
    const newArrivals = await prisma.product.findMany({
      where: { status: 'PUBLISHED', brand: { isActive: true } },
      take: 10,
      include: productInclude,
      orderBy: { createdAt: 'desc' },
    });

    // 6. Recommended for vehicle (if vehicle params provided)
    let recommendedProducts: any[] = [];
    const targetVariantId = variantId;
    if (manufacturerId && modelId && modelYearId && targetVariantId) {
      recommendedProducts = await prisma.product.findMany({
        where: {
          status: 'PUBLISHED',
          brand: { isActive: true },
          compatibilities: {
            some: {
              manufacturerId: String(manufacturerId),
              modelId: String(modelId),
              modelYearId: String(modelYearId),
              engineVariantId: String(targetVariantId),
            },
          },
        },
        take: 10,
        include: productInclude,
        orderBy: { createdAt: 'desc' },
      });
    }

    return res.json({
      success: true,
      data: {
        banners,
        categories,
        featuredProducts,
        flashDeals,
        newArrivals,
        recommendedProducts,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Get active/all banners
export const getBanners = async (req: Request, res: Response) => {
  try {
    const { all } = req.query;
    const whereClause = all === 'true' ? {} : { isActive: true };
    const banners = await prisma.banner.findMany({
      where: whereClause,
      orderBy: { displayOrder: 'asc' },
    });
    return res.json({ success: true, data: banners });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Get featured products
export const getFeaturedProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'PUBLISHED', isFeatured: true, brand: { isActive: true } },
      take: 10,
      include: productInclude,
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: products });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Get flash deal products
export const getFlashDeals = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'PUBLISHED', isFlashSale: true, brand: { isActive: true } },
      take: 10,
      include: productInclude,
      orderBy: { discount: 'desc' },
    });
    return res.json({ success: true, data: products });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Get new arrivals
export const getNewArrivals = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'PUBLISHED', brand: { isActive: true } },
      take: 10,
      include: productInclude,
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: products });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Update category (Admin - image, status management)
export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, imageUrl, iconUrl, isActive } = req.body;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (iconUrl !== undefined) data.iconUrl = iconUrl;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.category.update({ where: { id }, data });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Banner CRUD (Admin)
export const createBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { title, subtitle, imageUrl, linkType, linkValue, displayOrder } = req.body;
    if (!title || !imageUrl) {
      return res.status(400).json({ success: false, message: 'Title and imageUrl are required' });
    }
    const banner = await prisma.banner.create({
      data: {
        title,
        subtitle: subtitle || null,
        imageUrl,
        linkType: linkType || 'none',
        linkValue: linkValue || null,
        displayOrder: displayOrder || 0,
      },
    });
    return res.status(201).json({ success: true, data: banner });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, subtitle, imageUrl, linkType, linkValue, isActive, displayOrder } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (subtitle !== undefined) data.subtitle = subtitle;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (linkType !== undefined) data.linkType = linkType;
    if (linkValue !== undefined) data.linkValue = linkValue;
    if (isActive !== undefined) data.isActive = isActive;
    if (displayOrder !== undefined) data.displayOrder = displayOrder;

    const banner = await prisma.banner.update({ where: { id }, data });
    return res.json({ success: true, data: banner });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const deleteBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.banner.delete({ where: { id } });
    return res.json({ success: true, message: 'Banner deleted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

