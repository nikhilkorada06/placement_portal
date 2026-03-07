/**
 * ATS (Applicant Tracking System) Score Service
 *
 * Analyzes a student's resume/profile against a job posting
 * and returns a score (0-100) with improvement suggestions.
 */

// ── Helpers ──────────────────────────────────────────────

/** Normalize text to lowercase, collapse whitespace */
const norm = (text) => (text || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Extract individual words (≥ 2 chars) from text */
const words = (text) => norm(text).split(' ').filter((w) => w.length >= 2);

/** Extract phrases (1–3 word n-grams) for keyword matching */
const extractPhrases = (text) => {
    const ws = words(text);
    const phrases = new Set(ws);
    for (let i = 0; i < ws.length - 1; i++) {
        phrases.add(`${ws[i]} ${ws[i + 1]}`);
        if (i < ws.length - 2) phrases.add(`${ws[i]} ${ws[i + 1]} ${ws[i + 2]}`);
    }
    return phrases;
};

/** Common filler/stop words to ignore when extracting keywords */
const STOP_WORDS = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her',
    'was', 'one', 'our', 'out', 'has', 'have', 'been', 'will', 'with', 'this',
    'that', 'from', 'they', 'were', 'what', 'when', 'make', 'like', 'each',
    'which', 'their', 'about', 'would', 'there', 'other', 'than', 'then', 'them',
    'these', 'some', 'into', 'such', 'also', 'more', 'should', 'could', 'being',
    'must', 'work', 'working', 'able', 'well', 'good', 'experience', 'role',
    'join', 'team', 'looking', 'opportunity', 'including', 'etc', 'strong',
    'knowledge', 'understanding', 'using', 'related', 'based', 'required',
    'preferred', 'minimum', 'years', 'year', 'desired',
]);

/** Extract meaningful keywords from job text (filtering out stop words) */
const extractKeywords = (text) => {
    return words(text).filter((w) => !STOP_WORDS.has(w) && w.length >= 3);
};

// ── Main Analysis ────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} params.studentProfile  - { fullName, skills[], aboutMe, projects[], achievements[], cgpa, branch }
 * @param {object} params.job             - full job document from Firestore
 * @returns {{ score: number, category: string, breakdown: object, suggestions: string[] }}
 */
export const analyzeATSScore = ({ studentProfile, job }) => {
    const profile = studentProfile || {};
    const jobDesc = job?.description || {};

    // Build a single "resume text" from all student profile fields
    const resumeParts = [
        profile.fullName,
        profile.aboutMe,
        profile.branch,
        ...(profile.skills || []),
        ...(profile.projects || []).map((p) => `${p.title} ${p.description} ${p.link || ''}`),
        ...(profile.achievements || []).map((a) => `${a.title} ${a.description}`),
    ];
    const resumeText = norm(resumeParts.join(' '));
    const resumePhrases = extractPhrases(resumeText);

    // Build job text from all description fields
    const jobTextParts = [
        job?.title,
        jobDesc.roleOverview,
        jobDesc.responsibilities,
        jobDesc.requiredSkills,
        jobDesc.preferredSkills,
        jobDesc.technologies,
    ];
    const jobText = norm(jobTextParts.join(' '));

    // ── 1. Keyword Match (30 points) ─────────────────────
    const jobKeywords = [...new Set(extractKeywords(jobText))];
    const matchedKeywords = [];
    const missingKeywords = [];

    for (const kw of jobKeywords) {
        if (resumePhrases.has(kw) || resumeText.includes(kw)) {
            matchedKeywords.push(kw);
        } else {
            missingKeywords.push(kw);
        }
    }

    const keywordRatio = jobKeywords.length > 0 ? matchedKeywords.length / jobKeywords.length : 0;
    const keywordScore = Math.round(keywordRatio * 30);

    // ── 2. Skills Match (30 points) ──────────────────────
    const studentSkills = (profile.skills || []).map((s) => norm(s));
    const requiredSkillsText = norm([jobDesc.requiredSkills, jobDesc.technologies].join(' '));
    const preferredSkillsText = norm(jobDesc.preferredSkills || '');

    const requiredSkillKeywords = [...new Set(extractKeywords(requiredSkillsText))];
    const preferredSkillKeywords = [...new Set(extractKeywords(preferredSkillsText))];

    const matchedSkills = [];
    const missingSkills = [];

    const checkSkillMatch = (skillKw) => {
        return studentSkills.some((s) => s.includes(skillKw) || skillKw.includes(s));
    };

    for (const sk of requiredSkillKeywords) {
        if (checkSkillMatch(sk) || resumeText.includes(sk)) {
            matchedSkills.push(sk);
        } else {
            missingSkills.push(sk);
        }
    }

    for (const sk of preferredSkillKeywords) {
        if (checkSkillMatch(sk) || resumeText.includes(sk)) {
            matchedSkills.push(sk);
        }
    }

    const totalSkillKeywords = requiredSkillKeywords.length + preferredSkillKeywords.length;
    const skillRatio = totalSkillKeywords > 0 ? matchedSkills.length / totalSkillKeywords : 0;
    const skillsScore = Math.round(skillRatio * 30);

    // ── 3. Section Presence (20 points) ──────────────────
    const sections = {
        education: !!(profile.branch || profile.cgpa),
        skills: (profile.skills || []).length > 0,
        projects: (profile.projects || []).length > 0,
        achievements: (profile.achievements || []).length > 0,
        summary: !!(profile.aboutMe && profile.aboutMe.length > 20),
    };

    const presentSections = Object.values(sections).filter(Boolean).length;
    const missingSections = Object.entries(sections)
        .filter(([, present]) => !present)
        .map(([name]) => name);
    const sectionScore = Math.round((presentSections / Object.keys(sections).length) * 20);

    // ── 4. Resume Quality (20 points) ────────────────────
    let qualityScore = 0;

    // Content length (0-6 pts)
    const contentLength = resumeText.length;
    if (contentLength > 800) qualityScore += 6;
    else if (contentLength > 400) qualityScore += 4;
    else if (contentLength > 150) qualityScore += 2;

    // Number of skills (0-4 pts)
    const skillCount = (profile.skills || []).length;
    if (skillCount >= 6) qualityScore += 4;
    else if (skillCount >= 3) qualityScore += 2;
    else if (skillCount >= 1) qualityScore += 1;

    // Number of projects (0-4 pts)
    const projectCount = (profile.projects || []).length;
    if (projectCount >= 3) qualityScore += 4;
    else if (projectCount >= 2) qualityScore += 3;
    else if (projectCount >= 1) qualityScore += 2;

    // Project descriptions quality (0-3 pts)
    const projectsWithDesc = (profile.projects || []).filter(
        (p) => p.description && p.description.length > 30
    ).length;
    if (projectsWithDesc >= 2) qualityScore += 3;
    else if (projectsWithDesc >= 1) qualityScore += 1;

    // Achievements (0-3 pts)
    const achCount = (profile.achievements || []).length;
    if (achCount >= 2) qualityScore += 3;
    else if (achCount >= 1) qualityScore += 2;

    qualityScore = Math.min(qualityScore, 20);

    // ── Final Score ──────────────────────────────────────
    const totalScore = Math.min(keywordScore + skillsScore + sectionScore + qualityScore, 100);

    // ── Category ─────────────────────────────────────────
    let category;
    if (totalScore >= 90) category = 'Excellent';
    else if (totalScore >= 75) category = 'Good';
    else if (totalScore >= 60) category = 'Needs Improvement';
    else category = 'Poor';

    // ── Suggestions ──────────────────────────────────────
    const suggestions = [];

    // Missing skill suggestions (deduplicated, top 8)
    const uniqueMissingSkills = [...new Set(missingSkills)].slice(0, 8);
    for (const sk of uniqueMissingSkills) {
        suggestions.push({ type: 'skill', text: `Add skill: ${sk}` });
    }

    // Missing keyword suggestions (top 6, avoid duplicates with skills)
    const skillSuggestionTexts = new Set(uniqueMissingSkills);
    const uniqueMissingKeywords = [...new Set(missingKeywords)]
        .filter((kw) => !skillSuggestionTexts.has(kw))
        .slice(0, 6);
    for (const kw of uniqueMissingKeywords) {
        suggestions.push({ type: 'keyword', text: `Add keyword: ${kw}` });
    }

    // Missing section suggestions
    for (const section of missingSections) {
        const labels = {
            education: 'Include Education details (branch, CGPA)',
            skills: 'Add a Skills section',
            projects: 'Add Projects to showcase your work',
            achievements: 'Include an Achievements section',
            summary: 'Write a Professional Summary (at least 2-3 sentences)',
        };
        suggestions.push({ type: 'section', text: labels[section] });
    }

    // Quality-based suggestions
    if (projectCount > 0 && projectsWithDesc < projectCount) {
        suggestions.push({ type: 'quality', text: 'Add detailed descriptions to all projects (measurable achievements help)' });
    }
    if (skillCount < 3) {
        suggestions.push({ type: 'quality', text: 'Add more skills to your profile (aim for at least 5-6)' });
    }
    if (contentLength < 400) {
        suggestions.push({ type: 'quality', text: 'Add more content to your resume — keep it 1-2 pages with meaningful detail' });
    }

    return {
        score: totalScore,
        category,
        breakdown: {
            keywords: { score: keywordScore, max: 30, matched: matchedKeywords.length, total: jobKeywords.length },
            skills: { score: skillsScore, max: 30, matched: matchedSkills.length, total: totalSkillKeywords },
            sections: { score: sectionScore, max: 20, present: presentSections, total: Object.keys(sections).length, details: sections },
            quality: { score: qualityScore, max: 20 },
        },
        suggestions,
    };
};
