// src/components/BadgesDisplay.tsx

import React from 'react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // URL or SVG path for the badge icon
  earned: boolean; // Whether the user has earned this badge
}

interface BadgesDisplayProps {
  // In a real application, this would likely come from a user object fetched from the backend
  userBadges?: Badge[];
}

const defaultBadges: Badge[] = [
  {
    id: 'first_campaign',
    name: 'First Campaigner',
    description: 'Created your first campaign.',
    icon: '/assets/badge-campaign.svg', // Placeholder icon
    earned: true, // Mock data
  },
  {
    id: 'first_donation',
    name: 'First Donor',
    description: 'Made your first donation.',
    icon: '/assets/badge-donation.svg', // Placeholder icon
    earned: true, // Mock data
  },
  {
    id: 'community_builder',
    name: 'Community Builder',
    description: 'Reached 100 WLD raised across all campaigns.',
    icon: '/assets/badge-community.svg', // Placeholder icon
    earned: false, // Mock data
  },
  {
    id: 'top_donor',
    name: 'Top Donor',
    description: 'Donated over 500 WLD.',
    icon: '/assets/badge-top-donor.svg', // Placeholder icon
    earned: false, // Mock data
  },
];

const styles: { [key: string]: React.CSSProperties } = {
  badgesContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    marginBottom: '1.5rem',
  },
  badgeItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    padding: '0.5rem',
    borderRadius: '8px',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    border: '1px solid #e0e0e0',
  },
  badgeIcon: {
    width: '48px',
    height: '48px',
    marginBottom: '0.5rem',
    filter: 'grayscale(100%)', // Grey out unearned badges
    opacity: 0.6,
  },
  badgeIconEarned: {
    filter: 'grayscale(0%)',
    opacity: 1,
  },
  badgeName: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '0.25rem',
  },
  badgeDescription: {
    fontSize: '0.7rem',
    color: '#5f6368',
  },
  badgeEarnedText: {
    fontSize: '0.7rem',
    fontWeight: 500,
    color: '#34a853',
    marginTop: '0.5rem',
  },
  badgeLockedText: {
    fontSize: '0.7rem',
    fontWeight: 500,
    color: '#ea4335',
    marginTop: '0.5rem',
  },
};

const BadgesDisplay: React.FC<BadgesDisplayProps> = ({ userBadges }) => {
  const badgesToDisplay = userBadges || defaultBadges;

  return (
    <div style={styles.badgesContainer}>
      {badgesToDisplay.map((badge) => (
        <div key={badge.id} style={styles.badgeItem}>
          <img 
            src={badge.icon} 
            alt={badge.name} 
            style={{ ...styles.badgeIcon, ...(badge.earned ? styles.badgeIconEarned : {}) }}
          />
          <div style={styles.badgeName}>{badge.name}</div>
          <div style={styles.badgeDescription}>{badge.description}</div>
          {badge.earned ? (
            <div style={styles.badgeEarnedText}>Earned!</div>
          ) : (
            <div style={styles.badgeLockedText}>Locked</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default BadgesDisplay;
