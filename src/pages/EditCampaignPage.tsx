// src/pages/EditCampaignPage.tsx

// # ############################################################################ #
// # #                             SECTION 1 - IMPORTS                            #
// # ############################################################################ #
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign } from '../services/CampaignService';

// # ############################################################################ #
// # #           SECTION 2 - COMPONENT: PAGE DEFINITION & HOOKS           #
// # ############################################################################ #
const EditCampaignPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, walletAddress } = useAuth();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal: 0,
    image: '',
    status: ''
  });

// # ############################################################################ #
// # #                 SECTION 3 - EFFECT: CAMPAIGN & OWNER CHECK                #
// # ############################################################################ #
  useEffect(() => {
    const fetchCampaignAndCheckOwnership = async () => {
      if (!id) {
        setError('Campaign ID is missing');
        setLoading(false);
        return;
      }
      
      if (!isAuthenticated) {
        setError('You must be logged in to edit campaigns');
        setLoading(false);
        return;
      }
      
      try {
        const result = await campaignService.fetchCampaign(id);
        
        if (result.success && result.campaign) {
          setCampaign(result.campaign);
          
          // Check if the current user is the owner
          const userIsOwner = walletAddress === result.campaign.ownerId;
          setIsOwner(userIsOwner);
          
          if (!userIsOwner) {
            setError('You do not have permission to edit this campaign');
          } else {
            // Populate form with campaign data
            setFormData({
              title: result.campaign.title,
              description: result.campaign.description,
              goal: result.campaign.goal,
              image: result.campaign.image || '',
              status: result.campaign.status
            });
          }
        } else {
          setError(result.error || 'Failed to load campaign');
        }
      } catch (err: any) {
        console.error('Error fetching campaign:', err);
        setError(err.message || 'An error occurred while fetching campaign');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCampaignAndCheckOwnership();
  }, [id, isAuthenticated, walletAddress]);

// # ############################################################################ #
// # #                 SECTION 4 - EVENT HANDLER: FORM CHANGE                  #
// # ############################################################################ #
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) : value
    });
  };

// # ############################################################################ #
// # #                  SECTION 5 - EVENT HANDLER: FORM SUBMIT                  #
// # ############################################################################ #
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isOwner || !id) {
      return; // Extra safety check
    }
    
    setSubmitting(true);
    setError(null);

    try {
      // Validate form
      if (!formData.title) {
        throw new Error('Campaign title is required');
      }

      if (formData.goal <= 0) {
        throw new Error('Goal amount must be greater than 0');
      }
      
      const result = await campaignService.updateCampaign(id, formData);

      if (result.success) {
        navigate(`/campaigns/${id}`, { replace: true });
      } else {
        throw new Error(result.error || 'Failed to update campaign');
      }
    } catch (err: any) {
      console.error('Error updating campaign:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

// # ############################################################################ #
// # #  SECTION 6 - CONDITIONAL RENDERING: LOADING, ERROR, UNAUTHORIZED  #
// # ############################################################################ #
  if (loading) {
    return <div className="text-center py-10">Loading campaign...</div>;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md my-4">
          <p className="font-medium">{error}</p>
          <div className="mt-4">
            <Link
              to="/dashboard"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors inline-block"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isOwner || !campaign) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md my-4">
          <p className="font-medium">You don't have permission to edit this campaign.</p>
          <div className="mt-4">
            <Link
              to="/dashboard"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors inline-block"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

// # ############################################################################ #
// # #           SECTION 7 - JSX RETURN: EDIT CAMPAIGN FORM           #
// # ############################################################################ #
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
      <h2 className="text-2xl font-bold mb-6">Edit Campaign</h2>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">
            Campaign Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        <div className="mb-4">
          <label htmlFor="goal" className="block text-gray-700 text-sm font-bold mb-2">
            Funding Goal (WLD)
          </label>
          <input
            type="number"
            id="goal"
            name="goal"
            value={formData.goal}
            onChange={handleChange}
            min="1"
            step="0.01"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="image" className="block text-gray-700 text-sm font-bold mb-2">
            Image URL (optional)
          </label>
          <input
            type="url"
            id="image"
            name="image"
            value={formData.image}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="status" className="block text-gray-700 text-sm font-bold mb-2">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting}
            className={`flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
              submitting ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>

          <Link
            to="/dashboard"
            className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

// # ############################################################################ #
// # #                        SECTION 8 - DEFAULT EXPORT                        #
// # ############################################################################ #
export default EditCampaignPage;