import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { notificationService } from '../services/notificationService.js';

export const notificationController = {
    async savePushToken(req: AuthRequest, res: Response) {
        try {
            const { token } = req.body;
            const userId = req.user?.user_id;

            if (!token || !userId) {
                return res.status(400).json({ success: false, error: 'Token and User ID required' });
            }

            await notificationService.upsertPushToken(userId, token);

            res.status(200).json({ success: true, message: 'Push token saved successfully' });
        } catch (error) {
            console.error('Error saving push token:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },

    async removePushToken(req: AuthRequest, res: Response) {
        try {
            const { token } = req.body;
            const userId = req.user?.user_id;

            if (!token || !userId) {
                return res.status(400).json({ success: false, error: 'Token and User ID required' });
            }

            await notificationService.removePushToken(userId, token);

            res.status(200).json({ success: true, message: 'Push token removed successfully' });
        } catch (error) {
            console.error('Error removing push token:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
};
