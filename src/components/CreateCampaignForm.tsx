// src/components/CreateCampaignForm.tsx
// (Simplified image linking: send raw S3 key to backend; backend stores it; Lambda uses it for lookup)

// # ############################################################################ #
// # #                          SECTION 1 - IMPORTS                             #
// # ############################################################################ #
import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { campaignService, CampaignPayload } from "../services/CampaignService"; // Ensure CampaignPayload expects imageS3Key
import { useAuth } from "./AuthContext";
import { uploadData } from '@aws-amplify/storage'; 

// # ############################################################################ #
// # #                          SECTION 2 - STYLES                              #
// # ############################################################################ #
const styles: { [key: string]: React.CSSProperties } = {
  // ... (Your existing styles - assume these are complete and correct from previous versions)
  page: { textAlign: 'center' as const, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif', color: '#202124', backgroundColor: '#f5f7fa', margin: 0, padding: 0, overflowX: 'hidden' as const, width: '100vw', minHeight: '100vh', display: 'flex', flexDirection: 'column' as const, boxSizing: 'border-box' as const, },
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
  textarea: { width: '100%', padding: '0.75rem 1rem', fontSize: '1rem', border: '1px solid #dadce0', borderRadius: '6px', resize: 'vertical' as const, minHeight: '120px', backgroundColor: 'white', boxSizing: 'border-box' as const, transition: 'border-color 0.2s, box-shadow 0.2s', },
  charCount: { fontSize: '0.75rem', color: '#5f6368', marginTop: '0.375rem', textAlign: 'right' as const, },
  button: { width: '100%', padding: '0.875rem 1.5rem', fontSize: '1rem', fontWeight: 500, color: 'white', backgroundColor: '#1a73e8', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.2s, opacity 0.2s', textAlign: 'center' as const, minHeight: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 'normal', },
  buttonPrimary: { backgroundColor: '#1a73e8', color: 'white', padding: '0.5rem 1rem', width: 'auto', fontSize: '0.875rem', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', textDecoration: 'none', textAlign: 'center' as const, minHeight: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, transition: 'background-color 0.2s, border-color 0.2s', },
  buttonDisabled: { backgroundColor: '#adb5bd', color: '#e9ecef', cursor: 'not-allowed' as const, opacity: 0.7, },
  errorMessage: { padding: '1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(234, 67, 53, 0.05)', border: '1px solid rgba(234, 67, 53, 0.2)', color: '#c53929', borderRadius: '8px', fontSize: '0.875rem', textAlign: 'left' as const, boxSizing: 'border-box' as const, },
  authWarning: { padding: '1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(251, 188, 5, 0.05)', border: '1px solid rgba(251, 188, 5, 0.2)', color: '#795500', borderRadius: '8px', fontSize: '0.875rem', textAlign: 'center' as const, boxSizing: 'border-box' as const, },
  imagePreview: { maxWidth: '100%', maxHeight: '300px', height: 'auto', marginTop: '10px', borderRadius: '6px', border: '1px solid #eee', objectFit: 'contain' as const, },
  fileInput: { display: 'block', width: '100%', padding: '0.5rem', fontSize: '0.875rem', border: '1px solid #dadce0', borderRadius: '6px', boxSizing: 'border-box' as const, lineHeight: 1.5, },
};

const responsiveStyles = `
  html, body { font-family: ${styles.page?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif'}; /* ...rest of your body styles... */ }
  *, *::before, *::after { box-sizing: inherit; }
  input:focus, textarea:focus { border-color: #1a73e8; box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.2); outline: none; }
`;

// # ############################################################################ #
// # #                 SECTION 3 - COMPONENT DEFINITION & STATE                 #
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  
  // Removed temporaryCampaignIdRef and uuid import

// # ############################################################################ #
// # #                          SECTION 4 - CONSTANTS                           #
// # ############################################################################ #
  const MAX_TITLE_LENGTH = 40;
  const MAX_DESCRIPTION_LENGTH = 425;
  const MIN_GOAL_AMOUNT = 1; 
  const MAX_GOAL_AMOUNT = 10000000000;
  const MAX_IMAGE_SIZE_MB = 5; // 5MB
  const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
  const ALLOWED_IMAGE_EXTENSIONS_DISPLAY = "JPEG, PNG";

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

// # ############################################################################ #
// # #                 SECTION 6 - EVENT HANDLER: ONCHANGE                      #
// # ############################################################################ #
  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value, }));
    if (submitError) setSubmitError(null);
  };

// # ############################################################################ #
// # #                 SECTION 6.5 - EVENT HANDLER: HANDLE IMAGE CHANGE         #
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
// # #                 SECTION 7 - EVENT HANDLER: ONSUBMIT                      #
// # ############################################################################ #
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !walletAddress) { setSubmitError('You must be logged in...'); return; }

    const goalAmount = parseFloat(form.goal);

    if (!form.title.trim()) { setSubmitError('Campaign title is required.'); return; }
    if (form.title.trim().length > MAX_TITLE_LENGTH) { setSubmitError(`Title cannot exceed ${MAX_TITLE_LENGTH} characters.`); return; }
    if (isNaN(goalAmount) || goalAmount < MIN_GOAL_AMOUNT || goalAmount > MAX_GOAL_AMOUNT) { 
      setSubmitError(`Funding goal must be a number between ${MIN_GOAL_AMOUNT} and ${MAX_GOAL_AMOUNT} WLD.`); return; 
    }
    if (!form.description.trim()) { setSubmitError('Campaign description is required.'); return; }
    if (form.description.trim().length > MAX_DESCRIPTION_LENGTH) { setSubmitError(`Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`); return; }
    if (imageError) { setSubmitError(imageError); return; }

    setSubmitError(null);
    setLoading(true);
    let rawImageS3Key: string | undefined = undefined; // Use a distinct variable name

    try {
      if (imageFile) {
        // Path for raw uploads within user's protected space.
        // The S3 key generated here IS the rawImageS3Key.
        const uniqueFileName = `raw-campaign-uploads/${walletAddress}-${Date.now()}-${imageFile.name.replace(/\s+/g, '_')}`;
        console.log(`[CreateCampaignForm] Uploading raw image: ${uniqueFileName}`);
        try {
          const uploadResult = await uploadData({
            key: uniqueFileName, // This key will be prefixed by 'protected/{identity_id}/' by Amplify
            data: imageFile,
            options: {
              contentType: imageFile.type,
              accessLevel: 'protected', // Raw upload is scoped to the user
              // Optionally add uploaderWalletAddress to metadata if Lambda needs it explicitly
              // metadata: { uploaderwalletaddress: walletAddress } 
            }
          }).result;
          rawImageS3Key = uploadResult.key; // This key includes the 'protected/{identity_id}/' prefix
          console.log('[CreateCampaignForm] Raw image uploaded, S3 Key:', rawImageS3Key);
        } catch (uploadError: any) {
          console.error('[CreateCampaignForm] Error uploading raw image to S3:', uploadError);
          throw new Error(uploadError.message || 'Failed to upload campaign image.');
        }
      }

      // The CampaignPayload in CampaignService.ts should expect 'imageS3Key'
      const payloadForBackend: CampaignPayload = {
        title: form.title.trim(),
        description: form.description.trim(),
        goal: goalAmount,
        ownerId: walletAddress,
        ...(rawImageS3Key && { imageS3Key: rawImageS3Key }), // Send the key of the raw upload
      };
      
      console.log('[CreateCampaignForm] Submitting campaign data:', payloadForBackend);
      const serviceResult = await campaignService.createCampaign(payloadForBackend);

      if (serviceResult.success && serviceResult.id) {
        console.log('[CreateCampaignForm] Campaign created successfully:', serviceResult.id);
        // The backend Lambda will process the image linked by rawImageS3Key.
        // The campaign card will eventually display the processed image URL.
        navigate(`/campaigns/${serviceResult.id}`, { state: { message: 'Campaign created successfully!' } });
      } else {
        throw new Error(serviceResult.error || 'Failed to create campaign.');
      }
    } catch (error: any) {
      console.error('[CreateCampaignForm] Error in onSubmit:', error);
      setSubmitError(error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

// # ############################################################################ #
// # #                 SECTION 8 - JSX RETURN & FORM STRUCTURE                  #
// # ############################################################################ #
  return (
    // ... (Your existing JSX structure - no change needed here from last full version you posted)
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
              <div style={styles.charCount}>{form.title.length}/{MAX_TITLE_LENGTH}</div>
            </div>
            <div style={styles.formGroup}>
              <label htmlFor="goal" style={styles.label}>Funding Goal (WLD)</label>
              <input type="number" id="goal" name="goal" value={form.goal} onChange={onChange} min={MIN_GOAL_AMOUNT.toString()} max={MAX_GOAL_AMOUNT.toString()} step="any" style={styles.input} placeholder={`e.g., 500 (Min: ${MIN_GOAL_AMOUNT}, Max: ${MAX_GOAL_AMOUNT})`} disabled={!isAuthenticated || loading} required />
            </div>
            <div style={styles.formGroup}>
              <label htmlFor="description" style={styles.label}>Describe Your Campaign</label>
              <textarea id="description" name="description" value={form.description} onChange={onChange} style={styles.textarea} placeholder="Share the story, impact, and details of your campaign..." rows={6} disabled={!isAuthenticated || loading} maxLength={MAX_DESCRIPTION_LENGTH} required />
              <div style={styles.charCount}>{form.description.length}/{MAX_DESCRIPTION_LENGTH}</div>
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
    </div>
  );
}

export default CreateCampaignForm;