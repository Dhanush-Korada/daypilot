import React, { useState } from 'react';
import {
  FEATURE_GUIDE_ITEMS,
  REMINDERS_WHILE_USING_OTHER_APPS,
  FAQ_ITEMS,
  REMINDER_CHECKLIST_ITEMS,
  FeatureGuideItem,
  FAQItem,
} from '../../config/featureGuide';
import {
  HelpCircle,
  Search,
  BookOpen,
  BellRing,
  CheckSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Volume2,
  CheckCircle,
  AlertCircle,
  Compass,
  Calendar,
  Flame,
  Layers,
  Tag,
  Palette,
  ShieldCheck,
  Check,
  ExternalLink,
  Laptop,
  Smartphone,
  Info,
} from 'lucide-react';

export const HelpGuidePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'features' | 'background-reminders' | 'faq' | 'checklist'>('features');
  const [featureSearch, setFeatureSearch] = useState('');
  const [faqSearch, setFaqSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(FAQ_ITEMS[0]?.id || null);

  // Interactive Checklist State
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    'check-permission': typeof Notification !== 'undefined' && Notification.permission === 'granted',
  });

  // Sound & Notification Test Status
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const toggleChecklist = (id: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleTestChimeAndNotification = async () => {
    try {
      // 1. Play Synthesized Chime using Web Audio API
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        // Pleasant double-tone chord
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.12); // A5

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
      }

      // 2. Test Browser Notification
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('DayPilot Reminder Test', {
            body: 'Audio chime and notification test successful! You are ready for live alerts.',
            icon: '/favicon.ico',
          });
          setTestStatus('Chime played and notification dispatched!');
        } else if (Notification.permission !== 'denied') {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            new Notification('DayPilot Notification Enabled', {
              body: 'Permissions granted! You will now receive background reminders.',
            });
            setCheckedItems(prev => ({ ...prev, 'check-permission': true }));
            setTestStatus('Permission granted and test notification sent!');
          } else {
            setTestStatus('Notification permission was dismissed or blocked.');
          }
        } else {
          setTestStatus('Notifications are blocked in your browser settings. Please allow notifications for this site.');
        }
      } else {
        setTestStatus('Chime played! (Web Notifications API is not supported in this browser sandbox).');
      }

      setTimeout(() => setTestStatus(null), 5000);
    } catch (err) {
      setTestStatus('Chime played successfully.');
      setTimeout(() => setTestStatus(null), 4000);
    }
  };

  const handleRequestPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setCheckedItems(prev => ({ ...prev, 'check-permission': true }));
        setTestStatus('Notification permission successfully granted!');
      } else {
        setTestStatus(`Permission status: ${perm}`);
      }
      setTimeout(() => setTestStatus(null), 4000);
    }
  };

  const getFeatureIcon = (iconName: string) => {
    switch (iconName) {
      case 'Compass':
        return <Compass className="w-5 h-5 text-indigo-500" />;
      case 'CheckSquare':
        return <CheckSquare className="w-5 h-5 text-emerald-500" />;
      case 'Calendar':
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'Flame':
        return <Flame className="w-5 h-5 text-orange-500" />;
      case 'Layers':
        return <Layers className="w-5 h-5 text-purple-500" />;
      case 'Tag':
        return <Tag className="w-5 h-5 text-pink-500" />;
      case 'Palette':
        return <Palette className="w-5 h-5 text-amber-500" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-teal-500" />;
      default:
        return <BookOpen className="w-5 h-5 text-indigo-500" />;
    }
  };

  // Filter Features
  const filteredFeatures = FEATURE_GUIDE_ITEMS.filter(f => {
    const matchesCat = selectedCategory === 'all' || f.category === selectedCategory;
    const matchesSearch =
      featureSearch.trim() === '' ||
      f.title.toLowerCase().includes(featureSearch.toLowerCase()) ||
      f.summary.toLowerCase().includes(featureSearch.toLowerCase()) ||
      f.whatItDoes.toLowerCase().includes(featureSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Filter FAQ
  const filteredFaqs = FAQ_ITEMS.filter(
    faq =>
      faqSearch.trim() === '' ||
      faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.answer.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.category.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const completedChecksCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          How to use DayPilot
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Comprehensive feature manuals, background reminder guides, searchable FAQ, and troubleshooting checklist
        </p>
      </div>

      {testStatus && (
        <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-2xl text-indigo-700 dark:text-indigo-300 text-sm flex items-center gap-2.5 shadow-xs">
          <Info className="w-5 h-5 shrink-0" />
          <span>{testStatus}</span>
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('features')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'features'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Feature Guides ({FEATURE_GUIDE_ITEMS.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('background-reminders')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'background-reminders'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BellRing className="w-4 h-4 text-amber-500" />
          <span>Reminders While Using Other Apps</span>
        </button>

        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'checklist'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4 text-emerald-500" />
          <span>Reminder Checklist ({completedChecksCount}/{REMINDER_CHECKLIST_ITEMS.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('faq')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'faq'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-blue-500" />
          <span>Searchable FAQ ({FAQ_ITEMS.length})</span>
        </button>
      </div>

      {/* SECTION 1: FEATURE GUIDES */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search features (e.g. calendar, recurring, streak)..."
                value={featureSearch}
                onChange={e => setFeatureSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-2xl text-xs sm:text-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {['all', 'Dashboard', 'Tasks', 'Calendar', 'Habits', 'Templates', 'Customization', 'Data & Privacy'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {cat === 'all' ? 'All Features' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-5">
            {filteredFeatures.map(item => (
              <div
                key={item.id}
                className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      {getFeatureIcon(item.icon)}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.summary}
                      </p>
                    </div>
                  </div>

                  <span className="self-start sm:self-auto text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
                    {item.category}
                  </span>
                </div>

                {/* What It Does */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    What It Does
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {item.whatItDoes}
                  </p>
                </div>

                {/* Step-by-Step How to Access It */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/80">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2.5 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" />
                    Step-by-Step: How to Access & Use
                  </h3>
                  <ol className="space-y-2">
                    {item.stepByStep.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-normal">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Pro Tips */}
                {item.tips && item.tips.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Pro Tips
                    </h3>
                    <ul className="space-y-1.5">
                      {item.tips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <span className="text-amber-500 mt-0.5">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            {filteredFeatures.length === 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-zinc-800">
                <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No matching guides found
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Try adjusting your search query or reset category filter.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: GETTING REMINDERS WHILE USING OTHER APPS */}
      {activeTab === 'background-reminders' && (
        <div className="space-y-6">
          {/* Hero Banner Card */}
          <div className="bg-linear-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg border border-indigo-800/40 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs font-semibold">
              <BellRing className="w-3.5 h-3.5 text-amber-300" />
              <span>Background Alert Protocol</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {REMINDERS_WHILE_USING_OTHER_APPS.title}
            </h2>

            <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed max-w-2xl">
              {REMINDERS_WHILE_USING_OTHER_APPS.overview}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={handleTestChimeAndNotification}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-2xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Test Audio Chime & Notification</span>
              </button>

              <button
                onClick={handleRequestPermission}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl text-xs flex items-center gap-2 border border-white/20 transition-all cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Enable Browser Notifications</span>
              </button>
            </div>
          </div>

          {/* Step Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REMINDERS_WHILE_USING_OTHER_APPS.sections.map((sec, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {sec.title}
                  </h3>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line pl-9">
                  {sec.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: REMINDER TROUBLESHOOTING CHECKLIST */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Reminder Diagnostic & Setup Checklist
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Walk through these 6 checks to guarantee 100% timely alert delivery on this device
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50">
                  {completedChecksCount} of {REMINDER_CHECKLIST_ITEMS.length} verified
                </span>
                <button
                  onClick={handleTestChimeAndNotification}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Test Chime</span>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${(completedChecksCount / REMINDER_CHECKLIST_ITEMS.length) * 100}%` }}
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-3 pt-1">
              {REMINDER_CHECKLIST_ITEMS.map(item => {
                const isChecked = Boolean(checkedItems[item.id]);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklist(item.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                      isChecked
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                        : 'bg-slate-50/80 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isChecked
                          ? 'bg-emerald-500 text-white'
                          : 'border-2 border-slate-300 dark:border-zinc-600'
                      }`}
                    >
                      {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-bold ${isChecked ? 'text-slate-900 dark:text-slate-100' : 'text-slate-800 dark:text-slate-200'}`}>
                          {item.title}
                        </p>
                        {item.actionText && !isChecked && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRequestPermission();
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold shrink-0 cursor-pointer"
                          >
                            {item.actionText}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: SEARCHABLE FAQ */}
      {activeTab === 'faq' && (
        <div className="space-y-5">
          {/* FAQ Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search frequently asked questions..."
              value={faqSearch}
              onChange={e => setFaqSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
          </div>

          {/* Accordion FAQ list */}
          <div className="space-y-3">
            {filteredFaqs.map(faq => {
              const isOpen = expandedFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs transition-colors"
                >
                  <button
                    onClick={() => setExpandedFaqId(isOpen ? null : faq.id)}
                    className="w-full flex items-center justify-between p-4 text-left transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3 pr-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        {faq.category}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {faq.question}
                      </span>
                    </div>

                    <div className="p-1 text-slate-400 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-zinc-800 whitespace-pre-line bg-slate-50/50 dark:bg-zinc-950/30">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredFaqs.length === 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-zinc-800">
                <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No matching FAQ items
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Try searching for different keywords like reminders, streaks, calendar, or privacy.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
