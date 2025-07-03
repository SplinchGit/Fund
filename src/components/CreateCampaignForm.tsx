// src/components/CreateCampaignForm.tsx
// (Full fix: Corrects image payload, category selection, and provides context for line 81 error)

// # ############################################################################ #
// # #                           SECTION 1 - IMPORTS                           #
// # ############################################################################ #
import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
// Ensure CampaignPayload in CampaignService.ts has:
// category: string; image?: string; ownerId: string; title: string; description: string; goal: number;
import { campaignService, CampaignPayload } from "../services/CampaignService";
import { useAuth } from "./AuthContext";
import { uploadData } from '@aws-amplify/storage';
import { contentModerationService, PreviewResult } from "../services/ContentModerationService";

const PREDEFINED_CATEGORIES = [
    "Technology & Innovation",
    "Creative Works", 
    "Community & Social Causes",
    "Small Business & Entrepreneurship",
    "Health & Wellness",
    "Other"
];

// # ############################################################################ #
// # #                           SECTION 2 - STYLES                           #
// # ############################################################################ #
const styles: { [key: string]: React.CSSProperties } = {
  // Using your styles from Turn 51. Line 81 error is reported within this block.
  // If the error on Line 81 persists, please share that specific line and a few around it.
  page: { textAlign: 'center' as const, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif', color: '#202124', backgroundColor: '#f5f7fa', margin: 0, padding: 0, overflowX: 'hidden' as const, width: '100vw', minHeight: '100%', display: 'flex', flexDirection: 'column' as const, boxSizing: 'border-box' as const, },
  container: { margin: '0 auto', width: '100%', padding: '0 0.5rem', boxSizing: 'border-box' as const, maxWidth: '1200px', flexGrow: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', paddingTop: '1rem', paddingBottom: '2rem', },
  header: { background: 'white', padding: '0.5rem 0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'sticky' as const, top: 0, zIndex: 100, width: '100%', boxSizing: 'border-box' as const, },
  headerContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto', padding: '0 0.5rem', boxSizing: 'border-box' as const, },
  logo: { display: 'flex', alignItems: 'center', color: '#1a73e8', fontWeight: 700, fontSize: '1.125rem', textDecoration: 'none', },
  logoSpan: { color: '#202124', },
  formContainer: { maxWidth: '700px', width: '100%', margin: '1.5rem 0', padding: '2rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box' as const, },
  formTitle: { fontSize: '1.75rem', fontWeight: 600, marginBottom: '2rem', color: '#202124', textAlign: 'left' as const, },
  formGroup: { marginBottom: '1.5rem', textAlign: 'left' as const, },
  label: { display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#3c4043', },
  input: { width: '100%', padding: '0.75rem 1rem', fontSize: '1rem', border: '1px solid #dadce0', borderRadius: '6px', backgroundColor: 'white', boxSizing: 'border-box' as const, transition: 'border-color 0.2s, box-shadow 0.2s', },
  select: { width: '100%', padding: '0.75rem 1rem', fontSize: '1rem', border: '1px solid #dadce0', borderRadius: '6px', backgroundColor: 'white', boxSizing: 'border-box' as const, transition: 'border-color 0.2s, box-shadow 0.2s', appearance: 'none' as const, backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22/%3E%3C/svg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '0.65em auto', paddingRight: '2.5rem', },
  textarea: { width: '100%', padding: '0.75rem 1rem', fontSize: '1rem', border: '1px solid #dadce0', borderRadius: '6px', resize: 'vertical' as const, minHeight: '120px', backgroundColor: 'white', boxSizing: 'border-box' as const, transition: 'border-color 0.2s, box-shadow 0.2s', },
  charCount: { fontSize: '0.75rem', color: '#5f6368', marginTop: '0.375rem', textAlign: 'right' as const, },
  button: { width: '100%', padding: '0.875rem 1.5rem', fontSize: '1rem', fontWeight: 500, color: 'white', backgroundColor: '#1a73e8', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.2s, opacity 0.2s', textAlign: 'center' as const, minHeight: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 'normal', },
  buttonPrimary: { backgroundColor: '#1a73e8', color: 'white', padding: '0.5rem 1rem', width: 'auto', fontSize: '0.875rem', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', textDecoration: 'none', textAlign: 'center' as const, minHeight: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, transition: 'background-color 0.2s, border-color 0.2s', },
  buttonDisabled: { backgroundColor: '#adb5bd', color: '#e9ecef', cursor: 'not-allowed' as const, opacity: 0.7, },
  errorMessage: { padding: '1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(234, 67, 53, 0.05)', border: '1px solid rgba(234, 67, 53, 0.2)', color: '#c53929', borderRadius: '8px', fontSize: '0.875rem', textAlign: 'left' as const, boxSizing: 'border-box' as const, },
  authWarning: { padding: '1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(251, 188, 5, 0.05)', border: '1px solid rgba(251, 188, 5, 0.2)', color: '#795500', borderRadius: '8px', fontSize: '0.875rem', textAlign: 'center' as const, boxSizing: 'border-box' as const, },
  filterIndicator: { fontSize: '0.75rem', color: '#1a73e8', fontWeight: 500 },
  previewBox: { padding: '0.75rem', marginTop: '0.5rem', backgroundColor: 'rgba(26, 115, 232, 0.05)', border: '1px solid rgba(26, 115, 232, 0.2)', color: '#1a73e8', borderRadius: '6px', fontSize: '0.75rem', textAlign: 'left' as const, boxSizing: 'border-box' as const, },
  modal: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', touchAction: 'none' },
  modalContent: { backgroundColor: 'white', borderRadius: '12px', padding: '2rem', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'auto', WebkitOverflowScrolling: 'touch' as const, touchAction: 'auto' },
  modalTitle: { fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#202124' },
  modalButtons: { display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' },
  modalButtonPrimary: { padding: '0.75rem 1.5rem', backgroundColor: '#1a73e8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' },
  modalButtonSecondary: { padding: '0.75rem 1.5rem', backgroundColor: '#f8f9fa', color: '#3c4043', border: '1px solid #dadce0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' },
  imagePreview: { maxWidth: '100%', maxHeight: '300px', height: 'auto', marginTop: '10px', borderRadius: '6px', border: '1px solid #eee', objectFit: 'contain' as const, },
  fileInput: { display: 'block', width: '100%', padding: '0.5rem', fontSize: '0.875rem', border: '1px solid #dadce0', borderRadius: '6px', boxSizing: 'border-box' as const, lineHeight: 1.5, },
};

const responsiveStyles = `
  html, body { font-family: ${styles.page?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif'}; }
  *, *::before, *::after { box-sizing: inherit; }
  input:focus, textarea:focus, select:focus { border-color: #1a73e8; box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.2); outline: none; }
  
  @media (max-width: 768px) {
    input, textarea, select {
      font-size: 16px !important;
      transform: translateZ(0);
      -webkit-appearance: none;
    }
    
    button {
      min-height: 44px;
      touch-action: manipulation;
    }
  }
`;

// # ############################################################################ #
// # #                   SECTION 3 - COMPONENT DEFINITION & STATE                   #
// # ############################################################################ #

interface CreateFormFields {
  title: string;
  goal: string;
  description: string;
}

export function CreateCampaignForm() {
  const navigate = useNavigate();
  const { isAuthenticated, walletAddress } = useAuth();

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateFormFields>({
    title: "",
    goal: "",
    description: "",
  });
  const [selectedCategory, setSelectedCategory] = useState<string>(PREDEFINED_CATEGORIES[0] ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [contentPreviews, setContentPreviews] = useState<{
    title?: PreviewResult;
    description?: PreviewResult;
  }>({});
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [pendingSubmit, setPendingSubmit] = useState<boolean>(false);
  
// # ############################################################################ #
// # #                           SECTION 4 - CONSTANTS                           #
// # ############################################################################ #
  const MAX_TITLE_LENGTH = 40;
  const MAX_DESCRIPTION_LENGTH = 425;
  const MIN_GOAL_AMOUNT = 1;
  const MAX_GOAL_AMOUNT = 10000000000; // Make sure this aligns with backend if any validation exists there
  const MAX_IMAGE_SIZE_MB = 5;
  const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
  const ALLOWED_IMAGE_EXTENSIONS_DISPLAY = "JPEG, PNG";

// # ############################################################################ #
// # #                   SECTION 5 - EFFECT: AUTHENTICATION CHECK                   #
// # ############################################################################ #
  useEffect(() => {
    if (!isAuthenticated) {
      const redirectTimer = setTimeout(() => {
        navigate('/landing', { replace: true, state: { message: "Please sign in to create a campaign." } });
      }, 2500);
      return () => clearTimeout(redirectTimer);
    } else {
        setSubmitError(null);
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Modal scroll locking effect
  useEffect(() => {
    if (showPreviewModal) {
      // Lock scroll when modal opens
      document.body.classList.add('scroll-lock');
      return () => {
        // Unlock scroll when modal closes
        document.body.classList.remove('scroll-lock');
      };
    }
  }, [showPreviewModal]);

// # ############################################################################ #
// # #                   SECTION 6 - EVENT HANDLER: ONCHANGE                   #
// # ############################################################################ #
  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "category") {
        setSelectedCategory(value);
    } else {
        setForm(prev => ({ ...prev, [name]: value, }));
        
        // Real-time content preview for title and description
        if (name === "title" || name === "description") {
          const preview = contentModerationService.getContentPreview(value);
          
          setContentPreviews(prev => ({
            ...prev,
            [name]: preview.hasChanges ? preview : undefined
          }));
        }
    }
    if (submitError) setSubmitError(null);
  };

// # ############################################################################ #
// # #                 SECTION 6.5 - EVENT HANDLER: HANDLE IMAGE CHANGE                 #
// # ############################################################################ #
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setImageError(null); 
    if (imagePreview) { URL.revokeObjectURL(imagePreview); setImagePreview(null); }
    setImageFile(null);
    const file = e.target.files?.[0];

    if (file) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setImageError(`Invalid file type. Please upload a ${ALLOWED_IMAGE_EXTENSIONS_DISPLAY} image.`);
        e.target.value = ''; return;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setImageError(`Image too large. Maximum size is ${MAX_IMAGE_SIZE_MB}MB.`);
        e.target.value = ''; return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

// # ############################################################################ #
// # #                   SECTION 7 - EVENT HANDLER: ONSUBMIT                   #
// # ############################################################################ #
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !walletAddress) { 
        setSubmitError('You must be logged in and have a connected wallet to create a campaign.'); 
        return; 
    }

    const goalAmount = parseFloat(form.goal);

    // --- Form Validations ---
    if (!form.title.trim()) { setSubmitError('Campaign title is required.'); return; }
    if (form.title.trim().length > MAX_TITLE_LENGTH) { setSubmitError(`Title cannot exceed ${MAX_TITLE_LENGTH} characters.`); return; }
    if (!selectedCategory) { 
        setSubmitError('Please select a campaign category.'); return;
    }
    if (isNaN(goalAmount) || goalAmount < MIN_GOAL_AMOUNT || goalAmount > MAX_GOAL_AMOUNT) {
      setSubmitError(`Funding goal must be a number between ${MIN_GOAL_AMOUNT} and ${MAX_GOAL_AMOUNT} WLD.`); return;
    }
    if (!form.description.trim()) { setSubmitError('Campaign description is required.'); return; }
    if (form.description.trim().length > MAX_DESCRIPTION_LENGTH) { setSubmitError(`Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`); return; }
    if (imageError) { setSubmitError(imageError); return; }

    // --- Content Moderation Check ---
    const moderationResult = contentModerationService.moderateCampaignData(
      form.title.trim(),
      form.description.trim()
    );
    
    // Check if content should be blocked entirely (only extreme cases)
    if (moderationResult.titlePreview.shouldBlock || moderationResult.descriptionPreview.shouldBlock) {
      setSubmitError('Your campaign contains inappropriate content and cannot be submitted. Please revise your title and description.');
      return;
    }
    
    // If content will be censored, show preview and ask for confirmation
    if (moderationResult.titlePreview.hasChanges || moderationResult.descriptionPreview.hasChanges) {
      setContentPreviews({
        title: moderationResult.titlePreview.hasChanges ? moderationResult.titlePreview : undefined,
        description: moderationResult.descriptionPreview.hasChanges ? moderationResult.descriptionPreview : undefined
      });
      setShowPreviewModal(true);
      setPendingSubmit(true);
      return; // Stop here and wait for user confirmation
    }
    // --- End Form Validations ---

    // Proceed with actual submission
    await submitCampaign(false);
  };

  const submitCampaign = async (useFilteredContent: boolean) => {
    setSubmitError(null);
    setLoading(true);
    let rawImageS3Key: string | undefined = undefined; // Variable to hold the S3 key from upload

    // Get the text to use (filtered or original)
    let titleToSubmit = form.title.trim();
    let descriptionToSubmit = form.description.trim();
    
    if (useFilteredContent) {
      if (contentPreviews.title?.hasChanges) {
        titleToSubmit = contentPreviews.title.previewText;
      }
      if (contentPreviews.description?.hasChanges) {
        descriptionToSubmit = contentPreviews.description.previewText;
      }
    }

    try {
      if (imageFile) {
        // Ensure walletAddress is a string for the S3 key path
        const uniqueFileName = `raw-campaign-uploads/${walletAddress}-${Date.now()}-${imageFile.name.replace(/\s+/g, '_')}`;
        console.log(`[CreateCampaignForm] Uploading raw image: ${uniqueFileName}`);
        try {
          const uploadResult = await uploadData({
            key: uniqueFileName, 
            data: imageFile,
            options: {
              contentType: imageFile.type,
              accessLevel: 'protected', // Scoped to the authenticated user
            }
          }).result;
          rawImageS3Key = uploadResult.key; // This key includes the 'protected/{identity_id}/' prefix
          console.log('[CreateCampaignForm] Raw image uploaded, S3 Key:', rawImageS3Key);
        } catch (uploadError: any) {
          console.error('[CreateCampaignForm] Error uploading raw image to S3:', uploadError);
          throw new Error(uploadError.message || 'Failed to upload campaign image.');
        }
      }

      // Construct payload correctly using 'image' property for the S3 key
      const createdAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now

      const payloadForBackend: CampaignPayload = {
        title: titleToSubmit,
        description: descriptionToSubmit,
        goal: goalAmount,
        category: selectedCategory,
        ownerId: walletAddress, // walletAddress is confirmed to be a string here due to the check above
        createdAt: createdAt,
        expiresAt: expiresAt,
        // Conditionally add the 'image' property (with the S3 key) if rawImageS3Key has a value
        ...(rawImageS3Key ? { image: rawImageS3Key } : {})
      };
      
      console.log('[CreateCampaignForm] Submitting campaign data:', payloadForBackend);
      // Ensure CampaignPayload in CampaignService.ts expects 'category: string' and 'image?: string'
      const serviceResult = await campaignService.createCampaign(payloadForBackend);

      if (serviceResult.success && serviceResult.id) {
        console.log('[CreateCampaignForm] Campaign created successfully:', serviceResult.id);
        navigate(`/campaigns/${serviceResult.id}`, { state: { message: 'Campaign created successfully!' } });
      } else {
        throw new Error(serviceResult.error || 'Failed to create campaign.');
      }
    } catch (error: any) {
      console.error('[CreateCampaignForm] Error in onSubmit:', error);
      setSubmitError(error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
      setPendingSubmit(false);
      setShowPreviewModal(false);
    }
  };

  const handleAcceptFiltered = async () => {
    setShowPreviewModal(false);
    await submitCampaign(true);
  };

  const handleRejectAndEdit = () => {
    setShowPreviewModal(false);
    setPendingSubmit(false);
    // User can now edit their content
  };

// # ############################################################################ #
// # #                   SECTION 8 - JSX RETURN & FORM STRUCTURE                   #
// # ############################################################################ #
  return (
    <div style={styles.page}>
      <style>{responsiveStyles}</style>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
          <Link to="/dashboard" style={{ ...styles.buttonPrimary }} > Back to Dashboard </Link>
        </div>
      </header>
      <div style={styles.container}>
        <div style={styles.formContainer}>
          <h2 style={styles.formTitle}>Launch Your Campaign</h2>
          {!isAuthenticated && ( <div style={styles.authWarning}> Authentication required. Please sign in to create a campaign. Redirecting... </div> )}
          {submitError && ( <div style={styles.errorMessage}> {submitError} </div> )}
          <form onSubmit={onSubmit}>
            <div style={styles.formGroup}>
              <label htmlFor="title" style={styles.label}>Campaign Title</label>
              <input type="text" id="title" name="title" value={form.title} onChange={onChange} style={styles.input} placeholder="e.g., Community Art Mural" disabled={!isAuthenticated || loading} maxLength={MAX_TITLE_LENGTH} required />
              <div style={styles.charCount}>
                {form.title.length}/{MAX_TITLE_LENGTH}
                {contentPreviews.title?.hasChanges && (
                  <span style={styles.filterIndicator}> • Content will be filtered</span>
                )}
              </div>
              {contentPreviews.title?.hasChanges && (
                <div style={styles.previewBox}>
                  <strong>Preview:</strong> "{contentPreviews.title.previewText}"
                </div>
              )}
            </div>

            <div style={styles.formGroup}>
                <label htmlFor="category" style={styles.label}>Category</label>
                <select
                    id="category"
                    name="category" 
                    value={selectedCategory}
                    onChange={onChange} 
                    style={styles.select} 
                    disabled={!isAuthenticated || loading}
                    required
                >
                    {PREDEFINED_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="goal" style={styles.label}>Funding Goal (WLD)</label>
              <input type="number" id="goal" name="goal" value={form.goal} onChange={onChange} min={MIN_GOAL_AMOUNT.toString()} max={MAX_GOAL_AMOUNT.toString()} step="any" style={styles.input} placeholder={`e.g., 500 (Min: ${MIN_GOAL_AMOUNT}, Max: ${MAX_GOAL_AMOUNT})`} disabled={!isAuthenticated || loading} required />
            </div>
            <div style={styles.formGroup}>
              <label htmlFor="description" style={styles.label}>Describe Your Campaign</label>
              <textarea id="description" name="description" value={form.description} onChange={onChange} style={styles.textarea} placeholder="Share the story, impact, and details of your campaign..." rows={6} disabled={!isAuthenticated || loading} maxLength={MAX_DESCRIPTION_LENGTH} required />
              <div style={styles.charCount}>
                {form.description.length}/{MAX_DESCRIPTION_LENGTH}
                {contentPreviews.description?.hasChanges && (
                  <span style={styles.filterIndicator}> • Content will be filtered</span>
                )}
              </div>
              {contentPreviews.description?.hasChanges && (
                <div style={styles.previewBox}>
                  <strong>Preview:</strong> "{contentPreviews.description.previewText}"
                </div>
              )}
            </div>
            <div style={styles.formGroup}>
              <label htmlFor="campaignImageFile" style={styles.label}> Campaign Cover Image (Optional, Max {MAX_IMAGE_SIZE_MB}MB, Types: {ALLOWED_IMAGE_EXTENSIONS_DISPLAY}) </label>
              <input type="file" id="campaignImageFile" name="campaignImageFile" accept={ALLOWED_IMAGE_TYPES.join(',')} onChange={handleImageChange} style={styles.fileInput} disabled={!isAuthenticated || loading} />
              {imageError && ( <div style={{...styles.charCount, color: '#c53929', textAlign: 'left', marginTop: '0.25rem'}}> {imageError} </div> )}
              {imagePreview && ( <div style={{marginTop: '10px', textAlign: 'center'}}> <img src={imagePreview} alt="Campaign preview" style={styles.imagePreview} /> </div> )}
            </div>
            <button type="submit" disabled={!isAuthenticated || loading || !!submitError || !!imageError} style={{ ...styles.button, marginTop: '1rem', ...((!isAuthenticated || loading || !!submitError || !!imageError) ? styles.buttonDisabled : {}) }} >
              {loading ? 'Creating Campaign...' : 'Launch Campaign'}
            </button>
          </form>
        </div>
      </div>

      {/* Content Preview Modal */}
      {showPreviewModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Content Will Be Filtered</h3>
            <p>Your campaign contains words that will be automatically censored. Here's how it will appear:</p>
            
            {contentPreviews.title?.hasChanges && (
              <div style={{marginBottom: '1rem'}}>
                <strong>Title:</strong>
                <div style={styles.previewBox}>"{contentPreviews.title.previewText}"</div>
              </div>
            )}
            
            {contentPreviews.description?.hasChanges && (
              <div style={{marginBottom: '1rem'}}>
                <strong>Description:</strong>
                <div style={styles.previewBox}>"{contentPreviews.description.previewText}"</div>
              </div>
            )}
            
            <p>Would you like to submit with the filtered content or edit your text?</p>
            
            <div style={styles.modalButtons}>
              <button onClick={handleRejectAndEdit} style={styles.modalButtonSecondary}>
                Edit My Text
              </button>
              <button onClick={handleAcceptFiltered} style={styles.modalButtonPrimary} disabled={loading}>
                {loading ? 'Submitting...' : 'Submit with Filtered Content'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateCampaignForm;