import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { getAgencies, verifyInvitationCode, createJoinRequest, leaveAgency } from '../../services/apiService';
import { useAppContext } from '../../context/AppContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Agency {
  _id: string;
  name: string;
  description?: string;
  city?: string;
  country?: string;
  slug?: string;
  logo?: string;
  totalAgents?: number;
}

interface AgencyManagementSectionProps {
  currentUser: User;
  onAgencyChange: () => void;
}

const AgencyManagementSection: React.FC<AgencyManagementSectionProps> = ({ currentUser, onAgencyChange }) => {
  const { dispatch } = useAppContext();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Fetch pending join requests on mount and when showing the form
  useEffect(() => {
    fetchPendingRequests();
  }, [showForm]); // Refresh when form visibility changes

  // Fetch agencies when form is shown
  useEffect(() => {
    if (showForm && agencies.length === 0) {
      fetchAgencies();
    }
  }, [showForm]);

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/agency-join-requests/my-requests`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('balkan_estate_token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Filter for pending requests
        const pending = data.requests?.filter((req: any) => req.status === 'pending') || [];
        setPendingRequests(pending);
        console.log('📋 Pending join requests:', pending.length);
      }
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
    }
  };

  const fetchAgencies = async () => {
    try {
      setLoadingAgencies(true);
      const response = await getAgencies({ limit: 100 });
      setAgencies(response.agencies || []);
      console.log('✅ Loaded', response.agencies?.length || 0, 'agencies');
    } catch (err) {
      console.error('❌ Failed to load agencies:', err);
      setError('Failed to load agencies. Please try again.');
    } finally {
      setLoadingAgencies(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');

    // Validation
    if (!selectedAgencyId) {
      setError('Please select an agency');
      return;
    }

    if (!invitationCode.trim()) {
      setError('Please enter the invitation code');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Step 1: Verifying invitation code for agency:', selectedAgencyId);
      console.log('📝 Agency name:', agencies.find(a => a._id === selectedAgencyId)?.name);
      console.log('🔑 Code entered:', invitationCode.trim().toUpperCase());

      // Step 1: Verify the invitation code matches the selected agency
      const verification = await verifyInvitationCode(selectedAgencyId, invitationCode.trim());
      console.log('📦 Verification result:', verification);

      if (!verification.valid) {
        const errorMsg = verification.message || 'Invalid invitation code for this agency';
        console.error('❌ Verification failed:', errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      console.log('✅ Step 1 complete: Invitation code verified successfully');

      // Step 2: Send join request
      console.log('📤 Step 2: Sending join request to agency:', selectedAgencyId);
      const joinResponse = await createJoinRequest(selectedAgencyId, `Join request with invitation code: ${invitationCode.trim().toUpperCase()}`);
      console.log('✅ Step 2 complete: Join request response:', joinResponse);

      // Step 3: Show success and update UI
      const agencyName = agencies.find(a => a._id === selectedAgencyId)?.name || 'the agency';
      const selectedAgencyData = agencies.find(a => a._id === selectedAgencyId);
      console.log('✅ All steps complete! Request sent to:', agencyName);

      // Immediately add to pending requests for instant UI feedback
      const newPendingRequest = {
        _id: `temp_${Date.now()}`, // Temporary ID
        agencyId: selectedAgencyData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        message: `Join request with invitation code: ${invitationCode.trim().toUpperCase()}`
      };
      setPendingRequests([...pendingRequests, newPendingRequest]);

      // Reset form
      setSelectedAgencyId('');
      setInvitationCode('');
      setShowForm(false);

      // Show success message with better formatting
      alert(
        `✅ SUCCESS!\n\n` +
        `Your join request has been sent to ${agencyName}.\n\n` +
        `📋 Status: Pending Approval\n` +
        `🔔 You will be notified when the agency responds.\n\n` +
        `You can check your pending requests in the "Pending Join Requests" section above.`
      );

      // Fetch updated pending requests from server (to get real IDs)
      await fetchPendingRequests();

      // Trigger the callback to refresh parent component
      onAgencyChange();

    } catch (err: any) {
      console.error('❌ ERROR in handleSubmit:', err);
      console.error('Error type:', typeof err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      console.error('Full error object:', JSON.stringify(err, null, 2));

      setError(err.message || 'Failed to process join request. Please check the invitation code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedAgencyId('');
    setInvitationCode('');
    setError('');
  };

  const handleLeaveAgency = async () => {
    if (!confirm(`Are you sure you want to leave ${currentUser.agencyName}? You will become an Independent Agent.`)) {
      return;
    }

    try {
      setLoading(true);

      const data = await leaveAgency();

      console.log('✅ Successfully left agency');

      // Update user context immediately
      dispatch({
        type: 'UPDATE_USER',
        payload: {
          agencyName: 'Independent Agent',
          agencyId: null,
        }
      });

      alert(
        `✅ You have successfully left the agency.\n\n` +
        `You are now an Independent Agent.`
      );

      // Trigger refresh callback
      onAgencyChange();

    } catch (err: any) {
      console.error('❌ Failed to leave agency:', err);
      setError(err.message || 'Failed to leave agency. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentAgencyInfo = currentUser.agencyName && currentUser.agencyName !== 'Independent Agent'
    ? currentUser.agencyName
    : 'Independent Agent';

  const isIndependent = !currentUser.agencyName || currentUser.agencyName === 'Independent Agent';

  return (
    <div className="space-y-4">
      {/* Current Agency Status */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Current Agency</h4>
            <p className="text-lg font-bold text-blue-600 mt-1">{currentAgencyInfo}</p>
          </div>
          {!showForm && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                {isIndependent ? 'Join an Agency' : 'Switch Agency'}
              </button>
              {!isIndependent && (
                <button
                  type="button"
                  onClick={handleLeaveAgency}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Leave Agency
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pending Join Requests */}
      {pendingRequests.length > 0 && (
        <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
          <h4 className="text-sm font-semibold text-yellow-900 mb-2">Pending Join Requests</h4>
          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <div key={request._id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200">
                <div>
                  <p className="font-medium text-gray-900">{request.agencyId?.name || 'Unknown Agency'}</p>
                  <p className="text-xs text-gray-600">Sent: {new Date(request.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                  Pending Approval
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agency Join/Switch Form */}
      {showForm && (
        <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-lg animate-fade-in">
          <h4 className="text-lg font-semibold text-blue-900 mb-4">
            {isIndependent ? 'Join an Agency' : 'Switch to a Different Agency'}
          </h4>

          {!isIndependent && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ You are currently with <strong>{currentUser.agencyName}</strong>.
                Switching will remove you from your current agency.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Agency Selection Dropdown */}
            <div>
              <label htmlFor="agency-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select Agency <span className="text-red-500">*</span>
              </label>
              {loadingAgencies ? (
                <div className="px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-500 text-sm">
                  Loading agencies...
                </div>
              ) : (
                <select
                  id="agency-select"
                  value={selectedAgencyId}
                  onChange={(e) => {
                    setSelectedAgencyId(e.target.value);
                    setError('');
                  }}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                  required
                >
                  <option value="">-- Choose an agency --</option>
                  {agencies.map((agency) => (
                    <option key={agency._id} value={agency._id}>
                      {agency.name} {agency.city ? `(${agency.city}${agency.country ? ', ' + agency.country : ''})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Invitation Code Input */}
            <div>
              <label htmlFor="invitation-code" className="block text-sm font-medium text-gray-700 mb-2">
                Agency Invitation Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="invitation-code"
                value={invitationCode}
                onChange={(e) => {
                  setInvitationCode(e.target.value.toUpperCase());
                  setError('');
                }}
                disabled={loading}
                placeholder="e.g., AGY-BELGRAD-A1B2C3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-sm"
                required
              />
              <p className="text-xs text-gray-600 mt-1">
                Enter the invitation code for the selected agency
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedAgencyId || !invitationCode.trim()}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Verifying & Sending...' : 'Send Join Request'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AgencyManagementSection;
