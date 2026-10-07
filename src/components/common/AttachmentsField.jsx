import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { Paperclip, Download, Trash2, FileText, Loader2 } from 'lucide-react';

// Reusable private file attachment field. Files are uploaded via
// UploadPrivateFile and stored as file_uri references on the parent entity.
// Downloads use a time-limited signed URL. All files remain private to the
// authenticated user (entity RLS enforces owner-only access).
export default function AttachmentsField({ attachments = [], onChange, label = 'Supporting Documents' }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = [];
      for (const file of files) {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        uploaded.push({
          name: file.name,
          file_uri,
          uploaded_date: new Date().toISOString().slice(0, 10),
        });
      }
      onChange([...(attachments || []), ...uploaded]);
    } catch (err) {
      setError('Could not upload file. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (att) => {
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: att.file_uri });
      window.open(signed_url, '_blank');
    } catch (err) {
      setError('Could not open file. Please try again.');
    }
  };

  const handleRemove = (idx) => {
    onChange((attachments || []).filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <Label>{label} <span className="text-muted-foreground font-normal">(optional)</span></Label>
      <p className="text-xs text-muted-foreground">Upload renewal documents, policy documents, quotes, contracts or supporting records. Files are private to you.</p>

      {attachments && attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm flex-1 truncate">{att.name}</span>
              <button type="button" onClick={() => handleDownload(att)} className="p-1 hover:bg-muted rounded transition-colors" title="Download">
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button type="button" onClick={() => handleRemove(idx)} className="p-1 hover:bg-muted rounded transition-colors" title="Remove">
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-sm font-medium cursor-pointer transition-colors hover:bg-muted/50 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
        <input type="file" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        {uploading ? 'Uploading…' : 'Add files'}
      </label>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}