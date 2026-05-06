import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { ProviderConfig } from '@/types/ai';

type Provider = 'anthropic' | 'openai' | 'bedrock';

export function Options() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [provider, setProvider] = useState<Provider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('');
  const [modelArn, setModelArn] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(
      ['aiEnabled', 'aiProvider', 'aiProviderConfig'],
      (result) => {
        if (result['aiEnabled']) setAiEnabled(true);
        if (result['aiProvider']) setProvider(result['aiProvider'] as Provider);
        const cfg = result['aiProviderConfig'] as ProviderConfig | undefined;
        if (cfg) {
          if (cfg.type === 'bedrock') {
            if (cfg.accessKeyId) setAccessKeyId(cfg.accessKeyId);
            if (cfg.secretAccessKey) setSecretAccessKey(cfg.secretAccessKey);
            if (cfg.region) setRegion(cfg.region);
            if (cfg.modelArn) setModelArn(cfg.modelArn);
          } else {
            if (cfg.apiKey) setApiKey(cfg.apiKey);
            if (cfg.model) setModel(cfg.model);
          }
        }
      },
    );
  }, []);

  function buildConfig(): ProviderConfig {
    if (provider === 'bedrock') {
      return { type: 'bedrock', accessKeyId, secretAccessKey, region, modelArn };
    }
    return { type: provider, apiKey, model: model || undefined };
  }

  function handleSave() {
    chrome.storage.local.set(
      { aiEnabled, aiProvider: provider, aiProviderConfig: buildConfig() },
      () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      },
    );
  }

  async function handleTest() {
    setTestStatus('testing');
    setTestMessage('');
    try {
      const { scan } = await import('@/ai/pii-scanner');
      const probe = new ArrayBuffer(0);
      await scan(probe, buildConfig());
      setTestStatus('ok');
      setTestMessage('Connection successful');
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err instanceof Error ? err.message : 'Connection failed');
    }
  }

  return (
    <div className="max-w-lg mx-auto p-8 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">ToyoSnap Options</h1>

      <div className="flex items-center gap-3">
        <input
          id="ai-toggle"
          type="checkbox"
          checked={aiEnabled}
          onChange={(e) => setAiEnabled(e.target.checked)}
          className="w-4 h-4"
          aria-label="Enable AI features"
        />
        <label htmlFor="ai-toggle" className="text-sm font-medium text-gray-700">
          Enable AI features
        </label>
      </div>

      {aiEnabled && (
        <div className="space-y-4 border border-gray-200 rounded-xl p-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Provider
            </label>
            <div className="flex gap-2">
              {(['anthropic', 'openai', 'bedrock'] as Provider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors',
                    provider === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  ].join(' ')}
                >
                  {p === 'bedrock' ? 'AWS Bedrock' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {provider !== 'bedrock' ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  aria-label="API Key"
                />
              </div>
              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                  Model (optional)
                </label>
                <input
                  id="model"
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={provider === 'anthropic' ? 'claude-sonnet-4-6' : 'gpt-4o'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { id: 'access-key-id', label: 'Access Key ID', value: accessKeyId, setter: setAccessKeyId, placeholder: 'AKIA...' },
                { id: 'secret-access-key', label: 'Secret Access Key', value: secretAccessKey, setter: setSecretAccessKey, placeholder: '••••••••' },
                { id: 'region', label: 'Region', value: region, setter: setRegion, placeholder: 'us-east-1' },
                { id: 'model-arn', label: 'Model ARN', value: modelArn, setter: setModelArn, placeholder: 'anthropic.claude-3-5-sonnet-...' },
              ].map(({ id, label, value, setter, placeholder }) => (
                <div key={id}>
                  <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                  </label>
                  <input
                    id={id}
                    type={id === 'secret-access-key' ? 'password' : 'text'}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleTest()}
              disabled={testStatus === 'testing'}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              {testStatus === 'testing' ? 'Testing…' : 'Test connection'}
            </button>
            {testMessage && (
              <span className={testStatus === 'ok' ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>
                {testMessage}
              </span>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
        aria-label="Save"
      >
        {saved ? 'Saved ✓' : 'Save'}
      </button>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<Options />);
}
