import { Request, Response } from 'express';
import { sendEmail } from '../services/emailService';
import Inquiry from '../models/Inquiry';
import { apiLogger } from '../utils/logger';
import { escapeHtml } from '../utils/escapeHtml';
import { uploadImage } from '../services/mediaService';
import { originalMediaUrl } from '../utils/mediaUrl';

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'contact@balkanestateai.com';
/** Cloudinary delivery URL that forces a file download of the untouched original. */
const cloudinaryDownloadUrl = (url: string): string =>
  url.replace('/image/upload/', '/image/upload/fl_attachment/');

const VALID_SUBJECTS = ['general', 'buying', 'selling', 'agency', 'support', 'partnership', 'advertising'];

/**
 * @desc    Public: upload an advertising creative attached to a contact request.
 * @route   POST /api/inquiries/advertising-image
 * @access  Public (rate limited)
 */
export const uploadAdvertisingImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }
    const result = await uploadImage(req.file.buffer, {
      userId: 'public-advertising',
      type: 'ad-banner',
      // Keep the creative near its original size and quality — the team
      // downloads it from the notification email to build the real banner.
      maxWidth: 4000,
      maxHeight: 4000,
      preserveQuality: true,
      skipRegistration: true,
    });
    res.status(200).json({ url: result.url });
  } catch (err) {
    apiLogger.warn(`[inquiryController] Advertising image upload failed: ${err}`);
    res.status(500).json({ message: 'Failed to upload image' });
  }
};

/**
 * @desc    Send a contact form inquiry to the platform team
 * @route   POST /api/inquiries/contact
 * @access  Public (rate limited)
 */
export const sendContactInquiry = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, phone, subject, message, adPage, adPlacement, attachmentUrl } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      res.status(400).json({
        message: 'Name, email, subject, and message are required',
      });
      return;
    }

    // Validate name length
    const trimmedName = String(name).trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = String(email).trim().toLowerCase();
    if (!emailRegex.test(trimmedEmail)) {
      res.status(400).json({ message: 'Invalid email format' });
      return;
    }

    // Validate subject
    if (!VALID_SUBJECTS.includes(subject)) {
      res.status(400).json({ message: 'Invalid subject' });
      return;
    }

    // Validate message length
    const trimmedMessage = String(message).trim();
    if (trimmedMessage.length < 10 || trimmedMessage.length > 2000) {
      res.status(400).json({ message: 'Message must be between 10 and 2000 characters' });
      return;
    }

    // Sanitize phone if provided
    const trimmedPhone = typeof phone === 'string' && phone.trim() ? phone.trim().slice(0, 40) : undefined;

    // Advertising requests are treated as high-priority leads.
    const isAdvertising = subject === 'advertising';
    const priority = isAdvertising ? 'high' : 'normal';

    // Advertising details (validated against the known slot options).
    const AD_PAGES = ['all', 'home', 'search', 'rentals', 'villas', 'property-details', 'agents', 'agencies', 'business-directory', 'blog', 'guides'];
    const AD_PLACEMENTS = ['sticky-bottom', 'sticky-top', 'header', 'in-content', 'sidebar', 'footer'];
    const cleanAdPage = isAdvertising && AD_PAGES.includes(adPage) ? adPage : undefined;
    const cleanAdPlacement = isAdvertising && AD_PLACEMENTS.includes(adPlacement) ? adPlacement : undefined;
    const cleanAttachment =
      // Only our own uploads (the R2 media domain) — never an arbitrary link.
      isAdvertising && typeof attachmentUrl === 'string' && originalMediaUrl(attachmentUrl) !== null
        ? attachmentUrl
        : undefined;

    // Save the inquiry to database
    const inquiry = await Inquiry.create({
      type: 'contact',
      status: 'new',
      priority,
      buyerName: trimmedName,
      buyerEmail: trimmedEmail,
      buyerPhone: trimmedPhone,
      subject,
      message: trimmedMessage,
      adPage: cleanAdPage,
      adPlacement: cleanAdPlacement,
      attachmentUrl: cleanAttachment,
    });

    // Send notification email to platform team
    try {
      const emailSubject = isAdvertising
        ? `🔥 [ADVERTISING REQUEST] ${trimmedName.replace(/[\r\n]+/g, ' ')} wants to advertise with us`
        : `[Contact Form] ${subject} - from ${trimmedName.replace(/[\r\n]+/g, ' ')}`;
      const leadBanner = isAdvertising
        ? `<div style="background:#4338ca;color:#fff;padding:12px 16px;border-radius:8px;font-weight:700;margin-bottom:12px;">
             🔥 New advertising request — someone wants to advertise with us. Follow up ASAP.
           </div>`
        : '';
      const adDetails = isAdvertising
        ? `<div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:12px 16px;margin:12px 0;">
             <p style="margin:0 0 6px;"><strong>Requested page:</strong> ${cleanAdPage || 'Not specified'}</p>
             <p style="margin:0 0 6px;"><strong>Requested placement:</strong> ${cleanAdPlacement || 'Not specified'}</p>
             ${cleanAttachment
               ? `<p style="margin:8px 0 6px;"><strong>Creative they attached:</strong></p>
                  <a href="${cleanAttachment}"><img src="${cleanAttachment}" alt="Advertiser creative" style="max-width:100%;max-height:320px;border-radius:8px;border:1px solid #ddd;" /></a>
                  <p style="margin:10px 0 0;">
                    <a href="${cloudinaryDownloadUrl(cleanAttachment)}" style="display:inline-block;background:#4338ca;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;font-weight:600;">Download full size</a>
                    &nbsp;<a href="${cleanAttachment}" style="color:#4338ca;">Open original</a>
                  </p>`
               : '<p style="margin:0;"><em>No creative attached.</em></p>'}
           </div>`
        : '';
      await sendEmail({
        to: CONTACT_EMAIL,
        subject: emailSubject,
        html: `
          ${leadBanner}
          <h2>${isAdvertising ? 'New Advertising Request' : 'New Contact Form Submission'}</h2>
          <p><strong>From:</strong> ${escapeHtml(trimmedName)} (${escapeHtml(trimmedEmail)})</p>
          ${trimmedPhone ? `<p><strong>Phone:</strong> ${escapeHtml(trimmedPhone)}</p>` : ''}
          <p><strong>Subject:</strong> ${subject}</p>
          ${adDetails}
          <hr />
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(trimmedMessage).replace(/\n/g, '<br>')}</p>
          <hr />
          <p><em>Inquiry ID: ${inquiry._id}</em></p>
        `,
        text: `${isAdvertising ? `ADVERTISING REQUEST — someone wants to advertise with us. Page: ${cleanAdPage || 'n/a'}, Placement: ${cleanAdPlacement || 'n/a'}${cleanAttachment ? `, Creative: ${cleanAttachment}` : ''}. ` : ''}New contact form submission from ${trimmedName} (${trimmedEmail}). Subject: ${subject}. Message: ${trimmedMessage}`,
      });
    } catch (emailError) {
      apiLogger.warn(`[inquiryController] Contact email notification failed but inquiry saved: ${emailError}`);
    }

    apiLogger.info(`[inquiryController] Contact inquiry saved: ${trimmedEmail}, subject: ${subject} (ID: ${inquiry._id})`);

    res.json({
      message: 'Your message has been sent successfully',
      inquiryId: inquiry._id,
    });
  } catch (error: any) {
    apiLogger.error('Send contact inquiry error:', error);
    res.status(500).json({
      message: 'Error sending message',
    });
  }
};
