import { Response } from 'express';
import { PrismaClient, OrderStatus, PaymentStatus, PaymentMethod, Role } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { dbRetry } from '../utils/dbRetry';

const prisma = new PrismaClient();

// Create new order
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const {
      addressId,
      items, // array of { productId, quantity }
      paymentMethod,
      couponCode,
      notes,
    } = req.body;

    if (!addressId || !items || !Array.isArray(items) || items.length === 0 || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Missing order parameters' });
    }

    // 1. Verify Address (with fallback / auto-creation for new users)
    let address = await dbRetry(() => prisma.address.findFirst({
      where: { id: addressId, userId: req.user!.id }
    }));

    if (!address) {
      address = await dbRetry(() => prisma.address.findFirst({
        where: { userId: req.user!.id }
      }));

      if (!address) {
        address = await dbRetry(() => prisma.address.create({
          data: {
            userId: req.user!.id,
            title: 'Default Home',
            addressLine1: 'MechBazar Hub, Main Street',
            addressLine2: 'Tech Park',
            city: 'Noida',
            state: 'Uttar Pradesh',
            zipCode: '201301',
            latitude: 28.5355,
            longitude: 77.3910,
            isDefault: true,
          }
        }));
      }
    }

    // 2. Validate Items and Calculate Prices
    let subtotal = 0;
    const itemsWithPrices: { productId: string; quantity: number; price: number }[] = [];

    for (const item of items) {
      const product = await dbRetry(() => prisma.product.findUnique({ where: { id: item.productId } }));
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${product.name}. Available: ${product.stock}`,
        });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      itemsWithPrices.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
      });
    }

    // Calculations
    const gstAmount = parseFloat((subtotal * 0.18).toFixed(2)); // 18% GST
    const deliveryCharge = subtotal > 1500 ? 0 : 99; // Free delivery above 1500

    let discountAmount = 0;
    if (couponCode) {
      const coupon = await dbRetry(() => prisma.coupon.findUnique({
        where: { code: couponCode, active: true },
      }));

      if (coupon && new Date() <= coupon.expiryDate && subtotal >= coupon.minOrderValue) {
        if (coupon.discountType === 'PERCENTAGE') {
          discountAmount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
            discountAmount = coupon.maxDiscount;
          }
        } else {
          discountAmount = coupon.discountValue;
        }
      }
    }

    const totalAmount = parseFloat((subtotal + gstAmount + deliveryCharge - discountAmount).toFixed(2));

    // 3. Process Wallet Payment if WALLET selected
    let updatedPaymentStatus: PaymentStatus = PaymentStatus.PENDING;
    let paymentGateway = paymentMethod;

    if (paymentMethod === PaymentMethod.WALLET) {
      const wallet = await dbRetry(() => prisma.wallet.findUnique({ where: { userId: req.user!.id } }));
      if (!wallet || wallet.balance < totalAmount) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      }

      // Decrement wallet balance and record transaction inside a Prisma transaction below
      updatedPaymentStatus = PaymentStatus.COMPLETED;
    }

    // 4. Database Transaction to record Order, OrderItems, update Inventory stock, and deduct wallet if necessary
    const order = await dbRetry(() => prisma.$transaction(async (tx) => {
      // Deduct wallet if applicable
      if (paymentMethod === PaymentMethod.WALLET) {
        const wallet = await tx.wallet.update({
          where: { userId: req.user!.id },
          data: {
            balance: {
              decrement: totalAmount,
            },
            points: {
              increment: Math.floor(totalAmount / 10), // 1 point for every 10 Rs spent
            },
          },
        });

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: totalAmount,
            type: 'DEBIT',
            description: `Paid for order purchase`,
          },
        });
      }

      // Deduct product stocks
      for (const item of itemsWithPrices) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          customerId: req.user!.id,
          addressId: address.id,
          status: OrderStatus.PENDING,
          totalAmount,
          deliveryCharge,
          gstAmount,
          discountAmount,
          paymentMethod: paymentMethod as PaymentMethod,
          paymentStatus: updatedPaymentStatus,
          notes,
          items: {
            createMany: {
              data: itemsWithPrices,
            },
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          address: true,
        },
      });

      // Save payment reference if completed
      if (updatedPaymentStatus === PaymentStatus.COMPLETED) {
        await tx.payment.create({
          data: {
            orderId: newOrder.id,
            transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            amount: totalAmount,
            gateway: paymentMethod,
            status: 'SUCCESS',
          },
        });
      }

      return newOrder;
    }));

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error: any) {
    logger.error(`Create order failed: ${error.message}`, error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Get orders for customer
export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const orders = await prisma.order.findMany({
      where: { customerId: req.user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                brand: true,
              },
            },
          },
        },
        address: true,
        deliveryPartner: {
          include: {
            user: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: orders });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Get order details
export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        address: true,
        deliveryPartner: {
          include: {
            user: {
              select: {
                name: true,
                phone: true,
              },
            },
            location: true,
          },
        },
        customer: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Role checks: Customer sees their own, Rider sees assigned, Admin/Vendor see all
    if (req.user.role === Role.CUSTOMER && order.customerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (req.user.role === Role.DELIVERY && order.deliveryPartner?.userId !== req.user.id) {
      // Allow delivery partner to see orders that are pending assignment
      if (order.status !== OrderStatus.PACKED && order.status !== OrderStatus.ASSIGNED) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    return res.json({ success: true, data: order });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

async function createNotification(userId: string, title: string, message: string) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        read: false,
      },
    });
  } catch (error: any) {
    logger.error(`Failed to create database notification: ${error.message}`);
  }
}

// Update order status (Admin, Vendor, or Delivery partner workflow)
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { id } = req.params;
    const { status, deliveryPartnerId } = req.body;

    if (!status || !Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        deliveryPartner: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    let finalStatus = status;
    // Automatically transition PICKED_UP to ON_THE_WAY
    if (finalStatus === OrderStatus.PICKED_UP) {
      finalStatus = OrderStatus.ON_THE_WAY;
    }

    const updateData: any = { status: finalStatus };

    if (deliveryPartnerId !== undefined) {
      updateData.deliveryPartnerId = deliveryPartnerId;
    }

    // Handle payment status updates automatically on delivery
    if (status === OrderStatus.DELIVERED && order.paymentMethod === PaymentMethod.COD) {
      updateData.paymentStatus = PaymentStatus.COMPLETED;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: {
              include: {
                brand: true,
              },
            },
          },
        },
        deliveryPartner: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
        customer: true,
        address: true,
      },
    });

    // Create a notification for the customer if status is related to delivery
    let notificationText = '';
    if (finalStatus === OrderStatus.ASSIGNED) {
      const riderName = updatedOrder.deliveryPartner?.user.name || 'Rahul Sharma';
      notificationText = `Your order has been assigned to ${riderName}.`;
    } else if (finalStatus === OrderStatus.PICKED_UP) {
      notificationText = `Your order is on the way.`;
    } else if (finalStatus === OrderStatus.ON_THE_WAY) {
      notificationText = `Your rider is nearby and will arrive shortly.`;
    } else if (finalStatus === OrderStatus.DELIVERED) {
      notificationText = `Your order has been delivered successfully.`;
    }

    if (notificationText) {
      await createNotification(updatedOrder.customerId, 'Order Update', notificationText);
    }

    // Broadcast order status change to connected websocket clients
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${id}`).emit('order_status_update', {
        ...updatedOrder,
        notification: notificationText || undefined
      });
      // Global broadcast for admin portal
      io.emit('admin_order_update', {
        ...updatedOrder
      });
      logger.info(`Websocket broadcast order_status_update for order ${id} to status ${finalStatus}`);
    }

    return res.json({
      success: true,
      message: `Order status updated to ${finalStatus}`,
      data: updatedOrder,
    });
  } catch (error: any) {
    logger.error(`Failed to update order status: ${error.message}`, error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Cancel Order
export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (req.user.role === Role.CUSTOMER && order.customerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED && req.user.role === Role.CUSTOMER) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled once it is packed or out for delivery',
      });
    }

    // Cancel order transaction (re-adding stock, refunding wallet if paid)
    await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: order.paymentStatus === PaymentStatus.COMPLETED ? PaymentStatus.REFUNDED : order.paymentStatus,
        },
      });

      // Restore product stocks
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }

      // Refund user wallet if completed
      if (order.paymentStatus === PaymentStatus.COMPLETED && order.paymentMethod === PaymentMethod.WALLET) {
        const wallet = await tx.wallet.update({
          where: { userId: order.customerId },
          data: {
            balance: {
              increment: order.totalAmount,
            },
          },
        });

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: order.totalAmount,
            type: 'CREDIT',
            description: `Refund for cancelled order ${order.id}`,
          },
        });
      }
    });

    return res.json({ success: true, message: 'Order cancelled and refund processed successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Admin order lists
export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        deliveryPartner: {
          include: {
            user: { select: { name: true, phone: true } },
            location: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                brand: true,
              },
            },
          },
        },
        address: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: orders });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Active delivery orders (for delivery boy app)
export const getActiveDeliveryOrders = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== Role.DELIVERY) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const partner = await prisma.deliveryPartner.findUnique({ where: { userId: req.user!.id } });
    if (!partner) return res.status(404).json({ success: false, message: 'Delivery partner record not found' });

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { status: OrderStatus.PACKED, deliveryPartnerId: null }, // Available for pick up (broadcast)
          {
            deliveryPartnerId: partner.id,
            status: {
              in: [OrderStatus.PACKED, OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.ON_THE_WAY],
            },
          },
        ],
      },
      include: {
        customer: { select: { name: true, phone: true } },
        address: true,
        items: {
          include: {
            product: {
              include: {
                brand: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: orders });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
