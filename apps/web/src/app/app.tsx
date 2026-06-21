import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';

import { TooltipProvider } from '@/components/ui/tooltip';
import { MainContextProvider } from '@/lib/contexts/main/provider';
import { UserContextProvider } from '@/lib/contexts/user/provider';

import { AuthFormPage, VerifyEmailPage } from './auth';
import NewJobPage from './jobs/detail';
import JobsPage from './jobs/list';
import Layout from './layout';
import ResumesPage from './resumes/list';

const AnalysisPage = lazy(() => import('./analysis'));

const ResumeDetailPage = lazy(() => import('./resumes/detail'));

const UserPage = lazy(() => import('./user'));

function App() {
  return (
    <main>
      <Toaster />
      <MainContextProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Suspense>
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
                    <Route path="new" element={<ResumeDetailPage type="new" />} />
                    <Route path=":id" element={<ResumeDetailPage type="edit" />} />
                  </Route>
                  <Route path="user" element={<UserPage />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </MainContextProvider>
    </main>
  );
}

export default App;
