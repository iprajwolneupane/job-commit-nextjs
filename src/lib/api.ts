import axios from 'axios'
import type {
  CreateAppliedJobValues,
  GetJobReportValues,
  LoginFormValues,
  PlatformValues,
  SignupFormValues,
  UpdateAppliedJobValues,
  appliedJobResponseValues,
} from '@/lib/schema'

export type AuthProfile = {
  id: string
  username: string
  email: string
  createdAt: string
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

export const AuthApi = {
  async me() {
    const response = await axios.get<AuthProfile>('/api/auth/me')

    return response.data
  },
  async login(values: LoginFormValues) {
    const response = await axios.post('/api/auth/login', values)

    return response.data
  },
  async register(values: SignupFormValues) {
    const response = await axios.post('/api/auth/register', values)

    return response.data
  },
  async logout() {
    const response = await axios.post('/api/auth/logout')

    return response.data
  },
}

export const AppliedJobApi = {
  async create(values: CreateAppliedJobValues) {
    const response = await axios.post('/api/applied-job', values)

    return response.data
  },
  async list(params?: AppliedJobsParams) {
    const response = await axios.get<{ appliedJobs: AppliedJob[] }>(
      '/api/applied-job',
      { params },
    )

    return response.data
  },
  async get(id: string) {
    const response = await axios.get<{ appliedJob: AppliedJob }>(
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
    const response = await axios.put<{ appliedJob: AppliedJob }>(
      `/api/applied-job/${id}`,
      values,
    )

    return response.data
  },
  async delete(id: string) {
    const response = await axios.delete(`/api/applied-job/${id}`)

    return response.data
  },
}

export const PlatformApi = {
  async list() {
    const response = await axios.get<{ platforms: Platform[] }>('/api/platform')

    return response.data
  },
  async get(id: string) {
    const response = await axios.get<{ platform: Platform }>(
      `/api/platform/${id}`,
    )

    return response.data
  },
  async create(values: PlatformValues) {
    const response = await axios.post<{ platform: Platform }>(
      '/api/platform',
      values,
    )

    return response.data
  },
  async update({ id, values }: { id: string; values: PlatformValues }) {
    const response = await axios.put<{ platform: Platform }>(
      `/api/platform/${id}`,
      values,
    )

    return response.data
  },
  async delete(id: string) {
    const response = await axios.delete(`/api/platform/${id}`)

    return response.data
  },
}

export const JobReportApi = {
  async get(values: GetJobReportValues) {
    const response = await axios.post<{ message: string }>(
      '/api/job/report',
      values,
    )

    return response.data
  },
}

export const CvApi = {
  async get() {
    const response = await axios.get<{ cv: UploadedCv }>('/api/cv')

    return response.data
  },
  async upload(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await axios.post<{ message: string; cv: UploadedCv }>(
      '/api/cv',
      formData,
    )

    return response.data
  },
}
