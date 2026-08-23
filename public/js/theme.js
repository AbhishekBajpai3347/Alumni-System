/**
 * Dark mode toggle.
 * The initial theme (before this file even loads) is applied by an inline
 * script in views/partials/head.ejs to avoid a flash of the wrong theme.
 * This file just wires up the toggle button click + keeps localStorage in sync.
 */
(function () {
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;

    btn.setAttribute('aria-pressed', currentTheme() === 'dark' ? 'true' : 'false');

    btn.addEventListener('click', function () {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem('theme', next);
      } catch (e) {
        // localStorage unavailable (private mode etc.) — theme just won't persist.
      }
    });
  });
})();
