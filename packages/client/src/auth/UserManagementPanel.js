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
      <div class="main-header main-header-row">
        <div>
          <h1 class="page-title">User Management</h1>
          <p class="page-subtitle">Manage user accounts and permissions</p>
        </div>
        <button id="create-user-btn" class="generate-btn">+ Create User</button>
      </div>

      <div class="admin-stats" id="user-panel-stats" style="display:flex;gap:12px;margin-bottom:16px"></div>

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
        <div class="gd-stat"><span class="gd-stat-label">Admins</span><span class="gd-stat-value">${adminCount}</span></div>
        <div class="gd-stat"><span class="gd-stat-label">Student Accounts</span><span class="gd-stat-value" style="color:var(--color-brand-600)">${studentCount}</span></div>
      `;

      if (users.length === 0) {
        tableContainer.innerHTML = '<div class="empty-message">No users found.</div>';
        return;
      }

      const roleBadge = (role) => {
        const cls = role === 'admin' ? 'badge-advanced' : 'badge-beginner';
        return `<span class="badge ${cls}">${ROLE_LABELS[role] || role}</span>`;
      };

      tableContainer.innerHTML = `
        <div class="ep-table-wrap">
          <table class="ep-table">
            <thead>
              <tr>
                <th class="ep-th-grow">User</th>
                <th style="width:90px">Role</th>
                <th style="width:140px">Linked Student</th>
                <th style="width:180px">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(user => `
                <tr data-user-id="${user.id}" data-username="${escapeHtml(user.username)}">
                  <td>
                    <div class="ep-cell-name">${escapeHtml(user.username)}</div>
                    <div class="ep-cell-muted" style="font-size:12px">${formatDate(user.created_at)}</div>
                  </td>
                  <td>${roleBadge(user.role)}</td>
                  <td>${user.student_name ? `<div class="ep-cell-muted" style="font-size:13px">${escapeHtml(user.student_name)}</div>` : '<div class="ep-cell-muted" style="font-size:12px">—</div>'}</td>
                  <td>
                    <div class="ep-actions">
                      <button class="btn-outline btn-sm" data-action="edit">Edit</button>
                      ${user.username !== 'admin' ? `
                        <button class="btn-outline btn-sm ep-more-btn" data-action="more" title="More actions">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      tableContainer.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const row = btn.closest('tr');
          const userId = row.dataset.userId;
          const username = row.dataset.username;
          const action = btn.dataset.action;

          if (action === 'edit') {
            const user = users.find(u => u.id === userId);
            if (user) showEditUserDialog(apiClient, user, students, () => renderUsers());
          } else if (action === 'more') {
            document.querySelectorAll('.gd-dropdown').forEach(d => d.remove());
            const dropdown = document.createElement('div');
            dropdown.className = 'gd-dropdown';
            dropdown.innerHTML = `
              <button class="gd-dd-item gd-dd-danger" data-dd="delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>Delete User</button>
            `;
            const rect = btn.getBoundingClientRect();
            dropdown.style.position = 'fixed';
            dropdown.style.top = `${rect.bottom + 4}px`;
            dropdown.style.right = `${window.innerWidth - rect.right}px`;
            document.body.appendChild(dropdown);
            const closeDd = () => { dropdown.remove(); document.removeEventListener('click', closeDd); };
            setTimeout(() => document.addEventListener('click', closeDd), 0);
            dropdown.querySelector('[data-dd="delete"]').addEventListener('click', (ev) => {
              ev.stopPropagation();
              dropdown.remove();
              if (confirm(`Delete user "${username}"? This cannot be undone.`)) {
                apiClient.deleteUser(userId).then(() => renderUsers()).catch(err => alert(err.message));
              }
            });
          }
        });
      });
    } catch (error) {
      tableContainer.innerHTML = `<div class="error-cell">Failed to load users: ${escapeHtml(error.message)}</div>`;
    }
  }

  renderUsers();
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
        <div class="admin-stats" id="user-panel-stats" style="display:flex;gap:12px"></div>
      </header>
      <div class="panel-actions" style="margin-bottom: var(--space-4);">
        <button id="create-user-btn" class="generate-btn">+ Create User</button>
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
        <div class="gd-stat"><span class="gd-stat-label">Admins</span><span class="gd-stat-value">${adminCount}</span></div>
        <div class="gd-stat"><span class="gd-stat-label">Student Accounts</span><span class="gd-stat-value" style="color:var(--color-brand-600)">${studentCount}</span></div>
      `;

      if (users.length === 0) {
        tableContainer.innerHTML = '<div class="empty-message">No users found.</div>';
        return;
      }

      const roleBadge = (role) => {
        const cls = role === 'admin' ? 'badge-advanced' : 'badge-beginner';
        return `<span class="badge ${cls}">${ROLE_LABELS[role] || role}</span>`;
      };

      tableContainer.innerHTML = `
        <div class="ep-table-wrap">
          <table class="ep-table">
            <thead>
              <tr>
                <th class="ep-th-grow">User</th>
                <th style="width:90px">Role</th>
                <th style="width:140px">Linked Student</th>
                <th style="width:180px">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(user => `
                <tr data-user-id="${user.id}" data-username="${escapeHtml(user.username)}">
                  <td>
                    <div class="ep-cell-name">${escapeHtml(user.username)}</div>
                    <div class="ep-cell-muted" style="font-size:12px">${formatDate(user.created_at)}</div>
                  </td>
                  <td>${roleBadge(user.role)}</td>
                  <td>${user.student_name ? `<div class="ep-cell-muted" style="font-size:13px">${escapeHtml(user.student_name)}</div>` : '<div class="ep-cell-muted" style="font-size:12px">—</div>'}</td>
                  <td>
                    <div class="ep-actions">
                      <button class="btn-outline btn-sm" data-action="edit">Edit</button>
                      ${user.username !== 'admin' ? `
                        <button class="btn-outline btn-sm ep-more-btn" data-action="more" title="More actions">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      tableContainer.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const row = btn.closest('tr');
          const userId = row.dataset.userId;
          const username = row.dataset.username;
          const action = btn.dataset.action;

          if (action === 'edit') {
            const user = users.find(u => u.id === userId);
            if (user) showEditUserDialog(apiClient, user, students, () => renderUsers());
          } else if (action === 'more') {
            document.querySelectorAll('.gd-dropdown').forEach(d => d.remove());
            const dropdown = document.createElement('div');
            dropdown.className = 'gd-dropdown';
            dropdown.innerHTML = `
              <button class="gd-dd-item gd-dd-danger" data-dd="delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>Delete User</button>
            `;
            const rect = btn.getBoundingClientRect();
            dropdown.style.position = 'fixed';
            dropdown.style.top = `${rect.bottom + 4}px`;
            dropdown.style.right = `${window.innerWidth - rect.right}px`;
            document.body.appendChild(dropdown);
            const closeDd = () => { dropdown.remove(); document.removeEventListener('click', closeDd); };
            setTimeout(() => document.addEventListener('click', closeDd), 0);
            dropdown.querySelector('[data-dd="delete"]').addEventListener('click', (ev) => {
              ev.stopPropagation();
              dropdown.remove();
              if (confirm(`Delete user "${username}"? This cannot be undone.`)) {
                apiClient.deleteUser(userId).then(() => renderUsers()).catch(err => alert(err.message));
              }
            });
          }
        });
      });
    } catch (error) {
      tableContainer.innerHTML = `<div class="error-cell">Failed to load users: ${escapeHtml(error.message)}</div>`;
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
          <div class="password-input-wrap">
            <input type="password" id="new-password" placeholder="Enter a strong password" autocomplete="new-password" required />
            <button type="button" class="password-toggle" data-target="new-password" title="Show password">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
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
          <button type="button" id="create-student-inline" class="btn-outline btn-sm" style="margin-top:8px">+ Create New Student</button>
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

  const studentSelect = dialog.querySelector('#new-student-id');
  loadStudentsForSelect(apiClient, studentSelect);

  // Create new student inline
  dialog.querySelector('#create-student-inline').addEventListener('click', async () => {
    const name = prompt('Enter student name:');
    if (!name || !name.trim()) return;
    try {
      const student = await apiClient.createStudent({ name: name.trim(), skill_level: 'beginner' });
      const option = document.createElement('option');
      option.value = student.id;
      option.textContent = student.name;
      option.selected = true;
      studentSelect.appendChild(option);
    } catch (err) {
      alert(`Failed to create student: ${err.message}`);
    }
  });

  // Password toggle
  setupPasswordToggles(dialog);

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
          <div class="password-input-wrap">
            <input type="password" id="edit-password" placeholder="Leave empty to keep current" autocomplete="new-password" />
            <button type="button" class="password-toggle" data-target="edit-password" title="Show password">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
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

  setupPasswordToggles(dialog);

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

/** Attach show/hide toggle to all .password-toggle buttons within a container */
function setupPasswordToggles(container) {
  container.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = container.querySelector(`#${btn.dataset.target}`);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.innerHTML = isPassword
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      btn.title = isPassword ? 'Hide password' : 'Show password';
    });
  });
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
