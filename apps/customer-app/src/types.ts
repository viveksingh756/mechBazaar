// Local type definitions (inlined from shared/types to avoid Metro workspace resolution issues)
export interface UserVehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  variant: string;
  fuelType: string;
  year: number;
  registrationNumber?: string;
  isDefault: boolean;
  manufacturerId?: string;
  modelId?: string;
  modelYearId?: string;
  variantId?: string;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  isActive?: boolean;
  description?: string;
  website?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string;
  imageUrl?: string;
  isActive?: boolean;
  _count?: { products: number };
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  displayOrder: number;
  isPrimary: boolean;
}

export interface ProductSpecification {
  id: string;
  specificationKey: string;
  specificationValue: string;
}

export interface ProductOEMNumber {
  id: string;
  oemNumber: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  oemNumber?: string;
  oemNumbers?: ProductOEMNumber[];
  description: string;
  price: number;
  mrp: number;
  discount: number;
  stock?: number;
  brandId: string;
  brand?: Brand;
  categoryId: string;
  category?: Category;
  returnPolicy?: string;
  deliveryTime?: string;
  rating?: number;
  reviewCount?: number;
  images: ProductImage[];
  status?: string;
  isFlashSale?: boolean;
  isFeatured?: boolean;
  minStockAlert?: number;
  maxStock?: number;
  warehouseBin?: string;
  shelfNumber?: string;
  specifications?: ProductSpecification[];
  compatibilities?: any[];
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkType: string;
  linkValue?: string;
  isActive: boolean;
  displayOrder: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  status: string;
  items: CartItem[];
  totalAmount: number;
  createdAt: string;
}

export interface HomeData {
  banners: Banner[];
  categories: Category[];
  featuredProducts: Product[];
  flashDeals: Product[];
  newArrivals: Product[];
  recommendedProducts: Product[];
}
