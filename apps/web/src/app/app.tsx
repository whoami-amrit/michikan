import { CircleAlert, RotateCwIcon } from 'lucide-react';
import { ErrorBoundary, getErrorMessage } from 'react-error-boundary';
import { BrowserRouter, Route, Routes } from 'react-router';
import { useSWRConfig } from 'swr';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Toaster } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MainContextProvider } from '@/lib/contexts/main/provider';
import { UserContextProvider } from '@/lib/contexts/user/provider';

import ReportPage from './analysis/detail.tsx';
import AnalysisPage from './analysis/list.tsx';
import { AuthFormPage, VerifyEmailPage } from './auth';
import { JobDetailPage } from './jobs/detail';
import JobsPage from './jobs/list';
import { NewJobPage } from './jobs/new';
import Layout from './layout';
import { ResumeDetailPage } from './resumes/detail';
import ResumesPage from './resumes/list';
import { NewResumePage } from './resumes/new';

function App() {
  const { mutate } = useSWRConfig();

  return (
    <main>
      <Toaster />
      <ErrorBoundary
        fallbackRender={({ resetErrorBoundary, error }) => (
          <Empty className="h-screen">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleAlert />
              </EmptyMedia>
              <EmptyTitle>Something went wrong :/</EmptyTitle>
              <EmptyDescription>
                {getErrorMessage(error)}
                <br />
                Rest assured we are working on fixing this.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                onClick={() => {
                  resetErrorBoundary();
                  void mutate(() => true, undefined, { revalidate: false });
                }}
                variant="outline"
                size="sm"
              >
                <RotateCwIcon />
                Retry
              </Button>
            </EmptyContent>
          </Empty>
        )}
      >
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
                    <Route path=":id" element={<JobDetailPage />} />
                  </Route>
                  <Route path="analysis">
                    <Route index element={<AnalysisPage />} />
                    <Route path=":id" element={<ReportPage />} />
                  </Route>
                  <Route path="resumes">
                    <Route index element={<ResumesPage />} />
                    <Route path="new" element={<NewResumePage />} />
                    <Route path=":id" element={<ResumeDetailPage />} />
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
