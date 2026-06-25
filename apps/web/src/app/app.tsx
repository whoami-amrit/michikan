import { CircleAlert, RotateCwIcon } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MainContextProvider } from '@/lib/contexts/main/provider';
import { UserContextProvider } from '@/lib/contexts/user/provider';

import AnalysisPage from './analysis';
import { AuthFormPage, VerifyEmailPage } from './auth';
import NewJobPage from './jobs/detail';
import JobsPage from './jobs/list';
import Layout from './layout';
import { EditResumePage } from './resumes/edit';
import ResumesPage from './resumes/list';
import { NewResumePage } from './resumes/new';

function App() {
  return (
    <main>
      <ErrorBoundary
        fallbackRender={({ resetErrorBoundary }) => (
          <Empty className="h-screen">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleAlert />
              </EmptyMedia>
              <EmptyTitle>Something went wrong :/</EmptyTitle>
              <EmptyDescription>Rest assured we are working on fixing this.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={resetErrorBoundary} variant="outline" size="sm">
                <RotateCwIcon />
                Retry
              </Button>
            </EmptyContent>
          </Empty>
        )}
      >
        <Toaster />
        <MainContextProvider>
          <TooltipProvider>
            <BrowserRouter>
              <Routes>
                <Route>
                  <Route path="/signup" element={<AuthFormPage type="signup" />} />
                  <Route index path="/login" element={<AuthFormPage type="login" />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                </Route>
                <Route
                  element={
                    <UserContextProvider>
                      <Layout />
                    </UserContextProvider>
                  }
                >
                  <Route path="jobs">
                    <Route index element={<JobsPage />} />
                    <Route path="new" element={<NewJobPage />} />
                  </Route>
                  <Route path="analysis" element={<AnalysisPage />} />
                  <Route path="resumes">
                    <Route index element={<ResumesPage />} />
                    <Route path="new" element={<NewResumePage />} />
                    <Route path=":id" element={<EditResumePage />} />
                  </Route>
                </Route>
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </MainContextProvider>
      </ErrorBoundary>
    </main>
  );
}

export default App;
