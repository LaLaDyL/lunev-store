const API_BASE = window.location.origin;
// header.js - обновленная версия для работы с бэкендом
document.addEventListener('DOMContentLoaded', async () => {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  const loginLink = nav.querySelector('.login-link');
  const loggedIn = localStorage.getItem('loggedIn') === 'true';
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  if (loggedIn && currentUser) {
    // Удаляем старую ссылку "Войти"
    if (loginLink) {
      loginLink.remove();
    }

    // Проверяем, не создано ли уже меню пользователя
    if (nav.querySelector('.user-menu')) {
      return;
    }

    // Создаем меню пользователя
    const userMenu = document.createElement('div');
    userMenu.className = 'user-menu';
    userMenu.style.position = 'relative';
    userMenu.style.display = 'inline-block';

    userMenu.innerHTML = `
      <a href="profile.html" class="user-profile-link" style="
        color: white;
        text-decoration: none;
        font-size: 16px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 20px;
        background: rgba(255,255,255,0.2);
        transition: background 0.3s;
      ">
        👤 ${currentUser.firstName || 'Профиль'}
      </a>
    `;

    // Добавляем меню пользователя в навигацию
    nav.appendChild(userMenu);

    // Добавляем hover эффект
    const profileLink = userMenu.querySelector('.user-profile-link');
    profileLink.addEventListener('mouseenter', () => {
      profileLink.style.background = 'rgba(255,255,255,0.3)';
    });
    profileLink.addEventListener('mouseleave', () => {
      profileLink.style.background = 'rgba(255,255,255,0.2)';
    });
  }
});