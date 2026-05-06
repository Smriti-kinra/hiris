import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'

export default function ProfessorInterviewRoom() {
  const { roleId } = useParams()
  const navigate = useNavigate()
  const [phase, setPhase] = useState('interview') // 'interview' or 'review'
  
  const [isRecording, setIsRecording] = useState(false)
  const [timer, setTimer] = useState(0)
  const timerRef = useRef(null)

  const [transcript, setTranscript] = useState([])
  const [aiScores, setAiScores] = useState({
    "Academic Qualifications": 4.2,
    "Research Output": 4.0,
    "Teaching Demo": 3.2,
    "Communication Skills": 4.1,
    "Culture Fit": 3.9
  })
  
  const [manualScores, setManualScores] = useState({
    "Academic Qualifications": 0,
    "Research Output": 0,
    "Teaching Demo": 0,
    "Communication Skills": 0,
    "Culture Fit": 0
  })

  // Simulated transcript lines appearing
  const transcriptLines = [
    { speaker: 'Interviewer', text: "Dr. Roy, can you walk us through your doctoral research and how it relates to this role?", tag: null },
    { speaker: 'Candidate', text: "Of course. My PhD focused on sim-to-real transfer for robotic manipulation. I developed a domain randomisation framework that improved transfer success rates by 34% on our benchmark tasks.", tag: 'Academic Qualifications' },
    { speaker: 'Interviewer', text: "That's impressive. What is your publication record so far?", tag: null },
    { speaker: 'Candidate', text: "I've published 7 peer-reviewed papers — two in IEEE Robotics and Automation Letters, and one in ICRA 2023. My h-index is currently 8.", tag: 'Research Output' }
  ]

  const toggleRecording = () => {
    if (isRecording) {
      clearInterval(timerRef.current)
      setIsRecording(false)
      setPhase('review')
    } else {
      setIsRecording(true)
      timerRef.current = setInterval(() => {
        setTimer(p => {
          if (p === 1) setTranscript([transcriptLines[0]])
          if (p === 4) setTranscript([transcriptLines[0], transcriptLines[1]])
          if (p === 7) setTranscript([transcriptLines[0], transcriptLines[1], transcriptLines[2]])
          if (p === 10) setTranscript(transcriptLines)
          return p + 1
        })
      }, 1000)
    }
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds/60).toString().padStart(2,'0')
    const s = (seconds%60).toString().padStart(2,'0')
    return `${m}:${s}`
  }

  const handleScoreChange = (metric, val) => {
    setManualScores(prev => ({...prev, [metric]: val}))
  }

  const aiAverage = (Object.values(aiScores).reduce((a,b)=>a+b,0)/5).toFixed(1)
  const manualAverage = (Object.values(manualScores).reduce((a,b)=>a+b,0)/5).toFixed(1)
  const composite = (((parseFloat(aiAverage) + parseFloat(manualAverage)) / 2) || 0).toFixed(1)

  const submitReview = async () => {
    await fetch(`http://localhost:3001/api/interview-sessions/1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        ai_scores: aiScores,
        ai_overall: parseFloat(aiAverage),
        manual_scores: Object.fromEntries(Object.entries(manualScores).map(([k,v])=>[k, parseInt(v)||0])),
        manual_overall: parseFloat(manualAverage),
        composite_score: parseFloat(composite),
        status: 'Completed'
      })
    })
    navigate('/hr-dashboard')
  }

  if (phase === 'review') {
    return (
      <div className="bg-[#F8FAFC] text-[#1A2B4A] min-h-screen flex flex-col font-sans">
        <Header />
        
        {/* Review Header Banner */}
        <div className="bg-[#0F1F3D] px-8 py-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[32px] text-[#C8973A]">assignment_turned_in</span>
                <div className="text-white">
                    <h1 className="text-xl font-bold font-heading">Post-Interview Review</h1>
                    <p className="text-xs text-slate-400 mt-0.5">Finalize scoring for Dr. Ananya Roy (Lead Data Scientist)</p>
                </div>
            </div>
            <div className="flex gap-3">
                <button onClick={submitReview} className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_4px_12px_rgba(16,185,129,0.3)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">check_circle</span> Submit Verdict
                </button>
            </div>
        </div>

        <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: AI Assessment */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-[fadeIn_0.3s_ease-out]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                    <h2 className="text-sm font-bold text-[#0F1F3D] uppercase tracking-wider flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#C8973A]">smart_toy</span> AI Interview Assessment
                    </h2>
                    <span className="bg-[#0F1F3D]/5 text-[#0F1F3D] px-3 py-1 text-[10px] font-bold uppercase rounded-lg border border-[#0F1F3D]/10">HIRIS Insights</span>
                </div>
                
                <div className="space-y-4">
                    {Object.entries(aiScores).map(([metric, score]) => (
                      <div key={metric}>
                          <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-[#1A2B4A]">{metric}</span>
                              <span className="text-[10px] font-bold text-[#0F1F3D] bg-slate-100 px-2 py-0.5 rounded">{score} / 5.0</span>
                          </div>
                          <div className="w-full bg-[#E2E8F0] h-2.5 rounded-full overflow-hidden">
                              <div className="bg-[#0F1F3D] h-full rounded-full transition-all duration-1000" style={{ width: `${(score/5)*100}%` }}></div>
                          </div>
                      </div>
                    ))}
                </div>
                
                <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-[#6B7A99] uppercase tracking-wider">AI Overall Score</p>
                        <p className="text-2xl font-bold text-[#0F1F3D] mt-1">{aiAverage} <span className="text-sm text-[#6B7A99]">/ 5.0</span></p>
                    </div>
                </div>
            </div>

            {/* Right: Manual Assessment */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-[fadeIn_0.4s_ease-out]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                    <h2 className="text-sm font-bold text-[#0F1F3D] uppercase tracking-wider flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#C8973A]">edit_document</span> Your Final Evaluation
                    </h2>
                </div>
                
                <div className="space-y-4">
                  {Object.keys(manualScores).map(metric => (
                    <div key={metric} className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#1A2B4A]">{metric}</span>
                        <select 
                          className="bg-slate-50 border border-slate-200 text-xs text-[#0F1F3D] font-bold px-3 py-1.5 rounded-lg outline-none focus:border-[#0F1F3D]"
                          value={manualScores[metric]} onChange={(e) => handleScoreChange(metric, e.target.value)}
                        >
                            <option value="0">Select...</option>
                            {[1,2,3,4,5].map(v => <option key={v} value={v}>{v} - {['Poor','Fair','Good','Very Good','Excellent'][v-1]}</option>)}
                        </select>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 bg-[#0F1F3D] rounded-xl p-5 flex items-center justify-between shadow-[0_10px_20px_rgba(15,31,61,.15)] relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 text-[100px] text-white/5 font-heading">HIRIS</div>
                    <div className="relative z-10 w-full flex items-center justify-between">
                      <div>
                          <p className="text-[10px] font-bold text-[#C8973A] uppercase tracking-widest">Composite Score</p>
                          <p className="text-xs text-slate-300 mt-1 max-w-[200px]">Combined AI insights + your manual evaluation</p>
                      </div>
                      <div className="text-right">
                          <p className="text-3xl font-bold text-white font-heading">{composite}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">/ 5.00</p>
                      </div>
                    </div>
                </div>
            </div>
        </main>
      </div>
    )
  }

  // INTERVIEW PHASE
  return (
    <div className="bg-[#0F1F3D] text-white h-screen flex flex-col font-sans overflow-hidden">
      {/* Top Banner */}
      <div className="h-16 border-b border-white/10 px-6 flex items-center justify-between shrink-0 bg-[#0A1526]">
          <div className="flex items-center gap-4">
              <Link to="/hr-dashboard" className="text-slate-400 hover:text-white transition">
                  <span className="material-symbols-outlined text-xl">arrow_back</span>
              </Link>
              <div className="h-4 w-px bg-white/20"></div>
              <div>
                  <h1 className="text-sm font-bold uppercase tracking-wider font-heading">Interview Room</h1>
                  <p className="text-[10px] text-slate-400 font-medium">Dr. Ananya Roy <span className="mx-1">•</span> Lead Data Scientist</p>
              </div>
          </div>
          <div className="flex items-center gap-4">
              <span className={`text-[11px] font-bold font-mono tracking-widest px-3 py-1 rounded bg-black/40 ${isRecording ? 'text-red-400' : 'text-slate-400'}`}>
                {isRecording ? <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></span> : null}
                REC {formatTime(timer)}
              </span>
              <button 
                onClick={toggleRecording} 
                className={`flex items-center gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${isRecording ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,.4)]' : 'bg-[#C8973A] hover:bg-[#A67E30] shadow-[0_4px_10px_rgba(200,151,58,.2)]'}`}
              >
                  <span className="material-symbols-outlined text-sm">{isRecording ? 'stop_circle' : 'radio_button_checked'}</span>
                  {isRecording ? 'End Interview' : 'Start Interview'}
              </button>
          </div>
      </div>

      <main className="flex-1 flex overflow-hidden">
          {/* Main Video View */}
          <div className="flex-1 p-6 flex flex-col gap-6 relative">
              <div className="flex-1 bg-[#1A263B] rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden flex items-center justify-center">
                  <div className="text-center text-white/30 p-10 max-w-sm">
                      <span className="material-symbols-outlined text-6xl mb-4 opacity-50 block">videocam_off</span>
                      <p className="text-sm font-semibold tracking-wide">Candidate camera feed will appear here upon connection.</p>
                  </div>
                  {/* Local small view */}
                  <div className="absolute bottom-6 right-6 w-48 h-32 bg-[#2D394E] rounded-xl border border-white/10 shadow-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-white/40 text-3xl">person</span>
                      <span className="absolute bottom-2 left-2 text-[9px] bg-black/60 px-1.5 rounded font-bold uppercase text-white tracking-widest">You</span>
                  </div>
              </div>
          </div>

          {/* AI Side Panel */}
          <div className="w-[380px] bg-[#0A1526] border-l border-white/10 flex flex-col shrink-0 relative transition-transform duration-300">
              {/* Tabs */}
              <div className="flex border-b border-white/10 h-14 shrink-0">
                  <button className="flex-1 flex items-center justify-center gap-2 border-b-2 border-[#C8973A] text-white text-[11px] font-bold uppercase tracking-wider bg-white/5 transition">
                      <span className="material-symbols-outlined text-sm">closed_caption</span> Live Transcript
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 border-b-2 border-transparent text-slate-500 font-semibold text-[11px] uppercase tracking-wider hover:text-white transition">
                      <span className="material-symbols-outlined text-sm">lightbulb</span> Suggestions
                  </button>
              </div>

              {/* Transcript Area */}
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col gap-4">
                  {transcript.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-white/30 p-6 space-y-4">
                        <span className="material-symbols-outlined text-5xl opacity-50">forum</span>
                        <p className="text-xs font-semibold leading-relaxed tracking-wide">Start the interview to enable real-time speech-to-text and AI analysis.</p>
                    </div>
                  ) : (
                    transcript.map((msg, i) => (
                      <div key={i} className="animate-[slideDown_0.3s_ease-out]">
                          <div className="flex items-end gap-2 mb-1">
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${msg.speaker === 'Interviewer' ? 'text-slate-400' : 'text-[#C8973A]'}`}>
                                {msg.speaker}
                              </span>
                          </div>
                          <div className={`p-3 rounded-xl border relative overflow-hidden ${msg.speaker === 'Interviewer' ? 'bg-white/5 border-white/10 rounded-tl-none' : 'bg-[#C8973A]/10 border-[#C8973A]/20 rounded-tr-none'}`}>
                              <p className={`text-xs leading-relaxed ${msg.speaker === 'Interviewer' ? 'text-slate-300' : 'text-[#F5E9D0]'}`}>
                                {msg.text}
                              </p>
                              {msg.tag && (
                                <div className="mt-2 text-right">
                                    <span className="inline-block px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[8px] font-bold uppercase rounded">Match: {msg.tag}</span>
                                </div>
                              )}
                          </div>
                      </div>
                    ))
                  )}
              </div>
          </div>
      </main>
    </div>
  )
}
