// src/components/CampaignCard.tsx
// (Days Left display removed)

import React from 'react';
import { Link } from 'react-router-dom';
import { Campaign as CampaignData } from '../services/CampaignService'; // Adjust path if CampaignService is elsewhere

export interface CampaignDisplayInfo extends CampaignData {
  daysLeft?: number; // Remains optional, but will no longer be displayed by this card
  creator?: string;
  isVerified?: boolean;
  progressPercentage: number;
}

export interface CampaignCardProps {
  campaign: CampaignDisplayInfo;
  showViewDetailsButton?: boolean;
  showAdminActions?: boolean;
  onEdit?: (campaignId: string) => void;
  onDelete?: (campaignId: string) => void;
  editButtonStyle?: React.CSSProperties;
  deleteButtonStyle?: React.CSSProperties;
}

const cardStyles: { [key: string]: React.CSSProperties } = {
  campaignCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    width: '100%',
    height: '100%',
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
    height: '90px',
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
    minHeight: 'calc(3 * 1.4em)',
    lineHeight: '1.4em',
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
    // marginBottom: '0.5rem', // Adjusted: daysLeftText will provide bottom margin for content area
  },
  // daysLeftText style is no longer needed if we remove the element
  // daysLeftText: {
  //   fontSize: '0.75rem',
  //   color: '#5f6368',
  //   textAlign: 'right' as const,
  //   marginBottom: '0.75rem', 
  // },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    borderTop: '1px solid #f1f3f4',
    backgroundColor: '#fcfcfc',
    boxSizing: 'border-box' as const,
    minHeight: '50px',
  },
  creatorDetails: {
      display: 'flex',
      alignItems: 'center',
      flexShrink: 1, 
      overflow: 'hidden', 
      marginRight: '0.5rem', 
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
    gap: '0.5rem', 
    flexShrink: 0, 
  },
  actionButton: { 
    fontSize: '0.8rem', 
    padding: '0.375rem 0.75rem', 
    borderRadius: '4px', 
    textDecoration: 'none', 
    color: 'white',
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.2s',
    whiteSpace: 'nowrap' as const,
  },
};

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  showViewDetailsButton = true,
  showAdminActions,
  onEdit,
  onDelete,
  editButtonStyle,
  deleteButtonStyle,
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
        {/* --- DAYS LEFT DISPLAY REMOVED ---
        {campaign.daysLeft !== undefined && campaign.daysLeft >= 0 && (
            <div style={cardStyles.daysLeftText}>{campaign.daysLeft} days left</div>
        )}
        */}
        {/* Add a bottom margin to progressStats if daysLeft was the only thing providing space before footer */}
         { (campaign.daysLeft === undefined || campaign.daysLeft < 0) && <div style={{ marginBottom: '0.75rem' }}></div> }

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
                    style={{...cardStyles.actionButton, ...(deleteButtonStyle || {backgroundColor: '#dc3545'})}}
                >
                    Delete
                </button>
            )}
            {showViewDetailsButton && !showAdminActions && (
                 <Link to={`/campaigns/${campaign.id}`} style={{...cardStyles.actionButton, backgroundColor: '#1a73e8'}}>
                    View Details
                </Link>
            )}
        </div>
      </div>
    </div>
  );
};