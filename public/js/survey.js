/**
 * Progressive enhancement for the alumni survey (views/alumni/survey.ejs).
 * Without JS: every section is visible and the form works exactly as before
 * (single scroll, single submit). With JS: sections are paginated with a
 * progress bar and Previous/Next controls. The <form> itself, its action,
 * and every field's name/value are untouched — this only changes what's
 * visually shown at a given moment, so the POST body sent to the server is
 * identical either way.
 */
document.addEventListener('DOMContentLoaded', () => {
  const sections = Array.from(document.querySelectorAll('.survey-section'));
  if (sections.length === 0) return;

  const progressFill = document.getElementById('surveyProgressFill');
  const progressLabel = document.getElementById('surveyProgressLabel');
  const prevBtn = document.getElementById('surveyPrevBtn');
  const nextBtn = document.getElementById('surveyNextBtn');
  const submitBtn = document.getElementById('surveySubmitBtn');

  let current = 0;

  function show(index) {
    sections.forEach((sec, i) => {
      sec.style.display = i === index ? 'block' : 'none';
    });
    current = index;
    progressFill.style.width = `${((index + 1) / sections.length) * 100}%`;
    progressLabel.textContent = `Section ${index + 1} of ${sections.length} — ${sections[index].getAttribute('data-section-name')}`;
    prevBtn.disabled = index === 0;
    const isLast = index === sections.length - 1;
    nextBtn.style.display = isLast ? 'none' : 'inline-block';
    submitBtn.style.display = isLast ? 'inline-block' : 'none';
    window.scrollTo({ top: document.querySelector('.survey-progress-wrap').offsetTop, behavior: 'smooth' });
  }

  prevBtn.addEventListener('click', () => { if (current > 0) show(current - 1); });
  nextBtn.addEventListener('click', () => { if (current < sections.length - 1) show(current + 1); });

  show(0);

  // Highlight selected checkboxes/radios (multi-select "blue fill" spec)
  document.querySelectorAll('.option-check-wrap input').forEach((input) => {
    input.addEventListener('change', () => {
        document.querySelectorAll(`input[name="${input.name}"]`).forEach((radio) => {
            const wrap = radio.closest('.option-check-wrap');
            if (wrap) {
                wrap.classList.toggle('selected', radio.checked);
            }
        });
    });
});

// Initial state
document.querySelectorAll('.option-check-wrap input').forEach((input) => {
    const wrap = input.closest('.option-check-wrap');
    if (wrap) {
        wrap.classList.toggle('selected', input.checked);
    }
});


  // 500-char counters on open-ended textareas
  document.querySelectorAll('textarea[data-charcount]').forEach((ta) => {
    const counter = document.getElementById(ta.getAttribute('data-charcount'));
    const update = () => { counter.textContent = `${ta.value.length}/500`; };
    ta.addEventListener('input', update);
    update();
  });
});
