"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";

import { api } from "@/lib/api";
import { extractErrorDetail } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";


interface EntryAuthGateProps {
  children: ReactNode;
}


export default function EntryAuthGate({ children }: EntryAuthGateProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const refreshStatus = async () => {
    const status = await api.getEntryAuthStatus();
    setEnabled(status.enabled);
    setAuthenticated(status.authenticated);
    return status;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await api.getEntryAuthStatus();
        if (cancelled) return;
        setEnabled(status.enabled);
        setAuthenticated(status.authenticated);
      } catch (err) {
        if (cancelled) return;
        setError(extractErrorDetail(err, t("auth.statusFailed")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password.trim()) {
      setError(t("auth.entryPasswordRequired"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.loginEntryAuth(password);
      setPassword("");
      const status = await refreshStatus();
      if (!status.authenticated) {
        setError(t("auth.entryPasswordRetry"));
      }
    } catch (err) {
      setError(extractErrorDetail(err, t("auth.entryPasswordFailed")));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-300">
          <Loader2 size={20} className="animate-spin" />
          <span>{t("auth.checkingAccess")}</span>
        </div>
      </div>
    );
  }

  if (!enabled || authenticated) {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-xl bg-amber-500/15 p-3">
            <Lock className="text-amber-300" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{t("auth.accessTitle")}</h1>
            <p className="text-sm text-gray-400">{t("auth.accessEnabled")}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t("auth.entryPassword")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              placeholder={t("auth.entryPasswordPlaceholder")}
            />
          </div>
          {error ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 py-3 text-sm font-medium text-white transition-colors hover:from-amber-500 hover:to-orange-500 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            {submitting ? t("auth.submitting") : t("auth.submit")}
          </button>
        </form>
      </div>
    </main>
  );
}
