import { Request, Response } from 'express';
import { sendAgentInquiry, sendEmail } from '../services/emailService';
import User from '../models/User';
import Agent from '../models/Agent';
import Property from '../models/Property';
import Inquiry from '../models/Inquiry';
import { apiLogger } from '../utils/logger';
import { resolveId } from '../utils/idObfuscation';
import { isValidObjectId } from '../utils/validateParams';

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'contact@balkanestateai.com';
const VALID_SUBJECTS = ['general', 'buying', 'selling', 'agency', 'support', 'partnership'];

/**
 * @desc    Send inquiry to agent about a property
 * @route   POST /api/inquiries/property
 * @access  Public (with optional auth for pre-filling user info)
 */
export const sendPropertyInquiry = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { propertyId: rawPropertyId, message, buyerName, buyerEmail, buyerPhone } = req.body;

    // Validate required fields
    if (!rawPropertyId || !message || !buyerName || !buyerEmail) {
      res.status(400).json({
        message: 'Property ID, message, name, and email are required',
      });
      return;
    }

    // Resolve obfuscated or raw ID
    const propertyId = resolveId(rawPropertyId) || rawPropertyId;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerEmail)) {
      res.status(400).json({ message: 'Invalid email format' });
      return;
    }

    // Find the property
    const property = await Property.findById(propertyId);
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    // Find the seller/agent
    const seller = await User.findById(property.sellerId);
    if (!seller) {
      res.status(404).json({ message: 'Property owner not found' });
      return;
    }

    // Get agent info if applicable
    let agentName = seller.name;
    let agentEmail = seller.email;

    if (seller.role === 'agent') {
      const agent = await Agent.findOne({ userId: seller._id });
      if (agent) {
        agentName = seller.name;
        agentEmail = seller.email;
      }
    }

    // Build location string (city and country are direct fields on Property)
    const location = [property.city, property.country]
      .filter(Boolean)
      .join(', ');

    // Save the inquiry to database
    const inquiry = await Inquiry.create({
      type: 'property',
      status: 'new',
      buyerName,
      buyerEmail,
      buyerPhone,
      recipientId: seller._id,
      recipientName: agentName,
      recipientEmail: agentEmail,
      propertyId: property._id,
      propertyTitle: property.title,
      message,
      location,
    });

    // Send the inquiry email
    await sendAgentInquiry({
      agentEmail,
      agentName,
      buyerName,
      buyerEmail,
      buyerPhone,
      message,
      propertyTitle: property.title,
      propertyId: String(property._id),
      location,
      inquiryType: 'property',
    });

    apiLogger.info(`[inquiryController] Property inquiry sent and saved: ${buyerEmail} -> ${agentEmail} about ${property.title} (ID: ${inquiry._id})`);

    res.json({
      message: 'Your inquiry has been sent successfully',
      recipient: agentName,
      inquiryId: inquiry._id,
    });
  } catch (error: any) {
    apiLogger.error('Send property inquiry error:', error);
    res.status(500).json({
      message: 'Error sending inquiry',
    });
  }
};

/**
 * @desc    Send general inquiry to an agent
 * @route   POST /api/inquiries/agent
 * @access  Public
 */
export const sendAgentGeneralInquiry = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { agentId: rawAgentId, message, buyerName, buyerEmail, buyerPhone } = req.body;

    // Validate required fields
    if (!rawAgentId || !message || !buyerName || !buyerEmail) {
      res.status(400).json({
        message: 'Agent ID, message, name, and email are required',
      });
      return;
    }

    // Resolve obfuscated or raw ID
    const agentId = resolveId(rawAgentId) || rawAgentId;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerEmail)) {
      res.status(400).json({ message: 'Invalid email format' });
      return;
    }

    // Find the agent user - the agentId may be a User ID, Agent document ID, or custom agentId string
    let agentUser = isValidObjectId(agentId) ? await User.findById(agentId) : null;

    // If not found in User collection, look up the Agent document and get the user through it
    if (!agentUser) {
      let agentDoc = isValidObjectId(agentId)
        ? await Agent.findById(agentId).populate('userId', 'name email phone role')
        : null;

      // Fallback: search by custom agentId field (e.g., "AGT-123")
      if (!agentDoc) {
        agentDoc = await Agent.findOne({ agentId: agentId })
          .populate('userId', 'name email phone role');
      }

      if (agentDoc && agentDoc.userId) {
        agentUser = typeof agentDoc.userId === 'object'
          ? agentDoc.userId as any
          : await User.findById(agentDoc.userId);
      }
    }

    if (!agentUser) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    if (agentUser.role !== 'agent') {
      res.status(400).json({ message: 'User is not an agent' });
      return;
    }

    // Use a consistent reference to the resolved user
    const agent = agentUser;

    // Save the inquiry to database
    const inquiry = await Inquiry.create({
      type: 'agent',
      status: 'new',
      buyerName,
      buyerEmail,
      buyerPhone,
      recipientId: agent._id,
      recipientName: agent.name,
      recipientEmail: agent.email,
      message,
    });

    // Send the inquiry email
    await sendAgentInquiry({
      agentEmail: agent.email,
      agentName: agent.name,
      buyerName,
      buyerEmail,
      buyerPhone,
      message,
      inquiryType: 'general',
    });

    apiLogger.info(`[inquiryController] General inquiry sent and saved: inquiry ${inquiry._id} for agent ${agent._id}`);

    res.json({
      message: 'Your inquiry has been sent successfully',
      recipient: agent.name,
      inquiryId: inquiry._id,
    });
  } catch (error: any) {
    apiLogger.error('Send agent inquiry error:', error);
    res.status(500).json({
      message: 'Error sending inquiry',
    });
  }
};

/**
 * @desc    Send area search inquiry to agents in a specific location
 * @route   POST /api/inquiries/area-search
 * @access  Public
 */
export const sendAreaSearchInquiry = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { location, message, buyerName, buyerEmail, buyerPhone, propertyType, budget } = req.body;

    // Validate required fields
    if (!location || !message || !buyerName || !buyerEmail) {
      res.status(400).json({
        message: 'Location, message, name, and email are required',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerEmail)) {
      res.status(400).json({ message: 'Invalid email format' });
      return;
    }

    // Find agents that have properties in the specified location
    // This is a simple implementation - you might want to add more sophisticated matching
    const properties = await Property.find({
      $or: [
        { city: { $regex: location, $options: 'i' } },
        { country: { $regex: location, $options: 'i' } },
      ],
      status: 'active',
    })
      .populate('sellerId', 'name email role')
      .limit(50);

    // Get unique agents from properties
    const agentEmails = new Set<string>();
    const agents: Array<{ id: string; email: string; name: string }> = [];

    for (const property of properties) {
      const seller = property.sellerId as any;
      if (seller && seller.role === 'agent' && !agentEmails.has(seller.email)) {
        agentEmails.add(seller.email);
        agents.push({ id: seller._id, email: seller.email, name: seller.name });
      }
    }

    if (agents.length === 0) {
      res.status(404).json({
        message: 'No agents found in the specified area',
      });
      return;
    }

    // Build enhanced message with search details
    let enhancedMessage = message;
    if (propertyType || budget) {
      enhancedMessage += '\n\n--- Search Preferences ---';
      if (propertyType) enhancedMessage += `\nProperty Type: ${propertyType}`;
      if (budget) enhancedMessage += `\nBudget: €${budget.toLocaleString()}`;
    }

    // Send inquiry to up to 5 agents in the area
    const targetAgents = agents.slice(0, 5);

    // Save inquiries to database and send emails
    const inquiryIds: string[] = [];
    const sendPromises = targetAgents.map(async (agent) => {
      // Save inquiry for each agent
      const inquiry = await Inquiry.create({
        type: 'area_search',
        status: 'new',
        buyerName,
        buyerEmail,
        buyerPhone,
        recipientId: agent.id,
        recipientName: agent.name,
        recipientEmail: agent.email,
        message: enhancedMessage,
        location,
        propertyType,
        budget,
      });
      inquiryIds.push(String(inquiry._id));

      // Send email
      return sendAgentInquiry({
        agentEmail: agent.email,
        agentName: agent.name,
        buyerName,
        buyerEmail,
        buyerPhone,
        message: enhancedMessage,
        location,
        inquiryType: 'area_search',
      });
    });

    await Promise.all(sendPromises);

    apiLogger.info(`[inquiryController] Area search inquiry sent and saved to ${targetAgents.length} agents for location: ${location} (IDs: ${inquiryIds.join(', ')})`);

    res.json({
      message: `Your inquiry has been sent to ${targetAgents.length} agent(s) in ${location}`,
      agentCount: targetAgents.length,
      inquiryIds,
    });
  } catch (error: any) {
    apiLogger.error('Send area search inquiry error:', error);
    res.status(500).json({
      message: 'Error sending inquiry',
    });
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
    const { name, email, phone, subject, message } = req.body;

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
    const trimmedPhone = phone ? String(phone).trim() : undefined;

    // Save the inquiry to database
    const inquiry = await Inquiry.create({
      type: 'contact',
      status: 'new',
      buyerName: trimmedName,
      buyerEmail: trimmedEmail,
      buyerPhone: trimmedPhone,
      subject,
      message: trimmedMessage,
    });

    // Send notification email to platform team
    try {
      await sendEmail({
        to: CONTACT_EMAIL,
        subject: `[Contact Form] ${subject} - from ${trimmedName}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>From:</strong> ${trimmedName} (${trimmedEmail})</p>
          ${trimmedPhone ? `<p><strong>Phone:</strong> ${trimmedPhone}</p>` : ''}
          <p><strong>Subject:</strong> ${subject}</p>
          <hr />
          <p><strong>Message:</strong></p>
          <p>${trimmedMessage.replace(/\n/g, '<br>')}</p>
          <hr />
          <p><em>Inquiry ID: ${inquiry._id}</em></p>
        `,
        text: `New contact form submission from ${trimmedName} (${trimmedEmail}). Subject: ${subject}. Message: ${trimmedMessage}`,
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
