import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useVoiceInput } from '../hooks/useVoiceInput';
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
  Layers,
  Mic,
  MicOff,
  Volume2
} from 'lucide-react';

interface WorkerProfileProps {
  onNavigate: (view: string) => void;
}

export const WorkerProfilePage: React.FC<WorkerProfileProps> = ({ onNavigate }) => {
  const { user, isOnline } = useAuth();
  const { language, t, speechLangCode } = useLanguage();
  
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

  // Active voice input tracking
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);

  const { isListening, error: voiceError, isSupported, startListening, stopListening } = useVoiceInput({
    langCode: speechLangCode,
    onTranscript: (text) => {
      if (activeVoiceField === 'occupation') {
        setOccupationTitle((prev) => (prev ? `${prev} ${text}` : text));
      } else if (activeVoiceField === 'task') {
        setTaskInput((prev) => (prev ? `${prev} ${text}` : text));
      } else if (activeVoiceField === 'tool') {
        setToolInput((prev) => (prev ? `${prev} ${text}` : text));
      } else if (activeVoiceField === 'skill') {
        setSkillInput((prev) => (prev ? `${prev} ${text}` : text));
      } else if (activeVoiceField === 'informal') {
        setInformalTrainingDesc((prev) => (prev ? `${prev} ${text}` : text));
      }
    },
  });

  useEffect(() => {
    if (!isListening) {
      setActiveVoiceField(null);
    }
  }, [isListening]);

  const toggleVoice = (fieldName: string) => {
    if (isListening && activeVoiceField === fieldName) {
      stopListening();
      setActiveVoiceField(null);
    } else {
      setActiveVoiceField(fieldName);
      startListening();
    }
  };

  // Localized trade chips for fast intake
  const QUICK_TASKS_BY_LANG: Record<string, string[]> = {
    en: [
      'Develop responsive web UI with Angular and TypeScript',
      'Build REST APIs with Spring Boot and JPA',
      'Write SQL queries in MySQL workbench and create tables',
      'Containerize backend services using Docker',
      'Wire and install solar PV modules on rooftops',
      'Measure open circuit voltage with digital multimeter',
      'Install and test MCB distribution breakers',
    ],
    hi: [
      'सोलर पैनल लगाना और रूफटॉप वायरिंग करना',
      'डिजिटल मल्टीमीटर से ओपन सर्किट वोल्टेज मापना',
      'एमसीबी डिस्ट्रीब्यूशन बॉक्स और ब्रेकर की फिटिंग करना',
      'वेबसाइट यूजर इंटरफेस और यूआई (UI) तैयार करना',
      'स्प्रिंग बूट और डेटाबेस में एपीआई (REST API) बनाना',
      'पाइपलाइन फिटिंग, नल और वाल्व रिपेयर करना',
    ],
    mr: [
      'सोलर पॅनेल बसवणे आणि रूफटॉप वायरिंग करणे',
      'डिजिटल मल्टीमीटरने व्होल्टेज आणि करंट तपासणे',
      'एमसीबी वितरण बॉक्स आणि फ्युज बसवणे',
      'वेबसाईट युझर इंटरफेस तयार करणे',
      'डेटाबेसमध्ये माहिती साठवणे आणि एपीआय तयार करणे',
      'प्लंबिंग पाईप फिटिंग आणि गळती दुरुस्ती करणे',
    ],
  };

  const QUICK_TOOLS_BY_LANG: Record<string, string[]> = {
    en: [
      'VS Code', 'MySQL Workbench', 'Postman', 'Git', 'Docker', 'JDK',
      'Digital Multimeter', 'Clamp Meter', 'Wire Strippers', 'Insulated Screwdrivers'
    ],
    hi: [
      'डिजिटल मल्टीमीटर', 'वायर स्ट्रिपर', 'क्लैंप मीटर', 'टेस्टर', 'स्क्रूड्राइवर',
      'वीएस कोड', 'पोस्टकैन', 'गिट (Git)', 'ड्रिल मशीन'
    ],
    mr: [
      'डिजिटल मल्टीमीटर', 'वायर स्ट्रिपर', 'क्लॅम्प मीटर', 'टेस्टर', 'स्क्रू ड्रायव्हर',
      'व्हीएस कोड', 'पोस्टमन', 'ड्रिल मशीन'
    ],
  };

  const QUICK_SKILLS_BY_LANG: Record<string, string[]> = {
    en: [
      'Angular', 'Java', 'Spring Boot', 'MySQL', 'REST APIs', 'Docker', 'HTML5/CSS3',
      'Solar PV Installation', 'Electrical Safety', 'Circuit Wiring', 'Grounding/Earthing'
    ],
    hi: [
      'सोलर पीवी इंस्टॉलेशन', 'सर्किट वायरिंग', 'विद्युत सुरक्षा व अर्थिंग',
      'वेब डेवलपमेंट', 'स्प्रिंग बूट', 'मायएसक्यूएल', 'पाइपलाइन प्लंबिंग'
    ],
    mr: [
      'सोलर पीव्ही इन्स्टॉलेशन', 'सर्किट वायरिंग', 'विद्युत सुरक्षा',
      'वेब डिझाईन', 'डेटाबेस व्यवस्थापन', 'प्लंबिंग पाईप फिटिंग'
    ],
  };

  const quickTasks = QUICK_TASKS_BY_LANG[language] || QUICK_TASKS_BY_LANG.en;
  const quickTools = QUICK_TOOLS_BY_LANG[language] || QUICK_TOOLS_BY_LANG.en;
  const quickSkills = QUICK_SKILLS_BY_LANG[language] || QUICK_SKILLS_BY_LANG.en;

  // Reusable Voice Dictation Button component
  const VoiceButton: React.FC<{ fieldName: string }> = ({ fieldName }) => {
    const isFieldListening = isListening && activeVoiceField === fieldName;
    return (
      <button
        type="button"
        onClick={() => toggleVoice(fieldName)}
        title={isFieldListening ? t('voice.stop') : t('voice.start')}
        className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition flex-shrink-0 ${
          isFieldListening
            ? 'bg-red-50 text-red-700 border-red-300 animate-pulse ring-2 ring-red-400'
            : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border-slate-300'
        }`}
      >
        {isFieldListening ? (
          <>
            <MicOff className="w-4 h-4 text-red-600 animate-spin" />
            <span className="font-semibold text-red-600">{t('voice.stop')}</span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">{t('voice.start')}</span>
          </>
        )}
      </button>
    );
  };

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
          <div className="w-10 h-10 bg-[#0b2545]/10 text-[#0b2545] rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t('profile.title')}</h1>
            <p className="text-xs text-slate-500">
              {t('profile.subtitle')}
            </p>
          </div>
        </div>

        {voiceError && (
          <div className="mt-3 p-3 rounded-lg text-xs flex items-center space-x-2 bg-amber-50 text-amber-800 border border-amber-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{voiceError}</span>
          </div>
        )}

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
            <span className="w-6 h-6 rounded-full bg-[#0b2545] text-white flex items-center justify-center text-xs font-bold">1</span>
            <span>{t('profile.step1')}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                {t('profile.occupation')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={occupationTitle}
                  onChange={(e) => setOccupationTitle(e.target.value)}
                  placeholder={t('profile.occupationPlaceholder')}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                />
                <VoiceButton fieldName="occupation" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                {t('profile.expYears')}
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={experienceYears}
                onChange={(e) => setExperienceYears(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                {t('profile.workplace')}
              </label>
              <input
                type="text"
                value={currentWorkplace}
                onChange={(e) => setCurrentWorkplace(e.target.value)}
                placeholder={t('profile.workplacePlaceholder')}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                {t('profile.education')}
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
            <span className="w-6 h-6 rounded-full bg-[#0b2545] text-white flex items-center justify-center text-xs font-bold">2</span>
            <span>{t('profile.step2')}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {t('profile.tasksDesc')}
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(dailyTasks, setDailyTasks, taskInput, () => setTaskInput('')))}
              placeholder={t('profile.taskPlaceholder')}
              className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <VoiceButton fieldName="task" />
            <button
              type="button"
              onClick={() => addItem(dailyTasks, setDailyTasks, taskInput, () => setTaskInput(''))}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>{t('profile.add')}</span>
            </button>
          </div>

          {/* Quick chips */}
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-400 mb-1.5">{t('profile.commonTasks')}</div>
            <div className="flex flex-wrap gap-1.5">
              {quickTasks.map((tItem, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => addItem(dailyTasks, setDailyTasks, tItem, () => {})}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-900 text-slate-700 rounded-full text-xs transition border border-slate-200"
                >
                  + {tItem}
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
            <span className="w-6 h-6 rounded-full bg-[#0b2545] text-white flex items-center justify-center text-xs font-bold">3</span>
            <span>{t('profile.step3')}</span>
          </h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={toolInput}
              onChange={(e) => setToolInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(toolsUsed, setToolsUsed, toolInput, () => setToolInput('')))}
              placeholder={t('profile.toolPlaceholder')}
              className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <VoiceButton fieldName="tool" />
            <button
              type="button"
              onClick={() => addItem(toolsUsed, setToolsUsed, toolInput, () => setToolInput(''))}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>{t('profile.add')}</span>
            </button>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-400 mb-1.5">{t('profile.commonTools')}</div>
            <div className="flex flex-wrap gap-1.5">
              {quickTools.map((tool, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => addItem(toolsUsed, setToolsUsed, tool, () => {})}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-900 text-slate-700 rounded-full text-xs transition border border-slate-200"
                >
                  + {tool}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {toolsUsed.map((tool, idx) => (
              <span key={idx} className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-900 rounded-full text-xs font-semibold border border-blue-200">
                {tool}
                <button
                  type="button"
                  onClick={() => removeItem(toolsUsed, setToolsUsed, idx)}
                  className="ml-1.5 text-blue-400 hover:text-red-600"
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
            <span className="w-6 h-6 rounded-full bg-[#0b2545] text-white flex items-center justify-center text-xs font-bold">4</span>
            <span>{t('profile.step4')}</span>
          </h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(skillsDeclared, setSkillsDeclared, skillInput, () => setSkillInput('')))}
              placeholder={t('profile.skillPlaceholder')}
              className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <VoiceButton fieldName="skill" />
            <button
              type="button"
              onClick={() => addItem(skillsDeclared, setSkillsDeclared, skillInput, () => setSkillInput(''))}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>{t('profile.add')}</span>
            </button>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-400 mb-1.5">{t('profile.commonSkills')}</div>
            <div className="flex flex-wrap gap-1.5">
              {quickSkills.map((sk, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => addItem(skillsDeclared, setSkillsDeclared, sk, () => {})}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-900 text-slate-700 rounded-full text-xs transition border border-slate-200"
                >
                  + {sk}
                </button>
              ))}
            </div>
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                {t('profile.informalLearning')}
              </label>
              <VoiceButton fieldName="informal" />
            </div>
            <textarea
              rows={3}
              value={informalTrainingDesc}
              onChange={(e) => setInformalTrainingDesc(e.target.value)}
              placeholder={t('profile.informalPlaceholder')}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <Save className="w-4 h-4 text-emerald-600" />
            <span>{t('profile.draftSaved')}</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onNavigate('worker-dashboard')}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition w-full sm:w-auto"
            >
              {t('profile.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold shadow-xs transition disabled:opacity-50 flex items-center justify-center space-x-2 w-full sm:w-auto"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>{isSubmitting ? t('profile.submitting') : t('profile.submit')}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
