const nodemailer = require('nodemailer');
const supabase = require('../config/supabase');
require('dotenv').config();

// Cache transporter to avoid recreating on every email if settings haven't changed
let cachedTransporter = null;
let lastSettingsCheck = 0;
const SETTINGS_CACHE_TTL = 60000; // 1 minute

// Helper to get transporter
const getTransporter = async () => {
    const now = Date.now();
    // If we have a cached transporter and cache is fresh, use it
    if (cachedTransporter && (now - lastSettingsCheck < SETTINGS_CACHE_TTL)) {
        return cachedTransporter;
    }

    // Otherwise check DB for overrides
    try {
        const { data } = await supabase
            .from('system_settings')
            .select('settings')
            .eq('id', 'email_config')
            .single();

        const settings = data ? data.settings : {};

        // Determine config source (DB vs ENV)
        const host = settings.smtpHost || process.env.EMAIL_HOST;
        const port = settings.smtpPort || process.env.EMAIL_PORT;
        const user = settings.smtpUser || process.env.EMAIL_USER;
        const pass = settings.smtpPass || process.env.EMAIL_PASSWORD;
        const secure = settings.smtpSecure !== undefined ? settings.smtpSecure : (process.env.EMAIL_SECURE === 'true');

        // Update global defaults for 'from' address logic
        process.env.DYNAMIC_EMAIL_FROM = settings.senderEmail || process.env.EMAIL_FROM || user;
        process.env.DYNAMIC_EMAIL_NAME = settings.senderName || process.env.EMAIL_FROM_NAME || 'Domasy System';

        if (host && user && pass) {
            cachedTransporter = nodemailer.createTransport({
                host,
                port,
                secure, // true for 465, false for other ports
                auth: { user, pass },
            });
            console.log('[EmailService] Transporter configured using ' + (data ? 'Database Settings' : 'Environment Variables'));
        } else {
            console.warn('[EmailService] incomplete email configuration. Emails may fail.');
            // Fallback to initial global if needed, but likely already covered above
        }

        lastSettingsCheck = now;
        return cachedTransporter;

    } catch (err) {
        console.error('[EmailService] Error loading settings:', err.message);
        // Fallback to env if DB fails
        if (!cachedTransporter) {
            cachedTransporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                secure: process.env.EMAIL_SECURE === 'true',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD,
                },
            });
        }
        return cachedTransporter;
    }
};

/**
 * Send an email
 * @param {string} to - Recipient email(s)
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} text - Fallback text content
 */
exports.sendEmail = async ({ to, subject, html, text }) => {
    try {
        const transporter = await getTransporter();
        if (!transporter) {
            console.error('[EmailService] No transporter available');
            return null;
        }

        const info = await transporter.sendMail({
            from: `"${process.env.DYNAMIC_EMAIL_NAME || 'Domasy System'}" <${process.env.DYNAMIC_EMAIL_FROM || process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        });

        console.log(`[EmailService] Message sent to ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('[EmailService] Error sending email:', error);
        // We don't want to crash the app if email fails, just log it
        return null;
    }
};

/**
 * Send notification when a new document is uploaded
 * @param {Array} recipients - Array of user objects {email, name}
 * @param {Object} document - Document details
 * @param {Object} uploader - Uploader details
 */
exports.sendDocumentUploadedEmail = async (recipients, document, uploader) => {
    if (!recipients || recipients.length === 0) return;

    const subject = `New Document Uploaded: ${document.title}`;

    // Send individually to personalize or Bcc
    // For simplicity, we loop
    for (const recipient of recipients) {
        if (!recipient.email) continue;

        const html = `
            <h3>New Document Uploaded</h3>
            <p>Hello ${recipient.name},</p>
            <p><strong>${uploader.name}</strong> has uploaded a new document that requires your attention or review.</p>
            <div style="background-color: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 5px;">
                <p><strong>Title:</strong> ${document.title}</p>
                <p><strong>Description:</strong> ${document.description || 'N/A'}</p>
                <p><strong>Category:</strong> ${document.category}</p>
            </div>
            <p><a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/#/documents/details/${document.id}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Document</a></p>
            <p>Best regards,<br/>Domasy Team</p>
        `;

        await exports.sendEmail({
            to: recipient.email,
            subject,
            html,
            text: `New Document Uploaded: ${document.title} by ${uploader.name}. Check the system for details.`
        });
    }
};

/**
 * Send notification when a revision is uploaded
 * @param {Array} recipients - Array of user objects {email, name}
 * @param {Object} document - Document details
 * @param {Object} uploader - Uploader details
 * @param {number} version - New version number
 */
exports.sendRevisionUploadedEmail = async (recipients, document, uploader, version) => {
    if (!recipients || recipients.length === 0) return;

    const subject = `New Revision Uploaded: ${document.title} (v${version})`;

    for (const recipient of recipients) {
        if (!recipient.email) continue;

        const html = `
            <h3>New Revision Available</h3>
            <p>Hello ${recipient.name},</p>
            <p><strong>${uploader.name}</strong> has uploaded a new version <strong>(v${version})</strong> for the document <strong>${document.title}</strong>.</p>
            <p>The review process has been reset for the new version.</p>
            <p><a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/#/documents/details/${document.id}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review New Version</a></p>
            <p>Best regards,<br/>Domasy Team</p>
        `;

        await exports.sendEmail({
            to: recipient.email,
            subject,
            html,
            text: `New Revision (v${version}) for ${document.title} uploaded by ${uploader.name}.`
        });
    }
};

/**
 * Send notification when document needs approval (Current Approver)
 * @param {Object} approver - User object
 * @param {Object} document - Document details
 */
exports.sendApprovalRequestEmail = async (approver, document) => {
    if (!approver || !approver.email) return;

    const subject = `Action Required: Determine Approval for ${document.title}`;
    const html = `
        <h3>Your Approval is Required</h3>
        <p>Hello ${approver.name},</p>
        <p>The document <strong>${document.title}</strong> is currently at your review stage and awaits your decision.</p>
        <p><a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/#/documents/details/${document.id}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Document</a></p>
        <p>Best regards,<br/>Domasy Team</p>
    `;

    await exports.sendEmail({
        to: approver.email,
        subject,
        html,
        text: `Approval Required for ${document.title}. Please login to review.`
    });
};

/**
 * Send notification when document is Approved
 * @param {Object} recipient - User who uploaded or team members
 * @param {Object} document - Document details
 * @param {Object} approver - Who approved it
 * @param {boolean} isFinal - Is this the final approval?
 */
exports.sendDocumentApprovedEmail = async (recipient, document, approver, isFinal = false) => {
    if (!recipient || !recipient.email) return;

    const subject = isFinal
        ? `Document Approved: ${document.title}`
        : `Step Approved: ${document.title}`;

    const html = `
        <h3>${isFinal ? 'Document Fully Approved' : 'Stage Approved'}</h3>
        <p>Hello ${recipient.name},</p>
        <p>The document <strong>${document.title}</strong> has been <strong>${isFinal ? 'APPROVED' : 'approved at the current stage'}</strong> by <strong>${approver.name}</strong>.</p>
        ${isFinal ? '<p>No further actions are required.</p>' : '<p>It will proceed to the next stage.</p>'}
        <p><a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/#/documents/details/${document.id}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Status</a></p>
        <p>Best regards,<br/>Domasy Team</p>
    `;

    await exports.sendEmail({
        to: recipient.email,
        subject,
        html,
        text: `Document ${document.title} was approved by ${approver.name}.`
    });
};

/**
 * Send notification when document is Rejected
 * @param {Object} recipient - User who uploaded
 * @param {Object} document - Document details
 * @param {Object} rejector - User who rejected
 * @param {string} reason - Rejection note
 */
exports.sendDocumentRejectedEmail = async (recipient, document, rejector, reason) => {
    if (!recipient || !recipient.email) return;

    const subject = `Document Rejected: ${document.title}`;
    const html = `
        <h3>Document Rejected</h3>
        <p>Hello ${recipient.name},</p>
        <p>Unfortunately, your document <strong>${document.title}</strong> has been <strong>REJECTED</strong> by <strong>${rejector.name}</strong>.</p>
        <div style="background-color: #ffebee; color: #c62828; padding: 15px; border-radius: 5px;">
            <strong>Reason:</strong> ${reason}
        </div>
        <p>Please review the feedback and upload a revision.</p>
        <p><a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/#/documents/details/${document.id}" style="background-color: #c62828; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View details</a></p>
        <p>Best regards,<br/>Domasy Team</p>
    `;

    await exports.sendEmail({
        to: recipient.email,
        subject,
        html,
        text: `Document ${document.title} was rejected by ${rejector.name}. Reason: ${reason}`
    });
};

/**
 * Send notification when changes are requested
 * @param {Object} recipient - User who uploaded
 * @param {Object} document - Document details
 * @param {Object} requestor - User who requested changes
 * @param {string} reason - Note
 */
exports.sendChangesRequestedEmail = async (recipient, document, requestor, reason) => {
    if (!recipient || !recipient.email) return;

    const subject = `Changes Requested: ${document.title}`;
    const html = `
        <h3>Action Required: Changes Requested</h3>
        <p>Hello ${recipient.name},</p>
        <p><strong>${requestor.name}</strong> has requested changes for your document <strong>${document.title}</strong>.</p>
        <div style="background-color: #fff3e0; color: #ef6c00; padding: 15px; border-radius: 5px;">
            <strong>Note:</strong> ${reason}
        </div>
        <p>Please update the document and upload a revision.</p>
        <p><a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/#/documents/details/${document.id}" style="background-color: #ef6c00; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View details</a></p>
        <p>Best regards,<br/>Domasy Team</p>
    `;

    await exports.sendEmail({
        to: recipient.email,
        subject,
        html,
        text: `Changes requested for ${document.title} by ${requestor.name}. Note: ${reason}`
    });
};

/**
 * Send notification when document details/reviewers are updated
 * @param {Array} recipients 
 * @param {Object} document 
 * @param {Object} modifier 
 */
exports.sendDocumentUpdatedEmail = async (recipients, document, modifier) => {
    if (!recipients || recipients.length === 0) return;

    const subject = `Document Updated: ${document.title}`;

    for (const recipient of recipients) {
        if (!recipient.email) continue;

        const html = `
            <h3>Document Details Updated</h3>
            <p>Hello ${recipient.name},</p>
            <p><strong>${modifier.name}</strong> has updated the details or reviewers for document <strong>${document.title}</strong>.</p>
            <p><a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/#/documents/details/${document.id}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Document</a></p>
            <p>Best regards,<br/>Domasy Team</p>
        `;

        await exports.sendEmail({
            to: recipient.email,
            subject,
            html,
            text: `Document ${document.title} details updated by ${modifier.name}.`
        });
    }
}

/**
 * Send notification when document is deleted
 * @param {Array} recipients 
 * @param {Object} document 
 * @param {Object} deleter 
 */
exports.sendDocumentDeletedEmail = async (recipients, document, deleter) => {
    if (!recipients || recipients.length === 0) return;

    const subject = `Document Deleted: ${document.title}`;

    for (const recipient of recipients) {
        if (!recipient.email) continue;

        const html = `
            <h3>Document Deleted</h3>
            <p>Hello ${recipient.name},</p>
            <p><strong>${deleter.name}</strong> has deleted the document <strong>${document.title}</strong>.</p>
            <p>This document is no longer accessible.</p>
            <p>Best regards,<br/>Domasy Team</p>
        `;

        await exports.sendEmail({
            to: recipient.email,
            subject,
            html,
            text: `Document ${document.title} was deleted by ${deleter.name}.`
        });
    }
};
