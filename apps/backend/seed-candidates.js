const { query } = require('./config/db');

// Helper to generate random past date
const randomPastDate = (daysAgo) => new Date(Date.now() - Math.random() * daysAgo * 24 * 60 * 60 * 1000).toISOString();

async function seedCandidates() {
  console.log('Seeding rich candidate pipeline data...');
  try {
    // 1. Clear existing candidate data
    await query(`DELETE FROM interviews`);
    await query(`DELETE FROM interview_evaluations`);
    await query(`DELETE FROM interview_sessions`);
    await query(`DELETE FROM candidate_questions`);
    await query(`DELETE FROM applications`);
    await query(`DELETE FROM candidates`);

    // 2. Ensure jobs exist
    await query(`INSERT INTO jobs (id, title, department, status, location) VALUES 
      (1, 'Assistant Professor – Computer Science', 'Engineering', 'active', 'On-campus'),
      (2, 'Lab Technician – Electrical Engineering', 'Engineering', 'active', 'On-campus'),
      (3, 'Data Scientist – Research Lab', 'Research', 'active', 'Hybrid')
      ON CONFLICT (id) DO NOTHING`);

    // 3. Define 21 Candidates (3 per stage)
    const candidatesData = [
      // APPLIED (Stage 1)
      { id: 1, name: 'Rahul Verma', email: 'rahul.v@example.com', stage: 'applied', job_id: 1, ai_score: 85, location: 'Delhi', headline: 'AI Researcher' },
      { id: 2, name: 'Sanjay Kumar', email: 'sanjay.k@example.com', stage: 'applied', job_id: 2, ai_score: 72, location: 'Noida', headline: 'Hardware Tech' },
      { id: 3, name: 'Amit Singh', email: 'amit.s@example.com', stage: 'applied', job_id: 3, ai_score: 88, location: 'Pune', headline: 'Data Analyst' },

      // UNDER REVIEW (Stage 2)
      { id: 4, name: 'Priya Sharma', email: 'priya.s@example.com', stage: 'under_review', job_id: 1, ai_score: 92, location: 'Bangalore', headline: 'Postdoc Fellow' },
      { id: 5, name: 'Neha Gupta', email: 'neha.g@example.com', stage: 'under_review', job_id: 2, ai_score: 79, location: 'Delhi', headline: 'Electronics Engineer' },
      { id: 6, name: 'Kavya Reddy', email: 'kavya.r@example.com', stage: 'under_review', job_id: 3, ai_score: 91, location: 'Hyderabad', headline: 'Machine Learning Eng' },

      // TECHNICAL INTERVIEW (Stage 3)
      { id: 7, name: 'Simran Bedi', email: 'simran.b@example.com', stage: 'technical_interview', job_id: 3, ai_score: 88, location: 'Mumbai', headline: 'Senior Data Scientist' },
      { id: 8, name: 'Rohan Desai', email: 'rohan.d@example.com', stage: 'technical_interview', job_id: 1, ai_score: 84, location: 'Ahmedabad', headline: 'CS Lecturer' },
      { id: 9, name: 'Vikram Joshi', email: 'vikram.j@example.com', stage: 'technical_interview', job_id: 2, ai_score: 76, location: 'Pune', headline: 'Lab Assistant' },

      // BEHAVIORAL INTERVIEW (Stage 4) - Has Technical completed
      { id: 10, name: 'Karan Malhotra', email: 'karan.m@example.com', stage: 'behavioral_interview', job_id: 2, ai_score: 75, location: 'Hyderabad', headline: 'Cloud & DevOps' },
      { id: 11, name: 'Sneha Patel', email: 'sneha.p@example.com', stage: 'behavioral_interview', job_id: 1, ai_score: 89, location: 'Surat', headline: 'Assistant Prof' },
      { id: 12, name: 'Aditya Rao', email: 'aditya.r@example.com', stage: 'behavioral_interview', job_id: 3, ai_score: 93, location: 'Bangalore', headline: 'Lead Data Scientist' },

      // FINAL REVIEW (Stage 5) - Has Technical & Behavioral completed
      { id: 13, name: 'Ananya Gupta', email: 'ananya.g@example.com', stage: 'final_review', job_id: 3, ai_score: 95, location: 'Pune', headline: 'UX Researcher' },
      { id: 14, name: 'Tanya Menon', email: 'tanya.m@example.com', stage: 'final_review', job_id: 1, ai_score: 94, location: 'Chennai', headline: 'Ph.D. Scholar' },
      { id: 15, name: 'Arjun Nair', email: 'arjun.n@example.com', stage: 'final_review', job_id: 2, ai_score: 82, location: 'Kochi', headline: 'Electrical Technician' },

      // OFFERED (Stage 6) - Has Technical & Behavioral completed
      { id: 16, name: 'Vikram Singh', email: 'vikram.s@example.com', stage: 'offered', job_id: 1, ai_score: 89, location: 'Chennai', headline: 'Full Stack Dev' },
      { id: 17, name: 'Pooja Iyer', email: 'pooja.i@example.com', stage: 'offered', job_id: 3, ai_score: 96, location: 'Bangalore', headline: 'Principal AI Researcher' },
      { id: 18, name: 'Rajesh Khanna', email: 'rajesh.k@example.com', stage: 'offered', job_id: 2, ai_score: 85, location: 'Delhi', headline: 'Senior Lab Tech' },

      // REJECTED (Stage 7) - Has Technical & Behavioral completed (with poor scores)
      { id: 19, name: 'Neha Patel', email: 'neha.p2@example.com', stage: 'rejected', job_id: 2, ai_score: 60, location: 'Ahmedabad', headline: 'Hardware Tech' },
      { id: 20, name: 'Suresh Kumar', email: 'suresh.k@example.com', stage: 'rejected', job_id: 1, ai_score: 65, location: 'Mumbai', headline: 'IT Instructor' },
      { id: 21, name: 'Deepak Jain', email: 'deepak.j@example.com', stage: 'rejected', job_id: 3, ai_score: 55, location: 'Jaipur', headline: 'Junior Analyst' }
    ];

    for (const c of candidatesData) {
      // 1. Insert Candidate
      await query(`
        INSERT INTO candidates (id, name, email, phone, headline, location, ai_score, source, resume_path, cv_path, education, experience, skills, chatbot_transcript)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'LinkedIn', 'uploads/seeded/seeded_resume.pdf', 'uploads/seeded/seeded_cv.pdf', $8, $9, $10, $11)
      `, [
        c.id, c.name, c.email, '+91-99999-00000', c.headline, c.location, c.ai_score,
        JSON.stringify([{ year: '2020', grade: 'A', degree: 'Relevant Degree', institution: 'Top University' }]),
        JSON.stringify([{ role: 'Relevant Role', company: 'Tech Corp', duration: '2020-2023', desc: 'Did great work.' }]),
        JSON.stringify(['Skill A', 'Skill B', 'Skill C']),
        JSON.stringify([{ speaker: 'Bot', text: 'Tell me about yourself.' }, { speaker: 'Candidate', text: 'I am highly motivated and experienced.' }])
      ]);

      // 2. Insert Application
      const { rows: appRows } = await query(`
        INSERT INTO applications (candidate_id, job_id, stage, applied_at)
        VALUES ($1, $2, $3, $4) RETURNING id
      `, [c.id, c.job_id, c.stage, randomPastDate(30)]);
      const appId = appRows[0].id;

      // 3. Generate Behavioral Questions (For all)
      const questions = [
        "Tell me about a time you had to adapt your approach.",
        "Describe a situation where you had to collaborate with a difficult stakeholder.",
        "How do you ensure your work aligns with institutional values?",
        "Give an example of taking ownership of a failing project.",
        "How do you handle ethical dilemmas?",
        "Describe a time you used data to drive a decision.",
        "Tell me about a conflict you resolved.",
        "How do you approach continuous learning?",
        "Share an example of a leadership challenge.",
        "How do you handle colleagues misaligned with policies?"
      ];
      await query(`
        INSERT INTO candidate_questions (candidate_id, interview_type, questions, source_context)
        VALUES ($1, 'behavioral', $2, 'Pre-generated to bypass Gemini quota limits')
      `, [c.id, JSON.stringify(questions)]);

      // 4. Seed Past Interviews based on stage
      const stageIndex = ['applied', 'under_review', 'technical_interview', 'behavioral_interview', 'final_review', 'offered', 'rejected'].indexOf(c.stage);
      
      // If stage == technical_interview, add a SCHEDULED technical interview
      if (c.stage === 'technical_interview') {
        await query(`
          INSERT INTO interviews (application_id, interviewer_id, scheduled_at, round, status, notes)
          VALUES ($1, 3, NOW() + INTERVAL '1 day', 'Technical Interview', 'scheduled', 'Focus on technical depth.')
        `, [appId]);
      }

      // If stage == behavioral_interview, add a SCHEDULED behavioral interview
      if (c.stage === 'behavioral_interview') {
        await query(`
          INSERT INTO interviews (application_id, interviewer_id, scheduled_at, round, status, notes)
          VALUES ($1, 1, NOW() + INTERVAL '2 days', 'Behavioral Interview', 'scheduled', 'Assess cultural alignment.')
        `, [appId]);
      }

      // If stage > technical_interview, they completed technical
      if (stageIndex >= 3) {
        const isRejected = c.stage === 'rejected';
        const scoreBase = isRejected ? 4 : 8;

        const { rows: techSess } = await query(`
          INSERT INTO interview_sessions (application_id, interviewer_id, type, status, started_at, ended_at, duration_secs, interviewer_notes, recommendation, transcript)
          VALUES ($1, 3, 'technical', 'completed', $2, $3, 2400, $4, $5, $6) RETURNING id
        `, [
          appId, randomPastDate(15), randomPastDate(14), 
          isRejected ? 'Lacked deep technical knowledge.' : 'Strong technical foundation.',
          isRejected ? 'no_hire' : 'hire',
          JSON.stringify([{speaker:'Interviewer', text:'Explain your technical background.'},{speaker:'Candidate', text:'I have extensive experience.'}])
        ]);
        
        // Also add a COMPLETED entry in interviews table for history
        await query(`
          INSERT INTO interviews (application_id, interviewer_id, scheduled_at, round, status, notes)
          VALUES ($1, 3, $2, 'Technical Interview', 'completed', 'Completed technical round.')
        `, [appId, randomPastDate(15)]);

        const techTraits = ['Problem Solving', 'System Design', 'Coding Ability', 'Technical Depth'];
        for (const t of techTraits) {
          await query(`INSERT INTO interview_evaluations (session_id, trait_name, score, is_ai) VALUES ($1, $2, $3, false)`, [techSess[0].id, t, scoreBase + Math.floor(Math.random()*3)]);
        }
      }

      // If stage > behavioral_interview, they completed behavioral
      if (stageIndex >= 4) {
        const isRejected = c.stage === 'rejected';
        const scoreBase = isRejected ? 4 : 8;

        const { rows: behSess } = await query(`
          INSERT INTO interview_sessions (application_id, interviewer_id, type, status, started_at, ended_at, duration_secs, interviewer_notes, recommendation, ai_summary, ai_analysis, transcript)
          VALUES ($1, 1, 'behavioral', 'completed', $2, $3, 2700, $4, $5, $6, $7, $8) RETURNING id
        `, [
          appId, randomPastDate(5), randomPastDate(4),
          isRejected ? 'Did not align with our cultural values.' : 'Excellent cultural fit and great communication.',
          isRejected ? 'no_hire' : 'strong_hire',
          isRejected ? 'Candidate showed poor alignment with core values.' : 'Candidate strongly aligns with institutional values, demonstrating leadership and adaptability.',
          JSON.stringify({ institutional_alignment: isRejected ? 'Poor' : 'Excellent', strengths: ['Communication'], concerns: isRejected ? ['Adaptability'] : [] }),
          JSON.stringify([{speaker:'Interviewer', text:'How do you handle conflict?'},{speaker:'Candidate', text:'I communicate openly.'}])
        ]);

        // Also add a COMPLETED entry in interviews table for history
        await query(`
          INSERT INTO interviews (application_id, interviewer_id, scheduled_at, round, status, notes)
          VALUES ($1, 1, $2, 'Behavioral Interview', 'completed', 'Completed behavioral round.')
        `, [appId, randomPastDate(5)]);

        const behTraits = ['Communication', 'Leadership', 'Adaptability', 'Emotional Intelligence'];
        for (const t of behTraits) {
          await query(`INSERT INTO interview_evaluations (session_id, trait_name, score, is_ai) VALUES ($1, $2, $3, false)`, [behSess[0].id, t, scoreBase + Math.floor(Math.random()*3)]);
          // AI scores
          await query(`INSERT INTO interview_evaluations (session_id, trait_name, score, is_ai) VALUES ($1, $2, $3, true)`, [behSess[0].id, t, scoreBase + Math.floor(Math.random()*3)]);
        }
      }
    }

    console.log('Successfully seeded 21 candidates with complete past interview histories.');

    // Adjust sequences
    await query(`SELECT setval('candidates_id_seq', (SELECT MAX(id) FROM candidates))`);
    await query(`SELECT setval('applications_id_seq', (SELECT MAX(id) FROM applications))`);
    await query(`SELECT setval('interview_sessions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM interview_sessions))`);
    await query(`SELECT setval('interviews_id_seq', (SELECT COALESCE(MAX(id), 1) FROM interviews))`);

  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    process.exit();
  }
}

seedCandidates();
