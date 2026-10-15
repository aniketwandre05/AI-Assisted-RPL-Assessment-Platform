import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hi' | 'mr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  speechLangCode: string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navbar
    'nav.brand': 'SAKSHAM',
    'nav.subbrand': 'RPL Skill Assessment Platform',
    'nav.home': 'Home',
    'nav.myDashboard': 'My Dashboard',
    'nav.skillDeclaration': 'Skill Declaration',
    'nav.qualMatches': 'Qualification Matches',
    'nav.assessorPortal': 'Assessor Portal',
    'nav.adminAudits': 'Admin & Audits',
    'nav.signIn': 'Sign In',
    'nav.register': 'Register',
    'nav.logout': 'Logout',
    'nav.online': 'Online',
    'nav.offline': 'Offline Mode',

    // Landing Page
    'landing.badge': 'Ministry of Skill Development & Entrepreneurship (MSDE) • SIH26242',
    'landing.heroTitle': 'Recognition of Prior Learning with',
    'landing.heroHighlight': 'SAKSHAM',
    'landing.heroDesc': "Empowering India's informal workforce to certify experiential on-the-job trade skills against official National Skills Qualification Framework (NSQF) standards. AI matches your skills with traceable criteria, while certified assessors maintain evaluation integrity.",
    'landing.registerWorker': 'Register as Worker',
    'landing.signInAccount': 'Sign In to Account',
    'landing.quickPersonas': '⚡ 1-Click Test Personas (Pre-seeded with real qualification data)',
    'landing.workerRajesh': 'Worker (Rajesh Kumar)',
    'landing.assessorAnanya': 'Assessor (Dr. Ananya)',
    'landing.administrator': 'Administrator',
    'landing.pillarsTitle': 'How SAKSHAM Operates',
    'landing.pillarsDesc': 'Engineered to overcome manual assessment bottlenecks while strictly adhering to NCVET RPL Guidelines.',

    // Worker Profile / Self-Declaration
    'profile.title': 'Worker Skill Passport & Self-Declaration',
    'profile.subtitle': 'Document your trade experience acquired informally without formal degrees. Changes are continuously auto-saved locally and survive page reloads.',
    'profile.step1': 'Current Trade & Experience',
    'profile.occupation': 'Your Occupation / Job Title *',
    'profile.occupationPlaceholder': 'e.g. Electrician, Web Developer, Plumber, Solar Installer',
    'profile.expYears': 'Total Years of On-the-Job Experience',
    'profile.workplace': 'Current Workplace / Employer / Freelance',
    'profile.workplacePlaceholder': 'e.g. Local IT Solutions, Self-Employed, Site Contractor',
    'profile.education': 'Formal Education Level',
    
    'profile.step2': 'Practical Tasks Performed Daily',
    'profile.tasksDesc': 'Describe what you actually do on the job. The AI matching engine cross-references these with official NSQF Performance Criteria.',
    'profile.taskPlaceholder': 'e.g. Wire and install solar PV panels, measure open circuit voltage',
    'profile.add': 'Add',
    'profile.commonTasks': 'Common Trade Tasks (Click to Add):',
    
    'profile.step3': 'Tools & Software Utilized',
    'profile.toolPlaceholder': 'e.g. Digital Multimeter, VS Code, Wire Strippers, Postman',
    'profile.commonTools': 'Common Tools & Instruments:',

    'profile.step4': 'Acquired Skills & Learning Background',
    'profile.skillPlaceholder': 'e.g. Circuit Wiring, Spring Boot, MySQL, Electrical Safety',
    'profile.commonSkills': 'Common Skills:',
    'profile.informalLearning': 'How did you learn your trade? (Informal background / Apprenticeship)',
    'profile.informalPlaceholder': 'e.g. Started as a junior apprentice 3 years ago; learned on-site by repairing client machinery and troubleshooting errors.',
    
    'profile.draftSaved': 'Local draft automatically preserved across page reloads.',
    'profile.cancel': 'Cancel',
    'profile.submit': 'Submit & Find NSQF Qualifications',
    'profile.submitting': 'Submitting & Matching...',

    // Voice recognition
    'voice.start': 'Speak (Voice Input)',
    'voice.listening': 'Listening... Speak now in your selected language',
    'voice.stop': 'Stop Voice',
    'voice.unsupported': 'Voice dictation is not supported in this browser. Please use Google Chrome or Microsoft Edge.',
    'voice.permissionDenied': 'Microphone access was denied. Please allow microphone permissions in browser settings.',
  },
  hi: {
    // Navbar
    'nav.brand': 'SAKSHAM',
    'nav.subbrand': 'सक्षम आरपीएल कौशल मूल्यांकन मंच',
    'nav.home': 'होम',
    'nav.myDashboard': 'मेरा डैशबोर्ड',
    'nav.skillDeclaration': 'कौशल स्व-घोषणा',
    'nav.qualMatches': 'योग्यता मिलान',
    'nav.assessorPortal': 'मूल्यांकनकर्ता पोर्टल',
    'nav.adminAudits': 'व्यवस्थापक एवं ऑडिट',
    'nav.signIn': 'लॉग इन करें',
    'nav.register': 'पंजीकरण करें',
    'nav.logout': 'लॉग आउट',
    'nav.online': 'ऑनलाइन',
    'nav.offline': 'ऑफ़लाइन मोड',

    // Landing Page
    'landing.badge': 'कौशल विकास एवं उद्यमिता मंत्रालय (MSDE) • SIH26242',
    'landing.heroTitle': 'पूर्व शिक्षण की मान्यता (RPL) मंच',
    'landing.heroHighlight': 'सक्षम (SAKSHAM)',
    'landing.heroDesc': 'भारत के अनौपचारिक कार्यबल को राष्ट्रीय कौशल योग्यता फ्रेमवर्क (NSQF) मानकों के अनुरूप अपने कार्य अनुभव को प्रमाणित करने हेतु सशक्त बनाना। एआई पारदर्शी मानदंडों के साथ आपके कौशल का मिलान करता है।',
    'landing.registerWorker': 'श्रमिक के रूप में पंजीकरण करें',
    'landing.signInAccount': 'खाते में साइन इन करें',
    'landing.quickPersonas': '⚡ 1-क्लिक टेस्ट पर्सोना (वास्तविक योग्यता डेटा के साथ)',
    'landing.workerRajesh': 'श्रमिक (राजेश कुमार)',
    'landing.assessorAnanya': 'मूल्यांकनकर्ता (डॉ. अनन्या)',
    'landing.administrator': 'व्यवस्थापक (एडमिन)',
    'landing.pillarsTitle': 'सक्षम (SAKSHAM) कैसे कार्य करता है',
    'landing.pillarsDesc': 'एनसीवीईटी आरपीएल दिशानिर्देशों का सख्ती से पालन करते हुए मैन्युअल मूल्यांकन की बाधाओं को दूर करने हेतु विकसित।',

    // Worker Profile / Self-Declaration
    'profile.title': 'श्रमिक कौशल पासपोर्ट एवं स्व-घोषणा',
    'profile.subtitle': 'औपचारिक डिग्री के बिना अनौपचारिक रूप से अर्जित अपने व्यावसायिक अनुभव को दर्ज करें। डेटा आपके डिवाइस पर स्वतः सुरक्षित रहता है।',
    'profile.step1': 'वर्तमान व्यवसाय एवं अनुभव',
    'profile.occupation': 'आपका व्यवसाय / पद नाम *',
    'profile.occupationPlaceholder': 'उदा. इलेक्ट्रीशियन, वेब डेवलपर, प्लंबर, सोलर तकनीशियन',
    'profile.expYears': 'कार्य अनुभव के कुल वर्ष',
    'profile.workplace': 'वर्तमान कार्यस्थल / नियोक्ता / स्वरोजगार',
    'profile.workplacePlaceholder': 'उदा. स्थानीय आईटी सॉल्यूशंस, स्वरोजगार, साइट ठेकेदार',
    'profile.education': 'औपचारिक शिक्षा का स्तर',
    
    'profile.step2': 'दैनिक रूप से किए जाने वाले व्यावहारिक कार्य',
    'profile.tasksDesc': 'बताएं कि आप कार्यस्थल पर वास्तव में क्या कार्य करते हैं। एआई आधिकारिक एनएसक्यूएफ प्रदर्शन मानदंडों के साथ इसका मिलान करता है।',
    'profile.taskPlaceholder': 'उदा. सोलर पैनल की वायरिंग करना, डिजिटल मल्टीमीटर से वोल्टेज मापना',
    'profile.add': 'जोड़ें',
    'profile.commonTasks': 'सामान्य व्यावसायिक कार्य (क्लिक करके जोड़ें):',
    
    'profile.step3': 'उपयोग किए जाने वाले उपकरण व सॉफ्टवेयर',
    'profile.toolPlaceholder': 'उदा. डिजिटल मल्टीमीटर, वीएस कोड, वायर स्ट्रिपर, क्लैंप मीटर',
    'profile.commonTools': 'सामान्य उपकरण व साधन:',

    'profile.step4': 'अर्जित कौशल एवं सीखने की पृष्ठभूमि',
    'profile.skillPlaceholder': 'उदा. सर्किट वायरिंग, इलेक्ट्रिकल सुरक्षा, स्प्रिंग बूट, डेटाबेस',
    'profile.commonSkills': 'सामान्य कौशल:',
    'profile.informalLearning': 'आपने अपना काम कैसे सीखा? (अनौपचारिक पृष्ठभूमि / शिक्षुता)',
    'profile.informalPlaceholder': 'उदा. 3 साल पहले एक सीनियर मिस्त्री के साथ हेल्पर के रूप में शुरू किया; ग्राहकों के उपकरण ठीक करके सीखा।',
    
    'profile.draftSaved': 'स्थानीय ड्राफ्ट स्वचालित रूप से सुरक्षित कर लिया गया है।',
    'profile.cancel': 'रद्द करें',
    'profile.submit': 'जमा करें और एनएसक्यूएफ योग्यताएं खोजें',
    'profile.submitting': 'जमा और मिलान किया जा रहा है...',

    // Voice recognition
    'voice.start': 'बोलकर दर्ज करें (आवाज़ इनपुट)',
    'voice.listening': 'सुन रहा हूँ... कृपया अपनी भाषा में बोलें',
    'voice.stop': 'आवाज़ रोकें',
    'voice.unsupported': 'इस ब्राउज़र में वॉयस डिक्टेशन समर्थित नहीं है। कृपया गूगल क्रोम या माइक्रोसॉफ्ट एज का उपयोग करें।',
    'voice.permissionDenied': 'माइक्रोफ़ोन की अनुमति अस्वीकृत हुई। कृपया ब्राउज़र सेटिंग्स में अनुमति दें।',
  },
  mr: {
    // Navbar
    'nav.brand': 'SAKSHAM',
    'nav.subbrand': 'सक्षम आरपीएल कौशल्य मूल्यांकन मंच',
    'nav.home': 'मुख्यपृष्ठ',
    'nav.myDashboard': 'माझे डॅशबोर्ड',
    'nav.skillDeclaration': 'कौशल्य स्व-घोषणा',
    'nav.qualMatches': 'पात्रता जुळवणी',
    'nav.assessorPortal': 'मूल्यांकनकर्ता पोर्टल',
    'nav.adminAudits': 'प्रशासक आणि ऑडिट',
    'nav.signIn': 'साइन इन',
    'nav.register': 'नोंदणी करा',
    'nav.logout': 'लॉग आउट',
    'nav.online': 'ऑनलाइन',
    'nav.offline': 'ऑफलाइन मोड',

    // Landing Page
    'landing.badge': 'कौशल्य विकास आणि उद्योजकता मंत्रालय (MSDE) • SIH26242',
    'landing.heroTitle': 'पूर्व शिक्षणाची मान्यता (RPL) मंच',
    'landing.heroHighlight': 'सक्षम (SAKSHAM)',
    'landing.heroDesc': 'भारतातील अनौपचारिक कामगारांना राष्ट्रीय कौशल्य पात्रता फ्रेमवर्क (NSQF) मानकांनुसार त्यांच्या अनुभवाचे प्रमाणीकरण करण्यासाठी सक्षम करणे. एआय तुमच्या कौशल्यांचे अधिकृत निकषांशी पारदर्शकपणे जुळवणी करते.',
    'landing.registerWorker': 'कामगार म्हणून नोंदणी करा',
    'landing.signInAccount': 'खात्यात साइन इन करा',
    'landing.quickPersonas': '⚡ 1-क्लिक चाचणी व्यक्तिमत्त्वे (प्रत्यक्ष डेटासह)',
    'landing.workerRajesh': 'कामगार (राजेश कुमार)',
    'landing.assessorAnanya': 'मूल्यांकनकर्ता (डॉ. अनन्या)',
    'landing.administrator': 'प्रशासक (एडमिन)',
    'landing.pillarsTitle': 'सक्षम (SAKSHAM) कसे कार्य करते',
    'landing.pillarsDesc': 'एनसीव्हीईटी आरपीएल मार्गदर्शक तत्त्वांचे काटेकोरपणे पालन करून मॅन्युअल मूल्यांकनातील अडचणी सोडवण्यासाठी विकसित केले आहे.',

    // Worker Profile / Self-Declaration
    'profile.title': 'कामगार कौशल्य पासपोर्ट आणि स्व-घोषणा',
    'profile.subtitle': 'कोणत्याही औपचारिक पदवीशिवाय अनौपचारिकपणे मिळवलेला कामाचा अनुभव नोंदवा. डेटा तुमच्या डिव्हाइसवर आपोआप सेव्ह राहतो.',
    'profile.step1': 'सध्याचा व्यवसाय आणि कामाचा अनुभव',
    'profile.occupation': 'तुमचा व्यवसाय / पदाचे नाव *',
    'profile.occupationPlaceholder': 'उदा. इलेक्ट्रिशियन, वेब डेव्हलपर, प्लंबर, सोलर तंत्रज्ञ',
    'profile.expYears': 'कामाच्या अनुभवाची एकूण वर्षे',
    'profile.workplace': 'सध्याचे कामाचे ठिकाण / मालक / स्वयंरोजगार',
    'profile.workplacePlaceholder': 'उदा. स्थानिक आयटी सोल्युशन्स, स्वयंरोजगार, कंत्राटदार',
    'profile.education': 'औपचारिक शिक्षणाची पातळी',
    
    'profile.step2': 'दररोज केली जाणारी प्रत्यक्ष कामे',
    'profile.tasksDesc': 'तुम्ही कामावर प्रत्यक्ष काय करता याचे वर्णन करा. एआय इंजिन अधिकृत एनएसक्यूएफ निकषांशी याची जुळवणी करते.',
    'profile.taskPlaceholder': 'उदा. सोलर पॅनेलची वायरिंग करणे, डिजिटल मल्टीमीटरने व्होल्टेज तपासणे',
    'profile.add': 'जोडा',
    'profile.commonTasks': 'नेहमीची कामे (जोडण्यासाठी क्लिक करा):',
    
    'profile.step3': 'वापरलेली साधने आणि सॉफ्टवेअर',
    'profile.toolPlaceholder': 'उदा. डिजिटल मल्टीमीटर, व्हीएस कोड, वायर स्ट्रिपर, क्लॅम्प मीटर',
    'profile.commonTools': 'नेहमीची साधने व उपकरणे:',

    'profile.step4': 'प्राप्त कौशल्ये आणि शिकण्याची पार्श्वभूमी',
    'profile.skillPlaceholder': 'उदा. सर्किट वायरिंग, विद्युत सुरक्षा, स्प्रिंग बूट, मायएसक्यूएल',
    'profile.commonSkills': 'नेहमीची कौशल्ये:',
    'profile.informalLearning': 'तुम्ही तुमचे काम कसे शिकलात? (अनौपचारिक पार्श्वभूमी / शिकाऊ उमेदवारी)',
    'profile.informalPlaceholder': 'उदा. 3 वर्षांपूर्वी वरिष्ठ कारागिरासोबत मदतनीस म्हणून सुरुवात केली; ग्राहकांची उपकरणे दुरुस्त करून शिकलो.',
    
    'profile.draftSaved': 'स्थानिक मसुदा आपोआप जतन झाला आहे.',
    'profile.cancel': 'रद्द करा',
    'profile.submit': 'सबमिट करा आणि एनएसक्यूएफ पात्रता शोधा',
    'profile.submitting': 'सबमिट आणि जुळवणी सुरू आहे...',

    // Voice recognition
    'voice.start': 'बोलून नोंदवा (व्हॉइस इनपुट)',
    'voice.listening': 'ऐकत आहे... कृपया तुमच्या भाषेत बोला',
    'voice.stop': 'व्हॉइस थांबवा',
    'voice.unsupported': 'या ब्राउझरमध्ये व्हॉइस डिक्टेशन उपलब्ध नाही. कृपया गुगल क्रोम किंवा मायक्रोसॉफ्ट एज वापरा.',
    'voice.permissionDenied': 'मायक्रोफोन परवानगी नाकारली गेली. कृपया ब्राउझर सेटिंग्जमध्ये परवानगी द्या.',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('rpl_language') as Language;
    return saved === 'hi' || saved === 'mr' ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('rpl_language', lang);
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  const speechLangCode = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, speechLangCode }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
