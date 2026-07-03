
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

const optionalUrlSchema = z
  .string()
  .trim()
  .refine((value) => !value || z.url().safeParse(value).success, {
    message: 'Invalid URL',
  })

const skillsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, 'Skill cannot be empty')
      .max(50, 'Skill must be at most 50 characters'),
  )
  .max(30, 'You can add up to 30 skills')
  .transform((skills) => {
    const seenSkills = new Set<string>()

    return skills.filter((skill) => {
      const key = skill.toLowerCase()

      if (seenSkills.has(key)) {
        return false
      }

      seenSkills.add(key)
      return true
    })
  })

export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Please provide a username')
    .max(20, 'Username must be at most 20 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Please provide an email')
    .email('Invalid email address'),
  linkedInUrl: optionalUrlSchema,
  githubUrl: optionalUrlSchema,
  portfolioUrl: optionalUrlSchema,
  contactNumber: z
    .string()
    .trim()
    .max(30, 'Contact number must be at most 30 characters'),
  skills: skillsSchema,
})

export type ProfileValues = z.infer<typeof profileSchema>

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

const appliedJobLinkSchema = z
  .string()
  .trim()
  .min(1, 'Link is required')
  .url('Invalid URL')

export const createAppliedJobSchema = z.object({
  appliedDate: z.coerce.date(),
  platformId: z.string().trim().min(1, 'Platform is required'),
  company: z.string().trim().min(1, 'Company is required'),
  position: z.string().trim().min(1, 'Position is required'),
  response: z.enum(appliedJobResponseValues).optional(),
  link: appliedJobLinkSchema,
})

export const updateAppliedJobSchema = z
  .object({
    appliedDate: z.coerce.date().optional(),
    platformId: z.string().trim().min(1, 'Platform is required').optional(),
    company: z.string().trim().min(1, 'Company is required').optional(),
    position: z.string().trim().min(1, 'Position is required').optional(),
    sentMail: z.boolean().optional(),
    response: z.enum(appliedJobResponseValues).optional(),
    link: appliedJobLinkSchema.optional(),
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
