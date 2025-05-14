// src/components/CreateCampaignForm.tsx

// # ############################################################################ #
// # #                             SECTION 1 - IMPORTS                            #
// # ############################################################################ #
import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { campaignService, CampaignPayload } from "../services/CampaignService";
import { useAuth } from "./AuthContext";

// # ############################################################################ #
// # #                            SECTION 2 - STYLES                             #
// # ############################################################################ #
// Define styles object like in LandingPage for consistent styling
const styles: { [key: string]: React.CSSProperties } = {
  page: { 
    textAlign: 'center' as const, 
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif', 
    color: '#202124', 
    backgroundColor: '#f5f7fa', 
    margin: 0, 
    padding: 0, 
    overflowX: 'hidden' as const, 
    width: '100%', 
    maxWidth: '100vw', 
    minHeight: '100vh', 
    display: 'flex', 
    flexDirection: 'column' as const 
  },
  container: { 
    margin: '0 auto', 
    width: '100%', 
    padding: '0 0.5rem', 
    boxSizing: 'border-box' as const, 
    maxWidth: '1200px', 
    flexGrow: 1 
  },
  header: { 
    background: 'white', 
    padding: '0.5rem 0', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
    position: 'sticky' as const, 
    top: 0, 
    zIndex: 100 
  },
  headerContent: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    maxWidth: '1200px', 
    margin: '0 auto', 
    padding: '0 0.5rem' 
  },
  logo: { 
    display: 'flex', 
    alignItems: 'center', 
    color: '#1a73e8', 
    fontWeight: 700, 
    fontSize: '1.125rem', 
    textDecoration: 'none' 
  },
  logoSpan: { 
    color: '#202124' 
  },
  formContainer: {
    maxWidth: '600px',
    margin: '20px auto',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  formTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginBottom: '1rem',
    color: '#202124',
    textAlign: 'left' as const
  },
  formGroup: {
    marginBottom: '1rem',
    textAlign: 'left' as const
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: 500,
    marginBottom: '0.3rem',
    color: '#202124'
  },
  input: {
    width: '100%',
    padding: '0.6rem',
    fontSize: '1rem',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    backgroundColor: 'white'
  },
  textarea: {
    width: '100%',
    padding: '0.6rem',
    fontSize: '1rem',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    resize: 'vertical' as const,
    minHeight: '100px',
    backgroundColor: 'white'
  },
  charCount: {
    fontSize: '0.75rem',
    color: '#5f6368',
    marginTop: '0.25rem',
    textAlign: 'right' as const
  },
  button: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: 500,
    color: 'white',
    backgroundColor: '#1a73e8',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  buttonDisabled: {
    backgroundColor: '#9aa0a6',
    cursor: 'not-allowed'
  },
  errorMessage: {
    padding: '0.75rem',
    marginBottom: '1rem',
    backgroundColor: '#ffebee',
    border: '1px solid #ffcdd2',
    color: '#c62828',
    borderRadius: '4px',
    fontSize: '0.9rem'
  },
  authWarning: {
    padding: '0.75rem',
    marginBottom: '1rem',
    backgroundColor: '#fff3e0',
    border: '1px solid #ffe0b2',
    color: '#e65100',
    borderRadius: '4px',
    fontSize: '0.9rem'
  }
};

// # ############################################################################ #
// # #                 SECTION 3 - COMPONENT DEFINITION & STATE                 #
// # ############################################################################ #
export function CreateCampaignForm() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignPayload>({
    title: "",
    goal: 0,
    description: "",
    image: "",
  });

// # ############################################################################ #
// # #                            SECTION 4 - CONSTANTS                           #
// # ############################################################################ #
  // Define character limits
  const MAX_TITLE_LENGTH = 70;
  const MAX_DESCRIPTION_LENGTH = 750;

// # ############################################################################ #
// # #                 SECTION 5 - EFFECT: AUTHENTICATION CHECK                  #
// # ############################################################################ #
  // Check authentication status and redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('[CreateCampaignForm] User not authenticated, redirecting...');
      setError('Authentication required. Redirecting to login...');
      
      // Short delay before redirect to show the error message
      const redirectTimer = setTimeout(() => {
        navigate('/landing', { replace: true });
      }, 2000);
      
      // Cleanup timer on unmount
      return () => clearTimeout(redirectTimer);
    }
  }, [isAuthenticated, navigate]);

// # ############################################################################ #
// # #                     SECTION 6 - EVENT HANDLER: ONCHANGE                    #
// # ############################################################################ #
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

// # ############################################################################ #
// # #                    SECTION 7 - EVENT HANDLER: ONSUBMIT                   #
// # ############################################################################ #
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Double check authentication
    if (!isAuthenticated) {
      setError('You must be logged in to create a campaign.');
      return;
    }
    
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

      console.log('[CreateCampaignForm] Submitting campaign:', form);
      const result = await campaignService.createCampaign(form);

      if (result.success && result.id) {
        console.log('[CreateCampaignForm] Campaign created successfully:', result.id);
        navigate(`/campaigns/${result.id}`);
      } else {
        throw new Error(result.error || 'Failed to create campaign');
      }
    } catch (error: any) {
      console.error('[CreateCampaignForm] Error creating campaign:', error);
      setError(error.message || 'An error occurred while creating the campaign');
    } finally {
      setLoading(false);
    }
  };

// # ############################################################################ #
// # #                 SECTION 8 - JSX RETURN & FORM STRUCTURE                 #
// # ############################################################################ #
  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
          <Link to="/dashboard" style={{ ...styles.button, ...styles.buttonPrimary }}>
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div style={styles.container}>
        <div style={styles.formContainer}>
          <h2 style={styles.formTitle}>Create New Campaign</h2>
          
          {/* Auth Warning */}
          {!isAuthenticated && (
            <div style={styles.authWarning}>
              You need to be logged in to create a campaign. Redirecting to login page...
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div style={styles.errorMessage}>
              {error}
            </div>
          )}
          
          {/* Form */}
          <form onSubmit={onSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Campaign Title</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={onChange}
                style={styles.input}
                placeholder="Give your campaign a title"
                disabled={!isAuthenticated || loading}
              />
              <div style={styles.charCount}>
                {form.title.length}/{MAX_TITLE_LENGTH} characters
              </div>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Funding Goal (WLD)</label>
              <input
                type="number"
                name="goal"
                value={form.goal || ''}
                onChange={onChange}
                min="1"
                step="0.01"
                style={styles.input}
                placeholder="How much WLD do you need?"
                disabled={!isAuthenticated || loading}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                name="description"
                value={form.description || ''}
                onChange={onChange}
                style={styles.textarea}
                placeholder="Tell people about your campaign"
                disabled={!isAuthenticated || loading}
              />
              <div style={styles.charCount}>
                {(form.description?.length || 0)}/{MAX_DESCRIPTION_LENGTH} characters
              </div>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Image URL (optional)</label>
              <input
                type="url"
                name="image"
                value={form.image || ''}
                onChange={onChange}
                style={styles.input}
                placeholder="https://example.com/image.jpg"
                disabled={!isAuthenticated || loading}
              />
            </div>
            
            <button
              type="submit"
              disabled={!isAuthenticated || loading}
              style={{
                ...styles.button,
                ...((!isAuthenticated || loading) ? styles.buttonDisabled : {})
              }}
            >
              {loading ? 'Creating...' : 'Create Campaign'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateCampaignForm;