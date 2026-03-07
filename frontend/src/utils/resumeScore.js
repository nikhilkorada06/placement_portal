// Resume text extraction utilities

// Normalize whitespace and special characters
const normalizeWhitespace = (text = '') => {
    return text
        .replace(/[^\x20-\x7E\n]/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

// Simple text extraction from PDF (fallback approach)
const extractPdfText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let raw = decoder.decode(arrayBuffer);
    
    // Extract text from multiple PDF patterns
    // Pattern 1: Text in parentheses
    const textMatches = raw.match(/\(([^)]+)\)/g) || [];
    const extractedStrings = textMatches
        .map(match => match.slice(1, -1))
        .filter(str => str.length > 2 && /[a-zA-Z]/.test(str))
        .join(' ');
    
    // Pattern 2: Text after /TJ or /Tj operators
    const tjMatches = raw.match(/\[(.*?)\]TJ/g) || [];
    const tjText = tjMatches.map(m => m.replace(/[[\]TJ]/g, '')).join(' ');
    
    // Pattern 3: Plain text extraction
    const plainText = raw.replace(/[^\x20-\x7E\n]/g, ' ');
    
    // Combine all extraction methods
    const combined = extractedStrings + ' ' + tjText + ' ' + plainText;
    
    return normalizeWhitespace(combined);
};

const extractDocxText = async (file) => {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return normalizeWhitespace(value);
};

const extractLegacyDocTextFallback = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder('latin1');
    const raw = decoder.decode(arrayBuffer);
    const textLike = raw.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ');
    return normalizeWhitespace(textLike);
};

export const extractResumeText = async (file) => {
    const fileType = file?.type || '';
    const fileName = (file?.name || '').toLowerCase();

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return extractPdfText(file);
    }

    if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.docx')
    ) {
        return extractDocxText(file);
    }

    if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
        return extractLegacyDocTextFallback(file);
    }

    throw new Error('Resume parsing is supported for PDF, DOCX, and DOC files only.');
};

// Simple scoring function
const calculateSimpleScore = (text) => {
    if (!text || text.length < 50) {
        return Math.floor(Math.random() * 20) + 20; // Random 20-40 for minimal content
    }

    let score = 30; // Base score
    const lower = text.toLowerCase();

    // Check for email (15 points)
    if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) {
        score += 15;
    }

    // Check for phone number (10 points)
    if (/\d{10}/.test(text.replace(/\D/g, ''))) {
        score += 10;
    }

    // Check for resume sections (25 points)
    const sections = ['experience', 'education', 'skills', 'work', 'university', 'degree', 'project'];
    const foundSections = sections.filter(section => lower.includes(section)).length;
    score += Math.min(foundSections * 3, 25);

    // Word count (15 points)
    const wordCount = text.split(/\s+/).filter(w => w.length > 2).length;
    if (wordCount > 200) {
        score += 15;
    } else if (wordCount > 100) {
        score += 10;
    } else if (wordCount > 50) {
        score += 5;
    }

    // Professional keywords (5 points)
    const keywords = ['developed', 'managed', 'led', 'created', 'team'];
    const keywordCount = keywords.filter(keyword => lower.includes(keyword)).length;
    if (keywordCount >= 2) {
        score += 5;
    }

    // Random variation (±5 points)
    score += Math.floor(Math.random() * 11) - 5;

    return Math.max(20, Math.min(score, 100));
};

export const analyzeResumeFile = async (file) => {
    const extractedText = await extractResumeText(file);
    const score = calculateSimpleScore(extractedText);
    
    return {
        extractedText,
        score,
        success: true,
    };
};

export default {
    analyzeResumeFile,
    extractResumeText,
};
