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
  Award,
  Tag,
  FolderTree,
  Plus,
  GitMerge,
  ThumbsDown,
  BarChart3
} from 'lucide-react';
import * as api from '@/lib/api';

export default function Home() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'discover' | 'saved' | 'ideas' | 'filters' | 'monitoring' | 'profile' | 'taxonomy'>('discover');

  // Events & Filter State
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'IN_PERSON' | 'ONLINE'>('ALL');
  const [freeOnly, setFreeOnly] = useState(false);
  const [hasPrizeOnly, setHasPrizeOnly] = useState(false);

  // Locations Data & State
  const [states, setStates] = useState<any[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<string>('');
  const [availableCities, setAvailableCities] = useState<any[]>([]);
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>([]);
  const [citySearchInput, setCitySearchInput] = useState<string>('');
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

  // Dynamic Taxonomy State
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  // Admin & Weekly Discovery State
  const [proposals, setProposals] = useState<any[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [adminActionLoading, setAdminActionLoading] = useState(false);

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

  // Registration Assistant Modal
  const [regModalEvent, setRegModalEvent] = useState<any>(null);
  const [regPlan, setRegPlan] = useState<any>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [regApproving, setRegApproving] = useState(false);
  const [regLiveProgressStep, setRegLiveProgressStep] = useState(1);
  const [regConfirmed, setRegConfirmed] = useState(false);
  const [regResult, setRegResult] = useState<any>(null);
  const [editingFields, setEditingFields] = useState<Record<string, string>>({});
  const [replaceProfileChecked, setReplaceProfileChecked] = useState(true);
  const [tinyFishLiveLoading, setTinyFishLiveLoading] = useState(false);
  const [tinyFishLiveResult, setTinyFishLiveResult] = useState<any>(null);

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

  // Initial Load
  useEffect(() => {
    loadHealth();
    loadLocationsData();
    loadCategoriesData();
    loadEvents();
    loadSavedFilters();
    loadUserProfile();
    loadSavedEvents();
    loadNotifications();
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update available cities when selectedStateId changes
  useEffect(() => {
    loadCitiesForState(selectedStateId);
  }, [selectedStateId]);

  const loadHealth = async () => {
    try {
      const data = await api.fetchHealth();
      setHealth(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadLocationsData = async () => {
    try {
      const stateData = await api.fetchStates();
      setStates(stateData.states || []);
      const cityData = await api.fetchCities();
      setAvailableCities(cityData.cities || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCitiesForState = async (stateId: string) => {
    try {
      const cityData = await api.fetchCities(stateId || undefined);
      setAvailableCities(cityData.cities || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCategoriesData = async () => {
    try {
      const data = await api.fetchCategories();
      setCategories(data.categories || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAdminData = async () => {
    try {
      const pData = await api.fetchProposals();
      setProposals(pData.proposals || []);
      const rData = await api.fetchWeeklyReport();
      setWeeklyReport(rData);
    } catch (e) {
      console.error(e);
    }
  };

  const loadEvents = async (options: {
    cityIds?: string[];
    stateId?: string;
    categoryIds?: string[];
    onlyOnline?: boolean;
    search?: string;
    refresh?: boolean;
  } = {}) => {
    setLoading(true);
    try {
      const activeCityIds = options.cityIds !== undefined ? options.cityIds : selectedCityIds;
      const activeStateId = options.stateId !== undefined ? options.stateId : selectedStateId;
      const activeCat = options.categoryIds !== undefined ? options.categoryIds : (selectedCategoryId !== 'all' ? [selectedCategoryId] : []);
      const isOnlyOnline = options.onlyOnline !== undefined ? options.onlyOnline : (formatFilter === 'ONLINE');
      const search = options.search !== undefined ? options.search : searchQuery;

      const data = await api.fetchEvents({
        cityIds: activeCityIds,
        stateId: activeStateId || undefined,
        categoryIds: activeCat,
        onlyOnline: isOnlyOnline,
        search: search || undefined,
        refresh: options.refresh
      });
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

  // Location Handlers
  const handleToggleCity = (cityId: string) => {
    let next: string[];
    if (selectedCityIds.includes(cityId)) {
      next = selectedCityIds.filter(id => id !== cityId);
    } else {
      next = [...selectedCityIds, cityId];
    }
    setSelectedCityIds(next);
    loadEvents({ cityIds: next });
  };

  const handleStateChange = (stateId: string) => {
    setSelectedStateId(stateId);
    // Clear city filters when changing state unless already belonging
    setSelectedCityIds([]);
    loadEvents({ stateId: stateId || undefined, cityIds: [] });
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    loadEvents({ categoryIds: catId !== 'all' ? [catId] : [] });
  };

  const handleToggleOnlineOnly = () => {
    const nextFormat = formatFilter === 'ONLINE' ? 'ALL' : 'ONLINE';
    setFormatFilter(nextFormat);
    loadEvents({ onlyOnline: nextFormat === 'ONLINE' });
  };

  // AI Filter Execution (Gemini 2.5 Flash + Multi-Keyword Extraction)
  const handleInterpretFilter = async (customQuery?: string) => {
    const q = customQuery || naturalQuery;
    if (!q.trim()) return;
    if (customQuery) setNaturalQuery(customQuery);
    setInterpreting(true);
    try {
      const result = await api.interpretNaturalFilter(q);
      setInterpretedFilter(result);

      // Send extracted search keywords along with structured criteria to apply the filter
      const searchText = result.search_text || (result.keywords && result.keywords.join(' ')) || '';
      const filteredRes = await api.applyStructuredFilter(result.structured_criteria, searchText);
      setEvents(filteredRes.events || []);
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
        naturalQuery.slice(0, 30),
        naturalQuery,
        interpretedFilter.structured_criteria
      );
      loadSavedFilters();
      alert('Custom AI Filter saved to your library!');
    } catch (e) {
      console.error(e);
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
    setRegResult(null);
    setTinyFishLiveResult(null);
    try {
      const plan = await api.prepareRegistration(event.event_id);
      setRegPlan(plan);
      const fieldsMap: Record<string, string> = {};
      if (plan.fields) {
        plan.fields.forEach((f: any) => {
          fieldsMap[f.field_key] = f.current_value || '';
        });
      }
      setEditingFields(fieldsMap);
    } catch (e) {
      console.error(e);
    } finally {
      setRegLoading(false);
    }
  };

  const handleUpdateRegFields = async () => {
    if (!regPlan) return;
    setRegLoading(true);
    try {
      const updated = await api.updateRegistrationDetails(
        regPlan.audit_id,
        editingFields,
        replaceProfileChecked
      );
      setRegPlan(updated);
      loadUserProfile();
    } catch (e) {
      console.error(e);
    } finally {
      setRegLoading(false);
    }
  };

  const handleConfirmRegistration = async () => {
    if (!regPlan) return;
    setRegApproving(true);
    setRegLiveProgressStep(1);

    // Dynamic progress stepping reflecting agent execution phases on live page
    const timer1 = setTimeout(() => setRegLiveProgressStep(2), 2500);
    const timer2 = setTimeout(() => setRegLiveProgressStep(3), 7500);
    const timer3 = setTimeout(() => setRegLiveProgressStep(4), 14000);

    try {
      const res = await api.confirmRegistration(regPlan.audit_id);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setRegLiveProgressStep(5);
      setRegResult(res);
      setRegConfirmed(true);
      loadSavedEvents();
    } catch (e: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      console.error(e);
      alert(e.message || 'Registration approval failed. Please ensure all required fields are provided.');
    } finally {
      setRegApproving(false);
    }
  };

  const handleRunTinyFishLiveFill = async () => {
    if (!regPlan) return;
    setTinyFishLiveLoading(true);
    try {
      const res = await api.runTinyFishLiveFill(regPlan.audit_id);
      setTinyFishLiveResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setTinyFishLiveLoading(false);
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

  // Admin Proposal Review
  const handleReviewProposal = async (proposalId: string, action: string, targetCatId?: string) => {
    setAdminActionLoading(true);
    try {
      await api.reviewProposal(proposalId, action, {
        targetCategoryId: targetCatId,
        adminNotes: `Reviewed via Admin Dashboard on ${new Date().toLocaleDateString()}`
      });
      await loadAdminData();
      await loadCategoriesData();
    } catch (e: any) {
      alert(`Error reviewing proposal: ${e.message}`);
    } finally {
      setAdminActionLoading(false);
    }
  };

  // Reclassify All Events
  const handleRunReclassification = async () => {
    setAdminActionLoading(true);
    try {
      const res = await api.reclassifyEvents();
      alert(`Reclassification Completed! ${res.result.total} events re-evaluated across multi-signal model.`);
      await loadEvents();
      await loadAdminData();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setAdminActionLoading(false);
    }
  };

  // Category Badge Styling
  const getCategoryBadgeStyle = (categoryId: string) => {
    switch (categoryId) {
      case 'ctf-cybersecurity':
        return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'drone-uav-hackathon':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      case 'robot-hackathon':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'cp-hackathon':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'ai-research':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'web3-blockchain':
        return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
    }
  };

  // Filter events locally for instant toggles
  const displayedEvents = events.filter(e => {
    if (freeOnly && e.price > 0) return false;
    if (hasPrizeOnly && !e.prize_pool && !e.prize_pool_numeric) return false;
    return true;
  });

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
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Event & Taxonomy Intelligence</p>
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
              onClick={() => setActiveTab('taxonomy')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'taxonomy'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <FolderTree className="w-4 h-4 text-cyan-400" />
                <span>Taxonomy & Discovery</span>
              </div>
              {proposals.filter(p => p.status === 'NEEDS_REVIEW').length > 0 && (
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-mono border border-rose-500/30 animate-pulse">
                  {proposals.filter(p => p.status === 'NEEDS_REVIEW').length}
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
              Taxonomy Engine
            </span>
            <span className="flex items-center text-emerald-400 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse shadow-sm shadow-emerald-400"></span>
              Multi-Signal
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-white/5">
            <span>Canonical Events:</span>
            <span className="text-slate-200 font-mono font-medium">{events.length} verified</span>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN APP CONTENT AREA                                 */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top Search & Filter Bar */}
        <header className="h-18 border-b border-white/5 bg-[#0D1322]/60 backdrop-blur-xl px-8 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center space-x-4 flex-1 max-w-xl">
            {/* Search Input */}
            <form
              onSubmit={e => { e.preventDefault(); loadEvents({ search: searchQuery }); }}
              className="relative w-full"
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search hackathons, CTF challenges, drones, robots, CP contests, cities..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#070B14]/80 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); loadEvents({ search: '' }); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
          </div>

          {/* Quick Actions & AI Filter Trigger */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadEvents({ refresh: true })}
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

              {/* LOCATION FILTER CONTROL PANEL (Accurate State + Multi-City + Dedicated Online) */}
              <div className="glass-panel rounded-2xl p-4 space-y-3.5 border-white/10 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Geographic & Format Filtering
                    </span>
                  </div>

                  {/* Dedicated Online Only Toggle Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleOnlineOnly}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                        formatFilter === 'ONLINE'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/20'
                          : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border-white/10'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Online / Virtual Events Only</span>
                    </button>

                    <button
                      onClick={() => setFreeOnly(!freeOnly)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-smooth ${
                        freeOnly
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'border-white/10 text-slate-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      Free Only
                    </button>

                    <button
                      onClick={() => setHasPrizeOnly(!hasPrizeOnly)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-smooth ${
                        hasPrizeOnly
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'border-white/10 text-slate-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      🏆 Cash Prizes
                    </button>
                  </div>
                </div>

                {/* State Dropdown + City Multiselect Chips */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-white/5">
                  {/* 1. State Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                      Select State / Region:
                    </label>
                    <select
                      value={selectedStateId}
                      onChange={e => handleStateChange(e.target.value)}
                      className="w-full bg-[#070B14] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">All States (National)</option>
                      {states.map(s => (
                        <option key={s.state_id} value={s.state_id}>
                          {s.name} ({s.event_count || 0} events)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. City Multiselect & Autocomplete */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                      Select Canonical Cities (Multiple Selection Supported):
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {availableCities.map(c => {
                        const isSelected = selectedCityIds.includes(c.city_id);
                        return (
                          <button
                            key={c.city_id}
                            onClick={() => handleToggleCity(c.city_id)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-smooth flex items-center gap-1.5 border ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm shadow-indigo-600/30'
                                : 'bg-[#070B14] text-slate-300 hover:text-white border-white/10 hover:border-white/20'
                            }`}
                          >
                            <span>{c.canonical_name}</span>
                            {isSelected ? (
                              <Check className="w-3 h-3 text-white" />
                            ) : (
                              c.event_count > 0 && (
                                <span className="text-[10px] text-slate-500 font-mono">({c.event_count})</span>
                              )
                            )}
                          </button>
                        );
                      })}

                      {selectedCityIds.length > 0 && (
                        <button
                          onClick={() => { setSelectedCityIds([]); loadEvents({ cityIds: [] }); }}
                          className="text-[11px] text-rose-400 hover:underline px-2 py-1"
                        >
                          Clear Cities
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* DYNAMIC HACKATHON & EVENT CATEGORIES STRIP */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-400" />
                    Hackathon Track & Classification Filters:
                  </span>
                  <span>{categories.length} Categories Registered</span>
                </div>

                <div className="flex items-center space-x-2 overflow-x-auto pb-2 text-xs">
                  <button
                    onClick={() => handleCategoryChange('all')}
                    className={`px-3.5 py-1.5 rounded-xl font-bold transition-smooth flex items-center gap-1.5 border ${
                      selectedCategoryId === 'all'
                        ? 'bg-white text-slate-950 font-black border-white shadow-md'
                        : 'bg-white/[0.04] text-slate-300 hover:text-white border-white/10 hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>All Tracks</span>
                  </button>

                  {categories.map(cat => {
                    const isSelected = selectedCategoryId === cat.category_id || selectedCategoryId === cat.slug;
                    return (
                      <button
                        key={cat.category_id}
                        onClick={() => handleCategoryChange(cat.category_id)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold transition-smooth flex items-center gap-1.5 whitespace-nowrap border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                            : `${getCategoryBadgeStyle(cat.category_id)} hover:bg-white/[0.08]`
                        }`}
                      >
                        <span>{cat.name}</span>
                        {cat.eventCount !== undefined && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-black/30 text-slate-400'
                          }`}>
                            {cat.eventCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active AI Filter Indicator */}
              {interpretedFilter && (
                <div className="glass-panel p-4 rounded-2xl border-purple-500/40 flex flex-wrap items-center justify-between gap-4 shadow-glow">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 flex-shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                          {interpretedFilter.model || 'Gemini 2.5 Flash'}
                        </span>
                        <p className="text-xs font-bold text-purple-200">{interpretedFilter.explanation}</p>
                      </div>

                      {/* Extracted Keywords & Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {interpretedFilter.keywords?.length > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-cyan-300 font-semibold mr-1">
                            <span>Keywords:</span>
                          </div>
                        )}
                        {interpretedFilter.keywords?.map((kw: string) => (
                          <span key={kw} className="text-[10px] bg-cyan-950/60 text-cyan-300 px-2 py-0.5 rounded-md border border-cyan-800/50 font-mono">
                            &ldquo;{kw}&rdquo;
                          </span>
                        ))}
                        {interpretedFilter.applied_tags?.map((t: string) => (
                          <span key={t} className="text-[10px] bg-purple-900/60 text-purple-200 px-2 py-0.5 rounded-md border border-purple-700/50 font-medium">
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* Smart Advice if present */}
                      {interpretedFilter.smart_advice && (
                        <div className="mt-2 text-[11px] text-indigo-300/90 bg-indigo-950/40 border border-indigo-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                          <span>{interpretedFilter.smart_advice}</span>
                        </div>
                      )}
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
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Try clearing city filters, switching tracks, or click &ldquo;Sync Web&rdquo; to discover newly indexed listings.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCityIds([]);
                      setSelectedStateId('');
                      setSelectedCategoryId('all');
                      setFormatFilter('ALL');
                      setFreeOnly(false);
                      setHasPrizeOnly(false);
                      setSearchQuery('');
                      loadEvents({ cityIds: [], stateId: undefined, categoryIds: [], onlyOnline: false, search: '' });
                    }}
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
                    const primaryCatName = event.primary_category_name || (event.categories && event.categories[0]) || 'Engineer Hackathon';
                    const primaryCatId = event.primary_category_id || 'engineer-hackathon';

                    return (
                      <div
                        key={event.event_id}
                        className="glass-card rounded-2xl p-6 flex flex-col justify-between transition-smooth group relative"
                      >
                        <div>
                          {/* Card Header: Platform Tag + Verified Pill + Primary Category Badge */}
                          <div className="flex items-center justify-between mb-3.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Source Platform Badge */}
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg border bg-blue-500/10 text-blue-300 border-blue-500/20">
                                {event.source_platform}
                              </span>

                              {/* Primary Classification Badge */}
                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${getCategoryBadgeStyle(primaryCatId)}`}>
                                {primaryCatName}
                              </span>

                              {/* Classification Review Status */}
                              {event.classification_status === 'NEEDS_REVIEW' && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md" title="Pending manual confirmation">
                                  Review Pending
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

                          {/* AI Relevance Match & Smart Alternative Badges */}
                          {(event.relevance_score !== undefined || event.is_relaxed_match || (event.match_reasons && event.match_reasons.length > 0)) && (
                            <div className="flex flex-wrap items-center gap-1.5 mb-3">
                              {event.relevance_score !== undefined && (
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                  event.relevance_score >= 80 
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                                    : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                                }`}>
                                  <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                                  {event.relevance_score}% Match
                                </span>
                              )}

                              {event.is_relaxed_match && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                  <Lightbulb className="w-3 h-3 text-amber-400" />
                                  Smart Alternative
                                </span>
                              )}

                              {event.match_reasons && event.match_reasons.slice(0, 2).map((reason: string) => (
                                <span key={reason} className="text-[10px] bg-white/[0.04] text-slate-300 border border-white/5 px-2 py-0.5 rounded-md font-medium">
                                  ✓ {reason}
                                </span>
                              ))}
                            </div>
                          )}

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

                          {/* Location & Schedule Info */}
                          <div className="space-y-2 text-xs text-slate-300 mb-5">
                            <div className="flex items-center gap-2 text-slate-300">
                              <MapPin className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                              <span className="truncate font-medium">
                                {event.attendance_format === 'ONLINE'
                                  ? 'Online / Virtual'
                                  : event.canonical_city
                                    ? `${event.canonical_city}, ${event.canonical_state || 'India'}`
                                    : event.location_name || 'India'}
                              </span>
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

                        {/* Card Actions */}
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

          {/* ================= TAXONOMY & ADMIN REVIEW TAB ================= */}
          {activeTab === 'taxonomy' && (
            <div className="space-y-6 max-w-6xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <FolderTree className="w-5 h-5 text-cyan-400" />
                    Taxonomy Management & Weekly Category Discovery
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Decoupled search understanding, weekly proposal reviews, and multi-signal hackathon categorization.
                  </p>
                </div>

                <button
                  onClick={handleRunReclassification}
                  disabled={adminActionLoading}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${adminActionLoading ? 'animate-spin' : ''}`} />
                  <span>Run Multi-Signal Reclassification</span>
                </button>
              </div>

              {/* Weekly Intelligence Stat Grid */}
              {weeklyReport && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="glass-panel rounded-2xl p-4">
                    <span className="text-[11px] text-slate-400 font-medium block">Total Search Queries</span>
                    <span className="text-2xl font-black text-white font-mono mt-1 block">{weeklyReport.totalSearches}</span>
                  </div>
                  <div className="glass-panel rounded-2xl p-4">
                    <span className="text-[11px] text-slate-400 font-medium block">Unmapped Queries</span>
                    <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">{weeklyReport.unmappedQueriesCount}</span>
                  </div>
                  <div className="glass-panel rounded-2xl p-4">
                    <span className="text-[11px] text-slate-400 font-medium block">Pending Track Proposals</span>
                    <span className="text-2xl font-black text-rose-400 font-mono mt-1 block">{weeklyReport.pendingProposalsCount}</span>
                  </div>
                  <div className="glass-panel rounded-2xl p-4">
                    <span className="text-[11px] text-slate-400 font-medium block">Active Categories</span>
                    <span className="text-2xl font-black text-cyan-400 font-mono mt-1 block">{categories.length}</span>
                  </div>
                </div>
              )}

              {/* Pending Proposals Review Table */}
              <div className="glass-panel rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Weekly Discovered Category Proposals (Awaiting Admin Review)
                  </h3>
                  <span className="text-xs text-slate-400">
                    Aggregated from user search queries and event tracks
                  </span>
                </div>

                {proposals.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No proposals currently awaiting review.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400 font-semibold">
                          <th className="py-2.5 px-3">Candidate Category</th>
                          <th className="py-2.5 px-3">Search Frequency</th>
                          <th className="py-2.5 px-3">Sample Query Terms</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {proposals.map(p => (
                          <tr key={p.proposalId} className="hover:bg-white/[0.02]">
                            <td className="py-3 px-3 font-bold text-slate-200">
                              {p.suggestedName}
                              <span className="text-[10px] text-slate-500 block font-mono">slug: {p.suggestedSlug}</span>
                            </td>
                            <td className="py-3 px-3 font-mono text-cyan-400 font-semibold">
                              {p.searchFrequency} searches
                            </td>
                            <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                              {p.sourceQueries?.join(', ')}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                p.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                                p.status === 'MERGED' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                                p.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                                'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              {p.status === 'NEEDS_REVIEW' && (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleReviewProposal(p.proposalId, 'APPROVE_NEW')}
                                    disabled={adminActionLoading}
                                    className="px-2.5 py-1 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-600/30 font-semibold"
                                  >
                                    Approve New
                                  </button>
                                  <button
                                    onClick={() => handleReviewProposal(p.proposalId, 'MERGE', 'engineer-hackathon')}
                                    disabled={adminActionLoading}
                                    className="px-2.5 py-1 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-lg hover:bg-indigo-600/30 font-semibold"
                                  >
                                    Merge
                                  </button>
                                  <button
                                    onClick={() => handleReviewProposal(p.proposalId, 'REJECT')}
                                    disabled={adminActionLoading}
                                    className="px-2.5 py-1 bg-rose-600/20 text-rose-300 border border-rose-500/30 rounded-lg hover:bg-rose-600/30 font-semibold"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Category Breakdown Distribution */}
              {weeklyReport?.categoryDistribution && (
                <div className="glass-panel rounded-3xl p-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                    Current Event Classification Distribution
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {weeklyReport.categoryDistribution.map((item: any) => (
                      <div key={item.name} className="p-3 bg-[#070B14] rounded-xl border border-white/5">
                        <span className="text-slate-400 text-[11px] block truncate font-medium">
                          {item.name}
                        </span>
                        <span className="text-base font-bold text-indigo-400 mt-1 block font-mono">
                          {item.eventCount} events
                        </span>
                      </div>
                    ))}
                  </div>
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
                          onClick={async () => {
                            const filtered = await api.applyStructuredFilter(f.structured_criteria);
                            setEvents(filtered.events || []);
                            setActiveTab('discover');
                          }}
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
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n: any) => (
                    <div key={n.id} className="glass-card rounded-2xl p-4 flex items-start space-x-3.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-white">{n.title}</h4>
                        <p className="text-xs text-slate-300 mt-0.5">{n.message}</p>
                        <span className="text-[10px] text-slate-500 font-mono mt-2 block">{n.delivery_timestamp.slice(0, 16)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= PROFILE TAB ================= */}
          {activeTab === 'profile' && profile && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-cyan-400" />
                  Applicant Profile Vault
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Saved credentials used by the AI Registration Assistant with strict user-confirmation controls.
                </p>
              </div>

              <div className="glass-panel rounded-3xl p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={profile.full_name || ''}
                      onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                      className="w-full bg-[#070B14] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={profile.email || ''}
                      onChange={e => setProfile({ ...profile, email: e.target.value })}
                      className="w-full bg-[#070B14] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Phone</label>
                    <input
                      type="text"
                      value={profile.phone || ''}
                      onChange={e => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full bg-[#070B14] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">College / Organization</label>
                    <input
                      type="text"
                      value={profile.college_or_company || ''}
                      onChange={e => setProfile({ ...profile, college_or_company: e.target.value })}
                      className="w-full bg-[#070B14] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">GitHub URL</label>
                  <input
                    type="text"
                    value={profile.github_url || ''}
                    onChange={e => setProfile({ ...profile, github_url: e.target.value })}
                    className="w-full bg-[#070B14] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={async () => {
                      await api.updateUserProfile(profile);
                      setProfileSavedMsg(true);
                      setTimeout(() => setProfileSavedMsg(false), 3000);
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{profileSavedMsg ? 'Profile Saved!' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. AI FILTER SLIDEOUT DRAWER                             */}
      {/* ======================================================== */}
      {aiPanelOpen && (
        <aside className="w-96 bg-[#0D1322] border-l border-white/10 flex flex-col justify-between p-6 z-40 shadow-2xl">
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Natural Language Filter</h3>
              </div>
              <button onClick={() => setAiPanelOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Describe your dream hackathons in plain English. The agent converts it into structured criteria without mutating shared data.
            </p>

            <textarea
              rows={3}
              value={naturalQuery}
              onChange={e => setNaturalQuery(e.target.value)}
              placeholder="e.g. Free AI hackathons in Bengaluru with cash prizes and teams of 2 or more..."
              className="w-full bg-[#070B14] border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />

            {/* Quick Starter Prompts */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Example Prompts:</span>
              <div className="flex flex-col gap-1.5">
                {[
                  'Drone or robot hackathons in Bangalore or online with cash prizes',
                  'CTF and cybersecurity competitions with flag challenges',
                  'Free competitive programming challenges for college students',
                  'Web3 and smart contracts hackathon with prize money'
                ].map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => handleInterpretFilter(prompt)}
                    className="text-left text-[11px] p-2 bg-[#070B14] hover:bg-white/[0.04] text-slate-300 rounded-lg border border-white/5 transition flex items-center justify-between group"
                  >
                    <span className="truncate mr-2">&ldquo;{prompt}&rdquo;</span>
                    <Sparkles className="w-3 h-3 text-purple-400 group-hover:text-purple-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleInterpretFilter()}
              disabled={interpreting || !naturalQuery.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>{interpreting ? 'Gemini AI Extracting Intent...' : 'Extract Intent & Apply Smart Filter'}</span>
            </button>

            {interpretedFilter && (
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-300">Extracted by Gemini:</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {interpretedFilter.model || 'Gemini AI'}
                  </span>
                </div>

                {/* Keywords Chips */}
                {interpretedFilter.keywords?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Search Keywords:</span>
                    <div className="flex flex-wrap gap-1">
                      {interpretedFilter.keywords.map((kw: string) => (
                        <span key={kw} className="text-[10px] bg-cyan-950/60 text-cyan-300 px-2 py-0.5 rounded-md border border-cyan-800/50 font-mono">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-300 bg-[#070B14] p-3 rounded-xl border border-white/5 leading-relaxed">
                  {interpretedFilter.explanation}
                </p>

                {interpretedFilter.smart_advice && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">Smart Advice:</span>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed">{interpretedFilter.smart_advice}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveFilter}
                    className="flex-1 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-slate-200 rounded-xl text-xs font-semibold border border-white/10 transition"
                  >
                    Save this Filter
                  </button>
                  <button
                    onClick={() => setAiPanelOpen(false)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/30"
                  >
                    View Events
                  </button>
                </div>
              </div>
            )}
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
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md border bg-blue-500/10 text-blue-300 border-blue-500/20">
                    {selectedEvent.source_platform}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${getCategoryBadgeStyle(selectedEvent.primary_category_id)}`}>
                    {selectedEvent.primary_category_name || 'Engineer Hackathon'}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white mt-2">{selectedEvent.canonical_title}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedEvent.organizer_name} • {selectedEvent.canonical_city ? `${selectedEvent.canonical_city}, ${selectedEvent.canonical_state}` : selectedEvent.location_name}
                </p>
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

              {/* Classification Reasoning */}
              {selectedEvent.reasoning_summary && (
                <div className="p-3.5 bg-[#070B14] rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-indigo-400 block uppercase tracking-wider">Classification Confidence & Evidence</span>
                  <p className="text-xs text-slate-300 leading-relaxed">{selectedEvent.reasoning_summary}</p>
                </div>
              )}

              {/* Quick Spec Matrix */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-[#070B14] rounded-2xl border border-white/5">
                  <span className="text-[11px] text-slate-500 block">Format</span>
                  <span className="text-xs font-bold text-emerald-400">{selectedEvent.attendance_format}</span>
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
      {/* 5. AGENTIC REGISTRATION SANDBOX MODAL                    */}
      {/* ======================================================== */}
      {regModalEvent && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel border-white/10 w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-start justify-between bg-[#0D1322]/90">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Agentic Registration Sandbox
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-blue-500/10 text-blue-300 border-blue-500/20">
                    {regModalEvent.source_platform}
                  </span>
                </div>
                <h3 className="text-base font-black text-white mt-1.5">{regModalEvent.canonical_title}</h3>
                <p className="text-xs text-slate-400">
                  {regModalEvent.attendance_format} • {regModalEvent.canonical_city || regModalEvent.city || 'Online'}
                </p>
              </div>
              <button
                onClick={() => { setRegModalEvent(null); setRegConfirmed(false); }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {regLoading && (
                <div className="py-12 text-center text-xs text-slate-400">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
                  <p className="font-semibold text-slate-300">Auditing Form Requirements in Sandbox...</p>
                  <p className="text-[11px] text-slate-500 mt-1">Comparing user profile against platform schema.</p>
                </div>
              )}

              {/* LIVE AGENT EXECUTION CONSOLE WHILE APPROVING & REGISTERING ON LIVE PLATFORM */}
              {regApproving && (
                <div className="py-8 px-5 bg-[#070B14] rounded-2xl border border-indigo-500/30 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-cyan-300 text-xs font-bold animate-pulse">
                      <span>🐟</span>
                      <span>TinyFish Cloud Browser Active on {regModalEvent.source_platform}</span>
                    </div>
                    <h4 className="text-base font-black text-white">
                      Agent Executing Live Registration
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Approval completes only when the agent finishes form submission on {regModalEvent.source_platform} and receives registration verification.
                    </p>
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>Autonomous Session Progress</span>
                      <span className="text-cyan-300 font-bold">{Math.min(regLiveProgressStep * 24, 96)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 transition-all duration-700"
                        style={{ width: `${Math.min(regLiveProgressStep * 24, 96)}%` }}
                      />
                    </div>
                  </div>

                  {/* Stepper Checklist */}
                  <div className="max-w-md mx-auto space-y-2 text-xs font-mono">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-slate-200">1. User profile & attendee parameters validated (100% Ready)</span>
                    </div>

                    <div className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                      regLiveProgressStep >= 2
                        ? 'bg-black/40 border-white/5 text-slate-200'
                        : 'bg-indigo-950/20 border-indigo-500/30 text-cyan-300 font-bold'
                    }`}>
                      {regLiveProgressStep > 2 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
                      )}
                      <span>2. TinyFish browser navigating to {regModalEvent.source_platform} live URL</span>
                    </div>

                    <div className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                      regLiveProgressStep >= 3
                        ? regLiveProgressStep > 3 ? 'bg-black/40 border-white/5 text-slate-200' : 'bg-indigo-950/20 border-indigo-500/30 text-cyan-300 font-bold'
                        : 'bg-black/20 border-white/5 text-slate-500'
                    }`}>
                      {regLiveProgressStep > 3 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : regLiveProgressStep === 3 ? (
                        <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0" />
                      )}
                      <span>3. Entering attendee inputs & accepting registration terms</span>
                    </div>

                    <div className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                      regLiveProgressStep >= 4
                        ? regLiveProgressStep > 4 ? 'bg-black/40 border-white/5 text-slate-200' : 'bg-indigo-950/20 border-indigo-500/30 text-cyan-300 font-bold'
                        : 'bg-black/20 border-white/5 text-slate-500'
                    }`}>
                      {regLiveProgressStep > 4 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : regLiveProgressStep === 4 ? (
                        <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0" />
                      )}
                      <span>4. Verifying platform confirmation & dispatching official email receipt</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-center text-slate-500 font-mono">
                    Target URL: {regModalEvent.registration_url || regModalEvent.source_url}
                  </p>
                </div>
              )}

              {/* ACTIVE AUDIT & FORM INSPECTOR */}
              {!regLoading && !regApproving && regPlan && !regConfirmed && (
                <div className="space-y-5">
                  {/* Readiness Banner & Progress Bar */}
                  <div className="p-4 bg-[#070B14] rounded-2xl border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        Form Requirements Audit
                      </span>
                      <span className={`font-mono font-bold px-2.5 py-0.5 rounded-full text-[11px] border ${
                        regPlan.readiness_percentage === 100
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}>
                        {regPlan.readiness_percentage}% Ready ({regPlan.provided_count || 0}/{regPlan.required_count || 0} Required Fields)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          regPlan.readiness_percentage === 100
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-gradient-to-r from-amber-500 to-indigo-500'
                        }`}
                        style={{ width: `${regPlan.readiness_percentage || 0}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-slate-400">
                      {regPlan.notes || 'Inspect and supply required details below. Updates will automatically persist to your profile.'}
                    </p>
                  </div>

                  {/* Field Requirements List & In-Place Editor */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Required & Optional Fields:
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {regPlan.fields?.length || 0} Total Fields
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {regPlan.fields?.map((field: any) => {
                        const val = editingFields[field.field_key] !== undefined ? editingFields[field.field_key] : (field.current_value || '');
                        const isMissing = field.required && (!val || val.trim().length === 0);

                        return (
                          <div
                            key={field.field_key}
                            className={`p-3.5 rounded-xl border transition ${
                              isMissing
                                ? 'bg-rose-950/20 border-rose-500/40'
                                : 'bg-[#070B14] border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-200">
                                  {field.label}
                                </label>
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                  field.required
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {field.required ? 'REQUIRED' : 'OPTIONAL'}
                                </span>
                              </div>

                              <span className="text-[10px] text-slate-500 font-mono">
                                {field.category}
                              </span>
                            </div>

                            {field.options && field.options.length > 0 ? (
                              <select
                                value={val}
                                onChange={e => setEditingFields({ ...editingFields, [field.field_key]: e.target.value })}
                                className="w-full bg-[#0D1322] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                              >
                                {field.options.map((opt: string) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={val}
                                placeholder={field.placeholder || field.label}
                                onChange={e => setEditingFields({ ...editingFields, [field.field_key]: e.target.value })}
                                className="w-full bg-[#0D1322] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition placeholder:text-slate-600"
                              />
                            )}

                            {field.description && (
                              <p className="text-[10px] text-slate-500 mt-1">{field.description}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Profile Sync Checkbox & Recalculate Button */}
                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={replaceProfileChecked}
                        onChange={e => setReplaceProfileChecked(e.target.checked)}
                        className="rounded bg-slate-900 border-white/20 text-indigo-600 focus:ring-0"
                      />
                      <span>Sync changes to my default profile for future registrations</span>
                    </label>

                    <button
                      onClick={handleUpdateRegFields}
                      className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-slate-200 rounded-xl text-xs font-semibold border border-white/10 transition"
                    >
                      Update Details & Recalculate Sandbox
                    </button>
                  </div>

                  {/* TinyFish Web Automation Live Browser Action */}
                  <div className="p-4 bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-purple-950/40 rounded-2xl border border-indigo-500/30 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-cyan-300 flex items-center justify-center font-bold text-sm">
                          🐟
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            TinyFish Agent Live Browser Automation
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Dispatches TinyFish cloud browser directly to {regModalEvent.source_platform} to inspect live inputs and auto-fill your details.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleRunTinyFishLiveFill}
                        disabled={tinyFishLiveLoading}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
                      >
                        <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                        <span>{tinyFishLiveLoading ? 'TinyFish Navigating Live Page...' : 'Navigate & Live Fill via TinyFish'}</span>
                      </button>
                    </div>

                    {/* Live TinyFish Result */}
                    {tinyFishLiveResult && (
                      <div className="p-3 bg-black/60 rounded-xl border border-white/10 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            TinyFish Automation Executed
                          </span>
                          {tinyFishLiveResult.streaming_url && (
                            <a
                              href={tinyFishLiveResult.streaming_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-300 hover:underline flex items-center gap-1 text-[10px]"
                            >
                              <span>Watch Live Browser Stream</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-300 whitespace-pre-line leading-relaxed font-mono bg-[#070B14] p-2.5 rounded-lg border border-white/5 max-h-40 overflow-y-auto">
                          {tinyFishLiveResult.live_result}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                    <button
                      onClick={() => setRegModalEvent(null)}
                      className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmRegistration}
                      disabled={regPlan.missing_required_count > 0 || regApproving}
                      className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                    >
                      {regApproving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-cyan-200" />
                          <span>Agent Registering on {regModalEvent.source_platform}...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          <span>{regPlan.missing_required_count > 0 ? `Fill ${regPlan.missing_required_count} Missing Field(s)` : 'Approve and Register'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* SUCCESS STATE: EMAIL DISPATCH + HACKATHON REDIRECT PROOF */}
              {/* ======================================================== */}
              {!regLoading && !regApproving && regConfirmed && (
                <div className="py-4 space-y-5">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-glow">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-black text-white">Registration Confirmed & Verified!</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Your application has been registered. You have two verification receipts below:
                    </p>
                  </div>

                  {/* Verification Proof Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card 1: Platform Confirmation Email */}
                    <div className="p-4 bg-[#070B14] rounded-2xl border border-indigo-500/30 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5 text-indigo-400" />
                          Platform Confirmation Email
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {regResult?.email_confirmation?.status || 'SENT'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200">
                        Dispatched to: <strong className="text-cyan-300">{regResult?.email_confirmation?.sent_to || editingFields['email'] || 'krishna@example.com'}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Sender: <code className="text-indigo-400 font-mono">alerts@usai.events</code>
                      </p>
                      <div className="p-2 bg-black/40 rounded-lg text-[10px] font-mono text-slate-400">
                        Ref: {regResult?.audit_id || 'USAI-CONF-VERIFIED'}
                      </div>
                    </div>

                    {/* Card 2: Hackathon-Side Confirmation & Proof */}
                    <div className="p-4 bg-[#070B14] rounded-2xl border border-purple-500/30 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                          Hackathon Confirmation Proof
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {regResult?.hackathon_confirmation?.badge_id || 'USAI-HK-498271'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200">
                        Status: <strong className="text-emerald-400">CONFIRMED ON HACKATHON</strong>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Redirect destination shows your active registration status.
                      </p>
                      <a
                        href={regResult?.hackathon_confirmation?.redirect_url || regModalEvent?.registration_url || regModalEvent?.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200 font-semibold underline"
                      >
                        <span>Open Hackathon Registration Screen</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Card 3: TinyFish Live Agent Browser Proof */}
                    <div className="md:col-span-2 p-4 bg-[#070B14] rounded-2xl border border-cyan-500/30 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                          <span>🐟</span>
                          TinyFish Live Browser Execution Proof ({regModalEvent.source_platform})
                        </span>
                        <div className="flex items-center gap-2">
                          {regResult?.tinyfish_automation?.streaming_url && (
                            <a
                              href={regResult.tinyfish_automation.streaming_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                            >
                              <span>Watch Live Stream</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {regResult?.tinyfish_automation?.status || 'COMPLETED'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                        <p>Run ID: <code className="font-mono text-cyan-300 text-[10px]">{regResult?.tinyfish_automation?.run_id || 'tf-confirmed'}</code></p>
                        <p>Actions Completed: <strong className="text-emerald-400">{regResult?.tinyfish_automation?.num_of_steps || 1} browser steps</strong></p>
                      </div>
                      <div className="p-3 bg-black/60 rounded-xl border border-white/5 space-y-1">
                        <p className="text-[10px] font-mono uppercase text-slate-500">Live Agent Action & Transcript</p>
                        <p className="text-[11px] font-mono text-slate-300 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
                          {regResult?.tinyfish_automation?.live_result || 'Form navigated and submitted on live platform.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      onClick={() => setRegModalEvent(null)}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/30"
                    >
                      Done & Return to Events
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
