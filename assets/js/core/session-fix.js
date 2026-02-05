// assets/js/core/session-fix.js
import { supabase } from '../supabase.js';

// Check and restore session on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Session check error:', error);
            localStorage.removeItem('supabase.auth.token');
            return;
        }
        
        // Store session token for persistence
        if (session) {
            localStorage.setItem('supabase.auth.token', session.access_token);
            localStorage.setItem('supabase.auth.refresh', session.refresh_token);
            
            // Force refresh to ensure valid session
            await supabase.auth.refreshSession();
        }
    } catch (error) {
        console.error('Session fix error:', error);
    }
});

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    
    if (session) {
        localStorage.setItem('supabase.auth.token', session.access_token);
        localStorage.setItem('supabase.auth.refresh', session.refresh_token);
    } else {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.refresh');
    }
});
