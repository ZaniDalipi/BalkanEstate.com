import mongoose from 'mongoose';
import Agency, { IAgency } from '../models/Agency';
import Agent from '../models/Agent';
import User from '../models/User';
import { agencyLogger } from '../utils/logger';

/**
 * Sync an agent's attributes (languages, serviceAreas, specializations, certifications)
 * into the agency profile when the agent joins.
 * Uses $addToSet to merge unique values without duplicates.
 */
export async function syncAgentAttributesToAgency(
  agency: IAgency,
  agentUserId: string | mongoose.Types.ObjectId
): Promise<{ synced: boolean; added: Record<string, string[]> }> {
  const added: Record<string, string[]> = {
    languages: [],
    serviceAreas: [],
    specializations: [],
    certifications: [],
  };

  try {
    const agentProfile = await Agent.findOne({ userId: agentUserId }).lean();
    const agentUser = await User.findById(agentUserId).lean();

    if (!agentProfile && !agentUser) {
      agencyLogger.warn(`⚠️ No agent profile or user found for sync: ${agentUserId}`);
      return { synced: false, added };
    }

    // Collect agent languages
    const agentLanguages: string[] = (agentProfile as any)?.languages || [];
    const currentLanguages = new Set((agency.languages || []).map((l: string) => l.toLowerCase()));
    for (const lang of agentLanguages) {
      if (lang && !currentLanguages.has(lang.toLowerCase())) {
        added.languages.push(lang);
      }
    }

    // Collect agent service areas
    const agentServiceAreas: string[] = (agentProfile as any)?.serviceAreas || [];
    const currentServiceAreas = new Set((agency.serviceAreas || []).map((s: string) => s.toLowerCase()));
    for (const area of agentServiceAreas) {
      if (area && !currentServiceAreas.has(area.toLowerCase())) {
        added.serviceAreas.push(area);
      }
    }

    // Add agent's city to service areas if not already present
    const agentCity = (agentUser as any)?.city as string | undefined;
    if (agentCity && !currentServiceAreas.has(agentCity.toLowerCase()) &&
        !added.serviceAreas.some(a => a.toLowerCase() === agentCity.toLowerCase())) {
      added.serviceAreas.push(agentCity);
    }

    // Add agent's country to service areas if different from agency's country
    const agentCountry = (agentUser as any)?.country as string | undefined;
    if (agentCountry && agency.country &&
        agentCountry.toLowerCase() !== agency.country.toLowerCase()) {
      if (!currentServiceAreas.has(agentCountry.toLowerCase()) &&
          !added.serviceAreas.some(a => a.toLowerCase() === agentCountry.toLowerCase())) {
        added.serviceAreas.push(agentCountry);
      }
    }

    // Collect agent specializations
    const agentSpecializations: string[] = (agentProfile as any)?.specializations || [];
    const currentSpecializations = new Set((agency.specializations || []).map((s: string) => s.toLowerCase()));
    for (const spec of agentSpecializations) {
      if (spec && !currentSpecializations.has(spec.toLowerCase())) {
        added.specializations.push(spec);
      }
    }

    // Collect agent credentials/certifications
    const agentCredentials: Array<{ title: string }> = (agentProfile as any)?.credentials || [];
    const currentCertifications = new Set((agency.certifications || []).map((c: string) => c.toLowerCase()));
    for (const cred of agentCredentials) {
      const credTitle = cred.title;
      if (credTitle && !currentCertifications.has(credTitle.toLowerCase())) {
        added.certifications.push(credTitle);
      }
    }

    // Apply updates using $addToSet for atomicity
    const updateOps: Record<string, any> = {};
    if (added.languages.length > 0) {
      updateOps.languages = { $each: added.languages };
    }
    if (added.serviceAreas.length > 0) {
      updateOps.serviceAreas = { $each: added.serviceAreas };
    }
    if (added.specializations.length > 0) {
      updateOps.specializations = { $each: added.specializations };
    }
    if (added.certifications.length > 0) {
      updateOps.certifications = { $each: added.certifications };
    }

    if (Object.keys(updateOps).length > 0) {
      await Agency.findByIdAndUpdate(agency._id, {
        $addToSet: updateOps,
      });

      agencyLogger.info(
        `✅ Synced agent ${agentUserId} attributes to agency ${agency.name}: ` +
        `languages=[${added.languages.join(', ')}], ` +
        `serviceAreas=[${added.serviceAreas.join(', ')}], ` +
        `specializations=[${added.specializations.join(', ')}], ` +
        `certifications=[${added.certifications.join(', ')}]`
      );
    } else {
      agencyLogger.info(`ℹ️ No new attributes to sync for agent ${agentUserId} in agency ${agency.name}`);
    }

    return { synced: true, added };
  } catch (error) {
    agencyLogger.error(`❌ Failed to sync agent attributes for ${agentUserId}:`, error);
    return { synced: false, added };
  }
}

/**
 * Recalculate agency aggregate attributes (languages, serviceAreas, specializations, certifications)
 * from the agency owner + all remaining active agents.
 * Called when an agent leaves or is removed.
 */
export async function recalculateAgencyAttributes(
  agencyId: string | mongoose.Types.ObjectId
): Promise<{ recalculated: boolean }> {
  try {
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      agencyLogger.warn(`⚠️ Agency not found for attribute recalculation: ${agencyId}`);
      return { recalculated: false };
    }

    // Helper to normalize and add to map (preserves original casing, dedupes by lowercase)
    const langMap = new Map<string, string>();
    const areaMap = new Map<string, string>();
    const specMap = new Map<string, string>();
    const certMap = new Map<string, string>();

    const addToNormalized = (map: Map<string, string>, values: string[]) => {
      for (const val of values) {
        if (!val) continue;
        const key = val.toLowerCase();
        if (!map.has(key)) {
          map.set(key, val);
        }
      }
    };

    // Start with the owner's profile data
    const ownerAgent = await Agent.findOne({ userId: agency.ownerId }).lean() as any;
    const owner = await User.findById(agency.ownerId).lean() as any;

    if (ownerAgent) {
      addToNormalized(langMap, ownerAgent.languages || []);
      addToNormalized(areaMap, ownerAgent.serviceAreas || []);
      addToNormalized(specMap, ownerAgent.specializations || []);
      const ownerCreds = (ownerAgent.credentials || []).map((c: any) => c.title).filter(Boolean);
      addToNormalized(certMap, ownerCreds);
    }
    if (owner?.city) addToNormalized(areaMap, [owner.city]);

    // Add all remaining active agents' data
    const activeAgentIds = agency.agents.map(id => id.toString());
    if (activeAgentIds.length > 0) {
      const agentProfiles = await Agent.find({
        userId: { $in: activeAgentIds },
      }).lean() as any[];

      const agentUsers = await User.find({
        _id: { $in: activeAgentIds },
      }).lean() as any[];

      const userMap = new Map(agentUsers.map((u: any) => [String(u._id), u]));

      for (const profile of agentProfiles) {
        addToNormalized(langMap, profile.languages || []);
        addToNormalized(areaMap, profile.serviceAreas || []);
        addToNormalized(specMap, profile.specializations || []);
        const creds = (profile.credentials || []).map((c: any) => c.title).filter(Boolean);
        addToNormalized(certMap, creds);

        // Add user's city
        const user = userMap.get(String(profile.userId));
        if (user?.city) addToNormalized(areaMap, [user.city]);
        // Add user's country as service area if different from agency country
        if (user?.country && agency.country &&
            user.country.toLowerCase() !== agency.country.toLowerCase()) {
          addToNormalized(areaMap, [user.country]);
        }
      }
    }

    // Update agency
    agency.languages = Array.from(langMap.values());
    agency.serviceAreas = Array.from(areaMap.values());
    agency.specializations = Array.from(specMap.values());
    agency.certifications = Array.from(certMap.values());
    await agency.save();

    agencyLogger.info(
      `✅ Recalculated agency ${agency.name} attributes: ` +
      `languages=${agency.languages?.length || 0}, ` +
      `serviceAreas=${agency.serviceAreas?.length || 0}, ` +
      `specializations=${agency.specializations?.length || 0}, ` +
      `certifications=${agency.certifications?.length || 0}`
    );

    return { recalculated: true };
  } catch (error) {
    agencyLogger.error(`❌ Failed to recalculate agency attributes for ${agencyId}:`, error);
    return { recalculated: false };
  }
}
