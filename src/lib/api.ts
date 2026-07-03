import axios from 'axios'
import type {
  CreateAppliedJobValues,
  GetJobReportValues,
  LoginFormValues,
  PlatformValues,
  ProfileValues,
  SignupFormValues,
  UpdateAppliedJobValues,
  appliedJobResponseValues,
} from '@/lib/schema'

const apiClient = axios.create()
const AUTH_ERROR_IGNORED_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/logout',
])

let unauthorizedLogoutPromise: Promise<void> | null = null

function isIgnoredAuthPath(url?: string) {
  if (!url) return false

  return AUTH_ERROR_IGNORED_PATHS.has(url.split('?')[0])
}

function redirectToLogin() {
  if (typeof window === 'undefined') return

  if (window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

async function handleUnauthorizedResponse() {
  if (typeof window === 'undefined') return

  unauthorizedLogoutPromise ??= fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
    .catch(() => {
      // The redirect is still useful even if the cleanup request fails.
    })
    .then(() => {
      redirectToLogin()
    })
    .finally(() => {
      unauthorizedLogoutPromise = null
    })

  await unauthorizedLogoutPromise
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !isIgnoredAuthPath(error.config?.url)
    ) {
      await handleUnauthorizedResponse()
    }

    return Promise.reject(error)
  },
)

export type AuthProfile = {
  id: string
  username: string
  email: string
  createdAt: string
  linkedInUrl: string | null
  githubUrl: string | null
  portfolioUrl: string | null
  contactNumber: string | null
  skills: string[]
}

export type Platform = {
  id: string
  userId: string
  name: string
  createdAt: string
  updatedAt: string
  _count?: {
    appliedJobs: number
  }
}

export type AppliedJob = {
  id: string
  userId: string
  platformId: string
  appliedDate: string
  platform: Platform
  company: string
  position: string
  sendMailAt: string
  sentMail: boolean
  response: (typeof appliedJobResponseValues)[number]
  link: string
  hasEmailData: boolean
}

export type AppliedJobsParams = {
  fromDate?: string
  toDate?: string
  query?: string
  response?: AppliedJob['response'] | 'ALL'
}

export type UploadedCv = {
  exists: boolean
  url: string | null
  filename: string | null
  size: number | null
  updatedAt: string | null
  documentCount: number
}

export type SkillMatchReport = {
  rating: 0 | 1 | 2 | 3 | 4 | 5
  summary: string
  matchedSkills: string[]
  missingSkills: string[]
  tips: string[]
}

export const AuthApi = {
  async me() {
    const response = await apiClient.get<AuthProfile>('/api/auth/me')

    return response.data
  },
  async login(values: LoginFormValues) {
    const response = await apiClient.post('/api/auth/login', values)

    return response.data
  },
  async register(values: SignupFormValues) {
    const response = await apiClient.post('/api/auth/register', values)

    return response.data
  },
  async logout() {
    const response = await apiClient.post('/api/auth/logout')

    return response.data
  },
  async updateProfile(values: ProfileValues) {
    const response = await apiClient.put<{
      message: string
      profile: AuthProfile
    }>('/api/auth/profile', values)

    return response.data
  },
}

export const AppliedJobApi = {
  async create(values: CreateAppliedJobValues) {
    const response = await apiClient.post('/api/applied-job', values)

    return response.data
  },
  async list(params?: AppliedJobsParams) {
    const response = await apiClient.get<{ appliedJobs: AppliedJob[] }>(
      '/api/applied-job',
      { params },
    )

    return response.data
  },
  async get(id: string) {
    const response = await apiClient.get<{ appliedJob: AppliedJob }>(
      `/api/applied-job/${id}`,
    )

    return response.data
  },
  async update({
    id,
    values,
  }: {
    id: string
    values: UpdateAppliedJobValues
  }) {
    const response = await apiClient.put<{ appliedJob: AppliedJob }>(
      `/api/applied-job/${id}`,
      values,
    )

    return response.data
  },
  async delete(id: string) {
    const response = await apiClient.delete(`/api/applied-job/${id}`)

    return response.data
  },
  async generate(id: string, init?: RequestInit) {
    const response = await fetch(`/api/applied-job/${id}/generate`, init)

    if (response.status === 401) {
      await handleUnauthorizedResponse()
    }

    return response
  },
}

export const PlatformApi = {
  async list() {
    const response =
      await apiClient.get<{ platforms: Platform[] }>('/api/platform')

    return response.data
  },
  async get(id: string) {
    const response = await apiClient.get<{ platform: Platform }>(
      `/api/platform/${id}`,
    )

    return response.data
  },
  async create(values: PlatformValues) {
    const response = await apiClient.post<{ platform: Platform }>(
      '/api/platform',
      values,
    )

    return response.data
  },
  async update({ id, values }: { id: string; values: PlatformValues }) {
    const response = await apiClient.put<{ platform: Platform }>(
      `/api/platform/${id}`,
      values,
    )

    return response.data
  },
  async delete(id: string) {
    const response = await apiClient.delete(`/api/platform/${id}`)

    return response.data
  },
}

export const JobReportApi = {
  async get(values: GetJobReportValues) {
    const response = await apiClient.post<{
      message: string
      report: SkillMatchReport
      title: string
    }>(
      '/api/job/report',
      values,
    )

    return response.data
  },
}

export const CvApi = {
  async get() {
    const response = await apiClient.get<{ cv: UploadedCv }>('/api/cv')

    return response.data
  },
  async upload(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<{
      message: string
      cv: UploadedCv
      profile: AuthProfile | null
    }>('/api/cv', formData)

    return response.data
  },
  async refillProfile() {
    const response = await apiClient.put<{
      message: string
      profile: AuthProfile
    }>('/api/cv')

    return response.data
  },
}
