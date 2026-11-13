import { XIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'resume-analysis-rebuilt-notice-dismissed';

const isDismissed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

export function AnalysisRebuiltNotice() {
  const [dismissed, setDismissed] = useState(isDismissed);

  if (dismissed) {
    return null;
  }

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {}
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-2 rounded-lg border bg-background p-4 shadow-lg"
    >
      <p className="text-sm">
        Resume analysis has been rebuilt. Run it again to see your new score.
      </p>
      <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={dismiss}>
        <XIcon />
      </Button>
    </div>
  );
}
