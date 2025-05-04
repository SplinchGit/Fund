// src/components/CreateCampaignForm.tsx

import React, { useState, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { campaignService, CampaignPayload } from "../services/CampaignService";

export function CreateCampaignForm() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CampaignPayload>({
    title: "",
    goal: 0,
    description: "",
    image: "",
  });

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await campaignService.createCampaign(form);
      
      if (result.success && result.id) {
        navigate(`/campaigns/${result.id}`);
      } else {
        throw new Error(result.error || 'Failed to create campaign');
      }
    } catch (error: any) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Create New Campaign</h2>
      
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
          value={form.description}
          onChange={onChange}
          rows={4}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="Tell people about your campaign"
        />
      </div>

      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Image URL (optional)
        </label>
        <input
          type="url"
          name="image"
          value={form.image}
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