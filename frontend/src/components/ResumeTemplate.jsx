import { forwardRef } from 'react';

const ResumeTemplate = forwardRef(({ profileData }, ref) => {
    const {
        fullName = '',
        email = '',
        rollNumber = '',
        branch = '',
        cgpa = '',
        skills = [],
        aboutMe = '',
        projects = [],
        achievements = [],
    } = profileData || {};

    return (
        <div
            ref={ref}
            style={{
                width: '794px', // A4 at 96dpi
                minHeight: '1123px',
                padding: '48px 56px',
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                fontSize: '13px',
                lineHeight: '1.5',
                color: '#1a1a1a',
                backgroundColor: '#ffffff',
            }}
        >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #2563eb', paddingBottom: '16px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0', color: '#111827', letterSpacing: '0.5px' }}>
                    {fullName || 'Your Name'}
                </h1>
                <div style={{ fontSize: '13px', color: '#4b5563', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {email && <span>{email}</span>}
                    {rollNumber && <span>Roll No: {rollNumber}</span>}
                    {branch && <span>{branch}</span>}
                </div>
            </div>

            {/* About / Objective */}
            {aboutMe && (
                <div style={{ marginBottom: '18px' }}>
                    <h2 style={sectionHeading}>PROFESSIONAL SUMMARY</h2>
                    <p style={{ margin: '0', color: '#374151' }}>{aboutMe}</p>
                </div>
            )}

            {/* Education */}
            <div style={{ marginBottom: '18px' }}>
                <h2 style={sectionHeading}>EDUCATION</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div>
                        <p style={{ margin: '0', fontWeight: '600' }}>{branch || 'Department'}</p>
                        <p style={{ margin: '2px 0 0 0', color: '#4b5563' }}>
                            {rollNumber && `Roll Number: ${rollNumber}`}
                        </p>
                    </div>
                    {cgpa && (
                        <p style={{ margin: '0', fontWeight: '600', color: '#2563eb' }}>
                            CGPA: {cgpa}
                        </p>
                    )}
                </div>
            </div>

            {/* Skills */}
            {skills.length > 0 && (
                <div style={{ marginBottom: '18px' }}>
                    <h2 style={sectionHeading}>TECHNICAL SKILLS</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {skills.map((skill, i) => (
                            <span
                                key={i}
                                style={{
                                    padding: '3px 10px',
                                    backgroundColor: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    color: '#1e40af',
                                }}
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Projects */}
            {projects.length > 0 && (
                <div style={{ marginBottom: '18px' }}>
                    <h2 style={sectionHeading}>PROJECTS</h2>
                    {projects.map((project, i) => (
                        <div key={project.id || i} style={{ marginBottom: i < projects.length - 1 ? '12px' : '0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <p style={{ margin: '0', fontWeight: '600', fontSize: '14px' }}>{project.title}</p>
                                {project.link && (
                                    <span style={{ fontSize: '11px', color: '#2563eb' }}>{project.link}</span>
                                )}
                            </div>
                            {project.description && (
                                <p style={{ margin: '4px 0 0 0', color: '#374151' }}>{project.description}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Achievements */}
            {achievements.length > 0 && (
                <div style={{ marginBottom: '18px' }}>
                    <h2 style={sectionHeading}>ACHIEVEMENTS</h2>
                    {achievements.map((ach, i) => (
                        <div key={ach.id || i} style={{ marginBottom: i < achievements.length - 1 ? '8px' : '0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <p style={{ margin: '0', fontWeight: '600' }}>{ach.title}</p>
                                {ach.date && (
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{ach.date}</span>
                                )}
                            </div>
                            {ach.description && (
                                <p style={{ margin: '2px 0 0 0', color: '#374151' }}>{ach.description}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

ResumeTemplate.displayName = 'ResumeTemplate';

const sectionHeading = {
    fontSize: '14px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#1e3a5f',
    borderBottom: '1px solid #d1d5db',
    paddingBottom: '4px',
    marginBottom: '8px',
    marginTop: '0',
};

export default ResumeTemplate;
