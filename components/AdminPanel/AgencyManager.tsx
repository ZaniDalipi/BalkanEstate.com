import React, { useState, useEffect } from 'react';
import { PencilIcon, TrashIcon, XMarkIcon, EyeIcon, BuildingOfficeIcon } from '../../constants';
import { Agency } from '../../types';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

const AgencyManager: React.FC = () => {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // View modal
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingAgency, setViewingAgency] = useState<Agency | null>(null);

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    website: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: '',
    zipCode: '',
    lat: 0,
    lng: 0,
    facebookUrl: '',
    instagramUrl: '',
    linkedinUrl: '',
    twitterUrl: '',
    yearsInBusiness: 0,
    specialties: [] as string[],
    certifications: [] as string[],
    isFeatured: false,
    featuredStartDate: '',
    featuredEndDate: '',
    adRotationOrder: 0,
    businessHours: {
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: '',
    },
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAgencies, setTotalAgencies] = useState(0);

  useEffect(() => {
    fetchAgencies();
  }, [currentPage]);

  const fetchAgencies = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('balkan_estate_token');

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_URL}/admin/agencies?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch agencies');

      const data = await response.json();
      setAgencies(data.agencies || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalAgencies(data.pagination?.totalItems || 0);
    } catch (err) {
      setError('Failed to load agencies');
      console.error('Failed to fetch agencies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAgency = (agency: Agency) => {
    setViewingAgency(agency);
    setIsViewModalOpen(true);
  };

  const handleEditAgency = (agency: Agency) => {
    setEditingAgency(agency);
    setEditForm({
      name: agency.name,
      description: agency.description || '',
      website: agency.website || '',
      phone: agency.phone || '',
      email: agency.email || '',
      address: agency.address || '',
      city: agency.city || '',
      country: agency.country || '',
      zipCode: agency.zipCode || '',
      lat: agency.lat || 0,
      lng: agency.lng || 0,
      facebookUrl: agency.facebookUrl || '',
      instagramUrl: agency.instagramUrl || '',
      linkedinUrl: agency.linkedinUrl || '',
      twitterUrl: agency.twitterUrl || '',
      yearsInBusiness: agency.yearsInBusiness || 0,
      specialties: agency.specialties || [],
      certifications: agency.certifications || [],
      isFeatured: agency.isFeatured || false,
      featuredStartDate: agency.featuredStartDate ? agency.featuredStartDate.split('T')[0] : '',
      featuredEndDate: agency.featuredEndDate ? agency.featuredEndDate.split('T')[0] : '',
      adRotationOrder: agency.adRotationOrder || 0,
      businessHours: {
        monday: agency.businessHours?.monday || '',
        tuesday: agency.businessHours?.tuesday || '',
        wednesday: agency.businessHours?.wednesday || '',
        thursday: agency.businessHours?.thursday || '',
        friday: agency.businessHours?.friday || '',
        saturday: agency.businessHours?.saturday || '',
        sunday: agency.businessHours?.sunday || '',
      },
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgency) return;

    try {
      const token = localStorage.getItem('balkan_estate_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

      // Filter out empty strings from arrays before submitting
      const sanitizedForm = {
        ...editForm,
        specialties: editForm.specialties.filter(s => s),
        certifications: editForm.certifications.filter(s => s),
      };

      const response = await fetch(`${API_URL}/admin/agencies/${editingAgency._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(sanitizedForm),
      });

      if (!response.ok) throw new Error('Failed to update agency');

      await fetchAgencies();
      setIsEditModalOpen(false);
      setEditingAgency(null);
      setSuccessMessage('Agency updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update agency');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteAgency = async (agencyId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will remove the agency and unassign all agents. This action cannot be undone.`)) return;

    try {
      const token = localStorage.getItem('balkan_estate_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

      const response = await fetch(`${API_URL}/admin/agencies/${agencyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete agency');

      await fetchAgencies();
      setSuccessMessage('Agency deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to delete agency');
      setTimeout(() => setError(null), 5000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading && agencies.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading agencies...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Agency Management</h2>
            <p className="text-sm text-gray-600 mt-1">Total: {totalAgencies} agencies</p>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agents</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {agencies.map((agency) => (
              <tr key={agency._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    {agency.logo ? (
                      <img
                        src={agency.logo}
                        alt={agency.name}
                        className="w-12 h-12 rounded object-cover mr-3"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-blue-100 flex items-center justify-center mr-3">
                        <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{agency.name}</div>
                      <div className="text-xs text-gray-500">{agency.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {agency.ownerId ? (
                    <div>
                      <div className="text-sm text-gray-900">
                        {typeof agency.ownerId === 'object' ? agency.ownerId.name : 'Owner'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {typeof agency.ownerId === 'object' ? agency.ownerId.email : agency.ownerId}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {agency.email || agency.phone ? (
                    <div>
                      {agency.email && <div className="text-sm text-gray-900">{agency.email}</div>}
                      {agency.phone && <div className="text-xs text-gray-500">{agency.phone}</div>}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {agency.city || agency.country ? (
                    <div>
                      <div className="text-sm text-gray-900">{agency.city}</div>
                      <div className="text-xs text-gray-500">{agency.country}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-sm font-semibold bg-purple-100 text-purple-800 rounded-full">
                      {agency.totalAgents || 0}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(agency.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewAgency(agency)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View details"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEditAgency(agency)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit agency"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAgency(agency._id, agency.name)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete agency"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {agencies.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No agencies found.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && viewingAgency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-xl font-bold">Agency Details</h3>
              <button onClick={() => setIsViewModalOpen(false)}>
                <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Logo and Basic Info */}
              <div className="flex items-start gap-4">
                {viewingAgency.logo ? (
                  <img
                    src={viewingAgency.logo}
                    alt={viewingAgency.name}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-blue-100 flex items-center justify-center">
                    <BuildingOfficeIcon className="w-12 h-12 text-blue-600" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="text-2xl font-bold text-gray-900">{viewingAgency.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">{viewingAgency.slug}</p>
                  {viewingAgency.description && (
                    <p className="text-gray-700 mt-2">{viewingAgency.description}</p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t pt-4">
                <h5 className="font-semibold text-gray-900 mb-3">Contact Information</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="text-gray-900">{viewingAgency.email || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <div className="text-gray-900">{viewingAgency.phone || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <div className="text-gray-900">
                      {viewingAgency.website ? (
                        <a href={viewingAgency.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {viewingAgency.website}
                        </a>
                      ) : '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="border-t pt-4">
                <h5 className="font-semibold text-gray-900 mb-3">Location</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <div className="text-gray-900">{viewingAgency.address || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <div className="text-gray-900">{viewingAgency.city || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <div className="text-gray-900">{viewingAgency.country || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Owner Info */}
              {viewingAgency.ownerId && typeof viewingAgency.ownerId === 'object' && (
                <div className="border-t pt-4">
                  <h5 className="font-semibold text-gray-900 mb-3">Owner</h5>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="font-medium text-gray-900">{viewingAgency.ownerId.name}</div>
                    <div className="text-sm text-gray-600">{viewingAgency.ownerId.email}</div>
                    {viewingAgency.ownerId.role && (
                      <div className="text-xs text-gray-500 mt-1">Role: {viewingAgency.ownerId.role}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Specialties & Certifications */}
              {(viewingAgency.specialties && viewingAgency.specialties.length > 0) ||
               (viewingAgency.certifications && viewingAgency.certifications.length > 0) ? (
                <div className="border-t pt-4">
                  <h5 className="font-semibold text-gray-900 mb-3">Specialties & Certifications</h5>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingAgency.specialties && viewingAgency.specialties.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Specialties</label>
                        <div className="flex flex-wrap gap-2">
                          {viewingAgency.specialties.map((specialty, idx) => (
                            <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {viewingAgency.certifications && viewingAgency.certifications.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Certifications</label>
                        <div className="flex flex-wrap gap-2">
                          {viewingAgency.certifications.map((cert, idx) => (
                            <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Featured Settings */}
              {viewingAgency.isFeatured && (
                <div className="border-t pt-4">
                  <h5 className="font-semibold text-gray-900 mb-3">Featured Settings</h5>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <div className="text-gray-900">
                        {viewingAgency.featuredStartDate ? formatDate(viewingAgency.featuredStartDate) : '-'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <div className="text-gray-900">
                        {viewingAgency.featuredEndDate ? formatDate(viewingAgency.featuredEndDate) : '-'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rotation Order</label>
                      <div className="text-gray-900">{viewingAgency.adRotationOrder || 0}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Business Hours */}
              {viewingAgency.businessHours && Object.values(viewingAgency.businessHours).some(h => h) && (
                <div className="border-t pt-4">
                  <h5 className="font-semibold text-gray-900 mb-3">Business Hours</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(viewingAgency.businessHours).map(([day, hours]) => (
                      hours && (
                        <div key={day} className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700 capitalize">{day}:</span>
                          <span className="text-gray-600">{hours}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Agents List */}
              <div className="border-t pt-4">
                <h5 className="font-semibold text-gray-900 mb-3">Agents ({viewingAgency.totalAgents})</h5>
                {viewingAgency.agents && viewingAgency.agents.length > 0 ? (
                  <div className="space-y-2">
                    {viewingAgency.agents.map((agent) => (
                      <div key={agent._id} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{agent.name}</div>
                          <div className="text-sm text-gray-600">{agent.email}</div>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                          {agent.role}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No agents assigned</p>
                )}
              </div>

              {/* Timestamps */}
              <div className="border-t pt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                  <div className="text-gray-600">{formatDate(viewingAgency.createdAt)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                  <div className="text-gray-600">{formatDate(viewingAgency.updatedAt)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingAgency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-xl font-bold">Edit Agency</h3>
              <button onClick={() => setIsEditModalOpen(false)}>
                <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <form onSubmit={handleUpdateAgency} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agency Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    value={editForm.zipCode}
                    onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.lat}
                    onChange={(e) => setEditForm({ ...editForm, lat: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., 42.6629"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.lng}
                    onChange={(e) => setEditForm({ ...editForm, lng: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., 21.1655"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Social Media Links</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Facebook URL
                    </label>
                    <input
                      type="url"
                      value={editForm.facebookUrl}
                      onChange={(e) => setEditForm({ ...editForm, facebookUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instagram URL
                    </label>
                    <input
                      type="url"
                      value={editForm.instagramUrl}
                      onChange={(e) => setEditForm({ ...editForm, instagramUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      LinkedIn URL
                    </label>
                    <input
                      type="url"
                      value={editForm.linkedinUrl}
                      onChange={(e) => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://linkedin.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Twitter URL
                    </label>
                    <input
                      type="url"
                      value={editForm.twitterUrl}
                      onChange={(e) => setEditForm({ ...editForm, twitterUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://twitter.com/..."
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Years in Business
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.yearsInBusiness}
                    onChange={(e) => setEditForm({ ...editForm, yearsInBusiness: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center pt-7">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={editForm.isFeatured}
                    onChange={(e) => setEditForm({ ...editForm, isFeatured: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="isFeatured" className="ml-2 text-sm text-gray-700">
                    Featured Agency
                  </label>
                </div>
              </div>

              {/* Featured Agency Settings */}
              {editForm.isFeatured && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Featured Settings</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Featured Start Date
                      </label>
                      <input
                        type="date"
                        value={editForm.featuredStartDate}
                        onChange={(e) => setEditForm({ ...editForm, featuredStartDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Featured End Date
                      </label>
                      <input
                        type="date"
                        value={editForm.featuredEndDate}
                        onChange={(e) => setEditForm({ ...editForm, featuredEndDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ad Rotation Order
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.adRotationOrder}
                        onChange={(e) => setEditForm({ ...editForm, adRotationOrder: Number(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Specialties */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialties (comma-separated)
                </label>
                <input
                  type="text"
                  value={editForm.specialties.join(', ')}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    specialties: e.target.value.split(',').map(s => s.trim())
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Residential, Commercial, Luxury Properties"
                />
              </div>

              {/* Certifications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certifications (comma-separated)
                </label>
                <input
                  type="text"
                  value={editForm.certifications.join(', ')}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    certifications: e.target.value.split(',').map(s => s.trim())
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Licensed Real Estate Agency, ISO Certified"
                />
              </div>

              {/* Business Hours */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Business Hours</h4>
                <div className="grid grid-cols-2 gap-4">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <div key={day}>
                      <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                        {day}
                      </label>
                      <input
                        type="text"
                        value={editForm.businessHours[day as keyof typeof editForm.businessHours]}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          businessHours: { ...editForm.businessHours, [day]: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="9:00 AM - 6:00 PM"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> Changing agency details will update the information displayed to all users.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyManager;
