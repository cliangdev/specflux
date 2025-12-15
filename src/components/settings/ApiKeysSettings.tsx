import { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import type { ApiKey, ApiKeyCreated } from "../../api/generated";

export function ApiKeysSettings() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [expirationDays, setExpirationDays] = useState<number | null>(null);

  // Key created state (shows the full key once)
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  // Revoke modal state
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadApiKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const keys = await api.apiKeys.listApiKeys();
      setApiKeys(keys);
    } catch (err) {
      console.error("Failed to load API keys:", err);
      setError("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const handleCreateKey = async () => {
    setCreating(true);
    setError(null);

    try {
      const expiresAt = expirationDays
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)
        : undefined;

      const result = await api.apiKeys.createApiKey({
        createApiKeyRequest: {
          name: keyName || undefined,
          expiresAt,
        },
      });

      setCreatedKey(result);
      setShowCreateModal(false);
      setKeyName("");
      setExpirationDays(null);
      await loadApiKeys();
    } catch (err: unknown) {
      console.error("Failed to create API key:", err);
      if (err && typeof err === "object" && "response" in err) {
        const response = (err as { response: { status: number } }).response;
        if (response.status === 409) {
          setError("You already have an active API key. Revoke it first to create a new one.");
        } else {
          setError("Failed to create API key");
        }
      } else {
        setError("Failed to create API key");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!keyToRevoke) return;

    setRevoking(true);
    setError(null);

    try {
      await api.apiKeys.revokeApiKey({ keyId: keyToRevoke.id });
      setShowRevokeModal(false);
      setKeyToRevoke(null);
      await loadApiKeys();
    } catch (err) {
      console.error("Failed to revoke API key:", err);
      setError("Failed to revoke API key");
    } finally {
      setRevoking(false);
    }
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="text-surface-500 dark:text-surface-400">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
          API Keys
        </h2>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          Create API keys to authenticate with the SpecFlux API programmatically.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-semantic-error/10 border border-semantic-error/30 rounded-lg text-sm text-semantic-error">
          {error}
        </div>
      )}

      {/* Key Created Banner */}
      {createdKey && (
        <div className="p-4 bg-semantic-success/10 border border-semantic-success/30 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-semantic-success flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-semantic-success">
                API Key Created
              </p>
              <p className="text-xs text-surface-600 dark:text-surface-400 mt-1">
                Copy your API key now. You won't be able to see it again!
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm font-mono text-surface-900 dark:text-white break-all">
                  {createdKey.key}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyKey(createdKey.key)}
                  className="px-3 py-2 bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-surface-600 dark:text-surface-400 mt-4">
                Add to your environment:
              </p>
              <code className="block mt-2 px-3 py-2 bg-surface-900 text-surface-100 text-xs font-mono rounded-lg overflow-x-auto">
                export SPECFLUX_API_KEY="{createdKey.key}"
              </code>
              <button
                type="button"
                onClick={() => setCreatedKey(null)}
                className="mt-4 text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              >
                Done, I saved it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Keys List */}
      {apiKeys.length > 0 ? (
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="p-4 border-b border-surface-200 dark:border-surface-700 last:border-b-0 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-surface-900 dark:text-white">
                    {key.name || "Unnamed Key"}
                  </span>
                  <span className="px-2 py-0.5 bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 text-xs font-mono rounded">
                    {key.keyPrefix}...
                  </span>
                </div>
                <div className="text-xs text-surface-500 dark:text-surface-400 mt-1 flex items-center gap-3">
                  <span>Created {formatDate(key.createdAt)}</span>
                  {key.expiresAt && (
                    <span>
                      Expires {formatDate(key.expiresAt)}
                    </span>
                  )}
                  {key.lastUsedAt && (
                    <span>
                      Last used {formatDate(key.lastUsedAt)}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setKeyToRevoke(key);
                  setShowRevokeModal(true);
                }}
                className="px-3 py-1.5 text-sm font-medium text-semantic-error hover:bg-semantic-error/10 rounded-lg"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="border border-surface-200 dark:border-surface-700 border-dashed rounded-lg p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-surface-100 dark:bg-surface-800 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-surface-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-surface-900 dark:text-white">
            No API Keys
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Create an API key to authenticate with the SpecFlux API.
          </p>
        </div>
      )}

      {/* Create Key Button */}
      <div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          disabled={apiKeys.length > 0}
          className="px-4 py-2 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg"
        >
          Create API Key
        </button>
        {apiKeys.length > 0 && (
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-2">
            You can only have one active API key at a time. Revoke the existing key to create a new one.
          </p>
        )}
      </div>

      {/* Usage Instructions */}
      <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 bg-surface-50 dark:bg-surface-800/50">
        <h3 className="text-sm font-medium text-surface-900 dark:text-white mb-2">
          Using your API Key
        </h3>
        <p className="text-xs text-surface-600 dark:text-surface-400 mb-3">
          Include your API key in the Authorization header:
        </p>
        <code className="block px-3 py-2 bg-surface-900 dark:bg-surface-900 text-surface-100 text-xs font-mono rounded-lg overflow-x-auto">
          Authorization: Bearer sfx_your_api_key_here
        </code>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCreateModal(false)}
            aria-hidden="true"
          />

          <div className="relative bg-white dark:bg-surface-800 rounded-lg shadow-xl w-full max-w-md mx-4 border border-surface-200 dark:border-surface-700">
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                Create API Key
              </h2>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g., Claude Code Integration"
                  className="w-full bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Expiration
                </label>
                <select
                  value={expirationDays ?? ""}
                  onChange={(e) => setExpirationDays(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none"
                >
                  <option value="">Never expires</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="180">180 days</option>
                  <option value="365">1 year</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 dark:border-surface-700">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setKeyName("");
                  setExpirationDays(null);
                }}
                disabled={creating}
                className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateKey}
                disabled={creating}
                className="px-4 py-2 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
              >
                {creating ? "Creating..." : "Create Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {showRevokeModal && keyToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowRevokeModal(false);
              setKeyToRevoke(null);
            }}
            aria-hidden="true"
          />

          <div className="relative bg-white dark:bg-surface-800 rounded-lg shadow-xl w-full max-w-md mx-4 border border-surface-200 dark:border-surface-700">
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                Revoke API Key
              </h2>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-surface-600 dark:text-surface-300">
                Are you sure you want to revoke this API key? Any applications or
                services using this key will no longer be able to authenticate.
              </p>
              <div className="mt-3 p-3 bg-surface-100 dark:bg-surface-700 rounded-lg">
                <span className="font-medium text-surface-900 dark:text-white">
                  {keyToRevoke.name || "Unnamed Key"}
                </span>
                <span className="ml-2 text-xs text-surface-500 font-mono">
                  {keyToRevoke.keyPrefix}...
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 dark:border-surface-700">
              <button
                type="button"
                onClick={() => {
                  setShowRevokeModal(false);
                  setKeyToRevoke(null);
                }}
                disabled={revoking}
                className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeKey}
                disabled={revoking}
                className="px-4 py-2 bg-semantic-error hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
              >
                {revoking ? "Revoking..." : "Revoke Key"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
