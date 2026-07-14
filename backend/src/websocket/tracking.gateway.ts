import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const setupTrackingSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    logger.info(`Websocket client connected: ${socket.id}`);

    // Join tracking room for a specific order
    socket.on('join_order_track', (data: { orderId: string }) => {
      const { orderId } = data;
      if (orderId) {
        socket.join(`order_${orderId}`);
        logger.info(`Client ${socket.id} joined tracking room for order_${orderId}`);
      }
    });

    // Delivery partner sends GPS coordinate updates
    socket.on(
      'update_partner_location',
      async (data: {
        partnerId: string;
        orderId?: string;
        latitude: number;
        longitude: number;
        etaMinutes?: number;
        distanceKm?: number;
      }) => {
        const { partnerId, orderId, latitude, longitude, etaMinutes, distanceKm } = data;

        if (!partnerId || !latitude || !longitude) {
          logger.warn(`Incomplete location payload received from socket ${socket.id}`);
          return;
        }

        try {
          // Resolve partnerId (which might be the User ID or the DeliveryPartner ID)
          let actualPartner = await prisma.deliveryPartner.findUnique({
            where: { userId: partnerId }
          });

          if (!actualPartner) {
            actualPartner = await prisma.deliveryPartner.findUnique({
              where: { id: partnerId }
            });
          }

          if (!actualPartner) {
            logger.warn(`Could not find delivery partner profile for ID/userId ${partnerId}`);
            return;
          }

          const partnerProfileId = actualPartner.id;

          // Update location in DB using the correct DeliveryPartner profile ID
          await prisma.partnerLocation.upsert({
            where: { partnerId: partnerProfileId },
            update: {
              latitude,
              longitude,
              updatedAt: new Date(),
            },
            create: {
              partnerId: partnerProfileId,
              latitude,
              longitude,
            },
          });

          logger.debug(`Rider ${partnerId} updated location to (${latitude}, ${longitude})`);

          // If current active order, broadcast location to order room
          if (orderId) {
            io.to(`order_${orderId}`).emit('rider_location_broadcast', {
              orderId,
              partnerId,
              location: {
                latitude,
                longitude,
                timestamp: Date.now(),
              },
              etaMinutes: etaMinutes || 10,
              distanceKm: distanceKm || 2.4,
            });
          }
        } catch (error: any) {
          logger.error(`Error updating partner location: ${error.message}`);
        }
      }
    );

    // Leaving order room
    socket.on('leave_order_track', (data: { orderId: string }) => {
      const { orderId } = data;
      if (orderId) {
        socket.leave(`order_${orderId}`);
        logger.info(`Client ${socket.id} left tracking room for order_${orderId}`);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Websocket client disconnected: ${socket.id}`);
    });
  });
};
