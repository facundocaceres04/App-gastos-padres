// Aplica el tema antes de pintar para evitar un destello claro en modo oscuro.
// Es un archivo aparte (no un <script> inline) para que la CSP no tenga que permitir scripts inline.
try {
  var t = localStorage.getItem('cuentas-claras:tema');
  if (t === 'oscuro' || (t !== 'claro' && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#15130F');
  }
} catch (e) {}
