import { PrismaClient, Role, PartnerStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MechBazar database...');

  // Wipe existing tables to ensure a clean state
  await prisma.productVehicleCompatibility.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.userVehicle.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.vehicleVariant.deleteMany({});
  await prisma.vehicleModelYear.deleteMany({});
  await prisma.vehicleModel.deleteMany({});
  await prisma.manufacturer.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.coupon.deleteMany({});
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password@123', salt);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mechbazar.com' },
    update: {},
    create: {
      email: 'admin@mechbazar.com',
      phone: '+919999999999',
      name: 'MechBazar Admin',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  // Vendor
  const vendor = await prisma.user.upsert({
    where: { email: 'vendor@mechbazar.com' },
    update: {},
    create: {
      email: 'vendor@mechbazar.com',
      phone: '+918888888888',
      name: 'Rana Auto Parts (Vendor)',
      passwordHash,
      role: Role.VENDOR,
    },
  });

  // Customer
  const customer = await prisma.user.upsert({
    where: { email: 'customer@mechbazar.com' },
    update: {},
    create: {
      email: 'customer@mechbazar.com',
      phone: '+917777777777',
      name: 'Vivek Kumar',
      passwordHash,
      role: Role.CUSTOMER,
      wallet: {
        create: {
          balance: 1500.0,
          points: 120,
        },
      },
    },
  });

  // Default address for customer
  const customerAddress = await prisma.address.create({
    data: {
      userId: customer.id,
      title: 'Home',
      addressLine1: 'Flat 402, Sunshine Apartments',
      addressLine2: 'Sector 62, Noida',
      city: 'Noida',
      state: 'Uttar Pradesh',
      zipCode: '201301',
      latitude: 28.5355,
      longitude: 77.3910,
      isDefault: true,
    },
  });

  // Delivery Partner
  const deliveryUser = await prisma.user.upsert({
    where: { email: 'delivery@mechbazar.com' },
    update: {},
    create: {
      email: 'delivery@mechbazar.com',
      phone: '+916666666666',
      name: 'Rahul Sharma',
      passwordHash,
      role: Role.DELIVERY,
    },
  });

  const deliveryPartner = await prisma.deliveryPartner.upsert({
    where: { userId: deliveryUser.id },
    update: {},
    create: {
      userId: deliveryUser.id,
      vehicleNumber: 'UP-16-AB-1234',
      vehicleType: 'Motorcycle',
      licenseNumber: 'DL-1620220004561',
      rating: 4.8,
      status: PartnerStatus.ONLINE,
      verified: true,
      location: {
        create: {
          latitude: 28.5370,
          longitude: 77.3930,
        },
      },
    },
  });

  console.log('Seeded Users: Admin, Vendor, Customer, Delivery Partner');

  // 2. Create Manufacturers, Models, Model Years, and Variants
  const manufacturersData = [
    {
      name: 'Toyota',
      models: [
        {
          name: 'Fortuner',
          years: [
            {
              startYear: 2021,
              endYear: 2026,
              variants: [
                { name: '2.8L Sigma 4', fuelType: 'Diesel' },
                { name: '2.7L 2WD', fuelType: 'Petrol' },
              ]
            },
            {
              startYear: 2016,
              endYear: 2020,
              variants: [
                { name: '2.8L 2WD', fuelType: 'Diesel' }
              ]
            }
          ]
        },
        {
          name: 'Innova Crysta',
          years: [
            {
              startYear: 2016,
              endYear: 2020,
              variants: [
                { name: '2.4L VX', fuelType: 'Diesel' }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'Maruti Suzuki',
      models: [
        {
          name: 'Swift',
          years: [
            {
              startYear: 2021,
              endYear: 2026,
              variants: [
                { name: '1.2L DualJet LXI/VXI', fuelType: 'Petrol' }
              ]
            }
          ]
        },
        {
          name: 'Baleno',
          years: [
            {
              startYear: 2021,
              endYear: 2026,
              variants: [
                { name: '1.2L Delta/Zeta', fuelType: 'Petrol' }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'Honda',
      models: [
        {
          name: 'City',
          years: [
            {
              startYear: 2021,
              endYear: 2026,
              variants: [
                { name: '1.5L i-VTEC V/VX', fuelType: 'Petrol' },
                { name: '1.5L i-DTEC VX', fuelType: 'Diesel' }
              ]
            }
          ]
        }
      ]
    }
  ];

  const variantsMap: { [key: string]: string } = {};
  const variantMetadataMap: { [key: string]: { id: string, manufacturerId: string, modelId: string, modelYearId: string } } = {};

  let defaultCustomerMfgId = '';
  let defaultCustomerModelId = '';
  let defaultCustomerYearId = '';
  let defaultCustomerVariantId = '';

  for (const mfg of manufacturersData) {
    const manufacturer = await prisma.manufacturer.upsert({
      where: { name: mfg.name },
      update: {},
      create: { name: mfg.name },
    });

    if (mfg.name === 'Toyota') defaultCustomerMfgId = manufacturer.id;

    for (const mdl of mfg.models) {
      const model = await prisma.vehicleModel.upsert({
        where: {
          manufacturerId_name: {
            manufacturerId: manufacturer.id,
            name: mdl.name,
          },
        },
        update: {},
        create: {
          manufacturerId: manufacturer.id,
          name: mdl.name,
        },
      });

      if (mfg.name === 'Toyota' && mdl.name === 'Fortuner') defaultCustomerModelId = model.id;

      for (const yr of mdl.years) {
        const modelYear = await prisma.vehicleModelYear.upsert({
          where: {
            modelId_startYear_endYear: {
              modelId: model.id,
              startYear: yr.startYear,
              endYear: yr.endYear
            }
          },
          update: {},
          create: {
            modelId: model.id,
            startYear: yr.startYear,
            endYear: yr.endYear
          }
        });

        if (mfg.name === 'Toyota' && mdl.name === 'Fortuner' && yr.startYear <= 2022 && yr.endYear >= 2022) {
          defaultCustomerYearId = modelYear.id;
        }

        for (const vrt of yr.variants) {
          const variant = await prisma.vehicleVariant.upsert({
            where: {
              modelYearId_name_fuelType: {
                modelYearId: modelYear.id,
                name: vrt.name,
                fuelType: vrt.fuelType,
              },
            },
            update: {},
            create: {
              modelYearId: modelYear.id,
              name: vrt.name,
              fuelType: vrt.fuelType,
            },
          });

          if (mfg.name === 'Toyota' && mdl.name === 'Fortuner' && yr.startYear <= 2022 && yr.endYear >= 2022 && vrt.name === '2.8L Sigma 4') {
            defaultCustomerVariantId = variant.id;
          }

          // Map the variant ID for every year in between to support legacy queries and product linkages
          for (let y = yr.startYear; y <= yr.endYear; y++) {
            const key = `${mfg.name}-${mdl.name}-${y}-${vrt.name}-${vrt.fuelType}`;
            variantsMap[key] = variant.id;
            variantMetadataMap[key] = {
              id: variant.id,
              manufacturerId: manufacturer.id,
              modelId: model.id,
              modelYearId: modelYear.id
            };
          }
        }
      }
    }
  }

  console.log('Seeded Manufacturers, Models, Model Years, and Variants');

  // Customer vehicle garage seed
  await prisma.userVehicle.create({
    data: {
      userId: customer.id,
      registrationNumber: 'DL-3C-AS-7777',
      make: 'Toyota',
      model: 'Fortuner',
      variant: '2.8L Sigma 4',
      fuelType: 'Diesel',
      year: 2022,
      isDefault: true,
      manufacturerId: defaultCustomerMfgId || null,
      modelId: defaultCustomerModelId || null,
      modelYearId: defaultCustomerYearId || null,
      variantId: defaultCustomerVariantId || null,
    },
  });

  // 3. Create Brands & Categories
  const brands = [
    { name: 'Bosch', logoUrl: 'https://logo.clearbit.com/bosch.com', description: 'Premium German automotive engineering parts and brake pads.', website: 'https://www.bosch.com' },
    { name: 'Mobil1', logoUrl: 'https://logo.clearbit.com/mobil.com', description: 'Advanced synthetic motor oil and engine lubricants.', website: 'https://www.mobil.com' },
    { name: 'Castrol', logoUrl: 'https://logo.clearbit.com/castrol.com', description: 'World-leading manufacturer of premium lubricants and motor oils.', website: 'https://www.castrol.com' },
    { name: 'Philips', logoUrl: 'https://logo.clearbit.com/philips.com', description: 'High-performance automotive halogen and LED lighting.', website: 'https://www.philips.com' },
    { name: 'Amaron', logoUrl: 'https://logo.clearbit.com/amara-raja.com', description: 'Long-lasting, zero-maintenance automotive batteries.', website: 'https://www.amaron.in' },
    { name: 'NGK', logoUrl: 'https://logo.clearbit.com/ngksparkplugs.com', description: 'Top quality spark plugs and oxygen sensors.', website: 'https://www.ngkntk.com' },
    { name: 'Brembo', logoUrl: 'https://logo.clearbit.com/brembo.com', description: 'World leader in high-performance braking systems.', website: 'https://www.brembo.com' }
  ];
  const brandMap: { [key: string]: string } = {};

  for (const b of brands) {
    const brandRecord = await prisma.brand.upsert({
      where: { name: b.name },
      update: {
        logoUrl: b.logoUrl,
        description: b.description,
        website: b.website,
        isActive: true
      },
      create: {
        name: b.name,
        logoUrl: b.logoUrl,
        description: b.description,
        website: b.website,
        isActive: true
      },
    });
    brandMap[b.name] = brandRecord.id;
  }

  const categories = [
    { name: 'Filters', slug: 'filters', imageUrl: 'https://images.unsplash.com/photo-1635784536760-23e9f986ee8e?w=200', iconUrl: null },
    { name: 'Brake System', slug: 'brakes', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200', iconUrl: null },
    { name: 'Electricals & Battery', slug: 'electricals', imageUrl: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=200', iconUrl: null },
    { name: 'Oils & Lubricants', slug: 'lubricants', imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=200', iconUrl: null },
    { name: 'Engine Parts', slug: 'engine-parts', imageUrl: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=200', iconUrl: null },
    { name: 'Accessories', slug: 'accessories', imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200', iconUrl: null },
    { name: 'Suspension', slug: 'suspension', imageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=200', iconUrl: null },
    { name: 'Lighting', slug: 'lighting', imageUrl: 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?w=200', iconUrl: null },
    { name: 'Cooling System', slug: 'cooling', imageUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=200', iconUrl: null },
  ];
  const catMap: { [key: string]: string } = {};

  for (const cat of categories) {
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      update: { imageUrl: cat.imageUrl, isActive: true },
      create: { name: cat.name, slug: cat.slug, imageUrl: cat.imageUrl, isActive: true },
    });
    catMap[cat.name] = c.id;
  }

  console.log('Seeded Brands & Categories');

  // 4. Create Warehouse
  const warehouse = await prisma.warehouse.create({
    data: {
      name: 'Noida Warehouse Sector 63',
      address: 'H-12, Sector 63, Noida, UP',
      latitude: 28.6253,
      longitude: 77.3824,
    },
  });

  // 5. Create Products & Compatibility
  const productsData = [
    {
      name: 'Bosch Premium Brake Pads (Front)',
      sku: 'BOS-BP-FR-09',
      oemNumber: '04465-0K340',
      description: 'High performance ceramic brake pads offering excellent stopping power, low dust, and quiet operations for premium SUVs.',
      price: 2450.0,
      mrp: 3200.0,
      discount: 23.4,
      brandName: 'Bosch',
      categoryName: 'Brake System',
      stock: 45,
      images: ['https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=500'],
      compatibilities: [
        'Toyota-Fortuner-2022-2.8L Sigma 4-Diesel',
        'Toyota-Fortuner-2022-2.7L 2WD-Petrol',
        'Toyota-Innova Crysta-2020-2.4L VX-Diesel',
      ],
    },
    {
      name: 'Bosch Premium Brake Pads (Swift)',
      sku: 'BOS-BP-SW-11',
      oemNumber: '55810-74P00',
      description: 'Bosch brake pads for Swift. Heavy duty performance, long life, and reliable braking under extreme temperatures.',
      price: 1100.0,
      mrp: 1450.0,
      discount: 24.1,
      brandName: 'Bosch',
      categoryName: 'Brake System',
      stock: 120,
      images: ['https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=500'],
      compatibilities: [
        'Maruti Suzuki-Swift-2021-1.2L DualJet LXI/VXI-Petrol',
        'Maruti Suzuki-Baleno-2021-1.2L Delta/Zeta-Petrol',
      ],
    },
    {
      name: 'Mobil1 Synthetic Engine Oil 5W-30 (4L)',
      sku: 'MOB-5W30-SYN-4L',
      description: 'Advanced full synthetic motor oil designed to keep your engine running like new by providing exceptional wear protection, cleaning power, and overall performance.',
      price: 3600.0,
      mrp: 4500.0,
      discount: 20.0,
      brandName: 'Mobil1',
      categoryName: 'Oils & Lubricants',
      stock: 35,
      images: ['https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500'],
      compatibilities: [
        'Toyota-Fortuner-2022-2.7L 2WD-Petrol',
        'Honda-City-2021-1.5L i-VTEC V/VX-Petrol',
        'Maruti Suzuki-Swift-2021-1.2L DualJet LXI/VXI-Petrol',
        'Maruti Suzuki-Baleno-2021-1.2L Delta/Zeta-Petrol',
      ],
    },
    {
      name: 'Castrol Magnatec Diesel 15W-40 (5L)',
      sku: 'CAS-15W40-DI-5L',
      description: 'Castrol Magnatec Diesel combines intelligent molecules with synthetic technology for a stronger layer of protection from the moment you turn the key.',
      price: 2850.0,
      mrp: 3400.0,
      discount: 16.1,
      brandName: 'Castrol',
      categoryName: 'Oils & Lubricants',
      stock: 50,
      images: ['https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500'],
      compatibilities: [
        'Toyota-Fortuner-2022-2.8L Sigma 4-Diesel',
        'Toyota-Innova Crysta-2020-2.4L VX-Diesel',
        'Honda-City-2021-1.5L i-DTEC VX-Diesel',
      ],
    },
    {
      name: 'Bosch Premium Cabin Air Filter',
      sku: 'BOS-AF-CAB-44',
      oemNumber: '87139-06080',
      description: 'Removes 99% of airborne particles, dust, pollen, and other pollutants to maintain clean air inside the cabin.',
      price: 490.0,
      mrp: 650.0,
      discount: 24.6,
      brandName: 'Bosch',
      categoryName: 'Filters',
      stock: 80,
      images: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500'],
      compatibilities: [
        'Toyota-Fortuner-2022-2.8L Sigma 4-Diesel',
        'Toyota-Fortuner-2022-2.7L 2WD-Petrol',
        'Toyota-Innova Crysta-2020-2.4L VX-Diesel',
      ],
    },
    {
      name: 'Bosch Cabin Air Filter (Honda City)',
      sku: 'BOS-AF-CAB-55',
      oemNumber: '80291-T5R-A01',
      description: 'Bosch cabin filter offering multi-layer media filtering and charcoal odor absorption for Honda City cars.',
      price: 420.0,
      mrp: 550.0,
      discount: 23.6,
      brandName: 'Bosch',
      categoryName: 'Filters',
      stock: 65,
      images: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500'],
      compatibilities: [
        'Honda-City-2021-1.5L i-VTEC V/VX-Petrol',
        'Honda-City-2021-1.5L i-DTEC VX-Diesel',
      ],
    },
    {
      name: 'Amaron Hi-Way Battery (AHL-BH-82L)',
      sku: 'AMA-HW-82L',
      description: 'High endurance Amaron battery designed to provide superior starting power, high vibration resistance, and zero maintenance. Factory charged and ready for heavy duty diesel SUVs.',
      price: 6800.0,
      mrp: 8500.0,
      discount: 20.0,
      brandName: 'Amaron',
      categoryName: 'Electricals & Battery',
      stock: 20,
      images: ['https://images.unsplash.com/photo-1617400324467-33f7c469b618?w=500'],
      compatibilities: [
        'Toyota-Fortuner-2022-2.8L Sigma 4-Diesel',
        'Toyota-Innova Crysta-2020-2.4L VX-Diesel',
      ],
    },
    {
      name: 'Philips CrystalVision Ultra Headlight Bulb H4',
      sku: 'PHI-H4-CVU',
      description: 'Halogen headlight bulb delivering a bright white 4300K light output, giving the appearance of HID bulbs with improved night visibility.',
      price: 750.0,
      mrp: 1100.0,
      discount: 31.8,
      brandName: 'Philips',
      categoryName: 'Electricals & Battery',
      stock: 150,
      images: ['https://images.unsplash.com/photo-1518684079-3c830dcef090?w=500'],
      compatibilities: [
        'Maruti Suzuki-Swift-2021-1.2L DualJet LXI/VXI-Petrol',
        'Honda-City-2021-1.5L i-VTEC V/VX-Petrol',
      ],
    },
  ];

  for (const prod of productsData) {
    const product = await prisma.product.create({
      data: {
        name: prod.name,
        sku: prod.sku,
        oemNumber: prod.oemNumber || null,
        description: prod.description,
        price: prod.price,
        mrp: prod.mrp,
        discount: prod.discount,
        brandId: brandMap[prod.brandName],
        categoryId: catMap[prod.categoryName],
        stock: prod.stock,
        minStockAlert: 10,
        maxStock: 250,
        warehouseBin: 'Bin-A2',
        shelfNumber: 'Shelf-S3',
        status: 'PUBLISHED',
        images: {
          create: prod.images.map((img: string, idx: number) => ({
            imageUrl: img,
            displayOrder: idx,
            isPrimary: idx === 0
          }))
        },
        oemNumbers: {
          create: prod.oemNumber ? [{ oemNumber: prod.oemNumber }] : []
        },
        specifications: {
          create: [
            { specificationKey: 'Material', specificationValue: 'Premium OEM Grade' },
            { specificationKey: 'Warranty', specificationValue: '1 Year Warranty' },
            { specificationKey: 'Country of Origin', specificationValue: 'India' }
          ]
        }
      },
    });

    // Add inventory in warehouse
    await prisma.inventory.create({
      data: {
        productId: product.id,
        warehouseId: warehouse.id,
        stock: prod.stock,
      },
    });

    // Link compatibility
    for (const compKey of prod.compatibilities) {
      const meta = variantMetadataMap[compKey];
      if (meta) {
        await prisma.productVehicleCompatibility.create({
          data: {
            productId: product.id,
            manufacturerId: meta.manufacturerId,
            modelId: meta.modelId,
            modelYearId: meta.modelYearId,
            engineVariantId: meta.id
          }
        });
      }
    }
  }

  // 6. Create Coupons
  await prisma.coupon.createMany({
    data: [
      {
        code: 'MECH10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        maxDiscount: 500,
        minOrderValue: 1000,
        expiryDate: new Date('2027-12-31'),
      },
      {
        code: 'FIRST500',
        discountType: 'FIXED',
        discountValue: 500,
        minOrderValue: 3000,
        expiryDate: new Date('2027-12-31'),
      },
    ],
  });

  console.log('Seeded Products, Warehouses, Inventory, Compatibility, and Coupons');

  // 7. Seed Banners
  await prisma.banner.deleteMany({});
  await prisma.banner.createMany({
    data: [
      {
        title: 'Mobil 1 Full Synthetic Oil\nLiquid Engineering.',
        subtitle: 'LIMITED DEALS',
        imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&q=80',
        linkType: 'none',
        isActive: true,
        displayOrder: 0,
      },
      {
        title: 'Bosch Brake Pads\nStop with Confidence.',
        subtitle: 'NEW ARRIVAL',
        imageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&q=80',
        linkType: 'none',
        isActive: true,
        displayOrder: 1,
      },
      {
        title: 'Amaron Batteries\nPower That Lasts.',
        subtitle: 'BEST SELLER',
        imageUrl: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=800&q=80',
        linkType: 'none',
        isActive: true,
        displayOrder: 2,
      },
    ],
  });
  console.log('Seeded Banners');

  // 8. Mark some products as featured / flash sale
  await prisma.product.updateMany({
    where: { sku: { in: ['BOS-BP-FR-09', 'MOB-5W30-SYN-4L', 'BOS-AF-TOY-01'] } },
    data: { isFeatured: true },
  });
  await prisma.product.updateMany({
    where: { sku: { in: ['PHI-H4-XPRO', 'AMR-DIN65LH', 'CAS-GTX-5W30-4L'] } },
    data: { isFlashSale: true },
  });
  // Also mark all products as featured if less than 4 exist as featured
  const featuredCount = await prisma.product.count({ where: { isFeatured: true } });
  if (featuredCount < 4) {
    await prisma.product.updateMany({
      where: { status: 'PUBLISHED' },
      data: { isFeatured: true },
    });
  }
  console.log('Updated product featured/flash-sale flags');

  console.log('MechBazar seeding complete!');
}

async function runWithRetry() {
  const retries = 5;
  const delay = 3000;
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`Starting database seed attempt ${i} of ${retries}...`);
      await main();
      console.log('Database seeding completed successfully!');
      return;
    } catch (e: any) {
      console.error(`[Attempt ${i}/${retries} failed]: ${e.message}`);
      if (i === retries) {
        console.error('All database seed attempts failed. Exiting.');
        process.exit(1);
      }
      console.log(`Waiting ${delay}ms before retrying...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

runWithRetry()
  .finally(async () => {
    await prisma.$disconnect();
  });
