const { supabase } = require('../config/supabase');

class NotificationService {
    static async createNotification(userId, { title, message, type = 'info', link = null }) {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .insert([{
                    user_id: userId,
                    title,
                    message,
                    type,
                    link
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error creating notification:', error);
            return { success: false, error: error.message };
        }
    }

    static async getNotifications(userId) {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return { success: false, error: error.message };
        }
    }

    static async markAsRead(notificationId, userId) {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return { success: false, error: error.message };
        }
    }

    static async markAllAsRead(userId) {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', userId)
                .eq('read', false);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            return { success: false, error: error.message };
        }
    }

    static async deleteNotification(notificationId, userId) {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId)
                .eq('user_id', userId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting notification:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = NotificationService;
