// ImageKit + Supabase Integration Example
// Upload images to ImageKit, save URLs to Supabase

// ============================================
// CONFIGURATION
// ============================================

const IMAGEKIT_CONFIG = {
    urlEndpoint: 'https://ik.imagekit.io/unpwgkuq5/',
    publicKey: 'public_utHDhmA4nyT82Zvwu10e88iiVQ4='
};

// ============================================
// UPLOAD TO IMAGEKIT
// ============================================

async function uploadToImageKit(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);
    formData.append('folder', '/vh-autoglass');

    const response = await fetch(`${IMAGEKIT_CONFIG.urlEndpoint}api/v1/files/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${btoa(IMAGEKIT_CONFIG.publicKey + ':')}`
        },
        body: formData
    });

    const data = await response.json();
    return data.url; // Returns ImageKit URL
}

// ============================================
// EXAMPLE 1: BOOKING WITH PHOTOS
// ============================================

async function createBookingWithPhotos() {
    // 1. Upload photos to ImageKit
    const fileInput = document.getElementById('photo-upload');
    const photoUrls = [];

    for (const file of fileInput.files) {
        const url = await uploadToImageKit(file);
        photoUrls.push(url);
    }

    // 2. Save booking to Supabase with ImageKit URLs
    const { data, error } = await _supabase
        .from('bookings')
        .insert([{
            user_id: currentUser.id,
            service_type: 'Windshield Replacement',
            photo_urls: photoUrls,  // ImageKit URLs stored in Supabase
            location: 'Downtown',
            status: 'pending'
        }])
        .select();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Booking created:', data);
    }
}

// ============================================
// EXAMPLE 2: PORTFOLIO IMAGE UPLOAD
// ============================================

async function addPortfolioImage() {
    const fileInput = document.getElementById('portfolio-upload');
    const file = fileInput.files[0];

    // 1. Upload to ImageKit
    const imageUrl = await uploadToImageKit(file);

    // 2. Save to Supabase
    const { data, error } = await _supabase
        .from('portfolio')
        .insert([{
            title: 'Windshield Replacement Project',
            description: 'Professional windshield replacement',
            image_url: imageUrl,  // ImageKit URL
            service_type: 'Auto Glass',
            is_featured: true
        }])
        .select();

    if (!error) {
        alert('✅ Portfolio image added!');
    }
}

// ============================================
// EXAMPLE 3: DISPLAY IMAGES FROM SUPABASE
// ============================================

async function displayBookings() {
    // Fetch from Supabase
    const { data: bookings } = await _supabase
        .from('bookings')
        .select('*')
        .eq('user_id', currentUser.id);

    // Display with ImageKit transformations
    const html = bookings.map(booking => `
        <div class="booking-card">
            <h3>${booking.service_type}</h3>
            <div class="photos">
                ${booking.photo_urls.map(url => `
                    <img src="${url}?tr=w-300,h-200,c-at_max,f-auto" 
                         alt="Booking photo"
                         class="rounded-lg">
                `).join('')}
            </div>
        </div>
    `).join('');

    document.getElementById('bookings-list').innerHTML = html;
}

// ============================================
// EXAMPLE 4: COMPLETE UPLOAD WIDGET
// ============================================

function setupImageUpload() {
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');
    const preview = document.getElementById('preview');
    let uploadedUrls = [];

    uploadBtn.onclick = () => fileInput.click();

    fileInput.onchange = async (e) => {
        for (const file of e.target.files) {
            // Show loading
            const loader = document.createElement('div');
            loader.className = 'bg-gray-200 animate-pulse h-24 rounded-lg';
            preview.appendChild(loader);

            // Upload to ImageKit
            const url = await uploadToImageKit(file);
            uploadedUrls.push(url);

            // Show preview with thumbnail
            loader.outerHTML = `
                <div class="relative">
                    <img src="${url}?tr=w-150,h-150,c-at_max" 
                         class="w-full h-24 object-cover rounded-lg">
                    <button onclick="removeImage(${uploadedUrls.length - 1})"
                            class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6">
                        ×
                    </button>
                </div>
            `;
        }
    };

    // Save to Supabase when done
    window.saveBooking = async () => {
        const { error } = await _supabase
            .from('bookings')
            .insert([{
                user_id: currentUser.id,
                photo_urls: uploadedUrls,
                // ... other fields
            }]);

        if (!error) alert('✅ Saved!');
    };
}

// ============================================
// HTML EXAMPLE
// ============================================

/*
<div class="upload-section">
    <input type="file" id="file-input" multiple accept="image/*" class="hidden">
    <button id="upload-btn" class="bg-purple-600 text-white px-6 py-3 rounded-lg">
        📸 Upload Photos
    </button>
    <div id="preview" class="grid grid-cols-3 gap-2 mt-4"></div>
    <button onclick="saveBooking()" class="bg-green-600 text-white px-6 py-3 rounded-lg mt-4">
        💾 Save Booking
    </button>
</div>

<div id="bookings-list"></div>

<script src="https://unpkg.com/imagekit-javascript/dist/imagekit.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="imagekit-supabase-integration.js"></script>
*/
