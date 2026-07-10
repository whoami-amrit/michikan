import escapeLatex from 'escape-latex';
import { IResumeJson } from 'shared';

const getPublicProfileUrlLabel = (url: string) => {
  if (!url) {
    return '';
  }

  const { hostname, pathname } = new URL(url);

  return `${hostname.replace('www.', '')}${pathname}`;
};

const formatDate = (date: string) => {
  if (!date) {
    return '';
  }
  const d = new Date(date);
  const month = d.toLocaleString('default', { month: 'short' });
  const year = d.getFullYear();
  return `${month} ${year}`;
};

export const getResumeTex = (data: IResumeJson) => String.raw`
\documentclass[11pt]{article}       % set main text size
\usepackage[letterpaper,                % set paper size to letterpaper. change to a4paper for resumes outside of North America
top=0.5in,                          % specify top page margin
bottom=0.5in,                       % specify bottom page margin
left=0.5in,                         % specify left page margin
right=0.5in]{geometry}              % specify right page margin

\usepackage{XCharter}               % set font. comment this line out if you want to use the default LaTeX font Computer Modern
\usepackage[T1]{fontenc}            % output encoding
\usepackage[utf8]{inputenc}         % input encoding
\usepackage{enumitem}               % enable lists for bullet points: itemize and \item
\usepackage[hidelinks]{hyperref}    % format hyperlinks
\usepackage{titlesec}               % enable section title customization
\raggedright                        % disable text justification
\pagestyle{empty}                   % disable page numbering

% ensure PDF output will be all-Unicode and machine-readable
\input{glyphtounicode}
\pdfgentounicode=1

% format section headings: bolding, size, white space above and below
\titleformat{\section}{\bfseries\large}{}{0pt}{}[\vspace{1pt}\titlerule\vspace{-6.5pt}]

% format bullet points: size, white space above and below, white space between bullets
\renewcommand\labelitemi{$\vcenter{\hbox{\small$\bullet$}}$}
\setlist[itemize]{itemsep=-2pt, leftmargin=12pt, topsep=7pt} %%% Test various topsep values to fix vertical spacing errors

% resume starts here
\begin{document}

% name
\centerline{\Huge ${escapeLatex(data.personalInfo.name)}}

\vspace{5pt}

% contact information
\centerline{\href{mailto:${data.personalInfo.email}}{${data.personalInfo.email}} ${data.personalInfo.github ? String.raw`| \href{${data.personalInfo.github}}{${getPublicProfileUrlLabel(data.personalInfo.github)}}` : ''} ${data.personalInfo.portfolio ? String.raw`| \href{${data.personalInfo.portfolio}}{${getPublicProfileUrlLabel(data.personalInfo.portfolio)}}` : ''} ${data.personalInfo.phone ? String.raw`| ${data.personalInfo.phone}` : ''}}

\vspace{-10pt}

% summary section
${
  data.summary
    ? String.raw`
\section*{Summary}
${escapeLatex(data.summary)}
\vspace{-6.5pt}
`
    : ''
}

% skills section
${
  data.skills?.length
    ? String.raw`
\section*{Skills}
${data.skills.map((skill) => String.raw`\textbf{${escapeLatex(skill.category)}:} ${skill.skills.map((skill) => escapeLatex(skill)).join(', ')} \\`).join('\n')}
\vspace{-6.5pt}
`
    : ''
}


% experience section
${
  data.experience?.length
    ? String.raw`
\section*{Experience}
${data.experience
  .map(
    (exp) => String.raw`
\textbf{${escapeLatex(exp.title)},} {${escapeLatex(exp.company)}} ${exp.location ? `-- ${escapeLatex(exp.location)}` : ''} \hfill ${formatDate(exp.startDate)} -- ${exp.endDate ? formatDate(exp.endDate) : 'Present'} \\
\vspace{-9pt}
\begin{itemize}
  ${exp.highlights.map((highlight) => String.raw`\item ${escapeLatex(highlight)}`).join('\n  ')}
\end{itemize}
`,
  )
  .join('\n\n')}
\vspace{-18.5pt}
`
    : ''
}

% projects section
${
  data.projects?.length
    ? String.raw`
\section*{Projects}
${data.projects
  .map(
    (project) => String.raw`
\textbf{${escapeLatex(project.title)}} ${project.url ? String.raw`\hfill \href{${project.url}}{${getPublicProfileUrlLabel(project.url)}}` : ''} \\
\vspace{-9pt}
\begin{itemize}
  ${project.highlights.map((highlight) => String.raw`\item ${escapeLatex(highlight)}`).join('\n  ')}
\end{itemize}
`,
  )
  .join('\n\n')}
\vspace{-18.5pt}
`
    : ''
}

% education section
${
  data.education?.length
    ? String.raw`
\section*{Education}
${data.education
  .map(
    (edu) => String.raw`
\textbf{${escapeLatex(edu.institution)}} -- ${escapeLatex(edu.degree)} in ${escapeLatex(edu.field)} \hfill ${formatDate(edu.graduationDate)} \\
`,
  )
  .join('\n')}
\vspace{-9pt}
`
    : ''
}

\end{document}
`;
