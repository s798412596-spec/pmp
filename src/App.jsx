import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { flushSync } from "react-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from "recharts";
import {
  Mountain, LayoutDashboard, Settings, ClipboardList, CalendarDays, BarChart3, Users,
  ChevronRight, ChevronDown, Plus, Pencil, Trash2, X, Check, CheckCircle2, Circle,
  CircleDot, Smartphone, Store, MessageCircle, Radio, Pin, RefreshCw, Target, Clock,
  FileText, AlertCircle, Bot, Send, Loader2, Copy, ListTodo,
  UserCircle, Phone, Star, Search, CalendarClock, TrendingUp,
  ShieldAlert, History, CalendarCheck, Filter, Download, TriangleAlert, LogOut,
  GitBranch, Milestone, GanttChartSquare, AlertOctagon, Link2, Paperclip, Eye,
  Lock, UserPlus, KeyRound, ShieldCheck, Upload, FolderArchive, FileCheck, FileX, FileClock,
  ArrowUpFromLine, FolderOpen, Image, FileVideo, FileAudio, File, EyeOff, Menu
} from "lucide-react";
import { supabase, TABLE } from "./supabase.js";
import React from "react";

// ─── Error Boundary for view sections ─────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("ErrorBoundary caught:", error, info); }
  render() {
    if (this.state.hasError) {
      return React.createElement("div", { style: { padding: 40, textAlign: "center", color: "#6B7280" } },
        React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "#EF4444", marginBottom: 8 } }, "该模块加载出错"),
        React.createElement("div", { style: { fontSize: 12, marginBottom: 16 } }, String(this.state.error?.message || "")),
        React.createElement("button", {
          onClick: () => this.setState({ hasError: false, error: null }),
          style: { padding: "8px 20px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer", fontSize: 13 }
        }, "重试")
      );
    }
    return this.props.children;
  }
}

// ─── Design Tokens (Apple-style) ──────────
const T = {
  bg: "#F5F5F7",
  card: "#FFFFFF",
  sidebar: "#FFFFFF",
  accent: "#007AFF",
  accentLight: "#E8F2FF",
  text1: "#1D1D1F",
  text2: "#6E6E73",
  text3: "#AEAEB2",
  border: "#E5E5EA",
  borderLight: "#F2F2F7",
  success: "#34C759",
  warning: "#FF9500",
  danger: "#FF3B30",
  purple: "#AF52DE",
  teal: "#5AC8FA",
  pink: "#FF2D55",
  shadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)",
  shadowBtn: "0 1px 4px rgba(0,0,0,0.08)",
  radius: 12,
  radiusSm: 8,
  font: "-apple-system, 'SF Pro Display', 'SF Pro Text', 'PingFang SC', 'Noto Sans SC', sans-serif",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
};

const CAT_COLORS = {"新媒体": T.accent, "OTA": T.teal, "外卖": T.warning, "私域": T.purple, "直播": T.pink, "活动": T.success};
const PIE_COLORS = [T.accent, T.teal, T.warning, T.purple, T.pink, T.success, "#5856D6", "#64D2FF"];
const SK = "sm-ops-v6";
const uid = () => crypto.randomUUID().replace(/-/g,"").slice(0, 12);
const todayStr = () => new Date().toISOString().slice(0, 10);
const PLATFORMS = ["抖音","小红书","微信公众号","微信视频号","大众点评","美团","快手","微博"];
const CONTENT_TYPES = ["短视频","图文","直播","活动推广","促销海报","用户互动","探店合作","日常运营"];
const WEEK_DAYS = ["周一","周二","周三","周四","周五","周六","周日"];
const RES_TYPES = [{v:"account",l:"平台账号"},{v:"store",l:"店铺"},{v:"channel",l:"私域触点"},{v:"live",l:"直播频道"},{v:"other",l:"其他"}];
const FREQ_OPTS = [{v:"daily",l:"每日"},{v:"weekly",l:"每周"},{v:"biweekly",l:"每两周"},{v:"monthly",l:"每月"}];
const STATUS = [{v:0,l:"未开始",c:T.text3,bg:T.borderLight,icon:"circle"},{v:1,l:"进行中",c:T.warning,bg:"#FFF8EC",icon:"circledot"},{v:2,l:"已完成",c:T.success,bg:"#F0FDF4",icon:"check"}];
const PRIORITY_OPTS = [{v:0,l:"P0 紧急",c:T.danger},{v:1,l:"P1 高",c:T.warning},{v:2,l:"P2 中",c:T.accent},{v:3,l:"P3 低",c:T.text3}];
const ROLE_LEVELS = [{v:"admin",l:"管理员",desc:"全部权限"},{v:"pm",l:"项目经理",desc:"管理项目、分配任务"},{v:"editor",l:"编辑者",desc:"编辑任务、更新状态"},{v:"viewer",l:"查看者",desc:"只读查看"}];
const RISK_IMPACT = [{v:1,l:"低",c:T.text3},{v:2,l:"中",c:T.warning},{v:3,l:"高",c:T.danger}];
const RISK_PROB = [{v:1,l:"低",c:T.text3},{v:2,l:"中",c:T.warning},{v:3,l:"高",c:T.danger}];
const RISK_STATUS = [{v:"open",l:"开放",c:T.danger},{v:"mitigating",l:"缓解中",c:T.warning},{v:"closed",l:"已关闭",c:T.success}];
const MILESTONE_STATUS = [{v:0,l:"未开始",c:T.text3},{v:1,l:"进行中",c:T.warning},{v:2,l:"已完成",c:T.success}];
const StatusIcon = ({v, size=14}) => v===0 ? <Circle size={size} strokeWidth={2}/> : v===1 ? <CircleDot size={size} strokeWidth={2}/> : <CheckCircle2 size={size} strokeWidth={2}/>;

const RES_ICONS = {account: Smartphone, store: Store, channel: MessageCircle, live: Radio, other: Pin};

// ─── Mobile Detection Hook ──────────────
const MOBILE_BP = 768;
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= MOBILE_BP);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= MOBILE_BP);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// ─── Deadline Helpers ──────────────────────
const WARN_DAYS = 3; // yellow warning threshold
function getDeadlineStatus(deadline, progress) {
  if (!deadline || progress === 2) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const d = new Date(deadline); d.setHours(0,0,0,0);
  const diff = Math.ceil((d - now) / 86400000);
  if (diff < 0) return { level: "overdue", label: `逾期${Math.abs(diff)}天`, color: T.danger, days: diff };
  if (diff === 0) return { level: "today", label: "今日截止", color: T.danger, days: 0 };
  if (diff <= WARN_DAYS) return { level: "soon", label: `${diff}天后截止`, color: T.warning, days: diff };
  return { level: "ok", label: `${diff}天后`, color: T.text3, days: diff };
}

// ─── Period Helpers (for recurring task instances) ──────────
function getCurrentPeriod(freq) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,"0");
  const weekNum = getISOWeek(now);
  if (freq === "daily") return `${y}-${m}-${String(now.getDate()).padStart(2,"0")}`;
  if (freq === "weekly") return `${y}-W${String(weekNum).padStart(2,"0")}`;
  if (freq === "biweekly") return `${y}-BW${String(Math.ceil(weekNum/2)).padStart(2,"0")}`;
  if (freq === "monthly") return `${y}-${m}`;
  return `${y}-${m}`;
}
function getISOWeek(d) {
  const date = new Date(d.getTime()); date.setHours(0,0,0,0);
  date.setDate(date.getDate()+3-(date.getDay()+6)%7);
  const week1 = new Date(date.getFullYear(),0,4);
  return 1+Math.round(((date-week1)/86400000-3+(week1.getDay()+6)%7)/7);
}
function getPeriodLabel(period, freq) {
  if (freq === "daily") return period;
  if (freq === "weekly") { const [y,w] = period.split("-W"); return `第${parseInt(w)}周`; }
  if (freq === "biweekly") { const [y,bw] = period.split("-BW"); return `第${parseInt(bw)*2-1}-${parseInt(bw)*2}周`; }
  if (freq === "monthly") { const [y,m] = period.split("-"); return `${parseInt(m)}月`; }
  return period;
}
function getRecentPeriods(freq, count=4) {
  const periods = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    if (freq === "daily") d.setDate(d.getDate() - i);
    else if (freq === "weekly") d.setDate(d.getDate() - i * 7);
    else if (freq === "biweekly") d.setDate(d.getDate() - i * 14);
    else if (freq === "monthly") d.setMonth(d.getMonth() - i);
    periods.push(getCurrentPeriod.call ? (() => {
      const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0");
      const wn = getISOWeek(d);
      if (freq === "daily") return `${y}-${m}-${String(d.getDate()).padStart(2,"0")}`;
      if (freq === "weekly") return `${y}-W${String(wn).padStart(2,"0")}`;
      if (freq === "biweekly") return `${y}-BW${String(Math.ceil(wn/2)).padStart(2,"0")}`;
      return `${y}-${m}`;
    })() : "");
  }
  return periods;
}

const DEFAULT_STAFF = [
  {id:"s1",name:"嘉嘉",phone:"13800000001",role:"项目负责人",isAdmin:true,permission:"admin",color:"#007AFF"},
  {id:"s2",name:"杨劼",phone:"13800000002",role:"运营专员",isAdmin:false,permission:"editor",color:"#34C759"},
  {id:"s3",name:"谷欣慧",phone:"13800000003",role:"设计",isAdmin:false,permission:"editor",color:"#AF52DE"},
];

const DEFAULT_PROJECTS = [
  {id:"p4",name:"第二座山度假村",priority:0,isKey:true,color:"#007AFF",categories:[
    {id:"c4-1",name:"新媒体运营",cat:"新媒体",resources:[
      {id:"r4-1",name:"抖音「第二座山度假村」",type:"account",platform:"抖音",owner:"s2",actions:[
        {id:"a4-1",name:"短视频拍摄发布",aType:"recurring",freq:"weekly",count:"3条/周",staffId:"s2",progress:1,deadline:"",hours:6,note:""},
        {id:"a4-2",name:"评论互动维护",aType:"recurring",freq:"daily",count:"每日",staffId:"s2",progress:1,deadline:"",hours:2,note:""},
        {id:"a4-3",name:"账号数据周报",aType:"recurring",freq:"weekly",count:"1份/周",staffId:"s2",progress:0,deadline:"",hours:1,note:""},
      ]},
      {id:"r4-2",name:"小红书「第二座山」",type:"account",platform:"小红书",owner:"s3",actions:[
        {id:"a4-4",name:"图文笔记发布",aType:"recurring",freq:"weekly",count:"3篇/周",staffId:"s3",progress:1,deadline:"",hours:5,note:""},
        {id:"a4-5",name:"探店KOL合作对接",aType:"once",freq:"",count:"",staffId:"s1",progress:0,deadline:"2026-04-15",hours:3,note:"对接3位本地KOL"},
      ]},
      {id:"r4-3",name:"微信视频号「第二座山」",type:"account",platform:"微信视频号",owner:"s2",actions:[
        {id:"a4-6",name:"视频号内容同步发布",aType:"recurring",freq:"weekly",count:"2条/周",staffId:"s2",progress:0,deadline:"",hours:2,note:""},
      ]},
    ]},
    {id:"c4-2",name:"度假村活动设计和落实",cat:"活动",resources:[
      {id:"r4-4",name:"线下主题活动",type:"other",platform:"",owner:"s1",actions:[
        {id:"a4-7",name:"4月亲子露营活动策划",aType:"once",freq:"",count:"",staffId:"s1",progress:1,deadline:"2026-04-01",hours:8,note:"含物料设计"},
        {id:"a4-8",name:"活动海报与物料设计",aType:"once",freq:"",count:"",staffId:"s3",progress:1,deadline:"2026-03-28",hours:5,note:""},
      ]},
    ]},
    {id:"c4-3",name:"私域运营",cat:"私域",resources:[
      {id:"r4-5",name:"会员微信群（3个）",type:"channel",platform:"",owner:"s2",actions:[
        {id:"a4-9",name:"每日群内容维护",aType:"recurring",freq:"daily",count:"每日",staffId:"s2",progress:1,deadline:"",hours:2,note:""},
        {id:"a4-10",name:"会员专属活动推送",aType:"recurring",freq:"weekly",count:"1次/周",staffId:"s2",progress:0,deadline:"",hours:1,note:""},
      ]},
    ]},
    {id:"c4-4",name:"直播运营",cat:"直播",resources:[
      {id:"r4-7",name:"抖音直播间",type:"live",platform:"抖音",owner:"s2",actions:[
        {id:"a4-12",name:"周末直播排期与执行",aType:"recurring",freq:"weekly",count:"2场/周",staffId:"s2",progress:0,deadline:"",hours:6,note:""},
        {id:"a4-13",name:"直播间场景布置优化",aType:"once",freq:"",count:"",staffId:"s3",progress:0,deadline:"2026-04-10",hours:4,note:""},
      ]},
    ]},
  ]},
  {id:"p1",name:"伍鮨居酒屋",priority:1,isKey:false,color:"#FF9500",categories:[
    {id:"c1-1",name:"新媒体运营",cat:"新媒体",resources:[
      {id:"r1-1",name:"抖音「伍鮨居酒屋」",type:"account",platform:"抖音",owner:"s2",actions:[
        {id:"a1-1",name:"短视频拍摄发布",aType:"recurring",freq:"weekly",count:"2条/周",staffId:"s2",progress:1,deadline:"",hours:4,note:""},
        {id:"a1-2",name:"评论区互动",aType:"recurring",freq:"daily",count:"每日",staffId:"s2",progress:1,deadline:"",hours:1,note:""},
      ]},
      {id:"r1-2",name:"小红书「伍鮨」",type:"account",platform:"小红书",owner:"s3",actions:[
        {id:"a1-3",name:"图文笔记发布",aType:"recurring",freq:"weekly",count:"2篇/周",staffId:"s3",progress:1,deadline:"",hours:3,note:""},
      ]},
    ]},
    {id:"c1-2",name:"OTA管理",cat:"OTA",resources:[
      {id:"r1-3",name:"大众点评店铺",type:"store",platform:"大众点评",owner:"s2",actions:[
        {id:"a1-5",name:"评价回复管理",aType:"recurring",freq:"daily",count:"每日",staffId:"s2",progress:1,deadline:"",hours:1,note:""},
        {id:"a1-6",name:"新团购套餐上架",aType:"once",freq:"",count:"",staffId:"s1",progress:0,deadline:"2026-04-05",hours:2,note:"春季新套餐"},
      ]},
    ]},
    {id:"c1-3",name:"外卖平台运营管理",cat:"外卖",resources:[
      {id:"r1-4",name:"美团外卖店铺",type:"store",platform:"美团",owner:"s2",actions:[
        {id:"a1-7",name:"菜品上下架管理",aType:"recurring",freq:"weekly",count:"每周",staffId:"s2",progress:1,deadline:"",hours:1,note:""},
      ]},
    ]},
    {id:"c1-4",name:"私域运营",cat:"私域",resources:[
      {id:"r1-6",name:"伍鮨粉丝微信群",type:"channel",platform:"",owner:"s2",actions:[
        {id:"a1-10",name:"群日常内容维护",aType:"recurring",freq:"daily",count:"每日",staffId:"s2",progress:1,deadline:"",hours:1,note:""},
      ]},
    ]},
  ]},
  {id:"p2",name:"云石榴云南菜",priority:2,isKey:false,color:"#AF52DE",categories:[
    {id:"c2-1",name:"新媒体运营",cat:"新媒体",resources:[
      {id:"r2-1",name:"抖音「云石榴云南菜」",type:"account",platform:"抖音",owner:"s2",actions:[
        {id:"a2-1",name:"短视频拍摄发布",aType:"recurring",freq:"weekly",count:"2条/周",staffId:"s2",progress:0,deadline:"",hours:4,note:""},
      ]},
      {id:"r2-2",name:"小红书「云石榴」",type:"account",platform:"小红书",owner:"s3",actions:[
        {id:"a2-2",name:"图文笔记发布",aType:"recurring",freq:"weekly",count:"2篇/周",staffId:"s3",progress:0,deadline:"",hours:3,note:""},
      ]},
    ]},
    {id:"c2-2",name:"OTA管理",cat:"OTA",resources:[
      {id:"r2-3",name:"大众点评店铺",type:"store",platform:"大众点评",owner:"s2",actions:[
        {id:"a2-3",name:"评价回复管理",aType:"recurring",freq:"daily",count:"每日",staffId:"s2",progress:0,deadline:"",hours:1,note:""},
      ]},
    ]},
    {id:"c2-4",name:"私域运营",cat:"私域",resources:[
      {id:"r2-5",name:"云石榴粉丝群",type:"channel",platform:"",owner:"s2",actions:[
        {id:"a2-5",name:"群日常维护",aType:"recurring",freq:"daily",count:"每日",staffId:"s2",progress:0,deadline:"",hours:1,note:""},
      ]},
    ]},
  ]},
  {id:"p3",name:"速八精选酒店",priority:3,isKey:false,color:"#5AC8FA",categories:[
    {id:"c3-1",name:"私域运营",cat:"私域",resources:[
      {id:"r3-1",name:"会员企微社群",type:"channel",platform:"",owner:"s2",actions:[
        {id:"a3-1",name:"社群日常运营",aType:"recurring",freq:"daily",count:"每日",staffId:"s2",progress:0,deadline:"",hours:1,note:""},
      ]},
    ]},
    {id:"c3-2",name:"直播带货运营",cat:"直播",resources:[
      {id:"r3-2",name:"抖音直播间",type:"live",platform:"抖音",owner:"s2",actions:[
        {id:"a3-2",name:"每周直播带货",aType:"recurring",freq:"weekly",count:"1场/周",staffId:"s2",progress:0,deadline:"",hours:4,note:""},
        {id:"a3-3",name:"直播脚本策划",aType:"recurring",freq:"weekly",count:"1份/周",staffId:"s1",progress:0,deadline:"",hours:2,note:""},
      ]},
    ]},
  ]},
];

const DEFAULT_DATA = {projects:DEFAULT_PROJECTS,staff:DEFAULT_STAFF,weekSchedules:{},calendarItems:[],assets:[],comments:[],notifications:[],subtasks:{},taskInstances:{},risks:[],globalSearch:""};

function getAllActions(projects){const a=[];projects.forEach(p=>(p.categories||[]).forEach(c=>(c.resources||[]).forEach(r=>(r.actions||[]).forEach(act=>{a.push({...act,dependsOn:act.dependsOn||[],attachments:act.attachments||[],projectId:p.id,projectName:p.name,projectColor:p.color,isKey:p.isKey,priority:p.priority,catName:c.name,cat:c.cat,resName:r.name,resType:r.type,catId:c.id,resId:r.id});}))));return a;}
function updateActionInProjects(projects,actionId,updates){return projects.map(p=>({...p,categories:(p.categories||[]).map(c=>({...c,resources:(c.resources||[]).map(r=>({...r,actions:(r.actions||[]).map(a=>a.id===actionId?{...a,...updates}:a)}))}))}));}

// ═══════════════════════════════════════════
// ─── SUPABASE STORAGE HOOK ───────────────
// ═══════════════════════════════════════════
function useStorage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | syncing | synced | error
  const channelRef = useRef(null);
  const serverLoadedRef = useRef(false); // true once Supabase returned real data
  const clientIdRef = useRef((() => {
    const KEY = "sm-client-id";
    let id = sessionStorage.getItem(KEY);
    if (!id) { id = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem(KEY, id); }
    return id;
  })());

  // ── Rebuild Realtime channel (call again after login to get authenticated subscription) ──
  const resubscribe = () => {
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    const ch = supabase.channel('app-data-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLE, filter: 'id=eq.main' }, (payload) => {
        if (payload.new?.data) {
          const remote = { ...DEFAULT_DATA, ...payload.new.data };
          if (remote._clientId && remote._clientId === clientIdRef.current) return; // own echo
          setData(remote);
          localStorage.setItem(SK, JSON.stringify(remote));
          setSyncStatus("synced");
        }
      })
      .subscribe();
    channelRef.current = ch;
  };

  // ── Fetch from Supabase; push localStorage if empty; returns true on success ──
  const loadData = async () => {
    try {
      const { data: row } = await supabase.from(TABLE).select("data").eq("id", "main").single();
      if (row?.data && Object.keys(row.data).length > 0) {
        const merged = { ...DEFAULT_DATA, ...row.data };
        setData(merged);
        localStorage.setItem(SK, JSON.stringify(merged));
        setSyncStatus("synced");
        serverLoadedRef.current = true;
        return true;
      }
      // Supabase row is empty — push local data up
      const local = localStorage.getItem(SK);
      const parsed = local ? { ...DEFAULT_DATA, ...JSON.parse(local) } : DEFAULT_DATA;
      setData(parsed);
      await supabase.from(TABLE).upsert({ id: "main", data: parsed, updated_at: new Date().toISOString() });
      localStorage.setItem(SK, JSON.stringify(parsed));
      setSyncStatus("synced");
      serverLoadedRef.current = true;
      return true;
    } catch (e) {
      return false;
    }
  };

  // ── Initial load (anon read policy now allows this before login) ──
  useEffect(() => {
    let cancelled = false;
    const fallback = () => {
      if (cancelled || serverLoadedRef.current) return; // don't overwrite a successful server load
      console.warn("Supabase load failed, using localStorage");
      const local = localStorage.getItem(SK);
      setData(local ? { ...DEFAULT_DATA, ...JSON.parse(local) } : DEFAULT_DATA);
      setSyncStatus("error");
      setLoading(false);
    };
    const timer = setTimeout(fallback, 8000);
    (async () => {
      const ok = await loadData();
      if (cancelled) return;
      clearTimeout(timer);
      if (!ok) fallback();
      else setLoading(false);
    })();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  // ── Initial Realtime subscription (anon; works because anon read policy is set) ──
  useEffect(() => {
    resubscribe();
    return () => { if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; } };
  }, []);

  // ── On SIGNED_IN: reload fresh server data + rebuild Realtime with authenticated session ──
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        await loadData();
        resubscribe();
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const save = useCallback(async (d) => {
    const withTs = { ...d, _savedAt: Date.now(), _clientId: clientIdRef.current };
    setData(withTs);
    localStorage.setItem(SK, JSON.stringify(withTs));
    setSyncStatus("syncing");
    try {
      await supabase.from(TABLE).upsert({ id: "main", data: withTs, updated_at: new Date().toISOString() });
      setSyncStatus("synced");
    } catch (e) {
      console.warn("Supabase save failed:", e);
      setSyncStatus("error");
    }
  }, []);

  return { data, save, loading, syncStatus };
}

// ═══════════════════════════════════════════
// ─── AUDIT LOG HOOK ──────────────────────
// ═══════════════════════════════════════════
function useAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async (limit = 100) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (data) setLogs(data);
    } catch (e) {
      console.warn("Failed to fetch audit logs:", e);
    }
    setLoading(false);
  }, []);

  const addLog = useCallback(async (userId, userName, action, targetType, targetName, details = {}) => {
    try {
      await supabase.from("audit_log").insert({
        user_id: userId,
        user_name: userName,
        action,
        target_type: targetType,
        target_name: targetName,
        details,
      });
    } catch (e) {
      console.warn("Failed to write audit log:", e);
    }
  }, []);

  return { logs, fetchLogs, addLog, loading };
}

// ═══════════════════════════════════════════
// ─── TASK INSTANCES HOOK ─────────────────
// ═══════════════════════════════════════════
function useTaskInstances() {
  const [instances, setInstances] = useState([]);

  const fetchInstances = useCallback(async (actionIds = []) => {
    try {
      let query = supabase.from("task_instances").select("*").order("created_at", { ascending: false });
      if (actionIds.length > 0) query = query.in("action_id", actionIds);
      const { data } = await query.limit(500);
      if (data) setInstances(data);
    } catch (e) { console.warn("Failed to fetch instances:", e); }
  }, []);

  const checkIn = useCallback(async (actionId, period, userId, note = "") => {
    try {
      // Upsert: if already exists for this action+period, update it
      const { data: existing } = await supabase
        .from("task_instances")
        .select("id")
        .eq("action_id", actionId)
        .eq("period", period)
        .single();

      if (existing) {
        await supabase.from("task_instances").update({
          status: 2, checked_by: userId, checked_at: new Date().toISOString(), note
        }).eq("id", existing.id);
      } else {
        await supabase.from("task_instances").insert({
          action_id: actionId, period, status: 2, checked_by: userId, checked_at: new Date().toISOString(), note
        });
      }
      // Refresh
      await fetchInstances();
    } catch (e) { console.warn("Failed to check in:", e); }
  }, [fetchInstances]);

  const uncheckIn = useCallback(async (actionId, period) => {
    try {
      await supabase.from("task_instances").delete().eq("action_id", actionId).eq("period", period);
      await fetchInstances();
    } catch (e) { console.warn("Failed to uncheck:", e); }
  }, [fetchInstances]);

  const getInstanceStatus = useCallback((actionId, period) => {
    return instances.find(i => i.action_id === actionId && i.period === period);
  }, [instances]);

  return { instances, fetchInstances, checkIn, uncheckIn, getInstanceStatus };
}

// ─── Deliverables Hook ──────────────────
function useDeliverables() {
  const [deliverables, setDeliverables] = useState([]);
  const [dlLoading, setDlLoading] = useState(false);

  const fetchDeliverables = useCallback(async () => {
    const { data, error } = await supabase.from("deliverables").select("*").order("created_at", { ascending: false });
    if (!error && data) setDeliverables(data);
  }, []);

  useEffect(() => { fetchDeliverables(); }, [fetchDeliverables]);

  const uploadFile = useCallback(async (file, actionId, projectId, categoryId, resourceId, user) => {
    setDlLoading(true);
    try {
      // Determine version
      const existing = deliverables.filter(d => d.action_id === actionId);
      const version = existing.length > 0 ? Math.max(...existing.map(d => d.version)) + 1 : 1;
      const ext = file.name.split(".").pop();
      const safeName = file.name.replace(/[^a-zA-Z0-9._\u4e00-\u9fff-]/g, "_");
      const path = `${projectId}/${categoryId}/${resourceId}/${actionId}/v${version}_${safeName}`;

      const { error: uploadErr } = await supabase.storage.from("deliverables").upload(path, file, { upsert: false });
      if (uploadErr) throw uploadErr;

      const { error: insertErr } = await supabase.from("deliverables").insert({
        action_id: actionId,
        project_id: projectId,
        category_id: categoryId,
        resource_id: resourceId,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        file_type: file.type || ext,
        version,
        status: "pending",
        uploaded_by: user.staff_id || user.id,
        uploaded_by_name: user.name,
      });
      if (insertErr) throw insertErr;
      await fetchDeliverables();
      return { success: true, version };
    } catch (e) {
      console.error("Upload error:", e);
      return { success: false, error: e.message };
    } finally { setDlLoading(false); }
  }, [deliverables, fetchDeliverables]);

  const reviewDeliverable = useCallback(async (id, status, reviewer, rejectReason) => {
    const updates = {
      status,
      reviewed_by: reviewer.staff_id || reviewer.id,
      reviewed_by_name: reviewer.name,
      reviewed_at: new Date().toISOString(),
      reject_reason: status === "rejected" ? (rejectReason || "") : "",
    };
    await supabase.from("deliverables").update(updates).eq("id", id);
    await fetchDeliverables();
  }, [fetchDeliverables]);

  const getFileUrl = useCallback(async (path) => {
    const { data } = await supabase.storage.from("deliverables").createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  }, []);

  const getActionDeliverables = useCallback((actionId) => {
    return deliverables.filter(d => d.action_id === actionId);
  }, [deliverables]);

  const getProjectDeliverables = useCallback((projectId) => {
    return deliverables.filter(d => d.project_id === projectId);
  }, [deliverables]);

  return { deliverables, dlLoading, uploadFile, reviewDeliverable, getFileUrl, getActionDeliverables, getProjectDeliverables, fetchDeliverables };
}

// File type icon helper
const getFileIcon = (type) => {
  if (!type) return File;
  const t = type.toLowerCase();
  if (t.startsWith("image") || /jpg|jpeg|png|gif|svg|webp/.test(t)) return Image;
  if (t.startsWith("video") || /mp4|mov|avi|mkv/.test(t)) return FileVideo;
  if (t.startsWith("audio") || /mp3|wav|aac/.test(t)) return FileAudio;
  return File;
};
const formatFileSize = (bytes) => {
  if (!bytes) return "0B";
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + "KB";
  return (bytes / 1048576).toFixed(1) + "MB";
};

// ─── Initials Avatar ─────────────────────
const Avatar = ({name, color, size=32}) => {
  const initials = (name||"?").slice(0,1);
  return <div style={{width:size,height:size,borderRadius:size*0.3,background:color||T.accent,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:size*0.4,fontWeight:700,flexShrink:0,letterSpacing:0,fontFamily:T.font,transition:T.transition}}>{initials}</div>;
};
const ProjectDot = ({color, size=10}) => <div style={{width:size,height:size,borderRadius:"50%",background:color||T.accent,flexShrink:0}} />;

// ─── UI Primitives (Apple-style) ──────────
const Badge = ({children, color=T.accent, small, style:sx}) => <span style={{display:"inline-flex",alignItems:"center",padding:small?"2px 8px":"3px 10px",borderRadius:20,fontSize:small?10:11,fontWeight:600,background:color+"14",color,whiteSpace:"nowrap",transition:T.transition,...sx}}>{children}</span>;

const Btn = ({children, onClick, v="primary", small, disabled, style:sx}) => {
  const base = {padding:small?"5px 12px":"8px 18px",borderRadius:T.radiusSm,fontSize:small?12:13,fontWeight:600,cursor:disabled?"not-allowed":"pointer",border:"none",transition:T.transition,opacity:disabled?.5:1,display:"inline-flex",alignItems:"center",gap:6,boxShadow:T.shadowBtn,...sx};
  const vs = {
    primary:{...base,background:T.accent,color:"#fff"},
    secondary:{...base,background:T.borderLight,color:T.text2,boxShadow:"none"},
    danger:{...base,background:"#FFF2F2",color:T.danger,boxShadow:"none"},
    ghost:{...base,background:"transparent",color:T.accent,padding:small?"5px 8px":"8px 12px",boxShadow:"none"},
    success:{...base,background:T.success,color:"#fff"},
  };
  return <button style={vs[v]||vs.primary} onClick={disabled?undefined:onClick}
    onMouseEnter={e=>{if(!disabled)e.target.style.opacity="0.85"}}
    onMouseLeave={e=>{e.target.style.opacity=disabled?"0.5":"1"}}
  >{children}</button>;
};

const Input = ({label,...props}) => <div style={{marginBottom:14}}>
  {label&&<label style={{display:"block",fontSize:12,fontWeight:600,color:T.text2,marginBottom:5}}>{label}</label>}
  <input {...props} style={{width:"100%",padding:"9px 12px",borderRadius:T.radiusSm,border:`1.5px solid ${T.border}`,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:T.font,transition:T.transition,background:T.card,...props.style}}
    onFocus={e=>{e.target.style.borderColor=T.accent;e.target.style.boxShadow=`0 0 0 3px ${T.accent}20`}}
    onBlur={e=>{e.target.style.borderColor=T.border;e.target.style.boxShadow="none"}}
  />
</div>;

const Card = ({children, style:sx, highlight, ...p}) => <div style={{background:T.card,borderRadius:T.radius,padding:"18px 22px",border:highlight?`2px solid ${T.accent}`:`1px solid ${T.borderLight}`,boxShadow:T.shadow,transition:T.transition,...sx}} {...p}>{children}</div>;

const Modal = ({open, onClose, title, children, width=540}) => {
  if(!open) return null;
  return <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.25)",backdropFilter:"blur(12px)",transition:T.transition,animation:"fadeIn 0.2s ease"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:16,padding:"28px 32px",width,maxWidth:"94vw",maxHeight:"85vh",overflowY:"auto",boxShadow:"0 25px 60px rgba(0,0,0,0.12)",animation:"slideUp 0.25s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h3 style={{margin:0,fontSize:17,fontWeight:700,color:T.text1}}>{title}</h3>
        <button onClick={onClose} style={{background:T.borderLight,border:"none",width:28,height:28,borderRadius:14,cursor:"pointer",color:T.text3,display:"flex",alignItems:"center",justifyContent:"center",transition:T.transition}}
          onMouseEnter={e=>e.target.style.background=T.border} onMouseLeave={e=>e.target.style.background=T.borderLight}>
          <X size={14}/>
        </button>
      </div>
      {children}
    </div>
  </div>;
};

const QuickSelect = ({options, value, onChange, label}) => <div style={{marginBottom:14}}>
  {label&&<label style={{display:"block",fontSize:12,fontWeight:600,color:T.text2,marginBottom:6}}>{label}</label>}
  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
    {options.map(o=>{const lbl=typeof o==="string"?o:o.l;const val=typeof o==="string"?o:o.v;const sel=value===val;
      return <button key={val} onClick={()=>onChange(val)} style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:600,border:`1.5px solid ${sel?T.accent:T.border}`,background:sel?T.accentLight:T.card,color:sel?T.accent:T.text2,cursor:"pointer",transition:T.transition,boxShadow:sel?`0 0 0 2px ${T.accent}20`:"none"}}>{lbl}</button>;
    })}
  </div>
</div>;

const Tabs = ({items, active, onChange}) => <div style={{display:"flex",gap:2,background:T.borderLight,borderRadius:10,padding:3,marginBottom:20}}>
  {items.map(t=><button key={t.id} onClick={()=>onChange(t.id)} style={{flex:1,padding:"8px 14px",borderRadius:8,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",background:active===t.id?T.card:"transparent",color:active===t.id?T.accent:T.text3,boxShadow:active===t.id?T.shadow:"none",transition:T.transition,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
    {t.icon} {t.label}
  </button>)}
</div>;

// ─── Sync Status Indicator ────────────────
const SyncBadge = ({ status, onSync }) => {
  const map = {
    idle: { c: T.text3, l: "本地", icon: Circle },
    syncing: { c: T.warning, l: "同步中", icon: Loader2 },
    synced: { c: T.success, l: "已同步", icon: CheckCircle2 },
    error: { c: T.danger, l: "点击同步", icon: RefreshCw },
  };
  const needsSync = status === "error";
  const s = map[status] || map.idle;
  const Icon = s.icon;
  return <div
    onClick={onSync && needsSync ? onSync : undefined}
    title={onSync && needsSync ? "点击将本地数据同步到服务器" : undefined}
    style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:s.c,fontWeight:600,padding:"3px 8px",borderRadius:10,background:s.c+"10",cursor:onSync&&needsSync?"pointer":"default",transition:T.transition}}
  >
    <Icon size={10} style={status==="syncing"?{animation:"spin 1s linear infinite"}:{}}/> {s.l}
  </div>;
};

// ─── Global CSS Keyframes ────────────────
const GlobalStyles = () => <style>{`
  @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
  @keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
  @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
  @keyframes spin { from { transform:rotate(0) } to { transform:rotate(360deg) } }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: ${T.font}; background: ${T.bg}; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width:6px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:3px; }
  @media (max-width: 768px) {
    .mobile-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.3); z-index:99; }
    .mobile-sidebar { position:fixed !important; left:0; top:0; z-index:100; height:100vh !important; box-shadow:4px 0 24px rgba(0,0,0,0.12); }
    .mobile-sidebar-hidden { transform:translateX(-100%); }
    .mobile-sidebar-visible { transform:translateX(0); }
    .grid-responsive-5 { grid-template-columns: repeat(2, 1fr) !important; }
    .grid-responsive-3 { grid-template-columns: 1fr !important; }
    .grid-responsive-2 { grid-template-columns: 1fr !important; }
    main { -webkit-overflow-scrolling: touch; }
    h2 { font-size: 18px !important; }
  }
`}</style>;

// ═══════════════════════════════════════════
// ─── DEADLINE ALERT PANEL ────────────────
// ═══════════════════════════════════════════
function DeadlineAlerts({ actions, staff }) {
  const alerts = useMemo(() => {
    return actions
      .map(a => ({ ...a, ds: getDeadlineStatus(a.deadline, a.progress) }))
      .filter(a => a.ds && (a.ds.level === "overdue" || a.ds.level === "today" || a.ds.level === "soon"))
      .sort((a, b) => a.ds.days - b.ds.days);
  }, [actions]);

  if (alerts.length === 0) return null;

  const overdue = alerts.filter(a => a.ds.level === "overdue" || a.ds.level === "today");
  const soon = alerts.filter(a => a.ds.level === "soon");

  return <Card style={{ padding: "16px 20px", marginBottom: 20, borderLeft: `3px solid ${overdue.length > 0 ? T.danger : T.warning}`, background: overdue.length > 0 ? "#FFF5F5" : "#FFFBF0" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <TriangleAlert size={18} color={overdue.length > 0 ? T.danger : T.warning} />
      <span style={{ fontSize: 14, fontWeight: 700, color: overdue.length > 0 ? T.danger : T.warning }}>
        截止日期预警
      </span>
      <span style={{ fontSize: 11, color: T.text3, marginLeft: "auto" }}>
        {overdue.length > 0 && <Badge color={T.danger} small>{overdue.length} 逾期</Badge>}
        {" "}
        {soon.length > 0 && <Badge color={T.warning} small>{soon.length} 即将到期</Badge>}
      </span>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {alerts.slice(0, 8).map(a => {
        const person = staff.find(s => s.id === a.staffId);
        return <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: T.radiusSm, background: T.card, border: `1px solid ${a.ds.color}20`, transition: T.transition }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.ds.color, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text1, flex: 1 }}>{a.name}</span>
          <span style={{ fontSize: 11, color: T.text3 }}>{a.projectName}</span>
          <span style={{ fontSize: 11, color: T.text3, display: "flex", alignItems: "center", gap: 3 }}>
            <UserCircle size={11} /> {person?.name}
          </span>
          <Badge color={a.ds.color} small>{a.ds.label}</Badge>
        </div>;
      })}
      {alerts.length > 8 && <div style={{ fontSize: 11, color: T.text3, textAlign: "center", padding: 4 }}>还有 {alerts.length - 8} 条...</div>}
    </div>
  </Card>;
}

// ═══════════════════════════════════════════
// ─── AI CONSTANTS (module-level) ─────────
// ═══════════════════════════════════════════
// Supabase anon key is intentionally public (client-side, role=anon, RLS enforced server-side).
// Prefer VITE_SUPABASE_ANON_KEY env var in production to avoid hardcoding project-specific values.
const AI_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpdmluaWZzdWNmZnN4eWl5eXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjgxNjksImV4cCI6MjA5MDEwNDE2OX0.VFqHzTvjN7wwo8ctwOfmL8-k7VJX93QeYDOzT8yLUuE";
const AI_EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`;
const AI_CLIENT_TIMEOUT_MS = 40000;

// ═══════════════════════════════════════════
// ─── AI CONFIG PANEL ─────────────────────
// ═══════════════════════════════════════════
const AI_PROVIDERS = [
  { v: "qwen", l: "通义千问 Qwen", models: ["qwen3.6-plus-2026-04-02", "qwen3.5-plus", "qwen-plus", "qwen-max", "qwen3-max", "qwen-turbo"] },
  { v: "glm", l: "智谱 GLM", models: ["GLM-5", "GLM-4-Plus", "GLM-4-Air"] },
  { v: "gemini", l: "Google Gemini", models: ["gemini-3.1-pro-preview", "gemini-3-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite", "gemini-2.5-flash"] },
  { v: "anthropic", l: "Anthropic Claude", models: ["claude-sonnet-4-6-20260217", "claude-opus-4-6-20260205", "claude-haiku-4-5-20251015"] },
  { v: "openai", l: "OpenAI", models: ["gpt-5.4", "gpt-5.4-mini", "gpt-5.3-instant"] },
  { v: "deepseek", l: "DeepSeek", models: ["deepseek-v3.2", "deepseek-r1", "deepseek-v3"] },
  { v: "custom", l: "自定义 (OpenAI兼容)", models: [] },
];

function AIConfigPanel({ open, onClose, hoursAnalyst, setHoursAnalyst }) {
  const [config, setConfig] = useState(() => JSON.parse(localStorage.getItem("sm-ai-config") || '{"provider":"gemini","model":""}'));
  const provider = AI_PROVIDERS.find(p => p.v === config.provider) || AI_PROVIDERS[0];

  const saveConfig = () => {
    localStorage.setItem("sm-ai-config", JSON.stringify(config));
    onClose();
  };

  return <Modal open={open} onClose={onClose} title="AI 模型设置" width={480}>
    <div style={{ marginBottom: 16, padding: "12px 16px", background: T.accentLight, borderRadius: T.radiusSm, fontSize: 12, color: T.accent, display: "flex", alignItems: "flex-start", gap: 8 }}>
      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>API Key 安全存储在 Supabase 服务端</div>
        <div style={{ color: T.text2 }}>前端不会暴露任何密钥。切换模型后需确保对应 Key 已在 Supabase Secrets 中配置。</div>
      </div>
    </div>

    <QuickSelect
      label="AI 服务商"
      options={AI_PROVIDERS.map(p => ({ v: p.v, l: p.l }))}
      value={config.provider}
      onChange={v => setConfig({ ...config, provider: v, model: "" })}
    />

    {provider.models.length > 0 && <QuickSelect
      label="模型"
      options={provider.models.map(m => ({ v: m, l: m }))}
      value={config.model || provider.models[0]}
      onChange={v => setConfig({ ...config, model: v })}
    />}

    {config.provider === "custom" && <div>
      <Input label="模型名称" placeholder="如 qwen-72b-chat" value={config.model || ""} onChange={e => setConfig({ ...config, model: e.target.value })} />
      <div style={{ fontSize: 11, color: T.text3, marginTop: -8, marginBottom: 12 }}>
        自定义模式需在 Supabase Secrets 中设置 CUSTOM_LLM_API_KEY 和 CUSTOM_LLM_BASE_URL
      </div>
    </div>}

    <div style={{ marginTop: 8, padding: "12px 16px", background: T.borderLight, borderRadius: T.radiusSm, fontSize: 11, color: T.text2 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: T.text1 }}>Supabase Secrets 配置指引</div>
      <div style={{ lineHeight: 1.8 }}>
        <code style={{ background: T.card, padding: "1px 6px", borderRadius: 4, fontSize: 10 }}>GEMINI_API_KEY</code> — Google Gemini<br/>
        <code style={{ background: T.card, padding: "1px 6px", borderRadius: 4, fontSize: 10 }}>ANTHROPIC_API_KEY</code> — Anthropic Claude<br/>
        <code style={{ background: T.card, padding: "1px 6px", borderRadius: 4, fontSize: 10 }}>OPENAI_API_KEY</code> — 通义千问 Qwen / OpenAI GPT<br/>
        <code style={{ background: T.card, padding: "1px 6px", borderRadius: 4, fontSize: 10 }}>DEEPSEEK_API_KEY</code> — DeepSeek<br/>
        <code style={{ background: T.card, padding: "1px 6px", borderRadius: 4, fontSize: 10 }}>CUSTOM_LLM_API_KEY</code> + <code style={{ background: T.card, padding: "1px 6px", borderRadius: 4, fontSize: 10 }}>CUSTOM_LLM_BASE_URL</code> — 自定义
      </div>
    </div>

    <div style={{ marginTop: 12, padding: "12px 16px", background: T.borderLight, borderRadius: T.radiusSm, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text1 }}>⏱️ 工时分析者</div>
        <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>Agent 模式下自动估算每个任务的合理工时</div>
      </div>
      <button
        onClick={() => setHoursAnalyst && setHoursAnalyst(v => !v)}
        style={{ width: 42, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: hoursAnalyst ? "#F59E0B" : T.border, position: "relative", transition: "background 0.2s", flexShrink: 0 }}
      >
        <span style={{ position: "absolute", top: 3, left: hoursAnalyst ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s", display: "block" }}/>
      </button>
    </div>

    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
      <Btn v="secondary" onClick={onClose}>取消</Btn>
      <Btn onClick={saveConfig}>保存配置</Btn>
    </div>
  </Modal>;
}

// ═══════════════════════════════════════════
// ─── AI ASSISTANT (Multi-turn Chat) ──────
// ═══════════════════════════════════════════
function AIAssistant({data,save,auditLog,user}) {
  const {projects,staff} = data;
  const [input,setInput] = useState("");
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [loading,setLoading] = useState(false);
  const [chatMessages,setChatMessages] = useState(()=>{try{return JSON.parse(localStorage.getItem("sm-ai-chat")||"[]");}catch{return[];}});
  const [pendingOps,setPendingOps] = useState(null);
  const [chatHistory,setChatHistory] = useState(()=>{try{return JSON.parse(localStorage.getItem("sm-ai-history")||"[]");}catch{return[];}});
  const [showHistory,setShowHistory] = useState(false);
  const [agentMode, setAgentMode] = useState(()=>{try{return JSON.parse(localStorage.getItem("sm-agent-mode")??"true");}catch{return true;}});
  const [hoursAnalyst, setHoursAnalyst] = useState(()=>{try{return JSON.parse(localStorage.getItem("sm-hours-analyst")??"true");}catch{return true;}});
  const [loadingStage, setLoadingStage] = useState("");
  const [loadingElapsed, setLoadingElapsed] = useState(0);
  const [bulkHoursState, setBulkHoursState] = useState(null);
  const isFollowUpRef = useRef(false);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const autoResetTimerRef = useRef(null); // tracks the post-confirm auto-reset timer for cancellation

  // Persist chat messages
  useEffect(()=>{try{localStorage.setItem("sm-ai-chat",JSON.stringify(chatMessages));}catch{}},[chatMessages]);
  // Persist chat history
  useEffect(()=>{try{localStorage.setItem("sm-ai-history",JSON.stringify(chatHistory));}catch{}},[chatHistory]);
  // Persist agent mode
  useEffect(()=>{try{localStorage.setItem("sm-agent-mode",JSON.stringify(agentMode));}catch{}},[agentMode]);
  useEffect(()=>{try{localStorage.setItem("sm-hours-analyst",JSON.stringify(hoursAnalyst));}catch{}},[hoursAnalyst]);
  // Elapsed timer: tick every second while loading to show the user progress
  useEffect(() => {
    if (!loading) { setLoadingElapsed(0); return; }
    setLoadingElapsed(0);
    const t = setInterval(() => setLoadingElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);
  // Scroll chat container (not page)
  useEffect(()=>{if(chatContainerRef.current)chatContainerRef.current.scrollTop=chatContainerRef.current.scrollHeight;},[chatMessages,loading]);

  const getStaffName = (sid) => staff.find(s=>s.id===sid)?.name || "未分配";
  const getProjectName = (pid) => projects.find(p=>p.id===pid)?.name || (pid === "__new__" ? "新项目" : "未知项目");

  const zeroHoursActions = useMemo(() => {
    const result = [];
    for (const p of projects) {
      for (const c of p.categories || []) {
        for (const r of c.resources || []) {
          for (const a of r.actions || []) {
            if ((a.hours || 0) === 0) {
              result.push({ actionName: a.name, actionId: a.id, projectId: p.id, categoryId: c.id, resourceId: r.id, projectName: p.name });
            }
          }
        }
      }
    }
    return result;
  }, [projects]);

  const handleBulkHours = async () => {
    if (zeroHoursActions.length === 0 || bulkHoursState === "loading") return;
    const batch = zeroHoursActions.slice(0, 30);
    setBulkHoursState("loading");
    try {
      const aiConfig = JSON.parse(localStorage.getItem("sm-ai-config") || "{}");
      const provider = aiConfig.provider || "gemini";
      const provDef = AI_PROVIDERS.find(p => p.v === provider);
      const savedModel = aiConfig.model || "";
      const model = (provDef?.models?.length > 0 && savedModel && !provDef.models.includes(savedModel)) ? provDef.models[0] : savedModel;
      const resp = await fetch(AI_EDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AI_ANON_KEY}` },
        body: JSON.stringify({ provider, model, bulkHoursMode: true, actionsList: batch, hoursAnalystSystem: buildHoursAnalystPrompt() }),
      });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      const parsed = typeof result.text === "string" ? JSON.parse(result.text) : result.text;
      setBulkHoursState({ ops: parsed.operations || [], message: parsed.message || `已分析 ${batch.length} 条任务` });
    } catch (e) {
      setBulkHoursState(null);
      setChatMessages(prev => [...prev, { role: "assistant", content: `批量工时分析失败：${e.message}`, isError: true }]);
    }
  };

  const applyBulkHours = () => {
    if (!bulkHoursState || bulkHoursState === "loading" || !bulkHoursState.ops?.length) return;
    applyOperations({ operations: bulkHoursState.ops });
    setBulkHoursState(null);
    setChatMessages(prev => [...prev, { role: "assistant", content: `已为 ${bulkHoursState.ops.length} 条任务填入工时！`, isSuccess: true }]);
  };

  const buildSystemPrompt = (lean = false) => {
    // lean=true  → L1+L2 only (agent mode: per-bucket L3/L4 injected server-side per bucket)
    // lean=false → L1+L2+L3 (direct/follow-up mode: no bucket injection, needs resource IDs)
    const projSummary = projects.map(p => {
      if (lean) {
        const cats = (p.categories||[]).map(c => `    类别: "${c.name}" (id:${c.id})`).join("\n");
        return `  项目: "${p.name}" (id:${p.id})\n${cats}`;
      } else {
        const cats = (p.categories||[]).map(c => {
          const ress = (c.resources||[]).map(r => {
            const acts = (r.actions||[]).map(a =>
              `        动作: "${a.name}" (id:${a.id}) type:${a.aType||""}${a.freq?" freq:"+a.freq:""}${a.staffId?" 负责:"+a.staffId:""}`
            ).join("\n");
            return `      资源: "${r.name}" (id:${r.id})${acts ? "\n"+acts : ""}`;
          }).join("\n");
          return `    类别: "${c.name}" (id:${c.id})\n${ress}`;
        }).join("\n");
        return `  项目: "${p.name}" (id:${p.id})\n${cats}`;
      }
    }).join("\n");
    const staffMapping = staff.map(s=>`${s.name}=${s.id}`).join(", ");
    const structNote = lean
      ? "（L1项目→L2类别概览；每个项目的资源/动作详情已在消息中单独注入）"
      : "（L1项目→L2类别→L3资源→L4动作）";

    return `你是「第二座山集团新媒体运营管理系统」的AI项目助手，帮助项目经理将文字描述转化为结构化项目数据。

## 核心原则
1. **严格关联**：四级结构 L1项目→L2类别→L3资源→L4动作，每层必须挂载到上级
2. **不猜测留空**：没明确提到的信息一律留空（""或0），绝不推断截止日期、优先级、工时、频率
3. **主动追问**：信息不完整时追问缺失关键信息，每次最多3个问题
4. **全面管理**：可创建、修改、删除各层级，所有变更经用户确认后执行

## 当前项目结构${structNote}
${projSummary}

## 人员（姓名=ID）
${staffMapping}

## 约束
- 类别标签(cat): 新媒体, OTA, 外卖, 私域, 直播, 活动
- 资源类型(type): account, store, channel, live, other
- 平台: 抖音, 小红书, 微信公众号, 微信视频号, 大众点评, 美团, 饿了么, 快手, 微博（或留空）
- 动作类型(aType): recurring(周期性) / once(一次性)
- 频率(freq): daily, weekly, biweekly, monthly

## 响应格式（纯JSON，禁用markdown代码块）
{"message":"中文自然语言说明","needsMoreInfo":true或false,"questions":["追问1"],"operations":[...],"milestones":[...],"risks":[...]}

### operations 支持的操作：
1. add_project: {"type":"add_project","project":{"name":"","priority":0-3,"isKey":false,"color":"#007AFF"},"categories":[{"name":"","cat":"","resources":[{"name":"","type":"","platform":"","owner":"人员id","actions":[{"name":"","aType":"recurring/once","freq":"","count":"","staffId":"","hours":0,"deadline":"","note":""}]}]}]}
2. add_category: {"type":"add_category","projectId":"","category":{"name":"","cat":""},"resources":[同上]}
3. add_resource: {"type":"add_resource","projectId":"","categoryId":"","resource":{"name":"","type":"","platform":"","owner":""},"actions":[同上]}
4. add_action: {"type":"add_action","projectId":"","categoryId":"","resourceId":"","action":{"name":"","aType":"","freq":"","count":"","staffId":"","hours":0,"deadline":"","note":""}}
5. delete_action: {"type":"delete_action","projectId":"","categoryId":"","resourceId":"","actionId":"","actionName":""}
6. delete_resource: {"type":"delete_resource","projectId":"","categoryId":"","resourceId":"","resourceName":""}
7. delete_project: {"type":"delete_project","projectId":"","projectName":""}
8. update_action: {"type":"update_action","projectId":"","categoryId":"","resourceId":"","actionId":"","actionName":"","updates":{"staffId":"","deadline":""}}

### milestones: [{"projectId":"项目id或__new__","name":"","date":"YYYY-MM-DD或空"}]
### risks: [{"projectId":"项目id或__new__","name":"","impact":1-3,"probability":1-3}]

## 行为规则
- 模糊指令先追问：谁负责？什么频率？属于哪个项目？
- "新项目"/"新品牌" → add_project；已有项目名 → 匹配projectId后添加
- 自动建议里程碑和识别风险（人员过载、截止太紧等）
- message 只写中文纯文字（禁止把JSON结构放入message）
- 每次 operations 最多5个；超出时先做前5个并告知"请回复「继续」执行剩余X项"`;
  };

  // ── Hours Analyst prompt: estimates realistic work hours per action based on SM ops knowledge ──
  const buildHoursAnalystPrompt = () => {
    return `你是新媒体运营「工时分析者」，根据任务名称分析难易度并估算合理工时（小时）。

## 新媒体运营工时参考知识库
- 短视频拍摄+剪辑（抖音/快手/视频号）：3-5小时/条
- 小红书图文笔记（含选题/配图/发布）：1-2小时/篇
- 直播场次（从准备到收场）：2-4小时/场
- 直播脚本及互动话术撰写：3-5小时
- 活动/节日营销策划方案：4-8小时
- 线下商业拍摄（产品/空间/人物）：6-10小时
- 大众点评/美团评价日常回复：0.5-1小时/天
- 微信社群日常推送（节日祝福/优惠信息）：0.5小时/次
- 美团/饿了么套餐或产品上架：1-2小时
- 数据分析与运营报告：2-4小时
- 微信公众号/小红书长文章：2-3小时/篇
- 话题策划与创意设计：4-8小时
- 社交账号日常运营（评论互动/粉丝维护）：1小时/天
- 广告投放设置与优化：1-2小时/次
- 会员/私域活动组织：3-6小时

## 规则
- 只分析能合理推断工时的任务；无法判断时 hours 填 0
- hours 精确到 0.5，单次任务上限 20 小时
- difficulty: "easy"（≤1h）/ "medium"（1.5-5h）/ "hard"（>5h）
- actionName 必须与输入任务名称完全一致（原样复制）

## 输出（纯JSON，禁用markdown）
{"hourUpdates":[{"actionName":"原样任务名","hours":0,"difficulty":"easy/medium/hard","reasoning":"一句话理由"}]}`;
  };

  // ── Commander prompt: extracts tasks and splits into project buckets for parallel execution ──
  const buildCommanderPrompt = () => {
    // Include a lightweight project catalog so Commander can output exact projectId/projectName
    const catalog = projects.map(p => `  ${p.name} (id:${p.id})`).join("\n");
    return `你是任务提取总指挥，负责从用户输入中提取结构化任务并按所属项目分组，不做任何系统操作。

## 现有项目目录（名称和ID）
${catalog || "（暂无项目）"}

输出纯JSON（禁用markdown，禁止任何解释）：
{
  "condensed": "整体核心需求（≤80字）",
  "projectBuckets": [
    {
      "projectName": "与现有项目目录精确匹配的项目名称，或空字符串（新项目）",
      "projectId": "与现有项目目录精确匹配的项目ID，新项目填 __new__",
      "condensed": "该项目的核心需求（≤60字）",
      "tasks": [{"action":"任务描述","person":"负责人姓名或空","platform":"平台名或空","deadline":"截止日期或空","freq":"daily/weekly/monthly或空","isRecurring":false,"note":"备注或空"}]
    }
  ]
}
规则：
- 若所有任务属于同一项目，projectBuckets 只有一个元素
- 若涉及多个独立项目/品牌，每个项目单独一个bucket
- 新项目用 projectId: "__new__"，已有项目必须从上方目录中精确填写名称和ID`;
  };

  // ── Shared JSON cleaner ──
  const parseAIResponse = (raw) => {
    if (!raw.trim()) throw new Error("AI 返回了空响应，可能输入内容过长，请缩短后重试。");
    let cleaned = raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
    cleaned = cleaned.replace(/,\s*([}\]])/g,"$1").replace(/\/\/[^\n]*/g,"");
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) cleaned = m[0];
    try { return JSON.parse(cleaned); } catch(_) {
      try {
        const fixed = cleaned.replace(/'/g,'"').replace(/([{,]\s*)(\w+)\s*:/g,'$1"$2":').replace(/,\s*([}\]])/g,"$1");
        return JSON.parse(fixed);
      } catch(__) {
        if (!cleaned.trimEnd().endsWith("}")) {
          throw new Error("AI 响应内容过长被截断，操作未执行。请将指令拆分为更小批次（如每次最多5个任务）后重试。");
        }
        throw new Error("格式无法解析");
      }
    }
  };

  // ── Edge Function caller (uses module-level AI_ANON_KEY / AI_EDGE_URL / AI_CLIENT_TIMEOUT_MS) ──
  // Always uses ANON_KEY for authorization — the edge function does not validate user JWTs.
  // User login state is verified separately in callAI before this is called.
  const callEdgeFn = async (system, messages, provider, model, opts = {}) => {
    const body = {provider, model, system, messages, ...opts};
    let rawBody = "", resp;
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), AI_CLIENT_TIMEOUT_MS);
    try {
      resp = await fetch(AI_EDGE_URL, {
        method: "POST",
        headers: {"Content-Type":"application/json","Authorization":`Bearer ${AI_ANON_KEY}`},
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      rawBody = await resp.text();
    } catch(netErr) {
      if (netErr.name === "AbortError") throw new Error("AI服务超时（40秒），模型响应过慢，请稍后重试或切换更快的模型");
      throw new Error(`AI服务连接失败（网络错误）：${netErr.message}`);
    } finally {
      clearTimeout(abortTimer);
    }
    console.log(`[AI] HTTP ${resp.status}, len=${rawBody.length}`);
    let result;
    try { result = JSON.parse(rawBody); } catch(_) {
      throw new Error(`服务器返回了非预期内容 (HTTP ${resp.status}): ${rawBody.slice(0, 80)}`);
    }
    if (resp.status === 401 || resp.status === 403) {
      throw new Error(`AI服务返回错误（${resp.status}）：请检查 Supabase Secrets 中 API 密钥是否正确配置`);
    }
    const errMsg = result.error || (resp.status !== 200 ? (result.message || `HTTP ${resp.status}`) : null);
    if (errMsg) {
      if (errMsg.includes("未配置") || errMsg.includes("not set")) throw new Error(`API 密钥未配置：${errMsg}`);
      if (errMsg.includes("超时") || errMsg.includes("timed out")) throw new Error(`AI 响应超时：${errMsg}`);
      const prefix = resp.status !== 200 ? `AI服务返回错误（HTTP ${resp.status}）：` : "";
      throw new Error(`${prefix}${errMsg}`);
    }
    const text = result.text || "";
    if (!text.trim()) throw new Error(`AI 返回了空响应，请稍后重试或切换其他模型`);
    return text;
  };

  // ── Sanitize message field ──
  const sanitizeMsg = (msg) => {
    if (!msg) return "已解析完成";
    return msg.split("\n").filter(line=>{
      const t=line.trim();
      if(!t)return true;
      if(/^[{}\[\],\s]+$/.test(t))return false;
      if(/^[{\[]/.test(t))return false;
      if(/[{\[]$/.test(t))return false;
      if(/^"?\w+"?\s*:/.test(t))return false;
      if(/^[}\]],?\s*$/.test(t))return false;
      return true;
    }).join("\n").trim()||"已解析完成";
  };

  const callAI = async (userText) => {
    if(!userText.trim())return;
    // Cancel any pending auto-reset timer — user is starting a new interaction
    if (autoResetTimerRef.current) { clearTimeout(autoResetTimerRef.current); autoResetTimerRef.current = null; }
    const newUserMsg = {role:"user",content:userText};
    const updatedChat = [...chatMessages, newUserMsg];
    // ── Stage 1: auth — force an immediate render so the label is visible ──────
    flushSync(() => {
      setChatMessages(updatedChat);
      setInput(""); setLoading(true); setLoadingStage("auth");
    });

    // ── SAFETY NET ──────────────────────────────────────────────────────────
    const SAFETY_MS = 42000;
    let safetyFired = false;
    const safetyTimer = setTimeout(() => {
      safetyFired = true;
      setLoading(false); setLoadingStage("");
      setChatMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role !== "assistant") {
          return [...prev, {role:"assistant", content:"AI服务超时（42秒），请稍后重试，或在AI设置中切换更快的模型", isError:true}];
        }
        return prev;
      });
      console.warn("[AI] Safety timer fired — fetch did not resolve/reject in 42s");
    }, SAFETY_MS);
    // ────────────────────────────────────────────────────────────────────────

    try {
      const aiConfig = JSON.parse(localStorage.getItem("sm-ai-config")||'{}');
      const provider = aiConfig.provider||"gemini";
      const providerDef = AI_PROVIDERS.find(p=>p.v===provider);
      const validModels = providerDef?.models||[];
      const savedModel = aiConfig.model||"";
      const model = (validModels.length>0&&savedModel&&!validModels.includes(savedModel))?validModels[0]:savedModel;

      // Verify the user has an active session (capped at 5s to avoid hanging when
      // Supabase is slow). The edge function itself uses ANON_KEY — this check is
      // purely to confirm the user is logged in before dispatching the request.
      let isLoggedIn = false;
      try {
        const authResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("auth_timeout")), 5000)),
        ]);
        isLoggedIn = !!authResult?.data?.session?.access_token;
      } catch (authErr) {
        throw new Error(authErr.message === "auth_timeout"
          ? "__auth__:身份验证超时（5秒），请刷新页面后重试"
          : "__auth__:身份验证失败，请重新登录后再使用AI助手");
      }
      if (!isLoggedIn) throw new Error("__auth__:请先登录后再使用AI助手");

      // ── Stage 2: sending — brief preflight, force render ──────────────────────
      flushSync(() => setLoadingStage("sending"));

      // Trim history: last 8 messages (4 rounds), send clean text for assistant messages
      const trimmedChat = updatedChat.slice(-8);
      const historyMessages = trimmedChat.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.role === "assistant" ? (m.parsed?.message || m.content) : m.content,
      }));

      // Only use lean (L1+L2) prompt when Commander will actually execute server-side.
      const useAgent = agentMode && !isFollowUpRef.current;
      const COMMANDER_THRESHOLD = 400;
      const willUseCommander = useAgent && userText.length > COMMANDER_THRESHOLD;
      const callOpts = useAgent
        ? {agentMode:true, commanderSystem:buildCommanderPrompt(), projectsData:projects, ...(hoursAnalyst ? {hoursAnalystSystem:buildHoursAnalystPrompt()} : {})}
        : {};

      // ── Stage 3: agent/architect — force render BEFORE the fetch so this label is
      //    visible for the entire network wait ("request dispatched, AI processing") ──
      flushSync(() => setLoadingStage(useAgent ? "agent" : "architect"));

      // ── Fetch — user sees "⚙️ AI已接收，正在处理..." or "📋 总指挥协调中..." ──────
      // Auto-retry once on transient failures (network errors, timeouts, empty responses).
      // Config errors (API key not set, auth) are not retried.
      // Only retry on clearly transient failures — not on config/business/auth errors.
      const isRetryable = (err) => {
        const m = err.message;
        return m.includes("网络错误") || m.includes("空响应") ||
               m.includes("超时") || m.includes("AI服务超时") ||
               m.includes("Failed to fetch") || m.includes("NetworkError") ||
               err.name === "AbortError";
      };
      let raw;
      try {
        raw = await callEdgeFn(buildSystemPrompt(!willUseCommander), historyMessages, provider, model, callOpts);
      } catch (firstErr) {
        if (isRetryable(firstErr)) {
          console.warn("[AI] First attempt failed, retrying in 1.5s:", firstErr.message);
          await new Promise(r => setTimeout(r, 1500));
          raw = await callEdgeFn(buildSystemPrompt(!willUseCommander), historyMessages, provider, model, callOpts);
        } else {
          throw firstErr;
        }
      }

      if (safetyFired) return;

      // ── Brief "analyst" stage display ── (server ran analyst inside the fetch;
      //    show the label for 600ms so the user sees the stage before we finalize)
      if (useAgent && hoursAnalyst) {
        flushSync(() => setLoadingStage("analyst"));
        await new Promise(r => setTimeout(r, 600));
      }
      if (safetyFired) return;

      let parsed;
      try {
        parsed = parseAIResponse(raw);
      } catch(e2) {
        console.error("AI parse failed:", raw.slice(0, 300));
        setChatMessages([...updatedChat, {
          role:"assistant",
          content:`AI 返回的内容格式无法解析，请重试，或将指令拆分成更小批次`,
          isError:true,
        }]);
        return;
      }

      const assistantMsg = {
        role: "assistant",
        content: sanitizeMsg(parsed.message),
        parsed,
        hasOps: (parsed.operations||[]).length > 0,
        hasMilestones: (parsed.milestones||[]).length > 0,
        hasRisks: (parsed.risks||[]).length > 0,
        needsMoreInfo: parsed.needsMoreInfo,
        questions: parsed.questions||[],
      };
      setChatMessages([...updatedChat, assistantMsg]);
      isFollowUpRef.current = !!parsed.needsMoreInfo;
      if(assistantMsg.hasOps && !parsed.needsMoreInfo) setPendingOps(parsed);

    } catch(e) {
      if (!safetyFired) {
        console.error("AI Error:", e.message);
        isFollowUpRef.current = false;
        // Produce a user-friendly message based on error type.
        // Config/Secrets errors are checked before HTTP status codes so they
        // are not accidentally re-labelled as user auth failures.
        let userMsg = e.message;
        if (userMsg.startsWith("__auth__:")) {
          userMsg = userMsg.slice(9);
        } else if (userMsg.includes("Supabase Secrets") || userMsg.includes("API 密钥未配置")) {
          // Keep the descriptive config message as-is
        } else if (userMsg.includes("超时") || userMsg.includes("timeout") || userMsg.includes("AbortError")) {
          userMsg = "AI服务超时，请稍后重试，或在AI设置中切换更快的模型";
        } else if (userMsg.includes("Failed to fetch") || userMsg.includes("NetworkError") || userMsg.includes("网络错误")) {
          userMsg = `AI服务连接失败（网络错误），请稍后重试`;
        } else if (/\b[45]\d{2}\b/.test(userMsg)) {
          userMsg = `AI服务返回错误：${e.message}`;
        }
        setChatMessages([...updatedChat, {role:"assistant", content: userMsg, isError:true}]);
      }
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false); setLoadingStage("");
      setTimeout(()=>inputRef.current?.focus(), 100);
    }
  };

  const applyOperations = (parsed) => {
    let newProjects = [...projects.map(p=>({...p,milestones:[...(p.milestones||[])],categories:(p.categories||[]).map(c=>({...c,resources:(c.resources||[]).map(r=>({...r,actions:[...(r.actions||[])]}))}))}))];
    let newRisks = [...(data.risks||[])];
    const opNames = [];

    (parsed.operations||[]).forEach(op => {
      if (op.type === "add_project" && op.project) {
        opNames.push(op.project.name);
        const newProj = {
          id: uid(), ...op.project, priority: op.project.priority ?? newProjects.length,
          color: op.project.color || PROJECT_COLORS[newProjects.length % PROJECT_COLORS.length],
          milestones: [],
          categories: (op.categories||[]).map(c => ({
            id: uid(), ...c,
            resources: (c.resources||[]).map(r => ({
              id: uid(), ...r,
              actions: (r.actions||[]).map(a => ({id:uid(),progress:0,dependsOn:[],attachments:[],...a}))
            }))
          }))
        };
        // Attach milestones to new project
        (parsed.milestones||[]).filter(m=>m.projectId==="__new__").forEach(m=>{
          newProj.milestones.push({id:uid(),name:m.name,date:m.date||"",status:0});
        });
        newProjects.push(newProj);
        // Attach risks
        (parsed.risks||[]).filter(r=>r.projectId==="__new__").forEach(r=>{
          newRisks.push({id:uid(),projectId:newProj.id,name:r.name,impact:r.impact||2,probability:r.probability||2,status:"open",owner:user.id,mitigation:"",note:""});
        });
      }
      if (op.type === "add_action" && op.action) {
        opNames.push(op.action.name);
        newProjects = newProjects.map(p => {
          if (p.id !== op.projectId) return p;
          return {...p, categories: (p.categories||[]).map(c => {
            if (c.id !== op.categoryId) return c;
            return {...c, resources: (c.resources||[]).map(r => {
              if (r.id !== op.resourceId) return r;
              return {...r, actions: [...(r.actions||[]), {id:uid(),progress:0,dependsOn:[],attachments:[],...op.action}]};
            })};
          })};
        });
      }
      if (op.type === "add_resource" && op.resource) {
        opNames.push(op.resource.name);
        const newRes = {id:uid(),...op.resource,actions:(op.actions||[]).map(a=>({id:uid(),progress:0,dependsOn:[],attachments:[],...a}))};
        newProjects = newProjects.map(p => {
          if (p.id !== op.projectId) return p;
          return {...p, categories: (p.categories||[]).map(c => {
            if (c.id !== op.categoryId) return c;
            return {...c, resources: [...(c.resources||[]), newRes]};
          })};
        });
      }
      if (op.type === "add_category" && op.category) {
        opNames.push(op.category.name);
        const newCat = {id:uid(),...op.category, resources:(op.resources||[]).map(r=>({id:uid(),...r,actions:(r.actions||[]).map(a=>({id:uid(),progress:0,dependsOn:[],attachments:[],...a}))}))};
        newProjects = newProjects.map(p => {
          if (p.id !== op.projectId) return p;
          return {...p, categories: [...(p.categories||[]), newCat]};
        });
      }
      if (op.type === "delete_action" && op.actionId) {
        opNames.push(`删除: ${op.actionName||op.actionId}`);
        newProjects = newProjects.map(p => {
          if (p.id !== op.projectId) return p;
          return {...p, categories: (p.categories||[]).map(c => {
            if (c.id !== op.categoryId) return c;
            return {...c, resources: (c.resources||[]).map(r => {
              if (r.id !== op.resourceId) return r;
              return {...r, actions: (r.actions||[]).filter(a => a.id !== op.actionId)};
            })};
          })};
        });
      }
      if (op.type === "delete_resource" && op.resourceId) {
        opNames.push(`删除资源: ${op.resourceName||op.resourceId}`);
        newProjects = newProjects.map(p => {
          if (p.id !== op.projectId) return p;
          return {...p, categories: (p.categories||[]).map(c => {
            if (c.id !== op.categoryId) return c;
            return {...c, resources: (c.resources||[]).filter(r => r.id !== op.resourceId)};
          })};
        });
      }
      if (op.type === "delete_project" && op.projectId) {
        opNames.push(`删除项目: ${op.projectName||op.projectId}`);
        newProjects = newProjects.filter(p => p.id !== op.projectId);
        newRisks = newRisks.filter(r => r.projectId !== op.projectId);
      }
      if (op.type === "update_action" && op.actionId && op.updates) {
        opNames.push(`修改: ${op.actionName||op.actionId}`);
        newProjects = newProjects.map(p => {
          if (p.id !== op.projectId) return p;
          return {...p, categories: (p.categories||[]).map(c => {
            if (c.id !== op.categoryId) return c;
            return {...c, resources: (c.resources||[]).map(r => {
              if (r.id !== op.resourceId) return r;
              return {...r, actions: (r.actions||[]).map(a => {
                if (a.id !== op.actionId) return a;
                return {...a, ...op.updates};
              })};
            })};
          })};
        });
      }
    });

    // Apply milestones to existing projects
    (parsed.milestones||[]).filter(m=>m.projectId!=="__new__").forEach(m=>{
      newProjects = newProjects.map(p=>{
        if(p.id!==m.projectId)return p;
        return {...p, milestones:[...(p.milestones||[]),{id:uid(),name:m.name,date:m.date||"",status:0}]};
      });
    });

    // Apply risks to existing projects
    (parsed.risks||[]).filter(r=>r.projectId!=="__new__").forEach(r=>{
      newRisks.push({id:uid(),projectId:r.projectId,name:r.name,impact:r.impact||2,probability:r.probability||2,status:"open",owner:user.id,mitigation:"",note:""});
    });

    save({...data, projects: newProjects, risks: newRisks});
    if (auditLog && user) {
      const hasDelete = (parsed.operations||[]).some(o=>o.type?.startsWith("delete"));
      const hasUpdate = (parsed.operations||[]).some(o=>o.type==="update_action");
      const action = hasDelete ? "ai_delete" : hasUpdate ? "ai_update" : "ai_create";
      auditLog.addLog(user.id, user.name, action, "任务", opNames.join(", "), { count: parsed.operations?.length });
    }
  };

  const confirmOps = () => {
    if(!pendingOps)return;
    applyOperations(pendingOps);
    setChatMessages(prev=>[...prev,{role:"assistant",content:"已成功同步到系统！即将开启新对话…",isSuccess:true}]);
    setPendingOps(null);
    // Auto-start a fresh conversation 1.5s after confirming — store timer so it can be cancelled
    if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    autoResetTimerRef.current = setTimeout(() => { autoResetTimerRef.current = null; resetChat(); }, 1500);
  };

  const removeOp = (idx) => {
    if(!pendingOps)return;
    setPendingOps({...pendingOps, operations:pendingOps.operations.filter((_,i)=>i!==idx)});
  };

  const saveCurrentToHistory = () => {
    if (chatMessages.length === 0) return;
    const firstUser = chatMessages.find(m => m.role === "user");
    const title = firstUser ? firstUser.content.slice(0, 40) : "对话";
    const entry = { id: uid(), title, time: new Date().toISOString(), messages: chatMessages, count: chatMessages.length };
    setChatHistory(prev => [entry, ...prev].slice(0, 30));
  };
  const resetChat = () => {
    if (autoResetTimerRef.current) { clearTimeout(autoResetTimerRef.current); autoResetTimerRef.current = null; }
    saveCurrentToHistory(); setChatMessages([]); setPendingOps(null); setInput(""); isFollowUpRef.current=false;
  };
  const loadHistory = (entry) => { saveCurrentToHistory(); setChatMessages(entry.messages||[]); setPendingOps(null); setShowHistory(false); };
  const deleteHistory = (id, e) => { e.stopPropagation(); setChatHistory(prev => prev.filter(h => h.id !== id)); };
  const clearAllHistory = () => { setChatHistory([]); };

  const OpCard = ({op,idx}) => {
    if(op.type==="add_project"){const p=op.project||{};
      return<div style={{padding:"10px 14px",background:T.borderLight,borderRadius:T.radiusSm,borderLeft:`3px solid ${T.accent}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Settings size={14} color={T.accent}/><span style={{fontSize:13,fontWeight:700,color:T.text1}}>新项目: {p.name}</span>
          {p.isKey&&<Badge color={T.accent} small>重点</Badge>}
          <div style={{flex:1}}/><button onClick={()=>removeOp(idx)} style={{background:"none",border:"none",color:T.danger,cursor:"pointer",padding:4}}><X size={12}/></button>
        </div>
        {(op.categories||[]).map((c,ci)=><div key={ci} style={{marginTop:6,paddingLeft:16}}>
          <div style={{fontSize:11,fontWeight:600,color:CAT_COLORS[c.cat]||T.text2,display:"flex",alignItems:"center",gap:4}}><Badge color={CAT_COLORS[c.cat]||T.text3} small>{c.cat}</Badge> {c.name}</div>
          {(c.resources||[]).map((r,ri)=><div key={ri} style={{paddingLeft:16,marginTop:2}}>
            <div style={{fontSize:11,color:T.text2,display:"flex",alignItems:"center",gap:4}}><Smartphone size={10}/>{r.name}{r.platform&&` (${r.platform})`}</div>
            {(r.actions||[]).map((a,ai)=><div key={ai} style={{fontSize:10,color:T.text3,paddingLeft:16,display:"flex",alignItems:"center",gap:4}}>
              {a.aType==="recurring"?<RefreshCw size={9}/>:<Target size={9}/>}{a.name}{a.staffId?` · ${getStaffName(a.staffId)}`:""}
            </div>)}
          </div>)}
        </div>)}
      </div>;
    }
    if(op.type==="add_action"){const a=op.action||{};
      return<div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:T.borderLight,borderRadius:T.radiusSm,borderLeft:`3px solid ${a.aType==="recurring"?T.teal:T.warning}`}}>
        {a.aType==="recurring"?<RefreshCw size={14} color={T.teal}/>:<Target size={14} color={T.warning}/>}
        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.text1}}>{a.name||"未命名"}</div>
          <div style={{fontSize:11,color:T.text3}}>{getProjectName(op.projectId)}{a.staffId?` · ${getStaffName(a.staffId)}`:""}{a.hours?` · ${a.hours}h`:""}{a.count?` · ${a.count}`:""}{a.deadline?` · 截止${a.deadline}`:""}</div>
        </div>
        <Badge color={a.aType==="recurring"?T.teal:T.warning} small>{a.aType==="recurring"?"周期":"一次"}</Badge>
        <button onClick={()=>removeOp(idx)} style={{background:"none",border:"none",color:T.danger,cursor:"pointer",padding:4}}><X size={12}/></button>
      </div>;
    }
    if(op.type==="add_resource"){const r=op.resource||{};
      return<div style={{padding:"10px 14px",background:T.borderLight,borderRadius:T.radiusSm,borderLeft:`3px solid ${T.teal}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><Smartphone size={14} color={T.teal}/><span style={{fontSize:13,fontWeight:600,color:T.text1}}>新资源: {r.name}</span><span style={{fontSize:11,color:T.text3}}>{getProjectName(op.projectId)}</span><div style={{flex:1}}/><button onClick={()=>removeOp(idx)} style={{background:"none",border:"none",color:T.danger,cursor:"pointer",padding:4}}><X size={12}/></button></div>
        {(op.actions||[]).map((a,ai)=><div key={ai} style={{fontSize:11,color:T.text2,paddingLeft:22,display:"flex",alignItems:"center",gap:4,marginTop:2}}>{a.aType==="recurring"?<RefreshCw size={9}/>:<Target size={9}/>} {a.name}{a.staffId?` · ${getStaffName(a.staffId)}`:""}</div>)}
      </div>;
    }
    if(op.type==="add_category"){const c=op.category||{};
      return<div style={{padding:"10px 14px",background:T.borderLight,borderRadius:T.radiusSm,borderLeft:`3px solid ${CAT_COLORS[c.cat]||T.text3}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><ListTodo size={14} color={CAT_COLORS[c.cat]||T.text3}/><span style={{fontSize:13,fontWeight:600,color:T.text1}}>新类别: {c.name}</span><Badge color={CAT_COLORS[c.cat]||T.text3} small>{c.cat}</Badge><div style={{flex:1}}/><button onClick={()=>removeOp(idx)} style={{background:"none",border:"none",color:T.danger,cursor:"pointer",padding:4}}><X size={12}/></button></div>
      </div>;
    }
    if(op.type==="delete_action"||op.type==="delete_resource"||op.type==="delete_project"){
      const name=op.actionName||op.resourceName||op.projectName||"未知";
      const label=op.type==="delete_project"?"删除项目":op.type==="delete_resource"?"删除资源":"删除动作";
      return<div style={{padding:"10px 14px",background:"#FEF2F2",borderRadius:T.radiusSm,borderLeft:`3px solid ${T.danger}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><Trash2 size={14} color={T.danger}/><span style={{fontSize:13,fontWeight:600,color:T.danger}}>{label}: {name}</span>
          {op.type==="delete_project"&&<Badge color={T.danger} small>⚠ 不可撤销</Badge>}
          <div style={{flex:1}}/><button onClick={()=>removeOp(idx)} style={{background:"none",border:"none",color:T.text3,cursor:"pointer",padding:4}}><X size={12}/></button>
        </div>
      </div>;
    }
    if(op.type==="update_action"){
      const fields=Object.entries(op.updates||{}).map(([k,v])=>`${k}→${v}`).join(", ");
      return<div style={{padding:"10px 14px",background:"#FFF8EC",borderRadius:T.radiusSm,borderLeft:`3px solid ${T.warning}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><Pencil size={14} color={T.warning}/><span style={{fontSize:13,fontWeight:600,color:T.text1}}>修改: {op.actionName||op.actionId}</span>
          <div style={{flex:1}}/><button onClick={()=>removeOp(idx)} style={{background:"none",border:"none",color:T.danger,cursor:"pointer",padding:4}}><X size={12}/></button>
        </div>
        <div style={{fontSize:11,color:T.text2,marginTop:4,paddingLeft:22}}>{fields}</div>
      </div>;
    }
    return null;
  };

  return <Card style={{padding:0,marginBottom:24,border:`1px solid ${T.border}`,overflow:"hidden"}}>
    {/* Header */}
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"18px 24px",borderBottom:`1px solid ${T.borderLight}`}}>
      <div style={{width:36,height:36,borderRadius:10,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}><Bot size={20}/></div>
      <div style={{flex:1}}>
        <h3 style={{margin:0,fontSize:16,fontWeight:700,color:T.text1}}>AI 项目助手</h3>
        <p style={{margin:0,fontSize:12,color:T.text3}}>多轮对话 · 自动创建项目和任务 · 里程碑/风险联动</p>
      </div>
      {chatMessages.length>0&&<Btn small v="secondary" onClick={resetChat}><RefreshCw size={12}/> 新对话</Btn>}
      <div style={{position:"relative"}}>
        <button onClick={()=>setShowHistory(!showHistory)} style={{background:"none",border:"none",cursor:"pointer",color:T.text3,padding:6,borderRadius:6,display:"flex",alignItems:"center",position:"relative",transition:T.transition}} onMouseEnter={e=>e.currentTarget.style.background=T.borderLight} onMouseLeave={e=>e.currentTarget.style.background="none"}>
          <History size={16}/>
          {chatHistory.length>0&&<span style={{position:"absolute",top:-2,right:-2,background:T.accent,color:"#fff",fontSize:8,fontWeight:700,borderRadius:8,padding:"1px 4px",minWidth:14,textAlign:"center"}}>{chatHistory.length}</span>}
        </button>
        {showHistory&&<div style={{position:"absolute",right:0,top:"100%",marginTop:4,width:280,maxHeight:320,overflowY:"auto",background:T.card,borderRadius:T.radius,border:`1px solid ${T.border}`,boxShadow:T.shadowMd,zIndex:20,padding:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 8px",marginBottom:4}}>
            <span style={{fontSize:12,fontWeight:700,color:T.text1}}>历史对话</span>
            {chatHistory.length>0&&<button onClick={clearAllHistory} style={{fontSize:10,color:T.danger,background:"none",border:"none",cursor:"pointer"}}>清空全部</button>}
          </div>
          {chatHistory.length===0&&<div style={{padding:20,textAlign:"center",color:T.text3,fontSize:12}}>暂无历史</div>}
          {chatHistory.map(h=><div key={h.id} onClick={()=>loadHistory(h)} style={{padding:"8px 10px",borderRadius:T.radiusSm,cursor:"pointer",transition:T.transition,display:"flex",alignItems:"center",gap:8}} onMouseEnter={e=>e.currentTarget.style.background=T.borderLight} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:T.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.title}</div>
              <div style={{fontSize:10,color:T.text3}}>{new Date(h.time).toLocaleString("zh-CN",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})} · {h.count}条</div>
            </div>
            <button onClick={(e)=>deleteHistory(h.id,e)} style={{background:"none",border:"none",color:T.text3,cursor:"pointer",padding:2,flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.color=T.danger} onMouseLeave={e=>e.currentTarget.style.color=T.text3}><X size={12}/></button>
          </div>)}
        </div>}
      </div>
      <button
        onClick={()=>{ setAgentMode(v=>!v); isFollowUpRef.current=false; }}
        title={agentMode?"当前：Agent工作流模式（点击切换为直接模式）":"当前：直接模式（点击切换为Agent工作流）"}
        style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,border:`1.5px solid ${agentMode?T.accent:T.border}`,background:agentMode?T.accentLight:"transparent",color:agentMode?T.accent:T.text3,fontSize:11,fontWeight:600,cursor:"pointer",transition:T.transition,whiteSpace:"nowrap"}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=agentMode?T.accent:T.border;e.currentTarget.style.color=agentMode?T.accent:T.text3;}}
      >
        <span style={{width:6,height:6,borderRadius:"50%",background:agentMode?T.accent:T.text3,display:"inline-block"}}/>
        {agentMode?"Agent模式":"直接模式"}
      </button>
      {agentMode&&<button
        onClick={()=>setHoursAnalyst(v=>!v)}
        title={hoursAnalyst?"工时分析者已开启（AI自动估算每个任务工时，点击关闭）":"工时分析者已关闭（点击开启，AI将自动估算任务工时）"}
        style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,border:`1.5px solid ${hoursAnalyst?"#F59E0B":T.border}`,background:hoursAnalyst?"#FFFBEB":"transparent",color:hoursAnalyst?"#D97706":T.text3,fontSize:11,fontWeight:600,cursor:"pointer",transition:T.transition,whiteSpace:"nowrap"}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor="#F59E0B";e.currentTarget.style.color="#D97706";}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=hoursAnalyst?"#F59E0B":T.border;e.currentTarget.style.color=hoursAnalyst?"#D97706":T.text3;}}
      >
        <span style={{fontSize:12}}>⏱️</span>
        {hoursAnalyst?"工时分析":"工时分析"}
        <span style={{width:6,height:6,borderRadius:"50%",background:hoursAnalyst?"#D97706":T.text3,display:"inline-block"}}/>
      </button>}
      {agentMode&&<button
        onClick={handleBulkHours}
        disabled={zeroHoursActions.length===0||bulkHoursState==="loading"}
        title={zeroHoursActions.length===0?"所有任务已有工时记录":`批量填补 ${Math.min(zeroHoursActions.length,30)} 条工时为0的任务${zeroHoursActions.length>30?`（共${zeroHoursActions.length}条，本次前30条）`:""}`}
        style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,border:`1.5px solid ${zeroHoursActions.length===0?T.borderLight:"#10B981"}`,background:zeroHoursActions.length===0?T.borderLight:"#ECFDF5",color:zeroHoursActions.length===0?T.text3:"#059669",fontSize:11,fontWeight:600,cursor:zeroHoursActions.length===0?"default":"pointer",transition:T.transition,whiteSpace:"nowrap",opacity:bulkHoursState==="loading"?0.7:1}}
      >
        {bulkHoursState==="loading"?<Loader2 size={10} style={{animation:"spin 1s linear infinite"}}/>:<span style={{fontSize:11}}>📥</span>}
        {bulkHoursState==="loading"?"分析中…":"批量填补"}
        {zeroHoursActions.length>0&&bulkHoursState!=="loading"&&<span style={{background:"#059669",color:"#fff",borderRadius:8,fontSize:9,fontWeight:700,padding:"1px 5px",marginLeft:1}}>{Math.min(zeroHoursActions.length,30)}</span>}
      </button>}
      <Btn small v="ghost" onClick={()=>setShowAIConfig(true)} style={{color:T.text3}}><Settings size={14}/></Btn>
    </div>

    <AIConfigPanel open={showAIConfig} onClose={()=>setShowAIConfig(false)} hoursAnalyst={hoursAnalyst} setHoursAnalyst={setHoursAnalyst} />

    {/* Bulk hours preview panel */}
    {bulkHoursState&&bulkHoursState!=="loading"&&<div style={{margin:"0 16px 0",borderRadius:T.radiusSm,border:`1.5px solid #10B981`,background:"#F0FDF4",padding:"12px 16px",animation:"fadeIn 0.2s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <span style={{fontSize:13}}>📥</span>
        <span style={{fontSize:13,fontWeight:700,color:"#065F46",flex:1}}>{bulkHoursState.message}</span>
        <button onClick={()=>setBulkHoursState(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.text3,padding:2,display:"flex"}}><X size={14}/></button>
      </div>
      {bulkHoursState.ops.length===0&&<div style={{fontSize:12,color:T.text2,textAlign:"center",padding:"8px 0"}}>没有可填入的工时数据，请重试</div>}
      {bulkHoursState.ops.length>0&&<>
        <div style={{maxHeight:200,overflowY:"auto",marginBottom:10,borderRadius:6,border:`1px solid #A7F3D0`,background:"#fff"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#ECFDF5"}}>
                <th style={{padding:"6px 10px",textAlign:"left",color:"#065F46",fontWeight:600,borderBottom:`1px solid #A7F3D0`}}>任务名称</th>
                <th style={{padding:"6px 10px",textAlign:"left",color:"#065F46",fontWeight:600,borderBottom:`1px solid #A7F3D0`}}>所属项目</th>
                <th style={{padding:"6px 8px",textAlign:"center",color:"#065F46",fontWeight:600,borderBottom:`1px solid #A7F3D0`,whiteSpace:"nowrap"}}>估算工时</th>
              </tr>
            </thead>
            <tbody>
              {bulkHoursState.ops.map((op,i)=>{
                const proj = projects.find(p=>p.id===op.projectId);
                return <tr key={i} style={{borderBottom:i<bulkHoursState.ops.length-1?`1px solid #D1FAE5`:"none"}}>
                  <td style={{padding:"5px 10px",color:T.text1}}>{op.actionName}</td>
                  <td style={{padding:"5px 10px",color:T.text2,fontSize:11}}>{proj?.name||op.projectId}</td>
                  <td style={{padding:"5px 8px",textAlign:"center",fontWeight:700,color:"#059669"}}>{op.updates?.hours}h</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn small v="secondary" onClick={()=>setBulkHoursState(null)}>取消</Btn>
          <Btn small onClick={applyBulkHours} style={{background:"#059669",borderColor:"#059669"}}>全部应用 ({bulkHoursState.ops.length}条)</Btn>
        </div>
      </>}
    </div>}
    {zeroHoursActions.length>30&&bulkHoursState===null&&agentMode&&<div style={{margin:"8px 16px 0",padding:"6px 12px",borderRadius:T.radiusSm,background:"#FFFBEB",border:`1px solid #FCD34D`,fontSize:11,color:"#92400E"}}>
      ⚠️ 共 {zeroHoursActions.length} 条任务工时为0，点击「批量填补」每次分析前30条，可多次点击分批处理
    </div>}

    {/* Chat area */}
    <div ref={chatContainerRef} style={{maxHeight:480,overflowY:"auto",padding:"16px 24px"}}>
      {chatMessages.length===0&&<div style={{textAlign:"center",padding:"30px 0",color:T.text3}}>
        <Bot size={32} strokeWidth={1.5} style={{marginBottom:8,color:T.border}}/>
        <div style={{fontSize:13,marginBottom:12}}>告诉我你的需求，我来帮你创建项目和任务</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
          {["新建一个品牌的运营项目","给度假村加个小红书号","把这段会议记录拆成任务"].map(s=>
            <button key={s} onClick={()=>setInput(s)} style={{padding:"6px 14px",borderRadius:20,fontSize:12,border:`1.5px solid ${T.border}`,background:T.card,color:T.text2,cursor:"pointer",transition:T.transition}}
              onMouseEnter={e=>{e.target.style.borderColor=T.accent;e.target.style.color=T.accent;}} onMouseLeave={e=>{e.target.style.borderColor=T.border;e.target.style.color=T.text2;}}>{s}</button>
          )}
        </div>
      </div>}

      {chatMessages.map((msg,i)=><div key={i} style={{marginBottom:14,animation:"fadeIn 0.2s ease"}}>
        {msg.role==="user"?
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <div style={{maxWidth:"80%",padding:"10px 16px",borderRadius:"16px 16px 4px 16px",background:T.accent,color:"#fff",fontSize:13,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{msg.content}</div>
          </div>:
          <div style={{display:"flex",gap:10}}>
            <div style={{width:28,height:28,borderRadius:8,background:msg.isError?T.danger+"14":msg.isSuccess?"#F0FDF4":T.accentLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
              {msg.isError?<AlertCircle size={14} color={T.danger}/>:msg.isSuccess?<CheckCircle2 size={14} color={T.success}/>:<Bot size={14} color={T.accent}/>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,color:msg.isError?T.danger:T.text1,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{msg.content}</div>

              {/* Follow-up questions */}
              {msg.questions&&msg.questions.length>0&&<div style={{marginTop:10,padding:"12px 16px",background:"#FFF8EC",borderRadius:T.radiusSm,border:`1px solid ${T.warning}30`}}>
                <div style={{fontSize:11,fontWeight:700,color:T.warning,marginBottom:6,display:"flex",alignItems:"center",gap:4}}><AlertCircle size={12}/> 需要补充以下信息：</div>
                {msg.questions.map((q,qi)=><div key={qi} style={{fontSize:12,color:T.text1,padding:"3px 0",display:"flex",gap:6}}>
                  <span style={{color:T.warning,fontWeight:700}}>{qi+1}.</span>{q}
                </div>)}
              </div>}

              {/* Milestones preview */}
              {msg.parsed?.milestones?.length>0&&<div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:4}}>
                {msg.parsed.milestones.map((m,mi)=><Badge key={mi} color={T.purple} small><Milestone size={9} style={{marginRight:3}}/>{m.name}{m.date?` · ${m.date}`:""}</Badge>)}
              </div>}

              {/* Risks preview */}
              {msg.parsed?.risks?.length>0&&<div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:4}}>
                {msg.parsed.risks.map((r,ri)=><Badge key={ri} color={T.danger} small><AlertOctagon size={9} style={{marginRight:3}}/>{r.name}</Badge>)}
              </div>}
            </div>
          </div>
        }
      </div>)}

      {loading&&<div style={{display:"flex",gap:10,marginBottom:14}}>
        <div style={{width:28,height:28,borderRadius:8,background:T.accentLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <Loader2 size={14} color={T.accent} style={{animation:"spin 1s linear infinite"}}/>
        </div>
        <div style={{padding:"10px 16px",background:T.borderLight,borderRadius:"4px 16px 16px 16px",fontSize:13,color:T.text3}}>
          <span>
            {loadingStage==="auth"     ? "🔐 正在验证身份..."
            :loadingStage==="sending"  ? "📡 正在连接AI服务..."
            :loadingStage==="agent"    ? "📋 总指挥协调中，AI处理中..."
            :loadingStage==="architect"? "⚙️ AI已接收，正在处理..."
            :loadingStage==="analyst"  ? "⏱️ 工时分析者正在评估..."
            :                           "AI 分析中"}
          </span>
          <span style={{marginLeft:6,opacity:0.6,fontVariantNumeric:"tabular-nums"}}>({loadingElapsed}s)</span>
        </div>
      </div>}

      <div ref={chatEndRef}/>
    </div>

    {/* Pending operations panel */}
    {pendingOps&&(pendingOps.operations||[]).length>0&&<div style={{padding:"16px 24px",borderTop:`1px solid ${T.borderLight}`,background:"#FAFBFF"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <h4 style={{margin:0,fontSize:14,fontWeight:700,color:T.text1,display:"flex",alignItems:"center",gap:6}}><ClipboardList size={16}/> 待确认操作</h4>
        <div style={{display:"flex",gap:8}}>
          <Btn small v="secondary" onClick={()=>setPendingOps(null)}>取消</Btn>
          <Btn small v="success" onClick={confirmOps}><Check size={12}/> 确认同步 ({pendingOps.operations.length}项{pendingOps.milestones?.length?` + ${pendingOps.milestones.length}里程碑`:""}{pendingOps.risks?.length?` + ${pendingOps.risks.length}风险`:""})</Btn>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:200,overflowY:"auto"}}>
        {pendingOps.operations.map((op,idx)=><OpCard key={idx} op={op} idx={idx}/>)}
      </div>
    </div>}

    {/* Input area */}
    <div style={{padding:"12px 24px 16px",borderTop:`1px solid ${T.borderLight}`,background:T.card}}>
      <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
        <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
          placeholder={chatMessages.length>0?"回复AI的追问，或继续补充信息...":"描述你的需求：新建项目、添加任务、粘贴会议纪要..."}
          rows={input.includes("\n")||input.length>80?3:1}
          style={{flex:1,padding:"10px 14px",borderRadius:T.radius,border:`1.5px solid ${T.border}`,fontSize:13,outline:"none",fontFamily:T.font,resize:"none",boxSizing:"border-box",background:T.card,color:T.text1,lineHeight:1.5,transition:T.transition}}
          onFocus={e=>{e.target.style.borderColor=T.accent;e.target.style.boxShadow=`0 0 0 3px ${T.accent}20`;}}
          onBlur={e=>{e.target.style.borderColor=T.border;e.target.style.boxShadow="none";}}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing&&!e.nativeEvent?.isComposing){e.preventDefault();callAI(input);}}}
        />
        <Btn onClick={()=>callAI(input)} disabled={!input.trim()||loading} style={{height:40,padding:"0 18px"}}>
          {loading?<Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/>:<Send size={16}/>}
        </Btn>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
        <span style={{fontSize:10,color:T.text3}}>Enter 发送 · Shift+Enter 换行</span>
        <span style={{fontSize:10,color:T.text3}}>{agentMode?"Agent工作流：总指挥→架构师 · 会议纪要友好":"直接模式 · AI 会主动追问缺失信息"}</span>
      </div>
    </div>
  </Card>;
}

// ═══════════════════════════════════════════
// ─── AUDIT LOG VIEW ──────────────────────
// ═══════════════════════════════════════════
function AuditLogView({ auditLog, staff }) {
  const { logs, fetchLogs, loading } = auditLog;
  const [filter, setFilter] = useState("all");

  useEffect(() => { fetchLogs(200); }, [fetchLogs]);

  const actionLabels = {
    create: "创建", update: "更新", delete: "删除", status_change: "状态变更",
    ai_create: "AI创建", ai_delete: "AI删除", ai_update: "AI修改", sync: "同步", check_in: "打卡", uncheck: "取消打卡",
  };
  const actionColors = {
    create: T.success, update: T.accent, delete: T.danger, status_change: T.warning,
    ai_create: T.purple, ai_delete: T.danger, ai_update: T.warning, sync: T.teal, check_in: T.success, uncheck: T.text3,
  };
  const actionIcons = {
    create: Plus, update: Pencil, delete: Trash2, status_change: RefreshCw,
    ai_create: Bot, ai_delete: Bot, ai_update: Bot, sync: RefreshCw, check_in: CalendarCheck, uncheck: X,
  };

  const filtered = filter === "all" ? logs : logs.filter(l => l.action === filter);

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return "刚刚";
    if (diff < 3600) return `${Math.floor(diff/60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff/3600)}小时前`;
    if (diff < 172800) return "昨天 " + d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) + " " + d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  };

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.text1, display: "flex", alignItems: "center", gap: 8 }}><History size={22} /> 操作审计</h2>
      <div style={{ display: "flex", gap: 6 }}>
        <Btn small v={filter === "all" ? "primary" : "secondary"} onClick={() => setFilter("all")}>全部</Btn>
        {Object.entries(actionLabels).map(([k, l]) => (
          <Btn key={k} small v={filter === k ? "primary" : "secondary"} onClick={() => setFilter(k)}>{l}</Btn>
        ))}
        <Btn small v="ghost" onClick={() => fetchLogs(200)}><RefreshCw size={12} /></Btn>
      </div>
    </div>

    {loading ? (
      <div style={{ textAlign: "center", padding: 40, color: T.text3 }}>
        <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    ) : filtered.length === 0 ? (
      <Card style={{ textAlign: "center", padding: 40, color: T.text3 }}>
        <History size={40} strokeWidth={1} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 14 }}>暂无审计记录</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>系统操作将自动记录在此</div>
      </Card>
    ) : (
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {filtered.map((log, i) => {
          const Icon = actionIcons[log.action] || FileText;
          const color = actionColors[log.action] || T.text3;
          const person = staff.find(s => s.id === log.user_id);
          return <div key={log.id || i} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
            borderBottom: i < filtered.length - 1 ? `1px solid ${T.borderLight}` : "none",
            transition: T.transition, animation: "fadeIn 0.2s ease"
          }}
            onMouseEnter={e => e.currentTarget.style.background = T.borderLight}
            onMouseLeave={e => e.currentTarget.style.background = T.card}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, background: color + "14", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={16} color={color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text1, display: "flex", alignItems: "center", gap: 6 }}>
                <Badge color={color} small>{actionLabels[log.action] || log.action}</Badge>
                <span>{log.target_type}</span>
                <span style={{ color: T.text3 }}> — </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.target_name}</span>
              </div>
              {log.details && Object.keys(log.details).length > 0 && (
                <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>
                  {log.details.summary || log.details.before_value || log.details.field || ""}
                  {log.details.before_value && log.details.after_value && ` ${log.details.before_value} → ${log.details.after_value}`}
                </div>
              )}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text2, display: "flex", alignItems: "center", gap: 4 }}>
                <Avatar name={person?.name || log.user_name} color={person?.color || T.accent} size={18} />
                {log.user_name}
              </div>
              <div style={{ fontSize: 10, color: T.text3 }}>{formatTime(log.created_at)}</div>
            </div>
          </div>;
        })}
      </Card>
    )}
  </div>;
}

// ═══════════════════════════════════════════
// ─── RECURRING TASK INSTANCES VIEW ───────
// ═══════════════════════════════════════════
function RecurringTasksView({ data, save, user, taskInstancesHook, auditLog }) {
  const { projects, staff } = data;
  const { instances, fetchInstances, checkIn, uncheckIn, getInstanceStatus } = taskInstancesHook;
  const [expandedAction, setExpandedAction] = useState(null);

  const allActions = getAllActions(projects);
  const recurringActions = allActions.filter(a => a.aType === "recurring");

  useEffect(() => {
    const ids = recurringActions.map(a => a.id);
    if (ids.length > 0) fetchInstances(ids);
  }, [recurringActions.length, fetchInstances]);

  const handleCheckIn = async (action, period) => {
    await checkIn(action.id, period, user.id);
    if (auditLog) {
      auditLog.addLog(user.id, user.name, "check_in", "周期任务", action.name, { period, project: action.projectName });
    }
  };

  const handleUncheck = async (action, period) => {
    await uncheckIn(action.id, period);
    if (auditLog) {
      auditLog.addLog(user.id, user.name, "uncheck", "周期任务", action.name, { period });
    }
  };

  // Group by project
  const byProject = {};
  recurringActions.forEach(a => {
    if (!byProject[a.projectId]) byProject[a.projectId] = { name: a.projectName, color: a.projectColor, actions: [] };
    byProject[a.projectId].actions.push(a);
  });

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.text1, display: "flex", alignItems: "center", gap: 8 }}>
        <CalendarCheck size={22} /> 周期任务
      </h2>
      <Btn small v="ghost" onClick={() => fetchInstances(recurringActions.map(a => a.id))}><RefreshCw size={12} /> 刷新</Btn>
    </div>

    {Object.entries(byProject).map(([pId, proj]) => (
      <Card key={pId} style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", gap: 8 }}>
          <ProjectDot color={proj.color} size={10} />
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text1 }}>{proj.name}</span>
          <Badge color={T.text3} small>{proj.actions.length} 项周期任务</Badge>
        </div>
        {proj.actions.map(action => {
          const person = staff.find(s => s.id === action.staffId);
          const periods = getRecentPeriods(action.freq, 6);
          const currentPeriod = getCurrentPeriod(action.freq);
          const isExpanded = expandedAction === action.id;
          const completedCount = periods.filter(p => getInstanceStatus(action.id, p)?.status === 2).length;

          return <div key={action.id} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
            <div
              onClick={() => setExpandedAction(isExpanded ? null : action.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", cursor: "pointer", transition: T.transition }}
              onMouseEnter={e => e.currentTarget.style.background = T.borderLight}
              onMouseLeave={e => e.currentTarget.style.background = T.card}
            >
              <RefreshCw size={14} color={T.teal} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text1 }}>{action.name}</div>
                <div style={{ fontSize: 11, color: T.text3, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{action.catName}</span>
                  <span>{action.count}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 2 }}><UserCircle size={10} /> {person?.name}</span>
                </div>
              </div>
              {/* Mini progress dots for recent periods */}
              <div style={{ display: "flex", gap: 3 }}>
                {periods.slice(0, 4).reverse().map(p => {
                  const inst = getInstanceStatus(action.id, p);
                  const isCurrent = p === currentPeriod;
                  return <div key={p} style={{
                    width: isCurrent ? 10 : 8, height: isCurrent ? 10 : 8, borderRadius: "50%",
                    background: inst?.status === 2 ? T.success : isCurrent ? T.warning : T.border,
                    border: isCurrent ? `2px solid ${inst?.status === 2 ? T.success : T.warning}` : "none",
                    transition: T.transition,
                  }} title={`${getPeriodLabel(p, action.freq)} ${inst?.status === 2 ? "已完成" : "未完成"}`} />;
                })}
              </div>
              <Badge color={T.teal} small>{completedCount}/{periods.length}</Badge>
              <div style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: T.transition }}>
                <ChevronDown size={14} color={T.text3} />
              </div>
            </div>

            {isExpanded && <div style={{ padding: "0 20px 16px", animation: "fadeIn 0.2s ease" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginTop: 4 }}>
                {periods.map(period => {
                  const inst = getInstanceStatus(action.id, period);
                  const isDone = inst?.status === 2;
                  const isCurrent = period === currentPeriod;
                  const checkedPerson = inst?.checked_by ? staff.find(s => s.id === inst.checked_by) : null;

                  return <div key={period} style={{
                    padding: "10px 12px", borderRadius: T.radiusSm,
                    background: isDone ? "#F0FDF4" : isCurrent ? T.accentLight : T.borderLight,
                    border: `1.5px solid ${isDone ? T.success + "40" : isCurrent ? T.accent + "40" : T.border}`,
                    transition: T.transition, cursor: "pointer",
                  }}
                    onClick={() => isDone ? handleUncheck(action, period) : handleCheckIn(action, period)}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isCurrent ? T.accent : T.text1 }}>
                        {getPeriodLabel(period, action.freq)}
                        {isCurrent && <span style={{ fontSize: 9, color: T.accent, marginLeft: 4 }}>当前</span>}
                      </span>
                      {isDone ? <CheckCircle2 size={16} color={T.success} /> : <Circle size={16} color={T.text3} />}
                    </div>
                    {isDone && checkedPerson && (
                      <div style={{ fontSize: 10, color: T.text3, display: "flex", alignItems: "center", gap: 3 }}>
                        <Avatar name={checkedPerson.name} color={checkedPerson.color} size={12} />
                        {checkedPerson.name} · {new Date(inst.checked_at).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
                      </div>
                    )}
                    {!isDone && <div style={{ fontSize: 10, color: T.text3 }}>点击打卡</div>}
                  </div>;
                })}
              </div>
            </div>}
          </div>;
        })}
      </Card>
    ))}

    {recurringActions.length === 0 && (
      <Card style={{ textAlign: "center", padding: 40, color: T.text3 }}>
        <CalendarCheck size={40} strokeWidth={1} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 14 }}>暂无周期任务</div>
      </Card>
    )}
  </div>;
}

// ═══════════════════════════════════════════
// ─── EMPLOYEE VIEW ────────────────────────
// ═══════════════════════════════════════════
function EmployeeApp({data,user,save,syncStatus,auditLog,taskInstancesHook,deliverablesHook,onLogout}) {
  const [view,setView]=useState("mytasks");const isMobile=useIsMobile();const[sidebarOpen,setSidebarOpen]=useState(false);
  const {projects,staff}=data;
  const allActions=getAllActions(projects);
  const myActions=allActions.filter(a=>a.staffId===user.id);
  const doneCount=myActions.filter(a=>a.progress===2).length;

  const updateProgress=(actionId)=>{
    const cur=allActions.find(a=>a.id===actionId);if(!cur)return;
    const next=cur.progress===0?1:cur.progress===1?2:0;
    save({...data,projects:updateActionInProjects(projects,actionId,{progress:next})});
    auditLog.addLog(user.id, user.name, "status_change", "任务", cur.name, {
      field: "progress", before_value: STATUS.find(s=>s.v===cur.progress)?.l, after_value: STATUS.find(s=>s.v===next)?.l
    });
  };
  const updateNote=(actionId,note)=>save({...data,projects:updateActionInProjects(projects,actionId,{note})});

  const now=new Date();const todayS=todayStr();
  const isDaily=a=>a.aType==="recurring"&&a.freq==="daily";
  const isDueToday=a=>a.deadline===todayS;
  const isDueThisWeek=a=>{if(!a.deadline)return false;const d=new Date(a.deadline);const we=new Date(now);we.setDate(now.getDate()+(7-now.getDay()));return d<=we&&d>now;};
  const isWeekly=a=>a.aType==="recurring"&&(a.freq==="weekly"||a.freq==="biweekly");

  const todayTasks=myActions.filter(a=>a.progress!==2&&(isDaily(a)||isDueToday(a)));
  const weekTasks=myActions.filter(a=>a.progress!==2&&!isDaily(a)&&!isDueToday(a)&&(isWeekly(a)||isDueThisWeek(a)));
  const longTasks=myActions.filter(a=>a.progress!==2&&!todayTasks.includes(a)&&!weekTasks.includes(a));
  const doneTasks=myActions.filter(a=>a.progress===2);

  const TaskCard=({action:a,dimmed})=>{
    const[showNote,setShowNote]=useState(false);const catColor=CAT_COLORS[a.cat]||T.text2;
    const ds = getDeadlineStatus(a.deadline, a.progress);
    return<div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:dimmed?T.borderLight:T.card,borderRadius:T.radius,border:`1px solid ${dimmed?T.borderLight:ds?.level==="overdue"?"#FECACA":T.borderLight}`,borderLeft:`3px solid ${dimmed?T.border:catColor}`,opacity:dimmed?.5:1,marginBottom:8,boxShadow:dimmed?"none":T.shadow,transition:T.transition}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
          <ProjectDot color={a.projectColor} size={8}/>
          <span style={{fontSize:14,fontWeight:600,color:dimmed?T.text3:T.text1,textDecoration:dimmed?"line-through":"none"}}>{a.name}</span>
          {a.isKey&&<Badge color={T.accent} small>重点</Badge>}
          {ds&&(ds.level==="overdue"||ds.level==="today")&&<Badge color={T.danger} small>{ds.label}</Badge>}
          {ds&&ds.level==="soon"&&<Badge color={T.warning} small>{ds.label}</Badge>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,fontSize:11,color:T.text3,flexWrap:"wrap"}}>
          <span>{a.projectName}</span><span style={{color:T.border}}>›</span><span>{a.resName}</span>
          {a.aType==="recurring"&&a.count&&<Badge color={T.teal} small><RefreshCw size={9} style={{marginRight:2}}/>{a.count}</Badge>}
          {a.aType==="once"&&a.deadline&&<Badge color={ds?.color||T.text3} small><CalendarClock size={9} style={{marginRight:2}}/>{a.deadline.slice(5)}</Badge>}
          <span style={{display:"flex",alignItems:"center",gap:2}}><Clock size={10}/>{a.hours}h</span>
        </div>
        {a.note&&<div style={{fontSize:11,color:T.text2,marginTop:4,fontStyle:"italic",background:T.borderLight,padding:"3px 8px",borderRadius:4,display:"inline-flex",alignItems:"center",gap:4}}><MessageCircle size={10}/> {a.note}</div>}
        {!dimmed&&<div style={{marginTop:4}}>
          {showNote?<div style={{display:"flex",gap:4,marginTop:4}}><input autoFocus defaultValue={a.note||""}placeholder="写备注..."onKeyDown={e=>{if(e.key==="Enter"){updateNote(a.id,e.target.value);setShowNote(false);}if(e.key==="Escape")setShowNote(false);}}onBlur={e=>{updateNote(a.id,e.target.value);setShowNote(false);}}style={{flex:1,padding:"5px 8px",borderRadius:6,border:`1.5px solid ${T.border}`,fontSize:11,outline:"none",fontFamily:T.font}}/></div>
          :<button onClick={e=>{e.stopPropagation();setShowNote(true);}}style={{background:"none",border:"none",fontSize:11,color:T.text3,cursor:"pointer",display:"flex",alignItems:"center",gap:3,transition:T.transition}}><Pencil size={10}/> 备注</button>}
        </div>}
      </div>
      {!dimmed&&<button onClick={e=>{e.stopPropagation();updateProgress(a.id);}}style={{padding:"8px 16px",borderRadius:T.radiusSm,fontSize:12,fontWeight:600,border:`1.5px solid ${STATUS.find(x=>x.v===a.progress)?.c}`,background:STATUS.find(x=>x.v===a.progress)?.bg,color:STATUS.find(x=>x.v===a.progress)?.c,cursor:"pointer",minWidth:90,transition:T.transition,boxShadow:T.shadowBtn,display:"flex",alignItems:"center",gap:4,justifyContent:"center"}}>
        <StatusIcon v={a.progress} size={13}/> {a.progress===0?"开始":a.progress===1?"完成":"已完成"}
      </button>}
      {dimmed&&<Check size={18} color={T.border}/>}
    </div>;
  };

  const Section=({title,icon:Icon,count,color,children,defaultOpen=true})=>{const[open,setOpen]=useState(defaultOpen);return<div style={{marginBottom:20}}>
    <div onClick={()=>setOpen(!open)}style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,cursor:"pointer",transition:T.transition}}>
      <Icon size={16} color={color}/>
      <span style={{fontSize:15,fontWeight:700,color}}>{title}</span>
      <span style={{fontSize:11,fontWeight:700,color:"#fff",background:color,borderRadius:10,padding:"2px 8px"}}>{count}</span>
      <div style={{transform:open?"rotate(90deg)":"rotate(0)",transition:T.transition}}><ChevronRight size={14} color={T.text3}/></div>
    </div>
    <div style={{overflow:"hidden",maxHeight:open?"9999px":"0",opacity:open?1:0,transition:"all 0.3s ease"}}>{children}</div>
  </div>;};

  const teamActions=allActions.filter(a=>a.staffId!==user.id);
  const teamByPerson={};teamActions.forEach(a=>{if(!teamByPerson[a.staffId])teamByPerson[a.staffId]={person:staff.find(x=>x.id===a.staffId),actions:[]};teamByPerson[a.staffId].actions.push(a);});

  const sidebarContent=<>
      <div style={{padding:"24px 20px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}><Mountain size={18}/></div>
          <div><div style={{fontSize:14,fontWeight:700,color:T.text1}}>第二座山</div><div style={{fontSize:10,color:T.text3}}>运营管理</div></div>
          {isMobile&&<button onClick={()=>setSidebarOpen(false)} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:T.text3,padding:4}}><X size={18}/></button>}
        </div>
      </div>
      <nav style={{flex:1,padding:"0 10px"}}>
        {[{id:"mytasks",icon:ListTodo,label:"我的工作"},{id:"recurring",icon:CalendarCheck,label:"周期任务"},{id:"team",icon:Users,label:"团队动态"}].map(n=>{
          const Icon=n.icon;const active=view===n.id;
          return<div key={n.id}onClick={()=>{setView(n.id);if(isMobile)setSidebarOpen(false);}}style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",marginBottom:2,borderRadius:T.radiusSm,cursor:"pointer",background:active?T.accentLight:"transparent",color:active?T.accent:T.text2,transition:T.transition,fontWeight:active?600:500}}>
            <Icon size={18}/><span style={{fontSize:13}}>{n.label}</span>
            {n.id==="mytasks"&&myActions.filter(a=>a.progress!==2).length>0&&<span style={{background:T.danger,color:"#fff",fontSize:9,fontWeight:700,borderRadius:10,padding:"2px 6px",marginLeft:"auto"}}>{myActions.filter(a=>a.progress!==2).length}</span>}
          </div>;
        })}
      </nav>
      <div style={{padding:"16px 14px",borderTop:`1px solid ${T.borderLight}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Avatar name={user.name} color={user.color||T.accent} size={32}/>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.text1}}>{user.name}</div><div style={{fontSize:10,color:T.text3}}>{user.role}</div></div>
          <SyncBadge status={syncStatus} onSync={() => save(data)} />
          <button onClick={onLogout} title="退出登录" style={{background:T.borderLight,border:"none",width:28,height:28,borderRadius:14,cursor:"pointer",color:T.text3,display:"flex",alignItems:"center",justifyContent:"center",transition:T.transition,flexShrink:0}} onMouseEnter={e=>e.target.style.color=T.danger} onMouseLeave={e=>e.target.style.color=T.text3}><LogOut size={14}/></button>
        </div>
      </div>
  </>;

  return<div style={{display:"flex",minHeight:"100vh",fontFamily:T.font,background:T.bg}}>
    <GlobalStyles/>
    {/* Mobile header bar */}
    {isMobile&&<div style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:T.sidebar,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",padding:"10px 16px",gap:12,boxShadow:T.shadow}}>
      <button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",cursor:"pointer",color:T.text1,padding:4,display:"flex"}}><Menu size={22}/></button>
      <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:T.text1}}>第二座山</div></div>
      <Avatar name={user.name} color={user.color||T.accent} size={28}/>
    </div>}
    {/* Sidebar overlay */}
    {isMobile&&sidebarOpen&&<div className="mobile-overlay" onClick={()=>setSidebarOpen(false)}/>}
    {/* Sidebar */}
    <div className={isMobile?(sidebarOpen?"mobile-sidebar mobile-sidebar-visible":"mobile-sidebar mobile-sidebar-hidden"):""} style={{width:220,minHeight:"100vh",background:T.sidebar,display:"flex",flexDirection:"column",flexShrink:0,borderRight:`1px solid ${T.border}`,transition:"transform 0.3s ease",...(isMobile&&!sidebarOpen?{position:"fixed",left:0,top:0}:{})}}>
      {sidebarContent}
    </div>
    <main style={{flex:1,padding:isMobile?"68px 16px 16px":"28px 36px",overflowY:"auto",maxHeight:"100vh"}}>
      {view==="mytasks"&&<div style={{animation:"fadeIn 0.3s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div><h2 style={{margin:"0 0 4px",fontSize:22,fontWeight:700,color:T.text1}}>{user.name}，今天也要加油</h2><p style={{margin:0,fontSize:13,color:T.text3}}>共 {myActions.length} 项 · 已完成 <span style={{color:T.success,fontWeight:700}}>{doneCount}</span> · 待完成 <span style={{color:T.warning,fontWeight:700}}>{myActions.length-doneCount}</span></p></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:120,height:6,background:T.borderLight,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:myActions.length?`${Math.round(doneCount/myActions.length*100)}%`:"0%",background:T.accent,borderRadius:3,transition:"width 0.5s ease"}}/></div><span style={{fontSize:13,fontWeight:700,color:T.accent}}>{myActions.length?Math.round(doneCount/myActions.length*100):0}%</span></div>
        </div>
        <DeadlineAlerts actions={myActions} staff={staff} />
        {myActions.length===0?<div style={{textAlign:"center",padding:60,color:T.text3}}><ListTodo size={48} strokeWidth={1} style={{marginBottom:12}}/><div style={{fontSize:15}}>暂无工作</div></div>:<>
          {todayTasks.length>0&&<Section title="今日待办" icon={AlertCircle} count={todayTasks.length} color={T.danger}>{todayTasks.map(a=><TaskCard key={a.id} action={a}/>)}</Section>}
          {weekTasks.length>0&&<Section title="本周待办" icon={CalendarDays} count={weekTasks.length} color={T.warning}>{weekTasks.map(a=><TaskCard key={a.id} action={a}/>)}</Section>}
          {longTasks.length>0&&<Section title="长期/月度" icon={TrendingUp} count={longTasks.length} color={T.accent}>{longTasks.map(a=><TaskCard key={a.id} action={a}/>)}</Section>}
          {doneTasks.length>0&&<Section title="已完成" icon={CheckCircle2} count={doneTasks.length} color={T.success} defaultOpen={false}>{doneTasks.map(a=><TaskCard key={a.id} action={a} dimmed/>)}</Section>}
        </>}
      </div>}
      {view==="recurring"&&<RecurringTasksView data={data} save={save} user={user} taskInstancesHook={taskInstancesHook} auditLog={auditLog} />}
      {view==="team"&&<div style={{animation:"fadeIn 0.3s ease"}}>
        <h2 style={{margin:"0 0 20px",fontSize:22,fontWeight:700,color:T.text1,display:"flex",alignItems:"center",gap:8}}><Users size={22}/> 团队动态</h2>
        {Object.values(teamByPerson).map(({person:p,actions:acts})=>{const d=acts.filter(a=>a.progress===2).length;const pct=acts.length?Math.round(d/acts.length*100):0;
          return<Card key={p?.id}style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <Avatar name={p?.name} color={p?.color||T.accent} size={36}/>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:T.text1}}>{p?.name} <span style={{fontSize:11,fontWeight:500,color:T.text3}}>{p?.role}</span></div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}><div style={{flex:1,maxWidth:200,height:4,background:T.borderLight,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:T.accent,borderRadius:2,transition:"width 0.5s ease"}}/></div><span style={{fontSize:11,fontWeight:700,color:T.accent}}>{pct}%</span></div>
              </div>
            </div>
            {acts.map(a=>{const s=STATUS.find(x=>x.v===a.progress);return<div key={a.id}style={{display:"flex",alignItems:"center",gap:10,padding:"6px 12px",marginBottom:3,borderRadius:T.radiusSm,background:a.progress===2?T.borderLight:"transparent",opacity:a.progress===2?.5:1,transition:T.transition}}>
              <StatusIcon v={a.progress} size={12}/>
              <span style={{fontSize:12,fontWeight:600,color:a.progress===2?T.text3:T.text1,textDecoration:a.progress===2?"line-through":"none",flex:1}}><ProjectDot color={a.projectColor} size={6} /> {a.name}</span>
              <Badge color={s?.c} small>{s?.l}</Badge>
            </div>;})}
          </Card>;
        })}
      </div>}
    </main>
  </div>;
}

// ═══════════════════════════════════════════
// ─── ADMIN VIEW ───────────────────────────
// ═══════════════════════════════════════════
const ADMIN_NAV=[
  {id:"overview",icon:LayoutDashboard,label:"总览面板"},
  {id:"projects",icon:Settings,label:"项目管理"},
  {id:"kanban",icon:ClipboardList,label:"任务看板"},
  {id:"taskfilter",icon:Filter,label:"任务筛选"},
  {id:"timeline",icon:CalendarClock,label:"时间线"},
  {id:"gantt",icon:GanttChartSquare,label:"甘特图"},
  {id:"recurring",icon:CalendarCheck,label:"周期任务"},
  {id:"risks",icon:AlertOctagon,label:"风险管理"},
  {id:"schedule",icon:CalendarDays,label:"工时排期"},
  {id:"reports",icon:BarChart3,label:"数据报表"},
  {id:"deliverables",icon:FolderArchive,label:"交付管理"},
  {id:"staff",icon:Users,label:"人员管理"},
  {id:"audit",icon:History,label:"操作审计"},
];

function GlobalSearchBar({data,onNavigate}){
  const[q,setQ]=useState("");const[open,setOpen]=useState(false);const ref=useRef(null);
  const actions=getAllActions(data.projects);
  const results=useMemo(()=>{
    if(!q.trim())return[];const kw=q.toLowerCase();
    const matched=[];
    // Search actions
    actions.forEach(a=>{if(a.name.toLowerCase().includes(kw)||a.projectName.toLowerCase().includes(kw)||a.resName.toLowerCase().includes(kw)||a.catName.toLowerCase().includes(kw))
      matched.push({type:"action",id:a.id,name:a.name,sub:`${a.projectName} · ${a.catName} · ${a.resName}`,color:a.projectColor,progress:a.progress});
    });
    // Search projects
    data.projects.forEach(p=>{if(p.name.toLowerCase().includes(kw))matched.push({type:"project",id:p.id,name:p.name,sub:`${getAllActions([p]).length} 动作`,color:p.color});});
    // Search staff
    data.staff.forEach(s=>{if(s.name.toLowerCase().includes(kw)||s.role.toLowerCase().includes(kw))matched.push({type:"staff",id:s.id,name:s.name,sub:s.role,color:s.color});});
    // Search risks
    (data.risks||[]).forEach(r=>{if(r.name.toLowerCase().includes(kw))matched.push({type:"risk",id:r.id,name:r.name,sub:"风险",color:T.danger});});
    return matched.slice(0,12);
  },[q,actions,data]);

  useEffect(()=>{const handler=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",handler);return()=>document.removeEventListener("mousedown",handler);},[]);

  return<div ref={ref} style={{position:"relative",marginBottom:8,padding:"0 10px"}}>
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:T.radiusSm,background:T.borderLight,border:`1.5px solid ${open&&q?T.accent:T.borderLight}`,transition:T.transition}}>
      <Search size={14} color={T.text3}/>
      <input value={q} onChange={e=>{setQ(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)}
        placeholder="搜索项目、任务、人员..."
        style={{flex:1,border:"none",background:"transparent",outline:"none",fontSize:12,fontFamily:T.font,color:T.text1}}/>
      {q&&<button onClick={()=>{setQ("");setOpen(false);}} style={{background:"none",border:"none",cursor:"pointer",color:T.text3,padding:0}}><X size={12}/></button>}
    </div>
    {open&&results.length>0&&<div style={{position:"absolute",left:10,right:10,top:"100%",marginTop:4,background:T.card,borderRadius:T.radius,boxShadow:T.shadowMd,border:`1px solid ${T.border}`,maxHeight:320,overflowY:"auto",zIndex:100,animation:"fadeIn 0.15s ease"}}>
      {results.map((r,i)=><div key={`${r.type}-${r.id}-${i}`} onClick={()=>{onNavigate(r.type,r.id);setOpen(false);setQ("");}}
        style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",borderBottom:i<results.length-1?`1px solid ${T.borderLight}`:"none",transition:T.transition}}
        onMouseEnter={e=>e.currentTarget.style.background=T.borderLight} onMouseLeave={e=>e.currentTarget.style.background=T.card}>
        <div style={{width:8,height:8,borderRadius:"50%",background:r.color||T.accent,flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:600,color:T.text1,display:"flex",alignItems:"center",gap:4}}>
            {r.name}
            {r.progress!==undefined&&<StatusIcon v={r.progress} size={10}/>}
          </div>
          <div style={{fontSize:10,color:T.text3}}>{r.sub}</div>
        </div>
        <Badge color={r.type==="action"?T.accent:r.type==="project"?T.purple:r.type==="staff"?T.teal:T.danger} small>
          {r.type==="action"?"任务":r.type==="project"?"项目":r.type==="staff"?"人员":"风险"}
        </Badge>
      </div>)}
    </div>}
  </div>;
}

function AdminApp({data,user,save,syncStatus,auditLog,taskInstancesHook,deliverablesHook,onLogout}) {
  const[view,setView]=useState("overview");const[showHidden,setShowHidden]=useState(false);const isMobile=useIsMobile();const[sidebarOpen,setSidebarOpen]=useState(false);
  const handleSearchNav=(type,id)=>{
    if(type==="action"||type==="project")setView("taskfilter");
    else if(type==="staff")setView("staff");
    else if(type==="risk")setView("risks");
  };
  const adminSidebarContent=<>
      <div style={{padding:"24px 20px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}><Mountain size={18}/></div>
          <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:T.text1}}>第二座山</div><div style={{fontSize:10,color:T.text3}}>管理后台</div></div>
          <button onClick={()=>setShowHidden(h=>!h)} style={{background:"none",border:"none",cursor:"pointer",padding:6,borderRadius:6,color:showHidden?T.accent:T.text3,transition:T.transition,display:"flex",alignItems:"center",opacity:showHidden?1:0.45}} onMouseEnter={e=>{e.currentTarget.style.opacity=1;e.currentTarget.style.background=T.borderLight;}} onMouseLeave={e=>{e.currentTarget.style.opacity=showHidden?1:0.45;e.currentTarget.style.background="none";}}>{showHidden?<Eye size={15}/>:<EyeOff size={15}/>}</button>
          {isMobile&&<button onClick={()=>setSidebarOpen(false)} style={{background:"none",border:"none",cursor:"pointer",color:T.text3,padding:4,display:"flex"}}><X size={18}/></button>}
        </div>
      </div>
      <GlobalSearchBar data={data} onNavigate={handleSearchNav}/>
      <nav style={{flex:1,padding:"0 10px",overflowY:"auto"}}>
        {ADMIN_NAV.map(n=>{const Icon=n.icon;const active=view===n.id;
          return<div key={n.id}onClick={()=>{setView(n.id);if(isMobile)setSidebarOpen(false);}}style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",marginBottom:2,borderRadius:T.radiusSm,cursor:"pointer",background:active?T.accentLight:"transparent",color:active?T.accent:T.text2,transition:T.transition,fontWeight:active?600:500}}>
            <Icon size={18}/><span style={{fontSize:13}}>{n.label}</span>
          </div>;
        })}
      </nav>
      <div style={{padding:"16px 14px",borderTop:`1px solid ${T.borderLight}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Avatar name={user.name} color={user.color||T.accent} size={32}/>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.text1}}>{user.name}</div><div style={{fontSize:10,color:T.text3}}>{user.role} · 管理员</div></div>
          <SyncBadge status={syncStatus} onSync={() => save(data)} />
          <button onClick={onLogout} title="退出登录" style={{background:T.borderLight,border:"none",width:28,height:28,borderRadius:14,cursor:"pointer",color:T.text3,display:"flex",alignItems:"center",justifyContent:"center",transition:T.transition,flexShrink:0}} onMouseEnter={e=>e.target.style.color=T.danger} onMouseLeave={e=>e.target.style.color=T.text3}><LogOut size={14}/></button>
        </div>
      </div>
  </>;

  return<div style={{display:"flex",minHeight:"100vh",fontFamily:T.font,background:T.bg}}>
    <GlobalStyles/>
    {/* Mobile header bar */}
    {isMobile&&<div style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:T.sidebar,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",padding:"10px 16px",gap:12,boxShadow:T.shadow}}>
      <button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",cursor:"pointer",color:T.text1,padding:4,display:"flex"}}><Menu size={22}/></button>
      <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:T.text1}}>第二座山</div></div>
      <Avatar name={user.name} color={user.color||T.accent} size={28}/>
    </div>}
    {/* Sidebar overlay */}
    {isMobile&&sidebarOpen&&<div className="mobile-overlay" onClick={()=>setSidebarOpen(false)}/>}
    {/* Sidebar */}
    <div className={isMobile?(sidebarOpen?"mobile-sidebar mobile-sidebar-visible":"mobile-sidebar mobile-sidebar-hidden"):""} style={{width:240,minHeight:"100vh",background:T.sidebar,display:"flex",flexDirection:"column",flexShrink:0,borderRight:`1px solid ${T.border}`,transition:"transform 0.3s ease",...(isMobile&&!sidebarOpen?{position:"fixed",left:0,top:0}:{})}}>
      {adminSidebarContent}
    </div>
    <main style={{flex:1,padding:isMobile?"68px 16px 16px":"28px 36px",overflowY:"auto",maxHeight:"100vh"}}>
      {/* vData: data with hidden projects filtered out (for all views except ProjectsView) */}
      {(()=>{try{const vData=showHidden?data:{...data,projects:(data.projects||[]).filter(p=>!p.hidden)};return<ErrorBoundary key={view}><div style={{animation:"fadeIn 0.3s ease"}}>
        {view==="overview"&&<OverviewView data={vData} save={save} auditLog={auditLog} user={user}/>}
        {view==="projects"&&<ProjectsView data={data} save={save} auditLog={auditLog} user={user} showHidden={showHidden}/>}
        {view==="kanban"&&<KanbanView data={vData} save={save} auditLog={auditLog} user={user}/>}
        {view==="taskfilter"&&<TaskFilterView data={vData} save={save} auditLog={auditLog} user={user}/>}
        {view==="timeline"&&<TimelineView data={vData} save={save} auditLog={auditLog} user={user}/>}
        {view==="gantt"&&<GanttView data={vData}/>}
        {view==="recurring"&&<RecurringTasksView data={vData} save={save} user={user} taskInstancesHook={taskInstancesHook} auditLog={auditLog}/>}
        {view==="risks"&&<RiskView data={vData} save={save} auditLog={auditLog} user={user}/>}
        {view==="schedule"&&<ScheduleView data={vData} save={save}/>}
        {view==="reports"&&<ReportsView data={vData}/>}
        {view==="deliverables"&&<DeliverablesView data={vData} user={user} deliverablesHook={deliverablesHook} auditLog={auditLog}/>}
        {view==="staff"&&<StaffView data={data} save={save} auditLog={auditLog} user={user}/>}
        {view==="audit"&&<AuditLogView auditLog={auditLog} staff={data.staff}/>}
      </div></ErrorBoundary>;}catch(e){return<div style={{padding:40,textAlign:"center",color:"#EF4444"}}>渲染出错: {e.message}</div>;}})()}
    </main>
  </div>;
}

// ─── Overview ──────────────────────────
function OverviewView({data,save,auditLog,user}){
  const{projects,staff}=data;const actions=getAllActions(projects);
  const sorted=[...projects].sort((a,b)=>a.priority-b.priority);
  const done=actions.filter(a=>a.progress===2).length;const inP=actions.filter(a=>a.progress===1).length;
  const totalRes=projects.reduce((s,p)=>(p.categories||[]).reduce((s2,c)=>s2+(c.resources||[]).length,s),0);
  const stats=[
    {l:"项目",v:projects.length,c:T.accent,icon:Settings},
    {l:"资源",v:totalRes,c:T.teal,icon:Smartphone},
    {l:"动作",v:actions.length,c:T.purple,icon:ClipboardList},
    {l:"进行中",v:inP,c:T.warning,icon:CircleDot},
    {l:"已完成",v:done,c:T.success,icon:CheckCircle2},
  ];
  const workload=staff.map(s=>{const sa=actions.filter(a=>a.staffId===s.id);return{name:s.name,total:sa.length,done:sa.filter(a=>a.progress===2).length,prog:sa.filter(a=>a.progress===1).length,hours:sa.reduce((sum,a)=>sum+(a.hours||0),0)};});

  return<div>
    <h2 style={{margin:"0 0 20px",fontSize:22,fontWeight:700,color:T.text1,display:"flex",alignItems:"center",gap:8}}><LayoutDashboard size={22}/> 总览面板</h2>
    <DeadlineAlerts actions={actions} staff={staff} />
    <AIAssistant data={data} save={save} auditLog={auditLog} user={user} />
    <div className="grid-responsive-5" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:24}}>
      {stats.map((s,i)=>{const Icon=s.icon;return<Card key={i} style={{padding:"16px 18px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:12,color:T.text3,fontWeight:600}}>{s.l}</span>
          <Icon size={16} color={s.c} strokeWidth={2}/>
        </div>
        <div style={{fontSize:26,fontWeight:800,color:s.c}}>{s.v}</div>
      </Card>;})}
    </div>
    <div className="grid-responsive-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
      <Card style={{padding:"20px 22px"}}><h4 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,color:T.text1}}>项目完成度</h4><ResponsiveContainer width="100%" height={180}><BarChart data={sorted.map(p=>{const pa=getAllActions([p]);return{name:p.name.slice(0,4),total:pa.length,done:pa.filter(a=>a.progress===2).length};})}barSize={18}><XAxis dataKey="name" tick={{fontSize:10,fill:T.text3}}/><YAxis tick={{fontSize:11,fill:T.text3}}/><Tooltip contentStyle={{borderRadius:8,fontSize:12,border:`1px solid ${T.border}`,boxShadow:T.shadowMd}}/><Bar dataKey="total" fill={T.borderLight} name="总动作" radius={[4,4,0,0]}/><Bar dataKey="done" fill={T.accent} name="已完成" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></Card>
      <Card style={{padding:"20px 22px"}}><h4 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,color:T.text1}}>人员工作量</h4><ResponsiveContainer width="100%" height={180}><BarChart data={workload} barSize={18}><XAxis dataKey="name" tick={{fontSize:10,fill:T.text3}}/><YAxis tick={{fontSize:11,fill:T.text3}}/><Tooltip contentStyle={{borderRadius:8,fontSize:12,border:`1px solid ${T.border}`,boxShadow:T.shadowMd}}/><Legend iconSize={10} wrapperStyle={{fontSize:11}}/><Bar dataKey="done" stackId="a" fill={T.success} name="完成"/><Bar dataKey="prog" stackId="a" fill={T.warning} name="进行中" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></Card>
    </div>
    <div className="grid-responsive-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
      {staff.map(s=>{const sa=actions.filter(a=>a.staffId===s.id);const d=sa.filter(a=>a.progress===2).length;const pct=sa.length?Math.round(d/sa.length*100):0;
        return<Card key={s.id} style={{padding:"16px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <Avatar name={s.name} color={s.color||T.accent} size={36}/>
            <div><div style={{fontSize:14,fontWeight:700,color:T.text1}}>{s.name}</div><div style={{fontSize:10,color:T.text3}}>{s.role} · {sa.length}项 · {sa.reduce((sum,a)=>sum+(a.hours||0),0)}h</div></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><div style={{flex:1,height:4,background:T.borderLight,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:pct===100?T.success:T.accent,borderRadius:2,transition:"width 0.5s ease"}}/></div><span style={{fontSize:12,fontWeight:700,color:T.accent}}>{pct}%</span></div>
          {sa.filter(a=>a.progress!==2).slice(0,3).map(a=><div key={a.id}style={{fontSize:11,padding:"3px 0",color:T.text2,display:"flex",alignItems:"center",gap:6}}>
            <StatusIcon v={a.progress} size={10}/>
            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{a.name}</span>
          </div>)}
        </Card>;
      })}
    </div>
  </div>;
}

// ─── Projects ───────────────────────────
function ProjectsView({data,save,auditLog,user,showHidden}){
  const projects=data.projects||[];const staff=data.staff||[];const sorted=[...projects].sort((a,b)=>a.priority-b.priority);
  const[expanded,setExpanded]=useState({});const[modal,setModal]=useState(null);
  const visibleSorted=showHidden?sorted:sorted.filter(p=>!p.hidden);
  const toggleHide=(pid,e)=>{e.stopPropagation();save({...data,projects:projects.map(p=>p.id===pid?{...p,hidden:!p.hidden}:p)});};
  const toggle=k=>setExpanded(p=>({...p,[k]:!p[k]}));
  const Arrow=({open})=><div style={{transition:T.transition,transform:open?"rotate(90deg)":"rotate(0)",display:"flex",alignItems:"center"}}><ChevronRight size={14} color={T.text3}/></div>;

  const logAction = (action, type, name, details={}) => {
    if (auditLog && user) auditLog.addLog(user.id, user.name, action, type, name, details);
  };

  const saveProject=proj=>{const i=projects.findIndex(p=>p.id===proj.id);let n;const isNew=i<0;if(i>=0){n=[...projects];n[i]={...n[i],name:proj.name,priority:proj.priority,isKey:proj.isKey,color:proj.color,milestones:proj.milestones||[]};}else n=[...projects,{...proj,categories:[]}];save({...data,projects:n});setModal(null);logAction(isNew?"create":"update","项目",proj.name);};
  const delProject=pid=>{if(!confirm("确定删除该项目？"))return;const p=projects.find(x=>x.id===pid);save({...data,projects:projects.filter(p=>p.id!==pid)});logAction("delete","项目",p?.name||pid);};
  const saveCategory=(projId,cat)=>{const proj=projects.find(p=>p.id===projId);save({...data,projects:projects.map(p=>{if(p.id!==projId)return p;const cs=p.categories||[];const i=cs.findIndex(c=>c.id===cat.id);if(i>=0){const n=[...cs];n[i]={...n[i],name:cat.name,cat:cat.cat};return{...p,categories:n};}return{...p,categories:[...cs,{...cat,resources:[]}]};})});setModal(null);logAction(projects.find(p=>p.id===projId)?.categories?.find(c=>c.id===cat.id)?"update":"create","类别",cat.name,{project:proj?.name});};
  const delCategory=(pId,cId)=>{const cat=projects.find(p=>p.id===pId)?.categories?.find(c=>c.id===cId);save({...data,projects:projects.map(p=>p.id===pId?{...p,categories:(p.categories||[]).filter(c=>c.id!==cId)}:p)});logAction("delete","类别",cat?.name||cId);};
  const saveResource=(pId,cId,res)=>{save({...data,projects:projects.map(p=>{if(p.id!==pId)return p;return{...p,categories:(p.categories||[]).map(c=>{if(c.id!==cId)return c;const rs=c.resources||[];const i=rs.findIndex(r=>r.id===res.id);if(i>=0){const n=[...rs];n[i]={...n[i],...res};return{...c,resources:n};}return{...c,resources:[...rs,{...res,actions:[]}]};})};})});setModal(null);logAction(projects.find(p=>p.id===pId)?.categories?.find(c=>c.id===cId)?.resources?.find(r=>r.id===res.id)?"update":"create","资源",res.name);};
  const delResource=(pId,cId,rId)=>{const res=projects.find(p=>p.id===pId)?.categories?.find(c=>c.id===cId)?.resources?.find(r=>r.id===rId);save({...data,projects:projects.map(p=>p.id===pId?{...p,categories:(p.categories||[]).map(c=>c.id===cId?{...c,resources:(c.resources||[]).filter(r=>r.id!==rId)}:c)}:p)});logAction("delete","资源",res?.name||rId);};
  const saveAction=(pId,cId,rId,act)=>{save({...data,projects:projects.map(p=>{if(p.id!==pId)return p;return{...p,categories:(p.categories||[]).map(c=>{if(c.id!==cId)return c;return{...c,resources:(c.resources||[]).map(r=>{if(r.id!==rId)return r;const as=r.actions||[];const i=as.findIndex(a=>a.id===act.id);if(i>=0){const n=[...as];n[i]=act;return{...r,actions:n};}return{...r,actions:[...as,act]};})};})};})});setModal(null);logAction(projects.find(p=>p.id===pId)?.categories?.find(c=>c.id===cId)?.resources?.find(r=>r.id===rId)?.actions?.find(a=>a.id===act.id)?"update":"create","动作",act.name);};
  const delAction=(pId,cId,rId,aId)=>{const act=projects.find(p=>p.id===pId)?.categories?.find(c=>c.id===cId)?.resources?.find(r=>r.id===rId)?.actions?.find(a=>a.id===aId);save({...data,projects:projects.map(p=>p.id===pId?{...p,categories:(p.categories||[]).map(c=>c.id===cId?{...c,resources:(c.resources||[]).map(r=>r.id===rId?{...r,actions:(r.actions||[]).filter(a=>a.id!==aId)}:r)}:c)}:p)});logAction("delete","动作",act?.name||aId);};

  return<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:700,color:T.text1,display:"flex",alignItems:"center",gap:8}}><Settings size={22}/> 项目管理</h2>
      <Btn onClick={()=>setModal({type:"project",target:{id:uid(),name:"",priority:projects.length,isKey:false,color:T.accent}})}><Plus size={14}/> 新建项目</Btn>
    </div>
    {visibleSorted.map(p=>{const pOpen=expanded[p.id]!==false;const pa=getAllActions([p]);const pPct=pa.length?Math.round(pa.filter(a=>a.progress===2).length/pa.length*100):0;
      return<Card key={p.id} highlight={p.isKey} style={{marginBottom:14,padding:0,overflow:"hidden"}}>
        <div onClick={()=>toggle(p.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"14px 20px",cursor:"pointer",background:T.card,borderBottom:pOpen?`1px solid ${T.borderLight}`:"none",transition:T.transition}}>
          <Arrow open={pOpen}/><ProjectDot color={p.color} size={12}/>
          <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:15,fontWeight:700,color:T.text1}}>{p.name}</span>
            {p.isKey&&<Badge color={T.accent} small><Star size={9} style={{marginRight:2}}/>重点</Badge>}
            <Badge color={T.text3} small>P{p.priority}</Badge>
            <span style={{fontSize:10,color:T.text3}}>{pa.length}动作</span>
          </div>
            <div style={{height:3,background:T.borderLight,borderRadius:2,marginTop:6,maxWidth:300}}><div style={{height:"100%",width:pPct+"%",background:pPct===100?T.success:T.accent,borderRadius:2,transition:"width 0.5s ease"}}/></div>
          </div>
          <span style={{fontSize:12,fontWeight:700,color:T.accent}}>{pPct}%</span>
          <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
            <Btn small v="ghost" onClick={(e)=>toggleHide(p.id,e)} style={{color:p.hidden?T.text3:T.border,opacity:p.hidden?0.8:0.4}} title="">{p.hidden?<EyeOff size={12}/>:<Eye size={12}/>}</Btn>
            <Btn small v="ghost" onClick={()=>setModal({type:"project",target:{...p}})}><Pencil size={12}/></Btn>
            <Btn small v="danger" onClick={()=>delProject(p.id)}><Trash2 size={12}/></Btn>
          </div>
        </div>
        {pOpen&&<div style={{padding:"0 20px 14px",animation:"fadeIn 0.2s ease"}}>
          {/* 里程碑展示 */}
          {(p.milestones||[]).length>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"10px 0",borderBottom:`1px solid ${T.borderLight}`,marginBottom:8}}>
            <Milestone size={14} color={T.accent} style={{marginTop:2}}/>
            {(p.milestones||[]).map(ms=>{const msS=MILESTONE_STATUS.find(s=>s.v===ms.status);const ds=getDeadlineStatus(ms.date,ms.status);
              return<div key={ms.id} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",background:ms.status===2?"#F0FDF4":T.borderLight,borderRadius:16,fontSize:11,fontWeight:600,border:`1px solid ${msS?.c||T.border}20`}}>
                <StatusIcon v={ms.status} size={11}/><span style={{color:ms.status===2?T.text3:T.text1,textDecoration:ms.status===2?"line-through":"none"}}>{ms.name}</span>
                <span style={{color:ds?.color||T.text3,fontSize:10}}>{ms.date?.slice(5)}</span>
                {ds&&(ds.level==="overdue"||ds.level==="today")&&<span style={{color:T.danger,fontSize:9}}>!</span>}
              </div>;})}
          </div>}
          {(p.categories||[]).map(c=>{const cOpen=expanded[c.id]!==false;const cc=CAT_COLORS[c.cat]||T.text2;
            return<div key={c.id} style={{marginTop:8}}>
              <div onClick={()=>toggle(c.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:T.borderLight,borderRadius:T.radiusSm,cursor:"pointer",borderLeft:`3px solid ${cc}`,transition:T.transition}}>
                <Arrow open={cOpen}/><Badge color={cc}>{c.cat}</Badge><span style={{fontSize:12,fontWeight:600,color:T.text1}}>{c.name}</span>
                <div style={{flex:1}}/>
                <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                  <Btn small v="ghost" onClick={()=>setModal({type:"resource",target:{id:uid(),name:"",type:"account",platform:"",owner:staff[0]?.id},pp:{pId:p.id,cId:c.id}})}><Plus size={12}/> 资源</Btn>
                  <Btn small v="ghost" onClick={()=>setModal({type:"category",target:{...c},pp:{pId:p.id}})}><Pencil size={12}/></Btn>
                  <Btn small v="danger" onClick={()=>delCategory(p.id,c.id)}><X size={12}/></Btn>
                </div>
              </div>
              {cOpen&&<div style={{marginLeft:16,animation:"fadeIn 0.2s ease"}}>
                {(c.resources||[]).map(r=>{const rOpen=expanded[r.id]!==false;const ow=staff.find(s=>s.id===r.owner);const ResIcon=RES_ICONS[r.type]||Pin;
                  return<div key={r.id} style={{marginTop:6}}>
                    <div onClick={()=>toggle(r.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",background:T.card,borderRadius:T.radiusSm-2,cursor:"pointer",border:`1px solid ${T.borderLight}`,transition:T.transition}}>
                      <Arrow open={rOpen}/><ResIcon size={13} color={T.text3}/><span style={{fontSize:12,fontWeight:600,color:T.text1}}>{r.name}</span>
                      {r.platform&&<Badge color={T.text3} small>{r.platform}</Badge>}
                      <span style={{fontSize:10,color:T.text3,display:"flex",alignItems:"center",gap:2}}><UserCircle size={10}/>{ow?.name}</span>
                      <span style={{fontSize:10,color:T.border}}>{(r.actions||[]).length}</span>
                      <div style={{flex:1}}/>
                      <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                        <Btn small v="ghost" onClick={()=>setModal({type:"action",target:{id:uid(),name:"",aType:"recurring",freq:"weekly",count:"",staffId:r.owner||staff[0]?.id,progress:0,deadline:"",hours:2,note:""},pp:{pId:p.id,cId:c.id,rId:r.id}})}><Plus size={12}/></Btn>
                        <Btn small v="ghost" onClick={()=>setModal({type:"resource",target:{...r},pp:{pId:p.id,cId:c.id}})}><Pencil size={12}/></Btn>
                        <Btn small v="danger" onClick={()=>delResource(p.id,c.id,r.id)}><X size={12}/></Btn>
                      </div>
                    </div>
                    {rOpen&&(r.actions||[]).map(a=>{const person=staff.find(s=>s.id===a.staffId);const st=STATUS.find(x=>x.v===a.progress);const ds=getDeadlineStatus(a.deadline,a.progress);
                      return<div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px 7px 28px",borderBottom:`1px solid ${T.borderLight}`,fontSize:12,opacity:a.progress===2?.5:1,transition:T.transition}}>
                        {a.aType==="recurring" ? <RefreshCw size={12} color={T.teal}/> : <Target size={12} color={T.warning}/>}
                        <span style={{fontWeight:600,flex:1,textDecoration:a.progress===2?"line-through":"none",color:T.text1}}>{a.name}</span>
                        {a.count&&<Badge color={T.teal} small>{a.count}</Badge>}
                        {a.deadline&&<Badge color={ds?.color||T.text3} small><CalendarClock size={9} style={{marginRight:2}}/>{a.deadline.slice(5)}{ds&&(ds.level==="overdue"||ds.level==="soon")&&` (${ds.label})`}</Badge>}
                        {(a.dependsOn||[]).length>0&&<Badge color={T.purple} small><GitBranch size={9} style={{marginRight:2}}/>{a.dependsOn.length}依赖</Badge>}
                        {(a.attachments||[]).length>0&&<Badge color={T.teal} small><Paperclip size={9} style={{marginRight:2}}/>{a.attachments.length}</Badge>}
                        <span style={{fontSize:10,color:T.text3,display:"flex",alignItems:"center",gap:2}}><UserCircle size={10}/>{person?.name}</span>
                        <span style={{fontSize:10,color:T.text3}}>{a.hours}h</span>
                        <Badge color={st?.c} small>{st?.l}</Badge>
                        <button onClick={()=>setModal({type:"action",target:{...a},pp:{pId:p.id,cId:c.id,rId:r.id}})} style={{background:"none",border:"none",color:T.text3,cursor:"pointer",padding:2,borderRadius:4,transition:T.transition}}><Pencil size={12}/></button>
                        <button onClick={()=>delAction(p.id,c.id,r.id,a.id)} style={{background:"none",border:"none",color:T.border,cursor:"pointer",padding:2,borderRadius:4,transition:T.transition}}><X size={12}/></button>
                      </div>;})}
                  </div>;})}
              </div>}
            </div>;})}
          <div style={{marginTop:8}}><Btn small v="secondary" onClick={()=>setModal({type:"category",target:{id:uid(),name:"",cat:"新媒体"},pp:{pId:p.id}})}><Plus size={12}/> 类别</Btn></div>
        </div>}
      </Card>;})}

    <Modal open={modal?.type==="project"} onClose={()=>setModal(null)} title="项目" width={460}>
      {modal?.type==="project"&&<ProjForm p={modal.target} onSave={saveProject} onCancel={()=>setModal(null)}/>}
    </Modal>
    <Modal open={modal?.type==="category"} onClose={()=>setModal(null)} title="类别" width={420}>
      {modal?.type==="category"&&<CatForm cat={modal.target} onSave={c=>saveCategory(modal.pp.pId,c)} onCancel={()=>setModal(null)}/>}
    </Modal>
    <Modal open={modal?.type==="resource"} onClose={()=>setModal(null)} title="资源" width={460}>
      {modal?.type==="resource"&&<ResForm res={modal.target} staff={data.staff} onSave={r=>saveResource(modal.pp.pId,modal.pp.cId,r)} onCancel={()=>setModal(null)}/>}
    </Modal>
    <Modal open={modal?.type==="action"} onClose={()=>setModal(null)} title="动作" width={500}>
      {modal?.type==="action"&&<ActForm act={modal.target} staff={data.staff} allActions={getAllActions(projects)} onSave={a=>saveAction(modal.pp.pId,modal.pp.cId,modal.pp.rId,a)} onCancel={()=>setModal(null)}/>}
    </Modal>
  </div>;
}

const PROJECT_COLORS = [T.accent, T.warning, T.purple, T.teal, T.pink, T.success, "#64D2FF", "#5856D6"];

function ProjForm({p,onSave,onCancel}){
  const[f,setF]=useState({milestones:[],...p});
  const[newMs,setNewMs]=useState({name:"",date:"",status:0});
  const addMs=()=>{if(newMs.name.trim()&&newMs.date){setF({...f,milestones:[...(f.milestones||[]),{id:uid(),...newMs}]});setNewMs({name:"",date:"",status:0});}};
  const removeMs=(mid)=>setF({...f,milestones:(f.milestones||[]).filter(m=>m.id!==mid)});
  const updateMs=(mid,updates)=>setF({...f,milestones:(f.milestones||[]).map(m=>m.id===mid?{...m,...updates}:m)});
  return<div>
    <QuickSelect label="颜色" options={PROJECT_COLORS.map(c=>({v:c,l:<div style={{width:20,height:20,borderRadius:"50%",background:c}}/>}))} value={f.color} onChange={v=>setF({...f,color:v})}/>
    <Input label="名称" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
    <Input label="优先级" type="number" value={f.priority} onChange={e=>setF({...f,priority:+e.target.value})}/>
    <label style={{display:"flex",gap:8,marginBottom:16,fontSize:13,alignItems:"center",color:T.text2}}><input type="checkbox" checked={f.isKey} onChange={e=>setF({...f,isKey:e.target.checked})} style={{accentColor:T.accent,width:16,height:16}}/>重点项目</label>

    {/* 里程碑管理 */}
    <div style={{marginBottom:14}}>
      <label style={{display:"block",fontSize:12,fontWeight:600,color:T.text2,marginBottom:6}}>
        <Milestone size={12} style={{marginRight:4,verticalAlign:"middle"}}/> 项目里程碑
      </label>
      {(f.milestones||[]).map(ms=>{const msStatus=MILESTONE_STATUS.find(s=>s.v===ms.status);const ds=getDeadlineStatus(ms.date,ms.status);
        return<div key={ms.id} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",marginBottom:4,background:T.borderLight,borderRadius:6,fontSize:12}}>
          <div onClick={()=>updateMs(ms.id,{status:ms.status===2?0:(ms.status+1)})} style={{cursor:"pointer",color:msStatus?.c}}><StatusIcon v={ms.status} size={14}/></div>
          <span style={{fontWeight:600,flex:1,color:ms.status===2?T.text3:T.text1,textDecoration:ms.status===2?"line-through":"none"}}>{ms.name}</span>
          <span style={{fontSize:10,color:ds?.color||T.text3}}>{ms.date}</span>
          {ds&&(ds.level==="overdue"||ds.level==="today")&&<Badge color={T.danger} small>{ds.label}</Badge>}
          <button onClick={()=>removeMs(ms.id)} style={{background:"none",border:"none",color:T.danger,cursor:"pointer",padding:2}}><X size={10}/></button>
        </div>;})}
      <div style={{display:"flex",gap:4,alignItems:"flex-end"}}>
        <div style={{flex:1}}><input value={newMs.name} onChange={e=>setNewMs({...newMs,name:e.target.value})} placeholder="里程碑名称"
          style={{width:"100%",padding:"6px 10px",borderRadius:6,border:`1.5px solid ${T.border}`,fontSize:11,outline:"none",fontFamily:T.font}}/></div>
        <input type="date" value={newMs.date} onChange={e=>setNewMs({...newMs,date:e.target.value})}
          style={{padding:"6px 10px",borderRadius:6,border:`1.5px solid ${T.border}`,fontSize:11,outline:"none",fontFamily:T.font}}/>
        <Btn small v="secondary" onClick={addMs} disabled={!newMs.name.trim()||!newMs.date}><Plus size={10}/></Btn>
      </div>
    </div>

    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={onCancel}>取消</Btn><Btn onClick={()=>onSave(f)} disabled={!f.name.trim()}>保存</Btn></div>
  </div>;
}
function CatForm({cat,onSave,onCancel}){const[f,setF]=useState(cat);return<div><Input label="名称" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><QuickSelect label="标签" options={Object.keys(CAT_COLORS)} value={f.cat} onChange={v=>setF({...f,cat:v})}/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={onCancel}>取消</Btn><Btn onClick={()=>onSave(f)} disabled={!f.name.trim()}>保存</Btn></div></div>;}
function ResForm({res,staff,onSave,onCancel}){const[f,setF]=useState(res);return<div><Input label="名称" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><QuickSelect label="类型" options={RES_TYPES} value={f.type} onChange={v=>setF({...f,type:v})}/><QuickSelect label="平台" options={[{v:"",l:"无"},{v:"抖音",l:"抖音"},{v:"小红书",l:"小红书"},{v:"微信公众号",l:"微信公众号"},{v:"微信视频号",l:"微信视频号"},{v:"大众点评",l:"大众点评"},{v:"美团",l:"美团"},{v:"饿了么",l:"饿了么"},{v:"快手",l:"快手"},{v:"微博",l:"微博"}]} value={f.platform||""} onChange={v=>setF({...f,platform:v})}/><QuickSelect label="负责人" options={staff.map(s=>({v:s.id,l:s.name}))} value={f.owner} onChange={v=>setF({...f,owner:v})}/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={onCancel}>取消</Btn><Btn onClick={()=>onSave(f)} disabled={!f.name.trim()}>保存</Btn></div></div>;}
function ActForm({act,staff,onSave,onCancel,allActions=[]}){
  const[f,setF]=useState({actionPriority:2,dependsOn:[],attachments:[],...act});
  const[newLink,setNewLink]=useState("");
  const availDeps=allActions.filter(a=>a.id!==f.id);
  const addLink=()=>{if(newLink.trim()){setF({...f,attachments:[...(f.attachments||[]),{id:uid(),url:newLink.trim(),name:newLink.trim().split("/").pop()||"链接"}]});setNewLink("");}};
  const removeLink=(lid)=>setF({...f,attachments:(f.attachments||[]).filter(a=>a.id!==lid)});
  const toggleDep=(depId)=>{const deps=f.dependsOn||[];setF({...f,dependsOn:deps.includes(depId)?deps.filter(d=>d!==depId):[...deps,depId]});};
  return<div>
    <Input label="名称" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
    <QuickSelect label="优先级" options={PRIORITY_OPTS.map(p=>({v:p.v,l:p.l}))} value={f.actionPriority} onChange={v=>setF({...f,actionPriority:+v})}/>
    <QuickSelect label="类型" options={[{v:"recurring",l:"周期性"},{v:"once",l:"一次性"}]} value={f.aType} onChange={v=>setF({...f,aType:v})}/>
    {f.aType==="recurring"&&<><QuickSelect label="频率" options={FREQ_OPTS} value={f.freq} onChange={v=>setF({...f,freq:v})}/><Input label="产出量" value={f.count||""} onChange={e=>setF({...f,count:e.target.value})}/></>}
    {f.aType==="once"&&<Input label="截止日期" type="date" value={f.deadline||""} onChange={e=>setF({...f,deadline:e.target.value})}/>}
    <QuickSelect label="分配给" options={staff.map(s=>({v:s.id,l:s.name}))} value={f.staffId} onChange={v=>setF({...f,staffId:v})}/>
    <Input label="周工时" type="number" min="0" max="40" step="0.5" value={f.hours||0} onChange={e=>setF({...f,hours:+e.target.value})}/>
    <Input label="备注" value={f.note||""} onChange={e=>setF({...f,note:e.target.value})}/>

    {/* 任务依赖 */}
    <div style={{marginBottom:14}}>
      <label style={{display:"block",fontSize:12,fontWeight:600,color:T.text2,marginBottom:6}}>
        <GitBranch size={12} style={{marginRight:4,verticalAlign:"middle"}}/> 前置依赖
      </label>
      {availDeps.length>0?<div style={{display:"flex",flexWrap:"wrap",gap:4,maxHeight:120,overflowY:"auto",padding:4}}>
        {availDeps.map(dep=>{const sel=(f.dependsOn||[]).includes(dep.id);
          return<button key={dep.id} onClick={()=>toggleDep(dep.id)} style={{padding:"4px 10px",borderRadius:16,fontSize:11,fontWeight:600,border:`1.5px solid ${sel?T.accent:T.border}`,background:sel?T.accentLight:T.card,color:sel?T.accent:T.text2,cursor:"pointer",transition:T.transition,display:"flex",alignItems:"center",gap:4}}>
            {sel&&<Check size={10}/>}<ProjectDot color={dep.projectColor} size={6}/>{dep.name}
          </button>;})}
      </div>:<div style={{fontSize:11,color:T.text3,padding:4}}>暂无可选依赖任务</div>}
      {(f.dependsOn||[]).length>0&&<div style={{fontSize:11,color:T.accent,marginTop:4}}>已选 {f.dependsOn.length} 个前置任务</div>}
    </div>

    {/* 附件链接 */}
    <div style={{marginBottom:14}}>
      <label style={{display:"block",fontSize:12,fontWeight:600,color:T.text2,marginBottom:6}}>
        <Paperclip size={12} style={{marginRight:4,verticalAlign:"middle"}}/> 附件/链接
      </label>
      {(f.attachments||[]).map(att=><div key={att.id} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",marginBottom:4,background:T.borderLight,borderRadius:6,fontSize:11}}>
        <Link2 size={10} color={T.accent}/>
        <a href={att.url} target="_blank" rel="noreferrer" style={{color:T.accent,textDecoration:"none",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{att.name}</a>
        <button onClick={()=>removeLink(att.id)} style={{background:"none",border:"none",color:T.danger,cursor:"pointer",padding:2}}><X size={10}/></button>
      </div>)}
      <div style={{display:"flex",gap:4}}>
        <input value={newLink} onChange={e=>setNewLink(e.target.value)} placeholder="粘贴文件/设计稿链接..." onKeyDown={e=>e.key==="Enter"&&addLink()}
          style={{flex:1,padding:"6px 10px",borderRadius:6,border:`1.5px solid ${T.border}`,fontSize:11,outline:"none",fontFamily:T.font}}/>
        <Btn small v="secondary" onClick={addLink} disabled={!newLink.trim()}><Plus size={10}/></Btn>
      </div>
    </div>

    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={onCancel}>取消</Btn><Btn onClick={()=>onSave(f)} disabled={!f.name.trim()}>保存</Btn></div>
  </div>;
}

// ─── Kanban ─────────────────────────────
function KanbanView({data,save,auditLog,user}){const{projects,staff}=data;const actions=getAllActions(projects);const[filter,setFilter]=useState("all");const[dragItem,setDragItem]=useState(null);
  const visible=actions.filter(a=>filter==="all"||a.projectId===filter).sort((a,b)=>(a.actionPriority??2)-(b.actionPriority??2));
  const columns=STATUS.map(s=>({...s,items:visible.filter(a=>a.progress===s.v)}));
  return<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:700,color:T.text1,display:"flex",alignItems:"center",gap:8}}><ClipboardList size={22}/> 看板</h2>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        <button onClick={()=>setFilter("all")} style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:600,border:`1.5px solid ${filter==="all"?T.accent:T.border}`,background:filter==="all"?T.accentLight:T.card,color:filter==="all"?T.accent:T.text2,cursor:"pointer",transition:T.transition,boxShadow:filter==="all"?T.shadowBtn:"none"}}>全部</button>
        {projects.map(p=><button key={p.id} onClick={()=>setFilter(p.id)} style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:600,border:`1.5px solid ${filter===p.id?T.accent:T.border}`,background:filter===p.id?T.accentLight:T.card,color:filter===p.id?T.accent:T.text2,cursor:"pointer",transition:T.transition,display:"flex",alignItems:"center",gap:4,boxShadow:filter===p.id?T.shadowBtn:"none"}}><ProjectDot color={p.color} size={8}/>{p.name.slice(0,3)}</button>)}
      </div>
    </div>
    <div className="grid-responsive-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
      {columns.map(col=><div key={col.v} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(dragItem){
        const oldStatus = STATUS.find(s=>s.v===dragItem.progress);
        save({...data,projects:updateActionInProjects(projects,dragItem.id,{progress:col.v})});
        if(auditLog&&user)auditLog.addLog(user.id,user.name,"status_change","任务",dragItem.name,{field:"progress",before_value:oldStatus?.l,after_value:col.l});
      }setDragItem(null);}} style={{background:T.borderLight,borderRadius:T.radius,padding:14,minHeight:300}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,padding:"0 4px"}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:col.c}}/>
          <span style={{fontSize:13,fontWeight:700,color:T.text1}}>{col.l}</span>
          <span style={{fontSize:11,color:T.text3,marginLeft:"auto"}}>{col.items.length}</span>
        </div>
        {col.items.map(a=>{const person=staff.find(s=>s.id===a.staffId);const ds=getDeadlineStatus(a.deadline,a.progress);const pri=PRIORITY_OPTS.find(p=>p.v===(a.actionPriority??2));
          return<div key={a.id} draggable onDragStart={e=>{e.dataTransfer.effectAllowed="move";setDragItem(a);}} style={{background:T.card,borderRadius:T.radius,padding:"12px 14px",cursor:"grab",borderLeft:`3px solid ${pri?.c||T.accent}`,boxShadow:T.shadow,marginBottom:8,transition:T.transition}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow=T.shadowMd} onMouseLeave={e=>e.currentTarget.style.boxShadow=T.shadow}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:4,color:T.text1,display:"flex",alignItems:"center",gap:6}}>
              {a.name}
              <Badge color={pri?.c||T.accent} small>{pri?.l?.split(" ")[0]||"P2"}</Badge>
              {ds&&(ds.level==="overdue"||ds.level==="today")&&<Badge color={T.danger} small>{ds.label}</Badge>}
              {ds&&ds.level==="soon"&&<Badge color={T.warning} small>{ds.label}</Badge>}
            </div>
            <div style={{fontSize:10,color:T.text3,marginBottom:6,display:"flex",alignItems:"center",gap:4}}><ProjectDot color={a.projectColor} size={6}/> {a.projectName} · {a.resName}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,color:T.text2,display:"flex",alignItems:"center",gap:4}}><Avatar name={person?.name} color={person?.color||T.accent} size={18}/> {person?.name}</span>
              <span style={{fontSize:10,color:T.text3,display:"flex",alignItems:"center",gap:2}}><Clock size={10}/>{a.hours}h</span>
            </div>
          </div>;
        })}
      </div>)}
    </div>
  </div>;
}

// ─── Task Filter View ────────────────────
function TaskFilterView({data,save,auditLog,user}){
  const{projects,staff}=data;
  const actions=getAllActions(projects);
  const[projFilter,setProjFilter]=useState("all");
  const[staffFilter,setStaffFilter]=useState("all");
  const[priFilter,setPriFilter]=useState("all");
  const[statusFilter,setStatusFilter]=useState("all");

  const visible=actions.filter(a=>{
    if(projFilter!=="all"&&a.projectId!==projFilter)return false;
    if(staffFilter!=="all"&&a.staffId!==staffFilter)return false;
    if(priFilter!=="all"&&(a.actionPriority??2)!==+priFilter)return false;
    if(statusFilter!=="all"&&a.progress!==+statusFilter)return false;
    return true;
  }).sort((a,b)=>(a.actionPriority??2)-(b.actionPriority??2));

  const changeStatus=(actionId,newProgress)=>{
    const act=actions.find(a=>a.id===actionId);
    const oldStatus=STATUS.find(s=>s.v===act?.progress);
    const newStatus=STATUS.find(s=>s.v===newProgress);
    save({...data,projects:updateActionInProjects(projects,actionId,{progress:newProgress})});
    if(auditLog&&user)auditLog.addLog(user.id,user.name,"status_change","任务",act?.name||"",{before_value:oldStatus?.l,after_value:newStatus?.l});
  };

  const FilterPill=({label,active,onClick})=><button onClick={onClick} style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:600,border:`1.5px solid ${active?T.accent:T.border}`,background:active?T.accentLight:T.card,color:active?T.accent:T.text2,cursor:"pointer",transition:T.transition,boxShadow:active?`0 0 0 2px ${T.accent}20`:"none"}}>{label}</button>;

  return<div>
    <h2 style={{margin:"0 0 20px",fontSize:22,fontWeight:700,color:T.text1,display:"flex",alignItems:"center",gap:8}}><Filter size={22}/> 任务筛选</h2>

    {/* Filter bars */}
    <Card style={{padding:"16px 20px",marginBottom:16}}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:12,fontWeight:700,color:T.text2,width:56,flexShrink:0}}>项目</span>
          <FilterPill label="全部" active={projFilter==="all"} onClick={()=>setProjFilter("all")}/>
          {projects.map(p=><FilterPill key={p.id} label={<span style={{display:"flex",alignItems:"center",gap:4}}><ProjectDot color={p.color} size={8}/>{p.name}</span>} active={projFilter===p.id} onClick={()=>setProjFilter(p.id)}/>)}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:12,fontWeight:700,color:T.text2,width:56,flexShrink:0}}>人员</span>
          <FilterPill label="全部" active={staffFilter==="all"} onClick={()=>setStaffFilter("all")}/>
          {staff.map(s=><FilterPill key={s.id} label={<span style={{display:"flex",alignItems:"center",gap:4}}><Avatar name={s.name} color={s.color} size={16}/>{s.name}</span>} active={staffFilter===s.id} onClick={()=>setStaffFilter(s.id)}/>)}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:12,fontWeight:700,color:T.text2,width:56,flexShrink:0}}>优先级</span>
          <FilterPill label="全部" active={priFilter==="all"} onClick={()=>setPriFilter("all")}/>
          {PRIORITY_OPTS.map(p=><FilterPill key={p.v} label={p.l} active={priFilter===String(p.v)} onClick={()=>setPriFilter(String(p.v))}/>)}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:12,fontWeight:700,color:T.text2,width:56,flexShrink:0}}>状态</span>
          <FilterPill label="全部" active={statusFilter==="all"} onClick={()=>setStatusFilter("all")}/>
          {STATUS.map(s=><FilterPill key={s.v} label={s.l} active={statusFilter===String(s.v)} onClick={()=>setStatusFilter(String(s.v))}/>)}
        </div>
      </div>
    </Card>

    {/* Stats bar */}
    <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center"}}>
      <span style={{fontSize:13,color:T.text2}}>共 <strong style={{color:T.accent}}>{visible.length}</strong> 条任务</span>
      <span style={{fontSize:12,color:T.text3}}>·</span>
      <span style={{fontSize:12,color:T.success}}>已完成 {visible.filter(a=>a.progress===2).length}</span>
      <span style={{fontSize:12,color:T.text3}}>·</span>
      <span style={{fontSize:12,color:T.warning}}>进行中 {visible.filter(a=>a.progress===1).length}</span>
      <span style={{fontSize:12,color:T.text3}}>·</span>
      <span style={{fontSize:12,color:T.text3}}>未开始 {visible.filter(a=>a.progress===0).length}</span>
      <span style={{fontSize:12,color:T.text3,marginLeft:"auto"}}>总工时 {visible.reduce((s,a)=>s+(a.hours||0),0)}h</span>
    </div>

    {/* Task list */}
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {visible.length===0&&<Card style={{textAlign:"center",padding:40,color:T.text3}}>没有匹配的任务</Card>}
      {visible.map(a=>{
        const person=staff.find(s=>s.id===a.staffId);
        const ds=getDeadlineStatus(a.deadline,a.progress);
        const pri=PRIORITY_OPTS.find(p=>p.v===(a.actionPriority??2));
        const st=STATUS.find(s=>s.v===a.progress);
        return<Card key={a.id} style={{padding:"14px 20px",borderLeft:`3px solid ${pri?.c||T.accent}`}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {/* Status toggle */}
            <div onClick={()=>changeStatus(a.id,a.progress===2?0:a.progress+1)} style={{cursor:"pointer",color:st?.c,flexShrink:0}} title={`点击切换: ${STATUS[(a.progress+1)%3]?.l}`}>
              <StatusIcon v={a.progress} size={18}/>
            </div>
            {/* Main info */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <span style={{fontSize:14,fontWeight:600,color:a.progress===2?T.text3:T.text1,textDecoration:a.progress===2?"line-through":"none"}}>{a.name}</span>
                <Badge color={pri?.c||T.accent} small>{pri?.l?.split(" ")[0]||"P2"}</Badge>
                {a.aType==="recurring"&&<Badge color={T.purple} small>{a.freq==="daily"?"每日":a.freq==="weekly"?"每周":a.freq==="biweekly"?"双周":"每月"} {a.count}</Badge>}
                {(a.dependsOn||[]).length>0&&<Badge color={T.purple} small><GitBranch size={9} style={{marginRight:2}}/>{a.dependsOn.length}依赖</Badge>}
                {(a.attachments||[]).length>0&&<Badge color={T.teal} small><Paperclip size={9} style={{marginRight:2}}/>{a.attachments.length}</Badge>}
                {ds&&(ds.level==="overdue"||ds.level==="today")&&<Badge color={T.danger} small>{ds.label}</Badge>}
                {ds&&ds.level==="soon"&&<Badge color={T.warning} small>{ds.label}</Badge>}
              </div>
              <div style={{fontSize:11,color:T.text3,display:"flex",alignItems:"center",gap:8}}>
                <span style={{display:"flex",alignItems:"center",gap:3}}><ProjectDot color={a.projectColor} size={6}/>{a.projectName}</span>
                <span>·</span>
                <span>{a.catName}</span>
                <span>·</span>
                <span>{a.resName}</span>
                {a.deadline&&<><span>·</span><span style={{display:"flex",alignItems:"center",gap:2}}><CalendarDays size={10}/>{a.deadline}</span></>}
              </div>
            </div>
            {/* Right side */}
            <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
              <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:T.text2}}>
                <Avatar name={person?.name} color={person?.color||T.accent} size={20}/>{person?.name}
              </span>
              <span style={{fontSize:11,color:T.text3,display:"flex",alignItems:"center",gap:2}}><Clock size={11}/>{a.hours}h</span>
            </div>
          </div>
        </Card>;
      })}
    </div>
  </div>;
}

// ─── Gantt / Timeline ────────────────────
function GanttView({data}){
  const{projects,staff}=data;
  const actions=getAllActions(projects);
  const[projFilter,setProjFilter]=useState("all");
  const[viewWeeks,setViewWeeks]=useState(8);

  const today=new Date();today.setHours(0,0,0,0);
  const startDate=new Date(today);startDate.setDate(startDate.getDate()-7); // start 1 week ago
  const endDate=new Date(startDate);endDate.setDate(endDate.getDate()+viewWeeks*7);
  const totalDays=Math.ceil((endDate-startDate)/86400000);

  const filteredActions=actions.filter(a=>{
    if(projFilter!=="all"&&a.projectId!==projFilter)return false;
    return a.aType==="once"&&a.deadline; // only show timed tasks
  }).sort((a,b)=>(a.actionPriority??2)-(b.actionPriority??2));

  // Group by project
  const byProject={};
  filteredActions.forEach(a=>{
    if(!byProject[a.projectId])byProject[a.projectId]={name:a.projectName,color:a.projectColor,actions:[],milestones:(projects.find(p=>p.id===a.projectId)?.milestones||[])};
    byProject[a.projectId].actions.push(a);
  });
  // Also include projects with milestones only
  projects.forEach(p=>{
    if(projFilter!=="all"&&p.id!==projFilter)return;
    if(!byProject[p.id]&&(p.milestones||[]).length>0)byProject[p.id]={name:p.name,color:p.color,actions:[],milestones:p.milestones||[]};
  });

  const dayToX=(date)=>{const d=new Date(date);d.setHours(0,0,0,0);return Math.max(0,Math.min(100,(d-startDate)/86400000/totalDays*100));};
  const todayX=dayToX(today);

  // Generate week labels
  const weekLabels=[];
  for(let i=0;i<viewWeeks;i++){const d=new Date(startDate);d.setDate(d.getDate()+i*7);weekLabels.push({date:d,label:`${d.getMonth()+1}/${d.getDate()}`,x:i*7/totalDays*100});}

  return<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:700,color:T.text1,display:"flex",alignItems:"center",gap:8}}><GanttChartSquare size={22}/> 甘特图</h2>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <div style={{display:"flex",gap:4}}>
          {[{v:4,l:"4周"},{v:8,l:"8周"},{v:12,l:"12周"}].map(w=><button key={w.v} onClick={()=>setViewWeeks(w.v)} style={{padding:"5px 12px",borderRadius:16,fontSize:11,fontWeight:600,border:`1.5px solid ${viewWeeks===w.v?T.accent:T.border}`,background:viewWeeks===w.v?T.accentLight:T.card,color:viewWeeks===w.v?T.accent:T.text2,cursor:"pointer",transition:T.transition}}>{w.l}</button>)}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          <button onClick={()=>setProjFilter("all")} style={{padding:"5px 12px",borderRadius:16,fontSize:11,fontWeight:600,border:`1.5px solid ${projFilter==="all"?T.accent:T.border}`,background:projFilter==="all"?T.accentLight:T.card,color:projFilter==="all"?T.accent:T.text2,cursor:"pointer",transition:T.transition}}>全部</button>
          {projects.map(p=><button key={p.id} onClick={()=>setProjFilter(p.id)} style={{padding:"5px 12px",borderRadius:16,fontSize:11,fontWeight:600,border:`1.5px solid ${projFilter===p.id?T.accent:T.border}`,background:projFilter===p.id?T.accentLight:T.card,color:projFilter===p.id?T.accent:T.text2,cursor:"pointer",transition:T.transition,display:"flex",alignItems:"center",gap:4}}><ProjectDot color={p.color} size={6}/>{p.name.slice(0,3)}</button>)}
        </div>
      </div>
    </div>

    {filteredActions.length===0&&Object.keys(byProject).length===0?
      <Card style={{textAlign:"center",padding:40,color:T.text3}}><GanttChartSquare size={40} strokeWidth={1} style={{marginBottom:12}}/><div>暂无带截止日期的一次性任务</div><div style={{fontSize:12,marginTop:4}}>在项目管理中为任务设置截止日期即可在此显示</div></Card>:
      <Card style={{padding:0,overflow:"hidden"}}>
        {/* Timeline header */}
        <div style={{position:"relative",height:36,background:T.borderLight,borderBottom:`1px solid ${T.border}`,padding:"0 200px 0 0"}}>
          <div style={{position:"absolute",left:0,width:200,height:"100%",background:T.borderLight,borderRight:`1px solid ${T.border}`,display:"flex",alignItems:"center",padding:"0 16px",fontSize:12,fontWeight:700,color:T.text2,zIndex:2}}>任务</div>
          <div style={{position:"relative",marginLeft:200,height:"100%"}}>
            {weekLabels.map((w,i)=><div key={i} style={{position:"absolute",left:w.x+"%",top:0,height:"100%",borderLeft:`1px solid ${T.border}`,display:"flex",alignItems:"center",paddingLeft:6,fontSize:10,color:T.text3,fontWeight:600}}>{w.label}</div>)}
            {/* Today line */}
            <div style={{position:"absolute",left:todayX+"%",top:0,height:"100%",borderLeft:`2px solid ${T.danger}`,zIndex:1}}/>
          </div>
        </div>

        {/* Project groups */}
        {Object.entries(byProject).map(([pId,proj])=><div key={pId}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:"#FAFAFA",borderBottom:`1px solid ${T.borderLight}`,fontSize:12,fontWeight:700,color:T.text1}}>
            <ProjectDot color={proj.color} size={8}/>{proj.name}
            <span style={{fontSize:10,color:T.text3,fontWeight:500}}>{proj.actions.length} 任务</span>
          </div>

          {/* Milestones row */}
          {proj.milestones.length>0&&<div style={{position:"relative",height:28,borderBottom:`1px solid ${T.borderLight}`}}>
            <div style={{position:"absolute",left:0,width:200,height:"100%",display:"flex",alignItems:"center",padding:"0 16px",fontSize:11,color:T.purple,fontWeight:600,background:T.card,borderRight:`1px solid ${T.borderLight}`}}>
              <Milestone size={11} style={{marginRight:4}}/> 里程碑
            </div>
            <div style={{position:"relative",marginLeft:200,height:"100%"}}>
              {proj.milestones.map(ms=>{const x=dayToX(ms.date);const msS=MILESTONE_STATUS.find(s=>s.v===ms.status);
                return<div key={ms.id} title={`${ms.name} - ${ms.date}`} style={{position:"absolute",left:`calc(${x}% - 8px)`,top:6,width:16,height:16,borderRadius:"50%",background:msS?.c||T.text3,border:`2px solid ${T.card}`,boxShadow:T.shadow,cursor:"default",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:7,color:"#fff",fontWeight:800}}>{ms.name.slice(0,1)}</div>
                </div>;})}
              <div style={{position:"absolute",left:todayX+"%",top:0,height:"100%",borderLeft:`2px solid ${T.danger}`,zIndex:1}}/>
            </div>
          </div>}

          {/* Task bars */}
          {proj.actions.map(a=>{const person=staff.find(s=>s.id===a.staffId);const ds=getDeadlineStatus(a.deadline,a.progress);const pri=PRIORITY_OPTS.find(p=>p.v===(a.actionPriority??2));
            const deadlineX=dayToX(a.deadline);
            // Estimate start as deadline minus hours*2 days (rough)
            const estDays=Math.max(3,(a.hours||2)*2);
            const startD=new Date(a.deadline);startD.setDate(startD.getDate()-estDays);
            const startX=dayToX(startD);
            const barWidth=Math.max(2,deadlineX-startX);
            const barColor=a.progress===2?T.success:pri?.c||T.accent;
            return<div key={a.id} style={{position:"relative",height:32,borderBottom:`1px solid ${T.borderLight}`}}>
              <div style={{position:"absolute",left:0,width:200,height:"100%",display:"flex",alignItems:"center",padding:"0 16px",fontSize:11,fontWeight:600,color:a.progress===2?T.text3:T.text1,background:T.card,borderRight:`1px solid ${T.borderLight}`,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",gap:6,textDecoration:a.progress===2?"line-through":"none"}}>
                <StatusIcon v={a.progress} size={11}/>
                <span style={{overflow:"hidden",textOverflow:"ellipsis"}}>{a.name}</span>
              </div>
              <div style={{position:"relative",marginLeft:200,height:"100%"}}>
                {/* Bar */}
                <div title={`${a.name}\n${person?.name} · ${a.deadline}${ds?` · ${ds.label}`:""}`} style={{position:"absolute",left:startX+"%",top:8,width:barWidth+"%",height:16,borderRadius:8,background:barColor+"30",border:`1.5px solid ${barColor}`,transition:T.transition,cursor:"default"}}>
                  {a.progress===1&&<div style={{height:"100%",width:"50%",background:barColor+"50",borderRadius:8}}/>}
                  {a.progress===2&&<div style={{height:"100%",width:"100%",background:barColor+"50",borderRadius:8}}/>}
                </div>
                {/* Dependency arrows */}
                {(a.dependsOn||[]).map(depId=>{const dep=filteredActions.find(x=>x.id===depId);if(!dep)return null;const depX=dayToX(dep.deadline);
                  return<div key={depId} style={{position:"absolute",left:depX+"%",top:16,width:Math.max(0,startX-depX)+"%",height:0,borderTop:`1.5px dashed ${T.purple}40`}}/>;
                })}
                <div style={{position:"absolute",left:todayX+"%",top:0,height:"100%",borderLeft:`2px solid ${T.danger}`,zIndex:1,opacity:0.3}}/>
              </div>
            </div>;})}
        </div>)}
      </Card>}
  </div>;
}

// ─── Timeline View (linear chronological) ───
function TimelineView({data,save,auditLog,user}){
  const{projects,staff}=data;
  const actions=getAllActions(projects);
  const[projFilter,setProjFilter]=useState("all");
  const[staffFilter,setStaffFilter]=useState("all");
  const[statusFilter,setStatusFilter]=useState("all");
  const[groupBy,setGroupBy]=useState("date"); // date | project | staff

  // Only tasks with deadlines, sorted by date
  const sorted=actions.filter(a=>{
    if(!a.deadline)return false;
    if(projFilter!=="all"&&a.projectId!==projFilter)return false;
    if(staffFilter!=="all"&&a.staffId!==staffFilter)return false;
    if(statusFilter!=="all"&&a.progress!==+statusFilter)return false;
    return true;
  }).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));

  const changeStatus=(actionId,newProgress)=>{
    const act=actions.find(a=>a.id===actionId);
    const oldStatus=STATUS.find(s=>s.v===act?.progress);
    const newStatus=STATUS.find(s=>s.v===newProgress);
    save({...data,projects:updateActionInProjects(projects,actionId,{progress:newProgress})});
    if(auditLog&&user)auditLog.addLog(user.id,user.name,"status_change","任务",act?.name||"",{before_value:oldStatus?.l,after_value:newStatus?.l});
  };

  const today=new Date();today.setHours(0,0,0,0);

  // Group tasks
  const groups=[];
  if(groupBy==="date"){
    const byDate={};
    sorted.forEach(a=>{const k=a.deadline;if(!byDate[k])byDate[k]=[];byDate[k].push(a);});
    Object.entries(byDate).forEach(([date,items])=>{
      const d=new Date(date);d.setHours(0,0,0,0);
      const diff=Math.round((d-today)/86400000);
      let tag="",tagColor=T.text3;
      if(diff<0){tag=`已过 ${-diff} 天`;tagColor=T.danger;}
      else if(diff===0){tag="今天";tagColor=T.danger;}
      else if(diff===1){tag="明天";tagColor=T.warning;}
      else if(diff<=7){tag=`${diff} 天后`;tagColor=T.warning;}
      else{tag=`${diff} 天后`;tagColor=T.text3;}
      const weekDay=["周日","周一","周二","周三","周四","周五","周六"][d.getDay()];
      groups.push({key:date,label:`${date} ${weekDay}`,tag,tagColor,items,isPast:diff<0,isToday:diff===0});
    });
  }else if(groupBy==="project"){
    const byProj={};
    sorted.forEach(a=>{if(!byProj[a.projectId])byProj[a.projectId]={name:a.projectName,color:a.projectColor,items:[]};byProj[a.projectId].items.push(a);});
    Object.entries(byProj).forEach(([id,g])=>groups.push({key:id,label:g.name,tag:`${g.items.length} 项`,tagColor:g.color,items:g.items,color:g.color}));
  }else{
    const byStaff={};
    sorted.forEach(a=>{const sid=a.staffId||"unassigned";if(!byStaff[sid])byStaff[sid]={name:staff.find(s=>s.id===sid)?.name||"未分配",color:staff.find(s=>s.id===sid)?.color||T.text3,items:[]};byStaff[sid].items.push(a);});
    Object.entries(byStaff).forEach(([id,g])=>groups.push({key:id,label:g.name,tag:`${g.items.length} 项`,tagColor:g.color,items:g.items,color:g.color}));
  }

  // Find today's position for the "today" marker
  const todayStr=today.toISOString().slice(0,10);

  const FilterPill=({label,active,onClick})=><button onClick={onClick} style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:600,border:`1.5px solid ${active?T.accent:T.border}`,background:active?T.accentLight:T.card,color:active?T.accent:T.text2,cursor:"pointer",transition:T.transition}}>{label}</button>;

  return<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:700,color:T.text1,display:"flex",alignItems:"center",gap:8}}><CalendarClock size={22}/> 时间线</h2>
      <div style={{display:"flex",gap:6}}>
        {[{v:"date",l:"按日期"},{v:"project",l:"按项目"},{v:"staff",l:"按人员"}].map(g=>
          <button key={g.v} onClick={()=>setGroupBy(g.v)} style={{padding:"5px 14px",borderRadius:16,fontSize:11,fontWeight:600,border:`1.5px solid ${groupBy===g.v?T.accent:T.border}`,background:groupBy===g.v?T.accentLight:T.card,color:groupBy===g.v?T.accent:T.text2,cursor:"pointer",transition:T.transition}}>{g.l}</button>
        )}
      </div>
    </div>

    {/* Filters */}
    <Card style={{padding:"14px 18px",marginBottom:16}}>
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span style={{fontSize:11,fontWeight:700,color:T.text2}}>项目</span>
          <FilterPill label="全部" active={projFilter==="all"} onClick={()=>setProjFilter("all")}/>
          {projects.map(p=><FilterPill key={p.id} label={<span style={{display:"flex",alignItems:"center",gap:3}}><ProjectDot color={p.color} size={6}/>{p.name}</span>} active={projFilter===p.id} onClick={()=>setProjFilter(p.id)}/>)}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span style={{fontSize:11,fontWeight:700,color:T.text2}}>人员</span>
          <FilterPill label="全部" active={staffFilter==="all"} onClick={()=>setStaffFilter("all")}/>
          {staff.map(s=><FilterPill key={s.id} label={s.name} active={staffFilter===s.id} onClick={()=>setStaffFilter(s.id)}/>)}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span style={{fontSize:11,fontWeight:700,color:T.text2}}>状态</span>
          <FilterPill label="全部" active={statusFilter==="all"} onClick={()=>setStatusFilter("all")}/>
          {STATUS.map(s=><FilterPill key={s.v} label={s.l} active={statusFilter===String(s.v)} onClick={()=>setStatusFilter(String(s.v))}/>)}
        </div>
      </div>
    </Card>

    {/* Stats */}
    <div style={{display:"flex",gap:12,marginBottom:18}}>
      {[
        {l:"总任务",v:sorted.length,c:T.accent},
        {l:"已完成",v:sorted.filter(a=>a.progress===2).length,c:T.success},
        {l:"进行中",v:sorted.filter(a=>a.progress===1).length,c:T.warning},
        {l:"未开始",v:sorted.filter(a=>a.progress===0).length,c:T.text3},
        {l:"已逾期",v:sorted.filter(a=>{const d=new Date(a.deadline);d.setHours(0,0,0,0);return d<today&&a.progress!==2;}).length,c:T.danger},
      ].map(s=><Card key={s.l} style={{flex:1,padding:"12px 16px",textAlign:"center"}}>
        <div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div>
        <div style={{fontSize:11,color:T.text3}}>{s.l}</div>
      </Card>)}
    </div>

    {/* Timeline */}
    {sorted.length===0?
      <Card style={{textAlign:"center",padding:48,color:T.text3}}><CalendarClock size={40} strokeWidth={1} style={{marginBottom:12}}/><div>暂无带截止日期的任务</div></Card>:
      <div style={{position:"relative"}}>
        {/* Vertical line */}
        <div style={{position:"absolute",left:19,top:0,bottom:0,width:2,background:T.borderLight,zIndex:0}}/>

        {groups.map((group,gi)=>{
          const isDateGroup = groupBy==="date";
          return<div key={group.key} style={{marginBottom:24}}>
            {/* Group header */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,position:"relative",zIndex:1}}>
              <div style={{width:40,height:40,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                background: group.isToday ? T.danger : group.isPast ? T.text3+"20" : (group.color || T.accent + "15"),
                border: `2px solid ${group.isToday ? T.danger : group.isPast ? T.text3 : (group.color || T.accent)}`,
                color: group.isToday ? "#fff" : group.isPast ? T.text3 : (group.color || T.accent)}}>
                {isDateGroup
                  ? <span style={{fontSize:12,fontWeight:800}}>{group.label.split("-").pop().split(" ")[0]}</span>
                  : groupBy==="project" ? <ProjectDot color={group.color} size={10}/>
                  : <span style={{fontSize:14,fontWeight:700}}>{group.label.slice(0,1)}</span>}
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:group.isToday?T.danger:group.isPast?T.text3:T.text1,display:"flex",alignItems:"center",gap:8}}>
                  {group.label}
                  <Badge color={group.tagColor} small>{group.tag}</Badge>
                </div>
                <div style={{fontSize:11,color:T.text3}}>{group.items.length} 项任务 · {group.items.filter(a=>a.progress===2).length} 已完成</div>
              </div>
            </div>

            {/* Tasks in this group */}
            <div style={{marginLeft:19,paddingLeft:28,borderLeft:`2px solid ${group.isToday?T.danger+"40":T.borderLight}`,display:"flex",flexDirection:"column",gap:6}}>
              {group.items.map(a=>{
                const person=staff.find(s=>s.id===a.staffId);
                const ds=getDeadlineStatus(a.deadline,a.progress);
                const pri=PRIORITY_OPTS.find(p=>p.v===(a.actionPriority??2));
                const st=STATUS.find(s=>s.v===a.progress);
                const isOverdue=ds&&ds.level==="overdue"&&a.progress!==2;
                return<div key={a.id} style={{
                  position:"relative",padding:"10px 16px",borderRadius:T.radiusSm,
                  background:isOverdue?T.danger+"08":a.progress===2?T.success+"06":T.card,
                  border:`1px solid ${isOverdue?T.danger+"30":a.progress===2?T.success+"20":T.borderLight}`,
                  transition:T.transition,
                }}>
                  {/* Connector dot */}
                  <div style={{position:"absolute",left:-34,top:16,width:8,height:8,borderRadius:"50%",
                    background:a.progress===2?T.success:a.progress===1?T.warning:isOverdue?T.danger:T.border,
                    border:`2px solid ${T.card}`}}/>

                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    {/* Status toggle */}
                    <div onClick={()=>changeStatus(a.id,a.progress===2?0:a.progress+1)} style={{cursor:"pointer",color:st?.c,flexShrink:0}} title={`${STATUS[(a.progress+1)%3]?.l}`}>
                      <StatusIcon v={a.progress} size={16}/>
                    </div>
                    {/* Info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        <span style={{fontSize:13,fontWeight:600,color:a.progress===2?T.text3:T.text1,textDecoration:a.progress===2?"line-through":"none"}}>{a.name}</span>
                        <Badge color={pri?.c} small>{pri?.l?.split(" ")[0]}</Badge>
                        {isOverdue&&<Badge color={T.danger} small>{ds.label}</Badge>}
                        {ds&&ds.level==="today"&&<Badge color={T.danger} small>今日截止</Badge>}
                      </div>
                      <div style={{fontSize:11,color:T.text3,display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                        <span style={{display:"flex",alignItems:"center",gap:2}}><ProjectDot color={a.projectColor} size={5}/>{a.projectName}</span>
                        <span>{a.catName}</span>
                        <span>{a.resName}</span>
                        {groupBy!=="date"&&a.deadline&&<span style={{display:"flex",alignItems:"center",gap:2}}><CalendarDays size={10}/>{a.deadline}</span>}
                      </div>
                    </div>
                    {/* Right */}
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      {person&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:11,color:T.text2}}><Avatar name={person.name} color={person.color} size={18}/>{person.name}</span>}
                      <span style={{fontSize:11,color:T.text3}}>{a.hours}h</span>
                    </div>
                  </div>
                </div>;
              })}
            </div>
          </div>;
        })}
      </div>}
  </div>;
}

// ─── Risk Register ──────────────────────
function RiskView({data,save,auditLog,user}){
  const{projects,staff,risks=[]}=data;
  const[modal,setModal]=useState(null);
  const[projFilter,setProjFilter]=useState("all");

  const logAction=(action,name,details={})=>{if(auditLog&&user)auditLog.addLog(user.id,user.name,action,"风险",name,details);};

  const saveRisk=(risk)=>{
    const idx=risks.findIndex(r=>r.id===risk.id);
    let newRisks;
    if(idx>=0){newRisks=[...risks];newRisks[idx]=risk;logAction("update",risk.name);}
    else{newRisks=[...risks,risk];logAction("create",risk.name);}
    save({...data,risks:newRisks});setModal(null);
  };
  const deleteRisk=(id)=>{const r=risks.find(x=>x.id===id);save({...data,risks:risks.filter(x=>x.id!==id)});logAction("delete",r?.name||id);};

  const filtered=risks.filter(r=>projFilter==="all"||r.projectId===projFilter);
  const getRiskScore=(r)=>(r.impact||1)*(r.probability||1);
  const sorted=[...filtered].sort((a,b)=>getRiskScore(b)-getRiskScore(a));

  const openCount=risks.filter(r=>r.status==="open").length;
  const highCount=risks.filter(r=>getRiskScore(r)>=6).length;

  return<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:700,color:T.text1,display:"flex",alignItems:"center",gap:8}}>
        <AlertOctagon size={22}/> 风险管理
        {openCount>0&&<Badge color={T.danger} small>{openCount} 开放</Badge>}
        {highCount>0&&<Badge color={T.warning} small>{highCount} 高风险</Badge>}
      </h2>
      <div style={{display:"flex",gap:8}}>
        <div style={{display:"flex",gap:4}}>
          <button onClick={()=>setProjFilter("all")} style={{padding:"5px 12px",borderRadius:16,fontSize:11,fontWeight:600,border:`1.5px solid ${projFilter==="all"?T.accent:T.border}`,background:projFilter==="all"?T.accentLight:T.card,color:projFilter==="all"?T.accent:T.text2,cursor:"pointer",transition:T.transition}}>全部</button>
          {projects.map(p=><button key={p.id} onClick={()=>setProjFilter(p.id)} style={{padding:"5px 12px",borderRadius:16,fontSize:11,fontWeight:600,border:`1.5px solid ${projFilter===p.id?T.accent:T.border}`,background:projFilter===p.id?T.accentLight:T.card,color:projFilter===p.id?T.accent:T.text2,cursor:"pointer",transition:T.transition,display:"flex",alignItems:"center",gap:4}}><ProjectDot color={p.color} size={6}/>{p.name.slice(0,3)}</button>)}
        </div>
        <Btn onClick={()=>setModal({id:uid(),name:"",projectId:projects[0]?.id||"",impact:2,probability:2,status:"open",owner:staff[0]?.id||"",mitigation:"",note:""})}><Plus size={14}/> 登记风险</Btn>
      </div>
    </div>

    {/* Risk matrix mini */}
    <div className="grid-responsive-3" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
      {[{l:"高风险",count:risks.filter(r=>getRiskScore(r)>=6&&r.status!=="closed").length,c:T.danger,icon:AlertOctagon},
        {l:"中风险",count:risks.filter(r=>{const s=getRiskScore(r);return s>=3&&s<6&&r.status!=="closed";}).length,c:T.warning,icon:ShieldAlert},
        {l:"已关闭",count:risks.filter(r=>r.status==="closed").length,c:T.success,icon:CheckCircle2}
      ].map((s,i)=>{const Icon=s.icon;return<Card key={i} style={{padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:12,color:T.text3,fontWeight:600}}>{s.l}</span><Icon size={16} color={s.c}/>
        </div>
        <div style={{fontSize:24,fontWeight:800,color:s.c}}>{s.count}</div>
      </Card>;})}
    </div>

    {sorted.length===0?<Card style={{textAlign:"center",padding:40,color:T.text3}}><AlertOctagon size={40} strokeWidth={1} style={{marginBottom:12}}/><div>暂无风险记录</div><div style={{fontSize:12,marginTop:4}}>点击"登记风险"开始管理项目风险</div></Card>:
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {sorted.map(r=>{const proj=projects.find(p=>p.id===r.projectId);const person=staff.find(s=>s.id===r.owner);const score=getRiskScore(r);
          const scoreColor=score>=6?T.danger:score>=3?T.warning:T.text3;const rStatus=RISK_STATUS.find(s=>s.v===r.status);
          return<Card key={r.id} style={{padding:"14px 20px",borderLeft:`3px solid ${scoreColor}`}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:scoreColor+"14",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:scoreColor,flexShrink:0}}>{score}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{fontSize:14,fontWeight:600,color:r.status==="closed"?T.text3:T.text1,textDecoration:r.status==="closed"?"line-through":"none"}}>{r.name}</span>
                  <Badge color={rStatus?.c||T.text3} small>{rStatus?.l}</Badge>
                  <Badge color={RISK_IMPACT.find(x=>x.v===r.impact)?.c||T.text3} small>影响:{RISK_IMPACT.find(x=>x.v===r.impact)?.l}</Badge>
                  <Badge color={RISK_PROB.find(x=>x.v===r.probability)?.c||T.text3} small>概率:{RISK_PROB.find(x=>x.v===r.probability)?.l}</Badge>
                </div>
                <div style={{fontSize:11,color:T.text3,display:"flex",alignItems:"center",gap:8}}>
                  {proj&&<span style={{display:"flex",alignItems:"center",gap:3}}><ProjectDot color={proj.color} size={6}/>{proj.name}</span>}
                  {person&&<span style={{display:"flex",alignItems:"center",gap:3}}><Avatar name={person.name} color={person.color} size={14}/>{person.name}</span>}
                </div>
                {r.mitigation&&<div style={{fontSize:11,color:T.text2,marginTop:4,padding:"3px 8px",background:T.borderLight,borderRadius:4}}>应对: {r.mitigation}</div>}
              </div>
              <div style={{display:"flex",gap:4}}>
                <Btn small v="ghost" onClick={()=>setModal({...r})}><Pencil size={12}/></Btn>
                <Btn small v="danger" onClick={()=>{if(confirm("确定删除？"))deleteRisk(r.id);}}><Trash2 size={12}/></Btn>
              </div>
            </div>
          </Card>;})}
      </div>}

    <Modal open={!!modal} onClose={()=>setModal(null)} title="风险登记" width={500}>
      {modal&&<RiskForm risk={modal} projects={projects} staff={staff} onSave={saveRisk} onCancel={()=>setModal(null)}/>}
    </Modal>
  </div>;
}

function RiskForm({risk,projects,staff,onSave,onCancel}){
  const[f,setF]=useState(risk);
  return<div>
    <Input label="风险名称" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
    <QuickSelect label="关联项目" options={projects.map(p=>({v:p.id,l:p.name}))} value={f.projectId} onChange={v=>setF({...f,projectId:v})}/>
    <QuickSelect label="影响程度" options={RISK_IMPACT.map(r=>({v:r.v,l:r.l}))} value={f.impact} onChange={v=>setF({...f,impact:+v})}/>
    <QuickSelect label="发生概率" options={RISK_PROB.map(r=>({v:r.v,l:r.l}))} value={f.probability} onChange={v=>setF({...f,probability:+v})}/>
    <QuickSelect label="状态" options={RISK_STATUS.map(r=>({v:r.v,l:r.l}))} value={f.status} onChange={v=>setF({...f,status:v})}/>
    <QuickSelect label="风险负责人" options={staff.map(s=>({v:s.id,l:s.name}))} value={f.owner} onChange={v=>setF({...f,owner:v})}/>
    <Input label="应对策略" value={f.mitigation||""} onChange={e=>setF({...f,mitigation:e.target.value})}/>
    <Input label="备注" value={f.note||""} onChange={e=>setF({...f,note:e.target.value})}/>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={onCancel}>取消</Btn><Btn onClick={()=>onSave(f)} disabled={!f.name.trim()}>保存</Btn></div>
  </div>;
}

// ─── Schedule ───────────────────────────
function ScheduleView({data,save}){const{projects,staff,weekSchedules={}}=data;
  const[week,setWeek]=useState(()=>{const n=new Date(),s=new Date(n.getFullYear(),0,1),w=Math.ceil(((n-s)/864e5+s.getDay()+1)/7);return`${n.getFullYear()}-W${String(w).padStart(2,"0")}`;});
  const getH=(sid,pid,d)=>(weekSchedules[week]?.[sid]?.[`${pid}-${d}`])||0;
  const setH=(sid,pid,d,h)=>{const ns=JSON.parse(JSON.stringify(weekSchedules));if(!ns[week])ns[week]={};if(!ns[week][sid])ns[week][sid]={};ns[week][sid][`${pid}-${d}`]=Math.max(0,Math.min(8,+h||0));save({...data,weekSchedules:ns});};
  const dayTotal=(sid,d)=>projects.reduce((s,p)=>s+getH(sid,p.id,d),0);const weekTotal=sid=>WEEK_DAYS.reduce((s,_,i)=>s+dayTotal(sid,i),0);
  return<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:700,color:T.text1,display:"flex",alignItems:"center",gap:8}}><CalendarDays size={22}/> 工时排期</h2>
      <input type="week" value={week} onChange={e=>setWeek(e.target.value)} style={{padding:"7px 14px",borderRadius:T.radiusSm,border:`1.5px solid ${T.border}`,fontSize:12,outline:"none",fontFamily:T.font,transition:T.transition}}
        onFocus={e=>{e.target.style.borderColor=T.accent}} onBlur={e=>{e.target.style.borderColor=T.border}}/>
    </div>
    {staff.map(s=>{const wt=weekTotal(s.id);return<Card key={s.id} style={{marginBottom:14,padding:"16px 18px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Avatar name={s.name} color={s.color||T.accent} size={28}/>
          <span style={{fontSize:14,fontWeight:700,color:T.text1}}>{s.name}</span>
        </div>
        <span style={{fontSize:13,fontWeight:700,color:wt>40?T.danger:T.success}}>{wt}/40h</span>
      </div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>
          <th style={{textAlign:"left",padding:"6px 8px",color:T.text3,borderBottom:`2px solid ${T.borderLight}`,minWidth:100,fontWeight:600}}>项目</th>
          {WEEK_DAYS.map((d,i)=><th key={i} style={{padding:"6px 4px",color:T.text3,borderBottom:`2px solid ${T.borderLight}`,minWidth:44,textAlign:"center",fontWeight:600}}>{d}</th>)}
          <th style={{padding:"6px 4px",borderBottom:`2px solid ${T.borderLight}`,textAlign:"center",color:T.text3,fontWeight:600}}>计</th>
        </tr></thead>
        <tbody>
          {projects.map(p=>{const rt=WEEK_DAYS.reduce((sum,_,i)=>sum+getH(s.id,p.id,i),0);return<tr key={p.id}>
            <td style={{padding:"4px 8px",borderBottom:`1px solid ${T.borderLight}`,fontWeight:600,fontSize:11,color:T.text1,display:"flex",alignItems:"center",gap:4}}><ProjectDot color={p.color} size={6}/>{p.name.slice(0,5)}</td>
            {WEEK_DAYS.map((_,i)=><td key={i} style={{padding:"2px",borderBottom:`1px solid ${T.borderLight}`,textAlign:"center"}}>
              <input type="number" min="0" max="8" step="0.5" value={getH(s.id,p.id,i)||""} placeholder="0" onChange={e=>setH(s.id,p.id,i,e.target.value)}
                style={{width:38,padding:"4px 2px",textAlign:"center",borderRadius:6,border:`1.5px solid ${T.border}`,fontSize:11,outline:"none",background:getH(s.id,p.id,i)>0?T.accentLight:T.card,color:T.text1,fontFamily:T.font,transition:T.transition}}
                onFocus={e=>{e.target.style.borderColor=T.accent}} onBlur={e=>{e.target.style.borderColor=T.border}}/>
            </td>)}
            <td style={{padding:"4px",borderBottom:`1px solid ${T.borderLight}`,textAlign:"center",fontWeight:700,color:rt>0?T.accent:T.border,fontSize:11}}>{rt}h</td>
          </tr>;})}
          <tr><td style={{padding:"6px 8px",fontWeight:700,color:T.text1}}>日计</td>
            {WEEK_DAYS.map((_,i)=>{const dt=dayTotal(s.id,i);return<td key={i} style={{padding:"6px 4px",textAlign:"center",fontWeight:700,color:dt>8?T.danger:T.text1}}>{dt}h</td>;})}
            <td style={{padding:"6px 4px",textAlign:"center",fontWeight:800,color:wt>40?T.danger:T.accent}}>{wt}h</td>
          </tr>
        </tbody>
      </table>
    </Card>;})}
  </div>;
}

// ─── Reports ────────────────────────────
function ReportsView({data}){const{projects,staff}=data;const actions=getAllActions(projects);
  const workload=staff.map(s=>{const sa=actions.filter(a=>a.staffId===s.id);return{name:s.name,total:sa.length,done:sa.filter(a=>a.progress===2).length,prog:sa.filter(a=>a.progress===1).length,hours:sa.reduce((sum,a)=>sum+(a.hours||0),0)};});
  const[reportModal,setReportModal]=useState(false);
  const report=useMemo(()=>{const l=[];l.push(`第二座山集团 · 周报\n`);projects.forEach(p=>{const pa=getAllActions([p]);l.push(`● ${p.name} — ${pa.filter(a=>a.progress===2).length}/${pa.length}完成`);(p.categories||[]).forEach(c=>{(c.resources||[]).forEach(r=>{(r.actions||[]).forEach(a=>{const st=STATUS.find(x=>x.v===a.progress)?.l;const person=staff.find(s=>s.id===a.staffId);l.push(`  ${a.aType==="recurring"?"↻":"◎"} ${a.name} [${st}] → ${person?.name} ${a.hours}h`);});});});l.push("");});l.push("═ 人员 ═");staff.forEach(s=>{const sa=actions.filter(a=>a.staffId===s.id);l.push(`${s.name}: ${sa.filter(a=>a.progress===2).length}/${sa.length} ${sa.reduce((sum,a)=>sum+(a.hours||0),0)}h`);});return l.join("\n");},[data]);

  return<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:700,color:T.text1,display:"flex",alignItems:"center",gap:8}}><BarChart3 size={22}/> 报表</h2>
      <Btn onClick={()=>setReportModal(true)}><FileText size={14}/> 周报</Btn>
    </div>
    <div className="grid-responsive-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <Card style={{padding:"18px 20px"}}><h4 style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:T.text1}}>任务分布</h4><ResponsiveContainer width="100%" height={200}><BarChart data={workload} barSize={18}><XAxis dataKey="name" tick={{fontSize:11,fill:T.text3}}/><YAxis tick={{fontSize:11,fill:T.text3}}/><Tooltip contentStyle={{borderRadius:8,fontSize:12,border:`1px solid ${T.border}`,boxShadow:T.shadowMd}}/><Legend iconSize={10} wrapperStyle={{fontSize:11}}/><Bar dataKey="done" stackId="a" fill={T.success} name="完成"/><Bar dataKey="prog" stackId="a" fill={T.warning} name="进行中" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></Card>
      <Card style={{padding:"18px 20px"}}><h4 style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:T.text1}}>周工时</h4><ResponsiveContainer width="100%" height={200}><BarChart data={workload} barSize={28}><XAxis dataKey="name" tick={{fontSize:11,fill:T.text3}}/><YAxis tick={{fontSize:11,fill:T.text3}}/><Tooltip contentStyle={{borderRadius:8,fontSize:12,border:`1px solid ${T.border}`,boxShadow:T.shadowMd}}/><Bar dataKey="hours" fill={T.accent} name="h" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></Card>
    </div>
    <Modal open={reportModal} onClose={()=>setReportModal(false)} title="周报" width={600}>
      <pre style={{background:T.borderLight,padding:16,borderRadius:10,fontSize:11,lineHeight:1.7,whiteSpace:"pre-wrap",maxHeight:400,overflowY:"auto",color:T.text1}}>{report}</pre>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
        <Btn v="secondary" onClick={()=>setReportModal(false)}>关闭</Btn>
        <Btn onClick={()=>{try{navigator.clipboard.writeText(report)}catch{}}}><Copy size={14}/> 复制</Btn>
      </div>
    </Modal>
  </div>;
}

// ─── Staff (with admin account creation) ─
function StaffView({data,save,auditLog,user}){const{staff,projects}=data;const[edit,setEdit]=useState(null);const[createAccount,setCreateAccount]=useState(null);const[accountMsg,setAccountMsg]=useState("");const[accountLoading,setAccountLoading]=useState(false);const[profiles,setProfiles]=useState([]);const[roleLoading,setRoleLoading]=useState("");const actions=getAllActions(projects);
  const STAFF_COLORS = [T.accent, T.success, T.purple, T.warning, T.teal, T.pink, "#5856D6", "#64D2FF"];
  const isSuperAdmin = user?.role === "超级管理员";
  const sv=p=>{const i=staff.findIndex(s=>s.id===p.id);const isNew=i<0;let n;if(i>=0){n=[...staff];n[i]=p;}else n=[...staff,p];save({...data,staff:n});setEdit(null);
    if(auditLog&&user)auditLog.addLog(user.id,user.name,isNew?"create":"update","人员",p.name);};

  // Fetch all profiles from Supabase to show account status
  useEffect(() => {
    (async () => {
      try {
        const { data: profs } = await supabase.from("profiles").select("id,phone,name,role,is_admin,staff_id");
        if (profs) setProfiles(profs);
      } catch (e) { console.warn("Failed to fetch profiles:", e); }
    })();
  }, [accountLoading, roleLoading]);

  // Toggle admin role for a profile
  const toggleAdmin = async (profile, makeAdmin) => {
    setRoleLoading(profile.id);
    try {
      const newRole = makeAdmin ? "管理员" : "普通员工";
      const { error } = await supabase.from("profiles").update({ is_admin: makeAdmin, role: newRole }).eq("id", profile.id);
      if (error) throw error;
      // Also update local staff array
      const staffIdx = staff.findIndex(s => s.phone === profile.phone || s.id === profile.staff_id);
      if (staffIdx >= 0) {
        const newStaff = [...staff];
        newStaff[staffIdx] = { ...newStaff[staffIdx], isAdmin: makeAdmin, role: newRole, permission: makeAdmin ? "admin" : "editor" };
        save({ ...data, staff: newStaff });
      }
      if(auditLog&&user) auditLog.addLog(user.id, user.name, "update", "权限", `${profile.name} → ${newRole}`);
    } catch (e) { alert("修改失败: " + e.message); }
    setRoleLoading("");
  };

  // Admin creates Supabase Auth account directly (no Edge Function needed)
  const doCreateAccount = async () => {
    if(!createAccount?.phone || !createAccount?.password || !createAccount?.name) return;
    setAccountLoading(true); setAccountMsg("");
    try {
      const fakeEmail = `${createAccount.phone.trim()}@pmp.local`;
      const staffId = createAccount.staffId || uid();
      const isAdmin = createAccount.isAdmin || false;

      // Step 1: Create auth user via signUp
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: fakeEmail,
        password: createAccount.password,
        options: { data: { name: createAccount.name.trim(), phone: createAccount.phone.trim() } }
      });
      if (authErr) throw new Error(authErr.message);
      if (!authData.user) throw new Error("注册失败");

      // Step 2: Create profile
      const { error: profErr } = await supabase.from("profiles").insert({
        id: authData.user.id,
        phone: createAccount.phone.trim(),
        name: createAccount.name.trim(),
        role: isAdmin ? "管理员" : (createAccount.role || "普通员工"),
        is_admin: isAdmin,
        staff_id: staffId,
        color: createAccount.color || STAFF_COLORS[staff.length % STAFF_COLORS.length],
      });
      if (profErr) throw new Error(profErr.message);

      // Step 3: Sign back in as current admin (signUp may have changed session)
      const currentPhone = user?.phone;
      if (currentPhone) {
        // We don't know the admin's password here, so just reload session
        // The onAuthStateChange won't interfere since we simplified it
      }

      // Also add/update in local staff array
      const existingIdx = staff.findIndex(s => s.phone === createAccount.phone.trim());
      const staffEntry = {
        id: staffId,
        name: createAccount.name.trim(),
        phone: createAccount.phone.trim(),
        role: isAdmin ? "管理员" : (createAccount.role || "普通员工"),
        isAdmin,
        permission: isAdmin ? "admin" : "editor",
        color: createAccount.color || STAFF_COLORS[staff.length % STAFF_COLORS.length],
      };
      let newStaff;
      if (existingIdx >= 0) { newStaff = [...staff]; newStaff[existingIdx] = {...newStaff[existingIdx], ...staffEntry}; }
      else newStaff = [...staff, staffEntry];
      save({...data, staff: newStaff});

      setAccountMsg("账号创建成功！");
      if(auditLog&&user)auditLog.addLog(user.id,user.name,"create","账号",createAccount.name.trim());
      setTimeout(()=>{setCreateAccount(null);setAccountMsg("");},1500);
    } catch(e) {
      setAccountMsg("创建失败: " + e.message);
    }
    setAccountLoading(false);
  };

  // Detect unsynced profiles (registered but not in staff list)
  const unsyncedProfiles = profiles.filter(p => {
    return !(staff||[]).some(s => s.phone === p.phone || s.id === p.staff_id);
  });
  const syncAllProfiles = () => {
    const newStaff = [...(staff||[])];
    unsyncedProfiles.forEach(p => {
      newStaff.push({ id: p.staff_id || uid(), name: p.name, phone: p.phone, role: p.role || "普通员工", isAdmin: p.is_admin || false, permission: p.is_admin ? "admin" : "editor", color: PIE_COLORS[newStaff.length % PIE_COLORS.length] });
    });
    save({...data, staff: newStaff});
    if (auditLog && user) auditLog.addLog(user.id, user.name, "sync", "人员", `同步${unsyncedProfiles.length}个未关联账号`);
  };

  return<div>
    {unsyncedProfiles.length>0&&<div style={{padding:"12px 18px",background:"#FFF8EC",borderRadius:T.radius,border:`1px solid ${T.warning}30`,marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
      <AlertCircle size={18} color={T.warning}/>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:600,color:T.text1}}>发现 {unsyncedProfiles.length} 个已注册但未在员工列表中的账号</div>
        <div style={{fontSize:11,color:T.text2,marginTop:2}}>{unsyncedProfiles.map(p=>p.name).join("、")}</div>
      </div>
      <Btn small onClick={syncAllProfiles}><RefreshCw size={12}/> 一键同步</Btn>
    </div>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:700,color:T.text1,display:"flex",alignItems:"center",gap:8}}><Users size={22}/> 人员管理</h2>
      <div style={{display:"flex",gap:8}}>
        <Btn v="secondary" onClick={()=>setCreateAccount({name:"",phone:"",password:"",role:"普通员工",isAdmin:false,color:STAFF_COLORS[staff.length%STAFF_COLORS.length]})}><KeyRound size={14}/> 创建账号</Btn>
        <Btn onClick={()=>setEdit({id:uid(),name:"",phone:"",role:"",isAdmin:false,color:T.accent})}><Plus size={14}/> 添加</Btn>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
      {staff.map(s=>{const sa=actions.filter(a=>a.staffId===s.id);
        const prof = profiles.find(p => p.phone === s.phone || p.staff_id === s.id);
        const hasAccount = !!prof;
        return<Card key={s.id}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <Avatar name={s.name} color={s.color||T.accent} size={40}/>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:T.text1,display:"flex",alignItems:"center",gap:6}}>
                {s.name}
                {hasAccount && <Badge color={prof.is_admin ? (prof.role==="超级管理员"?T.danger:T.accent) : T.teal} small>
                  {prof.role==="超级管理员"?"超管":prof.is_admin?"管理员":"员工"}
                </Badge>}
              </div>
              <div style={{fontSize:11,color:T.text3,display:"flex",alignItems:"center",gap:4}}>
                {s.role}
                {hasAccount ? <span style={{color:T.success,display:"flex",alignItems:"center",gap:2}}><CheckCircle2 size={10}/>已开通</span>
                  : <span style={{color:T.text3,display:"flex",alignItems:"center",gap:2}}>未开通</span>}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:4}}>
            <Btn small v="ghost" onClick={()=>setEdit({...s})}><Pencil size={12}/></Btn>
            <Btn small v="danger" onClick={()=>{if(confirm("确定删除？")){save({...data,staff:staff.filter(x=>x.id!==s.id)});if(auditLog&&user)auditLog.addLog(user.id,user.name,"delete","人员",s.name);}}}><Trash2 size={12}/></Btn>
          </div>
        </div>
        <div style={{fontSize:12,color:T.text2,display:"flex",alignItems:"center",gap:8,marginBottom: (isSuperAdmin && hasAccount && prof.role !== "超级管理员") ? 10 : 0}}>
          <span style={{display:"flex",alignItems:"center",gap:3}}><Phone size={12}/> {s.phone}</span>
          <span>{sa.length}项</span>
          <span style={{display:"flex",alignItems:"center",gap:2}}><Clock size={11}/>{sa.reduce((sum,a)=>sum+(a.hours||0),0)}h</span>
        </div>
        {/* Super admin can toggle roles for other users (not self, not other super admins) */}
        {isSuperAdmin && hasAccount && prof.role !== "超级管理员" && <div style={{display:"flex",gap:6,paddingTop:8,borderTop:`1px solid ${T.borderLight}`}}>
          {prof.is_admin
            ? <Btn small v="secondary" onClick={()=>toggleAdmin(prof,false)} disabled={roleLoading===prof.id}>
                {roleLoading===prof.id?<Loader2 size={12} style={{animation:"spin 1s linear infinite"}}/>:<ShieldCheck size={12}/>} 取消管理员
              </Btn>
            : <Btn small onClick={()=>toggleAdmin(prof,true)} disabled={roleLoading===prof.id}>
                {roleLoading===prof.id?<Loader2 size={12} style={{animation:"spin 1s linear infinite"}}/>:<ShieldCheck size={12}/>} 设为管理员
              </Btn>
          }
        </div>}
      </Card>;})}
    </div>

    {/* Edit staff modal */}
    <Modal open={!!edit} onClose={()=>setEdit(null)} title={edit?.name?"编辑人员":"添加人员"}>
      {edit&&<div>
        <QuickSelect label="颜色" options={STAFF_COLORS.map(c=>({v:c,l:<div style={{width:20,height:20,borderRadius:"50%",background:c}}/>}))} value={edit.color} onChange={v=>setEdit({...edit,color:v})}/>
        <Input label="姓名" value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/>
        <Input label="手机号" value={edit.phone} onChange={e=>setEdit({...edit,phone:e.target.value})}/>
        <Input label="职位" value={edit.role} onChange={e=>setEdit({...edit,role:e.target.value})}/>
        <QuickSelect label="权限级别" options={ROLE_LEVELS.map(r=>({v:r.v,l:`${r.l} — ${r.desc}`}))} value={edit.permission||"viewer"} onChange={v=>setEdit({...edit,permission:v,isAdmin:v==="admin"})}/>
        <label style={{display:"flex",gap:8,marginBottom:16,fontSize:13,alignItems:"center",color:T.text2}}><input type="checkbox" checked={edit.isAdmin} onChange={e=>setEdit({...edit,isAdmin:e.target.checked,permission:e.target.checked?"admin":edit.permission==="admin"?"editor":edit.permission})} style={{accentColor:T.accent,width:16,height:16}}/>管理员</label>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setEdit(null)}>取消</Btn><Btn onClick={()=>sv(edit)} disabled={!edit.name.trim()||!edit.phone.trim()}>保存</Btn></div>
      </div>}
    </Modal>

    {/* Admin create account modal */}
    <Modal open={!!createAccount} onClose={()=>{setCreateAccount(null);setAccountMsg("");}} title="创建系统账号" width={420}>
      {createAccount&&<div>
        <div style={{padding:"12px 16px",background:T.accentLight,borderRadius:T.radiusSm,marginBottom:16,fontSize:12,color:T.accent,display:"flex",alignItems:"center",gap:6}}>
          <ShieldCheck size={14}/> 管理员为员工创建登录账号，创建后员工可用手机号+密码登录系统
        </div>
        <Input label="姓名" placeholder="员工姓名" value={createAccount.name} onChange={e=>setCreateAccount({...createAccount,name:e.target.value})}/>
        <Input label="手机号" placeholder="11位手机号" value={createAccount.phone} onChange={e=>setCreateAccount({...createAccount,phone:e.target.value})}/>
        <Input label="初始密码" placeholder="至少6位" type="password" value={createAccount.password} onChange={e=>setCreateAccount({...createAccount,password:e.target.value})}/>
        <Input label="职位" placeholder="如：运营专员" value={createAccount.role} onChange={e=>setCreateAccount({...createAccount,role:e.target.value})}/>
        <label style={{display:"flex",gap:8,marginBottom:16,fontSize:13,alignItems:"center",color:T.text2}}>
          <input type="checkbox" checked={createAccount.isAdmin} onChange={e=>setCreateAccount({...createAccount,isAdmin:e.target.checked})} style={{accentColor:T.accent,width:16,height:16}}/>
          设为管理员
        </label>
        {accountMsg&&<p style={{fontSize:12,margin:"-4px 0 12px",display:"flex",alignItems:"center",gap:4,color:accountMsg.includes("成功")?T.success:T.danger}}>
          {accountMsg.includes("成功")?<CheckCircle2 size={12}/>:<AlertCircle size={12}/>} {accountMsg}
        </p>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn v="secondary" onClick={()=>{setCreateAccount(null);setAccountMsg("");}}>取消</Btn>
          <Btn onClick={doCreateAccount} disabled={accountLoading||!createAccount.name.trim()||!createAccount.phone.trim()||!createAccount.password||createAccount.password.length<6}>
            {accountLoading?<><Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/> 创建中...</>:<><KeyRound size={14}/> 创建账号</>}
          </Btn>
        </div>
      </div>}
    </Modal>
  </div>;
}

// ═══════════════════════════════════════════
// ─── Deliverables View (Admin) ────────────
const DL_STATUS = [{v:"pending",l:"待审核",c:T.warning,icon:FileClock},{v:"approved",l:"已通过",c:T.success,icon:FileCheck},{v:"rejected",l:"已驳回",c:T.danger,icon:FileX}];

function DeliverablesView({data,user,deliverablesHook,auditLog}) {
  const {deliverables,reviewDeliverable,getFileUrl} = deliverablesHook;
  const {projects,staff} = data;
  const [filterProject,setFilterProject] = useState("");
  const [filterStatus,setFilterStatus] = useState("");
  const [filterMonth,setFilterMonth] = useState("");
  const [viewMode,setViewMode] = useState("list");
  const [reviewModal,setReviewModal] = useState(null);
  const [rejectReason,setRejectReason] = useState("");
  const [previewUrl,setPreviewUrl] = useState("");
  const [uploadModal,setUploadModal] = useState(null);
  const [uploadFiles,setUploadFiles] = useState([]);
  const [uploadStatus,setUploadStatus] = useState("");
  const fileInputRef = useRef(null);

  const getActionName = (actionId) => { for(const p of projects) for(const c of p.categories||[]) for(const r of c.resources||[]) for(const a of r.actions||[]) if(a.id===actionId) return a.name; return actionId; };
  const getProjName = (pid) => projects.find(p=>p.id===pid)?.name || pid;

  const filtered = useMemo(()=>{
    let d = [...deliverables];
    if(filterProject) d = d.filter(x=>x.project_id===filterProject);
    if(filterStatus) d = d.filter(x=>x.status===filterStatus);
    if(filterMonth) d = d.filter(x=>x.created_at?.slice(0,7)===filterMonth);
    return d;
  },[deliverables,filterProject,filterStatus,filterMonth]);

  const archiveByProject = useMemo(()=>{
    const map = {};
    filtered.forEach(d=>{ const pid=d.project_id; if(!map[pid])map[pid]={name:getProjName(pid),items:[]}; map[pid].items.push(d); });
    return Object.entries(map);
  },[filtered,projects]);

  const months = useMemo(()=>{
    const set = new Set(deliverables.map(d=>d.created_at?.slice(0,7)).filter(Boolean));
    return [...set].sort().reverse();
  },[deliverables]);

  const doReview = async (status) => {
    if(!reviewModal) return;
    await reviewDeliverable(reviewModal.id, status, user, rejectReason);
    if(auditLog) auditLog.addLog(user.id,user.name,status==="approved"?"approve":"reject","交付物",reviewModal.file_name,{reason:rejectReason});
    setReviewModal(null); setRejectReason("");
  };

  const openPreview = async (path) => { const url = await getFileUrl(path); if(url) setPreviewUrl(url); };

  const doUpload = async () => {
    if(!uploadModal || !uploadFiles.length) return;
    setUploadStatus("uploading");
    for(const f of uploadFiles) {
      const r = await deliverablesHook.uploadFile(f, uploadModal.actionId, uploadModal.projectId, uploadModal.categoryId, uploadModal.resourceId, user);
      if(!r.success) { setUploadStatus("error: "+r.error); return; }
    }
    setUploadStatus("success");
    setUploadFiles([]);
    if(auditLog) auditLog.addLog(user.id,user.name,"upload","交付物",uploadModal.actionName,{count:uploadFiles.length});
    setTimeout(()=>{setUploadModal(null);setUploadStatus("");},1200);
  };

  const allActionsFlat = useMemo(()=>{
    const arr = [];
    projects.forEach(p=>(p.categories||[]).forEach(c=>(c.resources||[]).forEach(r=>(r.actions||[]).forEach(a=>arr.push({...a,projectId:p.id,projectName:p.name,categoryId:c.id,resourceId:r.id,resourceName:r.name})))));
    return arr;
  },[projects]);

  const pendingCount = deliverables.filter(d=>d.status==="pending").length;

  return<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:700,color:T.text1,display:"flex",alignItems:"center",gap:8}}>
        <FolderArchive size={22}/> 交付管理
        {pendingCount>0&&<Badge color={T.warning}>{pendingCount} 待审核</Badge>}
      </h2>
      <div style={{display:"flex",gap:8}}>
        <Btn small v={viewMode==="list"?"primary":"secondary"} onClick={()=>setViewMode("list")}>列表视图</Btn>
        <Btn small v={viewMode==="archive"?"primary":"secondary"} onClick={()=>setViewMode("archive")}><FolderOpen size={12}/> 归档视图</Btn>
        <Btn onClick={()=>setUploadModal({actionId:"",projectId:"",categoryId:"",resourceId:"",actionName:""})}><Upload size={14}/> 上传交付物</Btn>
      </div>
    </div>

    <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
      <QuickSelect label="项目" options={[{v:"",l:"全部项目"},...projects.map(p=>({v:p.id,l:p.name}))]} value={filterProject} onChange={setFilterProject}/>
      <QuickSelect label="状态" options={[{v:"",l:"全部状态"},...DL_STATUS.map(s=>({v:s.v,l:s.l}))]} value={filterStatus} onChange={setFilterStatus}/>
      <QuickSelect label="月份" options={[{v:"",l:"全部月份"},...months.map(m=>({v:m,l:m}))]} value={filterMonth} onChange={setFilterMonth}/>
      <div style={{flex:1}}/><span style={{fontSize:12,color:T.text3,alignSelf:"flex-end"}}>{filtered.length} 条记录</span>
    </div>

    {viewMode==="list"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {filtered.length===0&&<Card style={{textAlign:"center",padding:40,color:T.text3}}><FolderArchive size={32} strokeWidth={1.5} style={{marginBottom:8}}/><div>暂无交付物</div></Card>}
      {filtered.map(d=>{const st=DL_STATUS.find(s=>s.v===d.status);const StIcon=st?.icon||FileClock;const FIcon=getFileIcon(d.file_type);
        return<Card key={d.id} style={{padding:"14px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:(st?.c||T.text3)+"14",display:"flex",alignItems:"center",justifyContent:"center"}}><FIcon size={18} color={st?.c}/></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:14,fontWeight:600,color:T.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.file_name}</span>
                <Badge color={T.text3} small>v{d.version}</Badge>
                <Badge color={st?.c} small><StIcon size={9} style={{marginRight:2}}/>{st?.l}</Badge>
              </div>
              <div style={{fontSize:11,color:T.text3,display:"flex",gap:8,marginTop:2,flexWrap:"wrap"}}>
                <span>{getProjName(d.project_id)}</span><span>·</span><span>{getActionName(d.action_id)}</span><span>·</span>
                <span>{d.uploaded_by_name}</span><span>·</span><span>{formatFileSize(d.file_size)}</span><span>·</span><span>{d.created_at?.slice(0,16).replace("T"," ")}</span>
              </div>
              {d.status==="rejected"&&d.reject_reason&&<div style={{fontSize:11,color:T.danger,marginTop:4,display:"flex",alignItems:"center",gap:4}}><AlertCircle size={11}/> 驳回原因：{d.reject_reason}</div>}
            </div>
            <div style={{display:"flex",gap:6}}>
              <Btn small v="ghost" onClick={()=>openPreview(d.file_path)}><Eye size={13}/></Btn>
              {d.status==="pending"&&<Btn small v="success" onClick={()=>setReviewModal(d)}><FileCheck size={13}/> 审核</Btn>}
            </div>
          </div>
        </Card>;})}
    </div>}

    {viewMode==="archive"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
      {archiveByProject.length===0&&<Card style={{textAlign:"center",padding:40,color:T.text3}}><FolderOpen size={32} strokeWidth={1.5}/><div style={{marginTop:8}}>暂无归档</div></Card>}
      {archiveByProject.map(([pid,group])=><Card key={pid} style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"14px 20px",background:T.borderLight,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8}}>
          <ProjectDot color={projects.find(p=>p.id===pid)?.color||T.accent} size={12}/>
          <span style={{fontSize:14,fontWeight:700,color:T.text1}}>{group.name}</span>
          <Badge color={T.text3} small>{group.items.length} 文件</Badge>
          <span style={{flex:1}}/><span style={{fontSize:11,color:T.text3}}>{group.items.filter(d=>d.status==="approved").length} 已归档</span>
        </div>
        <div>{group.items.map(d=>{const st=DL_STATUS.find(s=>s.v===d.status);const FIcon=getFileIcon(d.file_type);
          return<div key={d.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 20px",borderBottom:`1px solid ${T.borderLight}`,fontSize:12}}>
            <FIcon size={14} color={st?.c||T.text3}/>
            <span style={{fontWeight:600,color:T.text1,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.file_name}</span>
            <Badge color={T.text3} small>v{d.version}</Badge>
            <span style={{color:T.text3}}>{getActionName(d.action_id)}</span>
            <span style={{color:T.text3}}>{d.uploaded_by_name}</span>
            <span style={{color:T.text3}}>{d.created_at?.slice(5,10)}</span>
            <Badge color={st?.c} small>{st?.l}</Badge>
            <Btn small v="ghost" onClick={()=>openPreview(d.file_path)}><Eye size={11}/></Btn>
            {d.status==="pending"&&<Btn small v="ghost" onClick={()=>setReviewModal(d)}><FileCheck size={11}/></Btn>}
          </div>;})}</div>
      </Card>)}
    </div>}

    <Modal open={!!reviewModal} onClose={()=>{setReviewModal(null);setRejectReason("");}} title="审核交付物" width={480}>
      {reviewModal&&<div>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",background:T.borderLight,borderRadius:T.radiusSm,marginBottom:16}}>
          {(()=>{const FIcon=getFileIcon(reviewModal.file_type);return<FIcon size={24} color={T.accent}/>;})()}
          <div>
            <div style={{fontSize:14,fontWeight:600,color:T.text1}}>{reviewModal.file_name}</div>
            <div style={{fontSize:11,color:T.text3}}>{getProjName(reviewModal.project_id)} · {getActionName(reviewModal.action_id)} · v{reviewModal.version} · {formatFileSize(reviewModal.file_size)}</div>
          </div>
        </div>
        <Btn small v="ghost" onClick={()=>openPreview(reviewModal.file_path)} style={{marginBottom:12}}><Eye size={13}/> 预览/下载文件</Btn>
        {(()=>{const history=deliverables.filter(d=>d.action_id===reviewModal.action_id&&d.id!==reviewModal.id);
          return history.length>0&&<div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:600,color:T.text3,marginBottom:6}}>历史版本</div>
            {history.map(h=>{const hst=DL_STATUS.find(s=>s.v===h.status);return<div key={h.id} style={{fontSize:11,color:T.text2,padding:"3px 0",display:"flex",alignItems:"center",gap:6}}>
              <Badge color={T.text3} small>v{h.version}</Badge><span>{h.file_name}</span><Badge color={hst?.c} small>{hst?.l}</Badge>
              {h.reject_reason&&<span style={{color:T.danger}}>— {h.reject_reason}</span>}
            </div>;})}
          </div>;
        })()}
        <Input label="驳回原因（仅驳回时需要）" placeholder="请输入驳回原因..." value={rejectReason} onChange={e=>setRejectReason(e.target.value)}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
          <Btn v="secondary" onClick={()=>{setReviewModal(null);setRejectReason("");}}>取消</Btn>
          <Btn v="danger" onClick={()=>doReview("rejected")} disabled={!rejectReason.trim()}><FileX size={14}/> 驳回</Btn>
          <Btn v="success" onClick={()=>doReview("approved")}><FileCheck size={14}/> 通过并归档</Btn>
        </div>
      </div>}
    </Modal>

    <Modal open={!!uploadModal} onClose={()=>{setUploadModal(null);setUploadFiles([]);setUploadStatus("");}} title="上传交付物" width={520}>
      {uploadModal&&<div>
        <QuickSelect label="选择任务" options={allActionsFlat.map(a=>({v:a.id,l:`${a.projectName} / ${a.resourceName} / ${a.name}`}))} value={uploadModal.actionId} onChange={v=>{const a=allActionsFlat.find(x=>x.id===v);if(a)setUploadModal({actionId:v,projectId:a.projectId,categoryId:a.categoryId,resourceId:a.resourceId,actionName:a.name});}}/>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:600,color:T.text2,marginBottom:6}}>选择文件（支持多选，单文件最大50MB）</div>
          <div onClick={()=>fileInputRef.current?.click()} style={{padding:24,border:`2px dashed ${T.border}`,borderRadius:T.radius,textAlign:"center",cursor:"pointer",background:T.borderLight}}
            onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=T.accent;}}
            onDragLeave={e=>{e.currentTarget.style.borderColor=T.border;}}
            onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor=T.border;setUploadFiles([...uploadFiles,...e.dataTransfer.files]);}}>
            <ArrowUpFromLine size={24} color={T.text3} style={{marginBottom:6}}/>
            <div style={{fontSize:13,color:T.text2}}>点击选择或拖拽文件到此处</div>
            <div style={{fontSize:11,color:T.text3}}>图片、视频、文档、PDF 等所有格式</div>
          </div>
          <input ref={fileInputRef} type="file" multiple style={{display:"none"}} onChange={e=>{setUploadFiles([...uploadFiles,...e.target.files]);e.target.value="";}}/>
        </div>
        {uploadFiles.length>0&&<div style={{marginBottom:12}}>
          {[...uploadFiles].map((f,i)=>{const FIcon=getFileIcon(f.type);return<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:T.borderLight,borderRadius:T.radiusSm,marginBottom:4,fontSize:12}}>
            <FIcon size={14} color={T.accent}/><span style={{flex:1,color:T.text1,fontWeight:500}}>{f.name}</span><span style={{color:T.text3}}>{formatFileSize(f.size)}</span>
            <button onClick={()=>setUploadFiles([...uploadFiles].filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:T.danger,cursor:"pointer",padding:2}}><X size={12}/></button>
          </div>;})}
        </div>}
        {uploadStatus==="success"&&<div style={{padding:"10px 14px",background:"#F0FDF4",borderRadius:T.radiusSm,marginBottom:12,fontSize:12,color:T.success,display:"flex",alignItems:"center",gap:6}}><CheckCircle2 size={14}/> 上传成功！</div>}
        {uploadStatus.startsWith("error")&&<div style={{padding:"10px 14px",background:"#FFF2F2",borderRadius:T.radiusSm,marginBottom:12,fontSize:12,color:T.danger,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={14}/> {uploadStatus}</div>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn v="secondary" onClick={()=>{setUploadModal(null);setUploadFiles([]);setUploadStatus("");}}>取消</Btn>
          <Btn onClick={doUpload} disabled={!uploadModal.actionId||!uploadFiles.length||uploadStatus==="uploading"}>
            {uploadStatus==="uploading"?<><Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/> 上传中...</>:<><Upload size={14}/> 上传 ({uploadFiles.length}个文件)</>}
          </Btn>
        </div>
      </div>}
    </Modal>

    <Modal open={!!previewUrl} onClose={()=>setPreviewUrl("")} title="文件预览" width={700}>
      {previewUrl&&<div style={{textAlign:"center"}}>
        {/\.(jpg|jpeg|png|gif|webp|svg)/i.test(previewUrl)?<img src={previewUrl} style={{maxWidth:"100%",maxHeight:500,borderRadius:T.radius}} alt="preview"/>:
         /\.(mp4|mov|webm)/i.test(previewUrl)?<video src={previewUrl} controls style={{maxWidth:"100%",maxHeight:500,borderRadius:T.radius}}/>:
         /\.pdf/i.test(previewUrl)?<iframe src={previewUrl} sandbox="allow-same-origin" style={{width:"100%",height:500,border:"none",borderRadius:T.radius}}/>:
         <div style={{padding:40,color:T.text3}}><File size={48} strokeWidth={1.5}/><p>此文件类型不支持预览</p></div>}
        <div style={{marginTop:12}}><a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{color:T.accent,fontSize:13,fontWeight:600,textDecoration:"none"}}>
          <Download size={14} style={{marginRight:4,verticalAlign:"middle"}}/> 下载文件
        </a></div>
      </div>}
    </Modal>
  </div>;
}

// ─── LOGIN + REGISTER + ROUTER ────────────
// ═══════════════════════════════════════════
function LoginScreen({onLogin, appData, save}) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const clearErr = () => { setErr(""); setSuccess(""); };

  const doLogin = async () => {
    if (!phone.trim() || !password) { setErr("请输入手机号和密码"); return; }
    setLoading(true); clearErr();
    let cancelled = false;
    const timeout = setTimeout(() => { cancelled = true; setErr("网络超时，请检查网络连接后重试"); setLoading(false); }, 15000);
    try {
      const fakeEmail = `${phone.trim()}@pmp.local`;
      const { data, error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password });
      if (cancelled) return;
      if (error) {
        clearTimeout(timeout);
        if (error.message.includes("Invalid login")) setErr("手机号或密码错误");
        else if (error.message.includes("fetch")) setErr("网络连接失败，请检查网络");
        else setErr(error.message);
        setLoading(false);
        return;
      }
      if (data.user) {
        // Fetch profile — also protected by the same timeout
        const { data: profile, error: profErr } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
        if (cancelled) return;
        clearTimeout(timeout);
        if (profile && !profErr) {
          onLogin(profile);
        } else {
          // Profile missing (orphaned auth user) — auto-create profile
          console.warn("Profile missing, auto-creating:", profErr);
          const existingStaff = (appData?.staff || []).find(s => s.phone === phone.trim());
          const staffId = existingStaff?.id || uid();
          const { data: newProfile, error: createErr } = await supabase.from("profiles").insert({
            id: data.user.id,
            phone: phone.trim(),
            name: data.user.user_metadata?.name || phone.trim(),
            role: existingStaff?.role || "普通员工",
            is_admin: existingStaff?.isAdmin || false,
            staff_id: staffId,
            color: existingStaff?.color || PIE_COLORS[Math.floor(Math.random() * PIE_COLORS.length)]
          }).select().single();
          if (newProfile && !createErr) {
            onLogin(newProfile);
          } else {
            console.error("Auto-create profile failed:", createErr);
            setErr("用户资料创建失败，请联系管理员");
          }
        }
      }
    } catch (e) {
      if (cancelled) return;
      clearTimeout(timeout);
      if (e.message?.includes("fetch")) setErr("网络连接失败，请检查网络");
      else setErr("登录失败: " + e.message);
    }
    setLoading(false);
  };

  const doRegister = async () => {
    if (!phone.trim() || !password || !name.trim()) { setErr("请填写所有字段"); return; }
    if (password.length < 6) { setErr("密码至少6位"); return; }
    if (!/^1\d{10}$/.test(phone.trim())) { setErr("请输入正确的11位手机号"); return; }
    setLoading(true); clearErr();
    let cancelled = false;
    const timeout = setTimeout(() => { cancelled = true; setErr("网络超时，请检查网络连接后重试"); setLoading(false); }, 15000);
    try {
      const fakeEmail = `${phone.trim()}@pmp.local`;
      // Check if phone already registered in profiles
      const { data: existing } = await supabase.from("profiles").select("id").eq("phone", phone.trim()).maybeSingle();
      if (cancelled) return;
      if (existing) { clearTimeout(timeout); setErr("该手机号已注册"); setLoading(false); return; }

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: fakeEmail,
        password,
        options: { data: { name: name.trim(), phone: phone.trim() } }
      });
      if (cancelled) return;
      if (authErr) {
        if (authErr.message.includes("already registered")) {
          // Orphaned auth user (no profile) — try logging in and auto-create profile
          const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email: fakeEmail, password });
          if (cancelled) return;
          if (loginErr) {
            clearTimeout(timeout);
            setErr("该手机号已注册但密码不匹配，请尝试登录或联系管理员");
            setLoading(false); return;
          }
          // Login succeeded, create missing profile
          const existingStaff = (appData?.staff || []).find(s => s.phone === phone.trim());
          const staffId = existingStaff?.id || uid();
          const { data: newProfile, error: profCreateErr } = await supabase.from("profiles").insert({
            id: loginData.user.id,
            phone: phone.trim(),
            name: name.trim(),
            role: existingStaff?.role || "普通员工",
            is_admin: existingStaff?.isAdmin || false,
            staff_id: staffId,
            color: existingStaff?.color || PIE_COLORS[Math.floor(Math.random() * PIE_COLORS.length)]
          }).select().single();
          if (cancelled) return;
          clearTimeout(timeout);
          if (newProfile && !profCreateErr) {
            // Sync to staff array if not already present
            if (!existingStaff && save && appData) {
              try { save({...appData, staff: [...(appData.staff||[]), {id:staffId, name:name.trim(), phone:phone.trim(), role:"普通员工", isAdmin:false, permission:"editor", color:newProfile.color||PIE_COLORS[0]}]}); } catch(e) { console.warn("Staff sync failed:", e); }
            }
            onLogin(newProfile);
          } else {
            setErr("用户资料创建失败，请联系管理员");
          }
          setLoading(false); return;
        }
        clearTimeout(timeout);
        setErr(authErr.message);
        setLoading(false); return;
      }
      if (authData.user) {
        // Match existing staff by phone number to preserve task assignments
        const existingStaff = (appData?.staff || []).find(s => s.phone === phone.trim());
        const staffId = existingStaff?.id || uid();
        const staffColor = existingStaff?.color || PIE_COLORS[Math.floor(Math.random() * PIE_COLORS.length)];
        const staffRole = existingStaff?.role || "普通员工";
        // Create profile
        const { error: profErr } = await supabase.from("profiles").insert({
          id: authData.user.id,
          phone: phone.trim(),
          name: name.trim(),
          role: staffRole,
          is_admin: existingStaff?.isAdmin || false,
          staff_id: staffId,
          color: staffColor
        });
        if (cancelled) return;
        if (profErr) {
          clearTimeout(timeout);
          setErr("注册失败：无法创建用户资料，请联系管理员");
          await supabase.auth.signOut();
          setLoading(false); return;
        }
        clearTimeout(timeout);
        // Auto-login: fetch profile and log in directly
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", authData.user.id).single();
        if (cancelled) return;
        if (profile) {
          // Sync to staff array if not already present
          if (!existingStaff && save && appData) {
            try { save({...appData, staff: [...(appData.staff||[]), {id:staffId, name:name.trim(), phone:phone.trim(), role:staffRole, isAdmin:false, permission:"editor", color:staffColor}]}); } catch(e) { console.warn("Staff sync failed:", e); }
          }
          onLogin(profile);
        } else {
          setSuccess("注册成功！请登录");
          setMode("login");
          setPassword("");
        }
      }
    } catch (e) {
      if (cancelled) return;
      clearTimeout(timeout);
      if (e.message?.includes("fetch")) setErr("网络连接失败，请检查网络");
      else setErr("注册失败: " + e.message);
    }
    setLoading(false);
  };

  const go = mode === "login" ? doLogin : doRegister;

  return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,fontFamily:T.font,padding:"16px"}}>
    <GlobalStyles/>
    <div style={{background:T.card,borderRadius:20,padding:"48px 44px",width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.08)",border:`1px solid ${T.borderLight}`}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{width:56,height:56,borderRadius:14,background:T.accent,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:16,color:"#fff",boxShadow:`0 4px 16px ${T.accent}40`}}><Mountain size={28}/></div>
        <h1 style={{margin:0,fontSize:22,fontWeight:700,color:T.text1}}>第二座山集团</h1>
        <p style={{margin:"6px 0 0",fontSize:13,color:T.text3}}>新媒体运营管理系统</p>
      </div>

      {/* Tab switch */}
      <div style={{display:"flex",background:T.borderLight,borderRadius:10,padding:3,marginBottom:24}}>
        {[["login","登录",Lock],["register","注册",UserPlus]].map(([m,l,Icon])=>
          <button key={m} onClick={()=>{setMode(m);clearErr();}} style={{flex:1,padding:"9px 0",fontSize:13,fontWeight:mode===m?700:500,color:mode===m?T.text1:T.text3,background:mode===m?T.card:"transparent",border:"none",borderRadius:8,cursor:"pointer",transition:T.transition,display:"flex",alignItems:"center",justifyContent:"center",gap:5,boxShadow:mode===m?T.shadow:"none"}}>
            <Icon size={14}/>{l}
          </button>
        )}
      </div>

      {mode === "register" && <Input label="姓名" placeholder="请输入姓名" value={name} onChange={e=>{setName(e.target.value);clearErr();}}/>}
      <Input label="手机号" placeholder="请输入11位手机号" value={phone} onChange={e=>{setPhone(e.target.value);clearErr();}}/>
      <div style={{position:"relative"}}>
        <Input label="密码" placeholder={mode==="register"?"设置密码（至少6位）":"请输入密码"} type="password" value={password}
          onChange={e=>{setPassword(e.target.value);clearErr();}}
          onKeyDown={e=>e.key==="Enter"&&go()}/>
      </div>

      {err && <p style={{color:T.danger,fontSize:12,margin:"-4px 0 12px",display:"flex",alignItems:"center",gap:4}}><AlertCircle size={12}/> {err}</p>}
      {success && <p style={{color:T.success,fontSize:12,margin:"-4px 0 12px",display:"flex",alignItems:"center",gap:4}}><CheckCircle2 size={12}/> {success}</p>}

      <Btn onClick={go} disabled={loading} style={{width:"100%",padding:"11px 0",fontSize:14,borderRadius:10,justifyContent:"center"}}>
        {loading ? <><Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/> 处理中...</> : mode==="login" ? <><Lock size={14}/> 登录</> : <><UserPlus size={14}/> 注册</>}
      </Btn>

      <p style={{textAlign:"center",marginTop:16,fontSize:12,color:T.text3}}>
        {mode==="login" ? <>没有账号？<span style={{color:T.accent,cursor:"pointer",fontWeight:600}} onClick={()=>{setMode("register");clearErr();}}>立即注册</span></> : <>已有账号？<span style={{color:T.accent,cursor:"pointer",fontWeight:600}} onClick={()=>{setMode("login");clearErr();}}>返回登录</span></>}
      </p>
    </div>
  </div>;
}

export default function App() {
  const { data, save, loading: dataLoading, syncStatus } = useStorage();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const auditLog = useAuditLog();
  const taskInstancesHook = useTaskInstances();
  const deliverablesHook = useDeliverables();

  // Listen for Supabase Auth state changes
  useEffect(() => {
    // Check existing session with timeout to prevent infinite loading
    const authTimeout = setTimeout(() => { setAuthLoading(false); }, 10000);
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (session?.user) {
          const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
          if (profile && !error) setUser(profile);
          else {
            // Profile missing (orphaned session) — sign out to avoid stuck state
            console.warn("Profile not found, signing out orphaned session", error);
            await supabase.auth.signOut();
          }
        }
      } catch (e) { console.error("Session check error:", e); }
      clearTimeout(authTimeout);
      setAuthLoading(false);
    }).catch(() => { clearTimeout(authTimeout); setAuthLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      // Only handle sign-out here; sign-in is handled by doLogin/doRegister directly
      if (event === "SIGNED_OUT") setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const onLogin = (profile) => setUser(profile);

  const onLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // ── Employee merged save: merges filtered update back into full dataset ──
  // Employees receive filteredData (only their projects) as their `data` prop.
  // If they call save({...data, projects: updated}), they'd overwrite app_data
  // with only their subset. This wrapper merges action-level changes back into
  // the full project tree so no other data is lost.
  const employeeSave = useCallback((filteredUpdate) => {
    const mergedProjects = (data.projects || []).map(fp => {
      const ep = (filteredUpdate.projects || []).find(p => p.id === fp.id);
      if (!ep) return fp;
      return {
        ...fp,
        categories: (fp.categories || []).map(fc => {
          const ec = (ep.categories || []).find(c => c.id === fc.id);
          if (!ec) return fc;
          return {
            ...fc,
            resources: (fc.resources || []).map(fr => {
              const er = (ec.resources || []).find(r => r.id === fr.id);
              if (!er) return fr;
              return {
                ...fr,
                actions: (fr.actions || []).map(fa => {
                  const ea = (er.actions || []).find(a => a.id === fa.id);
                  return ea ? { ...fa, ...ea } : fa;
                })
              };
            })
          };
        })
      };
    });
    return save({ ...data, projects: mergedProjects });
  }, [data, save]);

  // ── Data filtering for non-admin users (must be before any conditional returns) ──
  const filteredData = useMemo(() => {
    if (!data || !user) return data;
    if (user.is_admin) return data;
    const myStaffId = user.staff_id;
    if (!myStaffId) return { ...data, projects: [] };

    const myProjects = (data.projects || []).map(p => {
      const cats = (p.categories || []).map(c => {
        const resources = (c.resources || []).filter(r =>
          r.owner === myStaffId || (r.actions || []).some(a => a.staffId === myStaffId)
        ).map(r => ({
          ...r,
          actions: (r.actions || []).filter(a => a.staffId === myStaffId)
        }));
        return resources.length > 0 ? { ...c, resources } : null;
      }).filter(Boolean);
      return cats.length > 0 ? { ...p, categories: cats } : null;
    }).filter(Boolean);

    return { ...data, projects: myProjects };
  }, [data, user]);

  // Bridge: sync profile to staff array if not present
  useEffect(() => {
    if (!data || !user) return;
    const staffExists = (data.staff || []).some(s => s.id === user.staff_id || s.phone === user.phone);
    if (!staffExists && user.staff_id) {
      const newStaff = [...(data.staff || []), {
        id: user.staff_id,
        name: user.name,
        phone: user.phone,
        role: user.role || "普通员工",
        isAdmin: user.is_admin,
        permission: user.is_admin ? "admin" : "editor",
        color: user.color || T.accent,
      }];
      save({ ...data, staff: newStaff });
    }
  }, [data, user]);

  // Loading state
  if (authLoading || dataLoading || !data) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,fontFamily:T.font}}>
    <GlobalStyles/>
    <div style={{textAlign:"center"}}>
      <div style={{color:T.accent,marginBottom:12}}><Loader2 size={36} style={{animation:"spin 1s linear infinite"}}/></div>
      <div style={{color:T.text3,fontSize:13}}>加载中...</div>
    </div>
  </div>;

  if (!user) return <LoginScreen onLogin={onLogin} appData={data} save={save}/>;

  const viewData = user.is_admin ? data : filteredData;

  if (user.is_admin) return <AdminApp data={viewData} user={{...user, id: user.staff_id, isAdmin: true}} save={save} syncStatus={syncStatus} auditLog={auditLog} taskInstancesHook={taskInstancesHook} deliverablesHook={deliverablesHook} onLogout={onLogout}/>;
  return <EmployeeApp data={viewData} user={{...user, id: user.staff_id, isAdmin: false}} save={employeeSave} syncStatus={syncStatus} auditLog={auditLog} taskInstancesHook={taskInstancesHook} deliverablesHook={deliverablesHook} onLogout={onLogout}/>;
}
