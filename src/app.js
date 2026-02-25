import { FormCard }     from './ui/components/FormCard.js';
import { InputField }   from './ui/components/InputField.js';
import { SubmitButton } from './ui/components/SubmitButton.js';

/**
 * App
 *
 * Composes the three admission form sections and all 11 candidate fields.
 * Returns the root content node — zero business logic here.
 *
 * State flow:
 *   User types → InputField dispatches → FormStateManager.setField()
 *   → FormStateManager notifies subscribers → InputField updates message node
 *   → SubmitButton reads isReady (always false in phase 1)
 *
 * @returns {HTMLElement}
 */
export function App() {
  const stack = document.createElement('div');
  stack.className = 'form-stack';

  // ── Section 1 — Candidate Identity ────────────────────────
  stack.appendChild(FormCard({
    sectionLabel: 'Section 1 of 3',
    title: 'Candidate Identity',
    children: [
      InputField({
        id:          'fullName',
        label:       'Full Name',
        type:        'text',
        placeholder: "Candidate's full legal name",
      }),
      InputField({
        id:          'email',
        label:       'Email Address',
        type:        'email',
        placeholder: 'example@domain.com',
      }),
      InputField({
        id:          'phone',
        label:       'Phone Number',
        type:        'tel',
        placeholder: '10-digit Indian mobile number',
      }),
      InputField({
        id:          'dateOfBirth',
        label:       'Date of Birth',
        type:        'date',
        placeholder: '',
      }),
      InputField({
        id:          'aadhaar',
        label:       'Aadhaar Number',
        type:        'text',
        placeholder: '12-digit Aadhaar number',
      }),
    ],
  }));

  // ── Section 2 — Academic Credentials ──────────────────────
  stack.appendChild(FormCard({
    sectionLabel: 'Section 2 of 3',
    title: 'Academic Credentials',
    children: [
      InputField({
        id:          'qualification',
        label:       'Highest Qualification',
        type:        'select',
        placeholder: 'Select qualification',
        options: [
          { value: 'ssc',       label: 'SSC (10th)'          },
          { value: 'hsc',       label: 'HSC (12th)'          },
          { value: 'diploma',   label: 'Diploma'             },
          { value: 'bachelors', label: "Bachelor's Degree"   },
          { value: 'masters',   label: "Master's Degree"     },
          { value: 'phd',       label: 'PhD / Doctorate'     },
        ],
      }),
      InputField({
        id:          'graduationYear',
        label:       'Graduation Year',
        type:        'number',
        placeholder: 'e.g. 2022',
      }),
      InputField({
        id:          'percentageOrCgpa',
        label:       'Percentage / CGPA',
        type:        'score',
      }),
      InputField({
        id:          'score',
        label:       'Screening Test Score',
        type:        'number',
        placeholder: '0 – 100',
      }),
    ],
  }));

  // ── Section 3 — Admission Decision ────────────────────────
  stack.appendChild(FormCard({
    sectionLabel: 'Section 3 of 3',
    title: 'Admission Decision',
    children: [
      InputField({
        id:          'interviewStatus',
        label:       'Interview Status',
        type:        'select',
        placeholder: 'Select interview outcome',
        options: [
          { value: 'cleared',    label: 'Cleared'    },
          { value: 'waitlisted', label: 'Waitlisted' },
          { value: 'rejected',   label: 'Rejected'   },
        ],
      }),
      InputField({
        id:    'offerLetterSent',
        label: 'Offer Letter Sent',
        type:  'toggle',
      }),
    ],
  }));

  stack.appendChild(SubmitButton());

  return stack;
}
