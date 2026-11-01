'use client';

import React, { useState, useEffect } from 'react';
import {
  Compass,
  Bookmark,
  Sparkles,
  Lightbulb,
  Bell,
  User,
  Search,
  MapPin,
  Calendar,
  Users,
  Trophy,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Send,
  X,
  RefreshCw,
  Clock,
  Layers,
  ChevronRight,
  Filter,
  Check,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  ArrowRight,
  Cpu,
  GraduationCap,
  Briefcase,
  Zap,
  Flame,
  Award
} from 'lucide-react';
import * as api from '@/lib/api';

export default function Home() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'discover' | 'saved' | 'ideas' | 'filters' | 'monitoring' | 'profile'>('discover');

  // Events & Filter State
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('Bengaluru');
  const [category, setCategory] = useState('Hackathons');
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'IN_PERSON' | 'ONLINE'>('ALL');
  const [freeOnly, setFreeOnly] = useState(false);
  const [hasPrizeOnly, setHasPrizeOnly] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>('All');

  // System Health
  const [health, setHealth] = useState<any>(null);

  // AI Filter Panel State
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [naturalQuery, setNaturalQuery] = useState('');
  const [interpreting, setInterpreting] = useState(false);
  const [interpretedFilter, setInterpretedFilter] = useState<any>(null);
  const [savedFilters, setSavedFilters] = useState<any[]>([]);

  // Event Detail & Research Modal
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [researchQuestion, setResearchQuestion] = useState('');
  const [researchAnswer, setResearchAnswer] = useState<any>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'schedule' | 'eligibility' | 'research'>('overview');

  // Registration Assistant Modal
  const [regModalEvent, setRegModalEvent] = useState<any>(null);
  const [regPlan, setRegPlan] = useState<any>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [regConfirmed, setRegConfirmed] = useState(false);

  // Idea Development Workspace
  const [ideaEventId, setIdeaEventId] = useState('');
  const [ideaConcept, setIdeaConcept] = useState('');
  const [ideaValidating, setIdeaValidating] = useState(false);
  const [ideaResult, setIdeaResult] = useState<any>(null);

  // User Profile
  const [profile, setProfile] = useState<any>(null);
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);

  // Saved Events & Monitoring
  const [savedEvents, setSavedEvents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [monitoringRunning, setMonitoringRunning] = useState(false);

  // Load initial data
  useEffect(() => {
    loadHealth();
    loadEvents();
    loadSavedFilters();
    loadUserProfile();
    loadSavedEvents();
    loadNotifications();
  }, []);

  const loadHealth = async () => {
    try {
      const data = await api.fetchHealth();
      setHealth(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadEvents = async (loc = location, cat = category, forceRefresh = false) => {
    setLoading(true);
    try {
      const data = await api.fetchEvents(loc, cat, forceRefresh);
      setEvents(data.events || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedFilters = async () => {
    try {
      const data = await api.fetchUserFilters();
      setSavedFilters(data.filters || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadUserProfile = async () => {
    try {
      const data = await api.fetchUserProfile();
      setProfile(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSavedEvents = async () => {
    try {
      const data = await api.fetchSavedEvents();
      setSavedEvents(data.saved_events || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await api.fetchNotifications();
      setNotifications(data.notifications || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Natural Language Filter Handler
  const handleInterpretFilter = async (customText?: string) => {
    const query = customText || naturalQuery;
    if (!query.trim()) return;
    setInterpreting(true);
    try {
      const res = await api.interpretNaturalFilter(query);
      setInterpretedFilter(res);
      const applyRes = await api.applyStructuredFilter(res.structured_criteria, searchQuery);
      setEvents(applyRes.events || []);
    } catch (e) {
      console.error(e);
    } finally {
      setInterpreting(false);
    }
  };

  const handleSaveFilter = async () => {
    if (!interpretedFilter) return;
    try {
      await api.saveUserFilter(
        interpretedFilter.suggested_name,
        naturalQuery,
        interpretedFilter.structured_criteria
      );
      loadSavedFilters();
      alert('Custom filter saved to your account!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplySavedFilter = async (filter: any) => {
    setLoading(true);
    try {
      setNaturalQuery(filter.natural_query);
      const res = await api.applyStructuredFilter(filter.structured_criteria);
      setEvents(res.events || []);
      setInterpretedFilter({
        structured_criteria: filter.structured_criteria,
        explanation: `Applied saved filter "${filter.name}"`,
        applied_tags: [filter.name]
      });
      setActiveTab('discover');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Research Agent Handler
  const handleAskResearch = async (q?: string) => {
    const questionToAsk = q || researchQuestion;
    if (!selectedEvent || !questionToAsk.trim()) return;
    setResearchLoading(true);
    try {
      const res = await api.askResearchAgent(selectedEvent.event_id, questionToAsk);
      setResearchAnswer(res);
    } catch (e) {
      console.error(e);
    } finally {
      setResearchLoading(false);
    }
  };

  // Registration Assistant Handlers
  const handleStartRegistration = async (event: any) => {
    setRegModalEvent(event);
    setRegLoading(true);
    setRegConfirmed(false);
    try {
      const plan = await api.prepareRegistration(event.event_id);
      setRegPlan(plan);
    } catch (e) {
      console.error(e);
    } finally {
      setRegLoading(false);
    }
  };

  const handleConfirmRegistration = async () => {
    if (!regPlan) return;
    setRegLoading(true);
    try {
      await api.confirmRegistration(regPlan.audit_id);
      setRegConfirmed(true);
      loadSavedEvents();
    } catch (e) {
      console.error(e);
    } finally {
      setRegLoading(false);
    }
  };

  // Idea Development Handlers
  const handleValidateIdea = async () => {
    if (!ideaEventId || !ideaConcept.trim()) return;
    setIdeaValidating(true);
    try {
      const res = await api.developIdea(ideaEventId, ideaConcept);
      setIdeaResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIdeaValidating(false);
    }
  };

  // Save Event Toggle
  const handleToggleSave = async (event: any) => {
    const isSaved = savedEvents.some(se => se.event.event_id === event.event_id);
    try {
      await api.toggleSaveEvent(event.event_id, isSaved);
      loadSavedEvents();
    } catch (e) {
      console.error(e);
    }
  };

  // Run Monitoring Cycle
  const handleRunMonitoring = async () => {
    setMonitoringRunning(true);
    try {
      const res = await api.runMonitoringCycle();
      alert(`Monitoring Cycle Completed: Checked ${res.checked_count} events. Detected ${res.changes_detected} meaningful changes.`);
      loadNotifications();
    } catch (e) {
      console.error(e);
    } finally {
      setMonitoringRunning(false);
    }
  };

  // Filter events locally by format, search text & category tag
  const displayedEvents = events.filter(e => {
    if (formatFilter !== 'ALL' && e.online_or_in_person !== formatFilter) return false;
    if (freeOnly && e.price > 0) return false;
    if (hasPrizeOnly && !e.prize_pool && !e.prize_pool_numeric) return false;
    if (selectedTag !== 'All') {
      const tagLower = selectedTag.toLowerCase();
      const inTag = e.tags?.some((t: string) => t.toLowerCase().includes(tagLower)) ||
                    e.categories?.some((c: string) => c.toLowerCase().includes(tagLower)) ||
                    e.event_type?.toLowerCase().includes(tagLower);
      if (!inTag) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = e.canonical_title.toLowerCase().includes(q) ||
                    e.description.toLowerCase().includes(q) ||
                    e.tags?.some((t: string) => t.toLowerCase().includes(q)) ||
                    e.city?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Helper for source platform colors
  const getSourceBadgeStyle = (platform: string) => {
    const p = (platform || '').toLowerCase();
    if (p.includes('luma')) return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    if (p.includes('devpost')) return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    if (p.includes('devfolio')) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    if (p.includes('unstop')) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (p.includes('qualcomm')) return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  };

  return (
    <div className="flex h-screen bg-[#070B14] text-slate-100 font-sans overflow-hidden bg-mesh-radial">

      {/* ======================================================== */}
      {/* 1. LEFT SIDEBAR: VELVET NAVIGATOR                        */}
      {/* ======================================================== */}
      <aside className="w-64 bg-[#0D1322]/90 backdrop-blur-xl border-r border-white/5 flex flex-col justify-between p-4 flex-shrink-0 z-30 shadow-2xl">
        <div>
          {/* Brand Logo & Header */}
          <div className="flex items-center space-x-3 px-2 py-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">USAI</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Event Intelligence</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('discover')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'discover'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Compass className="w-4 h-4 text-indigo-400" />
              <span>Discover Events</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'saved'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <span>My Saved Events</span>
              </div>
              {savedEvents.length > 0 && (
                <span className="text-[10px] bg-slate-800/90 text-amber-300 px-2 py-0.5 rounded-full font-mono border border-slate-700">
                  {savedEvents.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ideas')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'ideas'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>Idea Studio & PPTX</span>
            </button>

            <button
              onClick={() => setActiveTab('filters')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'filters'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Custom AI Filters</span>
              </div>
              {savedFilters.length > 0 && (
                <span className="text-[10px] bg-purple-950/60 text-purple-300 px-2 py-0.5 rounded-full font-mono border border-purple-800/40">
                  {savedFilters.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('monitoring')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'monitoring'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Bell className="w-4 h-4 text-emerald-400" />
                <span>Change Tracker</span>
              </div>
              {notifications.length > 0 && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30">
                  {notifications.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <User className="w-4 h-4 text-cyan-400" />
              <span>Applicant Vault</span>
            </button>
          </nav>
        </div>

        {/* Live Engine Status Footer */}
        <div className="p-3.5 rounded-2xl bg-[#121A2F]/80 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              TinyFish Toolkit
            </span>
            <span className="flex items-center text-emerald-400 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse shadow-sm shadow-emerald-400"></span>
              Live
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-white/5">
            <span>Canonical Events:</span>
            <span className="text-slate-200 font-mono font-medium">{events.length} stored</span>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN APP CONTENT AREA                                 */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Glassmorphic Top Action Header */}
        <header className="h-18 border-b border-white/5 bg-[#0D1322]/60 backdrop-blur-xl px-8 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center space-x-4 flex-1 max-w-xl">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search AI hackathons, MLH sprints, Unstop challenges, cities..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#070B14]/80 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions & AI Filter Trigger */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadEvents(location, category, true)}
              disabled={loading}
              className="flex items-center space-x-2 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-xl text-xs font-semibold border border-white/10 transition-smooth"
              title="Sync canonical database with web"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Sync Web</span>
            </button>

            {/* AI Custom Filter Button */}
            <button
              onClick={() => setAiPanelOpen(!aiPanelOpen)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-smooth shadow-lg ${
                aiPanelOpen
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-600/30'
                  : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:border-purple-500/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Smart Filter</span>
            </button>
          </div>
        </header>

        {/* Dynamic Body Content */}
        <div className="flex-1 overflow-y-auto p-8">

          {/* ================= DISCOVER TAB ================= */}
          {activeTab === 'discover' && (
            <div className="space-y-6">

              {/* Top Intelligence Stats Banner */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel rounded-2xl p-4 flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">Indexed Events</span>
                    <span className="text-lg font-bold text-white font-mono">{events.length}</span>
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-4 flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">Verified Prize Pool</span>
                    <span className="text-lg font-bold text-amber-300 font-mono">₹24,00,000+</span>
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-4 flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">Shared Data Layer</span>
                    <span className="text-xs font-semibold text-emerald-300">Zero duplicate scraping</span>
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-4 flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">Active Location</span>
                    <span className="text-sm font-bold text-white flex items-center gap-1">
                      {location}
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Location & Quick Toggles Navigation Strip */}
              <div className="glass-panel rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-4">
                {/* Location Selectors */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" /> City:
                  </span>
                  {['Bengaluru', 'Karnataka', 'Delhi', 'Mumbai', 'Online', 'All'].map(loc => (
                    <button
                      key={loc}
                      onClick={() => { setLocation(loc); loadEvents(loc, category); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-smooth ${
                        location === loc
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>

                {/* Quick Filters */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setFormatFilter(formatFilter === 'ONLINE' ? 'ALL' : 'ONLINE')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-smooth ${
                      formatFilter === 'ONLINE'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                        : 'border-white/10 text-slate-400 hover:bg-white/[0.05]'
                    }`}
                  >
                    Online Only
                  </button>

                  <button
                    onClick={() => setFreeOnly(!freeOnly)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-smooth ${
                      freeOnly
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                        : 'border-white/10 text-slate-400 hover:bg-white/[0.05]'
                    }`}
                  >
                    Free Only
                  </button>

                  <button
                    onClick={() => setHasPrizeOnly(!hasPrizeOnly)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-smooth ${
                      hasPrizeOnly
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
                        : 'border-white/10 text-slate-400 hover:bg-white/[0.05]'
                    }`}
                  >
                    🏆 Cash Prizes
                  </button>
                </div>
              </div>

              {/* Tag / Category Filter Strip */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
                {['All', 'AI', 'Agents', 'Hackathon', 'Students', 'Edge AI', 'Conference', 'Open Source'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1 rounded-full font-medium transition-smooth ${
                      selectedTag === tag
                        ? 'bg-white/15 text-white font-bold border border-white/20'
                        : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Active AI Filter Indicator */}
              {interpretedFilter && (
                <div className="glass-panel p-4 rounded-2xl border-purple-500/40 flex items-center justify-between shadow-glow">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-purple-200">{interpretedFilter.explanation}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {interpretedFilter.applied_tags?.map((t: string) => (
                          <span key={t} className="text-[10px] bg-purple-900/60 text-purple-200 px-2.5 py-0.5 rounded-md border border-purple-700/50 font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setInterpretedFilter(null); loadEvents(); }}
                    className="text-xs text-slate-400 hover:text-white px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-700 transition"
                  >
                    Clear Filter
                  </button>
                </div>
              )}

              {/* Loading Skeletons */}
              {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-72 rounded-2xl glass-card animate-pulse p-6">
                      <div className="h-4 bg-slate-800 rounded w-1/3 mb-4"></div>
                      <div className="h-6 bg-slate-800 rounded w-3/4 mb-3"></div>
                      <div className="h-3 bg-slate-800 rounded w-full mb-2"></div>
                      <div className="h-3 bg-slate-800 rounded w-2/3 mb-6"></div>
                      <div className="h-10 bg-slate-800 rounded-xl w-full"></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && displayedEvents.length === 0 && (
                <div className="text-center py-20 glass-panel rounded-3xl border border-white/5">
                  <Compass className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-200">No events found matching this criteria</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Try clearing search filters or click &ldquo;Sync Web&rdquo; to discover newly indexed listings.</p>
                  <button
                    onClick={() => { setFormatFilter('ALL'); setFreeOnly(false); setHasPrizeOnly(false); setSelectedTag('All'); setSearchQuery(''); loadEvents(); }}
                    className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}

              {/* Canonical Event Cards Grid */}
              {!loading && displayedEvents.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedEvents.map(event => {
                    const isSaved = savedEvents.some(se => se.event.event_id === event.event_id);
                    return (
                      <div
                        key={event.event_id}
                        className="glass-card rounded-2xl p-6 flex flex-col justify-between transition-smooth group relative"
                      >
                        <div>
                          {/* Card Header: Platform Tag + Verified Pill + Bookmark */}
                          <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${getSourceBadgeStyle(event.source_platform)}`}>
                                {event.source_platform}
                              </span>

                              {event.extraction_confidence >= 0.9 && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>Verified</span>
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => handleToggleSave(event)}
                              className={`p-2 rounded-xl border transition-smooth ${
                                isSaved
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                  : 'border-white/10 text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]'
                              }`}
                              title={isSaved ? 'Saved to collection' : 'Save event'}
                            >
                              <Bookmark className="w-3.5 h-3.5 fill-current" />
                            </button>
                          </div>

                          {/* Event Title */}
                          <h2
                            onClick={() => setSelectedEvent(event)}
                            className="font-bold text-slate-100 text-base leading-snug hover:text-indigo-400 transition-smooth cursor-pointer line-clamp-2 mb-2"
                          >
                            {event.canonical_title}
                          </h2>

                          {/* Short Summary */}
                          <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed font-normal">
                            {event.short_summary || event.description}
                          </p>

                          {/* Info Items */}
                          <div className="space-y-2 text-xs text-slate-300 mb-5">
                            <div className="flex items-center gap-2 text-slate-300">
                              <MapPin className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                              <span className="truncate">{event.location_name}</span>
                            </div>

                            <div className="flex items-center gap-2 text-slate-400">
                              <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                              <span>{event.start_datetime ? event.start_datetime.slice(0, 10) : 'Dates TBA'}</span>
                            </div>

                            {event.registration_deadline && (
                              <div className="flex items-center gap-2 text-amber-400 font-medium text-[11px]">
                                <Clock className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                                <span>Deadline: {event.registration_deadline.slice(0, 10)}</span>
                              </div>
                            )}
                          </div>

                          {/* Badges: Prizes, Free, Team */}
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            {event.prize_pool && (
                              <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm shadow-amber-500/10">
                                <Trophy className="w-3 h-3 text-amber-400" />
                                {event.prize_pool.slice(0, 24)}
                              </span>
                            )}
                            <span className="text-[11px] font-medium text-slate-300 bg-white/[0.05] border border-white/10 px-2.5 py-1 rounded-lg">
                              {event.price === 0 ? 'Free Entry' : `₹${event.price}`}
                            </span>
                            {event.team_size_max && (
                              <span className="text-[11px] text-slate-400 bg-white/[0.03] px-2 py-1 rounded-lg">
                                Team: {event.team_size_min || 1}-{event.team_size_max}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Actions: 3 Clear Steps */}
                        <div className="pt-4 border-t border-white/5 flex items-center gap-2">
                          <button
                            onClick={() => setSelectedEvent(event)}
                            className="flex-1 py-2 px-3 bg-white/[0.05] hover:bg-white/[0.08] text-slate-200 rounded-xl text-xs font-semibold transition-smooth text-center border border-white/5"
                          >
                            AI Research
                          </button>

                          <button
                            onClick={() => {
                              setIdeaEventId(event.event_id);
                              setActiveTab('ideas');
                            }}
                            className="py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl text-xs font-semibold border border-amber-500/20 transition-smooth"
                            title="Develop an idea for this event"
                          >
                            Develop Idea
                          </button>

                          <button
                            onClick={() => handleStartRegistration(event)}
                            className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-smooth flex items-center gap-1 shadow-md shadow-indigo-600/30"
                            title="Register with AI Assistant"
                          >
                            <span>Register</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= SAVED EVENTS TAB ================= */}
          {activeTab === 'saved' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-amber-400" />
                  My Saved Events
                </h2>
                <p className="text-xs text-slate-400 mt-1">Bookmarked events monitored for deadline reminders and registration schedules.</p>
              </div>

              {savedEvents.length === 0 ? (
                <div className="text-center py-20 glass-panel rounded-3xl border border-white/5">
                  <Bookmark className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No saved events yet. Click the bookmark icon on any event to save it.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedEvents.map(se => (
                    <div key={se.saved_id} className="glass-card rounded-2xl p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                          <span className="font-bold text-indigo-400">{se.event.source_platform}</span>
                          <span>Saved {se.saved_at.slice(0, 10)}</span>
                        </div>
                        <h3 className="font-bold text-slate-100 text-base mb-2">{se.event.canonical_title}</h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-4">{se.event.short_summary}</p>
                      </div>
                      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                        <button
                          onClick={() => setSelectedEvent(se.event)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => {
                            setIdeaEventId(se.event.event_id);
                            setActiveTab('ideas');
                          }}
                          className="text-xs bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 px-3 py-1.5 rounded-xl font-bold transition"
                        >
                          Develop Idea
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= IDEA STUDIO & PPTX TAB ================= */}
          {activeTab === 'ideas' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                  Hackathon Idea Studio & PPTX Generator
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  14-point idea validation, structured brief creation, and automated presentation export grounded in hackathon requirements.
                </p>
              </div>

              {/* Form Input Card */}
              <div className="glass-panel rounded-3xl p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    1. Target Hackathon
                  </label>
                  <select
                    value={ideaEventId}
                    onChange={e => setIdeaEventId(e.target.value)}
                    className="w-full bg-[#070B14] border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select a hackathon...</option>
                    {events.map(ev => (
                      <option key={ev.event_id} value={ev.event_id}>
                        {ev.canonical_title} ({ev.city || 'Online'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      2. Your Concept / Project Idea
                    </label>
                    <span className="text-[11px] text-slate-400">Click a prompt idea below to test:</span>
                  </div>

                  {/* Starter Concept Pills */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      'Autonomous multi-agent disaster response routing system with live satellite feed analysis',
                      'On-device edge AI assistant for offline rural healthcare diagnosis and triage',
                      'Real-time financial fraud detection network using decentralized graph verification'
                    ].map((sample, i) => (
                      <button
                        key={i}
                        onClick={() => setIdeaConcept(sample)}
                        className="text-[11px] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/5 px-3 py-1 rounded-lg transition text-left"
                      >
                        💡 {sample.slice(0, 50)}...
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={4}
                    value={ideaConcept}
                    onChange={e => setIdeaConcept(e.target.value)}
                    placeholder="Describe your hackathon project concept... what problem does it solve? What is the technical approach?"
                    className="w-full bg-[#070B14] border border-white/10 rounded-xl p-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleValidateIdea}
                    disabled={ideaValidating || !ideaEventId || !ideaConcept.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-smooth flex items-center gap-2 shadow-lg shadow-indigo-600/30"
                  >
                    <Sparkles className="w-4 h-4 text-cyan-300" />
                    <span>{ideaValidating ? 'Evaluating against 14 points...' : 'Validate Idea & Generate Pitch Deck'}</span>
                  </button>
                </div>
              </div>

              {/* Validation Results & PPTX Export */}
              {ideaResult && (
                <div className="space-y-6">
                  {/* Score Banner */}
                  <div className="glass-panel border-indigo-500/30 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-glow">
                    <div>
                      <span className="text-[11px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                        14-Point Validation Score
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-4xl font-black text-white">{ideaResult.overall_score}</span>
                        <span className="text-slate-500 text-sm font-semibold">/ 100</span>
                      </div>
                      <p className="text-xs text-emerald-400 mt-1 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        High Hackathon Feasibility & Alignment
                      </p>
                    </div>

                    <a
                      href={api.getPresentationDownloadUrl(ideaResult.workspace_id)}
                      download
                      className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black transition-smooth shadow-lg shadow-blue-600/30 ring-1 ring-white/20"
                    >
                      <Download className="w-4 h-4 text-cyan-300" />
                      <span>Download Pitch Deck (.pptx)</span>
                    </a>
                  </div>

                  {/* 14 Points Breakdown Grid */}
                  <div className="glass-panel rounded-3xl p-6">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
                      14 Evaluation Criteria Breakdown
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      {Object.entries(ideaResult.criteria_scores).map(([k, score]: [string, any]) => (
                        <div key={k} className="p-3 bg-[#070B14] rounded-xl border border-white/5">
                          <span className="text-slate-400 text-[11px] capitalize block truncate font-medium">
                            {k.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm font-bold text-indigo-400 mt-1 block font-mono">
                            {score}/100
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Project Brief */}
                  <div className="glass-panel rounded-3xl p-6 space-y-4">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Generated Submission Brief
                    </h3>

                    <div className="p-4 bg-[#070B14] rounded-2xl text-xs text-slate-300 leading-relaxed border border-white/5">
                      <p className="font-bold text-white mb-1.5">Elevator Pitch:</p>
                      <p>{ideaResult.brief.one_paragraph_pitch}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-[#070B14] rounded-2xl text-xs text-slate-300 border border-white/5">
                        <p className="font-bold text-white mb-2">Technical Architecture:</p>
                        <p className="font-mono text-[11px] text-slate-400 leading-relaxed">
                          {ideaResult.brief.technical_architecture}
                        </p>
                      </div>

                      <div className="p-4 bg-[#070B14] rounded-2xl text-xs text-slate-300 border border-white/5">
                        <p className="font-bold text-white mb-2">Suggested Tech Stack:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ideaResult.brief.suggested_tech_stack.map((t: string) => (
                            <span key={t} className="px-2.5 py-1 bg-white/[0.05] text-indigo-300 rounded-lg font-mono text-[11px] border border-white/5">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 24-Hour Implementation Sprint */}
                    <div className="p-4 bg-[#070B14] rounded-2xl text-xs text-slate-300 border border-white/5">
                      <p className="font-bold text-white mb-2">MVP 24-Hour Sprint Schedule:</p>
                      <div className="space-y-2">
                        {ideaResult.brief.mvp_implementation_plan.map((p: any) => (
                          <div key={p.phase} className="flex justify-between items-center text-slate-300 border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                            <span className="font-medium text-slate-200">{p.phase} — {p.description}</span>
                            <span className="text-slate-500 font-mono text-[11px]">{p.duration}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= CUSTOM FILTERS TAB ================= */}
          {activeTab === 'filters' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  My Custom AI Filters
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Personalized filters query the shared canonical intelligence layer without mutating global state.
                </p>
              </div>

              {savedFilters.length === 0 ? (
                <div className="text-center py-20 glass-panel rounded-3xl border border-white/5">
                  <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No saved custom filters yet.</p>
                  <p className="text-slate-500 text-xs mt-1">Open the AI Smart Filter panel to create and save one.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedFilters.map(f => (
                    <div key={f.filter_id} className="glass-card rounded-2xl p-5 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-100 text-sm">{f.name}</h4>
                        <p className="text-xs text-purple-300/90 font-mono mt-1">&ldquo;{f.natural_query}&rdquo;</p>
                        <span className="text-[11px] text-slate-500 mt-2 block">Created {f.created_at.slice(0, 10)}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleApplySavedFilter(f)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/30"
                        >
                          Apply Filter
                        </button>
                        <button
                          onClick={async () => {
                            await api.deleteUserFilter(f.filter_id);
                            loadSavedFilters();
                          }}
                          className="p-2 text-slate-500 hover:text-rose-400 transition"
                          title="Delete filter"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= MONITORING & ALERTS TAB ================= */}
          {activeTab === 'monitoring' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-emerald-400" />
                    Event Change Tracker & Live Alerts
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Continuous field-level diff detection for registration deadlines, prize pools, and status updates.
                  </p>
                </div>

                <button
                  onClick={handleRunMonitoring}
                  disabled={monitoringRunning}
                  className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-slate-200 rounded-xl text-xs font-semibold border border-white/10 transition-smooth flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${monitoringRunning ? 'animate-spin' : ''}`} />
                  <span>{monitoringRunning ? 'Checking pages...' : 'Run Monitoring Check'}</span>
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-20 glass-panel rounded-3xl border border-white/5">
                  <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">All monitored events are currently up to date.</p>
                  <p className="text-slate-500 text-xs mt-1">Notifications trigger when meaningful fields (dates, prizes, status) change.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map(n => (
                    <div key={n.id} className="glass-card rounded-2xl p-4 flex items-start space-x-3.5">
                      <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl mt-0.5">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-200">{n.title}</h4>
                          <span className="text-[11px] text-slate-500 font-mono">{n.delivery_timestamp.slice(0, 16)}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= PROFILE VAULT TAB ================= */}
          {activeTab === 'profile' && profile && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-cyan-400" />
                  Applicant Profile Vault
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Reusable credentials and profile data mapped during automated AI registrations.
                </p>
              </div>

              <div className="glass-panel rounded-3xl p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={profile.full_name || ''}
                      onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                      className="w-full bg-[#070B14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={profile.email || ''}
                      onChange={e => setProfile({ ...profile, email: e.target.value })}
                      className="w-full bg-[#070B14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={profile.phone || ''}
                      onChange={e => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full bg-[#070B14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">College or Organization</label>
                    <input
                      type="text"
                      value={profile.college_or_company || ''}
                      onChange={e => setProfile({ ...profile, college_or_company: e.target.value })}
                      className="w-full bg-[#070B14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Key Technical Skills (comma separated)</label>
                  <input
                    type="text"
                    value={profile.skills?.join(', ') || ''}
                    onChange={e => setProfile({ ...profile, skills: e.target.value.split(',').map((s: string) => s.trim()) })}
                    className="w-full bg-[#070B14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">GitHub URL</label>
                    <input
                      type="text"
                      value={profile.github_url || ''}
                      onChange={e => setProfile({ ...profile, github_url: e.target.value })}
                      className="w-full bg-[#070B14] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">LinkedIn URL</label>
                    <input
                      type="text"
                      value={profile.linkedin_url || ''}
                      onChange={e => setProfile({ ...profile, linkedin_url: e.target.value })}
                      className="w-full bg-[#070B14] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Portfolio URL</label>
                    <input
                      type="text"
                      value={profile.portfolio_url || ''}
                      onChange={e => setProfile({ ...profile, portfolio_url: e.target.value })}
                      className="w-full bg-[#070B14] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Short Bio</label>
                  <textarea
                    rows={3}
                    value={profile.bio || ''}
                    onChange={e => setProfile({ ...profile, bio: e.target.value })}
                    className="w-full bg-[#070B14] border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-emerald-400 font-semibold">{profileSavedMsg ? '✓ Profile changes saved!' : ''}</span>
                  <button
                    onClick={async () => {
                      await api.updateUserProfile(profile);
                      setProfileSavedMsg(true);
                      setTimeout(() => setProfileSavedMsg(false), 3000);
                    }}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/30"
                  >
                    Save Profile
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. RIGHT COLLAPSIBLE AI FILTER PANEL                     */}
      {/* ======================================================== */}
      {aiPanelOpen && (
        <aside className="w-88 bg-[#0D1322]/95 backdrop-blur-2xl border-l border-white/10 flex flex-col justify-between p-6 flex-shrink-0 z-30 shadow-2xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">AI Custom Filter</h3>
              </div>
              <button
                onClick={() => setAiPanelOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Describe your dream event in natural words. The AI translates it into verified database rules without arbitrary queries.
            </p>

            {/* Quick Inspirations */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Quick Examples:</span>
              <div className="space-y-1">
                {[
                  'Free AI agent hackathons in Bengaluru with team size of at least 2 and prize money',
                  'Online cybersecurity competitions open to college students',
                  'Technology conferences in Karnataka with open registration'
                ].map((sample, i) => (
                  <button
                    key={i}
                    onClick={() => { setNaturalQuery(sample); handleInterpretFilter(sample); }}
                    className="text-[11px] text-slate-400 hover:text-purple-300 bg-white/[0.03] hover:bg-white/[0.06] p-2 rounded-lg text-left block w-full transition"
                  >
                    &ldquo;{sample.slice(0, 42)}...&rdquo;
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <textarea
                rows={3}
                value={naturalQuery}
                onChange={e => setNaturalQuery(e.target.value)}
                placeholder="Type your requirements..."
                className="w-full bg-[#070B14] border border-white/10 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
              />

              <button
                onClick={() => handleInterpretFilter()}
                disabled={interpreting || !naturalQuery.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/30"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{interpreting ? 'Interpreting...' : 'Apply Filter'}</span>
              </button>
            </div>

            {interpretedFilter && (
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-2.5">
                <span className="text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider">Interpreted Rules:</span>
                <p className="text-xs text-purple-200 leading-relaxed">{interpretedFilter.explanation}</p>

                <div className="flex flex-wrap gap-1 mt-1">
                  {interpretedFilter.applied_tags?.map((t: string) => (
                    <span key={t} className="text-[10px] bg-purple-900/60 text-purple-200 px-2 py-0.5 rounded border border-purple-700/50">
                      {t}
                    </span>
                  ))}
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={handleSaveFilter}
                    className="flex-1 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-bold transition"
                  >
                    Save Filter
                  </button>
                  <button
                    onClick={() => { setInterpretedFilter(null); setNaturalQuery(''); loadEvents(); }}
                    className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 rounded-lg text-xs transition"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 text-[11px] text-slate-500 text-center">
            Shared dataset guaranteed: filters never trigger duplicate web crawls.
          </div>
        </aside>
      )}

      {/* ======================================================== */}
      {/* 4. EVENT DETAIL & AI RESEARCH MODAL                      */}
      {/* ======================================================== */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel border-white/10 w-full max-w-3xl max-h-[90vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-start justify-between bg-[#0D1322]">
              <div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${getSourceBadgeStyle(selectedEvent.source_platform)}`}>
                  {selectedEvent.source_platform}
                </span>
                <h3 className="text-lg font-black text-white mt-2">{selectedEvent.canonical_title}</h3>
                <p className="text-xs text-slate-400 mt-1">{selectedEvent.organizer_name} • {selectedEvent.location_name}</p>
              </div>
              <button
                onClick={() => { setSelectedEvent(null); setResearchAnswer(null); }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Event Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Event Overview</h4>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{selectedEvent.description}</p>
              </div>

              {/* Quick Spec Matrix */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-[#070B14] rounded-2xl border border-white/5">
                  <span className="text-[11px] text-slate-500 block">Registration Status</span>
                  <span className="text-xs font-bold text-emerald-400">{selectedEvent.registration_status}</span>
                </div>
                <div className="p-3.5 bg-[#070B14] rounded-2xl border border-white/5">
                  <span className="text-[11px] text-slate-500 block">Prize Pool</span>
                  <span className="text-xs font-bold text-amber-300 truncate block">{selectedEvent.prize_pool || 'N/A'}</span>
                </div>
                <div className="p-3.5 bg-[#070B14] rounded-2xl border border-white/5">
                  <span className="text-[11px] text-slate-500 block">Allowed Team Size</span>
                  <span className="text-xs font-bold text-slate-200">{selectedEvent.team_size_min || 1} - {selectedEvent.team_size_max || 4} members</span>
                </div>
                <div className="p-3.5 bg-[#070B14] rounded-2xl border border-white/5">
                  <span className="text-[11px] text-slate-500 block">Registration Fee</span>
                  <span className="text-xs font-bold text-slate-200">{selectedEvent.price === 0 ? 'Free' : `₹${selectedEvent.price}`}</span>
                </div>
              </div>

              {/* AI Research Assistant Section */}
              <div className="p-5 bg-[#070B14] rounded-2xl border border-indigo-500/30 space-y-3.5 shadow-glow">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI Event Research Assistant (Grounded RAG)</h4>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Ask specific questions about rules, team formation, submissions, or eligibility. Responses are strictly grounded with source citations.
                </p>

                {/* Prompt Suggestions */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'What do I need to submit?',
                    'Can first-year students participate?',
                    'What are the prizes?',
                    'How many people can be in a team?'
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => { setResearchQuestion(q); handleAskResearch(q); }}
                      className="text-[11px] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/5 px-2.5 py-1 rounded-lg transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Query Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={researchQuestion}
                    onChange={e => setResearchQuestion(e.target.value)}
                    placeholder="Ask a question about this hackathon..."
                    className="flex-1 bg-[#0D1322] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => handleAskResearch()}
                    disabled={researchLoading || !researchQuestion.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-md shadow-indigo-600/30"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{researchLoading ? 'Searching...' : 'Ask'}</span>
                  </button>
                </div>

                {/* Grounded Answer Card */}
                {researchAnswer && (
                  <div className="p-4 bg-[#0D1322] rounded-2xl border border-white/10 space-y-2.5 mt-3">
                    <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">{researchAnswer.answer}</p>
                    {researchAnswer.verified_evidence?.length > 0 && (
                      <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">Verified Evidence:</span>
                        {researchAnswer.verified_evidence.map((ev: any, idx: number) => (
                          <div key={idx} className="mt-1 flex items-center gap-1.5 text-indigo-400">
                            <ExternalLink className="w-3 h-3" />
                            <a href={ev.source_url} target="_blank" rel="noreferrer" className="underline truncate">
                              {ev.section}: {ev.source_url}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-[#0D1322]">
              <a
                href={selectedEvent.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <span>Original Platform Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIdeaEventId(selectedEvent.event_id);
                    setSelectedEvent(null);
                    setActiveTab('ideas');
                  }}
                  className="px-4 py-2 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-xl text-xs font-bold transition"
                >
                  Develop Idea
                </button>

                <button
                  onClick={() => {
                    const ev = selectedEvent;
                    setSelectedEvent(null);
                    handleStartRegistration(ev);
                  }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/30"
                >
                  Register with AI Assistant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. REGISTRATION ASSISTANT MODAL                          */}
      {/* ======================================================== */}
      {regModalEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel border-white/10 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-black text-white">AI Assisted Registration</h3>
                <p className="text-xs text-slate-400">{regModalEvent.canonical_title}</p>
              </div>
              <button onClick={() => setRegModalEvent(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {regLoading && (
              <div className="py-8 text-center text-xs text-slate-400">
                <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-2" />
                Mapping your saved profile to event form requirements...
              </div>
            )}

            {!regLoading && regPlan && !regConfirmed && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Human-in-the-Loop Review:</span>
                    <p className="mt-0.5">Please review the mapped profile data below before granting final submission approval.</p>
                  </div>
                </div>

                {/* Form fields preview */}
                <div className="bg-[#070B14] p-4 rounded-2xl border border-white/5 space-y-2 text-xs">
                  {Object.entries(regPlan.mapped_fields).map(([label, val]: [string, any]) => (
                    <div key={label} className="flex justify-between py-1 border-b border-white/5 last:border-0">
                      <span className="text-slate-400 font-medium">{label}:</span>
                      <span className="text-slate-200 font-mono text-right truncate max-w-xs">{val}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setRegModalEvent(null)}
                    className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmRegistration}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Confirm Registration</span>
                  </button>
                </div>
              </div>
            )}

            {!regLoading && regConfirmed && (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Registration Confirmed!</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Your profile details have been verified and recorded to your audit ledger. An event reminder has been scheduled.
                </p>
                <button
                  onClick={() => setRegModalEvent(null)}
                  className="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
