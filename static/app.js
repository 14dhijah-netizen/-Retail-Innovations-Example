/* ============================================================
   RETAIL INNOVATIONS LTD — Application Logic
   Auth + Role-based CRUD via Supabase
   ============================================================ */

// ─── Supabase Config ────────────────────────────────────────
const SUPABASE_URL = 'https://iljoyzhetdewtgmoksps.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsam95emhldGRld3RnbW9rc3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjY0NTEsImV4cCI6MjA4NjkwMjQ1MX0.fAAEBVPUKQFrZiS73djm6h9XP9wydl3ZAy5alx5xf0M';

// ─── Admin Email ─────────────────────────────────────────────
const ADMIN_EMAIL = 'dhillonjsd14@gmail.com';

// ─── State ──────────────────────────────────────────────────
let supabaseClient = null;
let currentUser = null;   // Supabase auth user
let currentProfile = null; // user_profiles row
let isAdmin = false;

let productsCache = [];
let customersCache = [];
let ordersCache = [];
let rewardsCache = [];
let cartItems = [];

let authMode = 'login'; // 'login' | 'register'

// ─── Category Icons (for product cards) ─────────────────────
const categoryIcons = {
    'CPUs': '🔲', 'GPUs': '🎮', 'RAM': '💾', 'Motherboards': '🖥️',
    'SSDs': '💿', 'PSUs': '⚡', 'Cases': '🏗️', 'Monitors': '🖥️',
    'Keyboards': '⌨️', 'Mice': '🖱️'
};

// ─── Boot ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();

    // Try to initialise Supabase
    try {
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            document.getElementById('authStatusDot').classList.add('connected');
            document.getElementById('authStatusText').textContent = 'Connected to Supabase';
            console.log('Supabase connected.');

            // Check for existing session
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) {
                currentUser = session.user;
                await loadUserProfile();
                enterApp();
                return;
            }
        } else {
            console.warn('Supabase JS not loaded, using localStorage.');
        }
    } catch (e) {
        console.warn('Supabase init failed, using localStorage:', e);
    }

    // Fallback to local session
    if (!currentUser) loadLocalSession();
});

// ============================================================
// LOCAL SESSION + STORAGE (no Supabase)
// ============================================================
function readStore(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } }
function writeStore(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function generateId(prefix = 'id') { return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`; }

// ============================================================
// SEED PC PARTS DATA
// ============================================================
function seedProducts() {
    const existing = readStore('ri_products');
    if (existing.length > 0) return;
    const now = new Date().toISOString();
    const seed = [
        { id: 'p_seed01', name: 'AMD Ryzen 7 7800X3D', sku: 'CPU-001', category: 'CPUs', price: 339.99, stock_quantity: 25, description: '8-core, 16-thread processor with 3D V-Cache for ultimate gaming performance.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed02', name: 'Intel Core i7-14700K', sku: 'CPU-002', category: 'CPUs', price: 379.99, stock_quantity: 18, description: '20 cores (8P+12E), up to 5.6 GHz. Unlocked for overclocking.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed03', name: 'NVIDIA RTX 4070 Ti Super', sku: 'GPU-001', category: 'GPUs', price: 749.99, stock_quantity: 12, description: '16GB GDDR6X, ray tracing & DLSS 3 for high-end 1440p gaming.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed04', name: 'AMD Radeon RX 7800 XT', sku: 'GPU-002', category: 'GPUs', price: 479.99, stock_quantity: 15, description: '16GB GDDR6, excellent 1440p performance at a great value.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed05', name: 'Corsair Vengeance 32GB DDR5-6000', sku: 'RAM-001', category: 'RAM', price: 94.99, stock_quantity: 40, description: '2x16GB kit, DDR5-6000, CL36, Intel XMP 3.0 & AMD EXPO ready.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed06', name: 'G.Skill Trident Z5 32GB DDR5-6400', sku: 'RAM-002', category: 'RAM', price: 119.99, stock_quantity: 30, description: '2x16GB kit, DDR5-6400, CL32, premium aluminium heatspreader.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed07', name: 'ASUS ROG Strix B650E-F', sku: 'MB-001', category: 'Motherboards', price: 259.99, stock_quantity: 20, description: 'AM5 ATX board, PCIe 5.0, DDR5, WiFi 6E, 2.5G LAN.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed08', name: 'MSI MAG Z790 Tomahawk', sku: 'MB-002', category: 'Motherboards', price: 219.99, stock_quantity: 22, description: 'LGA 1700 ATX board, DDR5, PCIe 5.0, 2.5G LAN, robust VRM.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed09', name: 'Samsung 990 Pro 2TB NVMe', sku: 'SSD-001', category: 'SSDs', price: 169.99, stock_quantity: 35, description: 'PCIe 4.0 NVMe M.2, up to 7,450 MB/s read, ideal for gaming & creative work.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed10', name: 'WD Black SN850X 1TB', sku: 'SSD-002', category: 'SSDs', price: 89.99, stock_quantity: 45, description: 'PCIe 4.0 NVMe M.2, up to 7,300 MB/s read, Game Mode 2.0.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed11', name: 'Corsair RM850x 850W 80+ Gold', sku: 'PSU-001', category: 'PSUs', price: 129.99, stock_quantity: 28, description: 'Fully modular, 80+ Gold, zero-RPM fan mode, 10-year warranty.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed12', name: 'be quiet! Dark Power 13 1000W', sku: 'PSU-002', category: 'PSUs', price: 219.99, stock_quantity: 14, description: 'ATX 3.0, 80+ Titanium, fully modular, whisper-quiet operation.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed13', name: 'Lian Li O11 Dynamic EVO', sku: 'CASE-001', category: 'Cases', price: 159.99, stock_quantity: 16, description: 'Dual-chamber mid-tower, tempered glass, excellent airflow & cable management.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed14', name: 'NZXT H7 Flow', sku: 'CASE-002', category: 'Cases', price: 129.99, stock_quantity: 20, description: 'Mid-tower ATX, perforated front panel, tool-less top panel, clean aesthetics.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed15', name: 'LG 27GP850-B 27" 165Hz', sku: 'MON-001', category: 'Monitors', price: 349.99, stock_quantity: 10, description: '27" QHD Nano IPS, 165Hz (OC), 1ms, HDR400, G-Sync & FreeSync.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed16', name: 'Samsung Odyssey G7 32" 240Hz', sku: 'MON-002', category: 'Monitors', price: 549.99, stock_quantity: 8, description: '32" QHD VA, 240Hz, 1ms, 1000R curve, HDR600, stunning contrast.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed17', name: 'Corsair K70 RGB Pro', sku: 'KB-001', category: 'Keyboards', price: 129.99, stock_quantity: 30, description: 'Mechanical gaming keyboard, Cherry MX Red, per-key RGB, aluminium frame.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed18', name: 'Keychron Q1 Pro', sku: 'KB-002', category: 'Keyboards', price: 169.99, stock_quantity: 25, description: '75% wireless mechanical, Gateron Jupiter Red, hot-swappable, QMK/VIA.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed19', name: 'Logitech G Pro X Superlight 2', sku: 'MOUSE-001', category: 'Mice', price: 139.99, stock_quantity: 35, description: 'Ultra-lightweight 60g wireless, HERO 2 sensor, 95-hour battery.', image_url: '', is_active: true, created_at: now, updated_at: now },
        { id: 'p_seed20', name: 'Razer DeathAdder V3', sku: 'MOUSE-002', category: 'Mice', price: 89.99, stock_quantity: 40, description: 'Ergonomic esports mouse, Focus Pro 30K sensor, 90-hour battery.', image_url: '', is_active: true, created_at: now, updated_at: now },
    ];
    writeStore('ri_products', seed);
}

// Pre-seed the admin/producer account so it always exists locally
function seedAdminAccount() {
    const users = readStore('ri_users');
    if (users.find(u => u.email === ADMIN_EMAIL)) return; // already exists
    users.unshift({
        id: 'admin_1',
        email: ADMIN_EMAIL,
        password: 'Kingjsd14',
        full_name: 'Administrator',
        role: 'admin'
    });
    writeStore('ri_users', users);
}

function loadLocalSession() {
    seedProducts();
    seedAdminAccount();
    const u = localStorage.getItem('ri_user');
    if (u) {
        currentUser = JSON.parse(u);
        currentProfile = JSON.parse(localStorage.getItem('ri_profile') || '{}');
        isAdmin = currentProfile.role === 'admin';
        document.getElementById('authStatusDot').classList.toggle('connected', !!currentUser);
        document.getElementById('authStatusText').textContent = currentUser ? `Signed in as ${currentUser.email || currentUser.username}` : 'Signed out';
        enterApp();
    } else {
        // Show login UI by default
        const cfg = document.getElementById('authConfig');
        if (cfg) cfg.remove();
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('authStatusText').textContent = 'Signed out';
    }
} 

// ============================================================
// AUTH: LOGIN / REGISTER / LOGOUT
// ============================================================

function toggleAuthMode() {
    if (authMode === 'login') {
        authMode = 'register';
        document.getElementById('authSubtitle').textContent = 'Create a new account';
        document.getElementById('authSubmitBtn').textContent = 'Create Account';
        document.getElementById('registerFields').style.display = 'block';
        document.getElementById('authToggleText').textContent = 'Already have an account?';
        document.getElementById('authToggleBtn').textContent = 'Sign in';
    } else {
        authMode = 'login';
        document.getElementById('authSubtitle').textContent = 'Sign in to your account';
        document.getElementById('authSubmitBtn').textContent = 'Sign In';
        document.getElementById('registerFields').style.display = 'none';
        document.getElementById('authToggleText').textContent = "Don't have an account?";
        document.getElementById('authToggleBtn').textContent = 'Create one';
    }
}

async function handleAuth() {
    const email = document.getElementById('authEmail').value.trim().toLowerCase();
    const password = document.getElementById('authPassword').value;
    if (!email || !password) { showToast('Please enter email and password.', 'error'); return; }

    if (supabaseClient) {
        // ── Supabase Auth ──
        if (authMode === 'register') {
            const fullName = document.getElementById('authFullName').value.trim();
            const confirmPw = document.getElementById('authPasswordConfirm')?.value || '';
            if (password !== confirmPw) { showToast('Passwords do not match.', 'error'); return; }
            if (password.length < 6) { showToast('Password must be at least 6 characters.', 'error'); return; }

            const { data, error } = await supabaseClient.auth.signUp({
                email, password,
                options: { data: { full_name: fullName || email.split('@')[0] } }
            });
            if (error) { showToast(error.message, 'error'); return; }

            // Determine role — auto-admin for the producer email
            const role = (email === ADMIN_EMAIL) ? 'admin' : 'customer';

            if (data.session) {
                // Email confirmation is OFF → user is signed in immediately
                currentUser = data.user;
                await supabaseClient.from('user_profiles').upsert({
                    id: data.user.id,
                    email: data.user.email,
                    full_name: fullName || email.split('@')[0],
                    role: role
                }, { onConflict: 'id' });
                await loadUserProfile();
                showToast('Account created! Signed in.', 'success');
                enterApp();
            } else if (data.user) {
                // Email confirmation is ON → user created but not signed in
                // Try to sign them in right away (works if "Confirm email" is disabled)
                const { data: signInData, error: signInErr } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (signInErr) {
                    showToast('Account created! Please confirm your email, then sign in.', 'info');
                    return;
                }
                currentUser = signInData.user;
                await supabaseClient.from('user_profiles').upsert({
                    id: signInData.user.id,
                    email: signInData.user.email,
                    full_name: fullName || email.split('@')[0],
                    role: role
                }, { onConflict: 'id' });
                await loadUserProfile();
                showToast('Account created! Signed in.', 'success');
                enterApp();
            } else {
                showToast('Something went wrong. Please try again.', 'error');
            }
        } else {
            // ── Sign In ──
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) { showToast(error.message, 'error'); return; }
            currentUser = data.user;
            await loadUserProfile();
            showToast('Signed in.', 'success');
            enterApp();
        }
    } else {
        // ── Local fallback ──
        if (authMode === 'register') {
            localRegister(email, password);
        } else {
            localLogin(email, password);
        }
    }
}

function localLogin(email, password) {
    const users = readStore('ri_users');
    const user = users.find(u => u.email === email);
    if (user) {
        if (user.password !== password) { showToast('Invalid credentials.', 'error'); return; }
        currentUser = { id: user.id, email: user.email };
        currentProfile = { full_name: user.full_name || user.email.split('@')[0], role: user.role || 'customer' };
        isAdmin = currentProfile.role === 'admin';
        localStorage.setItem('ri_user', JSON.stringify(currentUser));
        localStorage.setItem('ri_profile', JSON.stringify(currentProfile));
        showToast('Signed in.', 'success');
        enterApp();
        return;
    }

    showToast('User not found. Register or check credentials.', 'error');
}

function localRegister(email, password) {
    const fullName = document.getElementById('authFullName').value.trim();
    const confirmPw = document.getElementById('authPasswordConfirm')?.value || '';
    if (password !== confirmPw) { showToast('Passwords do not match.', 'error'); return; }
    if (password.length < 6) { showToast('Password must be at least 6 characters.', 'error'); return; }
    const users = readStore('ri_users');
    if (users.find(u => u.email === email)) { showToast('User already exists.', 'error'); return; }
    // Auto-assign admin role for the producer email
    const role = (email === ADMIN_EMAIL) ? 'admin' : 'customer';
    const newUser = { id: generateId('u'), email, password, full_name: fullName || email.split('@')[0], role };
    users.unshift(newUser);
    writeStore('ri_users', users);
    currentUser = { id: newUser.id, email: newUser.email };
    currentProfile = { full_name: newUser.full_name, role: newUser.role };
    isAdmin = currentProfile.role === 'admin';
    localStorage.setItem('ri_user', JSON.stringify(currentUser));
    localStorage.setItem('ri_profile', JSON.stringify(currentProfile));
    showToast('Account created! Signed in.', 'success');
    enterApp();
} 

async function handleLogout() {
    if (supabaseClient) {
        await supabaseClient.auth.signOut();
    }
    currentUser = null;
    currentProfile = null;
    isAdmin = false;
    localStorage.removeItem('ri_user');
    localStorage.removeItem('ri_profile');
    document.body.classList.remove('is-admin');

    // Show auth, hide app
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('appWrapper').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    if (supabaseClient) {
        document.getElementById('authStatusDot').classList.add('connected');
        document.getElementById('authStatusText').textContent = 'Connected to Supabase';
    } else {
        document.getElementById('authStatusDot').classList.remove('connected');
        document.getElementById('authStatusText').textContent = 'Signed out';
    }
    showToast('Signed out.', 'info');
}

// ============================================================
// USER PROFILE + ROLE
// ============================================================

async function loadUserProfile() {
    if (!currentUser) return;

    try {
        const { data, error } = await supabaseClient
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            // Profile doesn't exist yet — create it now
            console.warn('Profile not found, creating one...');
            const role = (currentUser.email?.toLowerCase() === ADMIN_EMAIL) ? 'admin' : 'customer';
            const fullName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || '';
            await supabaseClient.from('user_profiles').upsert({
                id: currentUser.id,
                email: currentUser.email,
                full_name: fullName,
                role: role
            }, { onConflict: 'id' });
            currentProfile = { email: currentUser.email, full_name: fullName, role: role };
        } else {
            currentProfile = data;
            // Auto-upgrade to admin if this is the producer email but role is wrong
            if (currentUser.email?.toLowerCase() === ADMIN_EMAIL && currentProfile.role !== 'admin') {
                await supabaseClient.from('user_profiles')
                    .update({ role: 'admin' })
                    .eq('id', currentUser.id);
                currentProfile.role = 'admin';
            }
        }

        isAdmin = currentProfile.role === 'admin';
    } catch (e) {
        console.warn('loadUserProfile error:', e);
        const role = (currentUser.email?.toLowerCase() === ADMIN_EMAIL) ? 'admin' : 'customer';
        currentProfile = { email: currentUser.email, full_name: '', role: role };
        isAdmin = role === 'admin';
    }
}

// ============================================================
// ENTER THE APP (after auth)
// ============================================================

function enterApp() {
    // Hide auth screen, show app
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appWrapper').style.display = 'flex';

    // Force admin for the producer email — always, no matter what DB says
    if (currentUser?.email?.toLowerCase() === ADMIN_EMAIL) {
        isAdmin = true;
        if (currentProfile) currentProfile.role = 'admin';
        // Also update Supabase in the background if connected
        if (supabaseClient && currentUser?.id) {
            supabaseClient.from('user_profiles')
                .update({ role: 'admin' })
                .eq('id', currentUser.id)
                .then(() => console.log('Admin role synced to Supabase'));
        }
    }

    // Set admin class on body
    if (isAdmin) {
        document.body.classList.add('is-admin');
    } else {
        document.body.classList.remove('is-admin');
    }

    // Update user badge
    const name = currentProfile?.full_name || currentUser?.email?.split('@')[0] || 'User';
    document.getElementById('userName').textContent = name;
    document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();

    const roleEl = document.getElementById('userRole');
    roleEl.textContent = isAdmin ? 'Admin' : 'Customer';
    if (isAdmin) roleEl.classList.add('role-admin');
    else roleEl.classList.remove('role-admin');

    // Update UI labels for role
    if (isAdmin) {
        const ordSub = document.getElementById('ordersSubtitle');
        if (ordSub) ordSub.textContent = 'All customer orders (admin view)';
    } else {
        const ordSub = document.getElementById('ordersSubtitle');
        if (ordSub) ordSub.textContent = 'Your orders';
        // Set welcome name
        const welcomeEl = document.getElementById('welcomeName');
        if (welcomeEl) welcomeEl.textContent = name;
    }

    // Load cart for customers
    if (!isAdmin) loadCart();

    // Load all data
    loadAllData();
}

// ============================================================
// NAVIGATION
// ============================================================

function initNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
            const panel = document.getElementById(`panel-${tab.dataset.tab}`);
            if (panel) panel.classList.add('active');
        });
    });

    // Allow Enter key to submit auth
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const authScreen = document.getElementById('authScreen');
            if (!authScreen.classList.contains('hidden')) {
                if (document.getElementById('loginForm').style.display !== 'none') {
                    handleAuth();
                }
            }
        }
    });
}

// ============================================================
// TOASTS
// ============================================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: '✓', error: '✗', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('leaving'); setTimeout(() => toast.remove(), 300); }, 3500);
}

// ============================================================
// MODAL HELPERS
// ============================================================

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
});

// ============================================================
// LOAD ALL DATA
// ============================================================

async function loadAllData() {
    await Promise.all([
        loadProducts(),
        isAdmin ? loadCustomers() : Promise.resolve(),
        loadOrders(),
        loadRewards()
    ]);
    loadDashboard();
} 

// ============================================================
// PRODUCTS — CRUD
// ============================================================

async function loadProducts() {
    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            productsCache = data || [];
        } else {
            productsCache = readStore('ri_products');
        }
        renderProducts(productsCache);
        populateCategoryFilter();
    } catch (err) { showToast(`Products: ${err.message}`, 'error'); }
} 

function renderProducts(products) {
    // Customer: render shop grid
    if (!isAdmin) {
        renderShopGrid(products);
        return;
    }
    // Admin: render data table with stock controls
    const tbody = document.getElementById('productsTableBody');
    if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">No products found</div></td></tr>`;
        document.getElementById('productCount').textContent = '0 products';
        return;
    }
    tbody.innerHTML = products.map(p => `
        <tr>
            <td>
                <div class="product-cell">
                    <img class="product-thumb" src="${p.image_url || ''}" alt="" onerror="this.style.display='none'">
                    <div>
                        <div class="product-info-name">${esc(p.name)}</div>
                        <div class="product-info-sku">${esc(p.sku)}</div>
                    </div>
                </div>
            </td>
            <td>${esc(p.category)}</td>
            <td>£${Number(p.price).toFixed(2)}</td>
            <td>
                <div class="stock-controls">
                    <button class="btn btn-sm stock-btn" onclick="adjustStock('${p.id}', -1)">−</button>
                    <span class="stock-value">${p.stock_quantity}</span>
                    <button class="btn btn-sm stock-btn" onclick="adjustStock('${p.id}', 1)">+</button>
                </div>
            </td>
            <td><span class="badge ${p.is_active ? 'badge-active' : 'badge-inactive'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
            <td><div class="cell-actions">
                <button class="btn btn-sm" onclick="editProduct('${p.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}','${esc(p.name)}')">Delete</button>
            </div></td>
        </tr>
    `).join('');
    document.getElementById('productCount').textContent = `${products.length} product${products.length !== 1 ? 's' : ''}`;
}

function renderShopGrid(products) {
    const grid = document.getElementById('shopGrid');
    if (!products.length) {
        grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">No products found</div></div>`;
        return;
    }
    grid.innerHTML = products.filter(p => p.is_active).map(p => {
        const icon = categoryIcons[p.category] || '📦';
        const outOfStock = p.stock_quantity <= 0;
        const inCart = cartItems.find(ci => ci.productId === p.id);
        const cartQty = inCart ? inCart.quantity : 0;
        return `
        <div class="product-card">
            <div class="product-card-image">${p.image_url ? `<img src="${p.image_url}" alt="${esc(p.name)}" onerror="this.parentElement.textContent='${icon}'">` : icon}</div>
            <div class="product-card-body">
                <div class="product-card-category">${esc(p.category)}</div>
                <div class="product-card-name">${esc(p.name)}</div>
                <div class="product-card-desc">${esc(p.description || '')}</div>
                <div class="product-card-footer">
                    <div class="product-card-price">£${Number(p.price).toFixed(2)}</div>
                    <div class="product-card-stock ${outOfStock ? 'out-of-stock' : ''}">${outOfStock ? 'Out of stock' : p.stock_quantity + ' in stock'}</div>
                </div>
                <button class="btn btn-primary btn-add-cart" onclick="addToCart('${p.id}')" ${outOfStock ? 'disabled' : ''}>
                    ${outOfStock ? 'Out of Stock' : (cartQty > 0 ? `In Basket (${cartQty})` : 'Add to Basket')}
                </button>
            </div>
        </div>`;
    }).join('');
}

// ============================================================
// ADMIN STOCK ADJUSTMENT
// ============================================================
async function adjustStock(productId, delta) {
    const p = productsCache.find(x => x.id === productId);
    if (!p) return;
    const newStock = Math.max(0, p.stock_quantity + delta);
    try {
        if (supabaseClient) {
            const { error } = await supabaseClient.from('products').update({ stock_quantity: newStock }).eq('id', productId);
            if (error) throw error;
            p.stock_quantity = newStock;
        } else {
            p.stock_quantity = newStock;
            p.updated_at = new Date().toISOString();
            writeStore('ri_products', productsCache);
        }
        renderProducts(productsCache);
    } catch (err) { showToast(`Stock update error: ${err.message}`, 'error'); }
}

function populateCategoryFilter() {
    const sel = document.getElementById('productCategoryFilter');
    const cats = [...new Set(productsCache.map(p => p.category))].sort();
    sel.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function filterProducts() {
    const s = document.getElementById('productSearch').value.toLowerCase();
    const c = document.getElementById('productCategoryFilter').value;
    renderProducts(productsCache.filter(p =>
        (!s || p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)) &&
        (!c || p.category === c)
    ));
}

function openProductModal(product = null) {
    if (!isAdmin) { showToast('Admin access required.', 'error'); return; }
    document.getElementById('productModalTitle').textContent = product ? 'Edit Product' : 'Add Product';
    document.getElementById('productEditId').value = product ? product.id : '';
    document.getElementById('prodName').value = product ? product.name : '';
    document.getElementById('prodSku').value = product ? product.sku : '';
    document.getElementById('prodCategory').value = product ? product.category : '';
    document.getElementById('prodPrice').value = product ? product.price : '';
    document.getElementById('prodStock').value = product ? product.stock_quantity : '';
    document.getElementById('prodDesc').value = product ? (product.description || '') : '';
    document.getElementById('prodImage').value = product ? (product.image_url || '') : '';
    document.getElementById('prodActive').checked = product ? product.is_active : true;
    openModal('productModal');
}

function editProduct(id) { const p = productsCache.find(x => x.id === id); if (p) openProductModal(p); }

async function saveProduct() {
    const id = document.getElementById('productEditId').value;
    const payload = {
        name: document.getElementById('prodName').value.trim(),
        sku: document.getElementById('prodSku').value.trim(),
        category: document.getElementById('prodCategory').value.trim(),
        price: parseFloat(document.getElementById('prodPrice').value) || 0,
        stock_quantity: parseInt(document.getElementById('prodStock').value) || 0,
        description: document.getElementById('prodDesc').value.trim(),
        image_url: document.getElementById('prodImage').value.trim(),
        is_active: document.getElementById('prodActive').checked,
    };
    if (!payload.name || !payload.sku || !payload.category) { showToast('Fill in Name, SKU, and Category.', 'error'); return; }
    try {
        if (supabaseClient) {
            const result = id
                ? await supabaseClient.from('products').update(payload).eq('id', id).select()
                : await supabaseClient.from('products').insert(payload).select();
            if (result.error) throw result.error;
            showToast(id ? 'Product updated!' : 'Product created!', 'success');
            closeModal('productModal');
            await loadProducts(); loadDashboard();
        } else {
            if (id) {
                const idx = productsCache.findIndex(p => p.id === id);
                if (idx !== -1) Object.assign(productsCache[idx], payload, { updated_at: new Date().toISOString() });
            } else {
                const newItem = Object.assign(payload, { id: generateId('p'), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
                productsCache.unshift(newItem);
            }
            writeStore('ri_products', productsCache);
            showToast(id ? 'Product updated (local)!' : 'Product created (local)!', 'success');
            closeModal('productModal');
            renderProducts(productsCache);
            loadDashboard();
        }
    } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
} 

async function deleteProduct(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
        if (supabaseClient) {
            const { error } = await supabaseClient.from('products').delete().eq('id', id);
            if (error) throw error;
            showToast('Product deleted.', 'success');
            await loadProducts(); loadDashboard();
        } else {
            productsCache = productsCache.filter(p => p.id !== id);
            writeStore('ri_products', productsCache);
            showToast('Product deleted (local).', 'success');
            renderProducts(productsCache);
            loadDashboard();
        }
    } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
} 

// ============================================================
// CUSTOMERS — CRUD (Admin only)
// ============================================================

async function loadCustomers() {
    if (!isAdmin) return;
    try {
        if (supabaseClient) {
            // Get all customer profiles (not admins)
            const { data: profiles, error: profilesErr } = await supabaseClient
                .from('user_profiles')
                .select('*')
                .eq('role', 'customer')
                .order('created_at', { ascending: false });
            if (profilesErr) throw profilesErr;

            // Get order stats per user
            const { data: orders, error: ordersErr } = await supabaseClient
                .from('orders')
                .select('user_id, total_amount, status');
            if (ordersErr) throw ordersErr;

            // Build stats map
            const statsMap = {};
            (orders || []).forEach(o => {
                if (!o.user_id) return;
                if (!statsMap[o.user_id]) statsMap[o.user_id] = { total_orders: 0, total_spent: 0 };
                statsMap[o.user_id].total_orders++;
                statsMap[o.user_id].total_spent += Number(o.total_amount) || 0;
            });

            customersCache = (profiles || []).map(p => ({
                id: p.id,
                email: p.email,
                full_name: p.full_name || p.email.split('@')[0],
                joined_at: p.created_at,
                total_orders: statsMap[p.id]?.total_orders || 0,
                total_spent: statsMap[p.id]?.total_spent || 0
            }));
        } else {
            customersCache = readStore('ri_customers');
        }
        renderCustomers(customersCache);
    } catch (err) { showToast(`Customers: ${err.message}`, 'error'); }
}

function renderCustomers(customers) {
    const tbody = document.getElementById('customersTableBody');
    if (!customers.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">No customers have signed up yet</div></td></tr>`;
        document.getElementById('customerCount').textContent = '0 customers';
        return;
    }
    tbody.innerHTML = customers.map(c => `
        <tr>
            <td><div><div style="font-weight:500">${esc(c.full_name)}</div><div class="product-info-sku">${esc(c.email)}</div></div></td>
            <td>${new Date(c.joined_at).toLocaleDateString('en-GB')}</td>
            <td style="font-family:var(--font-mono)">${c.total_orders}</td>
            <td style="font-family:var(--font-mono)">£${Number(c.total_spent).toFixed(2)}</td>
            <td><button class="btn btn-sm" onclick="viewCustomerOrders('${c.id}','${esc(c.full_name)}')">View Orders</button></td>
        </tr>
    `).join('');
    document.getElementById('customerCount').textContent = `${customers.length} customer${customers.length !== 1 ? 's' : ''}`;
}

function filterCustomers() {
    const s = document.getElementById('customerSearch').value.toLowerCase();
    renderCustomers(customersCache.filter(c =>
        (!s || c.full_name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s))
    ));
}

async function viewCustomerOrders(userId, name) {
    try {
        let customerOrders = [];
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from('orders')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            customerOrders = data || [];
        } else {
            customerOrders = readStore('ri_orders').filter(o => o.user_id === userId);
        }
        if (!customerOrders.length) {
            showToast(`${name} has no orders yet`, 'info');
            return;
        }
        let html = `<h3 style="margin-bottom:12px">${esc(name)}'s Orders</h3>`;
        html += `<table class="data-table"><thead><tr><th>Order ID</th><th>Total</th><th>Status</th><th>Date</th><th>Method</th></tr></thead><tbody>`;
        customerOrders.forEach(o => {
            html += `<tr>
                <td style="font-family:var(--font-mono)">${(o.id || '').substring(0, 8)}…</td>
                <td>£${Number(o.total_amount).toFixed(2)}</td>
                <td><span class="badge badge-${o.status}">${o.status}</span></td>
                <td>${new Date(o.created_at).toLocaleDateString('en-GB')}</td>
                <td>${esc(o.payment_method || '—')}</td>
            </tr>`;
        });
        html += `</tbody></table>`;
        document.getElementById('orderDetailContent').innerHTML = html;
        openModal('orderDetailModal');
    } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

function openCustomerModal(customer = null) {
    document.getElementById('customerModalTitle').textContent = customer ? 'Edit Customer' : 'Add Customer';
    document.getElementById('customerEditId').value = customer ? customer.id : '';
    document.getElementById('custName').value = customer ? customer.full_name : '';
    document.getElementById('custEmail').value = customer ? customer.email : '';
    document.getElementById('custPhone').value = customer ? (customer.phone || '') : '';
    document.getElementById('custPoints').value = customer ? customer.loyalty_points : 0;
    document.getElementById('custTier').value = customer ? customer.loyalty_tier : 'Bronze';
    openModal('customerModal');
}

function editCustomer(id) { const c = customersCache.find(x => x.id === id); if (c) openCustomerModal(c); }

async function saveCustomer() {
    const id = document.getElementById('customerEditId').value;
    const payload = {
        full_name: document.getElementById('custName').value.trim(),
        email: document.getElementById('custEmail').value.trim(),
        phone: document.getElementById('custPhone').value.trim(),
        loyalty_points: parseInt(document.getElementById('custPoints').value) || 0,
        loyalty_tier: document.getElementById('custTier').value,
        total_spent: 0
    };
    if (!payload.full_name || !payload.email) { showToast('Fill in Name and Email.', 'error'); return; }
    try {
        if (supabaseClient) {
            const result = id
                ? await supabaseClient.from('customers').update(payload).eq('id', id).select()
                : await supabaseClient.from('customers').insert(payload).select();
            if (result.error) throw result.error;
            showToast(id ? 'Customer updated!' : 'Customer added!', 'success');
            closeModal('customerModal');
            await loadCustomers(); loadDashboard();
        } else {
            if (id) {
                const idx = customersCache.findIndex(c => c.id === id);
                if (idx !== -1) Object.assign(customersCache[idx], payload, { updated_at: new Date().toISOString() });
            } else {
                const newItem = Object.assign(payload, { id: generateId('c'), joined_at: new Date().toISOString(), updated_at: new Date().toISOString(), total_spent: 0 });
                customersCache.unshift(newItem);
            }
            writeStore('ri_customers', customersCache);
            showToast(id ? 'Customer updated (local)!' : 'Customer added (local)!', 'success');
            closeModal('customerModal');
            renderCustomers(customersCache);
            loadDashboard();
        }
    } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
} 

async function deleteCustomer(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
        if (supabaseClient) {
            const { error } = await supabaseClient.from('customers').delete().eq('id', id);
            if (error) throw error;
            showToast('Customer deleted.', 'success');
            await loadCustomers(); loadDashboard();
        } else {
            customersCache = customersCache.filter(c => c.id !== id);
            writeStore('ri_customers', customersCache);
            showToast('Customer deleted (local).', 'success');
            renderCustomers(customersCache);
            loadDashboard();
        }
    } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
} 

// ============================================================
// ORDERS — CRUD
// Admin: sees ALL orders, can edit any order's status/details
// Customer: sees only their own orders
// ============================================================

async function loadOrders() {
    try {
        if (supabaseClient) {
            let query = supabaseClient.from('orders').select('*, customers(full_name)').order('created_at', { ascending: false });
            if (!isAdmin) query = query.eq('user_id', currentUser.id);
            const { data, error } = await query;
            if (error) throw error;
            ordersCache = data || [];
        } else {
            const all = readStore('ri_orders');
            ordersCache = isAdmin ? all : all.filter(o => o.user_id === currentUser?.id);
        }
        renderOrders(ordersCache);
    } catch (err) { showToast(`Orders: ${err.message}`, 'error'); }
} 

function renderOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (!orders.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">🧾</div><div class="empty-state-text">No orders found</div></td></tr>`;
        document.getElementById('orderCount').textContent = '0 orders';
        return;
    }
    tbody.innerHTML = orders.map(o => {
        const canEdit = isAdmin || (o.user_id === currentUser.id && o.status === 'pending');
        return `
        <tr>
            <td><span style="font-family:var(--font-mono);font-size:0.78rem">${o.id.slice(0, 8)}…</span></td>
            ${isAdmin ? `<td>${o.customers ? esc(o.customers.full_name) : '<span style="color:var(--color-text-dim)">—</span>'}</td>` : ''}
            <td style="font-weight:600">£${Number(o.total_amount).toFixed(2)}</td>
            <td><span class="badge badge-${o.status}">${cap(o.status)}</span></td>
            <td style="font-size:0.82rem;color:var(--color-text-muted)">${new Date(o.created_at).toLocaleDateString('en-GB')}</td>
            <td>
                <div class="cell-actions">
                    ${(o.line_items || supabaseClient) ? `<button class="btn btn-sm" onclick="viewOrderItems('${o.id}')">View</button>` : ''}
                    ${canEdit ? `<button class="btn btn-sm" onclick="editOrder('${o.id}')">Edit</button>` : ''}
                    ${isAdmin ? `<button class="btn btn-sm btn-danger" onclick="deleteOrder('${o.id}')">Delete</button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
    document.getElementById('orderCount').textContent = `${orders.length} order${orders.length !== 1 ? 's' : ''}`;
}

function filterOrders() {
    const s = document.getElementById('orderSearch').value.toLowerCase();
    const st = document.getElementById('orderStatusFilter').value;
    renderOrders(ordersCache.filter(o => {
        const name = o.customers?.full_name?.toLowerCase() || '';
        return (!s || name.includes(s) || o.id.includes(s)) && (!st || o.status === st);
    }));
}

function openOrderModal(order = null) {
    document.getElementById('orderModalTitle').textContent = order ? 'Edit Order' : 'New Order';
    document.getElementById('orderEditId').value = order ? order.id : '';
    document.getElementById('orderTotal').value = order ? order.total_amount : '';
    document.getElementById('orderStatus').value = order ? order.status : 'pending';
    document.getElementById('orderPayment').value = order ? (order.payment_method || '') : '';
    document.getElementById('orderNotes').value = order ? (order.notes || '') : '';

    // Populate customer dropdown (admin only)
    if (isAdmin) {
        const sel = document.getElementById('orderCustomer');
        sel.innerHTML = '<option value="">Select customer...</option>' +
            customersCache.map(c => `<option value="${c.id}" ${order && order.customer_id === c.id ? 'selected' : ''}>${esc(c.full_name)}</option>`).join('');
    }

    // If not admin, disable status field (they can only keep pending)
    document.getElementById('orderStatus').disabled = !isAdmin;

    openModal('orderModal');
}

function editOrder(id) { const o = ordersCache.find(x => x.id === id); if (o) openOrderModal(o); }

async function saveOrder() {
    const id = document.getElementById('orderEditId').value;
    const payload = {
        total_amount: parseFloat(document.getElementById('orderTotal').value) || 0,
        status: document.getElementById('orderStatus').value,
        payment_method: document.getElementById('orderPayment').value.trim(),
        notes: document.getElementById('orderNotes').value.trim(),
    };

    if (isAdmin) {
        payload.customer_id = document.getElementById('orderCustomer').value || null;
    }

    if (!id) {
        payload.user_id = currentUser?.id || 'guest';
        payload.created_at = new Date().toISOString();
    }

    if (!payload.total_amount) { showToast('Enter the order total.', 'error'); return; }

    try {
        if (supabaseClient) {
            const result = id
                ? await supabaseClient.from('orders').update(payload).eq('id', id).select()
                : await supabaseClient.from('orders').insert(payload).select();
            if (result.error) throw result.error;
            showToast(id ? 'Order updated!' : 'Order created!', 'success');
            closeModal('orderModal');
            await loadOrders(); loadDashboard();
        } else {
            if (id) {
                const idx = ordersCache.findIndex(o => o.id === id);
                if (idx !== -1) Object.assign(ordersCache[idx], payload, { updated_at: new Date().toISOString() });
            } else {
                const newItem = Object.assign(payload, { id: generateId('o'), created_at: new Date().toISOString() });
                ordersCache.unshift(newItem);
            }
            writeStore('ri_orders', ordersCache);
            showToast(id ? 'Order updated (local)!' : 'Order created (local)!', 'success');
            closeModal('orderModal');
            renderOrders(ordersCache);
            loadDashboard();
        }
    } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
} 

async function deleteOrder(id) {
    if (!confirm('Delete this order?')) return;
    try {
        if (supabaseClient) {
            const { error } = await supabaseClient.from('orders').delete().eq('id', id);
            if (error) throw error;
            showToast('Order deleted.', 'success');
            await loadOrders(); loadDashboard();
        } else {
            ordersCache = ordersCache.filter(o => o.id !== id);
            writeStore('ri_orders', ordersCache);
            showToast('Order deleted (local).', 'success');
            renderOrders(ordersCache);
            loadDashboard();
        }
    } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
} 

// ============================================================
// LOYALTY REWARDS — CRUD
// ============================================================

async function loadRewards() {
    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('loyalty_rewards').select('*').order('points_required', { ascending: true });
            if (error) throw error;
            rewardsCache = data || [];
        } else {
            rewardsCache = readStore('ri_rewards');
        }
        renderRewards(rewardsCache);
    } catch (err) { showToast(`Rewards: ${err.message}`, 'error'); }
} 

function renderRewards(rewards) {
    const tbody = document.getElementById('rewardsTableBody');
    const types = { discount_percent: 'Discount (%)', discount_fixed: 'Discount (£)', free_product: 'Free Product', free_shipping: 'Free Shipping' };
    if (!rewards.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">🎁</div><div class="empty-state-text">No rewards configured</div></td></tr>`;
        document.getElementById('rewardCount').textContent = '0 rewards';
        return;
    }
    tbody.innerHTML = rewards.map(r => `
        <tr>
            <td><div><div style="font-weight:500">${esc(r.name)}</div><div class="product-info-sku">${esc(r.description || '')}</div></div></td>
            <td>${types[r.reward_type] || r.reward_type}</td>
            <td style="font-family:var(--font-mono)">${r.reward_type.includes('percent') ? r.reward_value + '%' : '£' + Number(r.reward_value).toFixed(2)}</td>
            <td style="font-family:var(--font-mono)">${r.points_required.toLocaleString()} pts</td>
            <td><span class="badge ${r.is_active ? 'badge-active' : 'badge-inactive'}">${r.is_active ? 'Active' : 'Inactive'}</span></td>
            ${isAdmin ? `<td><div class="cell-actions">
                <button class="btn btn-sm" onclick="editReward('${r.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteReward('${r.id}','${esc(r.name)}')">Delete</button>
            </div></td>` : '<td></td>'}
        </tr>
    `).join('');
    document.getElementById('rewardCount').textContent = `${rewards.length} reward${rewards.length !== 1 ? 's' : ''}`;
}

function openRewardModal(reward = null) {
    if (!isAdmin) { showToast('Admin access required.', 'error'); return; }
    document.getElementById('rewardModalTitle').textContent = reward ? 'Edit Reward' : 'Add Reward';
    document.getElementById('rewardEditId').value = reward ? reward.id : '';
    document.getElementById('rewName').value = reward ? reward.name : '';
    document.getElementById('rewDesc').value = reward ? (reward.description || '') : '';
    document.getElementById('rewType').value = reward ? reward.reward_type : 'discount_percent';
    document.getElementById('rewValue').value = reward ? reward.reward_value : '';
    document.getElementById('rewPoints').value = reward ? reward.points_required : '';
    document.getElementById('rewActive').checked = reward ? reward.is_active : true;
    openModal('rewardModal');
}

function editReward(id) { const r = rewardsCache.find(x => x.id === id); if (r) openRewardModal(r); }

async function saveReward() {
    const id = document.getElementById('rewardEditId').value;
    const payload = {
        name: document.getElementById('rewName').value.trim(),
        description: document.getElementById('rewDesc').value.trim(),
        reward_type: document.getElementById('rewType').value,
        reward_value: parseFloat(document.getElementById('rewValue').value) || 0,
        points_required: parseInt(document.getElementById('rewPoints').value) || 0,
        is_active: document.getElementById('rewActive').checked,
    };
    if (!payload.name || !payload.points_required) { showToast('Fill in Name and Points Required.', 'error'); return; }
    try {
        if (supabaseClient) {
            const result = id
                ? await supabaseClient.from('loyalty_rewards').update(payload).eq('id', id).select()
                : await supabaseClient.from('loyalty_rewards').insert(payload).select();
            if (result.error) throw result.error;
            showToast(id ? 'Reward updated!' : 'Reward created!', 'success');
            closeModal('rewardModal');
            await loadRewards();
        } else {
            if (id) {
                const idx = rewardsCache.findIndex(r => r.id === id);
                if (idx !== -1) Object.assign(rewardsCache[idx], payload, { updated_at: new Date().toISOString() });
            } else {
                const newItem = Object.assign(payload, { id: generateId('r'), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
                rewardsCache.unshift(newItem);
            }
            writeStore('ri_rewards', rewardsCache);
            showToast(id ? 'Reward updated (local)!' : 'Reward created (local)!', 'success');
            closeModal('rewardModal');
            renderRewards(rewardsCache);
        }
    } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
} 

async function deleteReward(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
        if (supabaseClient) {
            const { error } = await supabaseClient.from('loyalty_rewards').delete().eq('id', id);
            if (error) throw error;
            showToast('Reward deleted.', 'success');
            await loadRewards();
        } else {
            rewardsCache = rewardsCache.filter(r => r.id !== id);
            writeStore('ri_rewards', rewardsCache);
            showToast('Reward deleted (local).', 'success');
            renderRewards(rewardsCache);
        }
    } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
} 

// ============================================================
// SHOPPING CART / BASKET
// ============================================================

function loadCart() {
    if (!currentUser) { cartItems = []; return; }
    try { cartItems = JSON.parse(localStorage.getItem('ri_cart_' + currentUser.id)) || []; } catch (e) { cartItems = []; }
    updateCartBadge();
}

function saveCart() {
    if (!currentUser) return;
    localStorage.setItem('ri_cart_' + currentUser.id, JSON.stringify(cartItems));
    updateCartBadge();
}

function addToCart(productId) {
    const product = productsCache.find(p => p.id === productId);
    if (!product || product.stock_quantity <= 0) { showToast('Product is out of stock.', 'error'); return; }
    const existing = cartItems.find(ci => ci.productId === productId);
    if (existing) {
        if (existing.quantity >= product.stock_quantity) { showToast('Maximum stock reached.', 'error'); return; }
        existing.quantity++;
    } else {
        cartItems.push({ productId, quantity: 1 });
    }
    saveCart();
    showToast(`${product.name} added to basket.`, 'success');
    renderShopGrid(productsCache.filter(p => {
        const s = document.getElementById('productSearch').value.toLowerCase();
        const c = document.getElementById('productCategoryFilter').value;
        return (!s || p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)) && (!c || p.category === c);
    }));
}

function removeFromCart(productId) {
    cartItems = cartItems.filter(ci => ci.productId !== productId);
    saveCart();
    renderCartPanel();
}

function updateCartQuantity(productId, newQty) {
    if (newQty <= 0) { removeFromCart(productId); return; }
    const product = productsCache.find(p => p.id === productId);
    if (product && newQty > product.stock_quantity) newQty = product.stock_quantity;
    const item = cartItems.find(ci => ci.productId === productId);
    if (item) item.quantity = newQty;
    saveCart();
    renderCartPanel();
}

function getCartTotal() {
    return cartItems.reduce((sum, ci) => {
        const p = productsCache.find(x => x.id === ci.productId);
        return sum + (p ? p.price * ci.quantity : 0);
    }, 0);
}

function getCartCount() {
    return cartItems.reduce((sum, ci) => sum + ci.quantity, 0);
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const count = getCartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

function openCart() {
    renderCartPanel();
    document.getElementById('cartOverlay').classList.add('active');
    document.getElementById('cartSidebar').classList.add('active');
}

function closeCart() {
    document.getElementById('cartOverlay').classList.remove('active');
    document.getElementById('cartSidebar').classList.remove('active');
}

function renderCartPanel() {
    const container = document.getElementById('cartItems');
    const footer = document.getElementById('cartFooter');
    if (!cartItems.length) {
        container.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛒</div><div>Your basket is empty</div><div style="font-size:0.82rem;color:var(--color-text-dim);margin-top:8px">Browse products and add items to get started.</div></div>`;
        footer.style.display = 'none';
        return;
    }
    footer.style.display = 'block';
    container.innerHTML = cartItems.map(ci => {
        const p = productsCache.find(x => x.id === ci.productId);
        if (!p) return '';
        return `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${esc(p.name)}</div>
                <div class="cart-item-price">£${Number(p.price).toFixed(2)} each</div>
            </div>
            <div class="cart-item-qty">
                <button onclick="updateCartQuantity('${p.id}', ${ci.quantity - 1})">−</button>
                <span>${ci.quantity}</span>
                <button onclick="updateCartQuantity('${p.id}', ${ci.quantity + 1})">+</button>
            </div>
            <div style="font-weight:600;font-family:var(--font-mono);min-width:70px;text-align:right">£${(p.price * ci.quantity).toFixed(2)}</div>
            <button class="cart-item-remove" onclick="removeFromCart('${p.id}')" title="Remove">✕</button>
        </div>`;
    }).join('');
    document.getElementById('cartTotalValue').textContent = `£${getCartTotal().toFixed(2)}`;
}

// ============================================================
// MULTI-STEP CHECKOUT
// ============================================================

let checkoutDeliveryMethod = null;
const DELIVERY_COST = 4.99;

function checkout() {
    if (!cartItems.length) { showToast('Your basket is empty.', 'error'); return; }

    // Validate stock
    for (const ci of cartItems) {
        const p = productsCache.find(x => x.id === ci.productId);
        if (!p) { showToast('Product no longer available.', 'error'); removeFromCart(ci.productId); return; }
        if (ci.quantity > p.stock_quantity) { showToast(`${p.name} only has ${p.stock_quantity} in stock.`, 'error'); return; }
    }

    // Close cart sidebar, open checkout modal
    closeCart();
    checkoutDeliveryMethod = null;

    // Pre-fill email and name from profile
    document.getElementById('checkoutEmail').value = currentUser?.email || '';
    document.getElementById('checkoutName').value = currentProfile?.full_name || '';

    // Reset delivery selection
    document.querySelectorAll('input[name="deliveryMethod"]').forEach(r => r.checked = false);
    document.getElementById('deliveryContinueBtn').disabled = true;

    // Go to step 1
    goToCheckoutStep(1);
    openModal('checkoutModal');
}

function goToCheckoutStep(step) {
    // Validate before moving forward
    if (step === 3) {
        // Validate step 2 fields
        const name = document.getElementById('checkoutName').value.trim();
        const email = document.getElementById('checkoutEmail').value.trim();
        const phone = document.getElementById('checkoutPhone').value.trim();
        if (!name || !email || !phone) {
            showToast('Please fill in your name, email and phone.', 'error');
            return;
        }
    }

    if (step === 4) {
        if (!checkoutDeliveryMethod) {
            showToast('Please select collection or delivery.', 'error');
            return;
        }
    }

    // Update step indicators
    document.querySelectorAll('.checkout-step').forEach(s => {
        const sNum = parseInt(s.dataset.step);
        s.classList.remove('active', 'completed');
        if (sNum === step) s.classList.add('active');
        else if (sNum < step) s.classList.add('completed');
    });

    // Show correct panel
    document.querySelectorAll('.checkout-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('checkoutStep' + step).classList.add('active');

    // Render step content
    if (step === 1) renderCheckoutReview();
    if (step === 4) renderCheckoutConfirmation();
}

function renderCheckoutReview() {
    const list = document.getElementById('checkoutItemsList');
    list.innerHTML = cartItems.map(ci => {
        const p = productsCache.find(x => x.id === ci.productId);
        if (!p) return '';
        return `<div class="checkout-item">
            <div class="checkout-item-info">
                <div class="checkout-item-name">${esc(p.name)}</div>
                <div class="checkout-item-meta">${ci.quantity} × £${Number(p.price).toFixed(2)}</div>
            </div>
            <div class="checkout-item-total">£${(p.price * ci.quantity).toFixed(2)}</div>
        </div>`;
    }).join('');
    document.getElementById('checkoutSubtotal').textContent = `£${getCartTotal().toFixed(2)}`;
}

function selectDeliveryMethod(method) {
    checkoutDeliveryMethod = method;
    document.getElementById('deliveryContinueBtn').disabled = false;
}

function renderCheckoutConfirmation() {
    // Items summary
    const list = document.getElementById('confirmationItems');
    list.innerHTML = cartItems.map(ci => {
        const p = productsCache.find(x => x.id === ci.productId);
        if (!p) return '';
        return `<div class="checkout-item">
            <div class="checkout-item-info">
                <div class="checkout-item-name">${esc(p.name)}</div>
                <div class="checkout-item-meta">${ci.quantity} × £${Number(p.price).toFixed(2)}</div>
            </div>
            <div class="checkout-item-total">£${(p.price * ci.quantity).toFixed(2)}</div>
        </div>`;
    }).join('');

    // Costs
    const subtotal = getCartTotal();
    const deliveryCost = checkoutDeliveryMethod === 'delivery' ? DELIVERY_COST : 0;
    const total = subtotal + deliveryCost;

    document.getElementById('confirmSubtotal').textContent = `£${subtotal.toFixed(2)}`;
    document.getElementById('confirmDeliveryLabel').textContent = checkoutDeliveryMethod === 'delivery' ? 'Delivery' : 'Collection';
    document.getElementById('confirmDeliveryCost').textContent = deliveryCost > 0 ? `£${deliveryCost.toFixed(2)}` : 'FREE';
    document.getElementById('confirmTotal').textContent = `£${total.toFixed(2)}`;

    // Customer details
    const name = document.getElementById('checkoutName').value.trim();
    const email = document.getElementById('checkoutEmail').value.trim();
    const phone = document.getElementById('checkoutPhone').value.trim();
    const address = document.getElementById('checkoutAddress').value.trim();
    const city = document.getElementById('checkoutCity').value.trim();
    const postcode = document.getElementById('checkoutPostcode').value.trim();

    const details = document.getElementById('confirmDetails');
    details.innerHTML = `
        <div class="confirm-details-title">Your Details</div>
        <div class="confirm-details-row"><span>Name</span><span>${esc(name)}</span></div>
        <div class="confirm-details-row"><span>Email</span><span>${esc(email)}</span></div>
        <div class="confirm-details-row"><span>Phone</span><span>${esc(phone)}</span></div>
        ${checkoutDeliveryMethod === 'delivery' ? `
            <div class="confirm-details-title" style="margin-top:14px">Delivery Address</div>
            <div class="confirm-details-row"><span>Address</span><span>${esc(address)}</span></div>
            <div class="confirm-details-row"><span>City</span><span>${esc(city)}</span></div>
            <div class="confirm-details-row"><span>Postcode</span><span>${esc(postcode)}</span></div>
        ` : `
            <div class="confirm-details-title" style="margin-top:14px">Collection</div>
            <div class="confirm-details-row"><span>Method</span><span>Pick up from store</span></div>
        `}
    `;
}

async function placeOrder() {
    if (!cartItems.length) return;

    const subtotal = getCartTotal();
    const deliveryCost = checkoutDeliveryMethod === 'delivery' ? DELIVERY_COST : 0;
    const totalAmount = subtotal + deliveryCost;

    const lineItems = cartItems.map(ci => {
        const p = productsCache.find(x => x.id === ci.productId);
        return { product_id: p.id, name: p.name, sku: p.sku, price: p.price, quantity: ci.quantity, line_total: p.price * ci.quantity };
    });

    const deliveryNote = checkoutDeliveryMethod === 'delivery'
        ? `Delivery to: ${document.getElementById('checkoutAddress').value.trim()}, ${document.getElementById('checkoutCity').value.trim()}, ${document.getElementById('checkoutPostcode').value.trim()}`
        : 'Collection from store';

    try {
        if (supabaseClient) {
            const { data: orderData, error: orderError } = await supabaseClient
                .from('orders')
                .insert({
                    user_id: currentUser.id,
                    total_amount: totalAmount,
                    status: 'pending',
                    payment_method: checkoutDeliveryMethod === 'delivery' ? 'Online - Delivery' : 'Online - Collection',
                    notes: deliveryNote
                })
                .select()
                .single();
            if (orderError) throw orderError;

            const orderItemsPayload = lineItems.map(li => ({
                order_id: orderData.id,
                product_id: li.product_id,
                quantity: li.quantity,
                unit_price: li.price
            }));
            const { error: itemsError } = await supabaseClient.from('order_items').insert(orderItemsPayload);
            if (itemsError) throw itemsError;

            for (const ci of cartItems) {
                const p = productsCache.find(x => x.id === ci.productId);
                if (p) {
                    await supabaseClient.from('products').update({ stock_quantity: Math.max(0, p.stock_quantity - ci.quantity) }).eq('id', p.id);
                }
            }

            cartItems = [];
            saveCart();
            closeModal('checkoutModal');
            await loadProducts();
            await loadOrders();
            loadDashboard();

        } else {
            const order = {
                id: generateId('o'),
                user_id: currentUser.id,
                total_amount: totalAmount,
                status: 'pending',
                payment_method: checkoutDeliveryMethod === 'delivery' ? 'Online - Delivery' : 'Online - Collection',
                notes: deliveryNote,
                line_items: lineItems,
                created_at: new Date().toISOString()
            };

            const allOrders = readStore('ri_orders');
            allOrders.unshift(order);
            writeStore('ri_orders', allOrders);

            for (const ci of cartItems) {
                const p = productsCache.find(x => x.id === ci.productId);
                if (p) p.stock_quantity = Math.max(0, p.stock_quantity - ci.quantity);
            }
            writeStore('ri_products', productsCache);

            cartItems = [];
            saveCart();
            closeModal('checkoutModal');

            ordersCache = isAdmin ? readStore('ri_orders') : readStore('ri_orders').filter(o => o.user_id === currentUser.id);
            renderOrders(ordersCache);
            renderProducts(productsCache);
            loadDashboard();
        }

        showToast(`Order placed! Total: £${totalAmount.toFixed(2)}`, 'success');
        document.querySelector('[data-tab="orders"]').click();

    } catch (err) { showToast(`Checkout error: ${err.message}`, 'error'); }
}

// ============================================================
// ORDER LINE ITEMS VIEWER
// ============================================================

async function viewOrderItems(orderId) {
    const order = ordersCache.find(o => o.id === orderId);
    if (!order) { showToast('Order not found.', 'error'); return; }

    let items = [];

    if (supabaseClient) {
        // Fetch from order_items table with product info
        const { data, error } = await supabaseClient
            .from('order_items')
            .select('*, products(name, sku)')
            .eq('order_id', orderId);
        if (error) { showToast(`Error: ${error.message}`, 'error'); return; }
        items = (data || []).map(oi => ({
            name: oi.products?.name || 'Unknown',
            sku: oi.products?.sku || '—',
            price: oi.unit_price,
            quantity: oi.quantity,
            line_total: oi.subtotal || (oi.unit_price * oi.quantity)
        }));
    } else {
        // Local fallback — use line_items stored on order
        if (!order.line_items) { showToast('No item details available.', 'info'); return; }
        items = order.line_items;
    }

    if (!items.length) { showToast('No item details available.', 'info'); return; }

    const body = document.getElementById('orderDetailBody');
    document.getElementById('orderDetailTitle').textContent = `Order ${order.id.toString().slice(0, 8)}…`;
    body.innerHTML = `
        <table class="data-table" style="margin-bottom:16px">
            <thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead>
            <tbody>
                ${items.map(li => `
                    <tr>
                        <td>${esc(li.name)}</td>
                        <td style="font-family:var(--font-mono);font-size:0.78rem">${esc(li.sku)}</td>
                        <td>£${Number(li.price).toFixed(2)}</td>
                        <td>${li.quantity}</td>
                        <td style="font-weight:600">£${Number(li.line_total).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div style="text-align:right;font-size:1.1rem;font-weight:700;color:var(--color-accent)">
            Order Total: £${Number(order.total_amount).toFixed(2)}
        </div>`;
    openModal('orderDetailModal');
}

// ============================================================
// DASHBOARD
// ============================================================

function loadDashboard() {
    if (isAdmin) {
        // Admin dashboard
        document.getElementById('statProducts').textContent = productsCache.length;
        document.getElementById('statCustomers').textContent = customersCache.length;
        document.getElementById('statOrders').textContent = ordersCache.length;
        const rev = ordersCache.reduce((s, o) => s + Number(o.total_amount || 0), 0);
        document.getElementById('statRevenue').textContent = `£${rev.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;

        // Set admin email in sidebar
        const emailEl = document.getElementById('adminSidebarEmail');
        if (emailEl && currentUser) emailEl.textContent = currentUser.email || '';

        renderAdminDashboardCards();
    } else {
        // Customer dashboard
        const sp = document.getElementById('statProductsC');
        const so = document.getElementById('statOrdersC');
        const sr = document.getElementById('statRevenueC');
        if (sp) sp.textContent = productsCache.length;
        if (so) so.textContent = ordersCache.length;
        const rev = ordersCache.reduce((s, o) => s + Number(o.total_amount || 0), 0);
        if (sr) sr.textContent = `£${rev.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
    }
}

// ─── Admin sidebar view switching ─────────────────────────────
function switchAdminView(view) {
    // Toggle buttons
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.adminView === view);
    });
    // Toggle views
    document.querySelectorAll('.admin-view').forEach(v => {
        v.classList.toggle('active', v.id === `adminView-${view}`);
    });
    // Render full views on demand
    if (view === 'orders') renderAdminOrdersFull();
    if (view === 'stock') renderAdminStockFull();
    if (view === 'customers') renderAdminCustomersFull();
}

// ─── Admin dashboard overview cards ───────────────────────────
function renderAdminDashboardCards() {
    // Stock preview (top 6 products by lowest stock)
    const stockEl = document.getElementById('dashStockPreview');
    if (stockEl) {
        const sorted = [...productsCache].sort((a, b) => a.stock_quantity - b.stock_quantity).slice(0, 6);
        stockEl.innerHTML = sorted.length ? sorted.map(p => `
            <div class="dash-row">
                <span class="dash-row-name">${esc(p.name)}</span>
                <span class="dash-row-value">${p.stock_quantity}</span>
            </div>
        `).join('') : '<div class="dash-empty">No products yet</div>';
    }

    // Recent orders preview (latest 5)
    const ordersEl = document.getElementById('dashOrdersPreview');
    if (ordersEl) {
        const recent = [...ordersCache].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
        ordersEl.innerHTML = recent.length ? recent.map(o => `
            <div class="dash-row">
                <span class="dash-row-name">Order ${esc((o.id || '').substring(0, 8))}…</span>
                <span class="dash-row-value">£${Number(o.total_amount || 0).toFixed(2)}</span>
                <button class="dash-row-link" onclick="document.querySelector('[data-tab=orders]').click()">View</button>
            </div>
        `).join('') : '<div class="dash-empty">No orders yet</div>';
    }

    // Order tracking preview
    const trackEl = document.getElementById('dashTrackingPreview');
    if (trackEl) {
        const tracked = [...ordersCache].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
        trackEl.innerHTML = tracked.length ? tracked.map(o => `
            <div class="dash-row">
                <span class="dash-row-name">Order ${esc((o.id || '').substring(0, 8))}…</span>
                <span class="dash-row-status ${o.status || 'pending'}">${cap(o.status || 'pending')}</span>
            </div>
        `).join('') : '<div class="dash-empty">No orders yet</div>';
    }

    // Top customers preview (top 5 by spending)
    const loyaltyEl = document.getElementById('dashLoyaltyPreview');
    if (loyaltyEl) {
        const topCustomers = [...customersCache].sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0)).slice(0, 5);
        loyaltyEl.innerHTML = topCustomers.length ? topCustomers.map((c, i) => `
            <div class="dash-row">
                <span class="dash-row-rank">${i + 1}</span>
                <span class="dash-row-name">${esc(c.full_name || c.email)}</span>
                <span class="dash-row-value">£${Number(c.total_spent || 0).toFixed(2)}</span>
            </div>
        `).join('') : '<div class="dash-empty">No customers yet</div>';
    }
}

// ─── Full views for sidebar panels ────────────────────────────
function renderAdminOrdersFull() {
    const el = document.getElementById('dashOrdersFull');
    if (!el) return;
    const sorted = [...ordersCache].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (!sorted.length) { el.innerHTML = '<div class="dash-empty">No orders yet</div>'; return; }
    el.innerHTML = `<table class="data-table"><thead><tr>
        <th>Order ID</th><th>Total</th><th>Status</th><th>Date</th>
    </tr></thead><tbody>${sorted.map(o => `<tr>
        <td style="font-family:var(--font-mono);font-size:0.8rem">${esc((o.id||'').substring(0,12))}…</td>
        <td>£${Number(o.total_amount||0).toFixed(2)}</td>
        <td><span class="dash-row-status ${o.status||'pending'}">${cap(o.status||'pending')}</span></td>
        <td>${new Date(o.created_at).toLocaleDateString('en-GB')}</td>
    </tr>`).join('')}</tbody></table>`;
}

function renderAdminStockFull() {
    const el = document.getElementById('dashStockFull');
    if (!el) return;
    const sorted = [...productsCache].sort((a, b) => a.stock_quantity - b.stock_quantity);
    if (!sorted.length) { el.innerHTML = '<div class="dash-empty">No products yet</div>'; return; }
    el.innerHTML = `<table class="data-table"><thead><tr>
        <th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Price</th>
    </tr></thead><tbody>${sorted.map(p => `<tr>
        <td>${esc(p.name)}</td>
        <td style="font-family:var(--font-mono);font-size:0.8rem">${esc(p.sku)}</td>
        <td>${esc(p.category)}</td>
        <td>
            <div class="stock-controls">
                <button class="stock-btn" onclick="adjustStock('${p.id}', -1)">−</button>
                <span class="stock-value" style="color:${p.stock_quantity < 5 ? 'var(--color-danger)' : p.stock_quantity < 15 ? 'var(--color-warning)' : 'var(--color-accent)'}">${p.stock_quantity}</span>
                <button class="stock-btn" onclick="adjustStock('${p.id}', 1)">+</button>
            </div>
        </td>
        <td>£${Number(p.price).toFixed(2)}</td>
    </tr>`).join('')}</tbody></table>`;
}

function renderAdminCustomersFull() {
    const el = document.getElementById('dashCustomersFull');
    if (!el) return;
    if (!customersCache.length) { el.innerHTML = '<div class="dash-empty">No customers yet</div>'; return; }
    const sorted = [...customersCache].sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0));
    el.innerHTML = `<table class="data-table"><thead><tr>
        <th>#</th><th>Name</th><th>Email</th><th>Joined</th><th>Orders</th><th>Total Spent</th>
    </tr></thead><tbody>${sorted.map((c, i) => `<tr>
        <td>${i + 1}</td>
        <td>${esc(c.full_name || 'N/A')}</td>
        <td style="font-size:0.82rem">${esc(c.email)}</td>
        <td>${new Date(c.joined_at).toLocaleDateString('en-GB')}</td>
        <td style="font-family:var(--font-mono)">${c.total_orders || 0}</td>
        <td>£${Number(c.total_spent || 0).toFixed(2)}</td>
    </tr>`).join('')}</tbody></table>`;
}



// ============================================================
// UTILITIES
// ============================================================

function esc(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
