import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { uploadResumeToCloudinary } from './cloudinaryService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/constants';

/**
 * Renders the hidden resume template to a PDF blob via html2canvas + jsPDF.
 * @param {HTMLElement} element - The DOM node of the resume template
 * @returns {Promise<Blob>} PDF blob
 */
const MAX_PDF_BYTES = 2 * 1024 * 1024; // 2 MB target

export const generatePdfBlob = async (element) => {
    const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
    });

    const pdfWidth = 210; // A4 mm
    const pdfHeight = 297;
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    // Try decreasing JPEG quality until we're under the size limit
    let quality = 0.75;
    let blob;

    while (quality >= 0.2) {
        const imgData = canvas.toDataURL('image/jpeg', quality);
        const pdf = new jsPDF('p', 'mm', 'a4');

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        blob = pdf.output('blob');

        if (blob.size <= MAX_PDF_BYTES) break;
        quality -= 0.1;
    }

    return blob;
};

/**
 * Full pipeline: render template → PDF → upload to Cloudinary → save URL in Firestore.
 * @param {HTMLElement} element - The DOM node of the resume template
 * @param {string} userId - Firebase user uid
 * @param {string} fullName - Student name (used for the filename)
 * @param {function} onProgress - Optional upload progress callback
 * @returns {Promise<object>} The resume data object stored in Firestore
 */
export const generateAndUploadResume = async (element, userId, fullName, onProgress) => {
    // 1. Generate PDF blob
    const pdfBlob = await generatePdfBlob(element);

    // 2. Convert blob to File for Cloudinary upload
    const safeName = (fullName || 'resume').replace(/\s+/g, '_').trim();
    const fileName = `${safeName}_Resume.pdf`;
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    // 3. Upload to Cloudinary
    const uploaded = await uploadResumeToCloudinary(file, userId, onProgress);

    // 4. Build resume data object
    const resumeData = {
        url: uploaded.url,
        publicId: uploaded.publicId,
        name: fileName,
        size: file.size,
        type: 'application/pdf',
        uploadedAt: new Date().toISOString(),
        generatedFromProfile: true,
    };

    // 5. Store in Firestore
    await updateDoc(doc(db, COLLECTIONS.STUDENTS, userId), {
        resume: resumeData,
        updatedAt: new Date().toISOString(),
    });

    return resumeData;
};
