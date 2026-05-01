import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/client/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/client/components/ui/select';
import { Button } from '@/client/components/ui/button';
import { Input } from '@/client/components/ui/input';
import { uploadArchive } from '@/client/lib/api';
import type { LibraryInfo } from '@/shared/types';

const NEW_LIBRARY_VALUE = '__new__';

interface UploadDialogProps {
  libraries: LibraryInfo[];
  onSuccess?: () => void;
}

export function UploadDialog({ libraries, onSuccess }: UploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState('');
  const [newLibraryName, setNewLibraryName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const effectiveName = target === NEW_LIBRARY_VALUE ? newLibraryName : target;
  const canUpload = effectiveName.trim().length > 0 && file !== null && !isUploading;

  const resetForm = () => {
    setTarget('');
    setNewLibraryName('');
    setFile(null);
    setErrorMsg('');
  };

  const handleUpload = async () => {
    if (!canUpload) return;
    setIsUploading(true);
    setErrorMsg('');
    try {
      await uploadArchive(effectiveName, file);
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">Upload</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Library</DialogTitle>
          <DialogDescription>
            Upload a .4sb forScore archive to an existing library or create a new one.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Library</label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select library..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NEW_LIBRARY_VALUE}>+ New library</SelectItem>
                {libraries.map((lib) => (
                  <SelectItem key={lib.name} value={lib.name}>
                    {lib.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {target === NEW_LIBRARY_VALUE && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Library Name</label>
              <Input
                placeholder="my-library"
                value={newLibraryName}
                onChange={(e) =>
                  setNewLibraryName(
                    e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, '-')
                      .replace(/[^a-z0-9-]/g, ''),
                  )
                }
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Archive File (.4sb)</label>
            <Input
              type="file"
              accept=".4sb"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!canUpload} onClick={handleUpload}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
