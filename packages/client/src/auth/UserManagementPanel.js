/**
 * UserManagementPanel.js
 * Admin panel for managing user accounts
 */

const ROLE_LABELS = {
  admin: 'Admin',
  student: 'Student'
};

/**
 * Render the user management panel as a full-page view inside a container.
 * @param {HTMLElement} container - The DOM element to render into
 * @param {ApiClient} apiClient - API client instance
 * @returns {Function} cleanup function to call when navigating away
 */
export function renderUsersPage(container, apiClient) {
  container.innerHTML = `
    <div class="page-panel admin-content">
      <header class="admin-header">
        <h2>User Management</h2>
        <div class="admin-stats" id="user-panel-stats">Loading...</div>
      </header>

      <div class="panel-actions" style="margin-bottom: var(--space-4);">
        <button id="create-user-btn" class="action-btn" style="background: var(--color-brand-500); color: white;">
          + Create User
        </button>
      </div>

      <div id="users-table-container">
        <div class="loading-cell">Loading users...</div>
      </div>
    </div>
  `;

  container.querySelector('#create-user-btn').addEventListener('click', () => {
    showCreateUserDialog(apiClient, () => renderUsers());
  });

  const tableContainer = container.querySelector('#users-table-container');
  const statsEl = container.querySelector('#user-panel-stats');

  async function renderUsers() {
    try {
      const users = await apiClient.getUsers();
      const students = await apiClient.getStudents();

      const adminCount = users.filter(u => u.role === 'admin').length;
      const studentCount = users.filter(u => u.role === 'student').length;

      statsEl.innerHTML = `
        <div class="stat-item">
          <span class="stat-value">${adminCount}</span>
          <span class="stat-label">Admins</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${studentCount}</span>
          <span class="stat-label">Student Accounts</span>
        </div>
      `;

      if (users.length === 0) {
        tableContainer.innerHTML = '<div class="empty-state"><p>No users found.</p></div>';
        return;
      }

      tableContainer.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Linked Student</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(user => `
              <tr>
                <td><strong>${escapeHtml(user.username)}</strong></td>
                <td><span class="role-badge role-${user.role}">${ROLE_LABELS[user.role] || user.role}</span></td>
                <td>${user.student_name ? escapeHtml(user.student_name) : '<span class="text-muted">-</span>'}</td>
                <td>${formatDate(user.created_at)}</td>
                <td>
                  <div class="action-btns">
                    <button class="edit-user-btn small-btn" data-user-id="${user.id}" title="Edit">Edit</button>
                    ${user.username !== 'admin' ? `
                      <button class="delete-user-btn small-btn danger-btn" data-user-id="${user.id}" data-username="${escapeHtml(user.username)}" title="Delete">Delete</button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      tableContainer.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const userId = btn.dataset.userId;
          const user = users.find(u => u.id === userId);
          if (user) {
            showEditUserDialog(apiClient, user, students, () => renderUsers());
          }
        });
      });

      tableContainer.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const userId = btn.dataset.userId;
          const username = btn.dataset.username;
          if (confirm(`Delete user "${username}"? This cannot be undone.`)) {
            try {
              await apiClient.deleteUser(userId);
              renderUsers();
            } catch (error) {
              alert(`Failed to delete user: ${error.message}`);
            }
          }
        });
      });
    } catch (error) {
      tableContainer.innerHTML = `<div class="error-message">Failed to load users: ${escapeHtml(error.message)}</div>`;
    }
  }

  renderUsers();

  // Return cleanup (sub-dialogs append to document.body and self-close)
  return () => {};
}

export function showUserManagementPanel(apiClient) {
  const overlay = document.createElement('div');
  overlay.className = 'admin-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  overlay.innerHTML = `
    <div class="admin-content">
      <button class="admin-close" aria-label="Close panel">&times;</button>

      <header class="admin-header">
        <h2>User Management</h2>
        <div class="admin-stats" id="user-panel-stats">Loading...</div>
      </header>

      <div class="panel-actions" style="margin-bottom: var(--space-4);">
        <button id="create-user-btn" class="action-btn" style="background: var(--color-brand-500); color: white;">
          + Create User
        </button>
      </div>

      <div id="users-table-container">
        <div class="loading-cell">Loading users...</div>
      </div>
    </div>
  `;

  const closePanel = () => {
    document.removeEventListener('keydown', handleKeyDown);
    if (overlay.parentNode) document.body.removeChild(overlay);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') closePanel();
  };

  document.addEventListener('keydown', handleKeyDown);
  overlay.querySelector('.admin-close').addEventListener('click', closePanel);

  overlay.querySelector('#create-user-btn').addEventListener('click', () => {
    showCreateUserDialog(apiClient, () => renderUsers());
  });

  const tableContainer = overlay.querySelector('#users-table-container');
  const statsEl = overlay.querySelector('#user-panel-stats');

  async function renderUsers() {
    try {
      const users = await apiClient.getUsers();
      const students = await apiClient.getStudents();

      const adminCount = users.filter(u => u.role === 'admin').length;
      const studentCount = users.filter(u => u.role === 'student').length;

      statsEl.innerHTML = `
        <div class="stat-item">
          <span class="stat-value">${adminCount}</span>
          <span class="stat-label">Admins</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${studentCount}</span>
          <span class="stat-label">Student Accounts</span>
        </div>
      `;

      if (users.length === 0) {
        tableContainer.innerHTML = '<div class="empty-state"><p>No users found.</p></div>';
        return;
      }

      tableContainer.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Linked Student</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(user => `
              <tr>
                <td><strong>${escapeHtml(user.username)}</strong></td>
                <td><span class="role-badge role-${user.role}">${ROLE_LABELS[user.role] || user.role}</span></td>
                <td>${user.student_name ? escapeHtml(user.student_name) : '<span class="text-muted">-</span>'}</td>
                <td>${formatDate(user.created_at)}</td>
                <td>
                  <div class="action-btns">
                    <button class="edit-user-btn small-btn" data-user-id="${user.id}" title="Edit">Edit</button>
                    ${user.username !== 'admin' ? `
                      <button class="delete-user-btn small-btn danger-btn" data-user-id="${user.id}" data-username="${escapeHtml(user.username)}" title="Delete">Delete</button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      tableContainer.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const userId = btn.dataset.userId;
          const user = users.find(u => u.id === userId);
          if (user) {
            showEditUserDialog(apiClient, user, students, () => renderUsers());
          }
        });
      });

      tableContainer.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const userId = btn.dataset.userId;
          const username = btn.dataset.username;
          if (confirm(`Delete user "${username}"? This cannot be undone.`)) {
            try {
              await apiClient.deleteUser(userId);
              renderUsers();
            } catch (error) {
              alert(`Failed to delete user: ${error.message}`);
            }
          }
        });
      });
    } catch (error) {
      tableContainer.innerHTML = `<div class="error-message">Failed to load users: ${escapeHtml(error.message)}</div>`;
    }
  }

  document.body.appendChild(overlay);
  renderUsers();
}

function showCreateUserDialog(apiClient, onSuccess) {
  const dialog = document.createElement('div');
  dialog.className = 'user-dialog-overlay';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'create-user-title');

  dialog.innerHTML = `
    <div class="user-dialog-card">
      <button class="user-dialog-close" aria-label="Close">&times;</button>
      <h3 id="create-user-title" class="user-dialog-title">Create User Account</h3>

      <form id="create-user-form" class="user-dialog-form" autocomplete="off">
        <div class="form-group">
          <label for="new-username">Username</label>
          <input type="text" id="new-username" placeholder="e.g. johndoe" autocomplete="off" required />
          <small>3-50 characters, letters, numbers, or underscores</small>
        </div>

        <div class="form-group">
          <label for="new-password">Password</label>
          <input type="password" id="new-password" placeholder="Enter a strong password" autocomplete="new-password" required />
          <small>Min 8 characters with uppercase, lowercase, and a number</small>
        </div>

        <div class="form-group">
          <label for="new-role">Role</label>
          <select id="new-role">
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div class="form-group" id="student-link-group">
          <label for="new-student-id">Link to Student Profile</label>
          <select id="new-student-id">
            <option value="">Loading students...</option>
          </select>
          <small>Optional - associate this account with a student record</small>
        </div>

        <div id="create-user-error" class="user-dialog-error" style="display: none;"></div>

        <div class="user-dialog-actions">
          <button type="button" id="cancel-create-user" class="user-dialog-btn user-dialog-btn-cancel">Cancel</button>
          <button type="submit" id="submit-create-user" class="user-dialog-btn user-dialog-btn-primary">Create User</button>
        </div>
      </form>
    </div>
  `;

  const closeDialog = () => {
    if (dialog.parentNode) document.body.removeChild(dialog);
  };

  dialog.querySelector('.user-dialog-close').addEventListener('click', closeDialog);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeDialog();
  });
  dialog.querySelector('#cancel-create-user').addEventListener('click', closeDialog);

  const roleSelect = dialog.querySelector('#new-role');
  const studentLinkGroup = dialog.querySelector('#student-link-group');

  roleSelect.addEventListener('change', () => {
    studentLinkGroup.style.display = roleSelect.value === 'student' ? '' : 'none';
  });

  loadStudentsForSelect(apiClient, dialog.querySelector('#new-student-id'));

  const errorEl = dialog.querySelector('#create-user-error');

  dialog.querySelector('#create-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';

    const username = dialog.querySelector('#new-username').value.trim();
    const password = dialog.querySelector('#new-password').value;
    const role = roleSelect.value;
    const studentId = dialog.querySelector('#new-student-id').value || null;

    if (!username || !password) {
      errorEl.textContent = 'Username and password are required';
      errorEl.style.display = 'block';
      return;
    }

    const submitBtn = dialog.querySelector('#submit-create-user');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    try {
      const data = { username, password, role };
      if (role === 'student' && studentId) {
        data.student_id = studentId;
      }

      await apiClient.createUser(data);
      closeDialog();
      onSuccess();
    } catch (error) {
      errorEl.textContent = error.message || 'Failed to create user';
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create User';
    }
  });

  document.body.appendChild(dialog);
  dialog.querySelector('#new-username').focus();
}

function showEditUserDialog(apiClient, user, students, onSuccess) {
  const dialog = document.createElement('div');
  dialog.className = 'user-dialog-overlay';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'edit-user-title');

  dialog.innerHTML = `
    <div class="user-dialog-card">
      <button class="user-dialog-close" aria-label="Close">&times;</button>
      <h3 id="edit-user-title" class="user-dialog-title">Edit User: ${escapeHtml(user.username)}</h3>

      <form id="edit-user-form" class="user-dialog-form" autocomplete="off">
        <div class="form-group">
          <label for="edit-username">Username</label>
          <input type="text" id="edit-username" value="${escapeHtml(user.username)}" autocomplete="off" />
        </div>

        <div class="form-group">
          <label for="edit-password">New Password</label>
          <input type="password" id="edit-password" placeholder="Leave empty to keep current" autocomplete="new-password" />
          <small>Leave empty to keep the current password</small>
        </div>

        <div class="form-group">
          <label for="edit-role">Role</label>
          <select id="edit-role">
            <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        </div>

        <div class="form-group" id="edit-student-link-group" style="display: ${user.role === 'student' ? '' : 'none'}">
          <label for="edit-student-id">Link to Student Profile</label>
          <select id="edit-student-id">
            <option value="">-- None --</option>
            ${students.map(s => `
              <option value="${s.id}" ${s.id === user.student_id ? 'selected' : ''}>
                ${escapeHtml(s.name)}
              </option>
            `).join('')}
          </select>
        </div>

        <div id="edit-user-error" class="user-dialog-error" style="display: none;"></div>

        <div class="user-dialog-actions">
          <button type="button" id="cancel-edit-user" class="user-dialog-btn user-dialog-btn-cancel">Cancel</button>
          <button type="submit" id="submit-edit-user" class="user-dialog-btn user-dialog-btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  `;

  const closeDialog = () => {
    if (dialog.parentNode) document.body.removeChild(dialog);
  };

  dialog.querySelector('.user-dialog-close').addEventListener('click', closeDialog);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeDialog();
  });
  dialog.querySelector('#cancel-edit-user').addEventListener('click', closeDialog);

  const roleSelect = dialog.querySelector('#edit-role');
  const studentLinkGroup = dialog.querySelector('#edit-student-link-group');

  roleSelect.addEventListener('change', () => {
    studentLinkGroup.style.display = roleSelect.value === 'student' ? '' : 'none';
  });

  const errorEl = dialog.querySelector('#edit-user-error');

  dialog.querySelector('#edit-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';

    const data = {};
    const username = dialog.querySelector('#edit-username').value.trim();
    const password = dialog.querySelector('#edit-password').value;
    const role = roleSelect.value;
    const studentId = dialog.querySelector('#edit-student-id').value || null;

    if (username !== user.username) data.username = username;
    if (password) data.password = password;
    if (role !== user.role) data.role = role;
    if (role === 'student') {
      data.student_id = studentId;
    } else {
      data.student_id = null;
    }

    if (Object.keys(data).length === 0) {
      closeDialog();
      return;
    }

    const submitBtn = dialog.querySelector('#submit-edit-user');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      await apiClient.updateUser(user.id, data);
      closeDialog();
      onSuccess();
    } catch (error) {
      errorEl.textContent = error.message || 'Failed to update user';
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';
    }
  });

  document.body.appendChild(dialog);
  dialog.querySelector('#edit-username').focus();
}

async function loadStudentsForSelect(apiClient, selectEl) {
  try {
    const students = await apiClient.getStudents();
    selectEl.innerHTML = '<option value="">-- Select Student --</option>';
    students.forEach(s => {
      const option = document.createElement('option');
      option.value = s.id;
      option.textContent = s.name;
      selectEl.appendChild(option);
    });
  } catch {
    selectEl.innerHTML = '<option value="">Failed to load students</option>';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
