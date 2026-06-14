import axios from 'axios'
import type {
  CreateAppliedJobValues,
  LoginFormValues,
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

export type AppliedJob = {
  id: string
  userId: string
  appliedDate: string
  platform: string
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

export const AuthService = {
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
  async createAppliedJob(values: CreateAppliedJobValues) {
    const response = await axios.post('/api/applied-job', values)

    return response.data
  },
  async getAppliedJobs(params?: AppliedJobsParams) {
    const response = await axios.get<{ appliedJobs: AppliedJob[] }>(
      '/api/applied-job',
      { params },
    )

    return response.data
  },
  async getAppliedJob(id: string) {
    const response = await axios.get<{ appliedJob: AppliedJob }>(
      `/api/applied-job/${id}`,
    )

    return response.data
  },
  async updateAppliedJob({
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
  async deleteAppliedJob(id: string) {
    const response = await axios.delete(`/api/applied-job/${id}`)

    return response.data
  },
}
