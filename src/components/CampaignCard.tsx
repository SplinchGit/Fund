// src/components/CampaignCard.tsx
// UPDATED: Use ImageService for proper image display

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Campaign as CampaignData } from '../services/CampaignService';
import { ensService } from '../services/EnsService';
import { imageService } from '../services/ImageService';

export interface CampaignDisplayInfo extends CampaignData {
  daysLeft?: number;
  creator?: string;
  isVerified?: boolean;
  progressPercentage: number;
  ownerEnsName?: string;
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
    borderRadius: '16px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    width: '100%',
    height: '100%',
    boxSizing: 'border-box' as const,
    textAlign: 'left' as const,
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  },
  cardImage: {
    width: '100%',
    height: '200px',
    objectFit: 'cover' as const,
    borderBottom: '1px solid #f0f0f0',
  },
  noImagePlaceholder: {
    width: '100%',
    height: '200px', // Consistent height with image
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f3f4',
    color: '#9aa0a6',
    fontSize: '1.1rem',
    borderBottom: '1px solid #e0e0e0',
    boxSizing: 'border-box' as const,
  },
  cardContent: {
    padding: '1.25rem',
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    boxSizing: 'border-box' as const,
  },
  cardTitle: {
    fontSize: '1.35rem',
    fontWeight: 700,
    color: '#202124',
    marginBottom: '0.6rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  cardDescription: {
    fontSize: '0.95rem',
    color: '#5f6368',
    marginBottom: '1rem',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minHeight: 'calc(3 * 1.5em)',
    lineHeight: '1.5em',
    flexGrow: 1,
  },
  progressBar: {
    width: '100%',
    height: '10px',
    backgroundColor: '#e9ecef',
    borderRadius: '5px',
    overflow: 'hidden',
    marginBottom: '0.6rem',
    marginTop: 'auto', 
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34a853',
    borderRadius: '5px',
    transition: 'width 0.4s ease-in-out',
  },
  progressStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: '#5f6368',
    marginBottom: '1rem',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    borderTop: '1px solid #f1f3f4',
    backgroundColor: '#fcfcfc',
    boxSizing: 'border-box' as const,
    minHeight: '60px',
  },
  creatorDetails: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 1, 
    overflow: 'hidden', 
    marginRight: '0.75rem', 
  },
  creatorAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#e0e0e0',
    marginRight: '0.6rem',
    display: 'inline-block',
    flexShrink: 0,
  },
  creatorName: {
    fontSize: '0.9rem',
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
    fontSize: '0.7rem',
    padding: '0.15rem 0.4rem',
    borderRadius: '0.15rem',
    marginLeft: '0.6rem',
    fontWeight: 600,
    flexShrink: 0,
  },
  actionButtonsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem', 
    flexShrink: 0, 
  },
  actionButton: { 
    fontSize: '0.9rem', 
    padding: '0.4rem 0.9rem', 
    borderRadius: '6px', 
    textDecoration: 'none', 
    color: 'white',
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.2s',
    whiteSpace: 'nowrap' as const,
  },
  // Loading state for image
  imageLoading: {
    width: '100%',
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
    fontSize: '0.9rem',
  }
};

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign: initialCampaign,
  showViewDetailsButton = true,
  showAdminActions,
  onEdit,
  onDelete,
  editButtonStyle,
  deleteButtonStyle,
}) => {
  const [campaign, setCampaign] = useState(initialCampaign);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Load ENS data
  useEffect(() => {
    const resolveEns = async () => {
      if (initialCampaign.ownerId) {
        const ensName = await ensService.formatAddressOrEns(initialCampaign.ownerId);
        setCampaign(prev => ({
          ...prev,
          creator: ensName,
          ownerEnsName: ensName,
        }));
      }
    };
    resolveEns();
  }, [initialCampaign.ownerId]);

  // Load campaign image
  useEffect(() => {
    const loadImage = async () => {
      setImageLoading(true);
      setImageError(false);
      
      if (initialCampaign.image) {
        try {
          const url = await imageService.getCampaignImageUrl(initialCampaign.image);
          if (url) {
            setImageUrl(url);
          } else {
            setImageError(true);
          }
        } catch (error) {
          console.error('[CampaignCard] Failed to load image:', error);
          setImageError(true);
        }
      }
      setImageLoading(false);
    };

    loadImage();
  }, [initialCampaign.image]);

  // Update campaign when prop changes
  useEffect(() => {
    setCampaign(initialCampaign);
  }, [initialCampaign]);

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

  const handleImageError = () => {
    setImageError(true);
    setImageUrl(imageService.getFallbackImageUrl(400, 200));
  };

  return (
    <div style={cardStyles.campaignCard}>
      {/* Image Section */}
      {imageLoading ? (
        <div style={cardStyles.imageLoading}>
          Loading image...
        </div>
      ) : campaign.image && imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={campaign.title}
          style={cardStyles.cardImage}
          onError={handleImageError}
        />
      ) : (
        <div style={cardStyles.noImagePlaceholder}>
          No Image
        </div>
      )}

      {/* Content Section */}
      <div style={cardStyles.cardContent}>
        <h3 style={cardStyles.cardTitle} title={campaign.title}>
          {campaign.title}
        </h3>
        
        {campaign.description && (
          <p style={cardStyles.cardDescription}>
            {campaign.description}
          </p>
        )}
        
        {/* Progress Bar */}
        <div style={cardStyles.progressBar}>
          <div 
            style={{ 
              ...cardStyles.progressFill, 
              width: `${campaign.progressPercentage}%` 
            }}
          />
        </div>
        
        {/* Progress Stats */}
        <div style={cardStyles.progressStats}>
          <span>
            {campaign.raised !== undefined ? campaign.raised.toLocaleString() : '0'} / {campaign.goal !== undefined ? campaign.goal.toLocaleString() : '0'} WLD
          </span>
          <span>
            {campaign.progressPercentage !== undefined ? campaign.progressPercentage.toFixed(0) : '0'}%
          </span>
        </div>
        
        {/* Add a bottom margin to progressStats if daysLeft was the only thing providing space before footer */}
        {(campaign.daysLeft === undefined || campaign.daysLeft < 0) && <div style={{ marginBottom: '0.75rem' }}></div>}
      </div>

      {/* Footer Section */}
      {(showViewDetailsButton || showAdminActions) && (
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
      )}
    </div>
  );
};