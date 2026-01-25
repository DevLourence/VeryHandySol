
// Follow this setup guide to integrate Resend with Supabase Edge Functions.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ⚠️ SECURITY NOTE: Ideally, keep this in Supabase Secrets (Vault).
// We have hardcoded it here for your convenience to get started immediately.
const RESEND_API_KEY = "re_CYNDWQhL_E2yDhZMG6bjL5WbavawFPe9t";
const SUPABASE_URL = 'https://glnzltetqxpvxsoqwerz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbnpsdGV0cXhwdnhzb3F3ZXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTkxMjgsImV4cCI6MjA4NDc3NTEyOH0.9frBI-FbIHf2q-ZzOGsGbEOkG7n8t5aCM6VP4RyRiWo';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { type, to, name, status, booking_id, details } = await req.json()

        let recipientList = [to];
        let subject = "";
        let htmlContent = "";

        // --- 1. ADMIN NOTIFICATIONS LOGIC ---
        if (type === 'admin_new_booking' || type === 'admin_new_review') {
            // Initialize Supabase Client to fetch Admin Emails
            const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

            const { data: admins, error } = await supabase
                .from('profiles')
                .select('email')
                .eq('role', 'admin');

            if (error || !admins) throw new Error("Failed to fetch admin list");

            // Extract emails and filter out nulls
            recipientList = admins.map(a => a.email).filter(e => e);

            if (recipientList.length === 0) {
                return new Response(JSON.stringify({ message: "No admins found to notify" }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                })
            }
        }

        // --- 2. TEMPLATE SELECTION ---

        // A. ADMIN: NEW BOOKING
        if (type === 'admin_new_booking') {
            subject = `📢 New Booking Request #${booking_id}`;
            htmlContent = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #4f46e5; text-transform: uppercase;">New Job Alert!</h2>
                <p>A new service request has been submitted.</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Client:</strong> ${name}</p>
                    <p><strong>Service:</strong> ${details || 'General Service'}</p>
                    <p><strong>Booking ID:</strong> #${booking_id}</p>
                </div>
                <a href="https://vhautoglass.com/admin_dashboard.html" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Open Admin Dashboard</a>
            </div>`;
        }

        // B. ADMIN: NEW REVIEW
        else if (type === 'admin_new_review') {
            subject = `⭐ New Review Received`;
            htmlContent = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #fbbf24; text-transform: uppercase;">New Feedback!</h2>
                <p>A client has submitted a new review needing approval.</p>
                <div style="background-color: #fffbeb; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
                    <p><strong>Reviewer:</strong> ${name}</p>
                    <p><strong>Content:</strong> "${details}"</p>
                </div>
                <a href="https://vhautoglass.com/admin_dashboard.html" style="background-color: #111827; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Review & Approve</a>
            </div>`;
        }

        // C. CLIENT: STATUS UPDATE (Original Logic)
        else {
            subject = `Update on Booking #${booking_id}`;
            htmlContent = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #4f46e5; text-transform: uppercase;">VH Autoglass</h2>
                <h1>Hello ${name},</h1>
                <p style="font-size: 16px;">Your booking (ID: <strong>${booking_id}</strong>) has been updated.</p>
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">New Status</p>
                <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #111827; text-transform: uppercase;">${status}</p>
                </div>

                <p>Please log in to your client dashboard to view more details.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="font-size: 12px; color: #9ca3af; text-align: center;">VH Autoglass | Mobile Windshield Replacement</p>
            </div>`;
        }


        // --- 3. SEND EMAILS (Batch) ---
        // Resend free tier limits 'to' field array size, so we send one API call per recipient or small batch.
        // For simplicity and reliability in this demo, we'll send a separate request for each admin if needed, 
        // or just pass the array if small (Resend supports multiple recipients).

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'VH Autoglass <onboarding@resend.dev>', // Default Resend test domain
                to: recipientList, // Sends to all admins or single client
                subject: subject,
                html: htmlContent,
            }),
        })

        const data = await res.json()

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
