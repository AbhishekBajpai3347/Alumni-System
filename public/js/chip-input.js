/**
 * Progressive-enhancement chip input.
 *
 * Turns <input type="text" data-chip-input data-suggestions='["A","B"]' ...>
 * into a click-to-toggle chip UI (per UI/UX spec 5.3 "Multi-select Chips").
 * The original input is kept in the DOM (visually hidden) and its value is
 * always the same comma-separated string the backend already expects — so
 * no server-side code needs to change.
 * If JS fails to load, the plain text input still works exactly as before.
 */
(function () {
  function parseList(value) {
    return (value || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function initChipInput(input) {
    const suggestions = (() => {
      try {
        return JSON.parse(input.getAttribute('data-suggestions') || '[]');
      } catch (e) {
        return [];
      }
    })();

    const selected = new Set(parseList(input.value));

    const wrapper = document.createElement('div');
    wrapper.className = 'chip-input-wrapper';

    const chipRow = document.createElement('div');
    chipRow.className = 'mb-2';

    const freeText = document.createElement('input');
    freeText.type = 'text';
    freeText.className = 'form-control';
    freeText.placeholder = input.getAttribute('data-placeholder') || 'Type and press Enter to add...';

    input.style.display = 'none';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(chipRow);
    wrapper.appendChild(freeText);
    wrapper.appendChild(input);

    function sync() {
      input.value = Array.from(selected).join(', ');
      render();
    }

    function render() {
      chipRow.innerHTML = '';
      const allOptions = new Set([...suggestions, ...selected]);
      allOptions.forEach((opt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip-toggle' + (selected.has(opt) ? ' selected' : '');
        btn.textContent = opt;
        if (selected.has(opt)) {
          const remove = document.createElement('span');
          remove.className = 'chip-remove';
          remove.textContent = '✕';
          btn.appendChild(remove);
        }
        btn.addEventListener('click', () => {
          if (selected.has(opt)) selected.delete(opt);
          else selected.add(opt);
          sync();
        });
        chipRow.appendChild(btn);
      });
    }

    freeText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = freeText.value.trim();
        if (val) {
          selected.add(val);
          freeText.value = '';
          sync();
        }
      }
    });

    render();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-chip-input]').forEach(initChipInput);
  });
})();
