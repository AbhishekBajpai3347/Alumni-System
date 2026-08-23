-- ==========================================================
-- Demo seed data
-- Passwords for ALL seeded users are: Password123!
-- Hash below is bcrypt(10) of "Password123!"
-- ==========================================================

-- Lookup tables -------------------------------------------------

INSERT INTO departments (name) VALUES
('Computer Engineering'), ('Information Technology'), ('Mechanical Engineering'),
('Civil Engineering'), ('Electrical Engineering'), ('Electronics & Communication Engineering');

INSERT INTO companies (name) VALUES
('Google'), ('Microsoft'), ('Amazon'), ('TCS'), ('Infosys'), ('Zomato'),
('Razorpay'), ('CrowdStrike'), ('Deloitte'), ('Freshworks'), ('Flipkart'), ('Startup Labs');

INSERT INTO interests (name) VALUES
('Artificial Intelligence'), ('Machine Learning'), ('Cybersecurity'), ('Web Development'),
('Cloud Computing'), ('DevOps'), ('Data Science'), ('Mobile Development'),
('Product Management'), ('Entrepreneurship'), ('UI/UX Design'), ('Finance');

INSERT INTO skills (name) VALUES
('JavaScript'), ('Python'), ('Java'), ('C++'), ('React'), ('Node.js'),
('PostgreSQL'), ('AWS'), ('Docker'), ('Kubernetes'), ('Penetration Testing'),
('Network Security'), ('TensorFlow'), ('PyTorch'), ('Data Analysis'),
('Product Strategy'), ('Figma'), ('System Design');

-- Users -----------------------------------------------------------
-- role: student / alumni. bcrypt hash of "Password123!"
-- (generated with bcryptjs, 10 rounds)

INSERT INTO users (email, password_hash, role) VALUES
('aarav.student@college.edu', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'student'),
('isha.student@college.edu',  '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'student'),
('rohan.kumar@alum.edu',      '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'alumni'),
('neha.sharma@alum.edu',      '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'alumni'),
('vikram.singh@alum.edu',     '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'alumni'),
('priya.iyer@alum.edu',       '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'alumni'),
('arjun.mehta@alum.edu',      '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'alumni'),
('sneha.rao@alum.edu',        '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'alumni'),
('karan.desai@alum.edu',      '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'alumni'),
('divya.nair@alum.edu',       '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'alumni');

-- NOTE: the placeholder hash above is illustrative only and will NOT verify.
-- Run `node db/generate-seed-hash.js` (included) to print a real bcrypt hash
-- for "Password123!" and replace it here before seeding, OR simply register
-- fresh accounts through the /register UI -- the seed script's purpose is to
-- populate enough alumni/survey/advice data for filtering, insights and
-- semantic search demos, not to hand you working login credentials.

-- Student profiles --------------------------------------------------

INSERT INTO student_profiles (user_id, name, enrollment_number, department_id, year, graduation_year)
VALUES
((SELECT id FROM users WHERE email='aarav.student@college.edu'), 'Aarav Patel', 'ENR2023001', 1, 3, 2026),
((SELECT id FROM users WHERE email='isha.student@college.edu'),  'Isha Verma', 'ENR2022045', 2, 4, 2025);

INSERT INTO student_interests (student_id, interest_id)
SELECT sp.id, i.id FROM student_profiles sp, interests i
WHERE sp.user_id = (SELECT id FROM users WHERE email='aarav.student@college.edu')
  AND i.name IN ('Cybersecurity', 'Cloud Computing');

INSERT INTO student_interests (student_id, interest_id)
SELECT sp.id, i.id FROM student_profiles sp, interests i
WHERE sp.user_id = (SELECT id FROM users WHERE email='isha.student@college.edu')
  AND i.name IN ('Machine Learning', 'Data Science');

-- Alumni profiles -----------------------------------------------------

INSERT INTO alumni_profiles
(user_id, name, department_id, graduation_year, company_id, job_role, location, bio, linkedin_url, github_url, experience_years, mentorship_available, referral_available, onboarding_completed)
VALUES
((SELECT id FROM users WHERE email='rohan.kumar@alum.edu'), 'Rohan Kumar', 1, 2019,
 (SELECT id FROM companies WHERE name='CrowdStrike'), 'Security Engineer', 'Bengaluru, India',
 'Working in threat detection and incident response. Happy to mentor students interested in cybersecurity.',
 'https://linkedin.com/in/rohankumar', 'https://github.com/rohankumar', 6, true, true, true),

((SELECT id FROM users WHERE email='neha.sharma@alum.edu'), 'Neha Sharma', 2, 2020,
 (SELECT id FROM companies WHERE name='Google'), 'Software Engineer', 'Hyderabad, India',
 'Backend engineer working on distributed systems. Interested in mentoring on system design and interview prep.',
 'https://linkedin.com/in/nehasharma', 'https://github.com/nehasharma', 5, true, false, true),

((SELECT id FROM users WHERE email='vikram.singh@alum.edu'), 'Vikram Singh', 1, 2018,
 (SELECT id FROM companies WHERE name='Amazon'), 'ML Engineer', 'Seattle, USA',
 'Building recommendation systems. Previously worked in NLP research.',
 'https://linkedin.com/in/vikramsingh', 'https://github.com/vikramsingh', 7, true, true, true),

((SELECT id FROM users WHERE email='priya.iyer@alum.edu'), 'Priya Iyer', 2, 2021,
 (SELECT id FROM companies WHERE name='Razorpay'), 'Product Manager', 'Bengaluru, India',
 'Product manager in fintech. Transitioned from engineering to product after 2 years.',
 'https://linkedin.com/in/priyaiyer', NULL, 4, true, false, true),

((SELECT id FROM users WHERE email='arjun.mehta@alum.edu'), 'Arjun Mehta', 1, 2017,
 (SELECT id FROM companies WHERE name='Microsoft'), 'Cloud Solutions Architect', 'Bengaluru, India',
 'Architecting cloud-native solutions on Azure and AWS. DevOps enthusiast.',
 'https://linkedin.com/in/arjunmehta', 'https://github.com/arjunmehta', 8, true, true, true),

((SELECT id FROM users WHERE email='sneha.rao@alum.edu'), 'Sneha Rao', 6, 2020,
 (SELECT id FROM companies WHERE name='CrowdStrike'), 'Penetration Tester', 'Pune, India',
 'Offensive security specialist, ex-bug bounty hunter. Loves teaching students about ethical hacking.',
 'https://linkedin.com/in/sneharao', 'https://github.com/sneharao', 5, true, true, true),

((SELECT id FROM users WHERE email='karan.desai@alum.edu'), 'Karan Desai', 1, 2019,
 (SELECT id FROM companies WHERE name='Flipkart'), 'Data Scientist', 'Bengaluru, India',
 'Data scientist working on demand forecasting and pricing models.',
 'https://linkedin.com/in/karandesai', 'https://github.com/karandesai', 6, false, true, true),

((SELECT id FROM users WHERE email='divya.nair@alum.edu'), 'Divya Nair', 2, 2022,
 (SELECT id FROM companies WHERE name='Freshworks'), 'Frontend Engineer', 'Chennai, India',
 'Frontend engineer specializing in React and design systems.',
 'https://linkedin.com/in/divyanair', 'https://github.com/divyanair', 3, true, false, true);

-- Alumni interests -------------------------------------------------

INSERT INTO alumni_interests (alumni_id, interest_id)
SELECT ap.id, i.id FROM alumni_profiles ap, interests i
WHERE ap.name='Rohan Kumar' AND i.name IN ('Cybersecurity');
INSERT INTO alumni_interests (alumni_id, interest_id)
SELECT ap.id, i.id FROM alumni_profiles ap, interests i
WHERE ap.name='Neha Sharma' AND i.name IN ('Web Development', 'Cloud Computing');
INSERT INTO alumni_interests (alumni_id, interest_id)
SELECT ap.id, i.id FROM alumni_profiles ap, interests i
WHERE ap.name='Vikram Singh' AND i.name IN ('Machine Learning', 'Artificial Intelligence');
INSERT INTO alumni_interests (alumni_id, interest_id)
SELECT ap.id, i.id FROM alumni_profiles ap, interests i
WHERE ap.name='Priya Iyer' AND i.name IN ('Product Management', 'Entrepreneurship');
INSERT INTO alumni_interests (alumni_id, interest_id)
SELECT ap.id, i.id FROM alumni_profiles ap, interests i
WHERE ap.name='Arjun Mehta' AND i.name IN ('Cloud Computing', 'DevOps');
INSERT INTO alumni_interests (alumni_id, interest_id)
SELECT ap.id, i.id FROM alumni_profiles ap, interests i
WHERE ap.name='Sneha Rao' AND i.name IN ('Cybersecurity');
INSERT INTO alumni_interests (alumni_id, interest_id)
SELECT ap.id, i.id FROM alumni_profiles ap, interests i
WHERE ap.name='Karan Desai' AND i.name IN ('Data Science', 'Machine Learning');
INSERT INTO alumni_interests (alumni_id, interest_id)
SELECT ap.id, i.id FROM alumni_profiles ap, interests i
WHERE ap.name='Divya Nair' AND i.name IN ('Web Development', 'UI/UX Design');

-- Alumni skills -------------------------------------------------

INSERT INTO alumni_skills (alumni_id, skill_id)
SELECT ap.id, s.id FROM alumni_profiles ap, skills s
WHERE ap.name='Rohan Kumar' AND s.name IN ('Penetration Testing', 'Network Security', 'Python');
INSERT INTO alumni_skills (alumni_id, skill_id)
SELECT ap.id, s.id FROM alumni_profiles ap, skills s
WHERE ap.name='Neha Sharma' AND s.name IN ('Java', 'System Design', 'AWS');
INSERT INTO alumni_skills (alumni_id, skill_id)
SELECT ap.id, s.id FROM alumni_profiles ap, skills s
WHERE ap.name='Vikram Singh' AND s.name IN ('Python', 'TensorFlow', 'PyTorch');
INSERT INTO alumni_skills (alumni_id, skill_id)
SELECT ap.id, s.id FROM alumni_profiles ap, skills s
WHERE ap.name='Priya Iyer' AND s.name IN ('Product Strategy', 'Data Analysis');
INSERT INTO alumni_skills (alumni_id, skill_id)
SELECT ap.id, s.id FROM alumni_profiles ap, skills s
WHERE ap.name='Arjun Mehta' AND s.name IN ('AWS', 'Docker', 'Kubernetes');
INSERT INTO alumni_skills (alumni_id, skill_id)
SELECT ap.id, s.id FROM alumni_profiles ap, skills s
WHERE ap.name='Sneha Rao' AND s.name IN ('Penetration Testing', 'Network Security');
INSERT INTO alumni_skills (alumni_id, skill_id)
SELECT ap.id, s.id FROM alumni_profiles ap, skills s
WHERE ap.name='Karan Desai' AND s.name IN ('Python', 'Data Analysis', 'PostgreSQL');
INSERT INTO alumni_skills (alumni_id, skill_id)
SELECT ap.id, s.id FROM alumni_profiles ap, skills s
WHERE ap.name='Divya Nair' AND s.name IN ('JavaScript', 'React', 'Figma');

-- Career journeys -------------------------------------------------

INSERT INTO career_journeys (alumni_id, company_id, role, start_date, end_date, description)
SELECT ap.id, (SELECT id FROM companies WHERE name='TCS'), 'Associate Software Engineer', '2019-07-01', '2021-03-31', 'Started career building internal tools.'
FROM alumni_profiles ap WHERE ap.name='Rohan Kumar';
INSERT INTO career_journeys (alumni_id, company_id, role, start_date, end_date, description)
SELECT ap.id, (SELECT id FROM companies WHERE name='CrowdStrike'), 'Security Engineer', '2021-04-01', NULL, 'Moved into dedicated security engineering role.'
FROM alumni_profiles ap WHERE ap.name='Rohan Kumar';

INSERT INTO career_journeys (alumni_id, company_id, role, start_date, end_date, description)
SELECT ap.id, (SELECT id FROM companies WHERE name='Infosys'), 'Systems Engineer', '2020-08-01', '2022-01-31', 'Worked on enterprise Java applications.'
FROM alumni_profiles ap WHERE ap.name='Neha Sharma';
INSERT INTO career_journeys (alumni_id, company_id, role, start_date, end_date, description)
SELECT ap.id, (SELECT id FROM companies WHERE name='Google'), 'Software Engineer', '2022-02-01', NULL, 'Working on backend infrastructure.'
FROM alumni_profiles ap WHERE ap.name='Neha Sharma';

INSERT INTO career_journeys (alumni_id, company_id, role, start_date, end_date, description)
SELECT ap.id, (SELECT id FROM companies WHERE name='Amazon'), 'ML Engineer', '2018-07-01', NULL, 'Building recommendation and ranking systems.'
FROM alumni_profiles ap WHERE ap.name='Vikram Singh';

INSERT INTO career_journeys (alumni_id, company_id, role, start_date, end_date, description)
SELECT ap.id, (SELECT id FROM companies WHERE name='Deloitte'), 'Business Analyst', '2021-07-01', '2023-05-31', 'Consulting on process improvement.'
FROM alumni_profiles ap WHERE ap.name='Priya Iyer';
INSERT INTO career_journeys (alumni_id, company_id, role, start_date, end_date, description)
SELECT ap.id, (SELECT id FROM companies WHERE name='Razorpay'), 'Product Manager', '2023-06-01', NULL, 'Owning payments product line.'
FROM alumni_profiles ap WHERE ap.name='Priya Iyer';

-- Survey responses (sample of key questions) ------------------------

INSERT INTO alumni_survey_responses (alumni_id, question_no, answer_json)
SELECT ap.id, 1, '"Computer Engineering"' FROM alumni_profiles ap WHERE ap.name='Rohan Kumar';
INSERT INTO alumni_survey_responses (alumni_id, question_no, answer_json)
SELECT ap.id, 2, '2019' FROM alumni_profiles ap WHERE ap.name='Rohan Kumar';
INSERT INTO alumni_survey_responses (alumni_id, question_no, answer_json)
SELECT ap.id, 8, '["Cybersecurity", "Networking"]' FROM alumni_profiles ap WHERE ap.name='Rohan Kumar';
INSERT INTO alumni_survey_responses (alumni_id, question_no, answer_json)
SELECT ap.id, 55, '"Start learning security fundamentals early and practice on platforms like TryHackMe or HackTheBox."' FROM alumni_profiles ap WHERE ap.name='Rohan Kumar';

INSERT INTO alumni_survey_responses (alumni_id, question_no, answer_json)
SELECT ap.id, 1, '"Information Technology"' FROM alumni_profiles ap WHERE ap.name='Neha Sharma';
INSERT INTO alumni_survey_responses (alumni_id, question_no, answer_json)
SELECT ap.id, 8, '["Backend Development", "Cloud Computing"]' FROM alumni_profiles ap WHERE ap.name='Neha Sharma';
INSERT INTO alumni_survey_responses (alumni_id, question_no, answer_json)
SELECT ap.id, 55, '"Focus on system design fundamentals -- it matters more than people think in interviews."' FROM alumni_profiles ap WHERE ap.name='Neha Sharma';

INSERT INTO alumni_survey_responses (alumni_id, question_no, answer_json)
SELECT ap.id, 8, '["Artificial Intelligence/Machine Learning", "Data Science"]' FROM alumni_profiles ap WHERE ap.name='Vikram Singh';
INSERT INTO alumni_survey_responses (alumni_id, question_no, answer_json)
SELECT ap.id, 55, '"Build real ML projects with messy real-world data, not just Kaggle competitions."' FROM alumni_profiles ap WHERE ap.name='Vikram Singh';

-- Advice questions & answers -----------------------------------------

INSERT INTO advice_questions (student_id, question)
SELECT sp.id, 'How should I prepare for cybersecurity internships as a 3rd year student?'
FROM student_profiles sp WHERE sp.name='Aarav Patel';

INSERT INTO alumni_advice (question_id, alumni_id, answer)
SELECT aq.id, ap.id, 'Start with the basics: networking fundamentals, Linux, and OWASP Top 10. Practice on TryHackMe and try to get a bug bounty write-up published -- it stands out on a resume.'
FROM advice_questions aq, alumni_profiles ap
WHERE aq.question = 'How should I prepare for cybersecurity internships as a 3rd year student?'
  AND ap.name = 'Rohan Kumar';

INSERT INTO alumni_advice (question_id, alumni_id, answer)
SELECT aq.id, ap.id, 'Also build a small home lab and document what you learn on GitHub or a blog -- recruiters like seeing initiative beyond coursework.'
FROM advice_questions aq, alumni_profiles ap
WHERE aq.question = 'How should I prepare for cybersecurity internships as a 3rd year student?'
  AND ap.name = 'Sneha Rao';

INSERT INTO advice_questions (student_id, question)
SELECT sp.id, 'What machine learning projects would actually impress recruiters?'
FROM student_profiles sp WHERE sp.name='Isha Verma';

INSERT INTO alumni_advice (question_id, alumni_id, answer)
SELECT aq.id, ap.id, 'Avoid another Titanic/Iris dataset project. Pick a real dataset, build an end-to-end pipeline, and deploy it so people can actually try it.'
FROM advice_questions aq, alumni_profiles ap
WHERE aq.question = 'What machine learning projects would actually impress recruiters?'
  AND ap.name = 'Vikram Singh';
