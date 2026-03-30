import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from "recharts";
import {
  Mountain, LayoutDashboard, Settings, ClipboardList, CalendarDays, BarChart3, Users,
  ChevronRight, ChevronDown, Plus, Pencil, Trash2, X, Check, CheckCircle2, Circle,
  CircleDot, Smartphone, Store, MessageCircle, Radio, Pin, RefreshCw, Target, Clock,
  FileText, AlertCircle, Zap, Bot, Send, Loader2, Copy, ChevronLeft, ListTodo,
  UserCircle, Phone, Star, GripVertical, Search, CalendarClock, TrendingUp,
  ShieldAlert, History, Bell, CalendarCheck, ChevronUp, Filter, Download, TriangleAlert, LogOut,
  GitBranch, Milestone, GanttChartSquare, AlertOctagon, Link2, Paperclip, Eye, Unlink
} from "lucide-react";
import { supabase, TABLE } from "./supabase.js";

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
const uid = () => Math.random().toString(36).slice(2, 10);
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

  // Load from Supabase, fallback to localStorage
  useEffect(() => {
    (async () => {
      try {
        const { data: row, error } = await supabase.from(TABLE).select("data").eq("id", "main").single();
        if (row?.data && Object.keys(row.data).length > 0) {
          const merged = { ...DEFAULT_DATA, ...row.data };
          setData(merged);
          localStorage.setItem(SK, JSON.stringify(merged));
          setSyncStatus("synced");
        } else {
          // Try localStorage fallback
          const local = localStorage.getItem(SK);
          if (local) {
            const parsed = { ...DEFAULT_DATA, ...JSON.parse(local) };
            setData(parsed);
            // Push to Supabase
            await supabase.from(TABLE).upsert({ id: "main", data: parsed, updated_at: new Date().toISOString() });
            setSyncStatus("synced");
          } else {
            setData(DEFAULT_DATA);
            await supabase.from(TABLE).upsert({ id: "main", data: DEFAULT_DATA, updated_at: new Date().toISOString() });
            localStorage.setItem(SK, JSON.stringify(DEFAULT_DATA));
            setSyncStatus("synced");
          }
        }
      } catch (e) {
        console.warn("Supabase load failed, using localStorage:", e);
        const local = localStorage.getItem(SK);
        if (local) setData({ ...DEFAULT_DATA, ...JSON.parse(local) });
        else setData(DEFAULT_DATA);
        setSyncStatus("error");
      }
      setLoading(false);
    })();
  }, []);

  // Realtime subscription for multi-device sync
  useEffect(() => {
    const channel = supabase.channel('app-data-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLE, filter: 'id=eq.main' }, (payload) => {
        if (payload.new?.data) {
          const remote = { ...DEFAULT_DATA, ...payload.new.data };
          setData(remote);
          localStorage.setItem(SK, JSON.stringify(remote));
          setSyncStatus("synced");
        }
      })
      .subscribe();
    channelRef.current = channel;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  const save = useCallback(async (d) => {
    setData(d);
    localStorage.setItem(SK, JSON.stringify(d));
    setSyncStatus("syncing");
    try {
      await supabase.from(TABLE).upsert({ id: "main", data: d, updated_at: new Date().toISOString() });
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
const SyncBadge = ({ status }) => {
  const map = {
    idle: { c: T.text3, l: "本地", icon: Circle },
    syncing: { c: T.warning, l: "同步中", icon: Loader2 },
    synced: { c: T.success, l: "已同步", icon: CheckCircle2 },
    error: { c: T.danger, l: "离线", icon: AlertCircle },
  };
  const s = map[status] || map.idle;
  const Icon = s.icon;
  return <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:s.c,fontWeight:600,padding:"3px 8px",borderRadius:10,background:s.c+"10"}}>
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
    nav { display: none !important; }
    main { padding: 16px !important; }
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
// ─── AI CONFIG PANEL ─────────────────────
// ═══════════════════════════════════════════
const AI_PROVIDERS = [
  { v: "gemini", l: "Google Gemini", models: ["gemini-3.1-pro-preview", "gemini-3-flash", "gemini-3.1-flash-lite"] },
  { v: "anthropic", l: "Anthropic Claude", models: ["claude-sonnet-4-6-20260217", "claude-opus-4-6-20260205", "claude-haiku-4-5-20251015"] },
  { v: "openai", l: "OpenAI", models: ["gpt-5.4", "gpt-5.4-mini", "gpt-5.3-instant"] },
  { v: "deepseek", l: "DeepSeek", models: ["deepseek-v3.2", "deepseek-r1", "deepseek-v3"] },
  { v: "custom", l: "自定义 (OpenAI兼容)", models: [] },
];

function AIConfigPanel({ open, onClose }) {
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
        <code style={{ background: T.card, padding: "1px 6px", borderRadius: 4, fontSize: 10 }}>OPENAI_API_KEY</code> — OpenAI GPT<br/>
        <code style={{ background: T.card, padding: "1px 6px", borderRadius: 4, fontSize: 10 }}>DEEPSEEK_API_KEY</code> — DeepSeek<br/>
        <code style={{ background: T.card, padding: "1px 6px", borderRadius: 4, fontSize: 10 }}>CUSTOM_LLM_API_KEY</code> + <code style={{ background: T.card, padding: "1px 6px", borderRadius: 4, fontSize: 10 }}>CUSTOM_LLM_BASE_URL</code> — 自定义
      </div>
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
  const [chatMessages,setChatMessages] = useState([]); // {role:"user"|"assistant", content:string, parsed?:object}
  const [pendingOps,setPendingOps] = useState(null); // operations waiting for confirmation
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[chatMessages,loading]);

  const getStaffName = (sid) => staff.find(s=>s.id===sid)?.name || "未分配";
  const getProjectName = (pid) => projects.find(p=>p.id===pid)?.name || (pid === "__new__" ? "新项目" : "未知项目");

  const buildSystemPrompt = () => {
    const projSummary = projects.map(p => {
      const cats = (p.categories||[]).map(c => {
        const ress = (c.resources||[]).map(r => `      资源: "${r.name}" (id:${r.id}, type:${r.type}, platform:${r.platform||""}, owner:${r.owner})`).join("\n");
        return `    类别: "${c.name}" (id:${c.id}, cat:${c.cat})\n${ress}`;
      }).join("\n");
      return `  项目: "${p.name}" (id:${p.id}, priority:${p.priority})\n${cats}`;
    }).join("\n");
    const staffSummary = staff.map(s => `  ${s.name} (id:${s.id}, role:${s.role})`).join("\n");

    return `你是「第二座山集团新媒体运营管理系统」的AI项目助手。你的角色是帮助项目经理将文字描述（会议纪要、运营方案、口头指令）转化为结构化的项目任务数据。

## 核心原则
1. **严格关联**：系统是四级结构 L1项目 → L2工作类别 → L3资源/账号 → L4执行动作，每个层级必须挂载到上级
2. **不猜测留空**：用户没有明确提到的信息一律留空（""或0），等待用户后续补充。绝不自行推断截止日期、优先级、工时、频率等
3. **多轮追问**：当信息不完整时，主动追问缺失的关键信息。每次最多追问3个问题
4. **只做创建**：你只负责创建新的项目/类别/资源/动作，不修改、不删除、不调整现有数据

## 当前数据
项目和资源：
${projSummary}

人员：
${staffSummary}

## 约束
- 类别标签(cat)只能是: 新媒体, OTA, 外卖, 私域, 直播, 活动
- 资源类型(type)只能是: account, store, channel, live, other
- 平台只能是: 抖音, 小红书, 微信公众号, 微信视频号, 大众点评, 美团, 饿了么, 快手, 微博（或留空）
- 动作类型(aType): recurring(周期性) 或 once(一次性)
- 频率(freq): daily, weekly, biweekly, monthly
- 人员ID映射: ${staff.map(s=>`${s.name}=${s.id}`).join(", ")}

## 响应格式
你必须始终返回纯JSON（不要markdown代码块），格式如下：

{
  "message": "你对用户说的话（确认理解、追问、总结等）",
  "needsMoreInfo": true或false,
  "questions": ["追问问题1", "追问问题2"],
  "operations": [操作列表，当信息足够时才填写],
  "milestones": [为相关项目建议的里程碑],
  "risks": [识别到的风险]
}

### operations 支持的操作类型：

1. add_project — 创建全新项目（L1）
{
  "type": "add_project",
  "project": {
    "name": "项目名称",
    "priority": 0-3或留空,
    "isKey": true/false,
    "color": "#007AFF"
  },
  "categories": [
    {
      "name": "类别名称", "cat": "标签",
      "resources": [
        {
          "name": "资源名称", "type": "account等", "platform": "抖音等或空", "owner": "人员id或空",
          "actions": [
            {"name":"动作名","aType":"recurring/once","freq":"","count":"","staffId":"","hours":0,"deadline":"","note":""}
          ]
        }
      ]
    }
  ]
}

2. add_category — 向已有项目添加类别（L2）
{ "type": "add_category", "projectId": "已有项目id", "category": {"name":"","cat":""}, "resources": [同上] }

3. add_resource — 向已有类别添加资源（L3）
{ "type": "add_resource", "projectId": "已有项目id", "categoryId": "已有类别id", "resource": {"name":"","type":"","platform":"","owner":""}, "actions": [同上] }

4. add_action — 向已有资源添加动作（L4）
{ "type": "add_action", "projectId": "已有项目id", "categoryId": "已有类别id", "resourceId": "已有资源id", "action": {"name":"","aType":"","freq":"","count":"","staffId":"","hours":0,"deadline":"","note":""} }

### milestones 格式：
[{ "projectId": "项目id或__new__", "name": "里程碑名称", "date": "2026-04-15或留空" }]

### risks 格式：
[{ "projectId": "项目id或__new__", "name": "风险描述", "impact": 1-3, "probability": 1-3 }]

## 行为要求
- 收到模糊指令时先追问：谁负责？什么频率？属于哪个项目？具体做什么？
- 用户提到"新项目"/"新品牌"时用 add_project 创建全新项目
- 用户提到已有项目名时匹配 projectId，向其下添加
- 自动识别并建议里程碑（如"账号开设 → 内容规划 → 首批发布 → 运营稳定"）
- 自动识别潜在风险（如同一人任务过多、截止日太紧、依赖链过长）
- 当信息足够时 needsMoreInfo=false 并给出完整 operations
- 当信息不够时 needsMoreInfo=true，operations 可以为空或给出部分（标注哪些字段留空待补）`;
  };

  const callAI = async (userText) => {
    if(!userText.trim())return;
    const newUserMsg = {role:"user",content:userText};
    const updatedChat = [...chatMessages, newUserMsg];
    setChatMessages(updatedChat);
    setInput(""); setLoading(true);

    try {
      const aiConfig = JSON.parse(localStorage.getItem("sm-ai-config") || '{}');
      const provider = aiConfig.provider || "gemini";
      const model = aiConfig.model || "";
      const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL || 'https://divinifsucffsxyiyypc.supabase.co'}/functions/v1/ai-proxy`;

      // Build messages array for multi-turn
      const apiMessages = updatedChat.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.role === "assistant" ? (m.rawContent || m.content) : m.content
      }));

      const resp = await fetch(EDGE_FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpdmluaWZzdWNmZnN4eWl5eXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjgxNjksImV4cCI6MjA5MDEwNDE2OX0.VFqHzTvjN7wwo8ctwOfmL8-k7VJX93QeYDOzT8yLUuE'}`,
        },
        body: JSON.stringify({ provider, model, system: buildSystemPrompt(), messages: apiMessages })
      });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      const raw = result.text || "";
      const cleaned = raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
      const parsed = JSON.parse(cleaned);

      const assistantMsg = {
        role: "assistant",
        content: parsed.message || "已解析完成",
        rawContent: raw,
        parsed,
        hasOps: (parsed.operations||[]).length > 0,
        hasMilestones: (parsed.milestones||[]).length > 0,
        hasRisks: (parsed.risks||[]).length > 0,
        needsMoreInfo: parsed.needsMoreInfo,
        questions: parsed.questions || [],
      };
      setChatMessages([...updatedChat, assistantMsg]);

      // If has operations and doesn't need more info, set pending for confirmation
      if(assistantMsg.hasOps && !parsed.needsMoreInfo) {
        setPendingOps(parsed);
      }
    } catch(e) {
      console.error("AI Error:", e);
      setChatMessages([...updatedChat, {role:"assistant",content:`解析出错: ${e.message}。请重试或换一种描述方式。`,isError:true}]);
    }
    setLoading(false);
    setTimeout(()=>inputRef.current?.focus(),100);
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
      auditLog.addLog(user.id, user.name, "ai_create", "任务", opNames.join(", "), { count: parsed.operations?.length });
    }
  };

  const confirmOps = () => {
    if(!pendingOps)return;
    applyOperations(pendingOps);
    setChatMessages(prev=>[...prev,{role:"assistant",content:"已成功同步到系统！你可以在项目管理页面查看和调整细节。",isSuccess:true}]);
    setPendingOps(null);
  };

  const removeOp = (idx) => {
    if(!pendingOps)return;
    setPendingOps({...pendingOps, operations:pendingOps.operations.filter((_,i)=>i!==idx)});
  };

  const resetChat = () => { setChatMessages([]); setPendingOps(null); setInput(""); };

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
      <Btn small v="ghost" onClick={()=>setShowAIConfig(true)} style={{color:T.text3}}><Settings size={14}/></Btn>
    </div>

    <AIConfigPanel open={showAIConfig} onClose={()=>setShowAIConfig(false)} />

    {/* Chat area */}
    <div style={{maxHeight:480,overflowY:"auto",padding:"16px 24px"}}>
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
          AI 正在分析...
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
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();callAI(input);}}}
        />
        <Btn onClick={()=>callAI(input)} disabled={!input.trim()||loading} style={{height:40,padding:"0 18px"}}>
          {loading?<Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/>:<Send size={16}/>}
        </Btn>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
        <span style={{fontSize:10,color:T.text3}}>Enter 发送 · Shift+Enter 换行</span>
        <span style={{fontSize:10,color:T.text3}}>多轮对话模式 · AI 会主动追问缺失信息</span>
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
    ai_create: "AI创建", check_in: "打卡", uncheck: "取消打卡",
  };
  const actionColors = {
    create: T.success, update: T.accent, delete: T.danger, status_change: T.warning,
    ai_create: T.purple, check_in: T.success, uncheck: T.text3,
  };
  const actionIcons = {
    create: Plus, update: Pencil, delete: Trash2, status_change: RefreshCw,
    ai_create: Bot, check_in: CalendarCheck, uncheck: X,
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
function EmployeeApp({data,user,save,syncStatus,auditLog,taskInstancesHook,onLogout}) {
  const [view,setView]=useState("mytasks");
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

  return<div style={{display:"flex",minHeight:"100vh",fontFamily:T.font,background:T.bg}}>
    <GlobalStyles/>
    <div style={{width:220,minHeight:"100vh",background:T.sidebar,display:"flex",flexDirection:"column",flexShrink:0,borderRight:`1px solid ${T.border}`}}>
      <div style={{padding:"24px 20px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}><Mountain size={18}/></div>
          <div><div style={{fontSize:14,fontWeight:700,color:T.text1}}>第二座山</div><div style={{fontSize:10,color:T.text3}}>运营管理</div></div>
        </div>
      </div>
      <nav style={{flex:1,padding:"0 10px"}}>
        {[{id:"mytasks",icon:ListTodo,label:"我的工作"},{id:"recurring",icon:CalendarCheck,label:"周期任务"},{id:"team",icon:Users,label:"团队动态"}].map(n=>{
          const Icon=n.icon;const active=view===n.id;
          return<div key={n.id}onClick={()=>setView(n.id)}style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",marginBottom:2,borderRadius:T.radiusSm,cursor:"pointer",background:active?T.accentLight:"transparent",color:active?T.accent:T.text2,transition:T.transition,fontWeight:active?600:500}}>
            <Icon size={18}/><span style={{fontSize:13}}>{n.label}</span>
            {n.id==="mytasks"&&myActions.filter(a=>a.progress!==2).length>0&&<span style={{background:T.danger,color:"#fff",fontSize:9,fontWeight:700,borderRadius:10,padding:"2px 6px",marginLeft:"auto"}}>{myActions.filter(a=>a.progress!==2).length}</span>}
          </div>;
        })}
      </nav>
      <div style={{padding:"16px 14px",borderTop:`1px solid ${T.borderLight}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Avatar name={user.name} color={user.color||T.accent} size={32}/>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.text1}}>{user.name}</div><div style={{fontSize:10,color:T.text3}}>{user.role}</div></div>
          <SyncBadge status={syncStatus} />
          <button onClick={onLogout} title="退出登录" style={{background:T.borderLight,border:"none",width:28,height:28,borderRadius:14,cursor:"pointer",color:T.text3,display:"flex",alignItems:"center",justifyContent:"center",transition:T.transition,flexShrink:0}} onMouseEnter={e=>e.target.style.color=T.danger} onMouseLeave={e=>e.target.style.color=T.text3}><LogOut size={14}/></button>
        </div>
      </div>
    </div>
    <main style={{flex:1,padding:"28px 36px",overflowY:"auto",maxHeight:"100vh"}}>
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
  {id:"gantt",icon:GanttChartSquare,label:"甘特图"},
  {id:"recurring",icon:CalendarCheck,label:"周期任务"},
  {id:"risks",icon:AlertOctagon,label:"风险管理"},
  {id:"schedule",icon:CalendarDays,label:"工时排期"},
  {id:"reports",icon:BarChart3,label:"数据报表"},
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

function AdminApp({data,user,save,syncStatus,auditLog,taskInstancesHook,onLogout}) {
  const[view,setView]=useState("overview");
  const handleSearchNav=(type,id)=>{
    if(type==="action"||type==="project")setView("taskfilter");
    else if(type==="staff")setView("staff");
    else if(type==="risk")setView("risks");
  };
  return<div style={{display:"flex",minHeight:"100vh",fontFamily:T.font,background:T.bg}}>
    <GlobalStyles/>
    <div style={{width:240,minHeight:"100vh",background:T.sidebar,display:"flex",flexDirection:"column",flexShrink:0,borderRight:`1px solid ${T.border}`}}>
      <div style={{padding:"24px 20px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}><Mountain size={18}/></div>
          <div><div style={{fontSize:15,fontWeight:700,color:T.text1}}>第二座山</div><div style={{fontSize:10,color:T.text3}}>管理后台</div></div>
        </div>
      </div>
      <GlobalSearchBar data={data} onNavigate={handleSearchNav}/>
      <nav style={{flex:1,padding:"0 10px",overflowY:"auto"}}>
        {ADMIN_NAV.map(n=>{const Icon=n.icon;const active=view===n.id;
          return<div key={n.id}onClick={()=>setView(n.id)}style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",marginBottom:2,borderRadius:T.radiusSm,cursor:"pointer",background:active?T.accentLight:"transparent",color:active?T.accent:T.text2,transition:T.transition,fontWeight:active?600:500}}>
            <Icon size={18}/><span style={{fontSize:13}}>{n.label}</span>
          </div>;
        })}
      </nav>
      <div style={{padding:"16px 14px",borderTop:`1px solid ${T.borderLight}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Avatar name={user.name} color={user.color||T.accent} size={32}/>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.text1}}>{user.name}</div><div style={{fontSize:10,color:T.text3}}>{user.role} · 管理员</div></div>
          <SyncBadge status={syncStatus} />
          <button onClick={onLogout} title="退出登录" style={{background:T.borderLight,border:"none",width:28,height:28,borderRadius:14,cursor:"pointer",color:T.text3,display:"flex",alignItems:"center",justifyContent:"center",transition:T.transition,flexShrink:0}} onMouseEnter={e=>e.target.style.color=T.danger} onMouseLeave={e=>e.target.style.color=T.text3}><LogOut size={14}/></button>
        </div>
      </div>
    </div>
    <main style={{flex:1,padding:"28px 36px",overflowY:"auto",maxHeight:"100vh"}}>
      <div style={{animation:"fadeIn 0.3s ease"}}>
        {view==="overview"&&<OverviewView data={data} save={save} auditLog={auditLog} user={user}/>}
        {view==="projects"&&<ProjectsView data={data} save={save} auditLog={auditLog} user={user}/>}
        {view==="kanban"&&<KanbanView data={data} save={save} auditLog={auditLog} user={user}/>}
        {view==="taskfilter"&&<TaskFilterView data={data} save={save} auditLog={auditLog} user={user}/>}
        {view==="gantt"&&<GanttView data={data}/>}
        {view==="recurring"&&<RecurringTasksView data={data} save={save} user={user} taskInstancesHook={taskInstancesHook} auditLog={auditLog}/>}
        {view==="risks"&&<RiskView data={data} save={save} auditLog={auditLog} user={user}/>}
        {view==="schedule"&&<ScheduleView data={data} save={save}/>}
        {view==="reports"&&<ReportsView data={data}/>}
        {view==="staff"&&<StaffView data={data} save={save} auditLog={auditLog} user={user}/>}
        {view==="audit"&&<AuditLogView auditLog={auditLog} staff={data.staff}/>}
      </div>
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
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:24}}>
      {stats.map((s,i)=>{const Icon=s.icon;return<Card key={i} style={{padding:"16px 18px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:12,color:T.text3,fontWeight:600}}>{s.l}</span>
          <Icon size={16} color={s.c} strokeWidth={2}/>
        </div>
        <div style={{fontSize:26,fontWeight:800,color:s.c}}>{s.v}</div>
      </Card>;})}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
      <Card style={{padding:"20px 22px"}}><h4 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,color:T.text1}}>项目完成度</h4><ResponsiveContainer width="100%" height={180}><BarChart data={sorted.map(p=>{const pa=getAllActions([p]);return{name:p.name.slice(0,4),total:pa.length,done:pa.filter(a=>a.progress===2).length};})}barSize={18}><XAxis dataKey="name" tick={{fontSize:10,fill:T.text3}}/><YAxis tick={{fontSize:11,fill:T.text3}}/><Tooltip contentStyle={{borderRadius:8,fontSize:12,border:`1px solid ${T.border}`,boxShadow:T.shadowMd}}/><Bar dataKey="total" fill={T.borderLight} name="总动作" radius={[4,4,0,0]}/><Bar dataKey="done" fill={T.accent} name="已完成" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></Card>
      <Card style={{padding:"20px 22px"}}><h4 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,color:T.text1}}>人员工作量</h4><ResponsiveContainer width="100%" height={180}><BarChart data={workload} barSize={18}><XAxis dataKey="name" tick={{fontSize:10,fill:T.text3}}/><YAxis tick={{fontSize:11,fill:T.text3}}/><Tooltip contentStyle={{borderRadius:8,fontSize:12,border:`1px solid ${T.border}`,boxShadow:T.shadowMd}}/><Legend iconSize={10} wrapperStyle={{fontSize:11}}/><Bar dataKey="done" stackId="a" fill={T.success} name="完成"/><Bar dataKey="prog" stackId="a" fill={T.warning} name="进行中" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></Card>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
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
function ProjectsView({data,save,auditLog,user}){
  const{projects,staff}=data;const sorted=[...projects].sort((a,b)=>a.priority-b.priority);
  const[expanded,setExpanded]=useState({});const[modal,setModal]=useState(null);
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
    {sorted.map(p=>{const pOpen=expanded[p.id]!==false;const pa=getAllActions([p]);const pPct=pa.length?Math.round(pa.filter(a=>a.progress===2).length/pa.length*100):0;
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
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
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
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
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
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
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

// ─── Staff ──────────────────────────────
function StaffView({data,save,auditLog,user}){const{staff,projects}=data;const[edit,setEdit]=useState(null);const actions=getAllActions(projects);
  const STAFF_COLORS = [T.accent, T.success, T.purple, T.warning, T.teal, T.pink, "#5856D6", "#64D2FF"];
  const sv=p=>{const i=staff.findIndex(s=>s.id===p.id);const isNew=i<0;let n;if(i>=0){n=[...staff];n[i]=p;}else n=[...staff,p];save({...data,staff:n});setEdit(null);
    if(auditLog&&user)auditLog.addLog(user.id,user.name,isNew?"create":"update","人员",p.name);};
  return<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:700,color:T.text1,display:"flex",alignItems:"center",gap:8}}><Users size={22}/> 人员管理</h2>
      <Btn onClick={()=>setEdit({id:uid(),name:"",phone:"",role:"",isAdmin:false,color:T.accent})}><Plus size={14}/> 添加</Btn>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
      {staff.map(s=>{const sa=actions.filter(a=>a.staffId===s.id);return<Card key={s.id}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <Avatar name={s.name} color={s.color||T.accent} size={40}/>
            <div><div style={{fontSize:14,fontWeight:700,color:T.text1}}>{s.name}</div><div style={{fontSize:11,color:T.text3,display:"flex",alignItems:"center",gap:4}}>{s.role} <Badge color={s.permission==="admin"?T.danger:s.permission==="pm"?T.accent:s.permission==="editor"?T.teal:T.text3} small>{ROLE_LEVELS.find(r=>r.v===(s.permission||"viewer"))?.l||"查看者"}</Badge></div></div>
          </div>
          <div style={{display:"flex",gap:4}}>
            <Btn small v="ghost" onClick={()=>setEdit({...s})}><Pencil size={12}/></Btn>
            <Btn small v="danger" onClick={()=>{if(confirm("确定删除？")){save({...data,staff:staff.filter(x=>x.id!==s.id)});if(auditLog&&user)auditLog.addLog(user.id,user.name,"delete","人员",s.name);}}}><Trash2 size={12}/></Btn>
          </div>
        </div>
        <div style={{fontSize:12,color:T.text2,display:"flex",alignItems:"center",gap:8}}>
          <span style={{display:"flex",alignItems:"center",gap:3}}><Phone size={12}/> {s.phone}</span>
          <span>{sa.length}项</span>
          <span style={{display:"flex",alignItems:"center",gap:2}}><Clock size={11}/>{sa.reduce((sum,a)=>sum+(a.hours||0),0)}h</span>
        </div>
      </Card>;})}
    </div>
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
  </div>;
}

// ═══════════════════════════════════════════
// ─── LOGIN + ROUTER ───────────────────────
// ═══════════════════════════════════════════
function LoginScreen({staff,onLogin}){const[phone,setPhone]=useState("");const[err,setErr]=useState("");
  const go=()=>{const u=staff.find(s=>s.phone===phone.trim());u?onLogin(u):setErr("未找到该用户");};
  return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,fontFamily:T.font}}>
    <GlobalStyles/>
    <div style={{background:T.card,borderRadius:20,padding:"48px 44px",width:380,boxShadow:"0 20px 60px rgba(0,0,0,0.08)",border:`1px solid ${T.borderLight}`}}>
      <div style={{textAlign:"center",marginBottom:36}}>
        <div style={{width:56,height:56,borderRadius:14,background:T.accent,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:16,color:"#fff",boxShadow:`0 4px 16px ${T.accent}40`}}><Mountain size={28}/></div>
        <h1 style={{margin:0,fontSize:22,fontWeight:700,color:T.text1}}>第二座山集团</h1>
        <p style={{margin:"6px 0 0",fontSize:13,color:T.text3}}>新媒体运营管理系统</p>
      </div>
      <Input label="手机号" placeholder="请输入手机号" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()}/>
      {err&&<p style={{color:T.danger,fontSize:12,margin:"-6px 0 10px",display:"flex",alignItems:"center",gap:4}}><AlertCircle size={12}/> {err}</p>}
      <Btn onClick={go} style={{width:"100%",padding:"11px 0",fontSize:14,borderRadius:10,justifyContent:"center"}}>登录</Btn>
      <div style={{marginTop:24,padding:"14px 16px",background:T.borderLight,borderRadius:T.radius,fontSize:11,color:T.text3}}>
        <div style={{fontWeight:600,marginBottom:6,color:T.text2}}>快速登录</div>
        {staff.map(s=><div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"}}>
          <span style={{display:"flex",alignItems:"center",gap:6}}><Avatar name={s.name} color={s.color||T.accent} size={18}/> {s.name}（{s.role}）</span>
          <span style={{color:T.accent,cursor:"pointer",fontWeight:600,transition:T.transition}} onClick={()=>setPhone(s.phone)}
            onMouseEnter={e=>e.target.style.opacity="0.7"} onMouseLeave={e=>e.target.style.opacity="1"}>{s.phone}</span>
        </div>)}
      </div>
    </div>
  </div>;
}

export default function App(){
  const{data,save,loading,syncStatus}=useStorage();
  const[user,setUser]=useState(null);
  const auditLog = useAuditLog();
  const taskInstancesHook = useTaskInstances();

  if(loading||!data)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,fontFamily:T.font}}>
    <GlobalStyles/>
    <div style={{textAlign:"center"}}>
      <div style={{color:T.accent,marginBottom:12}}><Loader2 size={36} style={{animation:"spin 1s linear infinite"}}/></div>
      <div style={{color:T.text3,fontSize:13}}>加载中...</div>
    </div>
  </div>;
  if(!user)return<LoginScreen staff={data.staff} onLogin={setUser}/>;
  const onLogout = () => setUser(null);
  if(user.isAdmin)return<AdminApp data={data} user={user} save={save} syncStatus={syncStatus} auditLog={auditLog} taskInstancesHook={taskInstancesHook} onLogout={onLogout}/>;
  return<EmployeeApp data={data} user={user} save={save} syncStatus={syncStatus} auditLog={auditLog} taskInstancesHook={taskInstancesHook} onLogout={onLogout}/>;
}
