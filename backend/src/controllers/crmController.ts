import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Lead, { LeadStage, LeadSource } from '../models/Lead';
import Inquiry from '../models/Inquiry';
import { apiLogger } from '../utils/logger';

const VALID_STAGES: LeadStage[] = [
  'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost',
];
const VALID_SOURCES: LeadSource[] = [
  'inquiry', 'referral', 'website', 'social', 'walk_in', 'other',
];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

function validateLeadInput(body: Record<string, unknown>): string | null {
  const { name, email, phone, stage, source, budget, nextActionDate } = body;

  if (!name || typeof name !== 'string' || String(name).trim().length < 2) {
    return 'Name must be at least 2 characters';
  }
  if (String(name).trim().length > 150) {
    return 'Name must be at most 150 characters';
  }
  if (!email || typeof email !== 'string') {
    return 'Email is required';
  }
  if (!EMAIL_REGEX.test(String(email).trim().toLowerCase())) {
    return 'Invalid email format';
  }
  if (phone) {
    const cleaned = String(phone).replace(/[\s\-\(\)\.]/g, '');
    if (!PHONE_REGEX.test(cleaned)) {
      return 'Invalid phone number format';
    }
  }
  if (stage && !VALID_STAGES.includes(stage as LeadStage)) {
    return `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}`;
  }
  if (source && !VALID_SOURCES.includes(source as LeadSource)) {
    return `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}`;
  }
  if (budget !== undefined && budget !== null) {
    const b = Number(budget);
    if (isNaN(b) || b < 0) return 'Budget must be a non-negative number';
  }
  if (nextActionDate) {
    const d = new Date(String(nextActionDate));
    if (isNaN(d.getTime())) return 'Invalid nextActionDate';
  }
  return null;
}

/**
 * @desc    List leads for the authenticated agent (with optional filters)
 * @route   GET /api/crm/leads
 * @access  Agent/Agency owner
 */
export const getLeads = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const {
      stage,
      source,
      search,
      isArchived,
      page = '1',
      limit = '50',
      sortBy = 'createdAt',
      sortDir = 'desc',
    } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { agentId: user._id };

    if (stage && VALID_STAGES.includes(stage as LeadStage)) {
      filter.stage = stage;
    }
    if (source && VALID_SOURCES.includes(source as LeadSource)) {
      filter.source = source;
    }
    filter.isArchived = isArchived === 'true';

    if (search) {
      const q = { $regex: search, $options: 'i' };
      filter.$or = [{ name: q }, { email: q }, { preferredLocation: q }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const sortAllowed = ['createdAt', 'updatedAt', 'name', 'nextActionDate', 'budget'];
    const sortField = sortAllowed.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = sortDir === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      Lead.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .select('-activities')
        .lean(),
      Lead.countDocuments(filter),
    ]);

    res.json({ items, total, page: pageNum, limit: limitNum });
  } catch (error) {
    apiLogger.error('[crmController] getLeads error:', error);
    res.status(500).json({ message: 'Error fetching leads' });
  }
};

/**
 * @desc    Get pipeline summary (counts per stage)
 * @route   GET /api/crm/leads/pipeline
 * @access  Agent/Agency owner
 */
export const getPipelineSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const counts = await Lead.aggregate([
      { $match: { agentId: new mongoose.Types.ObjectId(String(user._id)), isArchived: false } },
      { $group: { _id: '$stage', count: { $sum: 1 } } },
    ]);

    const summary: Record<string, number> = {};
    for (const stage of VALID_STAGES) summary[stage] = 0;
    for (const row of counts) summary[row._id] = row.count;

    res.json(summary);
  } catch (error) {
    apiLogger.error('[crmController] getPipelineSummary error:', error);
    res.status(500).json({ message: 'Error fetching pipeline summary' });
  }
};

/**
 * @desc    Get single lead with full activity log
 * @route   GET /api/crm/leads/:leadId
 * @access  Lead owner (agent)
 */
export const getLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const leadId = String(req.params.leadId);

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      res.status(400).json({ message: 'Invalid lead ID' });
      return;
    }

    const lead = await Lead.findOne({ _id: leadId, agentId: user._id });
    if (!lead) {
      res.status(404).json({ message: 'Lead not found' });
      return;
    }

    res.json(lead);
  } catch (error) {
    apiLogger.error('[crmController] getLead error:', error);
    res.status(500).json({ message: 'Error fetching lead' });
  }
};

/**
 * @desc    Create a new lead
 * @route   POST /api/crm/leads
 * @access  Agent
 */
export const createLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const body = req.body as Record<string, unknown>;

    const validationError = validateLeadInput(body);
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    const {
      name, email, phone, stage, source, propertyId, propertyTitle,
      inquiryId, budget, preferredLocation, preferredPropertyType,
      notes, nextAction, nextActionDate,
    } = body;

    const lead = await Lead.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : undefined,
      stage: (stage as LeadStage) || 'new',
      source: (source as LeadSource) || 'other',
      agentId: user._id,
      agencyId: user.agencyId,
      propertyId: propertyId || undefined,
      propertyTitle: propertyTitle ? String(propertyTitle) : undefined,
      inquiryId: inquiryId || undefined,
      budget: budget !== undefined ? Number(budget) : undefined,
      preferredLocation: preferredLocation ? String(preferredLocation) : undefined,
      preferredPropertyType: preferredPropertyType ? String(preferredPropertyType) : undefined,
      notes: notes ? String(notes) : undefined,
      nextAction: nextAction ? String(nextAction) : undefined,
      nextActionDate: nextActionDate ? new Date(String(nextActionDate)) : undefined,
      activities: [{
        action: 'lead_created',
        performedBy: user._id,
        performedByName: user.name,
      }],
    });

    apiLogger.info(`[crmController] Lead created: ${lead._id} by agent ${user._id}`);
    res.status(201).json(lead);
  } catch (error) {
    apiLogger.error('[crmController] createLead error:', error);
    res.status(500).json({ message: 'Error creating lead' });
  }
};

/**
 * @desc    Update a lead's details or stage
 * @route   PUT /api/crm/leads/:leadId
 * @access  Lead owner (agent)
 */
export const updateLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const leadId = String(req.params.leadId);
    const body = req.body as Record<string, unknown>;

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      res.status(400).json({ message: 'Invalid lead ID' });
      return;
    }

    const lead = await Lead.findOne({ _id: leadId, agentId: user._id });
    if (!lead) {
      res.status(404).json({ message: 'Lead not found' });
      return;
    }

    // Only validate supplied fields
    const partialBody = { name: lead.name, email: lead.email, ...body };
    const validationError = validateLeadInput(partialBody);
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    const prevStage = lead.stage;
    const activities = [...lead.activities];

    const allowedFields = [
      'name', 'email', 'phone', 'stage', 'source', 'budget',
      'preferredLocation', 'preferredPropertyType', 'notes',
      'nextAction', 'nextActionDate', 'closedReason',
    ] as const;

    for (const field of allowedFields) {
      if (field in body && body[field] !== undefined) {
        (lead as any)[field] = body[field];
      }
    }

    if (body.stage && body.stage !== prevStage) {
      activities.push({
        action: 'stage_changed',
        note: `${prevStage} → ${body.stage}`,
        performedBy: user._id,
        performedByName: user.name,
        createdAt: new Date(),
      });
      if (body.stage === 'contacted') {
        lead.lastContactedAt = new Date();
      }
    }

    lead.activities = activities as any;
    await lead.save();

    apiLogger.info(`[crmController] Lead ${leadId} updated by ${user._id}`);
    res.json(lead);
  } catch (error) {
    apiLogger.error('[crmController] updateLead error:', error);
    res.status(500).json({ message: 'Error updating lead' });
  }
};

/**
 * @desc    Move a lead to a different pipeline stage
 * @route   PATCH /api/crm/leads/:leadId/stage
 * @access  Lead owner (agent)
 */
export const moveLeadStage = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const leadId = String(req.params.leadId);
    const { stage, note } = req.body as { stage: string; note?: string };

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      res.status(400).json({ message: 'Invalid lead ID' });
      return;
    }
    if (!stage || !VALID_STAGES.includes(stage as LeadStage)) {
      res.status(400).json({ message: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` });
      return;
    }

    const lead = await Lead.findOne({ _id: leadId, agentId: user._id });
    if (!lead) {
      res.status(404).json({ message: 'Lead not found' });
      return;
    }

    const prevStage = lead.stage;
    lead.stage = stage as LeadStage;

    if (stage === 'contacted') lead.lastContactedAt = new Date();

    lead.activities.push({
      action: 'stage_changed',
      note: note || `${prevStage} → ${stage}`,
      performedBy: user._id,
      performedByName: user.name,
      createdAt: new Date(),
    } as any);

    await lead.save();

    res.json({ stage: lead.stage, updatedAt: lead.updatedAt });
  } catch (error) {
    apiLogger.error('[crmController] moveLeadStage error:', error);
    res.status(500).json({ message: 'Error moving lead stage' });
  }
};

/**
 * @desc    Add an activity note to a lead
 * @route   POST /api/crm/leads/:leadId/activities
 * @access  Lead owner (agent)
 */
export const addActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const leadId = String(req.params.leadId);
    const { action, note } = req.body as { action: string; note?: string };

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      res.status(400).json({ message: 'Invalid lead ID' });
      return;
    }
    if (!action || typeof action !== 'string' || action.trim().length === 0) {
      res.status(400).json({ message: 'Action is required' });
      return;
    }
    if (action.trim().length > 200) {
      res.status(400).json({ message: 'Action must be at most 200 characters' });
      return;
    }
    if (note && String(note).length > 2000) {
      res.status(400).json({ message: 'Note must be at most 2000 characters' });
      return;
    }

    const lead = await Lead.findOne({ _id: leadId, agentId: user._id });
    if (!lead) {
      res.status(404).json({ message: 'Lead not found' });
      return;
    }

    const activity = {
      action: action.trim(),
      note: note ? String(note).trim() : undefined,
      performedBy: user._id,
      performedByName: user.name,
      createdAt: new Date(),
    };

    lead.activities.push(activity as any);
    if (action.toLowerCase().includes('call') || action.toLowerCase().includes('contact')) {
      lead.lastContactedAt = new Date();
    }
    await lead.save();

    res.status(201).json({ activity, activities: lead.activities });
  } catch (error) {
    apiLogger.error('[crmController] addActivity error:', error);
    res.status(500).json({ message: 'Error adding activity' });
  }
};

/**
 * @desc    Archive or restore a lead
 * @route   PATCH /api/crm/leads/:leadId/archive
 * @access  Lead owner (agent)
 */
export const archiveLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const leadId = String(req.params.leadId);
    const { isArchived } = req.body as { isArchived: boolean };

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      res.status(400).json({ message: 'Invalid lead ID' });
      return;
    }

    const lead = await Lead.findOne({ _id: leadId, agentId: user._id });
    if (!lead) {
      res.status(404).json({ message: 'Lead not found' });
      return;
    }

    lead.isArchived = !!isArchived;
    lead.activities.push({
      action: isArchived ? 'archived' : 'restored',
      performedBy: user._id,
      performedByName: user.name,
      createdAt: new Date(),
    } as any);
    await lead.save();

    res.json({ isArchived: lead.isArchived });
  } catch (error) {
    apiLogger.error('[crmController] archiveLead error:', error);
    res.status(500).json({ message: 'Error archiving lead' });
  }
};

/**
 * @desc    Delete a lead permanently
 * @route   DELETE /api/crm/leads/:leadId
 * @access  Lead owner (agent)
 */
export const deleteLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const leadId = String(req.params.leadId);

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      res.status(400).json({ message: 'Invalid lead ID' });
      return;
    }

    const lead = await Lead.findOneAndDelete({ _id: leadId, agentId: user._id });
    if (!lead) {
      res.status(404).json({ message: 'Lead not found' });
      return;
    }

    apiLogger.info(`[crmController] Lead ${leadId} deleted by agent ${user._id}`);
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    apiLogger.error('[crmController] deleteLead error:', error);
    res.status(500).json({ message: 'Error deleting lead' });
  }
};

/**
 * @desc    Convert an inquiry into a CRM lead
 * @route   POST /api/crm/leads/from-inquiry/:inquiryId
 * @access  Agent (recipient of the inquiry)
 */
export const createLeadFromInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const inquiryId = String(req.params.inquiryId);

    if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
      res.status(400).json({ message: 'Invalid inquiry ID' });
      return;
    }

    const inquiry = await Inquiry.findOne({ _id: inquiryId, recipientId: user._id });
    if (!inquiry) {
      res.status(404).json({ message: 'Inquiry not found or not assigned to you' });
      return;
    }

    const existing = await Lead.findOne({ inquiryId: inquiry._id, agentId: user._id });
    if (existing) {
      res.status(409).json({ message: 'A lead already exists for this inquiry', leadId: existing._id });
      return;
    }

    const lead = await Lead.create({
      name: inquiry.buyerName,
      email: inquiry.buyerEmail,
      phone: inquiry.buyerPhone,
      stage: 'new',
      source: 'inquiry',
      agentId: user._id,
      propertyId: inquiry.propertyId,
      propertyTitle: inquiry.propertyTitle,
      inquiryId: inquiry._id,
      budget: inquiry.budget,
      preferredLocation: inquiry.location,
      preferredPropertyType: inquiry.propertyType,
      notes: inquiry.message,
      activities: [{
        action: 'lead_created_from_inquiry',
        note: `Converted from inquiry ${inquiryId}`,
        performedBy: user._id,
        performedByName: user.name,
      }],
    });

    apiLogger.info(`[crmController] Lead ${lead._id} created from inquiry ${inquiryId}`);
    res.status(201).json(lead);
  } catch (error) {
    apiLogger.error('[crmController] createLeadFromInquiry error:', error);
    res.status(500).json({ message: 'Error creating lead from inquiry' });
  }
};
