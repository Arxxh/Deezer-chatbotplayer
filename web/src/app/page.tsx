import { Suspense } from 'react';
import { ChatWorkspace } from '@/modules/chat/presentation/chat-workspace';

export default function Home() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
      <ChatWorkspace />
    </Suspense>
  );
}
