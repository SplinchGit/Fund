// src/components/AdminPanel.tsx





// # ############################################################################ #
// # #                         SECTION 3 - PROJECT IMPORTS                        #
// # ############################################################################ #
import React, { useState, useCallback } from 'react';
// Removed import for userStore and UserData as they are not used / implemented with backend

// # ############################################################################ #
// # #                 SECTION 4 - COMPONENT DEFINITION & STATE                  #
// # ############################################################################ #
const AdminPanel: React.FunctionComponent = () => {
  // State to manage if the panel is open or closed
  const [isOpen, setIsOpen] = useState(false);
  // Placeholder state for users - currently empty and not populated
  // const [users, setUsers] = useState<UserData[]>([]); // Keep if planning to fetch real data later
  const [isLoading, setIsLoading] = useState(false); // Example loading state
  const [error, setError] = useState<string | null>(null); // Example error state

// # ############################################################################ #
// # #                      SECTION 5 - USER ACTION CALLBACKS                     #
// # ############################################################################ #
  // Placeholder function for refreshing users - needs backend integration
  const refreshUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    console.log('[AdminPanel] Refresh Users clicked - Backend API call needed here.');
    // TODO: Implement API call to fetch users from the backend (e.g., GET /admin/users)
    // Example structure:
    // try {
    //   // const fetchedUsers = await adminService.getUsers(); // Assuming an adminService exists
    //   // setUsers(fetchedUsers);
    // } catch (err: any) {
    //   setError(err.message || 'Failed to fetch users');
    // } finally {
    //   setIsLoading(false);
    // }
    setIsLoading(false); // Remove this line once API call is implemented
    
  }, []);

  // Placeholder function for clearing users - needs backend integration
  const clearAllUsers = useCallback(async () => {
    if (window.confirm('Are you sure you want to clear all users? This requires backend implementation.')) {
      console.log('[AdminPanel] Clear All Users clicked - Backend API call needed here.');
      // TODO: Implement API call to delete all users (e.g., DELETE /admin/users)
      // await adminService.deleteAllUsers();
      // refreshUsers(); // Refresh after clearing
      
    }
  }, []); // Removed dependency on local 'users' state

  // Placeholder function for removing a single user - needs backend integration
  const removeUser = useCallback(async (userId: string) => {
    // Note: User ID here should likely be the walletAddress from DynamoDB
    if (window.confirm(`Remove user ${userId.substring(0, 8)}...? This requires backend implementation.`)) {
      console.log(`[AdminPanel] Remove User ${userId} clicked - Backend API call needed here.`);
      // TODO: Implement API call to delete a specific user (e.g., DELETE /admin/users/${userId})
      // await adminService.deleteUser(userId);
      // refreshUsers(); // Refresh after removing
      
    }
  }, []); // Removed dependency on refreshUsers for now

// # ############################################################################ #
// # #                     SECTION 6 - DEVELOPMENT MODE GUARD                     #
// # ############################################################################ #
  // Only render the panel in development mode
  if (import.meta.env.MODE !== 'development') {
    return null;
  }

// # ############################################################################ #
// # #                   SECTION 7 - COMPONENT RENDERING (JSX)                  #
// # ############################################################################ #
  // Render the Admin Panel UI
  return (
    <div style={styles.adminPanel}>
      <button
        type="button"
        style={styles.toggleButton}
        onClick={() => setIsOpen(prev => !prev)}
      >
        {isOpen ? 'Hide' : 'Show'} Admin Panel
      </button>

      {isOpen && (
        <div style={styles.panelContent}>
          <div style={styles.panelHeader}>
            <h3>User Management (Placeholder)</h3>
            <div style={styles.panelActions}>
              <button
                type="button"
                style={styles.actionButton}
                onClick={refreshUsers}
                disabled={isLoading} // Disable button while loading
              >
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                type="button"
                style={{ ...styles.actionButton, ...styles.clearButton }} // Example of combining styles
                onClick={clearAllUsers}
                disabled={isLoading} // Disable button while loading
              >
                Clear All
              </button>
            </div>
          </div>

          {error && <div style={styles.errorText}>Error: {error}</div>}

          <div style={styles.usersList}>
            {/* Replace user list with placeholder text */}
            <div style={styles.placeholderText}>
              User list display requires backend integration.
              {/* Example of how list might look later: */}
              {/* {users.length === 0 && !isLoading ? (
                <div>No users found.</div>
              ) : (
                users.map(user => (
                  <div key={user.walletAddress} style={styles.userItem}>
                    <span>ID: {user.walletAddress.substring(0, 8)}...</span>
                    <button onClick={() => removeUser(user.walletAddress)}>Remove</button>
                  </div>
                ))
              )} */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// # ############################################################################ #
// # #                      SECTION 8 - INLINE STYLES OBJECT                      #
// # ############################################################################ #
// Basic inline styles for demonstration - consider moving to CSS modules or Tailwind
const styles: { [key: string]: React.CSSProperties } = {
  adminPanel: {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    zIndex: 1000,
    backgroundColor: 'rgba(240, 240, 240, 0.9)',
    border: '1px solid #ccc',
    borderRadius: '5px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    maxWidth: '400px',
  },
  toggleButton: {
    padding: '5px 10px',
    border: 'none',
    borderBottom: '1px solid #ccc',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    backgroundColor: '#eee',
    borderTopLeftRadius: '5px',
    borderTopRightRadius: '5px',
  },
  panelContent: {
    padding: '10px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    borderBottom: '1px solid #ddd',
    paddingBottom: '5px',
  },
  panelActions: {
    display: 'flex',
    gap: '5px',
  },
  actionButton: {
    padding: '3px 8px',
    fontSize: '0.8em',
    cursor: 'pointer',
    border: '1px solid #ccc',
    borderRadius: '3px',
  },
  clearButton: {
    backgroundColor: '#fdd',
    borderColor: '#f99',
  },
  usersList: {
    marginTop: '10px',
  },
  placeholderText: {
    color: '#666',
    fontStyle: 'italic',
  },
  errorText: {
    color: 'red',
    fontSize: '0.9em',
    marginBottom: '10px',
  },
  // Add styles for userItem, userDetails etc. if implementing the list later
};

// # ############################################################################ #
// # #                         SECTION 9 - DEFAULT EXPORT                         #
// # ############################################################################ #
export default AdminPanel;