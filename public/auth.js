const API = 'http://localhost:3000/api';


function showMessage(msg, type = 'error') {
  const el = document.getElementById('authMessage');
  el.textContent = msg;
  el.className = `auth-message ${type}`;
}

function setLoading(loading) {
  const btn = document.getElementById('loginBtn') || document.getElementById('registerBtn');
  const loader = document.getElementById('btnLoader');
  const text = btn.querySelector('.btn-text');
  const icon = btn.querySelector('.fa-arrow-right');
  if (loading) {
    btn.disabled = true;
    loader.style.display = 'inline';
    icon.style.display = 'none';
  } else {
    btn.disabled = false;
    loader.style.display = 'none';
    icon.style.display = 'inline';
  }
}

function setFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearErrors() {
  document.querySelectorAll('.field-error').forEach(e => e.textContent = '');
  document.querySelectorAll('.input-wrap input').forEach(i => {
    i.classList.remove('error-input', 'valid-input');
  });
}
function markError(inputId, errorId, msg) {
  const input = document.getElementById(inputId);
  if (input) input.classList.add('error-input');
  setFieldError(errorId, msg);
}
function markValid(inputId) {
  const input = document.getElementById(inputId);
  if (input) { input.classList.remove('error-input'); input.classList.add('valid-input'); }
}

/* ─── PASSWORD TOGGLE ───────────────────────────── */
function initPasswordToggle(btnId, inputId) {
  const btn = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.innerHTML = `<i class="fa fa-eye${isPass ? '-slash' : ''}"></i>`;
  });
}

/* ─── PASSWORD STRENGTH ─────────────────────────── */
function checkStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

function updateStrengthBar(pwd) {
  const fill = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');
  if (!fill || !label) return;
  const score = checkStrength(pwd);
  const data = [
    { w: '0%',   bg: '', text: '' },
    { w: '25%',  bg: '#e05555', text: 'Weak' },
    { w: '50%',  bg: '#f0a830', text: 'Fair' },
    { w: '75%',  bg: '#c9a84c', text: 'Good' },
    { w: '100%', bg: '#4caf7d', text: 'Strong' },
  ];
  fill.style.width = data[score].w;
  fill.style.background = data[score].bg;
  label.textContent = pwd.length ? data[score].text : '';
}

/* ─── LOGIN FORM ────────────────────────────────── */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  initPasswordToggle('togglePass', 'password');

  // Check if already logged in
  if (localStorage.getItem('luminary_token')) {
    window.location.href = 'index.html';
  }

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    clearErrors();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    let valid = true;

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      markError('email', 'emailError', 'Please enter a valid email address.');
      valid = false;
    } else markValid('email');

    if (!password || password.length < 6) {
      markError('password', 'passwordError', 'Password must be at least 6 characters.');
      valid = false;
    } else markValid('password');

    if (!valid) return;
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('luminary_token', data.token);
      localStorage.setItem('luminary_user', JSON.stringify(data.user));

      // Sync server cart to local cart
      if (data.cart && data.cart.length) {
        const merged = mergeCart(JSON.parse(localStorage.getItem('luminary_cart') || '[]'), data.cart);
        localStorage.setItem('luminary_cart', JSON.stringify(merged));
      }

      showMessage('Login successful! Redirecting…', 'success');
      setTimeout(() => window.location.href = 'index.html', 1000);
    } catch (err) {
      showMessage(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  });

  // Demo quick login
  document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', () => showMessage('Social login coming soon!', 'success'));
  });
}

function mergeCart(local, server) {
  const map = {};
  [...local, ...server].forEach(item => {
    if (map[item.id]) map[item.id].qty = Math.max(map[item.id].qty, item.qty);
    else map[item.id] = { ...item };
  });
  return Object.values(map);
}

/* ─── REGISTER FORM ─────────────────────────────── */
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  initPasswordToggle('togglePass', 'password');
  initPasswordToggle('toggleConfirm', 'confirmPassword');

  if (localStorage.getItem('luminary_token')) {
    window.location.href = 'index.html';
  }

  document.getElementById('password').addEventListener('input', e => {
    updateStrengthBar(e.target.value);
  });

  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    clearErrors();
    let valid = true;

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms').checked;
    const newsletter = document.getElementById('newsletter').checked;

    if (!firstName || firstName.length < 2) {
      markError('firstName', 'firstNameError', 'First name must be at least 2 characters.'); valid = false;
    } else markValid('firstName');

    if (!lastName || lastName.length < 2) {
      markError('lastName', 'lastNameError', 'Last name must be at least 2 characters.'); valid = false;
    } else markValid('lastName');

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      markError('email', 'emailError', 'Please enter a valid email address.'); valid = false;
    } else markValid('email');

    if (phone && !/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(phone.replace(/\s/g,''))) {
      markError('phone', 'phoneError', 'Please enter a valid phone number.'); valid = false;
    }

    if (!password || password.length < 8) {
      markError('password', 'passwordError', 'Password must be at least 8 characters.'); valid = false;
    } else if (checkStrength(password) < 2) {
      markError('password', 'passwordError', 'Password is too weak. Add uppercase, numbers, or symbols.'); valid = false;
    } else markValid('password');

    if (password !== confirmPassword) {
      markError('confirmPassword', 'confirmError', 'Passwords do not match.'); valid = false;
    } else if (confirmPassword) markValid('confirmPassword');

    if (!terms) {
      setFieldError('termsError', 'You must agree to the Terms of Service.'); valid = false;
    }

    if (!valid) return;
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, email, phone, password, newsletter })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      localStorage.setItem('luminary_token', data.token);
      localStorage.setItem('luminary_user', JSON.stringify(data.user));

      showMessage('Account created! Redirecting to shop…', 'success');
      setTimeout(() => window.location.href = 'index.html', 1200);
    } catch (err) {
      showMessage(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  });
}