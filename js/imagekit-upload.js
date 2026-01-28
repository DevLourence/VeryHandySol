// ============================================
// IMAGEKIT UPLOAD UTILITY
// Professional media hosting for VeryHandy Solution
// ============================================

// ImageKit Configuration
const IMAGEKIT_CONFIG = {
    urlEndpoint: 'https://ik.imagekit.io/unpwgkuq5/',
    publicKey: 'public_utHDhmA4nyT82Zvwu10e88iiVQ4=',
    privateKey: 'private_r8yZ01QNJLDJ+LfpSNJC5H78I1c=', // Exposed in frontend for standalone HTML support
    uploadEndpoint: 'https://upload.imagekit.io/api/v1/files/upload'
};

// File validation rules
const UPLOAD_RULES = {
    maxFileSize: 32 * 1024 * 1024, // 32MB
    allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    allowedVideoTypes: ['video/mp4', 'video/webm'],
    maxVideoDuration: 60 // seconds
};

/**
 * Validate file before upload
 */
function validateFile(file) {
    if (file.size > UPLOAD_RULES.maxFileSize) {
        return { valid: false, error: `File "${file.name}" exceeds 32MB limit.` };
    }
    const isImage = UPLOAD_RULES.allowedImageTypes.includes(file.type);
    const isVideo = UPLOAD_RULES.allowedVideoTypes.includes(file.type);
    if (!isImage && !isVideo) return { valid: false, error: `File type not supported.` };
    return { valid: true, error: null };
}

/**
 * Get video duration
 */
function getVideoDuration(file) {
    return new Promise((resolve) => {
        if (!file.type.includes('video')) return resolve(0);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => { window.URL.revokeObjectURL(video.src); resolve(video.duration); };
        video.onerror = () => resolve(0);
        video.src = URL.createObjectURL(file);
    });
}

/**
 * Upload single file to ImageKit
 */
/**
 * Upload single file to ImageKit
 */
async function uploadToImageKit(file, folder = '/vh-autoglass/bookings', onProgress = null) {
    if (typeof folder === 'function') {
        onProgress = folder;
        folder = '/vh-autoglass/bookings';
    }
    const validation = validateFile(file);
    if (!validation.valid) throw new Error(validation.error);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();

        formData.append('file', file);
        formData.append('fileName', `${Date.now()}_${file.name}`);
        formData.append('useUniqueFileName', 'true');
        formData.append('folder', folder);

        if (xhr.upload && onProgress) {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    onProgress(percent);
                }
            });
        }

        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        // Return both URL and fileId for future deletion
                        resolve({
                            url: data.url,
                            fileId: data.fileId,
                            name: data.name
                        });
                    } catch (e) {
                        reject(new Error('Invalid ImageKit response'));
                    }
                } else {
                    try {
                        const error = JSON.parse(xhr.responseText);
                        reject(new Error(error.message || `Upload failed (${xhr.status})`));
                    } catch (e) {
                        reject(new Error(`Server error: ${xhr.status}`));
                    }
                }
            }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));

        xhr.open('POST', IMAGEKIT_CONFIG.uploadEndpoint, true);
        xhr.setRequestHeader('Authorization', 'Basic ' + btoa(IMAGEKIT_CONFIG.privateKey + ':'));
        xhr.send(formData);
    });
}

/**
 * Delete a file from ImageKit servers
 */
async function deleteFromImageKit(fileId) {
    if (!fileId) return false;

    try {
        const response = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Basic ' + btoa(IMAGEKIT_CONFIG.privateKey + ':')
            }
        });
        return response.ok;
    } catch (err) {
        console.error('Failed to delete from Cloud:', err);
        return false;
    }
}

/**
 * Upload multiple files with progress tracking
 */
async function uploadMultipleFiles(files, folder = '/vh-autoglass/bookings', onProgress = null) {
    const fileArray = Array.from(files);
    const urls = [];
    const errors = [];

    for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        try {
            if (onProgress) onProgress(i, fileArray.length, file.name, 'uploading', 0);

            const url = await uploadToImageKit(file, folder, (filePercent) => {
                if (onProgress) onProgress(i, fileArray.length, file.name, 'uploading', filePercent);
            });

            urls.push(url);
            if (onProgress) onProgress(i + 1, fileArray.length, file.name, 'completed', 100, url);
        } catch (error) {
            errors.push(`${file.name}: ${error.message}`);
            if (onProgress) onProgress(i + 1, fileArray.length, file.name, 'error', 0, null, error.message);
        }
    }

    if (errors.length > 0 && urls.length === 0) {
        throw new Error(`Upload failed:\n${errors.join('\n')}`);
    }

    return urls;
}

/**
 * Get optimized URL with transformations
 */
function getOptimizedUrl(url, preset = 'optimized') {
    if (!url || !url.includes('imagekit.io')) return url;
    const presets = {
        thumbnail: 'tr=w-200,h-200,c-at_max,f-auto',
        large: 'tr=w-1200,f-auto',
        optimized: 'tr=f-auto,q-80'
    };
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${presets[preset] || presets.optimized}`;
}

// Global Export
if (typeof window !== 'undefined') {
    window.ImageKitUpload = {
        upload: uploadToImageKit, // Alias for convenience
        uploadToImageKit,
        uploadMultipleFiles,
        deleteFromImageKit,
        getOptimizedUrl,
        validateFile
    };
}
