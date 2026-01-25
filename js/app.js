// --- SUPABASE CONFIG ---
const SUPABASE_URL = 'https://glnzltetqxpvxsoqwerz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbnpsdGV0cXhwdnhzb3F3ZXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTkxMjgsImV4cCI6MjA4NDc3NTEyOH0.9frBI-FbIHf2q-ZzOGsGbEOkG7n8t5aCM6VP4RyRiWo';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- AUTO-REDIRECT LOGIC ---
(async function checkAuthRedirect() {
    // Only run this check on the main index.html (landing page)
    if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/' && !window.location.href.endsWith('/')) {
        return;
    }

    // Check local session first for speed
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        console.log('Session found, checking role...');
        const { data: profile } = await _supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (profile) {
            console.log('Redirecting to dashboard...');
            if (profile.role === 'admin') window.location.href = 'admin_dashboard.html';
            else window.location.href = 'client_dashboard.html';
        }
    }
})();

// --- PREMIUM UNIFIED MODAL SYSTEM ---
function injectModalHTML() {
    if (document.getElementById('ui-modal')) return;
    const modalHTML = `
    <div id="ui-modal" class="modal-overlay">
        <div class="modal-container">
            <div id="modal-icon-container" class="modal-icon-wrapper"></div>
            <h3 id="ui-modal-title" class="modal-title"></h3>
            <p id="ui-modal-msg" class="modal-message"></p>
            <div id="modal-actions" class="modal-btns">
                <button id="modal-cancel" class="modal-btn btn-cancel hidden">Cancel</button>
                <button id="modal-confirm" class="modal-btn btn-confirm">OK</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function showNiceModal({ title, message, type = 'info', confirmText = 'OK', cancelText = null }) {
    injectModalHTML();
    return new Promise((resolve) => {
        const modal = document.getElementById('ui-modal');
        const titleEl = document.getElementById('ui-modal-title');
        const msgEl = document.getElementById('ui-modal-msg');
        const iconContainer = document.getElementById('modal-icon-container');
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');

        modal.className = 'modal-overlay active ' + `modal-${type}`;
        titleEl.innerText = title;
        msgEl.innerText = message;
        confirmBtn.innerText = confirmText;

        const icons = {
            success: '<i class="fa-solid fa-circle-check"></i>',
            danger: '<i class="fa-solid fa-triangle-exclamation"></i>',
            warning: '<i class="fa-solid fa-circle-exclamation"></i>',
            info: '<i class="fa-solid fa-circle-info"></i>'
        };
        iconContainer.innerHTML = icons[type] || icons.info;

        const btnColors = {
            success: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20',
            danger: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20',
            warning: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
            info: 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'
        };
        confirmBtn.className = `modal-btn text-white shadow-lg transition-all ${btnColors[type] || btnColors.info}`;

        if (cancelText) {
            cancelBtn.innerText = cancelText;
            cancelBtn.className = 'modal-btn btn-cancel';
            cancelBtn.classList.remove('hidden');
        } else {
            cancelBtn.classList.add('hidden');
        }

        confirmBtn.onclick = () => { modal.classList.remove('active'); resolve(true); };
        cancelBtn.onclick = () => { modal.classList.remove('active'); resolve(false); };
    });
}

// --- OTP AUTO-FOCUS ---
function setupOtpAutoFocus(fieldsClass) {
    const fields = document.querySelectorAll(fieldsClass);
    fields.forEach((field, index) => {
        field.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < fields.length - 1) {
                fields[index + 1].focus();
            }
        });
        field.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value.length === 0 && index > 0) {
                fields[index - 1].focus();
            }
        });
    });
}
setupOtpAutoFocus('.otp-field');
setupOtpAutoFocus('.reset-otp-field');

// --- SIGN IN LOGIC ---
async function handleSignin(e) {
    e.preventDefault();
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    const btn = document.getElementById('signin-btn');
    const originalText = btn.innerText;

    btn.innerText = "VERIFYING IDENTITY...";
    btn.disabled = true;

    try {
        const { data, error } = await _supabase.auth.signInWithPassword({
            email, password
        });

        if (error) throw error;
        handleDashboardRedirect();

    } catch (error) {
        console.error('Sign in error:', error);
        showNiceModal({ title: 'Authentication Error', message: error.message, type: 'danger' });
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// --- SIGN UP LOGIC ---
async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const address = document.getElementById('signup-address').value.trim();
    const age = parseInt(document.getElementById('signup-age').value);
    const btn = document.getElementById('signup-btn');

    btn.innerText = "INITIALIZING CORE...";
    btn.disabled = true;

    try {
        const { data, error } = await _supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    address: address,
                    age: age,
                    role: 'client'
                }
            }
        });

        if (error) throw error;

        console.log('Signup Response:', data);

        // If a session is returned immediately, it means "Confirm Email" is OFF in your dashboard
        if (data.session) {
            showNiceModal({
                title: 'Instant Access',
                message: 'Dashboard settings allowed instant login. Redirecting...',
                type: 'success'
            });
            handleDashboardRedirect();
        } else {
            // This is the OTP path
            document.getElementById('pending-email').innerText = email;
            toggleAuthMode('otp');
            showNiceModal({
                title: 'Code Sent',
                message: 'A 6-digit verification code has been dispatched to your email.',
                type: 'success'
            });
        }

    } catch (error) {
        console.error('Sign up error:', error);
        showNiceModal({ title: 'Signup Error', message: error.message, type: 'danger' });
    } finally {
        btn.innerText = "Initialize Account";
        btn.disabled = false;
    }
}

async function verifySignupOtp() {
    const token = Array.from(document.querySelectorAll('.otp-field')).map(i => i.value).join('');
    const email = document.getElementById('pending-email').innerText;
    const btn = document.getElementById('otp-btn');

    if (token.length < 6) return showNiceModal({ title: 'Security Alert', message: '6-digit verification code required.', type: 'warning' });

    btn.innerText = "VALIDATING TOKEN...";
    btn.disabled = true;

    try {
        const { data, error } = await _supabase.auth.verifyOtp({
            email: email,
            token: token,
            type: 'signup'
        });

        if (error) throw error;

        showNiceModal({ title: 'Email Verified', message: 'Identity confirmed. Welcome!', type: 'success' });
        handleDashboardRedirect();

    } catch (error) {
        console.error('OTP verification error:', error);
        showNiceModal({ title: 'Verification Failed', message: error.message, type: 'danger' });
    } finally {
        btn.innerText = "Confirm Verification";
        btn.disabled = false;
    }
}

async function resendSignupOtp() {
    const email = document.getElementById('pending-email').innerText;
    try {
        const { error } = await _supabase.auth.resend({
            type: 'signup',
            email: email
        });
        if (error) throw error;
        showNiceModal({ title: 'Code Sent', message: 'New verification code sent! Check your email.', type: 'success' });
    } catch (error) {
        console.error('Resend error:', error);
        showNiceModal({ title: 'Resend Failed', message: error.message, type: 'danger' });
    }
}

// --- FORGOT PASSWORD LOGIC ---
async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    const btn = document.getElementById('forgot-btn');

    btn.innerText = "DISPATCHING RECOVERY...";
    btn.disabled = true;

    try {
        const { error } = await _supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;

        showNiceModal({ title: 'Recovery Link Sent', message: 'Recovery code sent! Check your email.', type: 'success' });
        document.getElementById('pending-reset-email').innerText = email;
        toggleAuthMode('reset-otp');

    } catch (error) {
        console.error('Password reset error:', error);
        showNiceModal({ title: 'Recovery Error', message: error.message, type: 'danger' });
    } finally {
        btn.innerText = "Begin Recovery";
        btn.disabled = false;
    }
}

async function verifyResetOtp() {
    const token = Array.from(document.querySelectorAll('.reset-otp-field')).map(i => i.value).join('');
    const email = document.getElementById('pending-reset-email').innerText;
    const btn = document.getElementById('reset-otp-btn');

    if (token.length < 6) return showNiceModal({ title: 'Format Error', message: 'Please enter the complete 6-digit code.', type: 'warning' });

    btn.innerText = "VERIFYING...";
    btn.disabled = true;

    try {
        const { data, error } = await _supabase.auth.verifyOtp({
            email: email,
            token: token,
            type: 'recovery'
        });

        if (error) throw error;

        showNiceModal({ title: 'Code Verified', message: 'Now set your new password.', type: 'success' });
        toggleAuthMode('update');

    } catch (error) {
        console.error('OTP verification error:', error);
        showNiceModal({ title: 'Verification Failed', message: error.message, type: 'danger' });
    } finally {
        btn.innerText = "Verify Code";
        btn.disabled = false;
    }
}

async function resendResetOtp() {
    const email = document.getElementById('pending-reset-email').innerText;
    try {
        const { error } = await _supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        showNiceModal({ title: 'Code Resent', message: 'New recovery code sent! Check your email.', type: 'success' });
    } catch (error) {
        console.error('Resend error:', error);
        showNiceModal({ title: 'Resend Failed', message: error.message, type: 'danger' });
    }
}

async function handleUpdatePassword(e) {
    e.preventDefault();
    const newPassword = document.getElementById('update-password').value;
    const btn = document.getElementById('update-btn');

    btn.innerText = "APPLYING UPGRADE...";
    btn.disabled = true;

    try {
        const { error } = await _supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        showNiceModal({ title: 'Security Upgrade', message: 'Successful: Login with your new password.', type: 'success' });
        toggleAuthMode('signin');

    } catch (error) {
        console.error('Password update error:', error);
        showNiceModal({ title: 'Update Failed', message: error.message, type: 'danger' });
    } finally {
        btn.innerText = "Apply Changes";
        btn.disabled = false;
    }
}

// --- UI CORE ---
async function showView(id) {
    if (id === 'login') {
        const el = document.getElementById('view-login');
        if (el) {
            el.classList.add('active');
            document.body.style.overflow = 'hidden';

            const { data: { session } } = await _supabase.auth.getSession();
            if (session) {
                handleDashboardRedirect();
                return;
            }
            toggleAuthMode('signin');
        }
    } else {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const el = document.getElementById('view-' + id);
        if (el) el.classList.add('active');
        document.body.style.overflow = 'auto';
        document.getElementById('view-login').classList.remove('active');
    }
}

function toggleAuthMode(mode) {
    const modes = ['signin', 'signup', 'forgot', 'otp', 'reset-otp', 'update'];
    modes.forEach(m => {
        const el = document.getElementById(m === 'update' ? 'form-update-password' : `form-${m}`);
        if (el) el.classList.add('hidden');
    });

    document.getElementById('view-otp')?.classList.add('hidden');
    document.getElementById('view-reset-otp')?.classList.add('hidden');

    if (mode === 'otp') document.getElementById('view-otp')?.classList.remove('hidden');
    else if (mode === 'reset-otp') document.getElementById('view-reset-otp')?.classList.remove('hidden');
    else if (mode === 'update') document.getElementById('form-update-password')?.classList.remove('hidden');
    else document.getElementById(`form-${mode}`)?.classList.remove('hidden');
}

async function handleDashboardRedirect() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) return showView('login');

    const { data: profile } = await _supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (profile?.role === 'admin') {
        window.location.href = 'admin_dashboard.html';
    } else {
        window.location.href = 'client_dashboard.html';
    }
}

async function handleSignOut() {
    await _supabase.auth.signOut();
    window.location.reload();
}

function openLightbox(src) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox-modal').classList.add('active');
}

function closeLightbox() {
    document.getElementById('lightbox-modal').classList.remove('active');
}

function togglePasswordVisibility(id) {
    const input = document.getElementById(id);
    const button = input.nextElementSibling;
    const icon = button?.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.className = 'fa-solid fa-eye-slash text-sm';
    } else {
        input.type = 'password';
        if (icon) icon.className = 'fa-solid fa-eye text-sm';
    }
}

// --- PREMIUM UI LOGIC ---
function initPremiumUI() {
    // Scroll Progress
    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        const bar = document.getElementById('scroll-progress');
        if (bar) bar.style.width = scrolled + "%";

        const backToTop = document.getElementById('back-to-top');
        if (backToTop) {
            if (winScroll > 300) {
                backToTop.classList.remove('opacity-0', 'invisible');
                backToTop.classList.add('opacity-100', 'visible');
            } else {
                backToTop.classList.add('opacity-0', 'invisible');
                backToTop.classList.remove('opacity-100', 'visible');
            }
        }
    });

    // Intersection Observer for animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { entry.target.classList.toggle('revealed', entry.isIntersecting); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.view-section').forEach(v => observer.observe(v));
}

// --- DATA HUB ---
async function fetchPublicReviews() {
    const container = document.getElementById('testimonials-container');
    if (!container) return;
    container.innerHTML = Array(3).fill(0).map(() => `<div class="h-64 rounded-[32px] skeleton"></div>`).join('');
    try {
        const { data, error } = await _supabase.from('reviews').select('*, profiles:user_id (full_name)').eq('is_approved', true).order('created_at', { ascending: false }).limit(6);
        if (error) throw error;
        if (!data || data.length === 0) {
            container.innerHTML = `<div class="col-span-full text-center py-12"><p class="text-slate-400 text-sm italic">"Be the first to leave a review!"</p></div>`;
            return;
        }
        container.innerHTML = data.map(r => `
            <div class="bg-white p-10 rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.04)] border border-slate-50 flex flex-col group hover:-translate-y-2 transition-all duration-500" data-aos="fade-up">
                <div class="flex items-center gap-1 text-amber-400 mb-8">
                    ${Array(r.rating || 5).fill('<i class="fa-solid fa-star text-[10px]"></i>').join('')}
                </div>
                
                <p class="text-slate-600 font-medium italic mb-10 text-sm leading-relaxed flex-grow tracking-tight break-words overflow-hidden">
                    "${r.comment || 'Exceptional service and professional results. VH Autoglass is my top choice for mobile repairs.'}"
                </p>

                ${(function () {
                try {
                    const photoData = r.photo_urls || '[]';
                    const urls = Array.isArray(photoData) ? photoData : JSON.parse(photoData);
                    if (urls && urls.length > 0) {
                        return `
                                <div class="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
                                    ${urls.map(item => {
                            const url = typeof item === 'object' ? item.url : item;
                            return `<img src="${url}" class="w-20 h-20 rounded-2xl object-cover cursor-pointer hover:scale-105 transition-transform shadow-sm border border-slate-100 flex-shrink-0" onclick="openLightbox('${url}')">`;
                        }).join('')}
                                </div>
                            `;
                    }
                } catch (e) { return ''; }
                return '';
            })()}

                <div class="h-px bg-slate-50 w-full mb-8"></div>

                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-[#5b21b6] flex items-center justify-center text-white font-black text-sm shadow-xl shadow-purple-500/20 group-hover:scale-110 transition-transform">
                        ${(r.profiles?.full_name || 'V').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p class="font-black text-[11px] uppercase tracking-[0.2em] text-slate-800 mb-0.5">${r.profiles?.full_name || 'Anonymous Client'}</p>
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-jakarta">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified Mission
                        </p>
                    </div>
                </div>
            </div>`).join('');
    } catch (error) { console.error('Error fetching reviews:', error); container.innerHTML = ''; }
}

async function fetchDynamicPortfolio() {
    const container = document.getElementById('project-container');
    if (!container) return;

    // Show skeletons
    container.innerHTML = Array(4).fill(0).map(() => `
        <div class="aspect-square rounded-[32px] skeleton"></div>
    `).join('');

    try {
        const { data, error } = await _supabase.from('portfolio').select('*').order('display_order', { ascending: true });
        if (error) throw error;
        dynamicProjects = data.map(item => ({ img: item.image_url, rating: 5, client: item.title, comment: item.description || 'Professional service' }));
        renderProjects();
    } catch (error) { console.error('Error fetching portfolio:', error); container.innerHTML = ''; }
}





let currentPage = 1;
const imagesPerPage = 8;
let dynamicProjects = [];

function renderProjects() {
    const container = document.getElementById('project-container');
    const pagination = document.getElementById('project-pagination');
    if (!container) return;
    container.innerHTML = '';

    if (pagination) pagination.innerHTML = '';

    if (dynamicProjects.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-12"><p class="text-slate-400 text-sm">Our work is coming soon!</p></div>`;
        return;
    }

    const start = (currentPage - 1) * imagesPerPage;
    const currentProjects = dynamicProjects.slice(start, start + imagesPerPage);

    currentProjects.forEach((proj, idx) => {
        const div = document.createElement('div');
        div.className = "group relative aspect-square overflow-hidden rounded-[32px] bg-slate-200 cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-700 hover:-translate-y-2";
        div.setAttribute('data-aos', 'zoom-in');
        div.setAttribute('data-aos-delay', idx * 50);
        div.innerHTML = `
            <img src="${proj.img}" class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" loading="lazy" />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-910 via-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-8">
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-50 group-hover:scale-100">
                    <i class="fa-solid fa-magnifying-glass-plus text-white text-xl"></i>
                </div>
                <span class="text-amber-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Project Complete</span>
                <h4 class="text-white font-black text-sm uppercase tracking-tight leading-tight">${proj.client}</h4>
                <p class="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                    <i class="fa-solid fa-expand text-[8px]"></i> Click for full view
                </p>
            </div>
        `;
        div.onclick = () => openLightbox(proj.img);
        container.appendChild(div);
    });

    const totalPages = Math.ceil(dynamicProjects.length / imagesPerPage);
    if (pagination && totalPages > 1) {
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = `pagination-btn ${currentPage === i ? 'active' : ''}`;
            btn.innerText = i;
            btn.onclick = () => { currentPage = i; renderProjects(); window.scrollTo({ top: container.offsetTop - 100, behavior: 'smooth' }); };
            pagination.appendChild(btn);
        }
    }
}

async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    updateNavButton(session);
    _supabase.auth.onAuthStateChange((event, session) => {
        updateNavButton(session);
    });
}

function updateNavButton(session) {
    const loginBtn = document.getElementById('nav-login-btn');
    const heroBtn = document.getElementById('hero-book-btn');
    if (loginBtn) {
        loginBtn.textContent = session ? 'Dashboard' : 'Login';
        loginBtn.onclick = () => session ? handleDashboardRedirect() : showView('login');
    }
    if (heroBtn) {
        heroBtn.textContent = session ? 'Go to Dashboard' : 'Book Now';
        heroBtn.onclick = () => session ? handleDashboardRedirect() : showView('login');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initPremiumUI();
    fetchDynamicPortfolio();
    fetchPublicReviews();
    checkSession();
    if (typeof AOS !== 'undefined') AOS.init({ duration: 1200, once: true, easing: 'ease-out-cubic' });
});
