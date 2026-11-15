import React, { useState } from 'react';

interface PixelStreamViewProps {
  defaultUrl?: string;
}

export const PixelStreamView: React.FC<PixelStreamViewProps> = ({
  defaultUrl = 'http://127.0.0.1:8090',
}) => {
  const [streamUrl, setStreamUrl] = useState(defaultUrl);
  const [inputUrl, setInputUrl] = useState(defaultUrl);
  const [reloadKey, setReloadKey] = useState(0);

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setStreamUrl(inputUrl.trim());
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div className="stream-wrapper">
      <div className="stream-toolbar">
        <span className="stream-badge">LIVE UE5 PIXEL STREAMING</span>
        <form onSubmit={handleApplyUrl} className="stream-url-form">
          <input
            type="text"
            className="stream-url-input"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="http://127.0.0.1:8090"
          />
          <button type="submit" className="btn-small btn-blue">
            Connect
          </button>
        </form>
      </div>

      <iframe
        key={reloadKey}
        src={streamUrl}
        title="Unreal Engine 5 Pixel Streaming"
        className="stream-iframe"
        allow="autoplay; fullscreen; microphone; camera; pointer-lock; xr-spatial-tracking; gamepad"
      />
    </div>
  );
};