"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Key, ChevronDown, ChevronRight, Settings, MessageSquareCode } from "lucide-react";
import { api, type EnvConfigPayload, type ProviderMode } from "@/lib/api";
import { T2I_MODELS, I2I_MODELS, ASPECT_RATIOS, getVideoModelsForMode } from "@/store/projectStore";
import { Image, Video, Layout, Check, User, Building, Box } from "lucide-react";
import { extractErrorDetail } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";

type EnvConfig = EnvConfigPayload & {
  DASHSCOPE_API_KEY: string;
  AIPING_API_KEY: string;
  LUMENX_ENTRY_PASSWORD: string;
  LUMENX_ENTRY_PASSWORD_CONFIGURED: boolean;
  LLM_PROVIDER: string;
  LLM_MODEL: string;
  OPENAI_API_KEY: string;
  OPENAI_BASE_URL: string;
  ALIBABA_CLOUD_ACCESS_KEY_ID: string;
  ALIBABA_CLOUD_ACCESS_KEY_SECRET: string;
  OSS_BUCKET_NAME: string;
  OSS_ENDPOINT: string;
  OSS_BASE_PATH: string;
  KLING_PROVIDER_MODE: ProviderMode;
  VIDU_PROVIDER_MODE: ProviderMode;
  PIXVERSE_PROVIDER_MODE: ProviderMode;
  KLING_ACCESS_KEY: string;
  KLING_SECRET_KEY: string;
  VIDU_API_KEY: string;
  endpoint_overrides: Record<string, string>;
};

const ENDPOINT_PROVIDERS = [
  { key: "DASHSCOPE_BASE_URL", label: "DashScope", placeholder: "https://dashscope.aliyuncs.com" },
  { key: "AIPING_BASE_URL", label: "AIPing", placeholder: "https://aiping.cn/api/v1" },
  { key: "KLING_BASE_URL", label: "Kling", placeholder: "https://api-beijing.klingai.com/v1" },
  { key: "VIDU_BASE_URL", label: "Vidu", placeholder: "https://api.vidu.cn/ent/v2" },
];

const DEFAULT_CONFIG: EnvConfig = {
  DASHSCOPE_API_KEY: "",
  AIPING_API_KEY: "",
  LUMENX_ENTRY_PASSWORD: "",
  LUMENX_ENTRY_PASSWORD_CONFIGURED: false,
  LLM_PROVIDER: "dashscope",
  LLM_MODEL: "",
  OPENAI_API_KEY: "",
  OPENAI_BASE_URL: "",
  ALIBABA_CLOUD_ACCESS_KEY_ID: "",
  ALIBABA_CLOUD_ACCESS_KEY_SECRET: "",
  OSS_BUCKET_NAME: "",
  OSS_ENDPOINT: "",
  OSS_BASE_PATH: "",
  KLING_PROVIDER_MODE: "dashscope",
  VIDU_PROVIDER_MODE: "dashscope",
  PIXVERSE_PROVIDER_MODE: "dashscope",
  KLING_ACCESS_KEY: "",
  KLING_SECRET_KEY: "",
  VIDU_API_KEY: "",
  endpoint_overrides: {},
};

const normalizeProviderMode = (mode?: string): ProviderMode => (mode === "vendor" ? "vendor" : "dashscope");

const normalizeLlmProvider = (p?: string): string => (p === "openai" ? "openai" : "dashscope");

const DEFAULT_I2V_MODELS = getVideoModelsForMode("i2v");
const DEFAULT_R2V_MODELS = getVideoModelsForMode("r2v");

const normalizeEnvConfig = (existing: EnvConfig, data?: EnvConfigPayload): EnvConfig => ({
  ...existing,
  ...data,
  LLM_PROVIDER: normalizeLlmProvider(data?.LLM_PROVIDER ?? existing.LLM_PROVIDER),
  KLING_PROVIDER_MODE: normalizeProviderMode(data?.KLING_PROVIDER_MODE ?? existing.KLING_PROVIDER_MODE),
  VIDU_PROVIDER_MODE: normalizeProviderMode(data?.VIDU_PROVIDER_MODE ?? existing.VIDU_PROVIDER_MODE),
  PIXVERSE_PROVIDER_MODE: normalizeProviderMode(data?.PIXVERSE_PROVIDER_MODE ?? existing.PIXVERSE_PROVIDER_MODE),
  endpoint_overrides: data?.endpoint_overrides ?? existing.endpoint_overrides ?? {},
  LUMENX_ENTRY_PASSWORD: "",
  LUMENX_ENTRY_PASSWORD_CONFIGURED: Boolean(data?.LUMENX_ENTRY_PASSWORD_CONFIGURED ?? existing.LUMENX_ENTRY_PASSWORD_CONFIGURED),
});

const getValidationErrors = (env: EnvConfig): string[] => {
  const errors: string[] = [];

  if (!env.DASHSCOPE_API_KEY?.trim()) {
    errors.push("DashScope API Key");
  }
  if (env.KLING_PROVIDER_MODE === "vendor") {
    if (!env.KLING_ACCESS_KEY?.trim()) {
      errors.push("Kling Access Key (vendor mode)");
    }
    if (!env.KLING_SECRET_KEY?.trim()) {
      errors.push("Kling Secret Key (vendor mode)");
    }
  }
  if (env.VIDU_PROVIDER_MODE === "vendor" && !env.VIDU_API_KEY?.trim()) {
    errors.push("Vidu API Key (vendor mode)");
  }

  return errors;
};

const LS_KEY_MODEL = "lumenx_default_model_settings";
const LS_KEY_PROMPT = "lumenx_default_prompt_config";

interface DefaultModelSettings {
  t2i_model: string;
  i2i_model: string;
  i2v_model: string;
  r2v_model: string;
  character_aspect_ratio: string;
  scene_aspect_ratio: string;
  prop_aspect_ratio: string;
  storyboard_aspect_ratio: string;
}

interface DefaultPromptConfig {
  storyboard_polish: string;
  video_polish: string;
  r2v_polish: string;
}

const DEFAULT_MODEL_SETTINGS: DefaultModelSettings = {
  t2i_model: "wan2.5-t2i-preview",
  i2i_model: "wan2.5-i2i-preview",
  i2v_model: "wan2.5-i2v-preview",
  r2v_model: "wan2.7-r2v",
  character_aspect_ratio: "9:16",
  scene_aspect_ratio: "16:9",
  prop_aspect_ratio: "1:1",
  storyboard_aspect_ratio: "16:9",
};

function loadFromLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function SettingsPage() {
  const { t } = useI18n();
  // ── API Config ──
  const [config, setConfig] = useState<EnvConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [endpointsOpen, setEndpointsOpen] = useState(false);

  // ── Default Model Settings ──
  const [modelSettings, setModelSettings] = useState<DefaultModelSettings>(() =>
    ({ ...DEFAULT_MODEL_SETTINGS, ...loadFromLS(LS_KEY_MODEL, DEFAULT_MODEL_SETTINGS) })
  );

  // ── Default Prompt Config ──
  const [promptConfig, setPromptConfig] = useState<DefaultPromptConfig>(() =>
    loadFromLS(LS_KEY_PROMPT, { storyboard_polish: "", video_polish: "", r2v_polish: "" })
  );

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.getEnvConfig();
      setConfig((prev) => normalizeEnvConfig(prev, data));
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 401) {
        setLoadError(t("settingsPage.authRequired"));
      } else {
        setLoadError(extractErrorDetail(error, t("settingsPage.loadConfigFailed")));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiConfig = async () => {
    const errors = getValidationErrors(config);
    if (errors.length > 0) {
      alert(`${t("settingsPage.fillRequired")}\n- ${errors.join("\n- ")}`);
      return;
    }

    setSaving(true);
    try {
      const payload: EnvConfigPayload = { ...config };
      if (!config.LUMENX_ENTRY_PASSWORD.trim()) {
        delete payload.LUMENX_ENTRY_PASSWORD;
      }
      delete payload.LUMENX_ENTRY_PASSWORD_CONFIGURED;
      await api.saveEnvConfig(payload);
      alert(t("settingsPage.saveConfigSuccess"));
    } catch (error) {
      alert(extractErrorDetail(error, t("settingsPage.saveConfigFailed")));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof EnvConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleEndpointChange = (envKey: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      endpoint_overrides: { ...prev.endpoint_overrides, [envKey]: value },
    }));
  };

  const handleSaveModelDefaults = () => {
    localStorage.setItem(LS_KEY_MODEL, JSON.stringify(modelSettings));
    alert(t("settingsPage.modelDefaultsSaved"));
  };

  const handleSavePromptDefaults = () => {
    localStorage.setItem(LS_KEY_PROMPT, JSON.stringify(promptConfig));
    alert(t("settingsPage.promptDefaultsSaved"));
  };

  const inputClass =
    "w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors";
  const modeButtonClass = (active: boolean) =>
    `px-3 py-1.5 text-xs rounded-md border transition-colors ${active ? "border-amber-500/60 bg-amber-500/15 text-amber-200" : "border-white/10 bg-white/5 text-gray-400 hover:text-gray-200"}`;

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl space-y-8">
      <h1 className="text-2xl font-display font-bold text-white">{t("settingsPage.title")}</h1>

      {/* ── Section 1: API Configuration ── */}
      <section className="glass-panel rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg">
            <Key size={20} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t("settingsPage.apiConfig")}</h2>
            <p className="text-xs text-gray-500">{t("settingsPage.apiConfigDesc")}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-amber-400" />
            <span className="ml-2 text-gray-400">{t("settingsPage.loadingConfig")}</span>
          </div>
        ) : loadError ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-300">
            {loadError}
          </div>
        ) : (
          <>
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-300 mb-2">
                <span>{t("settingsPage.dashscopeRequired")} <span className="text-red-500">*</span></span>
                <span className="text-gray-600 font-normal text-xs">e.g. sk-xxx</span>
              </label>
              <input type="password" value={config.DASHSCOPE_API_KEY} onChange={(e) => handleChange("DASHSCOPE_API_KEY", e.target.value)} placeholder={t("settingsPage.dashscopePlaceholder")} className={inputClass} />
            </div>

            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-300 mb-2">
                <span>{t("settingsPage.aipingApiKey")}</span>
                <span className="text-gray-600 font-normal text-xs">AIPing video / TTS</span>
              </label>
              <input type="password" value={config.AIPING_API_KEY} onChange={(e) => handleChange("AIPING_API_KEY", e.target.value)} placeholder={t("settingsPage.aipingPlaceholder")} className={inputClass} />
              <p className="text-[10px] text-gray-500 mt-1">{t("settingsPage.aipingHint")}</p>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-bold text-white mb-4">{t("settingsPage.accessAuth")}</h3>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-300 mb-2">
                    <span>{t("settingsPage.entryPassword")}</span>
                    <span className="text-gray-600 font-normal text-xs">
                      {config.LUMENX_ENTRY_PASSWORD_CONFIGURED ? t("settingsPage.passwordConfiguredKeep") : t("settingsPage.passwordEmptyDisable")}
                    </span>
                  </label>
                  <input
                    type="password"
                    value={config.LUMENX_ENTRY_PASSWORD}
                    onChange={(e) => handleChange("LUMENX_ENTRY_PASSWORD", e.target.value)}
                    placeholder={config.LUMENX_ENTRY_PASSWORD_CONFIGURED ? t("settingsPage.passwordOverride") : t("settingsPage.passwordSetPlaceholder")}
                    className={inputClass}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {t("settingsPage.passwordHint")}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-bold text-white mb-4">{t("settingsPage.llmConfig")}</h3>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleChange("LLM_PROVIDER", "dashscope")} className={modeButtonClass(config.LLM_PROVIDER !== "openai")}>
                    DashScope
                  </button>
                  <button type="button" onClick={() => handleChange("LLM_PROVIDER", "openai")} className={modeButtonClass(config.LLM_PROVIDER === "openai")}>
                    OpenAI-compatible
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {t("settingsPage.llmConfigHint")}
                </p>
                {config.LLM_PROVIDER !== "openai" ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t("settingsPage.llmModel")}</label>
                    <input type="text" value={config.LLM_MODEL} onChange={(e) => handleChange("LLM_MODEL", e.target.value)} placeholder="qwen3.5-plus" className={inputClass} />
                    <p className="text-[10px] text-gray-500 mt-1">{t("settingsPage.llmModelHint")}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">{t("settingsPage.openaiApiKey")} <span className="text-red-500">*</span></label>
                      <input type="password" value={config.OPENAI_API_KEY} onChange={(e) => handleChange("OPENAI_API_KEY", e.target.value)} placeholder="sk-..." className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">{t("settingsPage.baseUrl")}</label>
                      <input type="text" value={config.OPENAI_BASE_URL} onChange={(e) => handleChange("OPENAI_BASE_URL", e.target.value)} placeholder="https://api.openai.com/v1" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">{t("settingsPage.model")}</label>
                      <input type="text" value={config.LLM_MODEL} onChange={(e) => handleChange("LLM_MODEL", e.target.value)} placeholder="gpt-4o" className={inputClass} />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
              <p className="text-xs text-gray-400">{t("settingsPage.storageHint")}</p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t("settingsPage.ossAccessKeyId")}</label>
                <input type="password" value={config.ALIBABA_CLOUD_ACCESS_KEY_ID} onChange={(e) => handleChange("ALIBABA_CLOUD_ACCESS_KEY_ID", e.target.value)} placeholder={t("settingsPage.ossOptionalPlaceholder")} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t("settingsPage.ossAccessKeySecret")}</label>
                <input type="password" value={config.ALIBABA_CLOUD_ACCESS_KEY_SECRET} onChange={(e) => handleChange("ALIBABA_CLOUD_ACCESS_KEY_SECRET", e.target.value)} placeholder={t("settingsPage.ossOptionalPlaceholder")} className={inputClass} />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-bold text-white mb-2">{t("settingsPage.ossMirror")}</h3>
              <p className="text-[10px] text-gray-500 mb-4">{t("settingsPage.ossMirrorHint")}</p>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-300 mb-2">
                    <span>{t("settingsPage.ossBucketName")}</span>
                  </label>
                  <input type="text" value={config.OSS_BUCKET_NAME} onChange={(e) => handleChange("OSS_BUCKET_NAME", e.target.value)} placeholder={t("settingsPage.ossBucketPlaceholder")} className={inputClass} />
                </div>
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-300 mb-2">
                    <span>{t("settingsPage.ossEndpoint")}</span>
                  </label>
                  <input type="text" value={config.OSS_ENDPOINT} onChange={(e) => handleChange("OSS_ENDPOINT", e.target.value)} placeholder={t("settingsPage.ossEndpointPlaceholder")} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{t("settingsPage.ossBasePath")}</label>
                  <input type="text" value={config.OSS_BASE_PATH} onChange={(e) => handleChange("OSS_BASE_PATH", e.target.value)} placeholder="lumenx" className={inputClass} />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-bold text-white mb-4">{t("settingsPage.klingProvider")}</h3>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleChange("KLING_PROVIDER_MODE", "dashscope")} className={modeButtonClass(config.KLING_PROVIDER_MODE === "dashscope")}>
                    DashScope
                  </button>
                  <button type="button" onClick={() => handleChange("KLING_PROVIDER_MODE", "vendor")} className={modeButtonClass(config.KLING_PROVIDER_MODE === "vendor")}>
                    Vendor Direct
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {t("settingsPage.klingHint")}
                </p>
                {config.KLING_PROVIDER_MODE === "vendor" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">{t("settingsPage.klingAccessKey")} <span className="text-red-500">*</span></label>
                      <input type="password" value={config.KLING_ACCESS_KEY} onChange={(e) => handleChange("KLING_ACCESS_KEY", e.target.value)} placeholder={t("settingsPage.klingAccessKey")} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">{t("settingsPage.klingSecretKey")} <span className="text-red-500">*</span></label>
                      <input type="password" value={config.KLING_SECRET_KEY} onChange={(e) => handleChange("KLING_SECRET_KEY", e.target.value)} placeholder={t("settingsPage.klingSecretKey")} className={inputClass} />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-bold text-white mb-4">{t("settingsPage.viduProvider")}</h3>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleChange("VIDU_PROVIDER_MODE", "dashscope")} className={modeButtonClass(config.VIDU_PROVIDER_MODE === "dashscope")}>
                    DashScope
                  </button>
                  <button type="button" onClick={() => handleChange("VIDU_PROVIDER_MODE", "vendor")} className={modeButtonClass(config.VIDU_PROVIDER_MODE === "vendor")}>
                    Vendor Direct
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {t("settingsPage.viduHint")}
                </p>
                {config.VIDU_PROVIDER_MODE === "vendor" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t("settingsPage.viduApiKey")} <span className="text-red-500">*</span></label>
                    <input type="password" value={config.VIDU_API_KEY} onChange={(e) => handleChange("VIDU_API_KEY", e.target.value)} placeholder={t("settingsPage.viduApiKey")} className={inputClass} />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button type="button" onClick={() => setEndpointsOpen(!endpointsOpen)} className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors">
                {endpointsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {t("settingsPage.advancedApiEndpoints")}
              </button>
              {endpointsOpen && (
                <div className="mt-4 space-y-4">
                  <p className="text-xs text-gray-500">{t("settingsPage.endpointHint")}</p>
                  {ENDPOINT_PROVIDERS.map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="flex items-center justify-between text-sm font-medium text-gray-300 mb-2">
                        <span>{label} {t("settingsPage.baseUrl")}</span>
                        <span className="text-gray-600 font-normal text-xs">{placeholder}</span>
                      </label>
                      <input type="text" value={config.endpoint_overrides[key] || ""} onChange={(e) => handleEndpointChange(key, e.target.value)} placeholder={placeholder} className={inputClass + " text-sm"} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveApiConfig}
                disabled={saving || loading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? t("settingsPage.saving") : t("settingsPage.saveConfiguration")}
              </button>
            </div>
          </>
        )}
      </section>

      {/* ── Section 2: Default Model Settings ── */}
      <section className="glass-panel rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
            <Settings size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t("settingsPage.defaultModelSettings")}</h2>
            <p className="text-xs text-gray-500">{t("settingsPage.defaultModelSettingsDesc")}</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Image size={16} className="text-green-400" />
            <span>{t("settingsPage.textToImageModel")}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {T2I_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => setModelSettings((s) => ({ ...s, t2i_model: model.id }))}
                className={`relative flex flex-col items-start p-3 rounded-lg border transition-all text-left ${modelSettings.t2i_model === model.id ? "border-green-500/50 bg-green-500/10" : "border-white/10 hover:border-white/20 bg-white/5"}`}
              >
                {modelSettings.t2i_model === model.id && <div className="absolute top-2 right-2"><Check size={14} className="text-green-400" /></div>}
                <span className="text-sm font-medium text-white">{model.name}</span>
                <span className="text-xs text-gray-500">{model.description}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {(
              [
                { key: "character_aspect_ratio" as const, label: t("settingsPage.character"), icon: User },
                { key: "scene_aspect_ratio" as const, label: t("settingsPage.scene"), icon: Building },
                { key: "prop_aspect_ratio" as const, label: t("settingsPage.prop"), icon: Box },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-1 text-xs text-gray-400"><Icon size={12} /><label>{label}</label></div>
                <div className="space-y-1">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button key={ratio.id} onClick={() => setModelSettings((s) => ({ ...s, [key]: ratio.id }))} className={`w-full flex flex-col items-center py-2 px-2 rounded border transition-all ${modelSettings[key] === ratio.id ? "border-green-500/50 bg-green-500/10" : "border-white/10 hover:border-white/20 bg-white/5"}`}>
                      <span className="text-xs font-medium text-white">{ratio.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Layout size={16} className="text-blue-400" />
              <span>{t("settingsPage.storyboardI2I")}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {I2I_MODELS.map((model) => (
                <button key={model.id} onClick={() => setModelSettings((s) => ({ ...s, i2i_model: model.id }))} className={`relative flex flex-col items-start p-3 rounded-lg border transition-all text-left ${modelSettings.i2i_model === model.id ? "border-blue-500/50 bg-blue-500/10" : "border-white/10 hover:border-white/20 bg-white/5"}`}>
                  {modelSettings.i2i_model === model.id && <div className="absolute top-2 right-2"><Check size={14} className="text-blue-400" /></div>}
                  <span className="text-sm font-medium text-white">{model.name}</span>
                  <span className="text-xs text-gray-500">{model.description}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <label className="text-xs text-gray-400">{t("settingsPage.storyboardAspectRatio")}</label>
              <div className="grid grid-cols-3 gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button key={ratio.id} onClick={() => setModelSettings((s) => ({ ...s, storyboard_aspect_ratio: ratio.id }))} className={`flex flex-col items-center p-3 rounded-lg border transition-all ${modelSettings.storyboard_aspect_ratio === ratio.id ? "border-blue-500/50 bg-blue-500/10" : "border-white/10 hover:border-white/20 bg-white/5"}`}>
                    <span className="text-sm font-medium text-white">{ratio.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Video size={16} className="text-purple-400" />
              <span>{t("settingsPage.motionI2V")}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEFAULT_I2V_MODELS.map((model) => (
                <button key={model.id} onClick={() => setModelSettings((s) => ({ ...s, i2v_model: model.id }))} className={`relative flex flex-col items-start p-3 rounded-lg border transition-all text-left ${modelSettings.i2v_model === model.id ? "border-purple-500/50 bg-purple-500/10" : "border-white/10 hover:border-white/20 bg-white/5"}`}>
                  {modelSettings.i2v_model === model.id && <div className="absolute top-2 right-2"><Check size={14} className="text-purple-400" /></div>}
                  <span className="text-sm font-medium text-white">{model.name}</span>
                  <span className="text-xs text-gray-500">{model.description}</span>
                </button>
              ))}
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Video size={16} className="text-fuchsia-400" />
                <span>{t("settingsPage.motionR2V")}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {DEFAULT_R2V_MODELS.map((model) => (
                  <button key={model.id} onClick={() => setModelSettings((s) => ({ ...s, r2v_model: model.id }))} className={`relative flex flex-col items-start p-3 rounded-lg border transition-all text-left ${modelSettings.r2v_model === model.id ? "border-fuchsia-500/50 bg-fuchsia-500/10" : "border-white/10 hover:border-white/20 bg-white/5"}`}>
                    {modelSettings.r2v_model === model.id && <div className="absolute top-2 right-2"><Check size={14} className="text-fuchsia-400" /></div>}
                    <span className="text-sm font-medium text-white">{model.name}</span>
                    <span className="text-xs text-gray-500">{model.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSaveModelDefaults} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-all">
            <Save size={16} />
            {t("settingsPage.saveDefaults")}
          </button>
        </div>
      </section>

      {/* ── Section 3: Default Prompt Config ── */}
      <section className="glass-panel rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <MessageSquareCode size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t("settingsPage.defaultPromptConfig")}</h2>
            <p className="text-xs text-gray-500">{t("settingsPage.defaultPromptConfigDesc")}</p>
          </div>
        </div>

        {(
          [
            { key: "storyboard_polish" as const, label: t("settingsPage.storyboardPolish"), desc: t("settingsPage.storyboardPolishDesc") },
            { key: "video_polish" as const, label: t("settingsPage.videoI2VPolish"), desc: t("settingsPage.videoI2VPolishDesc") },
            { key: "r2v_polish" as const, label: t("settingsPage.videoR2VPolish"), desc: t("settingsPage.videoR2VPolishDesc") },
          ] as const
        ).map((section) => (
          <div key={section.key} className="space-y-2">
            <h3 className="text-sm font-bold text-white">{section.label}</h3>
            <p className="text-[10px] text-gray-500">{section.desc}</p>
            <textarea
              value={promptConfig[section.key]}
              onChange={(e) => setPromptConfig((prev) => ({ ...prev, [section.key]: e.target.value }))}
              placeholder={t("settingsPage.promptPlaceholder")}
              className="w-full h-32 bg-black/30 border border-white/10 rounded-lg p-3 text-xs text-gray-300 resize-y focus:outline-none focus:border-purple-500/50 font-mono placeholder-gray-600"
            />
          </div>
        ))}

        <div className="flex justify-end">
          <button onClick={handleSavePromptDefaults} className="px-6 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-2">
            <Save size={16} />
            {t("settingsPage.saveDefaults")}
          </button>
        </div>
      </section>

      <div className="pb-8" />
    </div>
  );
}
