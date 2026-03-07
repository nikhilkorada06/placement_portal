import {
    ref,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll,
} from 'firebase/storage';
import { storage } from '@config/firebase';
import { STORAGE_PATHS, VALIDATION } from '@config/constants';

// Upload file with progress tracking
export const uploadFile = (file, path, onProgress) => {
    return new Promise((resolve, reject) => {
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) {
                    onProgress(progress);
                }
            },
            (error) => {
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({
                        url: downloadURL,
                        path: uploadTask.snapshot.ref.fullPath,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                    });
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
};

// Upload resume
export const uploadResume = async (file, userId, onProgress) => {
    try {
        // Validate file
        if (!VALIDATION.ALLOWED_RESUME_TYPES.includes(file.type)) {
            throw new Error('Invalid file type. Only PDF and DOC files are allowed.');
        }

        if (file.size > VALIDATION.MAX_FILE_SIZE) {
            throw new Error('File size exceeds 5MB limit.');
        }

        const timestamp = Date.now();
        const fileName = `${userId}_${timestamp}_${file.name}`;
        const path = `${STORAGE_PATHS.RESUMES}/${userId}/${fileName}`;

        return await uploadFile(file, path, onProgress);
    } catch (error) {
        console.error('Error uploading resume:', error);
        throw error;
    }
};

// Upload profile picture
export const uploadProfilePicture = async (file, userId, onProgress) => {
    try {
        // Validate file
        if (!VALIDATION.ALLOWED_IMAGE_TYPES.includes(file.type)) {
            throw new Error('Invalid file type. Only JPEG and PNG images are allowed.');
        }

        if (file.size > VALIDATION.MAX_FILE_SIZE) {
            throw new Error('File size exceeds 5MB limit.');
        }

        const timestamp = Date.now();
        const fileName = `${userId}_${timestamp}.${file.type.split('/')[1]}`;
        const path = `${STORAGE_PATHS.PROFILE_PICTURES}/${fileName}`;

        return await uploadFile(file, path, onProgress);
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        throw error;
    }
};

// Upload company logo
export const uploadCompanyLogo = async (file, recruiterId, onProgress) => {
    try {
        // Validate file
        if (!VALIDATION.ALLOWED_IMAGE_TYPES.includes(file.type)) {
            throw new Error('Invalid file type. Only JPEG and PNG images are allowed.');
        }

        if (file.size > VALIDATION.MAX_FILE_SIZE) {
            throw new Error('File size exceeds 5MB limit.');
        }

        const timestamp = Date.now();
        const fileName = `${recruiterId}_${timestamp}.${file.type.split('/')[1]}`;
        const path = `${STORAGE_PATHS.COMPANY_LOGOS}/${fileName}`;

        return await uploadFile(file, path, onProgress);
    } catch (error) {
        console.error('Error uploading company logo:', error);
        throw error;
    }
};

// Upload job attachment
export const uploadJobAttachment = async (file, jobId, onProgress) => {
    try {
        if (file.size > VALIDATION.MAX_FILE_SIZE) {
            throw new Error('File size exceeds 5MB limit.');
        }

        const timestamp = Date.now();
        const fileName = `${jobId}_${timestamp}_${file.name}`;
        const path = `${STORAGE_PATHS.JOB_ATTACHMENTS}/${jobId}/${fileName}`;

        return await uploadFile(file, path, onProgress);
    } catch (error) {
        console.error('Error uploading job attachment:', error);
        throw error;
    }
};

// Upload certificate
export const uploadCertificate = async (file, userId, onProgress) => {
    try {
        if (file.size > VALIDATION.MAX_FILE_SIZE) {
            throw new Error('File size exceeds 5MB limit.');
        }

        const timestamp = Date.now();
        const fileName = `${userId}_${timestamp}_${file.name}`;
        const path = `${STORAGE_PATHS.CERTIFICATES}/${userId}/${fileName}`;

        return await uploadFile(file, path, onProgress);
    } catch (error) {
        console.error('Error uploading certificate:', error);
        throw error;
    }
};

// Delete file
export const deleteFile = async (filePath) => {
    try {
        const fileRef = ref(storage, filePath);
        await deleteObject(fileRef);
        return true;
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
};

// Get all files in a directory
export const listFiles = async (path) => {
    try {
        const listRef = ref(storage, path);
        const result = await listAll(listRef);

        const files = await Promise.all(
            result.items.map(async (itemRef) => {
                const url = await getDownloadURL(itemRef);
                return {
                    name: itemRef.name,
                    path: itemRef.fullPath,
                    url,
                };
            })
        );

        return files;
    } catch (error) {
        console.error('Error listing files:', error);
        throw error;
    }
};

// Get user resumes
export const getUserResumes = async (userId) => {
    try {
        const path = `${STORAGE_PATHS.RESUMES}/${userId}`;
        return await listFiles(path);
    } catch (error) {
        console.error('Error fetching user resumes:', error);
        return [];
    }
};

// Get file download URL
export const getFileURL = async (filePath) => {
    try {
        const fileRef = ref(storage, filePath);
        return await getDownloadURL(fileRef);
    } catch (error) {
        console.error('Error getting file URL:', error);
        throw error;
    }
};

export default {
    uploadFile,
    uploadResume,
    uploadProfilePicture,
    uploadCompanyLogo,
    uploadJobAttachment,
    uploadCertificate,
    deleteFile,
    listFiles,
    getUserResumes,
    getFileURL,
};
