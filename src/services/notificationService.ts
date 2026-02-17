import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import db from '../config/database.js';

const expo = new Expo();

export const notificationService = {
    // Save or update Expo push token
    async upsertPushToken(userId: number, token: string) {
        if (!token) return;

        if (!Expo.isExpoPushToken(token)) {
            console.error(`Push token ${token} is not a valid Expo push token`);
            return;
        }

        // Check if token exists for any user. If so, update user_id.
        const existing = await db('user_devices')
            .where('expo_push_token', token)
            .first();

        if (existing) {
            if (existing.user_id !== userId) {
                await db('user_devices')
                    .where('id', existing.id)
                    .update({ user_id: userId, updated_at: db.fn.now() });
            }
        } else {
            await db('user_devices').insert({
                user_id: userId,
                expo_push_token: token,
            });
        }
    },

    // Remove push token on logout
    async removePushToken(userId: number, token: string) {
        if (!token) return;
        await db('user_devices')
            .where({ user_id: userId, expo_push_token: token })
            .del();
    },

    // Send push notification to a specific user
    async sendNotificationToUser(userId: number, title: string, body: string, data: any = {}) {
        // Get all tokens for user
        const devices = await db('user_devices')
            .select('expo_push_token')
            .where('user_id', userId);

        if (!devices.length) return;

        const messages: ExpoPushMessage[] = [];
        for (const device of devices) {
            if (!Expo.isExpoPushToken(device.expo_push_token)) {
                console.error(`Push token ${device.expo_push_token} is not a valid Expo push token`);
                continue;
            }

            messages.push({
                to: device.expo_push_token,
                sound: 'default',
                title,
                body,
                data,
            });
        }

        // Chunk and send
        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error(error);
            }
        }
    },

    // Send notification to Hostel Owner(s)
    async sendNotificationToHostelOwner(hostelId: number, title: string, body: string, data: any = {}) {
        // Find owners of this hostel with role_id = 2 (Hostel Owner)
        const owners = await db('users')
            .select('user_id')
            .where('hostel_id', hostelId)
            .where('role_id', 2);

        for (const owner of owners) {
            await this.sendNotificationToUser(owner.user_id, title, body, data);
        }
    }
};
