/**
 * CandidateModel
 *
 * Canonical field definitions for a candidate record.
 * This is the schema contract — it documents what fields exist,
 * their types, and their default values.
 *
 * FormStateManager initialises from this shape.
 * ValidationEngine will read rules keyed by these field names.
 *
 * NOTE: This is a plain data object, not a class.
 * It carries no methods and no validation logic.
 */
export const CANDIDATE_FIELDS = Object.freeze({
  fullName:         '',
  email:            '',
  phone:            '',
  dateOfBirth:      '',
  qualification:    '',
  graduationYear:   '',
  percentageOrCgpa: '',
  score:            '',
  interviewStatus:  '',
  aadhaar:          '',
  offerLetterSent:  '',
  gradingMode:      'percentage',
});
