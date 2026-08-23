document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('aiSearchBtn');
  const textarea = document.getElementById('aiQuery');
  const loading = document.getElementById('aiLoading');
  const errorBox = document.getElementById('aiError');
  const resultsBox = document.getElementById('aiResults');
  const emptyBox = document.getElementById('aiEmpty');
  const structuredBox = document.getElementById('aiStructured');
  const structuredContent = document.getElementById('aiStructuredContent');

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

  function renderResults(results) {
    if (!results || results.length === 0) {
      emptyBox.style.display = 'block';
      return;
    }
    resultsBox.innerHTML = results
      .map((a) => `
        <div class="col-md-6">
          <a href="/alumni/${a.id}" class="text-decoration-none text-dark">
            <div class="card card-alumni h-100 p-3">
              <div class="d-flex justify-content-between align-items-start">
                <div class="fw-bold">${escapeHtml(a.name)}</div>
                <span class="badge bg-primary match-score-badge">${a.match_score}% match</span>
              </div>
              <div class="small text-muted">${escapeHtml(a.job_role || 'N/A')} at ${escapeHtml(a.company_name || 'N/A')}</div>
              <div class="small text-muted mb-1">🎓 Class of ${a.graduation_year || 'N/A'} · 📍 ${escapeHtml(a.location || 'N/A')}</div>
              <div class="mb-2">${(a.skills || []).slice(0, 5).map((s) => `<span class="badge bg-light text-dark border me-1">${escapeHtml(s)}</span>`).join('')}</div>
              <div class="small fst-italic text-secondary">"${escapeHtml(a.why_matched || '')}"</div>
            </div>
          </a>
        </div>
      `)
      .join('');
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
      loading.style.display = 'none';
      btn.disabled = false;
    }
  }

  btn.addEventListener('click', runSearch);
});
