/**
 * Public buyer → agent inquiries (property, agent, area search).
 *
 * These endpoints need no login, so every request passes readBuyerContact
 * (honeypot + field validation, phone must be a real number) and admitSender
 * (duplicates, per-email/per-IP caps, rotating phone numbers) before anything
 * is saved or emailed. A signed-in sender is recorded as buyerId.
 */
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { sendAgentInquiry } from '../services/emailService';
import User from '../models/User';
import Property from '../models/Property';
import Inquiry from '../models/Inquiry';
import { apiLogger } from '../utils/logger';
import { resolveId } from '../utils/idObfuscation';
import { escapeRegex } from '../utils/escapeRegex';
import { admitSender, readBuyerContact } from './inquiryAdmission';

const LOCATION_MAX = 100;
const PROPERTY_TYPE_MAX = 50;
const AREA_SEARCH_MAX_AGENTS = 5;

const SUCCESS_MESSAGE = 'Your inquiry has been sent successfully';

/** A database id from an obfuscated or raw id, or null when it isn't one. */
const toObjectId = (raw: unknown): string | null => {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 64) return null;
  const id = resolveId(raw) || raw;
  return mongoose.isValidObjectId(id) ? String(id) : null;
};

const short = (v: unknown, max: number): string | undefined => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s && s.length <= max ? s : undefined;
};

/**
 * @route   POST /api/inquiries/property
 * @access  Public (rate limited, sender checks)
 */
export const sendPropertyInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const admission = readBuyerContact(req, res);
    if (admission.ok === false) return;
    const { contact, senderIpHash } = admission;

    const propertyId = toObjectId(req.body.propertyId);
    if (!propertyId) {
      res.status(400).json({ message: 'Property ID is required', code: 'invalid_property' });
      return;
    }

    const property = await Property.findOne({ _id: propertyId, status: { $ne: 'draft' } });
    if (!property) {
      res.status(404).json({ message: 'Property not found', code: 'property_not_found' });
      return;
    }
    const seller = await User.findById(property.sellerId);
    if (!seller) {
      res.status(404).json({ message: 'Property owner not found', code: 'property_not_found' });
      return;
    }

    const admitted = await admitSender(res, {
      buyerEmail: contact.buyerEmail,
      buyerPhone: contact.buyerPhone,
      propertyId: String(property._id),
      recipientId: String(seller._id),
      senderIpHash,
    });
    if (!admitted) return;

    const location = [property.city, property.country].filter(Boolean).join(', ');
    const inquiry = await Inquiry.create({
      type: 'property',
      status: 'new',
      ...contact,
      buyerId: req.user?._id,
      senderIpHash,
      recipientId: seller._id,
      recipientName: seller.name,
      recipientEmail: seller.email,
      propertyId: property._id,
      propertyTitle: property.title,
      location,
    });

    await sendAgentInquiry({
      agentEmail: seller.email,
      agentName: seller.name,
      ...contact,
      propertyTitle: property.title,
      propertyId: String(property._id),
      location,
      inquiryType: 'property',
    });

    apiLogger.info(`[inquiry] Property inquiry ${inquiry._id} saved for property ${property._id}`);
    res.json({ message: SUCCESS_MESSAGE, recipient: seller.name, inquiryId: inquiry._id });
  } catch (error) {
    apiLogger.error('Send property inquiry error:', error);
    res.status(500).json({ message: 'Error sending inquiry' });
  }
};

/**
 * @route   POST /api/inquiries/agent
 * @access  Public (rate limited, sender checks)
 */
export const sendAgentGeneralInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const admission = readBuyerContact(req, res);
    if (admission.ok === false) return;
    const { contact, senderIpHash } = admission;

    const agentId = toObjectId(req.body.agentId);
    const agent = agentId ? await User.findById(agentId) : null;
    if (!agent || agent.role !== 'agent') {
      res.status(404).json({ message: 'Agent not found', code: 'agent_not_found' });
      return;
    }

    const admitted = await admitSender(res, {
      buyerEmail: contact.buyerEmail,
      buyerPhone: contact.buyerPhone,
      recipientId: String(agent._id),
      senderIpHash,
    });
    if (!admitted) return;

    const inquiry = await Inquiry.create({
      type: 'agent',
      status: 'new',
      ...contact,
      buyerId: req.user?._id,
      senderIpHash,
      recipientId: agent._id,
      recipientName: agent.name,
      recipientEmail: agent.email,
    });

    await sendAgentInquiry({
      agentEmail: agent.email,
      agentName: agent.name,
      ...contact,
      inquiryType: 'general',
    });

    apiLogger.info(`[inquiry] General inquiry ${inquiry._id} saved for agent ${agent._id}`);
    res.json({ message: SUCCESS_MESSAGE, recipient: agent.name, inquiryId: inquiry._id });
  } catch (error) {
    apiLogger.error('Send agent inquiry error:', error);
    res.status(500).json({ message: 'Error sending inquiry' });
  }
};

/** Agents with active listings in the place the buyer named (at most five). */
const findAreaAgents = async (location: string) => {
  const pattern = escapeRegex(location);
  const properties = await Property.find({
    $or: [{ city: { $regex: pattern, $options: 'i' } }, { country: { $regex: pattern, $options: 'i' } }],
    status: 'active',
  })
    .select('sellerId')
    .populate<{ sellerId: { _id: mongoose.Types.ObjectId; name: string; email: string; role: string } | null }>(
      'sellerId',
      'name email role'
    )
    .limit(50);

  const seen = new Set<string>();
  const agents: { id: mongoose.Types.ObjectId; email: string; name: string }[] = [];
  for (const { sellerId: seller } of properties) {
    if (seller && seller.role === 'agent' && !seen.has(seller.email)) {
      seen.add(seller.email);
      agents.push({ id: seller._id, email: seller.email, name: seller.name });
    }
  }
  return agents.slice(0, AREA_SEARCH_MAX_AGENTS);
};

/**
 * @route   POST /api/inquiries/area-search
 * @access  Public (rate limited, sender checks)
 */
export const sendAreaSearchInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const admission = readBuyerContact(req, res);
    if (admission.ok === false) return;
    const { contact, senderIpHash } = admission;

    const location = short(req.body.location, LOCATION_MAX);
    if (!location || location.length < 2) {
      res.status(400).json({ message: 'Location is required', code: 'invalid_location', field: 'location' });
      return;
    }
    const propertyType = short(req.body.propertyType, PROPERTY_TYPE_MAX);
    const budgetNumber = Number(req.body.budget);
    const budget = Number.isFinite(budgetNumber) && budgetNumber > 0 ? Math.round(budgetNumber) : undefined;

    const agents = await findAreaAgents(location);
    if (agents.length === 0) {
      res.status(404).json({ message: 'No agents found in the specified area', code: 'no_agents_found' });
      return;
    }

    const admitted = await admitSender(res, {
      buyerEmail: contact.buyerEmail,
      buyerPhone: contact.buyerPhone,
      senderIpHash,
      count: agents.length,
    });
    if (!admitted) return;

    let message = contact.message;
    if (propertyType || budget) {
      message += '\n\n--- Search Preferences ---';
      if (propertyType) message += `\nProperty Type: ${propertyType}`;
      if (budget) message += `\nBudget: €${budget.toLocaleString('en')}`;
    }

    const inquiryIds = await Promise.all(
      agents.map(async (agent) => {
        const inquiry = await Inquiry.create({
          type: 'area_search',
          status: 'new',
          ...contact,
          message,
          buyerId: req.user?._id,
          senderIpHash,
          recipientId: agent.id,
          recipientName: agent.name,
          recipientEmail: agent.email,
          location,
          propertyType,
          budget,
        });
        await sendAgentInquiry({
          agentEmail: agent.email,
          agentName: agent.name,
          ...contact,
          message,
          location,
          inquiryType: 'area_search',
        });
        return String(inquiry._id);
      })
    );

    apiLogger.info(`[inquiry] Area search inquiry sent to ${agents.length} agents (IDs: ${inquiryIds.join(', ')})`);
    res.json({
      message: `Your inquiry has been sent to ${agents.length} agent(s) in ${location}`,
      agentCount: agents.length,
      inquiryIds,
    });
  } catch (error) {
    apiLogger.error('Send area search inquiry error:', error);
    res.status(500).json({ message: 'Error sending inquiry' });
  }
};
