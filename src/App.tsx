import React, { useState, useEffect } from 'react';
import {
  Search,
  Clipboard,
  X,
  Disc,
  AlertCircle,
  Loader2,
  Music2,
  Sliders,
  Layers,
  History,
  BookOpen,
  Radio,
  Sparkles,
  Download,
} from 'lucide-react';
import { TrackData, RemasterMode, DownloadHistoryItem } from './types';
import { fetchJson } from './utils/api';
import { WaveformPlayer } from './components/WaveformPlayer';
import { BatchDownloader } from './components/BatchDownloader';
import { DownloadHistory } from './components/DownloadHistory';
import { MusicCreatorGuide } from './components/MusicCreatorGuide';

export default function App() {
  const [activeTab, setActiveTab] = useState<'player' | 'batch' | 'history' | 'guide'>('player');
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<TrackData | null>(null);
  const [remasterMode, setRemasterMode] = useState<RemasterMode>('balanced');

  // Audio trimming state
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 0]);
  const [isTrimmingActive, setIsTrimmingActive] = useState(false);

  // Download History state backed by localStorage
  const [history, setHistory] = useState<DownloadHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('musiccreator_dl_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const saveHistoryItem = (item: DownloadHistoryItem) => {
    setHistory((prev) => {
      const updated = [item, ...prev.filter((i) => i.id !== item.id)].slice(0, 50);
      try {
        localStorage.setItem('musiccreator_dl_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('musiccreator_dl_history');
    } catch {}
  };

  const handleRemoveHistoryItem = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      try {
        localStorage.setItem('musiccreator_dl_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleReDownload = (item: DownloadHistoryItem) => {
    extractTrack(item.audioUrl);
    setActiveTab('player');
  };

  // Auto-load default track on initial mount so player is immediately populated with interactive audio
  useEffect(() => {
    extractTrack('https://musiccreator.ai/track/love-is-gone-acoustic-cover');
  }, []);

  const extractTrack = async (urlToFetch: string) => {
    const trimmed = urlToFetch.trim();
    if (!trimmed) {
      setErrorMessage('Vui lòng nhập hoặc dán một đường dẫn liên kết bài hát từ Suno, OpenMusic, MusicCreator hoặc FreeMusic.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchJson('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      setCurrentTrack(data);
      setTrimRange([0, data.duration || 140]);
      setIsTrimmingActive(false);
      setActiveTab('player');
    } catch (err: any) {
      console.error('Extract error:', err);
      setErrorMessage(
        err.message || 'Lỗi khi trích xuất dữ liệu âm thanh từ server. Vui lòng kiểm tra lại đường dẫn.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputUrl(text);
          extractTrack(text);
        }
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  };

  const handleClear = () => {
    setInputUrl('');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white flex flex-col font-sans antialiased">
      {/* 1-Row, 3-Zone Top Bar following Top Bar Contract */}
      <header className="border-b border-slate-900 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-teal-400 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
              <Disc className="w-5 h-5 text-white animate-spin-slow" />
            </div>
            <a href="/" className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 hover:text-white transition-colors">
              SoundWave Studio
            </a>
          </div>

          {/* Zone 2: Navigation Links (Single-Line Segmented Control) */}
          <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('player')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'player'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Trình phát &amp; Xử lý</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'batch'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tải hàng loạt</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 relative ${
                activeTab === 'history'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Lịch sử tải</span>
              {history.length > 0 && (
                <span className="ml-1 text-[10px] font-mono font-semibold text-sky-400">
                  ({history.length})
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'guide'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Cách lấy link</span>
            </button>
          </nav>

          {/* Zone 3: Actions & Source Code Download */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/audio-studio-pro-source.zip"
              download="audio-studio-pro-source.zip"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-slate-800 hover:border-sky-500/40 transition-colors shadow-sm"
              title="Tải về trọn bộ mã nguồn mới nhất (.zip)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải Code (ZIP)</span>
              <span className="sm:hidden">ZIP</span>
            </a>
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Master 320k / WAV</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'player' && (
          <>
            {/* Centerpiece Modern URL Command Bar */}
            <section className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-2 text-slate-300 font-medium">
                  <Radio className="w-4 h-4 text-sky-400" />
                  <span>Dán đường dẫn bài hát để trích xuất âm thanh chất lượng phòng thu:</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                  <span className="text-purple-400">Suno AI</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-teal-400">OpenMusic</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-sky-400">MusicCreator</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-emerald-400">FreeMusic</span>
                </div>
              </div>

              {/* Input Form with High-Intent Action Button */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  extractTrack(inputUrl);
                }}
                className="relative flex items-center bg-slate-950/90 border border-slate-800 rounded-xl p-1.5 shadow-inner focus-within:border-sky-500/80 focus-within:ring-2 focus-within:ring-sky-500/20 transition-all"
              >
                <div className="pl-3 pr-2 text-slate-500">
                  <Search className="w-4 h-4" />
                </div>

                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="Dán link bài hát (VD: https://suno.com/song/..., https://musiccreator.ai/track/..., openmusic.ai)..."
                  className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none py-1.5"
                />

                <div className="flex items-center gap-1.5 shrink-0 pr-1">
                  {inputUrl && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors"
                      title="Xóa link"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handlePaste}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700/60"
                    title="Dán nhanh từ Clipboard"
                  >
                    <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">Dán link</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all disabled:opacity-50 active:scale-95 whitespace-nowrap shrink-0"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <Music2 className="w-3.5 h-3.5" />
                        <span>Trích xuất âm thanh</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* Loading Indicator */}
            {isLoading && (
              <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-200">Đang phân tích liên kết và kết nối luồng phát...</p>
                <p className="text-xs text-slate-400">Trích xuất phổ sóng âm, đo BPM, Tone chuẩn và chuẩn bị bộ phát</p>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-4 bg-rose-950/70 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => extractTrack(inputUrl || 'https://musiccreator.ai/track/love-is-gone-acoustic-cover')}
                  className="px-3 py-1 bg-rose-900/80 hover:bg-rose-800 text-rose-100 font-semibold rounded-lg shrink-0 transition-colors"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Player Component */}
            {currentTrack && (
              <section className="transition-opacity duration-300">
                <WaveformPlayer
                  audioUrl={currentTrack.audioUrl}
                  title={currentTrack.title}
                  artist={currentTrack.artist}
                  coverUrl={currentTrack.coverUrl}
                  platformName={currentTrack.platformName}
                  genre={currentTrack.genre}
                  duration={currentTrack.duration}
                  bpm={currentTrack.bpm}
                  musicalKey={currentTrack.musicalKey}
                  remasterMode={remasterMode}
                  onRemasterChange={setRemasterMode}
                  trimRange={trimRange}
                  onTrimChange={setTrimRange}
                  isTrimmingActive={isTrimmingActive}
                  onToggleTrimming={() => setIsTrimmingActive(!isTrimmingActive)}
                  onSaveHistory={saveHistoryItem}
                />
              </section>
            )}
          </>
        )}

        {activeTab === 'batch' && (
          <section className="transition-opacity duration-300">
            <BatchDownloader
              onSelectTrack={(track) => {
                setCurrentTrack(track);
                setTrimRange([0, track.duration || 140]);
                setIsTrimmingActive(false);
                setActiveTab('player');
              }}
            />
          </section>
        )}

        {activeTab === 'history' && (
          <section className="transition-opacity duration-300">
            <DownloadHistory
              history={history}
              onClearHistory={handleClearHistory}
              onRemoveItem={handleRemoveHistoryItem}
              onReDownload={handleReDownload}
            />
          </section>
        )}

        {activeTab === 'guide' && (
          <section className="transition-opacity duration-300">
            <MusicCreatorGuide />
          </section>
        )}
      </main>

      {/* Clean Studio Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 text-center text-xs text-slate-500">
        <p>Hỗ trợ trích xuất &amp; tải định dạng M4A AAC · MP3 (128kbps &amp; 320kbps) · WAV (16-bit &amp; 24-bit Lossless Studio Master)</p>
      </footer>
    </div>
  );
}
