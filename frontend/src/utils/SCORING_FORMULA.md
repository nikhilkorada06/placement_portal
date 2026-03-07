# Resume Scoring Formula - Detailed Breakdown

## Overall Score Calculation

```
TOTAL SCORE = Contact + Structure + Experience + Skills + Impact + Content
            = 15 + 15 + 20 + 18 + 15 + 17
            = 100 points (out of 100)
```

---

## Category 1: Contact & Presence (15 points)

### Criteria:
```
Email address present          → +4 points
Phone number present          → +4 points
LinkedIn OR GitHub present    → +4 points
Portfolio/Website present     → +3 points
────────────────────────────────────────
Maximum:                       → 15 points
```

### Example:
- Has email ✓ (4) + Phone ✓ (4) + LinkedIn ✓ (4) + Portfolio ✗ (0) = **12/15**
- Recommendation: "Add portfolio link to improve score"

---

## Category 2: Organization & Format (15 points)

### Criteria:
```
Sections detected:
  - Contact section
  - Summary/Objective
  - Education
  - Experience
  - Projects
  - Skills
  - Certifications
  - Achievements

≥5 sections found  → 12 points
≥4 sections found  → 9 points
≥3 sections found  → 6 points
≥2 sections found  → 3 points
<2 sections found  → 0 points

Additional:
Bullet points ≥8   → +3 points
Bullet points ≥5   → +2 points
Bullet points <5   → +0 points
────────────────────────────────────────
Maximum:           → 15 points
```

### Example:
- Sections: Contact, Summary, Experience, Education, Skills (5 found) → 12 points
- Bullet points: 7 found → +0 points
- **Total: 12/15**

---

## Category 3: Experience & Education (20 points)

### Criteria:
```
Professional experience section present  → +8 points
Education section present               → +6 points
Projects section present                → +4 points
Years of experience detected            → +2 points
────────────────────────────────────────
Maximum:                                → 20 points
```

### Years Calculation:
```javascript
- Find all years (2020, 2021, 2019, etc.)
- EstimatedYears = (CurrentYear - MinYearFound) / 2
- Example: Data shows 2018-2023 = (2026-2018)/2 = 4 years
```

### Example:
- Experience section ✓ (8) + Education ✓ (6) + Projects ✓ (4) + Years ✓ (2) = **20/20**

---

## Category 4: Skills & Technologies (18 points)

### Skill Database (50+ keywords):

**Languages (10):**
- JavaScript, TypeScript, Python, Java, C++, C#, PHP, Ruby, Go, Rust

**Frontend (7):**
- React, Next.js, Angular, Vue, Svelte, Ember, Backbone

**Backend (8):**
- Node.js, Express, FastAPI, Spring Boot, Django, Flask, Laravel, Rails

**Databases (6):**
- SQL, PostgreSQL, MySQL, MongoDB, Redis, Cassandra, Elasticsearch

**Cloud/DevOps (11):**
- Firebase, AWS, Azure, GCP, Heroku, Netlify, Vercel, Docker, Kubernetes, Jenkins, CircleCI, GitHub Actions

**Data/AI (9):**
- Machine Learning, TensorFlow, PyTorch, Scikit-learn, Pandas, NumPy, Big Data, Spark, Hadoop

### Scoring:
```
Dedicated skills section present  → +6 points

Technology keywords found:
  ≥14 found  → +10 points
  ≥10-13     → +8 points
  ≥6-9       → +6 points
  ≥2-5       → +3 points
  0-1        → +0 points
─────────────────────────────────
Maximum:     → 18 points
```

### Example:
- Has skills section ✓ (6)
- Found: JavaScript, React, Node.js, Python, AWS, Docker, PostgreSQL, TypeScript, Git, HTML, CSS (11 found) → +8
- **Total: 14/18**

---

## Category 5: Impact & Results (15 points)

### Criteria:

**Metrics Detection:**
```
Looks for patterns:
  - Percentages: "40%", "2.5%"
  - Numbers: "500K", "2M"
  - Scale: "100+", "1000+"
  - Time: "hours", "days", "months", "years"
  - Currency: "$500K", "€100K", "₹50L"
  - Revenue scale: million, billion, thousand
```

**Scoring:**
```
≥7 metrics found      → +10 points
≥4-6 metrics found    → +7 points
≥2-3 metrics found    → +4 points
≥1 metric found       → +0 points

Achievement section present  → +5 points

Action verbs found (50+):
  ≥8 verbs found  → +3 points
  ≥5-7 verbs      → +2 points
  <5 verbs        → +0 points
─────────────────────────────
Maximum:           → 15 points
```

### Action Verb Examples:
`built, developed, implemented, designed, engineered, delivered, optimized, improved, launched, led, created, automated, reduced, increased, achieved, managed, scaled, owned, deployed, integrated, architected, refactored, mentored, collaborated, documented, solved, investigated`

### Example:
- Metrics found: "40%", "$500K", "2M users", "60%", "85%", "99.9%" (6 metrics) → +7
- No achievements section (0)
- Action verbs found: "delivered", "implemented", "led", "architected", "optimized" (5 verbs) → +2
- **Total: 9/15**

---

## Category 6: Content Depth (17 points)

### Word Count Scoring:
```
≥500 words   → 12 points
≥350 words   → 9 points
≥200 words   → 5 points
≥100 words   → 2 points
<100 words   → 0 points

Content lines:
≥20 lines    → +5 points
≥15 lines    → +3 points
<15 lines    → +0 points
─────────────────────────
Maximum:     → 17 points
```

### Example:
- Word count: 450 words → 12 points
- Lines: 22 lines → +5 points
- **Total: 17/17**

---

## Scoring Calculation - Full Example

### Sample Resume Analysis:

**Category 1: Contact & Presence**
- Email ✓, Phone ✓, LinkedIn ✓, No portfolio = **12/15**

**Category 2: Organization**
- 6 sections found (12) + 7 bullets (+0) = **12/15**

**Category 3: Experience & Education**
- Experience ✓ (8) + Education ✓ (6) + Projects ✓ (4) + Years ✓ (2) = **20/20**

**Category 4: Skills & Technologies**
- Skills section ✓ (6) + 11 keywords (+8) = **14/18**

**Category 5: Impact & Results**
- 6 metrics (+7) + Awards section (+5) + 5 action verbs (+2) = **14/15**

**Category 6: Content Depth**
- 480 words (12) + 25 lines (+5) = **17/17**

### **TOTAL SCORE: 12 + 12 + 20 + 14 + 14 + 17 = 89/100**

---

## Scoring Levels

```
85-100  →  Excellent      (Green)
72-84   →  Strong         (Primary/Blue)
58-71   →  Developing     (Yellow/Amber)
0-57    →  Needs Work     (Red)
```

---

## Improvement Suggestions Algorithm

suggestions are generated based on the actual shortfalls:

```javascript
if (contactScore < 15) {
  "Add: email, phone, LinkedIn/GitHub, or portfolio"
}

if (!sections.summary) {
  "Add: professional summary (2-3 lines)"
}

if (!sections.experience) {
  "Add: professional experience with roles and duration"
}

if (!sections.education) {
  "Add: educational background and GPA if strong"
}

if (skillCount < 5) {
  "Expand: technical skills section (found ${skillCount})"
}

if (metricCount + currencyCount < 3) {
  "Quantify: achievements using percentages, numbers, scales"
}

if (actionVerbCount < 5) {
  "Use: action verbs at start of bullets"
}

if (wordCount < 200) {
  "Expand: resume content with more detail"
}
```

---

## Data Flow

```
Upload Resume (PDF/DOCX/DOC)
    ↓
Extract Text
    ↓
Extract Metrics (contact, sections, skills, etc.)
    ↓
Calculate Scores (6 categories)
    ↓
Sum Total Score (0-100)
    ↓
Generate Highlights (top 2 categories)
    ↓
Generate Suggestions (up to 5 items)
    ↓
Display Results
```

---

## Formula Edge Cases

### Conflicting Metrics:
- If multiple instances found, the **highest** value counts
- Example: If resume has both "500K" and "$1M", both are counted

### Text Extraction Issues:
- If extracted text < 20 words → Score = 0 (invalid resume)
- If text contains only formatting, noise filtered out automatically

### Special Characters:
- Non-ASCII characters replaced with spaces
- Emails, URLs, special symbols preserved
- Multiple spaces/newlines normalized

### Duplicate Detection:
- Skills counted once per unique skill
- Multiple mentions of same skill don't inflate score
- Case-insensitive matching (JavaScript = javascript)

---

## Future Enhancements

- ATS (Applicant Tracking System) keyword optimization
- Job description matching
- Peer comparison scoring
- Industry-specific scoring variations
- Experience quantification suggestions
- Skill gap analysis for target roles
