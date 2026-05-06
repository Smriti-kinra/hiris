import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'
import { useAuth } from '../../../context/AuthContext'

export default function JobPostingBuilder() {
  const [searchParams] = useSearchParams()
  const requestId = searchParams.get('requestId')
  const [requestData, setRequestData] = useState(null)
  
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('CS-01')
  const [departments, setDepartments] = useState([
    { id: 'CS-01', name: 'Computer Science (CS-01)' },
    { id: 'DS-02', name: 'Data Science (DS-02)' },
    { id: 'LA-03', name: 'Liberal Arts (LA-03)' }
  ])
  const [skills, setSkills] = useState(['Python', 'NLP', 'PyTorch'])
  const [stages, setStages] = useState([
    { id: 1, name: 'Screening', checked: true },
    { id: 2, name: 'Tech Interview 1', checked: true },
    { id: 3, name: 'Tech Interview 2', checked: false },
    { id: 4, name: 'HR Round 1', checked: true },
    { id: 5, name: 'HR Round 2', checked: false },
    { id: 6, name: 'General Interaction', checked: false }
  ])
  const [location, setLocation] = useState('on-campus')
  const [questions, setQuestions] = useState([]) // no implicit questions
  const [isAddingQuestion, setIsAddingQuestion] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [draggedIdx, setDraggedIdx] = useState(null)
  
  const [facultyComment, setFacultyComment] = useState('')
  
  const summaryRef = useRef(null)
  const respRef = useRef(null)

  const navigate = useNavigate()
  const { user } = useAuth()
  
  const isFaculty = user?.portal === 'faculty'
  // If the request is Sent for Approval and the user is Faculty, they are reviewing it
  const isReviewMode = isFaculty && requestData?.status === 'Sent for Approval'
  // Only Hiring Manager can edit when status is pending review
  const readOnly = isFaculty || requestData?.status === 'Approved' || requestData?.status === 'Posted'

  useEffect(() => {
    if (requestId) {
      apiFetch(`/hiring-requests/${requestId}`)
        .then(r => r.json()).then(data => {
          setRequestData(data)
          setTitle(data.title || '')
          
          if (data.jd_json) {
            const jd = data.jd_json
            if (jd.department) setDepartment(jd.department)
            if (jd.location) setLocation(jd.location)
            if (jd.skills) setSkills(jd.skills)
            if (jd.questions) setQuestions(jd.questions)
            if (jd.stages) setStages(jd.stages)
            if (jd.title) setTitle(jd.title)
            
            if (summaryRef.current && jd.summary) summaryRef.current.innerHTML = jd.summary
            if (respRef.current && jd.responsibilities) respRef.current.innerHTML = jd.responsibilities
          } else {
            if (data.location) setLocation(data.location)
          }
        }).catch(console.error)
    }
  }, [requestId])

  const handleDragStart = (idx) => { if (!readOnly) setDraggedIdx(idx) }
  const handleDragOver = (e, idx) => {
    e.preventDefault()
    if (readOnly || draggedIdx === null || draggedIdx === idx) return
    const newStages = [...stages]
    const draggedItem = newStages[draggedIdx]
    newStages.splice(draggedIdx, 1)
    newStages.splice(idx, 0, draggedItem)
    setDraggedIdx(idx)
    setStages(newStages)
  }
  const handleDrop = () => setDraggedIdx(null)

  const handleSendApproval = async () => {
    try {
      if (requestId) {
        const jd_json = {
          title,
          department,
          location,
          skills,
          questions,
          stages,
          summary: summaryRef.current?.innerHTML || '',
          responsibilities: respRef.current?.innerHTML || ''
        }
        await apiFetch(`/hiring-requests/${requestId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ action: 'submit_jd', jd_json })
        })
      }
      navigate('/hiring/requests')
    } catch(err) { console.error(err) }
  }

  const handleFacultyApprove = async () => {
    try {
      if (requestId) {
        await apiFetch(`/hiring-requests/${requestId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ action: 'approve', notes: facultyComment })
        })
      }
      navigate('/faculty/jd-reviews')
    } catch(err) { console.error(err) }
  }

  const handleDepartmentChange = (e) => {
    if (e.target.value === 'add_new') {
      const deptName = window.prompt("Enter new department name:")
      const deptId = window.prompt("Enter new department ID (e.g. ENG-04):")
      if (deptName && deptId) {
        setDepartments([...departments, { id: deptId, name: `${deptName} (${deptId})` }])
        setDepartment(deptId)
      }
    } else {
      setDepartment(e.target.value)
    }
  }

  const handleAddSkill = () => {
    if (readOnly) return
    const skillName = window.prompt("Enter a skill to add:")
    if (skillName && skillName.trim() !== "") {
      setSkills([...skills, skillName.trim()])
    }
  }

  const handleRemoveSkill = (skillToRemove) => {
    if (readOnly) return
    setSkills(skills.filter(skill => skill !== skillToRemove))
  }

  const handleAddStage = () => {
    if (readOnly) return
    const stageName = window.prompt("Enter a custom stage name:")
    if (stageName && stageName.trim() !== "") {
      setStages([...stages, { id: Date.now(), name: stageName.trim(), checked: true }])
    }
  }

  const toggleStage = (id) => {
    if (readOnly) return
    setStages(stages.map(stage => 
      stage.id === id ? { ...stage, checked: !stage.checked } : stage
    ))
  }

  return (
    <AppShell portal={user?.portal || 'hiring'} pageTitle={isReviewMode ? "Review Job Posting" : "Job Posting Builder"}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <div className="page-title">{isReviewMode ? "Review Job Posting" : "Job Posting Builder"}</div>
          <div className="page-subtitle">
            {isReviewMode ? 'Review the JD prepared by the hiring manager' : `Configure the job posting and application form for ${requestData?.title || 'this request'}`}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '60px' }}>
        {/* Request Overview Card */}
        <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, padding: '12px 16px' }}>
            <span className="badge badge-amber" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
              {requestId ? 'From Professor' : 'New Request'}
            </span>
          </div>
          <div className="card-pad" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Requested by</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{requestData?.requested_by || '—'}</div>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Dept</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{requestData?.department || '—'}</div>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Type</div>
              <span className="badge badge-gray">{requestData?.job_type || 'Internship'}</span>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Positions</div>
              <div style={{ fontWeight: 600, color: 'var(--brand)' }}>{requestData?.positions || 1}</div>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Start Date</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Sept 1, 2026</div>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Deadline</div>
              <div style={{ fontWeight: 600, color: 'var(--accent-red)' }}>{requestData?.deadline || '—'}</div>
            </div>
          </div>
        </div>

        {/* Job Description Builder */}
        <div className="card">
          <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--brand-light)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <h2 className="card-title" style={{ fontSize: '18px' }}>Job Description {readOnly ? '' : 'Builder'}</h2>
            </div>
          </div>
          
          <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Job Title</label>
                <input disabled={readOnly} className="hiris-input" type="text" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Department</label>
                <select disabled={readOnly} className="hiris-input" value={department} onChange={handleDepartmentChange}>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  {!readOnly && <option value="add_new">+ Add New Department</option>}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Location</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {['on-campus', 'remote', 'hybrid'].map(loc => (
                  <label key={loc} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px',
                    border: location === loc ? '1px solid var(--accent-green)' : '1px solid var(--border)',
                    background: location === loc ? 'rgba(16,185,129,0.08)' : 'var(--bg-input)',
                    color: location === loc ? 'var(--accent-green)' : 'var(--text-secondary)',
                    fontWeight: 600, fontSize: '13px', cursor: readOnly ? 'default' : 'pointer', transition: 'all 0.2s',
                    opacity: readOnly && location !== loc ? 0.5 : 1
                  }}>
                    <input disabled={readOnly} type="radio" checked={location === loc} onChange={() => setLocation(loc)} style={{ display: 'none' }} />
                    <span style={{ textTransform: 'capitalize' }}>{loc}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Summary</label>
              {requestData?.description && (
                <div style={{ padding: '12px', background: 'var(--brand-light)', border: '1px solid var(--brand)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500, marginBottom: '12px' }}>
                  💡 Professor's notes: "{requestData.description}"
                </div>
              )}
              {!readOnly && (
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', padding: '6px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', width: 'fit-content' }}>
                  <button type="button" onClick={() => document.execCommand('bold')} className="btn-ghost" style={{ padding: '4px 8px', minWidth: 'unset' }}><b>B</b></button>
                  <button type="button" onClick={() => document.execCommand('italic')} className="btn-ghost" style={{ padding: '4px 8px', minWidth: 'unset' }}><i>I</i></button>
                </div>
              )}
              <div ref={summaryRef} contentEditable={!readOnly} suppressContentEditableWarning className="hiris-input" style={{ minHeight: '100px', padding: '16px', background: readOnly ? 'var(--bg-hover)' : 'var(--bg-input)' }}>
                {!requestData?.jd_json && "Brief overview of the role..."}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Responsibilities</label>
              <div ref={respRef} contentEditable={!readOnly} suppressContentEditableWarning className="hiris-input" style={{ minHeight: '120px', padding: '16px', background: readOnly ? 'var(--bg-hover)' : 'var(--bg-input)' }}>
                {!requestData?.jd_json && "List key duties..."}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Required Skills</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {skills.map(skill => (
                  <div key={skill} className="badge badge-gray" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    {skill}
                    {!readOnly && <button type="button" onClick={() => handleRemoveSkill(skill)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '6px', opacity: 0.6 }}>×</button>}
                  </div>
                ))}
                {!readOnly && (
                  <button type="button" onClick={handleAddSkill} className="btn-outline" style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', borderStyle: 'dashed' }}>
                    + Add Skill
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Application Form Builder & Stages */}
        <div className="card">
          <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--brand-light)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <h2 className="card-title" style={{ fontSize: '18px' }}>Application Form & Pipeline</h2>
            </div>
          </div>

          <div className="card-pad">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
              
              {/* Basic Requirements */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>Basic Requirements</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['Full Name', 'Email Address', 'Upload Resume (PDF)', 'LinkedIn Profile URL', 'GitHub Profile URL'].map((req, i) => (
                    <label key={req} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', cursor: readOnly ? 'default' : 'pointer' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{req}</span>
                      <input type="checkbox" disabled={readOnly || i < 2} defaultChecked={i < 3} style={{ width: '18px', height: '18px', accentColor: 'var(--brand)' }} />
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Questions */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>Custom Questions</label>
                  {!readOnly && <button type="button" onClick={() => setIsAddingQuestion(true)} className="btn-ghost" style={{ padding: '4px 8px', fontSize: '12px' }}>+ Add Question</button>}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {questions.length === 0 && readOnly && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No custom questions added.</div>
                  )}
                  {questions.map((q, idx) => (
                    <div key={q.id} style={{ padding: '16px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', position: 'relative' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Question {idx + 1}</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>{q.text}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                        <span className="badge badge-gray" style={{ fontSize: '10px' }}>Short Answer</span>
                        {!readOnly && <button type="button" onClick={() => setQuestions(questions.filter(x => x.id !== q.id))} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>}
                      </div>
                    </div>
                  ))}
                  
                  {isAddingQuestion && !readOnly && (
                    <div style={{ padding: '16px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                      <input autoFocus type="text" value={newQuestion} onChange={e => setNewQuestion(e.target.value)} placeholder="Type question..." className="hiris-input" style={{ marginBottom: '12px' }} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button type="button" onClick={() => { setIsAddingQuestion(false); setNewQuestion(''); }} className="btn-ghost">Cancel</button>
                        <button type="button" onClick={() => { if(newQuestion.trim()){ setQuestions([...questions, { id: Date.now(), text: newQuestion.trim() }]); setNewQuestion(''); setIsAddingQuestion(false); } }} className="btn-primary" style={{ padding: '6px 12px' }}>Save</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <hr className="divider" style={{ margin: '32px 0' }} />

            {/* Application Stages */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>Application Stages (Pipeline)</label>
                {!readOnly && <button type="button" onClick={handleAddStage} className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>+ Custom Stage</button>}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {stages.map((stage, idx) => (
                  <label key={stage.id} draggable={!readOnly} onDragStart={() => handleDragStart(idx)} onDragOver={(e) => handleDragOver(e, idx)} onDrop={handleDrop} 
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', cursor: readOnly ? 'default' : 'grab',
                      background: stage.checked ? 'var(--badge-green-bg)' : 'var(--bg-input)',
                      border: stage.checked ? '1px solid var(--badge-green-text)' : '1px solid var(--border)',
                      color: stage.checked ? 'var(--badge-green-text)' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: '13px', transition: 'all 0.2s',
                      opacity: readOnly && !stage.checked ? 0.5 : 1
                    }}
                  >
                    <input disabled={readOnly} type="checkbox" checked={stage.checked} onChange={() => toggleStage(stage.id)} style={{ display: 'none' }} />
                    {!readOnly && <span style={{ opacity: 0.5 }}>≡</span>} {stage.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar / Faculty Approval Bar */}
        {isReviewMode ? (
          <div className="card" style={{ border: '2px solid var(--brand)', overflow: 'hidden' }}>
            <div style={{ background: 'var(--brand-light)', padding: '16px 24px', borderBottom: '1px solid var(--brand-light)' }}>
              <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Faculty Review & Approval
              </h3>
            </div>
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Comments / Feedback (Optional)</label>
                <textarea 
                  className="hiris-input" 
                  value={facultyComment} 
                  onChange={e => setFacultyComment(e.target.value)} 
                  placeholder="Looks good to me..." 
                  rows={3} 
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleFacultyApprove} className="btn-primary" style={{ padding: '12px 24px', fontSize: '15px' }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Approve Job Posting
                </button>
              </div>
            </div>
          </div>
        ) : !readOnly && (
          <div className="card" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-strong)' }}>
            <div className="card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--badge-green-bg)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Submit to Faculty for Review</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Send the prepared JD to the Professor for final sign-off.</div>
                </div>
              </div>
              <button onClick={handleSendApproval} className="btn-primary" style={{ padding: '12px 24px', fontSize: '15px' }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                Send to Professor
              </button>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  )
}
