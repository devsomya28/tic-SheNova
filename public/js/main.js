// ── Flip cards ──
document.querySelectorAll('.flip-card').forEach(card => {
  card.addEventListener('click', () => card.classList.toggle('flipped'));
});

// ── Option cards (multi-select checkboxes) ──
document.querySelectorAll('.option-card').forEach(card => {
  const input = card.querySelector('input');
  if (!input) return;
  card.addEventListener('click', () => {
    if (input.type === 'checkbox') {
      input.checked = !input.checked;
      card.classList.toggle('selected', input.checked);
    } else if (input.type === 'radio') {
      document.querySelectorAll(`.option-card input[name="${input.name}"]`).forEach(r => {
        r.closest('.option-card').classList.remove('selected');
      });
      input.checked = true;
      card.classList.add('selected');
    }
  });
  // Init selected state
  if (input.checked) card.classList.add('selected');
});

// ── Range slider live value ──
document.querySelectorAll('input[type="range"]').forEach(range => {
  const display = document.querySelector(`[data-range="${range.id}"]`);
  if (!display) return;
  display.textContent = range.value;
  range.addEventListener('input', () => display.textContent = range.value);
});

// ── Onboarding multi-step ──
(function() {
  const form = document.getElementById('onboarding-form');
  if (!form) return;

  const sections = form.querySelectorAll('.onboarding-section');
  const dots = document.querySelectorAll('.step-dot');
  const prevBtn = document.getElementById('ob-prev');
  const nextBtn = document.getElementById('ob-next');
  const submitBtn = document.getElementById('ob-submit');
  const stepCounter = document.getElementById('step-counter');
  let current = 0;
  const total = sections.length;

  function showStep(n) {
    sections.forEach((s, i) => s.classList.toggle('active', i === n));
    dots.forEach((d, i) => d.classList.toggle('active', i <= n));
    if (prevBtn) prevBtn.style.display = n === 0 ? 'none' : 'inline-flex';
    if (nextBtn) nextBtn.style.display = n < total - 1 ? 'inline-flex' : 'none';
    if (submitBtn) submitBtn.style.display = n === total - 1 ? 'inline-flex' : 'none';
    if (stepCounter) stepCounter.textContent = `Step ${n + 1} of ${total}`;
  }

  showStep(0);

  if (nextBtn) nextBtn.addEventListener('click', () => {
    if (current < total - 1) { current++; showStep(current); window.scrollTo(0,0); }
  });
  if (prevBtn) prevBtn.addEventListener('click', () => {
    if (current > 0) { current--; showStep(current); }
  });
})();

// ── Water tracker ──
(function() {
  const glasses = document.querySelectorAll('.water-glass');
  glasses.forEach((g, i) => {
    g.addEventListener('click', async () => {
      const res = await fetch('/insights/nutrition/water', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        glasses.forEach((gl, j) => gl.classList.toggle('filled', j < data.waterGlasses));
      }
    });
  });
})();

// ── Mood buttons ──
document.querySelectorAll('.mood-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const group = btn.closest('.mood-grid');
    group.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const input = group.nextElementSibling;
    if (input && input.tagName === 'INPUT') input.value = btn.dataset.mood;
  });
});

// ── Fade-up on scroll ──
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.style.animationPlayState = 'running';
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-up').forEach(el => {
  el.style.animationPlayState = 'paused';
  observer.observe(el);
});

// ── Flash message auto-hide ──
setTimeout(() => {
  document.querySelectorAll('.alert').forEach(a => {
    a.style.transition = 'opacity 0.5s'; a.style.opacity = '0';
    setTimeout(() => a.remove(), 500);
  });
}, 4000);
