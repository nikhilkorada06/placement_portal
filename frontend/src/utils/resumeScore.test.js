// Simple test to verify the resume scoring logic
import { calculateResumeScoreFromText } from './resumeScore.js';

// Sample test resume text
const testResumeText = `
JOHN DOE
Email: john.doe@email.com | Phone: +1 (555) 123-4567
LinkedIn: linkedin.com/in/johndoe | GitHub: github.com/johndoe
Portfolio: johndoe.dev

PROFESSIONAL SUMMARY
Full-stack developer with 5+ years of experience building scalable web applications using React, Node.js, and cloud technologies. Proven track record of delivering high-performance solutions with a focus on user experience and code quality.

EXPERIENCE
Senior Software Engineer | Tech Company Inc. (2021 - Present)
- Led development of microservices architecture serving 2M+ users, improving system performance by 40%
- Implemented CI/CD pipeline using GitHub Actions, reducing deployment time by 60%
- Mentored junior developers and conducted code reviews for team of 8 engineers
- Architected real-time notification system using WebSockets and Redis

Software Developer | StartUp Co. (2019 - 2021)
- Developed e-commerce platform using React and Node.js, generated $500K in revenue
- Optimized database queries, reducing page load time by 45%
- Implemented automated testing framework increasing code coverage from 30% to 85%
- Collaborated with product team to deliver 20+ features in sprint cycles

EDUCATION
Bachelor of Science in Computer Science
University of Technology | Graduated: May 2019 | GPA: 3.8/4.0

SKILLS & TECHNOLOGIES
- Frontend: React, Next.js, Vue.js, TypeScript, HTML, CSS, Tailwind CSS
- Backend: Node.js, Express, Python, Django, FastAPI
- Databases: PostgreSQL, MongoDB, Redis, Elasticsearch
- Cloud & DevOps: AWS, Docker, Kubernetes, GitHub Actions, Jenkins
- Other: GraphQL, REST API, Git, Linux, Machine Learning basics

PROJECTS
Personal Portfolio Website | 2023
- Built responsive portfolio using Next.js and Tailwind CSS
- Integrated with Contentful CMS for blog management
- Achieved 95+ lighthouse score

Real-time Chat Application | 2022
- Developed WebSocket-based chat app using React and Node.js
- Implemented message encryption and user authentication
- Deployed on AWS with 99.9% uptime

CERTIFICATIONS & ACHIEVEMENTS
- AWS Solutions Architect Associate (2023)
- Winner, Tech Innovation Hackathon 2022
- Published 10+ articles on Full-Stack Development
`;

console.log('Testing Resume Scoring Logic...\n');

try {
    const result = calculateResumeScoreFromText(testResumeText);
    
    console.log('✓ Scoring completed successfully!\n');
    console.log('RESULTS:');
    console.log('--------');
    console.log(`Overall Score: ${result.score}/100\n`);
    
    console.log('Category Breakdown:');
    result.breakdown.forEach(item => {
        const percentage = Math.round((item.score / item.maxPoints) * 100);
        console.log(`  ${item.label}: ${item.score}/${item.maxPoints} (${percentage}%)`);
    });
    
    console.log(`\nStrengths: ${result.highlights.join(', ')}`);
    console.log(`\nSuggestions (${result.suggestions.length}):`);
    result.suggestions.forEach((sugg, idx) => {
        console.log(`  ${idx + 1}. ${sugg}`);
    });
    
    console.log('\nMetrics:');
    console.log(`  Words: ${result.signals.wordCount}`);
    console.log(`  Sections: ${Object.values(result.signals.sectionPresence || {}).filter(Boolean).length}`);
    console.log(`  Tech Skills: ${result.signals.skillCount}`);
    console.log(`  Impact Mentions: ${result.signals.metricMentionCount + result.signals.currencyOrScaleCount}`);
    
} catch (error) {
    console.error('✗ Test failed!');
    console.error('Error:', error.message);
}
