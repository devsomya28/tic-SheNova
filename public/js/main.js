
document.querySelectorAll('.nav-links a').forEach(link => {
  if (link.href === window.location.href) {
    link.style.color = '#C2185B';
  }
});


document.querySelectorAll('input[type="date"]').forEach(input => {
  const today = new Date().toISOString().split('T')[0];
  input.max = today;
});


console.log("Frontend demo ready");
