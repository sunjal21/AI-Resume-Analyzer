// Add or edit job roles here. List skills (lowercase) from most to least important.
const tech = (id, name, skills) => ({ id, name, group: "Technical", skills });
const non = (id, name, skills) => ({ id, name, group: "Non-Technical", skills });

export const GROUPS = ["Technical", "Non-Technical"];

export const ROLES = [
  tech("python", "Python Developer", ["python", "django", "flask", "fastapi", "rest api", "sql", "git", "docker", "pytest", "postgresql"]),
  tech("mern", "MERN Stack Developer", ["mongodb", "express", "react", "node.js", "javascript", "rest api", "redux", "jwt", "git", "html", "css"]),
  tech("frontend", "Frontend Developer", ["html", "css", "javascript", "react", "typescript", "tailwind", "responsive design", "next.js", "figma", "git"]),
  tech("java", "Java Backend Developer", ["java", "spring boot", "hibernate", "microservices", "rest api", "sql", "maven", "junit", "docker", "git"]),
  tech("mobile", "Mobile App Developer", ["flutter", "dart", "react native", "kotlin", "android", "swift", "firebase", "rest api", "git", "ui design"]),
  tech("analyst", "Data Analyst", ["excel", "sql", "power bi", "tableau", "python", "pandas", "statistics", "data visualization", "data cleaning", "dashboard"]),
  tech("ml", "Data Scientist / ML Engineer", ["python", "machine learning", "scikit-learn", "tensorflow", "pytorch", "pandas", "numpy", "deep learning", "nlp", "statistics", "sql"]),
  tech("devops", "DevOps / Cloud Engineer", ["linux", "docker", "kubernetes", "ci/cd", "jenkins", "aws", "terraform", "ansible", "bash", "monitoring", "git"]),
  tech("uiux", "UI/UX Designer", ["figma", "wireframe", "prototype", "user research", "design system", "usability testing", "adobe xd", "user flow", "typography", "accessibility"]),
  tech("security", "Cybersecurity Analyst", ["network security", "penetration testing", "siem", "owasp", "firewall", "vulnerability", "incident response", "cryptography", "wireshark", "linux"]),
  tech("qa", "QA / Test Engineer", ["manual testing", "test cases", "selenium", "automation testing", "api testing", "postman", "jira", "cypress", "bug tracking", "sql"]),

  non("marketing", "Digital Marketing Executive", ["seo", "google analytics", "social media", "content marketing", "email marketing", "google ads", "facebook ads", "copywriting", "canva", "campaign"]),
  non("hr", "HR / Recruiter", ["recruitment", "talent acquisition", "sourcing", "interviewing", "onboarding", "payroll", "employee engagement", "performance management", "hris", "communication"]),
  non("sales", "Sales & Business Development", ["lead generation", "crm", "negotiation", "cold calling", "b2b", "client relationship", "sales target", "salesforce", "market research", "presentation"]),
  non("content", "Content Writer", ["copywriting", "seo", "blog", "editing", "proofreading", "research", "wordpress", "storytelling", "content strategy", "social media"]),
  non("finance", "Accountant / Finance", ["tally", "gst", "excel", "financial reporting", "taxation", "bookkeeping", "budgeting", "auditing", "accounts payable", "reconciliation"]),
  non("pm", "Project / Product Manager", ["agile", "scrum", "jira", "roadmap", "stakeholder management", "risk management", "user stories", "kpi", "product strategy", "budgeting"]),
  non("support", "Operations / Customer Support", ["customer service", "crm", "communication", "problem solving", "ticketing", "zendesk", "process improvement", "mis reporting", "team coordination", "time management"]),
];
