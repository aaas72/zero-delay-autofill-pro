// ─── Field Pattern Definitions ─────────────────────────────────────────────────
// Centralized regex pattern → profile field mapping dictionary.
// Each pattern attempts to match against element attributes (name, id, placeholder,
// aria-label, autocomplete) and adjacent label text to identify the correct
// profile field to inject.

export interface FieldPattern {
  /** Regex patterns to match against element attributes and labels */
  patterns: RegExp[];
  /** Dot-notation path to the profile field value */
  profilePath: string;
  /** Optional: HTML autocomplete attribute to also match */
  autocomplete?: string[];
  /** Priority: higher = matched first when multiple patterns overlap */
  priority: number;
}

export const FIELD_PATTERNS: FieldPattern[] = [
  // ─── Personal Info ───────────────────────────────────────────────────────────
  {
    patterns: [/first.?name/i, /fname/i, /given.?name/i, /^first$/i],
    profilePath: 'personalInfo.firstName',
    autocomplete: ['given-name'],
    priority: 10,
  },
  {
    patterns: [/last.?name/i, /lname/i, /sur.?name/i, /family.?name/i, /^last$/i],
    profilePath: 'personalInfo.lastName',
    autocomplete: ['family-name'],
    priority: 10,
  },
  {
    patterns: [/full.?name/i, /^name$/i, /your.?name/i, /applicant.?name/i, /candidate.?name/i],
    profilePath: 'personalInfo.fullName',
    autocomplete: ['name'],
    priority: 5, // Lower priority so firstName/lastName match first
  },
  {
    patterns: [/headline/i, /title/i, /job.?title/i, /current.?title/i, /position.?title/i, /professional.?title/i],
    profilePath: 'personalInfo.headline',
    autocomplete: ['organization-title'],
    priority: 8,
  },
  {
    patterns: [/preferred.?name/i, /nick.?name/i, /display.?name/i],
    profilePath: 'personalInfo.preferredName',
    priority: 9,
  },

  // ─── Contact Info & Login Info ───────────────────────────────────────────────
  {
    patterns: [/e.?mail/i, /email.?address/i, /^email$/i],
    profilePath: 'contactInfo.email',
    autocomplete: ['email'],
    priority: 10,
  },
  {
    patterns: [/pass/i, /pwd/i, /password/i, /şifre/i, /sifre/i],
    profilePath: 'loginInfo.password',
    autocomplete: ['current-password', 'new-password', 'password'],
    priority: 10,
  },
  {
    patterns: [/username/i, /user.?name/i, /login/i, /giriş/i, /giris/i],
    profilePath: 'loginInfo.email',
    autocomplete: ['username'],
    priority: 8,
  },
  {
    patterns: [/phone/i, /tel/i, /mobile/i, /cell/i, /phone.?number/i, /contact.?number/i],
    profilePath: 'contactInfo.phone',
    autocomplete: ['tel'],
    priority: 10,
  },
  {
    patterns: [/^address$/i, /street/i, /address.?line/i, /street.?address/i, /home.?address/i, /mailing.?address/i],
    profilePath: 'contactInfo.address',
    autocomplete: ['address-line1', 'street-address'],
    priority: 8,
  },
  {
    patterns: [/^city$/i, /city.?name/i, /town/i, /municipality/i],
    profilePath: 'contactInfo.city',
    autocomplete: ['address-level2'],
    priority: 10,
  },
  {
    patterns: [/^state$/i, /province/i, /region/i, /state.?province/i],
    profilePath: 'contactInfo.state',
    autocomplete: ['address-level1'],
    priority: 10,
  },
  {
    patterns: [/zip/i, /postal/i, /post.?code/i, /zip.?code/i],
    profilePath: 'contactInfo.zipCode',
    autocomplete: ['postal-code'],
    priority: 10,
  },
  {
    patterns: [/country/i, /nation/i],
    profilePath: 'contactInfo.country',
    autocomplete: ['country-name', 'country'],
    priority: 10,
  },

  // ─── Portfolio Links ─────────────────────────────────────────────────────────
  {
    patterns: [/linkedin/i, /linked.?in/i, /linkedin.?url/i, /linkedin.?profile/i],
    profilePath: 'portfolioLinks.linkedin',
    priority: 10,
  },
  {
    patterns: [/github/i, /git.?hub/i, /github.?url/i, /github.?profile/i, /github.?link/i],
    profilePath: 'portfolioLinks.github',
    priority: 10,
  },
  {
    patterns: [/website/i, /personal.?site/i, /personal.?website/i, /home.?page/i, /^url$/i, /web.?url/i],
    profilePath: 'portfolioLinks.website',
    autocomplete: ['url'],
    priority: 7,
  },
  {
    patterns: [/portfolio/i, /portfolio.?url/i, /portfolio.?link/i, /work.?samples/i],
    profilePath: 'portfolioLinks.portfolio',
    priority: 9,
  },
  {
    patterns: [/twitter/i, /x\.com/i, /twitter.?handle/i],
    profilePath: 'portfolioLinks.twitter',
    priority: 9,
  },
  {
    patterns: [/resume/i, /cv/i, /resume.?url/i, /resume.?link/i, /cv.?link/i],
    profilePath: 'portfolioLinks.resumeUrl',
    priority: 9,
  },
  {
    patterns: [/dribbble/i],
    profilePath: 'portfolioLinks.dribbble',
    priority: 9,
  },
  {
    patterns: [/stack.?overflow/i, /stackoverflow/i],
    profilePath: 'portfolioLinks.stackoverflow',
    priority: 9,
  },

  // ─── Experience ──────────────────────────────────────────────────────────────
  {
    patterns: [/years?.?(of)?.?exp/i, /experience/i, /yoe/i, /total.?experience/i],
    profilePath: 'experience[0].yearsOfExperience',
    priority: 8,
  },
  {
    patterns: [/company/i, /employer/i, /organization/i, /current.?company/i, /company.?name/i],
    profilePath: 'experience[0].company',
    autocomplete: ['organization'],
    priority: 7,
  },
  {
    patterns: [/current.?role/i, /current.?position/i, /job.?role/i],
    profilePath: 'experience[0].title',
    priority: 7,
  },

  // ─── Education ───────────────────────────────────────────────────────────────
  {
    patterns: [/school/i, /university/i, /college/i, /institution/i, /alma.?mater/i],
    profilePath: 'education[0].school',
    priority: 8,
  },
  {
    patterns: [/degree/i, /qualification/i, /degree.?type/i],
    profilePath: 'education[0].degree',
    priority: 8,
  },
  {
    patterns: [/field.?of.?study/i, /major/i, /concentration/i, /specialization/i, /discipline/i],
    profilePath: 'education[0].fieldOfStudy',
    priority: 8,
  },
  {
    patterns: [/gpa/i, /grade/i, /cgpa/i, /grade.?point/i],
    profilePath: 'education[0].gpa',
    priority: 8,
  },

  // ─── Bio / Summary ──────────────────────────────────────────────────────────
  {
    patterns: [/summary/i, /about/i, /bio/i, /about.?you/i, /tell.?us/i, /cover.?letter/i, /introduction/i, /about.?yourself/i, /additional.?info/i, /message/i],
    profilePath: 'bio',
    priority: 3,
  },

  // ─── Salary & Availability ──────────────────────────────────────────────────
  {
    patterns: [/salary/i, /compensation/i, /expected.?salary/i, /desired.?salary/i, /pay/i],
    profilePath: 'salary',
    priority: 8,
  },
  {
    patterns: [/availab/i, /start.?date/i, /when.?can.?you/i, /notice.?period/i, /earliest.?start/i],
    profilePath: 'availability',
    priority: 8,
  },
  {
    patterns: [/work.?auth/i, /sponsor/i, /visa/i, /legal/i, /authorized/i, /right.?to.?work/i, /eligible/i],
    profilePath: 'workAuthorization',
    priority: 8,
  },

  // ─── Skills (textarea/text fields) ──────────────────────────────────────────
  {
    patterns: [/skills/i, /technical.?skills/i, /competencies/i, /expertise/i],
    profilePath: 'skills.technical',
    priority: 6,
  },
].sort((a, b) => b.priority - a.priority); // Pre-sort by priority descending
