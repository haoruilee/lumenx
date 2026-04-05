"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Volume2, Music, Mic, Video, Sliders } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { getAssetUrl } from "@/lib/utils";

const FRAME_FALLBACK_DURATION = 5;

export default function FinalMixStudio() {
    const currentProject = useProjectStore((state) => state.currentProject);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [zoom, setZoom] = useState(1);

    const [volumes, setVolumes] = useState({
        video: 1.0,
        voice: 1.0,
        sfx: 0.8,
        bgm: 0.5,
    });

    const frames = currentProject?.frames || [];
    const mergedVideoUrl = currentProject?.merged_video_url ? getAssetUrl(currentProject.merged_video_url) : null;

    const frameDurations = useMemo(() => {
        const tasksById = new Map((currentProject?.video_tasks || []).map((task: any) => [task.id, task]));
        return frames.map((frame: any) => {
            const selectedTask = frame.selected_video_id ? tasksById.get(frame.selected_video_id) : null;
            return selectedTask?.duration || FRAME_FALLBACK_DURATION;
        });
    }, [currentProject?.video_tasks, frames]);

    const totalDuration = useMemo(() => {
        const mergedDuration = duration > 0 ? duration : 0;
        if (mergedDuration > 0) return mergedDuration;
        return frameDurations.reduce((sum, value) => sum + value, 0);
    }, [duration, frameDurations]);

    const frameStarts = useMemo(() => {
        let cursor = 0;
        return frameDurations.map((segmentDuration) => {
            const start = cursor;
            cursor += segmentDuration;
            return start;
        });
    }, [frameDurations]);

    const currentFrameIndex = useMemo(() => {
        if (!frames.length) return 0;
        const activeIndex = frameStarts.findIndex((start, index) => {
            const end = start + (frameDurations[index] || FRAME_FALLBACK_DURATION);
            return currentTime >= start && currentTime < end;
        });
        return activeIndex >= 0 ? activeIndex : Math.max(frames.length - 1, 0);
    }, [currentTime, frameDurations, frameStarts, frames.length]);

    useEffect(() => {
        const player = videoRef.current;
        if (!player) {
            setIsPlaying(false);
            return;
        }

        const handleLoadedMetadata = () => {
            setDuration(Number.isFinite(player.duration) ? player.duration : 0);
        };
        const handleTimeUpdate = () => {
            setCurrentTime(player.currentTime || 0);
        };
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(player.duration || 0);
        };

        player.addEventListener("loadedmetadata", handleLoadedMetadata);
        player.addEventListener("timeupdate", handleTimeUpdate);
        player.addEventListener("play", handlePlay);
        player.addEventListener("pause", handlePause);
        player.addEventListener("ended", handleEnded);

        return () => {
            player.removeEventListener("loadedmetadata", handleLoadedMetadata);
            player.removeEventListener("timeupdate", handleTimeUpdate);
            player.removeEventListener("play", handlePlay);
            player.removeEventListener("pause", handlePause);
            player.removeEventListener("ended", handleEnded);
        };
    }, [mergedVideoUrl]);

    useEffect(() => {
        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(false);
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    }, [mergedVideoUrl, currentProject?.id]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volumes.video;
        }
    }, [volumes.video]);

    const formatTime = (seconds: number) => {
        const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
        const mins = Math.floor(safeSeconds / 60);
        const secs = Math.floor(safeSeconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const togglePlayback = async () => {
        const player = videoRef.current;
        if (!player || !mergedVideoUrl) return;
        if (player.paused) {
            await player.play();
        } else {
            player.pause();
        }
    };

    const seekTo = (nextTime: number) => {
        const clampedTime = Math.max(0, Math.min(nextTime, totalDuration || 0));
        setCurrentTime(clampedTime);
        if (videoRef.current && mergedVideoUrl) {
            videoRef.current.currentTime = clampedTime;
        }
    };

    return (
        <div className="flex flex-col h-full text-white">
            <div className="flex-1 flex border-b border-white/10 min-h-0">
                <div className="flex-1 bg-black/80 flex items-center justify-center relative p-8">
                    <div className="aspect-video bg-black/20 border border-white/10 rounded-lg w-full max-w-4xl flex items-center justify-center relative overflow-hidden shadow-2xl">
                        {mergedVideoUrl ? (
                            <video
                                ref={videoRef}
                                src={mergedVideoUrl}
                                controls
                                className="w-full h-full object-contain bg-black"
                                playsInline
                                preload="metadata"
                            />
                        ) : (
                            <div className="text-gray-500 flex flex-col items-center gap-4 px-8 text-center">
                                <Video size={48} className="opacity-20" />
                                <div className="font-mono text-xl text-white/50">{formatTime(currentTime)}</div>
                                <p className="text-sm text-gray-400 max-w-md">
                                    Final Mix 目前会在这里预览真实成片。先完成一次 `Merge & Proceed`，再回来播放最终视频。
                                </p>
                            </div>
                        )}

                        <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded text-xs backdrop-blur-sm">
                            Frame {Math.min(currentFrameIndex + 1, Math.max(frames.length, 1))}
                        </div>
                    </div>
                </div>

                <div className="w-80 bg-black/20 border-l border-white/10 flex flex-col">
                    <div className="p-4 border-b border-white/10">
                        <h3 className="font-display font-bold text-sm flex items-center gap-2">
                            <Sliders size={16} className="text-primary" /> Audio Mixer
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium ml-2">Preview</span>
                        </h3>
                    </div>
                    <div className="p-6 space-y-8">
                        {[
                            { id: "video", label: "Final Mix", icon: <Video size={16} /> },
                            { id: "voice", label: "Dialogue", icon: <Mic size={16} /> },
                            { id: "sfx", label: "SFX", icon: <Volume2 size={16} /> },
                            { id: "bgm", label: "Music", icon: <Music size={16} /> },
                        ].map((track) => (
                            <div key={track.id} className="space-y-2">
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span className="flex items-center gap-2">{track.icon} {track.label}</span>
                                    <span>{Math.round(volumes[track.id as keyof typeof volumes] * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volumes[track.id as keyof typeof volumes]}
                                    onChange={(e) => setVolumes((prev) => ({ ...prev, [track.id]: parseFloat(e.target.value) }))}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto p-4 border-t border-white/10">
                        <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                            当前只有 `Final Mix` 滑杆会控制预览音量，其余轨道是时间线参考，不会单独回写后端。
                        </p>
                    </div>
                </div>
            </div>

            <div className="h-72 bg-black/10 border-t border-white/10 flex flex-col">
                <div className="h-10 border-b border-white/5 flex items-center px-4 justify-between bg-black/20">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={togglePlayback}
                            disabled={!mergedVideoUrl}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <span className="font-mono text-xs text-gray-400 ml-2">
                            {formatTime(currentTime)} / {formatTime(totalDuration)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="text-gray-500 hover:text-white">-</button>
                        <span className="text-xs text-gray-500">Zoom</span>
                        <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="text-gray-500 hover:text-white">+</button>
                    </div>
                </div>

                <div
                    className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar cursor-pointer"
                    onClick={(e) => {
                        if (!totalDuration) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const scrollLeft = e.currentTarget.scrollLeft;
                        const totalWidth = e.currentTarget.scrollWidth;
                        const clickX = x + scrollLeft;
                        seekTo((clickX / totalWidth) * totalDuration);
                    }}
                >
                    <div
                        className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
                        style={{ left: `${totalDuration ? (currentTime / totalDuration) * 100 : 0}%` }}
                    />

                    <div className="min-w-full h-full flex flex-col" style={{ width: `${100 * zoom}%` }}>
                        <div className="h-16 border-b border-white/5 bg-white/[0.03] relative flex items-center px-2 group">
                            <div className="absolute left-0 top-0 bottom-0 w-24 bg-white/5 z-10 flex items-center justify-center border-r border-white/5 text-xs font-bold text-gray-500">
                                Video
                            </div>
                            <div className="ml-24 flex-1 flex gap-1 h-12">
                                {frames.map((frame: any, i) => (
                                    <div key={frame.id} className="flex-1 bg-blue-900/30 border border-blue-500/30 rounded overflow-hidden relative group-hover:brightness-110 transition-all">
                                        {(frame.rendered_image_url || frame.image_url) && (
                                            <img src={getAssetUrl(frame.rendered_image_url || frame.image_url)} className="w-full h-full object-cover opacity-60" />
                                        )}
                                        <div className="absolute bottom-1 left-1 text-[10px] text-blue-200">Shot {i + 1}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="h-12 border-b border-white/5 bg-white/[0.03] relative flex items-center px-2">
                            <div className="absolute left-0 top-0 bottom-0 w-24 bg-white/5 z-10 flex items-center justify-center border-r border-white/5 text-xs font-bold text-gray-500">
                                Dialogue
                            </div>
                            <div className="ml-24 flex-1 flex gap-1 h-8">
                                {frames.map((frame: any) => (
                                    <div key={frame.id} className="flex-1 relative">
                                        {frame.audio_url && (
                                            <div className="absolute left-2 right-2 top-1 bottom-1 bg-green-900/40 border border-green-500/40 rounded flex items-center justify-center">
                                                <div className="w-full h-full flex items-center gap-0.5 px-2 overflow-hidden">
                                                    {[...Array(10)].map((_, i) => (
                                                        <div key={i} className="w-1 bg-green-500/50 rounded-full" style={{ height: `${35 + ((i * 13) % 50)}%` }} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="h-12 border-b border-white/5 bg-white/[0.03] relative flex items-center px-2">
                            <div className="absolute left-0 top-0 bottom-0 w-24 bg-white/5 z-10 flex items-center justify-center border-r border-white/5 text-xs font-bold text-gray-500">
                                SFX
                            </div>
                            <div className="ml-24 flex-1 flex gap-1 h-8">
                                {frames.map((frame: any) => (
                                    <div key={frame.id} className="flex-1 relative">
                                        {frame.sfx_url && (
                                            <div className="absolute left-4 right-8 top-1 bottom-1 bg-yellow-900/40 border border-yellow-500/40 rounded flex items-center justify-center">
                                                <span className="text-[9px] text-yellow-500 truncate px-1">SFX</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="h-12 border-b border-white/5 bg-white/[0.03] relative flex items-center px-2">
                            <div className="absolute left-0 top-0 bottom-0 w-24 bg-white/5 z-10 flex items-center justify-center border-r border-white/5 text-xs font-bold text-gray-500">
                                BGM
                            </div>
                            <div className="ml-24 flex-1 h-8 relative">
                                {frames.some((frame: any) => frame.bgm_url) && (
                                    <div className="absolute left-0 right-0 top-1 bottom-1 bg-purple-900/40 border border-purple-500/40 rounded mx-1 flex items-center px-4">
                                        <Music size={12} className="text-purple-400 mr-2" />
                                        <span className="text-[10px] text-purple-300">Background Music</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
