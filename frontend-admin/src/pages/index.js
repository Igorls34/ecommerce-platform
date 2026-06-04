document.addEventListener('DOMContentLoaded', () => {
  const existingToken = localStorage.getItem('adminToken');
  const loginForm = document.getElementById('loginForm');

  if (existingToken) {
    window.location.href = 'dashboard.html';
    return;
  }

  if (!loginForm) {
    return;
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('http://localhost:3333/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('adminToken', data.token);
        window.location.href = 'dashboard.html';
        return;
      }

      showLegacyAdminNotice(data.error || data.message || 'Erro ao fazer login.');
    } catch (error) {
      console.error(error);
      showLegacyAdminNotice('Nao foi possivel conectar a API.');
    }
  });
});

function showLegacyAdminNotice(message) {
  const dialog = document.createElement('dialog');
  const text = document.createElement('p');
  const button = document.createElement('button');

  dialog.className = 'admin-confirm-modal';
  text.textContent = message;
  button.type = 'button';
  button.className = 'button button-primary';
  button.textContent = 'Ok';

  dialog.append(text, button);
  document.body.appendChild(dialog);
  button.addEventListener('click', () => {
    dialog.close();
    dialog.remove();
  });
  dialog.showModal();
}
