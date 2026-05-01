import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/client/components/ui/dialog';
import { Button } from '@/client/components/ui/button';
import { Input } from '@/client/components/ui/input';
import { uploadArchive } from '@/client/lib/api';

interface UploadDialogProps {
  onSuccess?: () => void;
}

export function UploadDialog({ onSuccess }: UploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [libraryName, setLibraryName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleUpload = async () => {
    if (!libraryName.trim() || !file) return;
    setIsUploading(true);
    setErrorMsg('');
    try {
      await uploadArchive(libraryName, file);
      setOpen(false);
      setLibraryName('');
      setFile(null);
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">+ Add Library</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Library</DialogTitle>
          <DialogDescription>Upload a .4sb forScore archive to create a new library.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Library Name</label>
            <Input
              placeholder="my-library"
              value={libraryName}
              onChange={e => setLibraryName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Archive File (.4sb)</label>
            <Input
              type="file"
              accept=".4sb"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={!libraryName.trim() || !file || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
