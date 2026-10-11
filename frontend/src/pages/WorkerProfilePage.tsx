import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { offlineStorage } from '../services/offlineStorage';
import { 
  FileText, 
  Wrench, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Save, 
  Plus, 
  X,
  Layers 
} from 'lucide-react';

interface WorkerProfileProps {
  onNavigate: (view: string) => void;
}

export const WorkerProfilePage: React.FC<WorkerProfileProps> = ({ onNavigate }) => {
  const { user, isOnline } = useAuth();
  
  const [occupationTitle, setOccupationTitle] = useState('');
  const [experienceYears, setExperienceYears] = useState<number>(3.0);
  const [currentWorkplace, setCurrentWorkplace] = useState('');
  const [educationLevel, setEducationLevel] = useState('12th Grade');
  const [dailyTasks, setDailyTasks] = useState<string[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  const [toolInput, setToolInput] = useState('');
  const [skillsDeclared, setSkillsDeclared] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [informalTrainingDesc, setInformalTrainingDesc] = useState('');
  
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Suggested trade chips for fast intake
  const QUICK_TASKS = [
    'Develop responsive web UI with Angular and TypeScript',
    'Build REST APIs with Spring Boot and JPA',
    'Write SQL queries in MySQL workbench and create tables',
    'Containerize backend services using Docker',
    'Wire and install solar PV modules on rooftops',
    'Measure open circuit voltage with digital multimeter',
    'Install and test MCB distribution breakers',
  ];

  const QUICK_TOOLS = [
    'VS Code', 'MySQL Workbench', 'Postman', 'Git', 'Docker', 'JDK',
    'Digital Multimeter', 'Clamp Meter', 'Wire Strippers', 'Insulated Screwdrivers'
  ];

  const QUICK_SKILLS = [
    'Angular', 'Java', 'Spring Boot', 'MySQL', 'REST APIs', 'Docker', 'HTML5/CSS3',
    'Solar PV Installation', 'Electrical Safety', 'Circuit Wiring', 'Grounding/Earthing'
  ];

  // 1. Load existing profile from backend or offline draft
  useEffect(() => {
    const loadProfile = async () => {
      // First check local offline draft
      const draft = offlineStorage.getProfileDraft();
      if (draft) {
        populateFields(draft);
        setStatusMsg({ type: 'info', text: 'Restored unsubmitted draft from your local device.' });
        return;
      }

      // Otherwise fetch from server
      try {
        const res = await api.worker.getProfile();
        if (res.profile) {
          populateFields(res.profile);
        }
      } catch (e) {
        console.warn('Could not load server profile', e);
      }
    };
    loadProfile();
  }, []);

  const populateFields = (data: any) => {
    setOccupationTitle(data.occupation_title || '');
    setExperienceYears(data.experience_years || 1.0);
    setCurrentWorkplace(data.current_workplace || '');
    setEducationLevel(data.education_level || '12th Grade');
    setDailyTasks(data.daily_tasks || []);
    setToolsUsed(data.tools_used || []);
    setSkillsDeclared(data.skills_declared || []);
    setInformalTrainingDesc(data.informal_training_desc || '');
  };

  // 2. Auto-save local draft on changes (Survives Offline Page Refresh)
  useEffect(() => {
    const currentDraft = {
      occupation_title: occupationTitle,
      experience_years: experienceYears,
      current_workplace: currentWorkplace,
      education_level: educationLevel,
      daily_tasks: dailyTasks,
      tools_used: toolsUsed,
      skills_declared: skillsDeclared,
      informal_training_desc: informalTrainingDesc,
      status: 'draft',
    };
    offlineStorage.saveProfileDraft(currentDraft);
  }, [occupationTitle, experienceYears, currentWorkplace, educationLevel, dailyTasks, toolsUsed, skillsDeclared, informalTrainingDesc]);

  // Array handlers
  const addItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string, clearInput: () => void) => {
    const trimmed = item.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      clearInput();
    }
  };

  const removeItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!occupationTitle.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter your occupation or trade title.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    const payload = {
      occupation_title: occupationTitle,
      experience_years: Number(experienceYears),
      current_workplace: currentWorkplace,
      education_level: educationLevel,
      daily_tasks: dailyTasks,
      tools_used: toolsUsed,
      skills_declared: skillsDeclared,
      informal_training_desc: informalTrainingDesc,
      status: 'submitted' as const,
    };

    if (!isOnline) {
      // Offline mode: Enqueue in sync queue and keep in local storage
      offlineStorage.enqueue({
        type: 'PROFILE_SAVE',
        payload,
      });
      setStatusMsg({
        type: 'success',
        text: 'Profile saved offline on your device! When you reconnect, it will automatically sync to the national register.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await api.worker.saveProfile(payload);
      // Clear draft once saved successfully to backend
      offlineStorage.clearProfileDraft();
      setStatusMsg({ type: 'success', text: 'Skill profile submitted! Matching against NSQF qualifications...' });
      
      // Auto-trigger qualification match
      setTimeout(() => {
        onNavigate('worker-matches');
      }, 1000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to submit profile' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Title Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Worker Skill Passport & Self-Declaration</h1>
            <p className="text-xs text-slate-500">
              Document your trade experience acquired informally without formal degrees. 
              Changes are continuously auto-saved locally and survive page reloads.
            </p>
          </div>
        </div>

        {statusMsg && (
          <div className={`mt-4 p-3.5 rounded-lg text-sm flex items-center space-x-2 border ${
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            statusMsg.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
            'bg-blue-50 text-blue-800 border-blue-200'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Occupation & Experience */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">1</span>
            <span>Current Trade & Experience</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Your Occupation / Job Title *
              </label>
              <input
                type="text"
                required
                value={occupationTitle}
                onChange={(e) => setOccupationTitle(e.target.value)}
                placeholder="e.g. Full Stack Developer, Electrician, Plumber"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Total Years of On-the-Job Experience
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={experienceYears}
                onChange={(e) => setExperienceYears(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Current Workplace / Employer / Freelance
              </label>
              <input
                type="text"
                value={currentWorkplace}
                onChange={(e) => setCurrentWorkplace(e.target.value)}
                placeholder="e.g. Local IT Solutions, Self-Employed"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Formal Education Level
              </label>
              <select
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="Below 10th">Below 10th Standard</option>
                <option value="10th Grade">10th Grade</option>
                <option value="12th Grade">12th Grade</option>
                <option value="ITI Certificate">ITI Certificate</option>
                <option value="Polytechnic Diploma">Polytechnic Diploma</option>
                <option value="Graduate">Graduate / Degree</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Daily Practical Tasks */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">2</span>
            <span>Practical Tasks Performed Daily</span>
          </h2>
          <p className="text-xs text-slate-500">
            Describe what you actually do on the job. The AI matching engine cross-references these with official NSQF Performance Criteria.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(dailyTasks, setDailyTasks, taskInput, () => setTaskInput('')))}
              placeholder="e.g. Build backend API endpoints using Spring Boot"
              className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={() => addItem(dailyTasks, setDailyTasks, taskInput, () => setTaskInput(''))}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>

          {/* Quick chips */}
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Common Tasks for Full Stack & Electrical:</div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TASKS.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => addItem(dailyTasks, setDailyTasks, t, () => {})}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-full text-xs transition border border-slate-200"
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>

          {/* Added items list */}
          <div className="space-y-1.5 mt-3">
            {dailyTasks.map((task, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                <span className="text-slate-800 font-medium">• {task}</span>
                <button
                  type="button"
                  onClick={() => removeItem(dailyTasks, setDailyTasks, idx)}
                  className="text-slate-400 hover:text-red-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3: Tools and Equipment */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">3</span>
            <span>Tools & Software Utilized</span>
          </h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={toolInput}
              onChange={(e) => setToolInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(toolsUsed, setToolsUsed, toolInput, () => setToolInput('')))}
              placeholder="e.g. VS Code, Docker, MySQL Workbench"
              className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={() => addItem(toolsUsed, setToolsUsed, toolInput, () => setToolInput(''))}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_TOOLS.map((tool, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => addItem(toolsUsed, setToolsUsed, tool, () => {})}
                className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-full text-xs transition border border-slate-200"
              >
                + {tool}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {toolsUsed.map((tool, idx) => (
              <span key={idx} className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-800 rounded-full text-xs font-semibold border border-indigo-200">
                {tool}
                <button
                  type="button"
                  onClick={() => removeItem(toolsUsed, setToolsUsed, idx)}
                  className="ml-1.5 text-indigo-400 hover:text-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Step 4: Skills & Informal Background */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">4</span>
            <span>Acquired Skills & Learning Background</span>
          </h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(skillsDeclared, setSkillsDeclared, skillInput, () => setSkillInput('')))}
              placeholder="e.g. Angular, Spring Boot, MySQL"
              className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={() => addItem(skillsDeclared, setSkillsDeclared, skillInput, () => setSkillInput(''))}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_SKILLS.map((sk, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => addItem(skillsDeclared, setSkillsDeclared, sk, () => {})}
                className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-full text-xs transition border border-slate-200"
              >
                + {sk}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {skillsDeclared.map((sk, idx) => (
              <span key={idx} className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-semibold border border-emerald-200">
                {sk}
                <button
                  type="button"
                  onClick={() => removeItem(skillsDeclared, setSkillsDeclared, idx)}
                  className="ml-1.5 text-emerald-400 hover:text-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              How did you learn your trade? (Informal background / Apprenticeship)
            </label>
            <textarea
              rows={3}
              value={informalTrainingDesc}
              onChange={(e) => setInformalTrainingDesc(e.target.value)}
              placeholder="e.g. Started as a junior apprentice 3 years ago; learned by delivering real client projects and fixing production bugs."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <Save className="w-4 h-4 text-emerald-600" />
            <span>Local draft automatically preserved across page reloads.</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onNavigate('worker-dashboard')}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-2 w-full sm:w-auto"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isSubmitting ? 'Submitting & Matching...' : 'Submit & Find NSQF Qualifications'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
