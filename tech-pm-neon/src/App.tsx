import React, { useEffect, useMemo, useRef, useState } from "react";

// ✅ 纯 React 单文件，无外部依赖；修复：
// 1) 新增项目/子项目不再用 prompt，提供顶部表单（支持选择父级/阶段）
// 2) 任务行新增【标记完成】与【删除】按钮；复选框仍可切换完成
// 3) 新增“项目详情”编辑区（名称/阶段/起止时间/交付物、删除项目）
// 4) 多处交互与空状态优化，避免无法添加/误操作

// ===================== 简易存储 =====================
const LS_KEY = "tech_pm_store_v3";
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

type Stage = "规划" | "执行" | "收尾" | "暂停" | "归档";
type Project = { id: string; parentId: string | null; name: string; stage: Stage; startAt?: string | null; endAt?: string | null; deliverables?: string; };
type TaskStatus = "待办" | "进行中" | "完成";
type Task = { id: string; projectId: string; title: string; status: TaskStatus; dueAt?: string | null; tags?: string[]; createdAt: string; };
type Store = { projects: Project[]; tasks: Task[]; motto: string; };

function loadStore(): Store{
  const raw = localStorage.getItem(LS_KEY);
  if(raw){ try{ return JSON.parse(raw) as Store;}catch{} }
  const p1: Project = { id: uid(), parentId: null, name: "效率蛰伏所", stage: "规划", startAt: null, endAt: null, deliverables: "" };
  const p2: Project = { id: uid(), parentId: null, name: "杉渡咨询", stage: "执行", startAt: null, endAt: null, deliverables: "" };
  const p3: Project = { id: uid(), parentId: null, name: "币安空投", stage: "执行", startAt: null, endAt: null, deliverables: "" };
  const p4: Project = { id: uid(), parentId: null, name: "OKX Booster", stage: "规划", startAt: null, endAt: null, deliverables: "" };
  const s11: Project = { id: uid(), parentId: p1.id, name: "产品/功能", stage: "规划", startAt: null, endAt: null, deliverables: "" };
  const s21: Project = { id: uid(), parentId: p2.id, name: "客户&品牌", stage: "执行", startAt: null, endAt: null, deliverables: "" };
  const s31: Project = { id: uid(), parentId: p3.id, name: "本周活动", stage: "执行", startAt: null, endAt: null, deliverables: "" };
  const tasks: Task[] = [
    { id: uid(), projectId: s11.id, title: "定义 MVP 模块", status: "进行中", dueAt: null, tags: ["产品"], createdAt: new Date().toISOString() },
    { id: uid(), projectId: s11.id, title: "首页科技风稿", status: "待办", dueAt: null, tags: ["设计"], createdAt: new Date().toISOString() },
    { id: uid(), projectId: s21.id, title: "官网文案 V1", status: "完成", dueAt: null, tags: ["品牌"], createdAt: new Date(Date.now()-86400000).toISOString() },
  ];
  return { projects: [p1,p2,p3,p4,s11,s21,s31], tasks, motto: "搞掂一项，向目标更近一步。" };
}

function saveStore(s: Store){ try{ localStorage.setItem(LS_KEY, JSON.stringify(s)); }catch{} }

// ===================== 小组件 =====================
function Button({ children, onClick, variant = "solid", small=false, className="", title } : { children: React.ReactNode; onClick?: ()=>void; variant?: "solid"|"ghost"; small?: boolean; className?: string; title?: string; }){
  return (
    <button title={title} onClick={onClick} className={
      `${variant==="solid"?"bg-cyan-600 hover:bg-cyan-500":"bg-transparent hover:bg-neutral-800"} `+
      `text-white border border-neutral-700 rounded ${small?"px-2 py-1 text-sm":"px-3 py-1.5"} ${className}`
    }>{children}</button>
  );
}
function Input({ value, onChange, placeholder, type="text", className="" }:{ value?: any; onChange?: any; placeholder?: string; type?: string; className?: string; }){
  return <input value={value} onChange={onChange} placeholder={placeholder} type={type} className={`bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white ${className}`} />
}
function TextArea({ value, onChange, className="" }:{ value: string; onChange: any; className?: string; }){
  return <textarea value={value} onChange={onChange} className={`w-full min-h-[72px] bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white ${className}`} />
}
function Card({ title, right, children, className="" }:{ title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string; }){
  return (
    <div className={`rounded-lg border border-neutral-800 bg-neutral-900/60 ${className}`}>
      {(title || right) && (
        <div className="px-3 py-2 border-b border-neutral-800 flex items-center justify-between">
          <div className="text-sm text-neutral-200">{title}</div>
          <div>{right}</div>
        </div>
      )}
      <div className="p-3">{children}</div>
    </div>
  );
}
function NeonProgress({ value }:{ value:number }){
  const v = Math.max(0, Math.min(100, value||0));
  return (
    <div className="w-full h-3 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700">
      <div className="h-full rounded-full neon-bar" style={{ width: `${v}%` }} />
    </div>
  );
}
function Sparkline({ points }:{ points:number[] }){
  if (!points.length) return <div className="text-neutral-400 text-xs">暂无数据</div>;
  const max = Math.max(...points, 1);
  const w = 180, h = 40; const step = w/(points.length-1 || 1);
  const d = points.map((p,i)=>`${i===0?"M":"L"}${i*step},${h - (p/max)*h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={d} fill="none" stroke="#22d3ee" strokeWidth={2} />
    </svg>
  );
}

// ===================== 主组件 =====================
export default function App(){
  const [store, setStore] = useState<Store>(()=>loadStore());
  useEffect(()=> saveStore(store), [store]);

  const [selectedPid, setSelectedPid] = useState<string|null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatus | "全部">("全部");
  const [tag, setTag] = useState("");

  // 新建项目表单
  const [npName, setNpName] = useState("");
  const [npParent, setNpParent] = useState("root"); // root 表示顶级
  const [npStage, setNpStage] = useState<Stage>("规划");

  // Timer
  const [secs, setSecs] = useState(25*60);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<number | null>(null);
  useEffect(()=>{
    if(!running) return; 
    timerRef.current = window.setInterval(()=>{
      setSecs(s=>{ if(s<=1){ if(timerRef.current) clearInterval(timerRef.current); setRunning(false); notify("专注完成！干得漂亮 ✨"); return 0;} return s-1; });
    },1000);
    return ()=>{ if(timerRef.current) clearInterval(timerRef.current); };
  },[running]);
  useEffect(()=>{ if("Notification" in window && Notification.permission === "default") Notification.requestPermission(); },[]);

  // 结构 & 统计
  const rootProjects = useMemo(()=> store.projects.filter(p=>p.parentId===null), [store.projects]);
  const childrenOf: Record<string, Project[]> = useMemo(()=> Object.fromEntries(store.projects.map(p=>[p.id, store.projects.filter(x=>x.parentId===p.id)])), [store.projects]) as Record<string, Project[]>;
  const totalTasks = store.tasks.length;
  const doneTasks = store.tasks.filter(t=>t.status==="完成").length;
  const runningProjects = store.projects.filter(p=>p.stage==="执行").length;
  const overall = totalTasks? Math.round(doneTasks/totalTasks*100):0;

  const taskList = useMemo(()=>{
    let list = store.tasks;
    if(selectedPid){
      const children = childrenOf[selectedPid]||[];
      const ids = new Set([selectedPid, ...children.map(c=>c.id)]);
      list = list.filter(t=>ids.has(t.projectId));
    }
    if(status!=="全部") list = list.filter(t=>t.status===status);
    if(tag.trim()) list = list.filter(t=>(t.tags||[]).includes(tag.trim()));
    if(query.trim()) list = list.filter(t=> t.title.toLowerCase().includes(query.toLowerCase()));
    return [...list].sort((a,b)=>{
      const aw = a.status==="完成"?1:0, bw = b.status==="完成"?1:0; if(aw!==bw) return aw-bw;
      const ad = a.dueAt? new Date(a.dueAt).getTime(): Infinity; const bd = b.dueAt? new Date(b.dueAt).getTime(): Infinity; return ad-bd;
    });
  },[store.tasks, selectedPid, childrenOf, status, tag, query]);

  function fmt(dateISO?: string | null){ if (!dateISO) return ""; const d = new Date(dateISO); if(isNaN(d as any)) return ""; const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,"0"); const d2=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${d2}`; }
  function notify(msg:string){ if("Notification" in window && Notification.permission==="granted"){ new Notification(msg); } }
  function projectProgress(pid:string){
    const childIds = (childrenOf[pid]||[]).map(c=>c.id);
    const ids = new Set([pid, ...childIds]);
    const related = store.tasks.filter(t=>ids.has(t.projectId)); if(!related.length) return 0;
    const done = related.filter(t=>t.status==="完成").length; return Math.round(done/related.length*100);
  }

  // ============ 关键动作 ============
  function createProject(){
    const name = npName.trim(); if(!name) return alert("请输入项目名称");
    const parentId = npParent === "root" ? null : npParent;
    const project: Project = { id: uid(), parentId, name, stage: npStage, startAt: null, endAt: null, deliverables: "" };
    setStore({ ...store, projects: [...store.projects, project] });
    setNpName(""); setNpParent("root"); setNpStage("规划");
    if(parentId){ setSelectedPid(parentId); } else { setSelectedPid(project.id); }
  }
  function deleteProject(pid:string){
    const hasChildren = (childrenOf[pid]||[]).length>0;
    const hasTasks = store.tasks.some(t=>t.projectId===pid);
    if(hasChildren || hasTasks){
      const ok = confirm("该项目存在子项目或任务，确认级联删除？此操作不可撤销。");
      if(!ok) return;
    }
    const removeIds = new Set([pid, ...(childrenOf[pid]||[]).map(c=>c.id)]);
    setStore({
      ...store,
      projects: store.projects.filter(p=>!removeIds.has(p.id)),
      tasks: store.tasks.filter(t=>!removeIds.has(t.projectId))
    });
    setSelectedPid(null);
  }
  function quickAddTask(title:string){
    const txt = String(title||"").trim(); if(!txt) return;
    const pid = selectedPid || (rootProjects[0] && rootProjects[0].id);
    if(!pid) return alert("请先创建一个项目");
    setStore({ ...store, tasks: [{ id: uid(), projectId: pid, title: txt, status: "待办", dueAt: null, tags: [], createdAt: new Date().toISOString() }, ...store.tasks] });
  }
  function markDone(id:string){ setStore({ ...store, tasks: store.tasks.map(t=> t.id===id?{...t, status:"完成"}:t) }); }
  function toggleTask(id:string){ setStore({ ...store, tasks: store.tasks.map(t=> t.id===id?{...t, status: t.status==="完成"?"待办":"完成"}:t) }); }
  function deleteTask(id:string){ setStore({ ...store, tasks: store.tasks.filter(t=> t.id!==id) }); }
  function setDueReminder(t:Task){
    if(!t.dueAt) return alert("该任务没有截止时间");
    if(!("Notification" in window)) return alert("浏览器不支持通知");
    Notification.requestPermission().then(p=>{
      if(p!=="granted") return alert("未授权通知");
      const ms = new Date(t.dueAt!).getTime() - Date.now(); if(ms<=0) return alert("截止时间已过");
      setTimeout(()=> notify(`到期提醒：${t.title}`), ms);
      alert("已设置到期提醒");
    });
  }
  function exportJSON(){ const blob = new Blob([JSON.stringify(store,null,2)],{type:"application/json"}); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download=`tech-pm-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url); }
  function importJSON(ev: React.ChangeEvent<HTMLInputElement>){ const f=ev.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ const data = JSON.parse(String(r.result)) as Store; setStore(data); alert("导入成功"); }catch{ alert("导入失败：JSON 格式错误"); } }; r.readAsText(f); }

  const selectedProject = selectedPid ? store.projects.find(p=>p.id===selectedPid) : null;

  return (
    <div className="page">
      <div className="bgfx"/>
      <header className="header">
        <div className="brand">⚡ 科技风项目管理 · MVP</div>
        <div className="actions">
          <Button onClick={exportJSON}>导出 JSON</Button>
          <label className="importLabel">导入 JSON<input type="file" accept="application/json" onChange={importJSON} /></label>
        </div>
      </header>

      <main className="grid">
        {/* 左：项目树 + 新建表单 */}
        <section className="left">
          <Card title="新建项目/子项目">
            <div className="newRow">
              <Input placeholder="项目名称" value={npName} onChange={(e:any)=>setNpName(e.target.value)} />
              <select className="select" value={npStage} onChange={(e)=>setNpStage(e.target.value as Stage)}>
                {['规划','执行','收尾','暂停','归档'].map(s=> <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="newRow">
              <select className="select" value={npParent} onChange={(e)=>setNpParent(e.target.value)}>
                <option value="root">作为顶级项目</option>
                {rootProjects.map(r=> <option key={r.id} value={r.id}>作为 {r.name} 的子项目</option>)}
              </select>
              <Button onClick={createProject}>+ 创建</Button>
            </div>
          </Card>

          <Card title="项目 / 子项目">
            {rootProjects.length===0 && <div className="muted">暂无项目，请先在上方创建。</div>}
            {rootProjects.map(root=> (
              <div key={root.id}>
                <div className={`item ${selectedPid===root.id?"active":""}`} onClick={()=>setSelectedPid(root.id)}>
                  <div className="row"><span>{root.name}</span><span className="muted">· {root.stage}</span></div>
                  <div className="bar"><NeonProgress value={projectProgress(root.id)} /></div>
                </div>
                <div className="children">
                  {(childrenOf[root.id]||[]).map(c=> (
                    <div key={c.id} className={`item child ${selectedPid===c.id?"active":""}`} onClick={()=>setSelectedPid(c.id)}>
                      <div className="row"><span>└ {c.name}</span><span className="muted">· {c.stage}</span></div>
                      <div className="bar small"><NeonProgress value={projectProgress(c.id)} /></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>

          <Card title="专注计时器">
            <div className="timer">{`${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`}</div>
            <div className="btns">
              <Button small onClick={()=>{ setSecs(25*60); setRunning(false); }}>25m</Button>
              <Button small onClick={()=>{ setSecs(50*60); setRunning(false); }}>50m</Button>
              <Button small onClick={()=>{ setSecs(90*60); setRunning(false); }}>90m</Button>
            </div>
            <div className="btns">
              {!running? <Button small onClick={()=>setRunning(true)}>开始</Button> : <Button small variant="ghost" onClick={()=>setRunning(false)}>暂停</Button>}
              <Button small variant="ghost" onClick={()=>{ setRunning(false); setSecs(25*60); }}>重置</Button>
            </div>
          </Card>
        </section>

        {/* 右：Dashboard + 项目详情 + 任务 */}
        <section className="right">
          <div className="top">
            <Card title="总览">
              <div className="stats">
                <div><div className="muted">任务总数</div><div className="big">{totalTasks}</div></div>
                <div><div className="muted">完成任务数</div><div className="big">{doneTasks}</div></div>
                <div><div className="muted">执行中项目数</div><div className="big">{runningProjects}</div></div>
                <div>
                  <div className="muted">整体进度</div>
                  <NeonProgress value={overall} />
                  <div className="muted mt8">{overall}%</div>
                </div>
              </div>
            </Card>
            <Card title="座右铭">
              <TextArea value={store.motto} onChange={(e:any)=>setStore({...store, motto:e.target.value})} />
            </Card>
          </div>

          {selectedProject && (
            <Card title="项目详情">
              <div className="projForm">
                <div className="row2">
                  <Input value={selectedProject.name} onChange={(e:any)=>{
                    const name=e.target.value; setStore({...store, projects: store.projects.map(p=>p.id===selectedProject.id?{...p, name}:p)});
                  }} />
                  <select className="select" value={selectedProject.stage} onChange={(e)=>{
                    const stage=e.target.value as Stage; setStore({...store, projects: store.projects.map(p=>p.id===selectedProject.id?{...p, stage}:p)});
                  }}>
                    {['规划','执行','收尾','暂停','归档'].map(s=> <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="row2">
                  <label className="muted">开始</label>
                  <input type="date" className="date" value={fmt(selectedProject.startAt)} onChange={(e)=>{
                    const v = e.currentTarget.value? new Date(e.currentTarget.value+"T00:00:00").toISOString(): null;
                    setStore({...store, projects: store.projects.map(p=>p.id===selectedProject.id?{...p, startAt:v}:p)});
                  }} />
                  <label className="muted">结束</label>
                  <input type="date" className="date" value={fmt(selectedProject.endAt)} onChange={(e)=>{
                    const v = e.currentTarget.value? new Date(e.currentTarget.value+"T00:00:00").toISOString(): null;
                    setStore({...store, projects: store.projects.map(p=>p.id===selectedProject.id?{...p, endAt:v}:p)});
                  }} />
                </div>
                <TextArea className="mt8" value={selectedProject.deliverables||""} onChange={(e:any)=>{
                  const deliverables=e.target.value; setStore({...store, projects: store.projects.map(p=>p.id===selectedProject.id?{...p, deliverables}:p)});
                }} />
                <div className="btns mt8">
                  <Button variant="ghost" onClick={()=>deleteProject(selectedProject.id)} title="删除项目">删除项目</Button>
                </div>
              </div>
            </Card>
          )}

          <Card title={`任务列表 ${selectedPid?"· 针对所选项目":"· 全部"}`} right={<QuickAdd onSubmit={quickAddTask} /> }>
            <div className="filters mb8">
              <Input placeholder="关键词…" value={query} onChange={(e:any)=>setQuery(e.target.value)} />
              <select value={status} onChange={(e)=>setStatus(e.target.value as any)} className="select">
                <option value="全部">全部</option>
                <option value="待办">待办</option>
                <option value="进行中">进行中</option>
                <option value="完成">完成</option>
              </select>
              <Input placeholder="标签（单个）如：产品/设计" value={tag} onChange={(e:any)=>setTag(e.target.value)} />
            </div>
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>完成</th>
                    <th>标题</th>
                    <th>归属</th>
                    <th>截止</th>
                    <th>标签</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {taskList.map(t=>{
                    const pj = store.projects.find(p=>p.id===t.projectId);
                    const overdue = t.dueAt? (new Date(t.dueAt).getTime() < Date.now() && t.status!=="完成") : false;
                    return (
                      <tr key={t.id}>
                        <td><input type="checkbox" checked={t.status==="完成"} onChange={()=>toggleTask(t.id)} /></td>
                        <td className={t.status==="完成"?"done":""}>{t.title}</td>
                        <td className="muted">{pj?.name || "-"}</td>
                        <td>
                          <input type="date" className={`date ${overdue?"overdue":""}`} value={fmt(t.dueAt)} onChange={(e)=>{
                            const v = e.currentTarget.value? new Date(e.currentTarget.value+"T00:00:00").toISOString(): null;
                            setStore({...store, tasks: store.tasks.map(x=>x.id===t.id?{...x, dueAt:v}:x)});
                          }} />
                        </td>
                        <td>
                          <Input value={(t.tags||[]).join(",")} onChange={(e:any)=>{
                            const arr = String(e.target.value).split(",").map(s=>s.trim()).filter(Boolean);
                            setStore({...store, tasks: store.tasks.map(x=>x.id===t.id?{...x, tags:arr}:x)});
                          }} />
                        </td>
                        <td>
                          {t.status!=="完成" && <Button small onClick={()=>markDone(t.id)} title="标记完成">完成</Button>}
                          <Button small variant="ghost" onClick={()=>setDueReminder(t)} title="到期提醒">提醒</Button>
                          <Button small variant="ghost" onClick={()=>deleteTask(t.id)} title="删除任务">删除</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {taskList.length===0 && <div className="muted mt8">暂无任务，使用上方“快速新建”添加吧。</div>}
            </div>
          </Card>
        </section>
      </main>

      <footer className="footer">© {new Date().getFullYear()} Tech PM · 深色霓虹主题 · 本地存储（可导入/导出）</footer>

      <style>{`
        :root{ color-scheme: dark; }
        *{ box-sizing:border-box; }
        body{ margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, 'Helvetica Neue', Arial, 'Apple Color Emoji','Segoe UI Emoji'; }
        .page{ min-height:100vh; background:#0a0a0a; color:#fff; }
        .bgfx{ position:fixed; inset:0; pointer-events:none; opacity:.4; background:
          radial-gradient(900px 600px at 15% 10%, rgba(56,189,248,.12), transparent 60%),
          radial-gradient(800px 600px at 85% 20%, rgba(167,139,250,.10), transparent 60%),
          radial-gradient(800px 500px at 50% 100%, rgba(244,114,182,.08), transparent 60%);
        }
        .header{ position:sticky; top:0; z-index:10; backdrop-filter: blur(6px); background:rgba(10,10,10,.6); border-bottom:1px solid #2a2a2a; display:flex; align-items:center; justify-content:space-between; padding:10px 16px; }
        .brand{ font-weight:600; letter-spacing:.5px; }
        .actions{ display:flex; gap:8px; align-items:center; }
        .importLabel{ border:1px solid #444; border-radius:8px; padding:6px 10px; cursor:pointer; }
        .importLabel input{ display:none; }
        .grid{ max-width:1200px; margin:0 auto; padding:16px; display:grid; grid-template-columns: 360px 1fr; gap:16px; }
        .left{ display:flex; flex-direction:column; gap:12px; }
        .right{ display:flex; flex-direction:column; gap:12px; }
        .top{ display:grid; grid-template-columns: 2fr 1fr; gap:12px; }
        .stats{ display:grid; grid-template-columns: repeat(4,1fr); gap:12px; align-items:center; }
        .big{ font-size:24px; font-weight:700; }
        .muted{ color:#a3a3a3; font-size:12px; }
        .mb8{ margin-bottom:8px; }
        .mt8{ margin-top:8px; }
        .item{ padding:8px; border-radius:8px; border:1px solid #2a2a2a; background:rgba(20,20,20,.6); margin-bottom:6px; cursor:pointer; }
        .item:hover{ background:rgba(35,35,35,.7); }
        .item.active{ outline:1px solid rgba(34,211,238,.5); box-shadow:0 0 20px rgba(34,211,238,.15) inset; }
        .item.child{ margin-left:12px; }
        .row{ display:flex; gap:6px; align-items:center; justify-content:space-between; }
        .bar{ margin-top:6px; }
        .bar.small{ width:160px; }
        .children{ margin-left:4px; }
        .newRow{ display:flex; gap:8px; align-items:center; margin-bottom:8px; }
        .timer{ font-size:32px; font-variant-numeric: tabular-nums; margin-bottom:8px; }
        .btns{ display:flex; gap:8px; margin-bottom:4px; }
        .tableWrap{ overflow:auto; }
        .table{ width:100%; border-collapse: collapse; font-size:14px; }
        .table th{ text-align:left; border-bottom:1px solid #222; padding:8px; color:#a3a3a3; font-weight:500; }
        .table td{ border-bottom:1px solid #111; padding:8px; }
        .date{ background:#0f0f0f; color:#fff; border:1px solid #444; border-radius:6px; padding:4px 6px; }
        .date.overdue{ border-color:#f472b6; color:#f9a8d4; }
        .done{ text-decoration: line-through; color:#9ca3af; }
        .select{ background:#0f0f0f; color:#fff; border:1px solid #444; border-radius:6px; padding:6px; }
        .filters{ display:flex; gap:8px; align-items:center; }
        .projForm .row2{ display:grid; grid-template-columns: 1fr 160px; gap:8px; margin-bottom:8px; align-items:center; }
        .footer{ max-width:1200px; margin:0 auto; padding:24px 16px; color:#b3b3b3; font-size:12px; }
        .neon-bar{ background: linear-gradient(90deg,#22d3ee,#a78bfa,#f472b6); animation: flow 3s linear infinite; }
        @keyframes flow { 0%{ filter:hue-rotate(0deg) } 100%{ filter:hue-rotate(360deg) } }
      `}</style>
    </div>
  );
}

function QuickAdd({ onSubmit }:{ onSubmit:(title:string)=>void }){
  const [val,setVal] = useState("");
  return (
    <div style={{display:'flex', gap:8, alignItems:'center'}}>
      <Input placeholder="快速新建任务（回车确认）" value={val} onChange={(e:any)=>setVal(e.target.value)} onKeyDown={(e:any)=>{ if(e.key==='Enter'){ onSubmit(val); setVal(''); }}} />
      <Button small onClick={()=>{ onSubmit(val); setVal(''); }}>添加</Button>
    </div>
  );
}
