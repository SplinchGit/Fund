// src/components/CreateCampaignForm.tsx

import React, { useState, ChangeEvent, FormEvent } from "react";
import { createCampaign, CampaignPayload } from "../services/CampaignService";

export function CreateCampaignForm() {
  const [form, setForm] = useState<CampaignPayload>({
    title: "",
    goal: 0,
    ownerId: "",
    description: "",
    image: "",
    verified: false,
    status: "draft",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onChange = (e: ChangeEvent<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >) => {
    const { name, value, type } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await createCampaign(form);
      setResult(`Created with ID ${resp.id}`);
      setForm({
        title: "",
        goal: 0,
        ownerId: "",
        description: "",
        image: "",
        verified: false,
        status: "draft",
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="p-4 border rounded max-w-md mx-auto space-y-4"
    >
      <div>
        <label className="block">Title</label>
        <input
          name="title"
          value={form.title}
          onChange={onChange}
          required
          className="w-full"
        />
      </div>

      <div>
        <label className="block">Goal</label>
        <input
          name="goal"
          type="number"
          value={form.goal}
          onChange={onChange}
          required
          className="w-full"
        />
      </div>

      <div>
        <label className="block">Owner ID</label>
        <input
          name="ownerId"
          value={form.ownerId}
          onChange={onChange}
          required
          className="w-full"
        />
      </div>

      <div>
        <label className="block">Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={onChange}
          className="w-full"
        />
      </div>

      <div>
        <label className="block">Image URL</label>
        <input
          name="image"
          value={form.image}
          onChange={onChange}
          className="w-full"
        />
      </div>

      <div>
        <label className="block">Status</label>
        <select
          name="status"
          value={form.status}
          onChange={onChange}
          className="w-full"
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {loading ? "Creating…" : "Create Campaign"}
      </button>

      {result && <p className="text-green-600">{result}</p>}
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}
