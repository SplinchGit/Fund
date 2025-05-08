// Fixed CreateCampaignForm.tsx
import React, { useState, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { campaignService, CampaignPayload } from "../services/CampaignService";

export function CreateCampaignForm() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignPayload>({
    title: "",
    goal: 0,
    description: "",
    image: "",
  });

  // Define character limits
  const MAX_TITLE_LENGTH = 70;
  const MAX_DESCRIPTION_LENGTH = 750;

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Skip if max length is reached for title and description
    if (name === 'title' && value.length > MAX_TITLE_LENGTH) return;
    if (name === 'description' && value.length > MAX_DESCRIPTION_LENGTH) return;
    
    setForm(prev => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate form
      if (!form.title) {
        throw new Error('Campaign title is required');
      }
      
      if (form.goal <= 0) {
        throw new Error('Funding goal must be greater than 0');
      }

      const result = await campaignService.createCampaign(form);
      
      if (result.success && result.id) {
        navigate(`/campaigns/${result.id}`);
      } else {
        throw new Error(result.error || 'Failed to create campaign');
      }
    } catch (error: any) {
      // Fix: Properly handle errors
      console.error('Failed to create campaign:', error);
      setError(error.message || 'An error occurred while creating the campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Create New Campaign</h2>
      
      {/* Display error if any */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Campaign Title
        </label>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={onChange}
          required
          className="w-full px-3 py-2 border rounded-md"
          placeholder="Give your campaign a title"
        />
        <div className="text-xs text-gray-500 mt-1">
          {form.title.length}/{MAX_TITLE_LENGTH} characters
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Funding Goal (WLD)
        </label>
        <input
          type="number"
          name="goal"
          value={form.goal || ''}
          onChange={onChange}
          required
          min="1"
          step="0.01"
          className="w-full px-3 py-2 border rounded-md"
          placeholder="How much WLD do you need?"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Description
        </label>
        <textarea
          name="description"
          value={form.description || ''}
          onChange={onChange}
          rows={4}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="Tell people about your campaign"
        />
        <div className="text-xs text-gray-500 mt-1">
          {(form.description?.length || 0)}/{MAX_DESCRIPTION_LENGTH} characters
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Image URL (optional)
        </label>
        <input
          type="url"
          name="image"
          value={form.image || ''}
          onChange={onChange}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-2 px-4 rounded-md text-white font-bold
          ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {loading ? 'Creating...' : 'Create Campaign'}
      </button>
    </form>
  );
}