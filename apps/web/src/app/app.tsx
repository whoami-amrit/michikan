import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';

import { TooltipProvider } from '@/components/ui/tooltip';
import { MainContextProvider } from '@/lib/contexts/main/provider';
import { UserContextProvider } from '@/lib/contexts/user/provider';

import { AuthFormPage, VerifyEmailPage } from './auth';
import Layout from './layout';
import ResumesPage from './resumes';

const JobsPage = lazy(() => import('./jobs'));
const AnalysisPage = lazy(() => import('./analysis'));

const ResumeDetailPage = lazy(() =>
  import('./resumes').then((mod) => ({ default: mod.ResumeDetailPage })),
);
const NewResumePage = lazy(() =>
  import('./resumes').then((mod) => ({ default: mod.NewResumePage })),
);

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
                  <Route path="jobs" element={<JobsPage />} />
                  <Route path="analysis" element={<AnalysisPage />} />
                  <Route path="resumes">
                    <Route index element={<ResumesPage />} />
                    <Route path="new" element={<NewResumePage />} />
                    <Route path=":id" element={<ResumeDetailPage />} />
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
