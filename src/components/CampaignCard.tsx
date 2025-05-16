// src/components/CampaignCard.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { Campaign as CampaignData } from '../services/CampaignService'; // Adjust path if CampaignService is elsewhere

// Interface for the data a campaign card expects
// Ensure this aligns with the data structure you use for campaigns
export interface CampaignDisplayInfo extends CampaignData {
  daysLeft?: number;                // Optional: if not always calculated or displayed
  creator?: string;                 // Formatted owner ID or name
  isVerified?: boolean;             // Verification status
  progressPercentage: number;      // Number from 0-100 for the progress bar
  // You can add other fields if your CampaignData from the service is different
  // or if cards need to display more/less info in different contexts.
}

// Props for the CampaignCard component, allowing for customization
export interface CampaignCardProps {
  campaign: CampaignDisplayInfo;
  showViewDetailsButton?: boolean;    // To show the "View Details" button
  showAdminActions?: boolean;         // To show Edit/Delete buttons (typically for Dashboard)
  onEdit?: (campaignId: string) => void;
  onDelete?: (campaignId: string) => void;
  editButtonStyle?: React.CSSProperties;
  deleteButtonStyle?: React.CSSProperties; // Will be the red button style
}

// Styles for the Campaign Card - self-contained for better reusability
const cardStyles: { [key: string]: React.CSSProperties } = {
  campaignCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    width: '100%',
    height: '100%', // Make card fill the slide height if alignItems: 'stretch' is on SwiperSlide
    boxSizing: 'border-box' as const,
    textAlign: 'left' as const,
  },
  cardImage: {
    width: '100%',
    height: '180px',
    objectFit: 'cover' as const,
    borderBottom: '1px solid #f0f0f0',
  },
  noImagePlaceholder: {
    width: '100%',
    height: '180px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f3f4',
    color: '#9aa0a6',
    fontSize: '1rem',
    borderBottom: '1px solid #e0e0e0',
    boxSizing: 'border-box' as const,
  },
  cardContent: {
    padding: '1rem',
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    boxSizing: 'border-box' as const,
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '0.5rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  cardDescription: {
    fontSize: '0.875rem',
    color: '#5f6368',
    marginBottom: '0.75rem',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minHeight: 'calc(3 * 1.4em)', // Min height for approx 3 lines (1.4em line-height)
    lineHeight: '1.4em',         // Standard line height
    flexGrow: 1,
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '0.5rem',
    marginTop: 'auto', 
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34a853',
    borderRadius: '4px',
    transition: 'width 0.4s ease-in-out',
  },
  progressStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: '#5f6368',
    marginBottom: '0.5rem', // Reduced margin to bring daysLeft closer if present
  },
  daysLeftText: {
    fontSize: '0.75rem',
    color: '#5f6368',
    // marginTop: '0.25rem', // No extra top margin, relies on progressStats marginBottom
    textAlign: 'right' as const,
    marginBottom: '0.75rem', // Consistent bottom margin before footer
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between', // Will space creator info and buttons
    alignItems: 'center',
    padding: '0.75rem 1rem',
    borderTop: '1px solid #f1f3f4',
    backgroundColor: '#fcfcfc',
    boxSizing: 'border-box' as const,
    minHeight: '50px', // Ensure footer has some consistent height
  },
  creatorDetails: {
      display: 'flex',
      alignItems: 'center',
      flexShrink: 1, // Allow creator details to shrink if buttons need space
      overflow: 'hidden', // Hide overflow for creator name
      marginRight: '0.5rem', // Space between creator and buttons
  },
  creatorAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#e0e0e0',
    marginRight: '0.5rem',
    display: 'inline-block',
    flexShrink: 0,
  },
  creatorName: {
    fontSize: '0.75rem',
    color: '#5f6368',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
    color: '#34a853',
    fontSize: '0.6rem',
    padding: '0.1rem 0.25rem',
    borderRadius: '0.125rem',
    marginLeft: '0.5rem',
    fontWeight: 500,
    flexShrink: 0,
  },
  actionButtonsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem', // Space between multiple buttons like Edit and Delete
    flexShrink: 0, // Buttons should not shrink
  },
  // General button style for actions in footer - specific styles passed as props or defined in consuming component
  actionButton: { 
    fontSize: '0.8rem', 
    padding: '0.375rem 0.75rem', 
    borderRadius: '4px', 
    textDecoration: 'none', 
    color: 'white',
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.2s',
    whiteSpace: 'nowrap' as const, // Prevent button text from wrapping
  },
};

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  showViewDetailsButton = true, // Default to true
  showAdminActions,
  onEdit,
  onDelete,
  editButtonStyle,     // Style for Edit button (e.g., orange)
  deleteButtonStyle,   // Style for Delete button (red, defined in Dashboard.tsx)
}) => {

  const handleEdit = () => {
    if (onEdit && campaign.id) {
      onEdit(campaign.id);
    }
  };

  const handleDelete = () => {
    if (onDelete && campaign.id) {
      onDelete(campaign.id);
    }
  };

  return (
    <div style={cardStyles.campaignCard}>
      {campaign.image ? (
        <img
          src={campaign.image}
          alt={campaign.title}
          style={cardStyles.cardImage}
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x300/e5e7eb/9aa0a6?text=No+Image'; }}
        />
      ) : (
        <div style={cardStyles.noImagePlaceholder}>No Image</div>
      )}
      <div style={cardStyles.cardContent}>
        <h3 style={cardStyles.cardTitle} title={campaign.title}>{campaign.title}</h3>
        {campaign.description && (
          <p style={cardStyles.cardDescription}>
            {campaign.description}
          </p>
        )}
        <div style={cardStyles.progressBar}>
          <div style={{ ...cardStyles.progressFill, width: `${campaign.progressPercentage}%` }}></div>
        </div>
        <div style={cardStyles.progressStats}>
          <span>{campaign.raised !== undefined ? campaign.raised.toLocaleString() : '0'} / {campaign.goal !== undefined ? campaign.goal.toLocaleString() : '0'} WLD</span>
          <span>{campaign.progressPercentage !== undefined ? campaign.progressPercentage.toFixed(0) : '0'}%</span>
        </div>
        {campaign.daysLeft !== undefined && campaign.daysLeft >= 0 && ( // Only show if daysLeft is a non-negative number
            <div style={cardStyles.daysLeftText}>{campaign.daysLeft} days left</div>
        )}
      </div>
      <div style={cardStyles.cardFooter}>
        <div style={cardStyles.creatorDetails}>
            {campaign.creator && <span style={cardStyles.creatorAvatar}></span>}
            {campaign.creator && <span style={cardStyles.creatorName} title={campaign.creator}>{campaign.creator}</span>}
            {campaign.isVerified && <span style={cardStyles.verifiedBadge}>Verified</span>}
        </div>
        
        <div style={cardStyles.actionButtonsContainer}>
            {showAdminActions && onEdit && (
                <button 
                    onClick={handleEdit} 
                    style={{...cardStyles.actionButton, backgroundColor: '#f0ad4e', ...(editButtonStyle || {}) }}
                >
                    Edit
                </button>
            )}
            {showAdminActions && onDelete && (
                <button 
                    onClick={handleDelete} 
                    style={{...cardStyles.actionButton, ...(deleteButtonStyle || {backgroundColor: '#dc3545'})}} // Use passed style
                >
                    Delete
                </button>
            )}
            {showViewDetailsButton && !showAdminActions && ( // Only show View Details if not showing admin actions
                 <Link to={`/campaigns/${campaign.id}`} style={{...cardStyles.actionButton, backgroundColor: '#1a73e8'}}>
                    View Details
                </Link>
            )}
        </div>
      </div>
    </div>
  );
};