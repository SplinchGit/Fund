// src/components/CreateCampaignForm.tsx

// # ############################################################################ #
// # #                               SECTION 1 - IMPORTS                                #
// # ############################################################################ #
import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { campaignService, CampaignPayload } from "../services/CampaignService";
import { useAuth } from "./AuthContext";

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
    minHeight: '100vh',
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
  formContainer: {
    maxWidth: '700px',
    width: '100%',
    margin: '1.5rem 0',
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    boxSizing: 'border-box' as const,
  },
  formTitle: {
    fontSize: '1.75rem',
    fontWeight: 600,
    marginBottom: '2rem',
    color: '#202124',
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
    marginBottom: '0.5rem',
    color: '#3c4043',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #dadce0',
    borderRadius: '6px',
    backgroundColor: 'white',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #dadce0',
    borderRadius: '6px',
    resize: 'vertical' as const,
    minHeight: '120px',
    backgroundColor: 'white',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  charCount: {
    fontSize: '0.75rem',
    color: '#5f6368',
    marginTop: '0.375rem',
    textAlign: 'right' as const,
  },
  button: { // Style for the main form submit button
    width: '100%',
    padding: '0.875rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 500,
    color: 'white',
    backgroundColor: '#1a73e8',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s, opacity 0.2s',
    textAlign: 'center' as const,
    minHeight: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 'normal',
  },
  buttonPrimary: { // Style for header buttons or other distinct primary actions
    backgroundColor: '#1a73e8',
    color: 'white',
    padding: '0.5rem 1rem', // More typical for header buttons
    width: 'auto', // Header buttons aren't usually full-width
    fontSize: '0.875rem',
    border: 'none',
    borderRadius: '0.25rem', // Match other button styles if needed
    // These properties are already in styles.button, but listed for clarity if this is used standalone
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center' as const,
    minHeight: '36px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    transition: 'background-color 0.2s, border-color 0.2s',
  },
  buttonDisabled: {
    backgroundColor: '#adb5bd',
    color: '#e9ecef',
    cursor: 'not-allowed' as const,
    opacity: 0.7,
  },
  errorMessage: {
    padding: '1rem',
    marginBottom: '1.5rem',
    backgroundColor: 'rgba(234, 67, 53, 0.05)',
    border: '1px solid rgba(234, 67, 53, 0.2)',
    color: '#c53929',
    borderRadius: '8px',
    fontSize: '0.875rem',
    textAlign: 'left' as const,
    boxSizing: 'border-box' as const,
  },
  authWarning: {
    padding: '1rem',
    marginBottom: '1.5rem',
    backgroundColor: 'rgba(251, 188, 5, 0.05)',
    border: '1px solid rgba(251, 188, 5, 0.2)',
    color: '#795500',
    borderRadius: '8px',
    fontSize: '0.875rem',
    textAlign: 'center' as const,
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
  input:focus, textarea:focus {
    border-color: #1a73e8;
    box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.2);
    outline: none;
  }
`;

// # ############################################################################ #
// # #                 SECTION 3 - COMPONENT DEFINITION & STATE                 #
// # ############################################################################ #

interface CreateFormFields {
  title: string;
  goal: number;
  description: string;
  image: string;
}

export function CreateCampaignForm() {
  const navigate = useNavigate();
  const { isAuthenticated, walletAddress } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateFormFields>({
    title: "",
    goal: 0,
    description: "",
    image: "",
  });

// # ############################################################################ #
// # #                 SECTION 4 - CONSTANTS                 #
// # ############################################################################ #
  const MAX_TITLE_LENGTH = 70;
  const MAX_DESCRIPTION_LENGTH = 750;

// # ############################################################################ #
// # #                 SECTION 5 - EFFECT: AUTHENTICATION CHECK                 #
// # ############################################################################ #
  useEffect(() => {
    if (!isAuthenticated) {
      const redirectTimer = setTimeout(() => {
        navigate('/landing', { replace: true, state: { message: "Please sign in to create a campaign." } });
      }, 2500);
      return () => clearTimeout(redirectTimer);
    } else {
        setError(null);
    }
  }, [isAuthenticated, navigate]);

// # ############################################################################ #
// # #                 SECTION 6 - EVENT HANDLER: ONCHANGE                 #
// # ############################################################################ #
  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const targetType = e.target.type;

    if (name === 'title' && value.length > MAX_TITLE_LENGTH) return;
    if (name === 'description' && value.length > MAX_DESCRIPTION_LENGTH) return;

    setForm(prev => ({
      ...prev,
      [name]: targetType === "number" ? parseFloat(value) || 0 : value,
    }));
  };

// # ############################################################################ #
// # #                 SECTION 7 - EVENT HANDLER: ONSUBMIT                 #
// # ############################################################################ #
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !walletAddress) {
      setError('You must be logged in with a connected wallet to create a campaign.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (!form.title.trim()) throw new Error('Campaign title is required.');
      if (form.goal <= 0) throw new Error('Funding goal must be a positive number.');
      if (!form.description.trim()) throw new Error('Campaign description is required.');

      // THIS IS THE LINE (around 292 previously) THAT CAUSES THE TS2353 ERROR
      // IF `CampaignPayload` (defined in CampaignService.ts or your types file)
      // DOES NOT INCLUDE `ownerId: string;`
      const payloadForService: CampaignPayload = {
        title: form.title.trim(),
        description: form.description.trim(),
        goal: form.goal,
        image: form.image.trim() || undefined, // Send undefined if image string is empty or only whitespace
        ownerId: walletAddress,
      };

      console.log('[CreateCampaignForm] Submitting campaign:', payloadForService);
      const result = await campaignService.createCampaign(payloadForService);

      if (result.success && result.id) {
        console.log('[CreateCampaignForm] Campaign created successfully:', result.id);
        navigate(`/campaigns/${result.id}`, { state: { message: 'Campaign created successfully!' } });
      } else {
        throw new Error(result.error || 'Failed to create campaign. Please check your details and try again.');
      }
    } catch (error: any) {
      console.error('[CreateCampaignForm] Error creating campaign:', error);
      setError(error.message || 'An unexpected error occurred while creating the campaign.');
    } finally {
      setLoading(false);
    }
  };

// # ############################################################################ #
// # #                 SECTION 8 - JSX RETURN & FORM STRUCTURE                 #
// # ############################################################################ #
  return (
    <div style={styles.page}>
      <style>{responsiveStyles}</style>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
          <Link
            to="/dashboard"
            style={{ ...styles.button, ...styles.buttonPrimary }} // Applied consistent primary button style for header
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <div style={styles.container}>
        <div style={styles.formContainer}>
          <h2 style={styles.formTitle}>Launch Your Campaign</h2>

          {!isAuthenticated && (
            <div style={styles.authWarning}>
              Authentication required. Please sign in to create a campaign. Redirecting...
            </div>
          )}

          {error && (
            <div style={styles.errorMessage}>
              {error}
            </div>
          )}

          <form onSubmit={onSubmit}>
            <div style={styles.formGroup}>
              <label htmlFor="title" style={styles.label}>Campaign Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={form.title}
                onChange={onChange}
                style={styles.input}
                placeholder="e.g., Community Art Mural"
                disabled={!isAuthenticated || loading}
                maxLength={MAX_TITLE_LENGTH}
                required
              />
              <div style={styles.charCount}>
                {(form.title || '').length}/{MAX_TITLE_LENGTH}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="goal" style={styles.label}>Funding Goal (WLD)</label>
              <input
                type="number"
                id="goal"
                name="goal"
                value={form.goal === 0 ? '' : form.goal}
                onChange={onChange}
                min="0.01"
                step="any"
                style={styles.input}
                placeholder="e.g., 500"
                disabled={!isAuthenticated || loading}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="description" style={styles.label}>Describe Your Campaign</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={onChange}
                style={styles.textarea}
                placeholder="Share the story, impact, and details of your campaign..."
                rows={6}
                disabled={!isAuthenticated || loading}
                maxLength={MAX_DESCRIPTION_LENGTH}
                required
              />
              <div style={styles.charCount}>
                {(form.description || '').length}/{MAX_DESCRIPTION_LENGTH}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="image" style={styles.label}>Cover Image URL (Optional)</label>
              <input
                type="url"
                id="image"
                name="image"
                value={form.image}
                onChange={onChange}
                style={styles.input}
                placeholder="https://example.com/your-campaign-image.jpg"
                disabled={!isAuthenticated || loading}
              />
               {form.image && (
                <img
                    src={form.image}
                    alt="Campaign preview"
                    style={{maxWidth: '100%', height: 'auto', marginTop: '10px', borderRadius: '6px', border: '1px solid #eee'}}
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display='none';
                    }}
                />
              )}
            </div>

            <button
              type="submit"
              disabled={!isAuthenticated || loading || !!error} // Disable if error until changed
              style={{
                ...styles.button, // This refers to the main submit button style
                marginTop: '1rem',
                ...((!isAuthenticated || loading || !!error) ? styles.buttonDisabled : {})
              }}
            >
              {loading ? 'Creating Campaign...' : 'Create Campaign'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateCampaignForm;