// src/components/AdminPanel.tsx

/// <reference types="vite/client" />

interface ImportMetaEnv {
  MODE: string
  BASE_URL: string
  PROD: boolean
  DEV: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
import React from 'react';
import { userStore, UserData } from '../services/UserStore';

const AdminPanel: React.FunctionComponent = () => {
  const [users, setUsers] = React.useState([] as UserData[]);
  const [isOpen, setIsOpen] = React.useState(false);

  const refreshUsers = React.useCallback(() => {
    setUsers(userStore.getAllUsers());
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      refreshUsers();
    }
  }, [isOpen, refreshUsers]);

  const clearAllUsers = React.useCallback(() => {
    if (window.confirm('Are you sure you want to clear all users?')) {
      users.forEach(user => userStore.removeUser(user.id));
      refreshUsers();
    }
  }, [users, refreshUsers]);

  const removeUser = React.useCallback((userId: string) => {
    if (window.confirm(`Remove user ${userId.substring(0, 8)}?`)) {
      userStore.removeUser(userId);
      refreshUsers();
    }
  }, [refreshUsers]);

 // Only show in development
if (import.meta.env.MODE !== 'development') {
  return null;
}

  return (
    <div className="admin-panel">
      <button 
        type="button"
        className="toggle-button"
        onClick={() => setIsOpen(prev => !prev)}
      >
        {isOpen ? 'Hide' : 'Show'} Admin Panel
      </button>
      
      {isOpen && (
        <div className="panel-content">
          <div className="panel-header">
            <h3>User Management</h3>
            <div className="panel-actions">
              <button 
                type="button"
                className="refresh-button"
                onClick={refreshUsers}
              >
                Refresh
              </button>
              <button 
                type="button"
                className="clear-button"
                onClick={clearAllUsers}
              >
                Clear All
              </button>
            </div>
          </div>
          
          <div className="users-list">
            {users.length === 0 ? (
              <div className="no-users">No verified users found</div>
            ) : (
              users.map(user => (
                <div key={user.id} className="user-item">
                  <div className="user-details">
                    <div className="user-id">ID: {user.id.substring(0, 8)}...</div>
                    <div className="user-level">
                      <span className={`level-badge ${user.verificationLevel.toLowerCase()}`}>
                        {user.verificationLevel}
                      </span>
                    </div>
                    <div className="user-verified-at">
                      Verified: {new Date(user.verifiedAt).toLocaleString()}
                    </div>
                  </div>
                  <button 
                    type="button"
                    className="remove-button"
                    onClick={() => removeUser(user.id)}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;