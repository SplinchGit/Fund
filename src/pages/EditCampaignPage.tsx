// src/pages/EditCampaignPage.tsx

// # ############################################################################ #
// # #                             SECTION 1 - IMPORTS                            #
// # ############################################################################ #
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign } from '../services/CampaignService';

// # ############################################################################ #
// # #                            SECTION 2 - STYLES                             #
// # ############################################################################ #
const styles: { [key: string]: React.CSSProperties } = {
  page: { 
    textAlign: 'center', 
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif', 
    color: '#202124', 
    backgroundColor: '#f5f7fa', 
    margin: 0, 
    padding: 0, 
    overflowX: 'hidden', 
    width: '100%', 
    maxWidth: '100vw', 
    minHeight: '100vh', 
    display: 'flex', 
    flexDirection: 'column'
  },
  container: { 
    margin: '0 auto', 
    width: '100%', 
    padding: '0 0.5rem', 
    boxSizing: 'border-box', 
    maxWidth: '1200px', 
    flexGrow: 1 
  },
  header: { 
    background: 'white', 
    padding: '0.5rem 0', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
    position: 'sticky', 
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
  button: { 
    padding: '0.5rem 0.75rem', 
    borderRadius: '0.25rem', 
    fontWeight: 500, 
    cursor: 'pointer', 
    textDecoration: 'none', 
    textAlign: 'center', 
    fontSize: '0.875rem', 
    transition: 'background-color 0.2s, border-color 0.2s', 
    border: '1px solid transparent', 
    minHeight: '36px', 
    display: 'inline-flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    lineHeight: 1 
  },
  buttonPrimary: { 
    backgroundColor: '#1a73e8', 
    color: 'white', 
    borderColor: '#1a73e8' 
  },
  buttonSecondary: {
    backgroundColor: '#f1f3f4',
    color: '#202124',
    borderColor: '#dadce0'
  },
  buttonDanger: { 
    backgroundColor: '#ea4335', 
    color: 'white', 
    borderColor: '#ea4335' 
  },
  formContainer: {
    maxWidth: '600px',
    margin: '1.5rem auto',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '1.5rem'
  },
  formTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '1.5rem',
    textAlign: 'left'
  },
  formGroup: {
    marginBottom: '1.25rem',
    textAlign: 'left'
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#202124',
    marginBottom: '0.5rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    boxSizing: 'border-box',
    minHeight: '100px',
    resize: 'vertical'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    marginTop: '2rem'
  },
  buttonWidth: {
    flex: 1
  },
  errorContainer: {
    padding: '1rem',
    backgroundColor: 'rgba(234, 67, 53, 0.1)',
    border: '1px solid rgba(234, 67, 53, 0.2)',
    borderRadius: '8px',
    color: '#ea4335',
    marginBottom: '1.5rem',
    textAlign: 'left'
  },
  authWarning: {
    padding: '1rem',
    backgroundColor: 'rgba(251, 188, 5, 0.1)',
    border: '1px solid rgba(251, 188, 5, 0.2)',
    borderRadius: '8px',
    color: '#ea8600',
    marginBottom: '1.5rem'
  },
  notFoundContainer: {
    padding: '3rem 1rem',
    textAlign: 'center',
    color: '#5f6368'
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px'
  }
};

// # ############################################################################ #
// # #                SECTION 3 - COMPONENT: EDIT CAMPAIGN PAGE                #
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
// # #                 SECTION 4 - EFFECT: CAMPAIGN & OWNER CHECK                #
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
        // Short delay before redirect
        setTimeout(() => navigate('/landing', { replace: true }), 2000);
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
            setTimeout(() => navigate('/campaigns/' + id, { replace: true }), 3000);
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
  }, [id, isAuthenticated, navigate, walletAddress]);

// # ############################################################################ #
// # #                 SECTION 5 - EVENT HANDLER: FORM CHANGE                  #
// # ############################################################################ #
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) : value
    });
  };

// # ############################################################################ #
// # #                  SECTION 6 - EVENT HANDLER: FORM SUBMIT                  #
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
      
      console.log('[EditCampaignPage] Updating campaign:', { id, ...formData });
      const result = await campaignService.updateCampaign(id, formData);

      if (result.success) {
        console.log('[EditCampaignPage] Campaign updated successfully');
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
// # #             SECTION 7 - EVENT HANDLER: HANDLE CANCEL                    #
// # ############################################################################ #
  const handleCancel = () => {
    if (id) {
      navigate(`/campaigns/${id}`);
    } else {
      navigate('/dashboard');
    }
  };

// # ############################################################################ #
// # #           SECTION 8 - CONDITIONAL RENDERING: LOADING STATE           #
// # ############################################################################ #
  if (loading) {
    return (
      <div style={styles.page}>
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
            <div>Loading campaign...</div>
          </div>
        </div>
      </div>
    );
  }

// # ############################################################################ #
// # #  SECTION 9 - CONDITIONAL RENDERING: ERROR, UNAUTHORIZED, NOT FOUND  #
// # ############################################################################ #
  if (error) {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
            <div>
              <Link to="/campaigns" style={{...styles.button, ...styles.buttonSecondary, marginRight: '0.5rem'}}>
                All Campaigns
              </Link>
              {isAuthenticated && (
                <Link to="/dashboard" style={{...styles.button, ...styles.buttonPrimary}}>
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </header>
        
        <div style={styles.container}>
          <div style={styles.formContainer}>
            <div style={styles.errorContainer}>
              <p>{error}</p>
              <p>You will be redirected shortly...</p>
            </div>
            <div style={{display: 'flex', justifyContent: 'center', marginTop: '1rem'}}>
              {id ? (
                <Link to={`/campaigns/${id}`} style={{...styles.button, ...styles.buttonSecondary}}>
                  Return to Campaign
                </Link>
              ) : (
                <Link to="/dashboard" style={{...styles.button, ...styles.buttonSecondary}}>
                  Return to Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isOwner || !campaign) {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
            <div>
              <Link to="/campaigns" style={{...styles.button, ...styles.buttonSecondary, marginRight: '0.5rem'}}>
                All Campaigns
              </Link>
              {isAuthenticated && (
                <Link to="/dashboard" style={{...styles.button, ...styles.buttonPrimary}}>
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </header>
        
        <div style={styles.container}>
          <div style={styles.notFoundContainer}>
            <p>Campaign not found or you don't have permission to edit it.</p>
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
// # #           SECTION 10 - JSX RETURN: EDIT CAMPAIGN FORM            #
// # ############################################################################ #
  return (
    <div style={styles.page}>
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
          <h2 style={styles.formTitle}>Edit Campaign</h2>
          
          {error && (
            <div style={styles.errorContainer}>
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label htmlFor="title" style={styles.label}>
                Campaign Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                style={styles.input}
                placeholder="Campaign Title"
                required
                disabled={submitting}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label htmlFor="description" style={styles.label}>
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                style={styles.textarea}
                placeholder="Campaign description"
                disabled={submitting}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label htmlFor="goal" style={styles.label}>
                Funding Goal (WLD)
              </label>
              <input
                type="number"
                id="goal"
                name="goal"
                value={formData.goal}
                onChange={handleChange}
                style={styles.input}
                placeholder="Enter goal amount"
                min="1"
                step="0.01"
                required
                disabled={submitting}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label htmlFor="image" style={styles.label}>
                Image URL (optional)
              </label>
              <input
                type="url"
                id="image"
                name="image"
                value={formData.image}
                onChange={handleChange}
                style={styles.input}
                placeholder="https://example.com/image.jpg"
                disabled={submitting}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label htmlFor="status" style={styles.label}>
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
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
                  ...styles.button,
                  ...styles.buttonSecondary,
                  ...styles.buttonWidth
                }}
                disabled={submitting}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                style={{
                  ...styles.button,
                  ...styles.buttonPrimary,
                  ...styles.buttonWidth,
                  ...(submitting ? { opacity: 0.7, cursor: 'not-allowed' } : {})
                }}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// # ############################################################################ #
// # #                       SECTION 11 - DEFAULT EXPORT                       #
// # ############################################################################ #
export default EditCampaignPage;