import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mic, Pencil, Trash2, Upload, Loader2 } from 'lucide-react';
import {
  createVoiceProfile,
  deleteVoiceProfile,
  fetchVoiceProfiles,
  renameVoiceProfile,
  type VoiceProfile,
} from '../api/voiceProfiles';
import ConfirmDialog from '../components/ConfirmDialog';

export default function VoiceLibrary() {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VoiceProfile | null>(null);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchVoiceProfiles();
      setProfiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load voices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const profile = await createVoiceProfile(file);
      setProfiles((prev) => [profile, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save voice');
    } finally {
      setUploading(false);
    }
  };

  const handleRename = async (id: number) => {
    const name = renameValue.trim();
    if (!name) return;
    try {
      const updated = await renameVoiceProfile(id, name);
      setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setRenamingId(null);
      setRenameValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename voice');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteVoiceProfile(deleteTarget.id);
      setProfiles((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete voice');
    }
  };

  return (
    <div className="p-8 md:p-12 max-w-3xl mx-auto">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Voice Library</h1>
          <p className="text-gray-400 text-sm">
            Saved cloned voices you can reuse in Voice Clone Studio without re-uploading a sample.
          </p>
        </div>
        <Link
          to="/voice-clone"
          className="text-sm text-brand hover:text-brand-hover transition"
        >
          Open Voice Clone Studio →
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-none text-sm">
          {error}
        </div>
      )}

      <label className="mb-6 flex items-center justify-center gap-2 bg-cardBg  border border-dashed border-borderDark rounded-none p-5 cursor-pointer hover:border-brand/50 transition">
        <input
          type="file"
          accept="audio/*"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = '';
          }}
        />
        {uploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
            <span className="text-sm text-gray-300">Saving voice...</span>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 text-brand" />
            <span className="text-sm text-gray-300">Upload and save a new voice sample</span>
          </>
        )}
      </label>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading voices...
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm">
          No saved voices yet. Clone a voice in the studio and save it, or upload a sample above.
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-cardBg  border border-borderDark rounded-none p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-none bg-brand/20 flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5 text-brand" />
              </div>

              <div className="flex-1 min-w-0">
                {renamingId === profile.id ? (
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(profile.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    className="w-full bg-black/30 border border-borderDark rounded-none px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    autoFocus
                  />
                ) : (
                  <>
                    <div className="text-white font-medium truncate">{profile.name}</div>
                    <div className="text-xs text-gray-500">
                      Saved {new Date(profile.created_at).toLocaleDateString()}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {renamingId === profile.id ? (
                  <button
                    onClick={() => handleRename(profile.id)}
                    className="px-3 py-1.5 text-xs rounded-none bg-brand text-white hover:bg-brand-hover transition"
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setRenamingId(profile.id);
                      setRenameValue(profile.name);
                    }}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-none transition"
                    title="Rename"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setDeleteTarget(profile)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-none transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete voice?"
        message={`Delete "${deleteTarget?.name}"? Existing audio generated with this voice will keep playing; you won't be able to use it for new generations.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}


