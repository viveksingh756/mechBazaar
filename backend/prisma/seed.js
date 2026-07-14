"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding MechBazar database...');
    // 1. Create Users
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
            role: client_1.Role.ADMIN,
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
            role: client_1.Role.VENDOR,
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
            role: client_1.Role.CUSTOMER,
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
            role: client_1.Role.DELIVERY,
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
            status: client_1.PartnerStatus.ONLINE,
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
    // 2. Create Manufacturers, Models, and Variants
    const manufacturersData = [
        {
            name: 'Toyota',
            models: [
                {
                    name: 'Fortuner',
                    variants: [
                        { name: '2.8L Sigma 4', fuelType: 'Diesel', startYear: 2021, endYear: 2026 },
                        { name: '2.7L 2WD', fuelType: 'Petrol', startYear: 2021, endYear: 2026 },
                    ],
                },
                {
                    name: 'Innova Crysta',
                    variants: [
                        { name: '2.4L VX', fuelType: 'Diesel', startYear: 2016, endYear: 2025 },
                    ],
                },
            ],
        },
        {
            name: 'Maruti Suzuki',
            models: [
                {
                    name: 'Swift',
                    variants: [
                        { name: '1.2L DualJet LXI/VXI', fuelType: 'Petrol', startYear: 2020, endYear: 2026 },
                    ],
                },
                {
                    name: 'Baleno',
                    variants: [
                        { name: '1.2L Delta/Zeta', fuelType: 'Petrol', startYear: 2019, endYear: 2026 },
                    ],
                },
            ],
        },
        {
            name: 'Honda',
            models: [
                {
                    name: 'City',
                    variants: [
                        { name: '1.5L i-VTEC V/VX', fuelType: 'Petrol', startYear: 2020, endYear: 2026 },
                        { name: '1.5L i-DTEC VX', fuelType: 'Diesel', startYear: 2020, endYear: 2024 },
                    ],
                },
            ],
        },
    ];
    const variantsMap = {};
    for (const mfg of manufacturersData) {
        const manufacturer = await prisma.manufacturer.upsert({
            where: { name: mfg.name },
            update: {},
            create: { name: mfg.name },
        });
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
            for (const vrt of mdl.variants) {
                const variant = await prisma.vehicleVariant.upsert({
                    where: {
                        modelId_name_fuelType: {
                            modelId: model.id,
                            name: vrt.name,
                            fuelType: vrt.fuelType,
                        },
                    },
                    update: {},
                    create: {
                        modelId: model.id,
                        name: vrt.name,
                        fuelType: vrt.fuelType,
                        startYear: vrt.startYear,
                        endYear: vrt.endYear,
                    },
                });
                // Key format: Manufacturer-Model-Variant-Fuel
                const key = `${mfg.name}-${mdl.name}-${vrt.name}-${vrt.fuelType}`;
                variantsMap[key] = variant.id;
            }
        }
    }
    console.log('Seeded Manufacturers, Models, and Variants');
    // Customer vehicle garage seed
    const customerVehicle = await prisma.userVehicle.create({
        data: {
            userId: customer.id,
            registrationNumber: 'DL-3C-AS-7777',
            make: 'Toyota',
            model: 'Fortuner',
            variant: '2.8L Sigma 4',
            fuelType: 'Diesel',
            year: 2022,
            isDefault: true,
        },
    });
    // 3. Create Brands & Categories
    const brands = ['Bosch', 'Mobil1', 'Castrol', 'Philips', 'Amaron', 'NGK', 'Brembo'];
    const brandMap = {};
    for (const bName of brands) {
        const b = await prisma.brand.upsert({
            where: { name: bName },
            update: {},
            create: { name: bName },
        });
        brandMap[bName] = b.id;
    }
    const categories = [
        { name: 'Filters', slug: 'filters' },
        { name: 'Brake System', slug: 'brakes' },
        { name: 'Electricals & Battery', slug: 'electricals' },
        { name: 'Oils & Lubricants', slug: 'lubricants' },
        { name: 'Engine Parts', slug: 'engine-parts' },
        { name: 'Accessories', slug: 'accessories' },
    ];
    const catMap = {};
    for (const cat of categories) {
        const c = await prisma.category.upsert({
            where: { name: cat.name },
            update: {},
            create: { name: cat.name, slug: cat.slug },
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
                'Toyota-Fortuner-2.8L Sigma 4-Diesel',
                'Toyota-Fortuner-2.7L 2WD-Petrol',
                'Toyota-Innova Crysta-2.4L VX-Diesel',
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
                'Maruti Suzuki-Swift-1.2L DualJet LXI/VXI-Petrol',
                'Maruti Suzuki-Baleno-1.2L Delta/Zeta-Petrol',
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
                'Toyota-Fortuner-2.7L 2WD-Petrol',
                'Honda-City-1.5L i-VTEC V/VX-Petrol',
                'Maruti Suzuki-Swift-1.2L DualJet LXI/VXI-Petrol',
                'Maruti Suzuki-Baleno-1.2L Delta/Zeta-Petrol',
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
                'Toyota-Fortuner-2.8L Sigma 4-Diesel',
                'Toyota-Innova Crysta-2.4L VX-Diesel',
                'Honda-City-1.5L i-DTEC VX-Diesel',
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
                'Toyota-Fortuner-2.8L Sigma 4-Diesel',
                'Toyota-Fortuner-2.7L 2WD-Petrol',
                'Toyota-Innova Crysta-2.4L VX-Diesel',
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
                'Honda-City-1.5L i-VTEC V/VX-Petrol',
                'Honda-City-1.5L i-DTEC VX-Diesel',
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
                'Toyota-Fortuner-2.8L Sigma 4-Diesel',
                'Toyota-Innova Crysta-2.4L VX-Diesel',
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
                'Maruti Suzuki-Swift-1.2L DualJet LXI/VXI-Petrol',
                'Honda-City-1.5L i-VTEC V/VX-Petrol',
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
                images: prod.images,
                stock: prod.stock,
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
            const variantId = variantsMap[compKey];
            if (variantId) {
                await prisma.productCompatibility.create({
                    data: {
                        productId: product.id,
                        variantId,
                        notes: 'Exact Fit OEM standard replacement.',
                    },
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
    console.log('MechBazar seeding complete!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
