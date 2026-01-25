// ImageKit Configuration for VH Autoglass
// Replace with your actual ImageKit credentials

const IMAGEKIT_CONFIG = {
    urlEndpoint: 'https://ik.imagekit.io/unpwgkuq5/',
    publicKey: 'public_utHDhmA4nyT82Zvwu10e88iiVQ4=',
    authenticationEndpoint: null
};

// Upload Configuration
const UPLOAD_CONFIG = {
    folder: '/vh-autoglass',
    useUniqueFileName: true,
    tags: ['booking', 'portfolio'],
    isPrivateFile: false,
    customCoordinates: null
};

// Transformation Presets
const IMAGE_TRANSFORMS = {
    thumbnail: 'tr=w-200,h-200,c-at_max,f-auto,q-80',
    medium: 'tr=w-600,h-400,c-at_max,f-auto,q-85',
    large: 'tr=w-1200,h-800,c-at_max,f-auto,q-90',
    optimized: 'tr=f-auto,q-auto'
};

// Helper function to add transformations to URL
function getTransformedUrl(url, transform = 'optimized') {
    if (!url) return '';
    const transformStr = IMAGE_TRANSFORMS[transform] || transform;
    return url.includes('?') ? `${url}&${transformStr}` : `${url}?${transformStr}`;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IMAGEKIT_CONFIG, UPLOAD_CONFIG, IMAGE_TRANSFORMS, getTransformedUrl };
}
