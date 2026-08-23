document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('aiSearchBtn');
  const textarea = document.getElementById('aiQuery');
  const loading = document.getElementById('aiLoading');
  const loadingMessage = document.getElementById('aiLoadingMessage');
  const errorBox = document.getElementById('aiError');
  const resultsBox = document.getElementById('aiResults');
  const emptyBox = document.getElementById('aiEmpty');
  const structuredBox = document.getElementById('aiStructured');
  const structuredContent = document.getElementById('aiStructuredContent');

  // Rotating loading messages (UI/UX spec 6: "Loading — AI Finder")
  const LOADING_MESSAGES = ['Analysing query…', 'Searching alumni network…', 'Ranking results…'];
  let loadingInterval = null;

  function startLoadingMessages() {
    let i = 0;
    loadingMessage.textContent = LOADING_MESSAGES[0];
    loadingInterval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      loadingMessage.textContent = LOADING_MESSAGES[i];
    }, 1400);
  }
  function stopLoadingMessages() {
    if (loadingInterval) clearInterval(loadingInterval);
    loadingInterval = null;
  }

  function resetUI() {
    errorBox.style.display = 'none';
    emptyBox.style.display = 'none';
    structuredBox.style.display = 'none';
    resultsBox.innerHTML = '';
  }

  function renderStructured(structured) {
    const parts = [];
    if (structured.interests && structured.interests.length) parts.push(`<strong>Interests:</strong> ${structured.interests.join(', ')}`);
    if (structured.job_roles && structured.job_roles.length) parts.push(`<strong>Job roles:</strong> ${structured.job_roles.join(', ')}`);
    if (structured.skills && structured.skills.length) parts.push(`<strong>Skills:</strong> ${structured.skills.join(', ')}`);
    if (structured.location && structured.location.length) parts.push(`<strong>Location:</strong> ${structured.location.join(', ')}`);
    if (structured.graduation_year) parts.push(`<strong>Graduation year:</strong> ${structured.graduation_year}`);
    if (structured.branch) parts.push(`<strong>Branch:</strong> ${structured.branch}`);
    if (structured.other_requirements && structured.other_requirements.length) parts.push(`<strong>Other:</strong> ${structured.other_requirements.join(', ')}`);

    if (parts.length === 0) {
      structuredBox.style.display = 'none';
      return;
    }
    structuredContent.innerHTML = parts.join(' &nbsp;·&nbsp; ');
    structuredBox.style.display = 'block';
  }

  // Match score badge colour-coding (component spec 5.2)
  function matchBadge(score) {
    let cls = 'partial';
    let label = 'Partial Match';
    if (score >= 80) { cls = 'strong'; label = 'Strong Match'; }
    else if (score >= 50) { cls = 'good'; label = 'Good Match'; }
    return `<span class="match-badge ${cls}" title="${label}">${score}%</span>`;
  }

  function renderResults(results) {
    if (!results || results.length === 0) {
      emptyBox.style.display = 'block';
      return;
    }
    resultsBox.innerHTML = results
      .map((a, idx) => `
        <div class="col-md-6">
          <div class="card card-alumni h-100 p-3">
            <a href="/alumni/${a.id}" class="text-decoration-none text-reset">
              <div class="d-flex justify-content-between align-items-start">
                <div class="d-flex align-items-center gap-2 mb-2">
                  <span class="avatar-circle">${escapeHtml((a.name || '?').charAt(0))}</span>
                  <div>
                    <div class="fw-bold" style="color: var(--text-heading);">${escapeHtml(a.name)}</div>
                    <div class="small text-muted">${escapeHtml(a.job_role || 'N/A')}</div>
                  </div>
                </div>
                ${matchBadge(a.match_score)}
              </div>
              <div class="small mb-1" style="color: var(--accent-primary); font-weight:600;">${escapeHtml(a.company_name || 'N/A')}</div>
              <div class="small text-muted mb-2">🎓 Class of ${a.graduation_year || 'N/A'} · 📍 ${escapeHtml(a.location || 'N/A')}</div>
              <div class="mb-2">${(a.skills || []).slice(0, 5).map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join('')}</div>
            </a>
            <button type="button" class="why-matched-toggle" data-target="why-${idx}">Why matched? ▾</button>
            <div class="why-matched-text" id="why-${idx}">"${escapeHtml(a.why_matched || '')}"</div>
          </div>
        </div>
      `)
      .join('');

    resultsBox.querySelectorAll('.why-matched-toggle').forEach((toggleBtn) => {
      toggleBtn.addEventListener('click', () => {
        const target = document.getElementById(toggleBtn.getAttribute('data-target'));
        const expanded = target.classList.toggle('expanded');
        toggleBtn.textContent = expanded ? 'Why matched? ▴' : 'Why matched? ▾';
      });
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  async function runSearch() {
    const query = textarea.value.trim();
    if (!query) {
      errorBox.textContent = 'Please describe what kind of alumnus you are looking for.';
      errorBox.style.display = 'block';
      return;
    }

    resetUI();
    loading.style.display = 'block';
    startLoadingMessages();
    btn.disabled = true;

    try {
      const res = await fetch('/ai/finder/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();

      if (!res.ok) {
        errorBox.textContent = data.error || 'Something went wrong. Please try again.';
        errorBox.style.display = 'block';
        if (data.structured) renderStructured(data.structured);
        return;
      }

      renderStructured(data.structured);
      renderResults(data.results);
    } catch (err) {
      errorBox.textContent = 'Network error. Please check your connection and try again.';
      errorBox.style.display = 'block';
    } finally {
      stopLoadingMessages();
      loading.style.display = 'none';
      btn.disabled = false;
    }
  }

  btn.addEventListener('click', runSearch);
});
