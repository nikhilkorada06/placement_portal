const getCloudinaryConfig = () => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in frontend/.env');
    }

    return { cloudName, uploadPreset };
};

export const uploadResumeToCloudinary = (file, userId, onProgress) => {
    return new Promise((resolve, reject) => {
        try {
            const { cloudName, uploadPreset } = getCloudinaryConfig();
            const isPdf = file.type === 'application/pdf';
            const resourceType = isPdf ? 'image' : 'raw';
            const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            formData.append('folder', `resumes/${userId}`);
            formData.append('public_id', `${userId}_${Date.now()}`);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', endpoint);

            xhr.upload.onprogress = (event) => {
                if (!event.lengthComputable || !onProgress) return;
                const progress = (event.loaded / event.total) * 100;
                onProgress(progress);
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const result = JSON.parse(xhr.responseText);
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        format: result.format,
                        resourceType: result.resource_type || resourceType,
                    });
                    return;
                }

                let message = 'Failed to upload to Cloudinary';
                try {
                    const parsed = JSON.parse(xhr.responseText);
                    message = parsed?.error?.message || message;
                } catch {
                    // no-op
                }
                reject(new Error(message));
            };

            xhr.onerror = () => reject(new Error('Network error while uploading to Cloudinary'));
            xhr.send(formData);
        } catch (error) {
            reject(error);
        }
    });
};

export const uploadPdfToCloudinary = (file, folder, onProgress) => {
    return new Promise((resolve, reject) => {
        try {
            const { cloudName, uploadPreset } = getCloudinaryConfig();
            const resourceType = 'image'; // Cloudinary treats PDFs under 'image'
            const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            formData.append('folder', folder);
            formData.append('public_id', `${Date.now()}_${file.name.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_').trim()}`);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', endpoint);

            xhr.upload.onprogress = (event) => {
                if (!event.lengthComputable || !onProgress) return;
                const progress = (event.loaded / event.total) * 100;
                onProgress(progress);
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const result = JSON.parse(xhr.responseText);
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        format: result.format,
                        resourceType: result.resource_type || resourceType,
                    });
                    return;
                }

                let message = 'Failed to upload PDF to Cloudinary';
                try {
                    const parsed = JSON.parse(xhr.responseText);
                    message = parsed?.error?.message || message;
                } catch {
                    // no-op
                }
                reject(new Error(message));
            };

            xhr.onerror = () => reject(new Error('Network error while uploading to Cloudinary'));
            xhr.send(formData);
        } catch (error) {
            reject(error);
        }
    });
};

export default {
    uploadResumeToCloudinary,
    uploadPdfToCloudinary,
};
