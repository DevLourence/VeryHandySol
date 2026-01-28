const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://imvgiqlhpaeotevsffaf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltdmdpcWxocGFlb3RldnNmZmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0Nzg4MjMsImV4cCI6MjA4NTA1NDgyM30.X0n2IadDlJvgWM9gsV9lK0o2qPN1qnI06hZRD6PL3X8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAdmins() {
    const { data, error } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('role', 'admin');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Admins:', data);
    }
}

checkAdmins();
