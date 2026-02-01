 // Supabase Configuration
const SUPABASE_URL = 'https://atcfrcolbuikjnsoujzw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mUDZkzcq09gllPPjkG8pGQ_k6APV_gv';

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other modules
export { supabaseClient as supabase };

// Check authentication state
export async function checkAuth() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Auth check error:', error);
            return null;
        }
        
        return session?.user || null;
    } catch (error) {
        console.error('Auth check failed:', error);
        return null;
    }
}

// Get current user with profile
export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error || !user) {
            return { user: null, profile: null };
        }
        
        // Fetch user profile
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (profileError) {
            console.warn('Profile fetch error:', profileError);
            return { user, profile: null };
        }
        
        return { user, profile };
    } catch (error) {
        console.error('Get current user error:', error);
        return { user: null, profile: null };
    }
}

// Subscribe to auth changes
export function onAuthChange(callback) {
    return supabaseClient.auth.onAuthStateChange((event, session) => {
        callback(event, session?.user || null);
    });
}

// Logout function
export async function logout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        
        // Clear local storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to login
        window.location.href = '/pages/auth/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed. Please try again.');
    }
}

// Utility: Format currency
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(amount);
}

// Utility: Format date
export function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(date);
}

// Utility: Debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export for global use
window.supabaseClient = supabaseClient;
  window.location.href = "/pages/auth/login.html";
};
