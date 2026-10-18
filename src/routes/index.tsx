import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { projectsQuery, brandKitQuery, suggestionsQuery, contentQuery, highlightsQuery } from "@/lib/data";
import { generateForProject, KIND_LABEL, type GenerationKind } from "@/lib/ai.functions";
import { setActiveProject } from "@/hooks/use-active-project";
import { toast, Toaster } from "sonner";
import { CalendarPanel } from "@/components/app/calendar-panel";
import { ContentEditor } from "@/components/app/content-editor";
import { ProPostStudio } from "@/components/app/pro-post-studio";
import { CarouselStudio } from "@/components/app/carousel-studio";
import { MediaLibrary } from "@/components/app/media-library";
import { Sparkles, LayoutDashboard, Layers, Plus, LogOut, Palette, Instagram, CalendarDays, Settings, BookOpen, Clapperboard, Grid3X3, Image as ImageIcon, Copy, Trash2, Menu, Check, WandSparkles, Loader2, ArrowRight, ShieldCheck, Download } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { checkGoogleProviderStatus, type ProviderStatus } from "@/lib/google-provider";

export const Route = createFileRoute("/")({ component: InstaStudio });

const navigation = [
  ["Visão Geral", LayoutDashboard], ["Meus Perfis", Layers], ["Criar com IA", Sparkles],
  ["Identidade Visual", Palette], ["Estúdio de Posts", ImageIcon], ["Carrosséis", Copy],
  ["Destaques", BookOpen], ["Meu Feed", Grid3X3], ["Reels", Clapperboard],
  ["Calendário", CalendarDays], ["Biblioteca", Download], ["Configurações", Settings],
] as const;
const inputClass = "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30";
const btn = "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";
const soft = "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted";
const panel = "rounded-2xl border border-border bg-card p-6 shadow-sm";
const goals = ["vender", "crescer", "educar", "autoridade", "divulgar serviços", "relacionamento"];

function InstaStudio() {
  const client = useQueryClient();
  const previousUser = useRef<string | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({data}) => {
      if(active) { previousUser.current = data.session?.user.id ?? null; setSession(data.session); setChecking(false); }
    }).catch((error:unknown)=>{ if(active) {setChecking(false);toast.error(error instanceof Error ? error.message : "Erro ao verificar sessão.");} });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event, next)=>{
      if (!active) return;
      const newUser = next?.user.id ?? null;
      if (previousUser.current && previousUser.current !== newUser) client.clear();
      previousUser.current = newUser;
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") setRecovery(false);
      setSession(next);
    });
    return ()=>{active=false;subscription.unsubscribe();};
  }, [client]);
  return <><Toaster richColors position="top-right"/>{checking ? <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-primary"/></div> : recovery && session ? <RecoveryScreen onDone={()=>setRecovery(false)}/> : session ? <Workspace key={session.user.id} userId={session.user.id} /> : <AuthScreen />}</>;
}

function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [googleStatus, setGoogleStatus] = useState<ProviderStatus>("unavailable");

  useEffect(() => {
    const controller = new AbortController();
    void checkGoogleProviderStatus(
      import.meta.env["VITE_SUPABASE_URL"] ?? "",
      import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "",
      { signal: controller.signal },
    ).then((status) => { if (!controller.signal.aborted) setGoogleStatus(status); });
    return () => controller.abort();
  }, []);

  const changeMode = (next: typeof mode) => {
    setMode(next);
    setLinkSent(false);
    setPassword("");
  };

  async function googleLogin() {
    setBusy(true);
    try {
      // Server configuration can change between the initial page load and a click.
      const status = await checkGoogleProviderStatus(
        import.meta.env["VITE_SUPABASE_URL"] ?? "",
        import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "",
      );
      setGoogleStatus(status);
      if (status !== "enabled") {
        toast.error("Google indisponível. Use a opção Entrar com link no e-mail.");
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/" },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar com Google.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            emailRedirectTo: window.location.origin + "/",
            shouldCreateUser: true,
          },
        });
        if (error) throw error;
        setSentTo(normalizedEmail);
        setLinkSent(true);
        toast.success("Link de entrada solicitado. Confira sua caixa de entrada.");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: window.location.origin + "/",
        });
        if (error) throw error;
        setSentTo(normalizedEmail);
        setLinkSent(true);
        toast.success("E-mail de recuperação solicitado.");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email: normalizedEmail, password });
        if (error) throw error;
        toast.success("Cadastro solicitado. Confira seu e-mail se for necessária confirmação.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível concluir esta solicitação.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "signin" ? "Bem-vindo de volta"
    : mode === "signup" ? "Crie sua conta"
    : mode === "magic" ? "Entre sem senha"
    : "Recuperar senha";
  const sendFlow = mode === "magic" || mode === "reset";

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-violet-800 via-violet-700 to-fuchsia-700 p-14 text-white lg:flex">
        <div className="flex items-center gap-3 text-xl font-bold"><div className="rounded-xl bg-white/20 p-2"><Sparkles /></div>InstaStudio AI</div>
        <div>
          <div className="mb-7 inline-flex rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em]">Seu estúdio criativo inteligente</div>
          <h1 className="max-w-lg text-6xl font-extrabold leading-tight">Sua próxima grande marca começa aqui.</h1>
          <p className="mt-6 max-w-md text-lg text-white/80">Planeje seus perfis, organize sua identidade, crie conteúdo e transforme ideias em um feed de impacto.</p>
        </div>
        <div className="text-sm text-white/70">Crie com intenção. Publique com consistência.</div>
      </div>

      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-12 flex items-center gap-2 text-xl font-bold lg:hidden"><Sparkles className="text-primary" />InstaStudio AI</div>
          <h1 className="text-3xl font-extrabold">{linkSent && sendFlow ? "Confira seu e-mail" : title}</h1>
          <p className="mt-2 mb-8 text-muted-foreground">
            {mode === "magic" ? "Um link seguro enviado ao seu e-mail permite acessar seu perfil sem digitar senha."
              : "Tudo o que seu Instagram precisa em um só lugar."}
          </p>

          {linkSent && sendFlow ? (
            <div role="status" className="space-y-5 rounded-2xl border border-primary/20 bg-card p-6">
              <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><Check size={24}/></div>
              <h2 className="text-lg font-bold">Enviamos uma solicitação para {sentTo}</h2>
              <p className="text-sm text-muted-foreground">
                {mode === "magic" ? "Abra o Gmail ou seu e-mail e clique no link recebido para entrar no InstaStudio AI."
                  : "Abra seu e-mail e siga as instruções para redefinir a senha."}
                {" "}Confira também a caixa de spam.
              </p>
              <p className="text-xs text-muted-foreground">O envio está sujeito aos limites e à configuração de e-mail do serviço de autenticação.</p>
              <button type="button" className={soft+" w-full"} onClick={()=>{setLinkSent(false);changeMode("signin");}}>Voltar ao login</button>
            </div>
          ) : (
            <>
              <form onSubmit={submit} className="space-y-4">
                <label className="block text-sm font-semibold">E-mail
                  <input className={inputClass+" mt-2"} type="email" required autoComplete="email"
                    value={email} onChange={(event)=>setEmail(event.target.value)}
                    placeholder="seunome@gmail.com" />
                </label>
                {!sendFlow && <label className="block text-sm font-semibold">Senha
                  <input className={inputClass+" mt-2"} type="password" required minLength={6}
                    autoComplete={mode==="signin"?"current-password":"new-password"}
                    value={password} onChange={(event)=>setPassword(event.target.value)} placeholder="Sua senha" />
                </label>}
                <button type="submit" className={btn+" w-full"} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  {mode==="signin"?"Entrar":mode==="signup"?"Criar conta":mode==="magic"?"Enviar link para meu e-mail":"Enviar recuperação"}
                  <ArrowRight className="size-4" />
                </button>
              </form>

              {(mode==="signin"||mode==="signup") && <>
                <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border"/>ou entre sem senha<div className="h-px flex-1 bg-border"/></div>
                <button type="button" disabled={busy} onClick={()=>changeMode("magic")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-primary/10 disabled:opacity-50">
                  <span aria-hidden="true" className="text-lg font-extrabold text-primary">@</span>
                  Entrar com Gmail ou outro e-mail
                </button>
                <p className="mt-3 text-center text-xs text-muted-foreground">Receba um link de acesso no seu e-mail. Sem senha e sem configurar uma conta Google.</p>
                {googleStatus === "enabled" && <button type="button" disabled={busy} onClick={googleLogin}
                  className="mt-3 inline-flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold transition hover:bg-muted disabled:opacity-50">
                  <span aria-hidden="true" className="text-lg font-extrabold text-[#4285F4]">G</span>
                  Continuar com Google
                </button>}
              </>}
              <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
                <button type="button" onClick={()=>changeMode(mode==="signup"?"signin":"signup")} className="font-semibold text-primary">
                  {mode==="signup"?"Já tenho conta":"Criar uma conta"}
                </button>
                <button type="button" onClick={()=>changeMode(mode==="reset"?"signin":"reset")} className="text-muted-foreground">
                  {mode==="reset"?"Voltar ao login":"Esqueci minha senha"}
                </button>
                {mode==="magic"&&<button type="button" className="w-full text-left font-semibold text-primary" onClick={()=>changeMode("signin")}>Entrar com minha senha</button>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RecoveryScreen({onDone}:{onDone:()=>void}){
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false);
  async function reset(e:FormEvent){
    e.preventDefault();
    if(password.length<8){toast.error("A senha deve ter pelo menos 8 caracteres.");return;}
    if(password!==confirm){toast.error("As senhas não coincidem.");return;}
    setBusy(true);
    try{
      const {error}=await supabase.auth.updateUser({password});
      if(error) throw error;
      toast.success("Senha alterada com sucesso.");
      onDone();
    }catch(error){toast.error(error instanceof Error ? error.message : "Erro ao alterar a senha.");}
    finally{setBusy(false);}
  }
  return <div className="grid min-h-screen place-items-center bg-background p-6"><form onSubmit={reset} className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-8 shadow-sm">
    <div className="flex items-center gap-2 text-2xl font-bold text-primary"><Sparkles/>InstaStudio AI</div>
    <h1 className="text-2xl font-bold">Definir nova senha</h1>
    <p className="text-sm text-muted-foreground">Escolha uma nova senha segura para sua conta.</p>
    <label className="block text-sm font-semibold">Nova senha<input autoComplete="new-password" type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} className={inputClass+" mt-2"}/></label>
    <label className="block text-sm font-semibold">Confirmar senha<input autoComplete="new-password" type="password" minLength={8} required value={confirm} onChange={e=>setConfirm(e.target.value)} className={inputClass+" mt-2"}/></label>
    <button className={btn+" w-full"} disabled={busy}>{busy?"Salvando…":"Atualizar senha"}</button>
  </form></div>;
}

function Workspace({userId}:{userId:string}) {
  const qc=useQueryClient();
  const {data:projects=[],isLoading,error}=useQuery(projectsQuery());
  const [selected,setSelected]=useState<string>("");
  const [page,setPage]=useState<string>("Visão Geral");
  const [mobile,setMobile]=useState(false);
  const [creating,setCreating]=useState(false);
  const [working,setWorking]=useState(false);
  const [title,setTitle]=useState("");
  const [brief,setBrief]=useState("");
  const [niche,setNiche]=useState("");
  const [objective,setObjective]=useState("vender");
  const [audience,setAudience]=useState("");
  const [tone,setTone]=useState("moderno e profissional");
  const [product,setProduct]=useState("");
  const current=projects.find(p=>p.id===selected) ?? projects.find(p=>p.status!=="archived") ?? null;
  useEffect(()=>{if(current?.id && selected!==current.id){setSelected(current.id);setActiveProject(current.id)}},[current?.id, selected]);
  const {data:kit}=useQuery({...brandKitQuery(current?.id??""),enabled:!!current});
  const {data:suggestions=[]}=useQuery({...suggestionsQuery(current?.id??""),enabled:!!current});
  const {data:contents=[]}=useQuery({...contentQuery(current?.id??""),enabled:!!current});
  const {data:highlights=[]}=useQuery({...highlightsQuery(current?.id??""),enabled:!!current});
  const [running,setRunning]=useState<GenerationKind|null>(null);
  const [newName,setNewName]=useState("");
  const [newHandle,setNewHandle]=useState("");
  const [newBio,setNewBio]=useState("");
  const [palette,setPalette]=useState<string[]>(["#6D28D9","#DB2777","#F8FAFC","#0F172A"]);
  useEffect(()=>{if(kit){setNewName(kit.name);setNewHandle(kit.handle);setNewBio(kit.bio);if(Array.isArray(kit.palette))setPalette((kit.palette as string[]).slice(0,4));}},[kit?.id,kit?.updated_at]);
  const refresh=async()=>{await qc.invalidateQueries();};
  async function createProject(e:FormEvent){e.preventDefault();setWorking(true);try{
    const {data,error}=await supabase.from("projects").insert({title,brief,niche,objective,audience,tone,product,owner_id:userId,status:"active"}).select("id").single();
    if(error)throw error;
    const {error:ke}=await supabase.from("brand_kits").insert({project_id:data.id,name:title,voice:tone});
    if(ke)throw ke;
    setSelected(data.id);setActiveProject(data.id);setCreating(false);setPage("Identidade Visual");await refresh();toast.success("Perfil criado com sucesso!");
    setTitle("");setBrief("");setNiche("");setAudience("");setProduct("");
  }catch(e){toast.error((e as Error).message)}finally{setWorking(false)}}
  async function updateProject(status:"archived"|"active"){if(!current)return;try{const {error}=await supabase.from("projects").update({status}).eq("id",current.id);if(error)throw error;await refresh();toast.success("Projeto atualizado.");}catch(e){toast.error((e as Error).message)}}
  async function deleteProject(){if(!current||!window.confirm("Excluir permanentemente este perfil e todos os seus conteúdos?"))return;try{const {error}=await supabase.from("projects").delete().eq("id",current.id);if(error)throw error;setSelected("");await refresh();toast.success("Perfil excluído.");}catch(e){toast.error((e as Error).message)}}
  async function saveBrand(){if(!current)return;setWorking(true);try{const {error}=await supabase.from("brand_kits").upsert({project_id:current.id,name:newName,handle:newHandle.replace(/^@/,""),bio:newBio,palette,voice:tone},{onConflict:"project_id"});if(error)throw error;await refresh();toast.success("Identidade visual salva.");}catch(e){toast.error((e as Error).message)}finally{setWorking(false)}}
  async function generate(kind:GenerationKind){if(!current)return;setRunning(kind);try{const result=await generateForProject({data:{projectId:current.id,kind}});if (!result.ok) throw new Error(result.error);toast.success("Conteúdo gerado e salvo.");await refresh();}catch(e){toast.error((e as Error).message)}finally{setRunning(null)}}
  function navigate(p:string){setPage(p);setCreating(false);setMobile(false)}
  const stat=[{label:"Perfis criados",number:projects.length,icon:Layers},{label:"Conteúdos neste perfil",number:contents.length,icon:ImageIcon},{label:"Destaques criados",number:highlights.length,icon:BookOpen},{label:"Ideias de nome e bio",number:suggestions.length,icon:Sparkles}];
  return <div className="flex min-h-screen bg-background">
    {mobile&&<button className="fixed inset-0 z-30 bg-black/40 lg:hidden" aria-label="Fechar menu" onClick={()=>setMobile(false)}/>}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card p-5 transition-transform lg:sticky lg:top-0 lg:h-screen ${mobile?"translate-x-0":"-translate-x-full lg:translate-x-0"}`}>
      <div className="mb-10 flex items-center gap-3 px-2"><div className="rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 p-2 text-white"><Sparkles/></div><span className="text-lg font-extrabold">InstaStudio <span className="text-primary">AI</span></span></div>
      <div className="mb-3 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Workspace</div>
      <nav className="flex-1 space-y-1 overflow-auto">{navigation.map(([name,Icon])=><button key={name} onClick={()=>navigate(name)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${page===name?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon size={18}/>{name}</button>)}</nav>
      <div className="mt-5 border-t pt-4"><button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted" onClick={()=>supabase.auth.signOut()}><LogOut size={17}/> Sair da conta</button></div>
    </aside>
    <main className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur md:px-9"><div className="flex items-center gap-3"><button className="lg:hidden" onClick={()=>setMobile(true)} aria-label="Abrir menu"><Menu/></button><div><p className="text-xs text-muted-foreground">InstaStudio AI / Workspace</p><h2 className="font-bold">{page}</h2></div></div><div className="flex items-center gap-3"><select className="max-w-36 rounded-xl border border-border bg-card px-3 py-2 text-xs sm:max-w-56" aria-label="Perfil ativo" value={current?.id??""} onChange={e=>{setSelected(e.target.value);setActiveProject(e.target.value)}}><option value="">Selecione um perfil</option>{projects.filter(p=>p.status!=="archived").map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select><button className={btn+" !px-3 sm:!px-4"} onClick={()=>{setCreating(true);setMobile(false)}}><Plus size={16}/><span className="hidden sm:inline">Novo perfil</span></button></div></header>
      <div className="mx-auto max-w-7xl p-5 md:p-9">
      {error&&<div className="mb-5 rounded-xl bg-destructive/10 p-4 text-destructive">{(error as Error).message}</div>}
      {creating?<section className="mx-auto max-w-3xl"><button className="mb-6 text-sm text-primary" onClick={()=>setCreating(false)}>← Voltar</button><div className="mb-7"><span className="text-sm font-bold text-primary">PASSO 1 / CRIAR PERFIL</span><h1 className="mt-2 text-3xl font-extrabold">Vamos construir sua marca.</h1><p className="mt-3 text-muted-foreground">Descreva seu objetivo. Você poderá alterar cada detalhe depois.</p></div><form className={panel+" space-y-5"} onSubmit={createProject}><label className="block text-sm font-semibold">Nome do projeto<input className={inputClass+" mt-2"} required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex.: Alimentação Inteligente"/></label><label className="block text-sm font-semibold">Descreva seu Instagram<textarea className={inputClass+" mt-2 min-h-28"} required value={brief} onChange={e=>setBrief(e.target.value)} placeholder="Quero criar um perfil de alimentação saudável para vender meu aplicativo de dietas..."/></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Nicho<input className={inputClass+" mt-2"} value={niche} onChange={e=>setNiche(e.target.value)} placeholder="Ex.: Saúde e bem-estar"/></label><label className="block text-sm font-semibold">Objetivo<select className={inputClass+" mt-2"} value={objective} onChange={e=>setObjective(e.target.value)}>{goals.map(x=><option key={x} value={x}>{x}</option>)}</select></label><label className="block text-sm font-semibold">Público-alvo<input className={inputClass+" mt-2"} value={audience} onChange={e=>setAudience(e.target.value)} placeholder="Ex.: Mulheres entre 25 e 45 anos"/></label><label className="block text-sm font-semibold">Produto ou serviço<input className={inputClass+" mt-2"} value={product} onChange={e=>setProduct(e.target.value)} placeholder="Ex.: App de dietas"/></label></div><button className={btn+" w-full"} disabled={working}>{working?<Loader2 className="size-4 animate-spin"/>:<Check size={18}/>}Salvar meu perfil</button></form></section>:
      page==="Visão Geral"?<><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-sm font-bold text-primary">SEU ESTÚDIO CRIATIVO</p><h1 className="text-3xl font-extrabold sm:text-4xl">Crie marcas que inspiram.</h1><p className="mt-3 text-muted-foreground">Sua central de criação de conteúdo e identidade para Instagram.</p></div><button className={btn} onClick={()=>setCreating(true)}><Plus size={17}/>Criar novo perfil</button></div><div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stat.map(({label,number,icon:Icon})=><div key={label} className={panel}><div className="mb-6 inline-flex rounded-xl bg-primary/10 p-3 text-primary"><Icon size={22}/></div><div className="text-3xl font-extrabold">{number}</div><div className="mt-1 text-sm text-muted-foreground">{label}</div></div>)}</div><div className="grid gap-5 xl:grid-cols-5"><div className={"xl:col-span-3 "+panel}><h3 className="text-xl font-bold">Seus perfis</h3><p className="mt-1 mb-5 text-sm text-muted-foreground">Continue de onde parou</p>{isLoading?<Loader2 className="animate-spin"/>:projects.length===0?<Empty onCreate={()=>setCreating(true)}/>:projects.slice(0,6).map(p=><button key={p.id} onClick={()=>{setSelected(p.id);setActiveProject(p.id);navigate("Identidade Visual")}} className="mb-3 flex w-full items-center justify-between rounded-xl border p-4 text-left hover:bg-muted"><div><strong>{p.title}</strong><p className="text-xs capitalize text-muted-foreground">{p.niche||p.objective}</p></div><ArrowRight size={17}/></button>)}</div><div className="rounded-2xl bg-gradient-to-br from-violet-800 to-fuchsia-700 p-7 text-white xl:col-span-2"><Sparkles size={35} className="mb-10 text-pink-200"/><h3 className="text-2xl font-extrabold">Sua criatividade, potencializada.</h3><p className="mt-3 text-white/80">Crie nomes, bios, destaques, posts, carrosséis e roteiros com apoio de inteligência artificial.</p><button className="mt-8 rounded-xl bg-white px-5 py-3 font-semibold text-violet-800" onClick={()=>navigate("Criar com IA")}>Explorar ferramentas →</button></div></div></>:
      page==="Meus Perfis"?<><Header title="Meus perfis" desc="Cada projeto mantém sua identidade e conteúdos separados." action={<button className={btn} onClick={()=>setCreating(true)}><Plus size={17}/>Novo perfil</button>}/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{projects.map(p=><div className={panel} key={p.id}><div className="mb-5 flex justify-between"><div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><Instagram/></div><span className="text-xs text-muted-foreground">{p.status==="archived"?"Arquivado":"Ativo"}</span></div><h3 className="text-xl font-bold">{p.title}</h3><p className="mt-2 min-h-12 text-sm text-muted-foreground">{p.brief.slice(0,95)}</p><button className={soft+" mt-5 w-full"} onClick={()=>{setSelected(p.id);setActiveProject(p.id);navigate("Identidade Visual")}}>Abrir perfil <ArrowRight size={16}/></button></div>)}</div>{!projects.length&&<Empty onCreate={()=>setCreating(true)}/>}</>:
      !current?<Empty onCreate={()=>setCreating(true)}/>:
      page==="Identidade Visual"?<><Header title="Identidade visual" desc={"Defina o Brand Kit de "+current.title+". Novos conteúdos usarão essas referências."}/><div className="grid gap-6 lg:grid-cols-5"><div className={panel+" space-y-4 lg:col-span-3"}><label className="block text-sm font-semibold">Nome da marca<input className={inputClass+" mt-2"} value={newName} onChange={e=>setNewName(e.target.value)}/></label><label className="block text-sm font-semibold">@ sugerido — disponibilidade não confirmada<input className={inputClass+" mt-2"} value={newHandle} onChange={e=>setNewHandle(e.target.value)}/></label><label className="block text-sm font-semibold">Bio<textarea className={inputClass+" mt-2 min-h-28"} maxLength={150} value={newBio} onChange={e=>setNewBio(e.target.value)}/><span className="text-xs text-muted-foreground">{newBio.length}/150 caracteres</span></label><label className="block text-sm font-semibold">Tom de voz<input className={inputClass+" mt-2"} value={tone} onChange={e=>setTone(e.target.value)}/></label><h3 className="font-bold">Paleta de cores</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{palette.map((color,i)=><label key={i} className="rounded-xl border p-3"><input type="color" value={/^#[0-9a-f]{6}$/i.test(color)?color:"#6D28D9"} onChange={e=>setPalette(palette.map((v,j)=>i===j?e.target.value:v))} className="h-12 w-full cursor-pointer"/><span className="block text-center text-xs">{color}</span></label>)}</div><button className={btn} onClick={saveBrand} disabled={working}><Check size={16}/>Salvar identidade</button><button className={soft+" ml-2"} onClick={()=>window.open("https://www.instagram.com/"+newHandle,"_blank","noopener,noreferrer")}>Conferir @ no Instagram</button></div><div className={panel+" lg:col-span-2"}><p className="mb-5 text-sm font-semibold text-muted-foreground">PRÉ-VISUALIZAÇÃO DO PERFIL</p><div className="mx-auto grid size-28 place-items-center rounded-full border-4 border-white text-4xl font-black text-white shadow-lg" style={{background:palette[0]}}>{(newName||"?").charAt(0).toUpperCase()}</div><h3 className="mt-5 text-center text-lg font-bold">{newName||"Sua marca"}</h3><p className="text-center text-sm text-muted-foreground">@{newHandle||"seuusuario"}</p><p className="mt-5 whitespace-pre-wrap text-sm">{newBio||"Sua bio aparecerá aqui."}</p><div className="mt-6 grid grid-cols-4 gap-2">{palette.map((x,i)=><div key={i} className="h-14 rounded-lg" style={{background:x}}/>)}</div><div className="mt-7 rounded-xl bg-muted p-4 text-xs text-muted-foreground">Logotipos gerados por IA de imagem requerem integração adicional. A prévia acima usa uma composição local, não uma logo gerada.</div></div></div></>:
      page==="Criar com IA"?<><Header title="Crie com inteligência artificial" desc="Gere conteúdo original a partir do briefing do perfil ativo. As operações usam um serviço real quando configurado."/><AiPanel running={running} generate={generate}/><div className="mt-8 grid gap-5 lg:grid-cols-2"><div className={panel}><h3 className="mb-4 text-lg font-bold">Sugestões de nomes ({suggestions.filter(s=>s.kind==="name").length})</h3><div className="max-h-80 space-y-2 overflow-auto">{suggestions.filter(s=>s.kind==="name").map(s=><div key={s.id} className="flex items-center justify-between rounded-lg bg-muted p-3"><div><b>{s.value}</b><p className="text-xs text-muted-foreground">@{s.handle} · disponibilidade não confirmada</p></div><button onClick={()=>{setNewName(s.value);setNewHandle(s.handle||"");navigate("Identidade Visual")}} className="text-xs font-bold text-primary">Escolher</button></div>)}</div></div><div className={panel}><h3 className="mb-4 text-lg font-bold">Bios ({suggestions.filter(s=>s.kind==="bio").length})</h3><div className="max-h-80 space-y-2 overflow-auto">{suggestions.filter(s=>s.kind==="bio").map(s=><div key={s.id} className="rounded-lg bg-muted p-3"><p className="mb-1 text-xs font-bold capitalize text-primary">{s.category}</p><p className="text-sm">{s.value}</p><button className="mt-2 text-xs font-bold text-primary" onClick={()=>{setNewBio(s.value);navigate("Identidade Visual")}}>Usar esta bio</button></div>)}</div></div></div></>:
      page==="Carrosséis"?<><Header title="Estúdio de Carrosséis" desc="Narrativas que impressionam. Crie, edite e exporte slides em alta resolução."/><CarouselStudio key={current.id} projectId={current.id} items={contents.filter(c=>c.type==="carousel")} palette={palette} handle={kit?.handle||""}/><div className="mt-6 rounded-2xl border border-border bg-card p-5"><h3 className="mb-3 font-bold">Ideias com IA</h3><p className="mb-3 text-sm text-muted-foreground">Gere roteiros com IA quando o serviço estiver disponível. Você poderá abrir o carrossel gerado no editor acima.</p><AiPanel running={running} generate={generate} only="carousels"/></div></>:
      page==="Estúdio de Posts"?<><Header title="Estúdio Profissional de Posts" desc="Escolha entre Venda, Editor Premium e Alta Atenção. Personalize cada elemento da arte."/><ProPostStudio key={current.id} projectId={current.id} posts={contents.filter(c=>c.type==="post")} palette={palette} handle={kit?.handle||""}/><div className="mt-7 rounded-2xl border bg-card p-5"><h3 className="font-semibold">Ideias com inteligência artificial</h3><p className="mb-3 mt-1 text-sm text-muted-foreground">A geração de textos depende da integração de IA ativa.</p><AiPanel running={running} generate={generate} only="posts"/></div></>:
      page==="Reels"?<><Header title="Reels" desc="Crie roteiros e capas para seus vídeos."/><div className="mb-6"><AiPanel running={running} generate={generate} only="reels"/></div><ContentEditor key={current.id+"-"+page} projectId={current.id} kind="reel" content={contents} palette={palette} handle={kit?.handle||""} headingFont={kit?.heading_font||"Sora"} bodyFont={kit?.body_font||"Manrope"}/></>:
      page==="Destaques"?<><Header title="Destaques do Instagram" desc="Planeje cada destaque e o roteiro dos stories."/><AiPanel running={running} generate={generate} only="highlights"/><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{highlights.map(h=><div key={h.id} className={panel}><div className="mx-auto grid size-20 place-items-center rounded-full text-3xl text-white" style={{background:palette[0]}}>{h.title.charAt(0)}</div><h3 className="mt-4 text-center font-bold">{h.title}</h3><p className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">{h.script}</p></div>)}</div></>:
      page==="Meu Feed"?<><Header title="Simulador de feed" desc="Prévia do planejamento; não representa posts publicados no Instagram."/><div className={panel+" mx-auto max-w-xl"}><div className="flex items-center gap-4 border-b pb-5"><div className="grid size-16 place-items-center rounded-full text-2xl font-bold text-white" style={{background:palette[0]}}>{(kit?.name||current.title).charAt(0)}</div><div><h3 className="font-bold">{kit?.name||current.title}</h3><p className="text-sm text-muted-foreground">@{kit?.handle||"usuario_a_definir"}</p></div></div><p className="my-5 whitespace-pre-wrap text-sm">{kit?.bio||"Configure sua bio em Identidade Visual."}</p><div className="grid grid-cols-3 gap-1">{contents.filter(c=>c.type!=="reel").map(c=><div key={c.id} className="flex aspect-square items-center justify-center p-2 text-center text-[10px] font-bold text-white sm:text-xs" style={{background:`linear-gradient(140deg,${palette[0]},${palette[1]})`}}>{c.title}</div>)}</div></div></>:
      page==="Calendário"?<><Header title="Calendário editorial" desc="Planeje suas publicações com horário de Brasília. Tudo fica salvo no banco de dados."/><CalendarPanel projectId={current.id} content={contents}/></>:
      page==="Biblioteca"?<><Header title="Biblioteca" desc="Faça upload e organize materiais privados para cada projeto."/><MediaLibrary projectId={current.id}/></>:
      <><Header title="Configurações" desc="Gerencie sua conta e integrações."/><div className={panel+" space-y-5"}><div className="flex items-center gap-3"><ShieldCheck className="text-primary"/><div><b>Conta autenticada</b><p className="text-sm text-muted-foreground">Seus projetos são protegidos por políticas de acesso.</p></div></div><div className="rounded-xl bg-muted p-4 text-sm">Integração Meta: não configurada. A criação de uma conta no Instagram e a publicação são feitas manualmente.</div><button className={soft} onClick={()=>supabase.auth.signOut()}>Sair da conta</button><div className="border-t pt-5"><h3 className="mb-3 font-semibold">Projeto selecionado</h3><div className="flex flex-wrap gap-3"><button className={soft} onClick={()=>updateProject(current.status==="archived"?"active":"archived")}>{current.status==="archived"?"Reativar":"Arquivar"} perfil</button><button className={soft+" text-destructive"} onClick={deleteProject}><Trash2 size={15}/>Excluir permanentemente</button></div></div></div></>}
      </div>
    </main>
  </div>;
}
function Header({title,desc,action}:{title:string,desc:string,action?:React.ReactNode}){return <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-extrabold">{title}</h1><p className="mt-2 text-muted-foreground">{desc}</p></div>{action}</div>}
function Empty({onCreate}:{onCreate:()=>void}){return <div className={panel+" py-16 text-center"}><div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary"><Sparkles size={30}/></div><h3 className="text-xl font-bold">Sua próxima grande ideia começa aqui</h3><p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">Crie um perfil para começar a montar a identidade da sua marca.</p><button className={btn+" mt-6"} onClick={onCreate}><Plus size={18}/>Criar primeiro perfil</button></div>}
function AiPanel({running,generate,only}:{running:GenerationKind|null,generate:(kind:GenerationKind)=>void,only?:GenerationKind}){const kinds:(GenerationKind)[]=only?[only]:["names","highlights","posts","carousels","reels"];return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{kinds.map(kind=><button key={kind} disabled={running!==null} onClick={()=>generate(kind)} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary/40 hover:shadow-md disabled:opacity-50"><div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{running===kind?<Loader2 className="animate-spin"/>:<WandSparkles/>}</div><div><b className="text-sm">{KIND_LABEL[kind]}</b><p className="mt-1 text-xs text-muted-foreground">Gerar e salvar com IA real</p></div></button>)}</div>}
