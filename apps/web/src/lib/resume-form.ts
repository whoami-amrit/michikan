import { ICreateResumeDtoInput } from 'shared';

export const NEW_RESUME_STORAGE_KEY = 'new-resume-form';
export const DEFAULT_RESUME_NAME = 'Untitled';

export const getDefaultNewResumeFormValues = (): ICreateResumeDtoInput => {
  const unsavedFormState = localStorage.getItem(NEW_RESUME_STORAGE_KEY);

  try {
    const parsed = JSON.parse(unsavedFormState!) as ICreateResumeDtoInput;
    return {
      ...parsed,
      name: parsed.name || DEFAULT_RESUME_NAME,
    };
  } catch (error) {
    if (unsavedFormState) {
      console.log(error);
    }

    return {
      name: DEFAULT_RESUME_NAME,
      json: {
        personalInfo: {
          name: '',
          email: '',
          github: '',
          phone: '',
          portfolio: '',
        },
        skills: [],
        experience: [],
        projects: [],
        education: [],
        summary: '',
      },
    };
  }
};
