import React, { useState, useEffect } from 'react';
import { Agency, Property } from '../types';
import { getAgency } from '../services/apiService';
import PropertyCard from './shared/PropertyCard';
import { BuildingOfficeIcon, PhoneIcon, EnvelopeIcon, GlobeAltIcon } from '../constants';

interface AgencyPageProps {
  agencyId: string;
}

const AgencyPage: React.FC<AgencyPageProps> = ({ agencyId }) => {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgency = async () => {
      try {
        setLoading(true);
        const response = await getAgency(agencyId);
        setAgency(response.agency);
        setProperties(response.properties || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agency');
      } finally {
        setLoading(false);
      }
    };

    if (agencyId) {
      fetchAgency();
    }
  }, [agencyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">Agency Not Found</h2>
          <p className="text-neutral-600">{error || 'The agency you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Cover Image */}
      {agency.coverImage && (
        <div className="w-full h-64 bg-gradient-to-r from-primary to-primary-dark">
          <img src={agency.coverImage} alt={agency.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Agency Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 -mt-20 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Logo */}
            {agency.logo && (
              <img src={agency.logo} alt={agency.name} className="w-24 h-24 rounded-full border-4 border-white shadow-lg" />
            )}

            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                <BuildingOfficeIcon className="w-6 h-6 text-primary" />
                <h1 className="text-3xl font-bold text-neutral-800">{agency.name}</h1>
              </div>

              {agency.description && (
                <p className="text-neutral-600 mt-2 max-w-3xl">{agency.description}</p>
              )}

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 mt-4 justify-center md:justify-start">
                {agency.phone && (
                  <a href={`tel:${agency.phone}`} className="flex items-center gap-2 text-neutral-700 hover:text-primary">
                    <PhoneIcon className="w-5 h-5" />
                    <span>{agency.phone}</span>
                  </a>
                )}
                {agency.email && (
                  <a href={`mailto:${agency.email}`} className="flex items-center gap-2 text-neutral-700 hover:text-primary">
                    <EnvelopeIcon className="w-5 h-5" />
                    <span>{agency.email}</span>
                  </a>
                )}
                {agency.website && (
                  <a href={agency.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-neutral-700 hover:text-primary">
                    <GlobeAltIcon className="w-5 h-5" />
                    <span>Visit Website</span>
                  </a>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-6 mt-6 justify-center md:justify-start">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{agency.totalProperties || 0}</p>
                  <p className="text-sm text-neutral-600">Properties</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{agency.totalAgents || 0}</p>
                  <p className="text-sm text-neutral-600">Agents</p>
                </div>
                {agency.yearsInBusiness && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{agency.yearsInBusiness}</p>
                    <p className="text-sm text-neutral-600">Years in Business</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Agents Section */}
        {agency.agents && agency.agents.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-neutral-800 mb-4">Our Agents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {agency.agents.map((agent) => (
                <div key={agent._id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4">
                    {agent.avatarUrl && (
                      <img src={agent.avatarUrl} alt={`${agent.name}'s avatar`} className="w-16 h-16 rounded-full" />
                    )}
                    <div>
                      <h3 className="font-bold text-neutral-800">{agent.name}</h3>
                      {agent.phone && <p className="text-sm text-neutral-600">{agent.phone}</p>}
                      {agent.email && <p className="text-sm text-neutral-600">{agent.email}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Properties Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-neutral-800 mb-4">Our Properties</h2>
          {properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-neutral-600">No properties currently listed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgencyPage;
