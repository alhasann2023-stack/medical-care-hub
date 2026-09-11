import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  ShieldAlert,
  FileText,
  Pill,
  Stethoscope,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Info,
  Zap,
  BrainCircuit,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { BotRole, GeminiModelType, ChatMessage, Language } from '../../types';
import { geminiService } from '../../services/geminiService';

interface GeminiMedicalChatProps {
  language: Language;
  initialRole?: BotRole;
}

export const GeminiMedicalChat: React.FC<GeminiMedicalChatProps> = ({
  language,
  initialRole = 'general',
}) => {
  const isAr = language === 'ar';

  const [botRole, setBotRole] = useState<BotRole>(initialRole);
  const [model, setModel] = useState<GeminiModelType>('gemini-3.5-flash');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initial welcome message per role
  const getWelcomeMessage = (role: BotRole): string => {
    switch (role) {
      case 'triage':
        return isAr
          ? 'مرحباً بك في خدمة الفرز الطبي والطوارئ الذكية. يرجى وصف الأعراض بدقة مع تحديد مدتها وشدتها لمساعدتك على تقييم مستوى الأولوية والإجراء الأنسب.'
          : 'Welcome to Smart Medical Triage. Please describe your symptoms, onset, and severity so we can assess urgency and recommended action.';
      case 'reports':
        return isAr
          ? 'مرحباً بك في مفسر التحاليل الطبية. يمكنك كتابة قيم الفحوصات المخبرية (مثل: CBC، سكر صائم، وظائف كبد أو كلى) وسأشرح لك دلالتها والنسب المرجعية بوضوح.'
          : 'Welcome to the Lab & Test Interpreter. Share your test results (e.g. CBC, fasting glucose, liver/kidney panels) to get clear explanations of values.';
      case 'pharmacist':
        return isAr
          ? 'أهلاً بك في العيادة الصيدلانية التوعوية. أنا هنا للإجابة على استفساراتك حول كيفية تناول الأدوية، التداخلات الدوائية المحتملة، والآثار الجانبية الشائعة.'
          : 'Welcome to the Clinical Pharmacy guide. Ask about medication timing, potential drug interactions, storage, and general precautions.';
      case 'general':
      default:
        return isAr
          ? 'مرحباً بك! أنا مساعدك الطبي الذكي المدعوم بنماذج Gemini المتقدمة. كيف يمكنني مساعدتك في صحتك اليوم؟ يمكنك سؤالي عن أي أعراض، نصائح وقائية، أو توضيحات طبية.'
          : 'Hello! I am your AI Medical Assistant powered by Gemini. How can I assist with your health questions today?';
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'model',
      text: getWelcomeMessage('general'),
      timestamp: new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.5-flash',
      botRole: 'general',
    },
  ]);

  // When role changes, add a role introduction if last message was from model
  const handleRoleChange = (newRole: BotRole) => {
    setBotRole(newRole);
    // Suggest recommended model based on role
    if (newRole === 'triage') {
      setModel('gemini-3.1-flash-lite'); // Ultra-fast for triage
    } else if (newRole === 'reports') {
      setModel('gemini-3.1-pro-preview'); // Complex reasoning for lab analysis
    } else {
      setModel('gemini-3.5-flash'); // General
    }

    const introMsg: ChatMessage = {
      id: `role-switch-${Date.now()}`,
      role: 'model',
      text: getWelcomeMessage(newRole),
      timestamp: new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      modelUsed: model,
      botRole: newRole,
    };
    setMessages((prev) => [...prev, introMsg]);
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setErrorText(null);
    setInputMessage('');

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      botRole,
    };

    // Update message history
    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setIsLoading(true);

    try {
      // Prepare message chain for multi-turn history
      // We take the last 8 messages for optimal context window
      const historyPayload = updatedHistory.slice(-8).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await geminiService.sendMessage({
        messages: historyPayload,
        model,
        botRole,
      });

      const assistantMessage: ChatMessage = {
        id: `ast-${Date.now()}`,
        role: 'model',
        text: res.text,
        timestamp: new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: res.modelUsed || model,
        botRole,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorText(
        isAr
          ? 'تعذر الاتصال بالمساعد الطبي حالياً. يرجى التحقق من الاتصال وإعادة المحاولة.'
          : 'Could not connect to the medical assistant. Please try again.'
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'model',
        text: getWelcomeMessage(botRole),
        timestamp: new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: model,
        botRole,
      },
    ]);
  };

  // Quick suggestion chips based on active role
  const suggestionChips: Record<BotRole, string[]> = {
    general: [
      isAr ? 'ما هي أسباب خفقان القلب المفاجئ ومتى يستدعي القلق؟' : 'What causes sudden heart palpitations?',
      isAr ? 'ما هي أعراض نقص فيتامين د3 الشائعة؟' : 'Common symptoms of Vitamin D deficiency?',
      isAr ? 'كيف أفرق بين نزلات البرد العادية والإنفلونزا الموسمية؟' : 'Difference between common cold and influenza?',
    ],
    triage: [
      isAr ? 'أشعر بألم حاد في الصدر يمتد للكتف الأيسر' : 'Sharp chest pain radiating to left shoulder',
      isAr ? 'ارتفاع حرارة طفل (39 درجة) مع خمول' : 'Child fever (39C) with lethargy',
      isAr ? 'إصابة بالتواء في الكاحل مع تورم شديد' : 'Severe ankle sprain with swelling',
    ],
    reports: [
      isAr ? 'ما معنى أن تكون نسبة كريات الدم البيضاء (WBC) 12.5؟' : 'What does WBC 12.5 mean?',
      isAr ? 'السكر التراكمي (HbA1c) نتيجته 6.8%، ما دلالته؟' : 'HbA1c result is 6.8%, what does it mean?',
      isAr ? 'تفسير انخفاض الهيموجلوبين إلى 10.2 g/dL' : 'Hemoglobin at 10.2 g/dL explanation',
    ],
    pharmacist: [
      isAr ? 'هل يؤخذ دواء الضغط في الصباح أم المساء؟' : 'Should BP meds be taken morning or evening?',
      isAr ? 'ماذا أفعل إذا نسيت جرعة المضاد الحيوي؟' : 'What to do if I miss an antibiotic dose?',
      isAr ? 'هل يتعارض الباراسيتامول مع الأسبرين؟' : 'Does Paracetamol interact with Aspirin?',
    ],
  };

  const roleDefinitions = [
    {
      id: 'general' as BotRole,
      labelAr: 'استشاري عام',
      labelEn: 'General Consultant',
      icon: Stethoscope,
      descAr: 'استشارات طبية شاملة وشرح الأعراض',
      descEn: 'General clinical Q&A and symptoms guide',
      color: 'text-teal-700 bg-teal-50 border-teal-200',
    },
    {
      id: 'triage' as BotRole,
      labelAr: 'الفرز والطوارئ',
      labelEn: 'Emergency Triage',
      icon: ShieldAlert,
      descAr: 'تقييم درجة الخطورة وعلامات الخطر',
      descEn: 'Urgency assessment & red flags',
      color: 'text-rose-700 bg-rose-50 border-rose-200',
    },
    {
      id: 'reports' as BotRole,
      labelAr: 'تفسير الفحوصات',
      labelEn: 'Lab Interpreter',
      icon: FileText,
      descAr: 'شرح نتائج التحاليل والنسب الطبيعية',
      descEn: 'Explain blood tests and scan values',
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    },
    {
      id: 'pharmacist' as BotRole,
      labelAr: 'الدليل الدوائي',
      labelEn: 'Pharmacist Guide',
      icon: Pill,
      descAr: 'طرق الاستخدام والتداخلات والجرعات',
      descEn: 'Medication timing & interactions',
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-10.5rem)] max-h-[850px] min-h-[580px] bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      
      {/* Top Header: Role & Model Configuration */}
      <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Active Bot Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  {isAr ? 'المساعد الطبي الذكي متعدد الأدوار' : 'Multi-Role Medical AI Assistant'}
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {isAr ? 'نشط ومحدث' : 'Live'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'محادثة مستمرة مع حفظ سياق الحوار وإمكانية تبديل الأدوار ونماذج الذكاء الاصطناعي'
                  : 'Multi-turn conversation with memory context and dynamic AI models'}
              </p>
            </div>
          </div>

          {/* Model Switcher & Reset */}
          <div className="flex items-center gap-2">
            {/* Model Selector Pill */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <label className="text-[11px] text-slate-500 font-semibold hidden sm:inline">
                {isAr ? 'النموذج:' : 'Model:'}
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as GeminiModelType)}
                className="font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer text-xs"
              >
                <option value="gemini-3.5-flash">
                  Gemini 3.5 Flash ({isAr ? 'للمهام العامة' : 'General Tasks'})
                </option>
                <option value="gemini-3.1-pro-preview">
                  Gemini 3.1 Pro ({isAr ? 'تفكير سريري معقد' : 'Complex Tasks'})
                </option>
                <option value="gemini-3.1-flash-lite">
                  Gemini 3.1 Flash-Lite ({isAr ? 'استجابة فائقة السرعة' : 'Fast Tasks'})
                </option>
              </select>
            </div>

            {/* Clear Chat Button */}
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
              title={isAr ? 'مسح المحادثة وبدء حوار جديد' : 'Clear chat history'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isAr ? 'محادثة جديدة' : 'New Chat'}</span>
            </button>
          </div>
        </div>

        {/* Roles Selector Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {roleDefinitions.map((roleDef) => {
            const Icon = roleDef.icon;
            const isSelected = botRole === roleDef.id;
            return (
              <button
                key={roleDef.id}
                onClick={() => handleRoleChange(roleDef.id)}
                className={`flex items-center gap-2 p-2 rounded-xl border text-start transition-all cursor-pointer ${
                  isSelected
                    ? `${roleDef.color} shadow-xs font-bold ring-2 ring-teal-500/20`
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-white shadow-2xs' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold leading-tight truncate">
                    {isAr ? roleDef.labelAr : roleDef.labelEn}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate hidden xl:block">
                    {isAr ? roleDef.descAr : roleDef.descEn}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Scrollable Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-slate-50/50 to-white">
        
        {/* Safety & Medical Disclaimer Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">
              {isAr ? 'تنويه طبي هام:' : 'Medical Disclaimer:'}{' '}
            </span>
            {isAr
              ? 'المعلومات المقدمة من المساعد الذكي هي لغرض التثقيف والتوجيه المبدئي، ولا تغني بأي حال عن الفحص السريري المباشر. في الحالات الطارئة، يرجى التوجه لأقرب مستشفى فوراً.'
              : 'AI medical guidance is for informational purposes only and does not substitute professional medical diagnosis. In emergencies, call your local emergency number immediately.'}
          </div>
        </div>

        {/* Messages List */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${
                  isUser
                    ? 'bg-blue-700 text-white'
                    : 'bg-teal-700 text-white'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 sm:p-4 shadow-xs relative group ${
                  isUser
                    ? 'bg-blue-700 text-white rounded-tr-xs'
                    : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs'
                }`}
              >
                {/* Assistant Message Header Info */}
                {!isUser && (
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="font-bold text-teal-700">
                        {isAr ? 'المساعد الطبي' : 'Medical Assistant'}
                      </span>
                      {msg.modelUsed && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono text-[10px]">
                          {msg.modelUsed}
                        </span>
                      )}
                    </div>
                    <span>{msg.timestamp}</span>
                  </div>
                )}

                {/* Message Text Content with clean formatting */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {msg.text}
                </div>

                {/* User Message Footer */}
                {isUser && (
                  <div className="text-[10px] text-blue-200 text-end mt-1 font-medium">
                    {msg.timestamp}
                  </div>
                )}

                {/* Copy Button for Model Responses */}
                {!isUser && (
                  <div className="mt-2 pt-1 flex justify-end">
                    <button
                      onClick={() => handleCopyText(msg.id, msg.text)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-200 cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">{isAr ? 'تم النسخ' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>{isAr ? 'نسخ الإجابة' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-3.5 shadow-xs flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                {isAr
                  ? `يقوم النموذج (${model}) بتحليل سؤالك الطبي...`
                  : `Model (${model}) is generating response...`}
              </span>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorText && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
            <span>{errorText}</span>
            <button
              onClick={() => handleSendMessage()}
              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition cursor-pointer"
            >
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-bold text-slate-500 shrink-0 flex items-center gap-1">
          <MessageSquare className="w-3 h-3 text-teal-600" />
          {isAr ? 'أسئلة مقترحة:' : 'Suggestions:'}
        </span>
        {suggestionChips[botRole].map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(chip)}
            disabled={isLoading}
            className="text-xs font-medium text-slate-700 hover:text-teal-900 bg-white hover:bg-teal-50 border border-slate-200/80 hover:border-teal-300 px-3 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Form Box */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder={
                isAr
                  ? `اطرح استفسارك الطبي هنا لـ (${roleDefinitions.find((r) => r.id === botRole)?.labelAr})... (اضغط Enter للإرسال)`
                  : `Type your medical question here for (${botRole})... (Press Enter to send)`
              }
              className="w-full resize-none p-3 text-sm text-slate-900 bg-slate-50 rounded-xl border border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-hidden transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="h-12 px-4 sm:px-5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-all shadow-md shadow-teal-600/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-4 h-4 rtl:-scale-x-100" />
            <span className="hidden sm:inline">{isAr ? 'إرسال' : 'Send'}</span>
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 px-1">
          <span>
            {isAr
              ? `النموذج الحالي: ${model} | الدور: ${roleDefinitions.find((r) => r.id === botRole)?.labelAr}`
              : `Active model: ${model} | Role: ${botRole}`}
          </span>
          <span>
            {isAr ? 'Shift + Enter لسطر جديد' : 'Shift + Enter for new line'}
          </span>
        </div>
      </div>
    </div>
  );
};
