// src/pages/EditCampaignPage.tsx

// # ############################################################################ #
// # #                               SECTION 1 - IMPORTS                                #
// # ############################################################################ #
import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign, UpdateCampaignPayload } from '../services/CampaignService'; // Import UpdateCampaignPayload

// # ############################################################################ #
// # #                               SECTION 2 - STYLES                                #
// # ############################################################################ #
const styles: { [key: string]: React.CSSProperties } = {
  page: {
    textAlign: 'center' as const,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif',
    color: '#202124',
    backgroundColor: '#f5f7fa',
    margin: 0,
    padding: 0,
    overflowX: 'hidden' as const,
    width: '100vw',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    boxSizing: 'border-box' as const,
  },
  container: {
    margin: '0 auto',
    width: '100%',
    padding: '0 0.5rem',
    boxSizing: 'border-box' as const,
    maxWidth: '1200px',
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    paddingTop: '1rem',
    paddingBottom: '2rem',
  },
  header: {
    background: 'white',
    padding: '0.5rem 0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 0.5rem',
    boxSizing: 'border-box' as const,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    color: '#1a73e8',
    fontWeight: 700,
    fontSize: '1.125rem',
    textDecoration: 'none',
  },
  logoSpan: {
    color: '#202124',
  },
  button: { // General button style, to be spread
    padding: '0.5rem 0.75rem',
    borderRadius: '0.25rem',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center' as const,
    fontSize: '0.875rem',
    transition: 'background-color 0.2s, border-color 0.2s, opacity 0.2s',
    border: '1px solid transparent',
    minHeight: '36px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  buttonPrimary: {
    backgroundColor: '#1a73e8',
    color: 'white',
    borderColor: '#1a73e8', // Often not needed if border is transparent or none
  },
  buttonSecondary: {
    backgroundColor: '#f1f3f4',
    color: '#202124',
    borderColor: '#dadce0',
  },
  buttonDanger: { // Not used in this form, but kept for completeness if styles are shared
    backgroundColor: '#ea4335',
    color: 'white',
    borderColor: '#ea4335',
  },
  formContainer: {
    maxWidth: '700px',
    width: '100%',
    margin: '1.5rem 0',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    padding: '2rem',
    boxSizing: 'border-box' as const,
  },
  formTitle: {
    fontSize: '1.75rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '2rem',
    textAlign: 'left' as const,
  },
  formGroup: {
    marginBottom: '1.5rem',
    textAlign: 'left' as const,
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#3c4043',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #dadce0',
    borderRadius: '6px',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #dadce0',
    borderRadius: '6px',
    boxSizing: 'border-box' as const,
    minHeight: '120px',
    resize: 'vertical' as const,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  select: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #dadce0',
    borderRadius: '6px',
    backgroundColor: 'white', // Ensure background for select
    boxSizing: 'border-box' as const,
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23333' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 1rem center',
    backgroundSize: '1em',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    marginTop: '2rem',
  },
  buttonWidth: { // Utility to make buttons in actions take equal space
    flex: 1,
  },
  errorContainer: {
    padding: '1rem',
    backgroundColor: 'rgba(234, 67, 53, 0.05)',
    border: '1px solid rgba(234, 67, 53, 0.2)',
    borderRadius: '8px',
    color: '#c53929',
    marginBottom: '1.5rem',
    textAlign: 'left' as const,
    boxSizing: 'border-box' as const,
  },
  authWarning: { // For "You must be logged in" or permission issues
    padding: '1rem',
    backgroundColor: 'rgba(251, 188, 5, 0.05)',
    border: '1px solid rgba(251, 188, 5, 0.2)',
    borderRadius: '8px',
    color: '#795500', // Darker yellow/brown text
    marginBottom: '1.5rem',
    textAlign: 'center' as const,
    boxSizing: 'border-box' as const,
  },
  notFoundContainer: { // For campaign not found states
    padding: '3rem 1rem',
    textAlign: 'center' as const,
    color: '#5f6368',
    minHeight: '300px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    boxSizing: 'border-box' as const,
  },
  loadingContainer: { // For page loading state
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '300px',
    width: '100%',
    padding: '2rem',
    boxSizing: 'border-box' as const,
  }
};

const responsiveStyles = `
  html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    font-family: ${styles.page?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif'};
    box-sizing: border-box;
  }
  *, *::before, *::after {
    box-sizing: inherit;
  }
  input:focus, textarea:focus, select:focus {
    border-color: #1a73e8;
    box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.2);
    outline: none;
  }
`;

// # ############################################################################ #
// # #                 SECTION 3 - COMPONENT: EDIT CAMPAIGN PAGE                 #
// # ############################################################################ #

// Define the allowed campaign statuses
type CampaignStatus = 'active' | 'completed' | 'cancelled';

// Interface for the form's local state
interface EditFormState {
  title: string;
  description: string;
  goal: number;
  image: string;
  status: CampaignStatus; // Use the specific type for status
}

const EditCampaignPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, walletAddress } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [formData, setFormData] = useState<EditFormState>({
    title: '',
    description: '',
    goal: 0,
    image: '',
    status: 'active', // Default to a valid status
  });

// # ############################################################################ #
// # #                 SECTION 4 - EFFECT: CAMPAIGN & OWNER CHECK                 #
// # ############################################################################ #
  useEffect(() => {
    const fetchCampaignAndCheckOwnership = async () => {
      setLoading(true);
      setError(null);
      setAuthError(null);

      if (!id) {
        setAuthError('Campaign ID is missing. Cannot edit.');
        setLoading(false);
        return;
      }

      if (!isAuthenticated || !walletAddress) {
        setAuthError('You must be connected with your wallet to edit campaigns.');
        setLoading(false);
        return;
      }

      try {
        const result = await campaignService.fetchCampaign(id);
        if (result.success && result.campaign) {
          setCampaign(result.campaign);
          const userIsOwner = walletAddress.toLowerCase() === result.campaign.ownerId.toLowerCase();
          setIsOwner(userIsOwner);

          if (!userIsOwner) {
            setAuthError('You do not have permission to edit this campaign.');
          } else {
            setFormData({
              title: result.campaign.title,
              description: result.campaign.description,
              goal: result.campaign.goal,
              image: result.campaign.image || '',
              status: result.campaign.status, // This status from Campaign type is already correct
            });
          }
        } else {
          setError(result.error || 'Failed to load campaign data.');
        }
      } catch (err: any) {
        console.error('Error fetching campaign:', err);
        setError(err.message || 'An error occurred while fetching campaign data.');
      } finally {
        setLoading(false);
      }
    };
    fetchCampaignAndCheckOwnership();
  }, [id, isAuthenticated, walletAddress]);

// # ############################################################################ #
// # #                 SECTION 5 - EVENT HANDLER: FORM CHANGE                 #
// # ############################################################################ #
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const targetType = e.target.type;

    setFormData(prev => ({
      ...prev,
      [name]: name === 'status'
               ? value as CampaignStatus // Assert value to CampaignStatus for the select
               : targetType === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

// # ############################################################################ #
// # #                 SECTION 6 - EVENT HANDLER: FORM SUBMIT                 #
// # ############################################################################ #
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !id || !campaign) {
      setError("Cannot submit: Not owner, or campaign data missing.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (!formData.title.trim()) throw new Error('Campaign title is required.');
      if (formData.goal <= 0) throw new Error('Funding goal must be a positive number.');

      // The formData here now correctly types 'status' as CampaignStatus,
      // which is compatible with UpdateCampaignPayload's status field.
      const payload: UpdateCampaignPayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        goal: formData.goal,
        image: formData.image.trim() || undefined, // Send undefined if empty
        status: formData.status,
      };

      const result = await campaignService.updateCampaign(id, payload);

      if (result.success && result.campaign) { // Check for updated campaign in result
        navigate(`/campaigns/${id}`, { replace: true, state: { message: 'Campaign updated successfully!' } });
      } else {
        throw new Error(result.error || 'Failed to update campaign. Please try again.');
      }
    } catch (err: any) {
      console.error('Error updating campaign:', err);
      setError(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

// # ############################################################################ #
// # #                 SECTION 7 - EVENT HANDLER: HANDLE CANCEL                 #
// # ############################################################################ #
  const handleCancel = () => {
    if (id) {
      navigate(`/campaigns/${id}`);
    } else {
      navigate('/dashboard');
    }
  };

// # ############################################################################ #
// # #                 SECTION 8 - CONDITIONAL RENDERING: LOADING STATE                 #
// # ############################################################################ #
  if (loading) {
    return (
      <div style={styles.page}>
        <style>{responsiveStyles}</style>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
            <Link to="/dashboard" style={{...styles.button, ...styles.buttonSecondary}}>
              Dashboard
            </Link>
          </div>
        </header>
        <div style={styles.container}>
          <div style={styles.loadingContainer}>
            <div>Loading campaign editor...</div>
          </div>
        </div>
      </div>
    );
  }

// # ############################################################################ #
// # #         SECTION 9 - CONDITIONAL RENDERING: ERROR, UNAUTHORIZED, NOT FOUND         #
// # ############################################################################ #
  if (authError) { // Prioritize auth/permission errors
    return (
      <div style={styles.page}>
        <style>{responsiveStyles}</style>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
            <Link to={id ? `/campaigns/${id}` : "/campaigns"} style={{...styles.button, ...styles.buttonSecondary}}>
              {id ? "View Campaign" : "All Campaigns"}
            </Link>
          </div>
        </header>
        <div style={styles.container}>
          <div style={styles.formContainer}> {/* Using formContainer for consistent look */}
            <div style={styles.authWarning}>
              <p>{authError}</p>
              {(!isAuthenticated || !walletAddress) && <p>Please ensure your wallet is connected and you are signed in.</p>}
            </div>
            <div style={{display: 'flex', justifyContent: 'center', marginTop: '1rem'}}>
              <Link to="/dashboard" style={{...styles.button, ...styles.buttonPrimary}}>
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !campaign) { // General error during fetch and no campaign data
     return (
      <div style={styles.page}>
        <style>{responsiveStyles}</style>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
            <Link to="/campaigns" style={{...styles.button, ...styles.buttonSecondary}}>All Campaigns</Link>
          </div>
        </header>
        <div style={styles.container}>
            <div style={styles.formContainer}>
                 <div style={styles.errorContainer}>
                    <p>{error}</p>
                 </div>
                 <Link to="/dashboard" style={{...styles.button, ...styles.buttonPrimary, marginTop: '1rem'}}>
                    Return to Dashboard
                </Link>
            </div>
        </div>
      </div>
    );
  }


  if (!campaign) { // Campaign not found, and not loading, and no specific auth error handled above
    return (
      <div style={styles.page}>
        <style>{responsiveStyles}</style>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
            <Link to="/campaigns" style={{...styles.button, ...styles.buttonSecondary}}>All Campaigns</Link>
          </div>
        </header>
        <div style={styles.container}>
          <div style={styles.notFoundContainer}>
            <h2>Campaign Not Found</h2>
            <p>The campaign you are trying to edit could not be loaded or does not exist.</p>
            <Link
              to="/dashboard"
              style={{...styles.button, ...styles.buttonPrimary, marginTop: '1rem'}}
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

// # ############################################################################ #
// # #                 SECTION 10 - JSX RETURN: EDIT CAMPAIGN FORM                 #
// # ############################################################################ #
  return (
    <div style={styles.page}>
      <style>{responsiveStyles}</style>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
          <div>
            <Link to={`/campaigns/${id}`} style={{...styles.button, ...styles.buttonSecondary, marginRight: '0.5rem'}}>
              View Campaign
            </Link>
            <Link to="/dashboard" style={{...styles.button, ...styles.buttonPrimary}}>
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div style={styles.container}>
        <div style={styles.formContainer}>
          <h2 style={styles.formTitle}>Edit Your Campaign</h2>

          {error && ( // For errors during form submission after form is rendered
            <div style={styles.errorContainer}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label htmlFor="title" style={styles.label}>Campaign Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g., My Awesome Project"
                required
                disabled={submitting}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="description" style={styles.label}>Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                style={styles.textarea}
                placeholder="Tell us about your campaign..."
                rows={5}
                disabled={submitting}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="goal" style={styles.label}>Funding Goal (WLD)</label>
              <input
                type="number"
                id="goal"
                name="goal"
                value={formData.goal}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g., 1000"
                min="0.01" // Smallest positive goal
                step="any"
                required
                disabled={submitting}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="image" style={styles.label}>Image URL (Optional)</label>
              <input
                type="url"
                id="image"
                name="image"
                value={formData.image}
                onChange={handleChange}
                style={styles.input}
                placeholder="https://example.com/your-image.jpg"
                disabled={submitting}
              />
              {formData.image && (
                <img
                    src={formData.image}
                    alt="Preview"
                    style={{maxWidth: '100%', height: 'auto', marginTop: '10px', borderRadius: '6px', border: '1px solid #eee'}}
                    onError={(e) => {(e.target as HTMLImageElement).style.display='none';}}
                />
              )}
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="status" style={styles.label}>Campaign Status</label>
              <select
                id="status"
                name="status"
                value={formData.status} // Value is now CampaignStatus
                onChange={handleChange}  // handleChange correctly asserts to CampaignStatus
                style={styles.select}
                required
                disabled={submitting}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div style={styles.formActions}>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  ...styles.button, // Base button style
                  ...styles.buttonSecondary, // Secondary button appearance
                  ...styles.buttonWidth // Takes half the space
                }}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                type="submit"
                style={{
                  ...styles.button, // Base button style
                  ...styles.buttonPrimary, // Primary button appearance
                  ...styles.buttonWidth, // Takes half the space
                  ...(submitting ? { opacity: 0.7, cursor: 'not-allowed' as const } : {})
                }}
                disabled={submitting}
              >
                {submitting ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// # ############################################################################ #
// # #                               SECTION 11 - DEFAULT EXPORT                                #
// # ############################################################################ #
export default EditCampaignPage;