-- Seed rich candidate profile data

UPDATE candidates SET
  location = 'Bengaluru, Karnataka',
  headline = 'ML Engineer | Ex-Google Intern | IIT Delhi',
  phone = '+91-98765-43210',
  education = '[{"degree":"B.Tech Computer Science","institution":"IIT Delhi","year":"2021","grade":"9.1/10"},{"degree":"XII - CBSE","institution":"DPS R.K. Puram","year":"2017","grade":"96.4%"}]',
  experience = '[{"company":"Google India","role":"Software Engineer Intern","duration":"May 2020 - Jul 2020","desc":"Worked on ads ranking pipeline, reducing latency by 18%."},{"company":"Plaksha University","role":"Research Assistant","duration":"Jan 2021 - May 2021","desc":"Developed NLP-based citation extraction tool."}]',
  skills = '["Python","PyTorch","NLP","Distributed Systems","SQL","Docker"]',
  ai_summary = 'Rahul demonstrates strong technical proficiency in ML systems. His Google internship shows adaptability to large-scale production environments. Communication skills are clear and concise. Recommended for technical round.',
  chatbot_transcript = '[{"speaker":"Bot","text":"Tell me about a challenging project you worked on."},{"speaker":"Candidate","text":"At Google, I optimised an ads ranking pipeline. The scale was immense - serving millions of requests per second. I used profiling tools to find the bottleneck and reduced latency by 18%."},{"speaker":"Bot","text":"How do you handle ambiguous requirements?"},{"speaker":"Candidate","text":"I break down the problem into smaller hypotheses, validate each with data, and iterate quickly."}]',
  custom_answers = '[{"question":"Why Plaksha University?","answer":"The interdisciplinary research environment aligns with my goal of applying AI to real-world problems in education and healthcare."},{"question":"Where do you see yourself in 5 years?","answer":"Leading a research group focused on responsible AI, ideally bridging academia and industry."}]'
WHERE id = 1;

UPDATE candidates SET
  location = 'New Delhi, India',
  headline = 'Full-Stack Developer | NIT Trichy | Open Source Contributor',
  phone = '+91-91234-56789',
  education = '[{"degree":"B.Tech Information Technology","institution":"NIT Trichy","year":"2022","grade":"8.4/10"}]',
  experience = '[{"company":"Zomato","role":"SDE Intern","duration":"Jun 2021 - Aug 2021","desc":"Built real-time order tracking dashboard using React and WebSockets."}]',
  skills = '["React","Node.js","PostgreSQL","Redis","TypeScript","AWS"]',
  ai_summary = 'Prateek shows good full-stack capabilities. His Zomato internship demonstrates ability to work on real-time systems under pressure. Interview performance was above average. Recommend moving to HR round.',
  chatbot_transcript = '[{"speaker":"Bot","text":"Describe your most complex project."},{"speaker":"Candidate","text":"I built a real-time order tracking system at Zomato using WebSockets. The trickiest part was handling reconnects at scale with 50k concurrent users."},{"speaker":"Bot","text":"How do you stay updated with tech trends?"},{"speaker":"Candidate","text":"I contribute to open source projects and follow engineering blogs from Stripe, Netflix, and Cloudflare."}]',
  custom_answers = '[{"question":"Why this role?","answer":"I want to apply my full-stack skills in an academic research setting where impact is measured differently."},{"question":"Salary expectation?","answer":"8-10 LPA for the right role and growth trajectory."}]'
WHERE id = 2;

UPDATE candidates SET
  location = 'Mumbai, Maharashtra',
  headline = 'Data Scientist | IIM Calcutta MBA | Ex-McKinsey',
  phone = '+91-99887-76655',
  education = '[{"degree":"MBA (Analytics)","institution":"IIM Calcutta","year":"2020","grade":"3.8/4.0 GPA"},{"degree":"B.Sc Statistics","institution":"Mumbai University","year":"2018","grade":"82%"}]',
  experience = '[{"company":"McKinsey & Company","role":"Business Analyst","duration":"Jul 2020 - Dec 2022","desc":"Led data-driven cost reduction projects across 4 FMCG clients, saving $12M annually."},{"company":"Accenture","role":"Data Analyst Intern","duration":"Mar 2019 - Jun 2019","desc":"Built predictive churn models for a telecom client with 87% accuracy."}]',
  skills = '["Python","R","Power BI","Statistical Modelling","SQL","Machine Learning","Tableau"]',
  ai_summary = 'Simran is an exceptional candidate with rare combination of analytical rigor and business acumen from McKinsey. Her MBA from IIM Calcutta and strong GPA reflect academic excellence. Strongly recommended for offer.',
  chatbot_transcript = '[{"speaker":"Bot","text":"Tell me about a data-driven decision you influenced."},{"speaker":"Candidate","text":"At McKinsey, I built a demand forecasting model for an FMCG client that identified $12M in unnecessary inventory costs. The model had 91% accuracy and was adopted company-wide."},{"speaker":"Bot","text":"How do you communicate findings to non-technical stakeholders?"},{"speaker":"Candidate","text":"I use storytelling frameworks - I translate data into business impact metrics that executives care about: revenue, risk, or cost."}]',
  custom_answers = '[{"question":"Why academia after McKinsey?","answer":"I want to contribute to research that outlasts any single client engagement. Academia lets me solve problems that matter for decades."},{"question":"Publications or research?","answer":"Co-authored a paper on retail demand forecasting published in the Journal of Business Analytics, 2022."}]'
WHERE id = 3;

UPDATE candidates SET
  location = 'Hyderabad, Telangana',
  headline = 'DevOps Engineer | BITS Pilani | Cloud Certified',
  phone = '+91-88776-65544',
  education = '[{"degree":"B.E. Computer Science","institution":"BITS Pilani","year":"2020","grade":"7.9/10"}]',
  experience = '[{"company":"Infosys","role":"Systems Engineer","duration":"Aug 2020 - Mar 2022","desc":"Managed CI/CD pipelines for 3 enterprise clients, reducing deployment time by 40%."},{"company":"Wipro","role":"Cloud Intern","duration":"May 2019 - Jul 2019","desc":"Migrated on-premise services to AWS, saving 30% infrastructure costs."}]',
  skills = '["Kubernetes","Docker","AWS","Terraform","Jenkins","Linux","Bash","Python"]',
  ai_summary = 'Karan has solid DevOps fundamentals with practical cloud experience. Score is slightly lower due to weaker system design conceptual depth in screening. Recommend one more technical round to assess architectural thinking.',
  chatbot_transcript = '[{"speaker":"Bot","text":"Walk me through a CI/CD pipeline you built."},{"speaker":"Candidate","text":"At Infosys I built a Jenkins pipeline with automated testing gates, Docker containerisation, and Kubernetes deployment. Reduced deployment time from 2 hours to 20 minutes."},{"speaker":"Bot","text":"How do you handle a production outage?"},{"speaker":"Candidate","text":"First isolate the blast radius, then roll back if needed while investigating root cause. Post-mortem without blame is important."}]',
  custom_answers = '[{"question":"Preferred tech stack?","answer":"Kubernetes on AWS with Terraform for IaC. I prefer GitOps workflows with ArgoCD."},{"question":"Experience with academic IT infrastructure?","answer":"No direct experience but I am confident the fundamentals transfer - reliability, scalability, and security matter everywhere."}]'
WHERE id = 4;

UPDATE candidates SET
  location = 'Pune, Maharashtra',
  headline = 'UX Researcher | NID Graduate | Human-Computer Interaction',
  phone = '+91-77665-54433',
  education = '[{"degree":"M.Des Interaction Design","institution":"NID Ahmedabad","year":"2023","grade":"8.7/10"},{"degree":"B.Tech Electronics","institution":"COEP Pune","year":"2021","grade":"8.1/10"}]',
  experience = '[]',
  skills = '["Figma","User Research","Usability Testing","Prototyping","Design Systems","A/B Testing"]',
  ai_summary = 'Ananya is a fresh graduate with strong design fundamentals from NID. No professional experience yet but her portfolio showcases sophisticated thinking. Her unique electronics + design background is rare. Recommend for screening round.',
  chatbot_transcript = '[{"speaker":"Bot","text":"Show me a UX problem you solved from scratch."},{"speaker":"Candidate","text":"For my thesis, I redesigned a government e-filing portal. I conducted 40 user interviews, identified 12 pain points, and the redesign improved task completion from 54% to 89% in testing."},{"speaker":"Bot","text":"How do you handle pushback from engineers on your designs?"},{"speaker":"Candidate","text":"I always bring data to those conversations. I document the user research so the decision is based on evidence not opinion."}]',
  custom_answers = '[{"question":"Why this role specifically?","answer":"Research in HCI at a university setting means I can publish findings rather than having them locked behind an NDA."},{"question":"Portfolio link?","answer":"ananyagupta.design (all work available on request)"}]'
WHERE id = 5;

-- Seed application notes and eval scores
UPDATE applications SET
  manager_notes = 'Strong candidate, moved to screening after impressive resume. Technical assessment pending.',
  eval_scores = '{"technical":88,"communication":82,"culture_fit":79,"problem_solving":91}'
WHERE candidate_id = 1;

UPDATE applications SET
  manager_notes = 'Good full-stack skills. Zomato experience relevant. Moved to interview stage.',
  faculty_notes = 'Evaluated by faculty panel. Strong on fundamentals, recommended for HR.',
  eval_scores = '{"technical":74,"communication":78,"culture_fit":80,"problem_solving":72}'
WHERE candidate_id = 2;

UPDATE applications SET
  manager_notes = 'Exceptional profile. McKinsey + IIM Calcutta. Best candidate in pipeline. Offer extended.',
  faculty_notes = 'Faculty review complete. Strongly recommended. Research publication is a strong plus.',
  eval_scores = '{"technical":90,"communication":95,"culture_fit":88,"problem_solving":93}'
WHERE candidate_id = 3;

UPDATE applications SET
  manager_notes = 'Decent DevOps profile. Some gaps in system design. Needs one more technical round.',
  eval_scores = '{"technical":68,"communication":70,"culture_fit":75,"problem_solving":65}'
WHERE candidate_id = 4;

UPDATE applications SET
  manager_notes = 'Fresh graduate, promising portfolio. Scheduled for screening.',
  eval_scores = '{"technical":60,"communication":82,"culture_fit":88,"problem_solving":77}'
WHERE candidate_id = 5;
