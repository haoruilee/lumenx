"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, FolderOpen, Key, RefreshCw, Library, Calendar, Play, Trash2, FileUp, X } from "lucide-react";
import { useProjectStore, Series, Project } from "@/store/projectStore";
import ProjectCard from "@/components/project/ProjectCard";
import CreateProjectDialog from "@/components/project/CreateProjectDialog";
import EnvConfigDialog from "@/components/project/EnvConfigDialog";
import CreativeCanvas from "@/components/canvas/CreativeCanvas";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";

const ProjectClient = dynamic(() => import("@/components/project/ProjectClient"), { ssr: false });
const SeriesDetailPage = dynamic(() => import("@/components/series/SeriesDetailPage"), { ssr: false });
const ImportFileDialog = dynamic(() => import("@/components/series/ImportFileDialog"), { ssr: false });

// ── Create Series Dialog ──
function CreateSeriesDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const createSeries = useProjectStore((state) => state.createSeries);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!title.trim()) return;
    setIsCreating(true);
    try {
      const series = await createSeries(title.trim(), description.trim() || undefined);
      setTitle("");
      setDescription("");
      onClose();
      window.location.hash = `#/series/${series.id}`;
    } catch (error) {
      console.error("Failed to create series:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold text-white">新建系列</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">系列标题 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：我的漫剧系列"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">描述（可选）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述这个系列..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || isCreating}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? "创建中..." : "创建系列"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Series Card ──
function SeriesCard({ series, onDelete }: { series: Series; onDelete: (id: string) => void }) {
  const handleOpen = () => {
    window.location.hash = `#/series/${series.id}`;
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定要删除系列"${series.title}"吗？这不会删除其中的项目。`)) {
      onDelete(series.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="glass-panel p-6 rounded-xl cursor-pointer group relative"
      onClick={handleOpen}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-display font-bold text-white">
              {series.title}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">
              系列
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Calendar size={12} />
            <span>{new Date(series.created_at * 1000).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>

        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {series.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{series.description}</p>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">集数</span>
          <span className="text-white font-medium">{series.episode_ids?.length || 0}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">角色</span>
          <span className="text-white font-medium">{series.characters?.length || 0}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">场景</span>
          <span className="text-white font-medium">{series.scenes?.length || 0}</span>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1 text-primary text-xs font-medium">
          <Play size={14} />
          <span>打开系列</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Hybrid List Item (for projects in mixed list) ──
function StandaloneProjectCard({ project, onDelete }: { project: Project; onDelete: (id: string) => void }) {
  return (
    <div className="relative">
      {/* Type badge overlay */}
      <div className="absolute top-4 left-4 z-10">
        <span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-400 font-medium">
          项目
        </span>
      </div>
      <ProjectCard project={project} onDelete={onDelete} />
    </div>
  );
}

// ── Main Component ──
export default function Home() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSeriesDialogOpen, setIsSeriesDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isEnvDialogOpen, setIsEnvDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'project' | 'series' | 'series-episode'>('home');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [episodeId, setEpisodeId] = useState<string | null>(null);
  const projects = useProjectStore((state) => state.projects);
  const seriesList = useProjectStore((state) => state.seriesList);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const deleteSeries = useProjectStore((state) => state.deleteSeries);
  const setProjects = useProjectStore((state) => state.setProjects);
  const fetchSeriesList = useProjectStore((state) => state.fetchSeriesList);

  // Sync projects and series from backend on mount
  useEffect(() => {
    syncProjects();
    fetchSeriesList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncProjects = async () => {
    setIsSyncing(true);
    try {
      const backendProjects = await api.getProjects();
      if (backendProjects && backendProjects.length > 0) {
        setProjects(backendProjects);
      }
    } catch (error) {
      console.error("Failed to sync projects from backend:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncAll = async () => {
    await Promise.all([syncProjects(), fetchSeriesList()]);
  };

  // 监听 hash 变化
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      // Match #/series/{id}/episode/{eid} first (more specific)
      const seriesEpisodeMatch = hash.match(/^#\/series\/([^/]+)\/episode\/([^/]+)$/);
      if (seriesEpisodeMatch) {
        setSeriesId(seriesEpisodeMatch[1]);
        setEpisodeId(seriesEpisodeMatch[2]);
        setProjectId(null);
        setCurrentView('series-episode');
        return;
      }
      // Match #/series/{id}
      const seriesMatch = hash.match(/^#\/series\/([^/]+)$/);
      if (seriesMatch) {
        setSeriesId(seriesMatch[1]);
        setEpisodeId(null);
        setProjectId(null);
        setCurrentView('series');
        return;
      }
      if (hash.startsWith('#/project/')) {
        const id = hash.replace('#/project/', '');
        setProjectId(id);
        setSeriesId(null);
        setEpisodeId(null);
        setCurrentView('project');
      } else {
        setCurrentView('home');
        setProjectId(null);
        setSeriesId(null);
        setEpisodeId(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 如果是项目详情页，渲染项目详情组件
  if (currentView === 'project' && projectId) {
    return <ProjectClient id={projectId} />;
  }

  // Series episode view - render ProjectClient with breadcrumb
  if (currentView === 'series-episode' && seriesId && episodeId) {
    return <EpisodeBreadcrumbWrapper seriesId={seriesId} episodeId={episodeId} />;
  }

  // Series detail page
  if (currentView === 'series' && seriesId) {
    return <SeriesDetailPage seriesId={seriesId} />;
  }

  // Filter standalone projects (not belonging to any series)
  const standaloneProjects = projects.filter((p) => !p.series_id);

  // Build mixed list: series + standalone projects, sorted by creation time descending
  type ListItem = { type: 'series'; data: Series; sortTime: number } | { type: 'project'; data: Project; sortTime: number };
  const mixedList: ListItem[] = [
    ...seriesList.map((s) => ({ type: 'series' as const, data: s, sortTime: s.created_at * 1000 })),
    ...standaloneProjects.map((p) => ({ type: 'project' as const, data: p, sortTime: new Date(p.createdAt).getTime() })),
  ].sort((a, b) => b.sortTime - a.sortTime);

  const totalCount = mixedList.length;

  return (
    <main className="relative h-screen w-screen bg-background flex flex-col">
      {/* Background Canvas */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <CreativeCanvas />
      </div>

      {/* Scrollable Content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="container mx-auto px-6 py-8">
          {/* Header with LumenX Branding */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex gap-4 items-center">
              {/* Logo */}
              <div className="flex-shrink-0">
                <img
                  src="LumenX.png"
                  alt="LumenX"
                  className="w-16 h-16 object-contain"
                />
              </div>

              {/* LumenX / Studio - Matching PipelineSidebar style */}
              <div className="flex flex-col gap-1">
                {/* LumenX (Top) */}
                <div className="flex items-center -mb-2">
                  <span className="font-display text-3xl font-bold tracking-tight text-primary">
                    Lumen
                  </span>
                  <span
                    className="font-display text-4xl font-black tracking-tighter ml-1"
                    style={{
                      background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #ec4899 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    X
                  </span>
                </div>

                {/* Studio (Bottom Right aligned) */}
                <div className="flex justify-end -mt-1 pl-9">
                  <span className="font-display text-3xl font-bold tracking-tight text-white">
                    Studio
                  </span>
                </div>
                <button
                  onClick={() => setIsEnvDialogOpen(true)}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                  title="API Key & OSS 配置"
                >
                  <Key size={18} />
                  API 配置
                </button>
              </div>
            </div>

            {/* Slogan */}
            <p className="text-xs text-gray-500 tracking-wide mt-3 ml-10">
              Render Noise into Narrative
            </p>
          </motion.div>

          {/* Content Section */}
          {totalCount === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <FolderOpen size={64} className="text-gray-600 mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">还没有项目</h3>
              <p className="text-gray-500 mb-6">创建第一个项目或系列开始吧！</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <Plus size={20} />
                  创建新项目
                </button>
                <button
                  onClick={() => setIsSeriesDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <Library size={20} />
                  新建系列
                </button>
                <button
                  onClick={syncAll}
                  disabled={isSyncing}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
                  从后端同步
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-display font-bold text-white">
                  我的工作区 ({totalCount})
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={syncAll}
                    disabled={isSyncing}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                    同步
                  </button>
                  <button
                    onClick={() => setIsImportDialogOpen(true)}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
                  >
                    <FileUp size={16} />
                    导入文件
                  </button>
                  <button
                    onClick={() => setIsSeriesDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
                  >
                    <Library size={16} />
                    新建系列
                  </button>
                  <button
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
                  >
                    <Plus size={16} />
                    新建项目
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                {mixedList.map((item, i) => (
                  <motion.div
                    key={item.type === 'series' ? `s-${item.data.id}` : `p-${(item.data as Project).id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  >
                    {item.type === 'series' ? (
                      <SeriesCard series={item.data as Series} onDelete={deleteSeries} />
                    ) : (
                      <StandaloneProjectCard project={item.data as Project} onDelete={deleteProject} />
                    )}
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />

      {/* Create Series Dialog */}
      <CreateSeriesDialog
        isOpen={isSeriesDialogOpen}
        onClose={() => setIsSeriesDialogOpen(false)}
      />

      {/* Environment Configuration Dialog */}
      <EnvConfigDialog
        isOpen={isEnvDialogOpen}
        onClose={() => setIsEnvDialogOpen(false)}
        isRequired={false}
      />

      {/* Import File Dialog */}
      <ImportFileDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onSuccess={() => fetchSeriesList()}
      />
    </main>
  );
}

// ── Episode Breadcrumb Wrapper (D3) ──
function EpisodeBreadcrumbWrapper({ seriesId, episodeId }: { seriesId: string; episodeId: string }) {
  const [seriesTitle, setSeriesTitle] = useState<string>("");
  const [episodeNumber, setEpisodeNumber] = useState<number | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const series = await api.getSeries(seriesId);
        setSeriesTitle(series.title || "");
        // Find episode number from projects
        const episodes = await api.getSeriesEpisodes(seriesId);
        const ep = episodes.find((e: Project) => e.id === episodeId);
        if (ep) {
          setEpisodeNumber(ep.episode_number ?? null);
        }
      } catch (error) {
        console.error("Failed to fetch series info for breadcrumb:", error);
      }
    };
    fetchInfo();
  }, [seriesId, episodeId]);

  return (
    <div className="flex flex-col h-screen w-screen">
      {/* Breadcrumb bar */}
      <div className="relative z-30 flex items-center gap-3 px-4 py-2.5 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50">
        <button
          onClick={() => { window.location.hash = `#/series/${seriesId}`; }}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <span className="text-lg leading-none">&larr;</span>
          <span>返回系列</span>
        </button>
        <span className="text-gray-600">|</span>
        <nav className="flex items-center gap-1.5 text-sm">
          <a
            href={`#/series/${seriesId}`}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {seriesTitle || "系列"}
          </a>
          <span className="text-gray-600">&gt;</span>
          <span className="text-white font-medium">
            {episodeNumber != null ? `第${episodeNumber}集` : "集数"}
          </span>
        </nav>
      </div>

      {/* ProjectClient fills the rest */}
      <div className="flex-1 overflow-hidden">
        <ProjectClient id={episodeId} />
      </div>
    </div>
  );
}
