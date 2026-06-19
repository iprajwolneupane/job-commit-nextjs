
import * as z from 'zod'

export const passwordValidation = z
  .string()
  .trim()
  .min(1, 'Please provide a password')
  .regex(new RegExp('.*[A-Z].*'), 'Must contain a uppercase character')
  .regex(new RegExp('.*[a-z].*'), 'Must contain a lowercase character')
  .regex(new RegExp('.*\\d.*'), 'Must contain a number')
  .regex(
    new RegExp('.*[`~<>?,./!@#$%^&*()\\-_+="\'|{}\\[\\];:\\\\].*'),
    'Must contain a special character',
  )
  .min(8, 'Password must be at least 8 characters')

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Please provide an email')
    .email('Invalid email address'),
  password: z.string().min(1, 'Please provide a password'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({
    username: z
      .string()
      .min(1, 'Please provide a username')
      .max(20, 'Username must be at most 20 characters'),
    email: z
      .string()
      .min(1, 'Please provide an email')
      .email('Invalid email address'),
    password: z.string().min(1, 'Please provide a password'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export type SignupFormValues = z.infer<typeof signupSchema>

export const appliedJobResponseValues = [
  'NORESPONSE',
  'REJECTED',
  'INTERVIEW',
  'SCREENINGQUESTIONS',
  'OFFER',
  'ACCEPTED',
  'NOTINTERESTED',
] as const

export const platformSchema = z.object({
  name: z.string().trim().min(1, 'Platform name is required'),
})

export const createAppliedJobSchema = z.object({
  appliedDate: z.coerce.date(),
  platformId: z.string().trim().min(1, 'Platform is required'),
  company: z.string().trim().min(1, 'Company is required'),
  position: z.string().trim().min(1, 'Position is required'),
  response: z.enum(appliedJobResponseValues).optional(),
  link: z.string().trim().min(1, 'Link is required'),
})

export const updateAppliedJobSchema = z
  .object({
    appliedDate: z.coerce.date().optional(),
    platformId: z.string().trim().min(1, 'Platform is required').optional(),
    company: z.string().trim().min(1, 'Company is required').optional(),
    position: z.string().trim().min(1, 'Position is required').optional(),
    sentMail: z.boolean().optional(),
    response: z.enum(appliedJobResponseValues).optional(),
    link: z.string().trim().min(1, 'Link is required').optional(),
  })
  .refine((values) => Object.values(values).some((value) => value !== undefined), {
    message: 'At least one field is required',
  })

export type CreateAppliedJobValues = z.infer<typeof createAppliedJobSchema>
export type UpdateAppliedJobValues = z.infer<typeof updateAppliedJobSchema>
export type PlatformValues = z.infer<typeof platformSchema>

export const getJobReportSchema = z.object({
  link: z.string().url('Invalid URL'),
});

export type GetJobReportValues = z.infer<typeof getJobReportSchema>
