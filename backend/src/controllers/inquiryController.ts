import { Request, Response } from 'express';
import { sendAgentInquiry } from '../services/emailService';
import User from '../models/User';
import Agent from '../models/Agent';
import Property from '../models/Property';
import Inquiry from '../models/Inquiry';
import { apiLogger } from '../utils/logger';

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
    const { propertyId, message, buyerName, buyerEmail, buyerPhone } = req.body;

    // Validate required fields
    if (!propertyId || !message || !buyerName || !buyerEmail) {
      res.status(400).json({
        message: 'Property ID, message, name, and email are required',
      });
      return;
    }

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
      error: error.message,
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
    const { agentId, message, buyerName, buyerEmail, buyerPhone } = req.body;

    // Validate required fields
    if (!agentId || !message || !buyerName || !buyerEmail) {
      res.status(400).json({
        message: 'Agent ID, message, name, and email are required',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerEmail)) {
      res.status(400).json({ message: 'Invalid email format' });
      return;
    }

    // Find the agent user
    const agent = await User.findById(agentId);
    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    if (agent.role !== 'agent') {
      res.status(400).json({ message: 'User is not an agent' });
      return;
    }

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

    apiLogger.info(`[inquiryController] General inquiry sent and saved: ${buyerEmail} -> ${agent.email} (ID: ${inquiry._id})`);

    res.json({
      message: 'Your inquiry has been sent successfully',
      recipient: agent.name,
      inquiryId: inquiry._id,
    });
  } catch (error: any) {
    apiLogger.error('Send agent inquiry error:', error);
    res.status(500).json({
      message: 'Error sending inquiry',
      error: error.message,
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
      error: error.message,
    });
  }
};
