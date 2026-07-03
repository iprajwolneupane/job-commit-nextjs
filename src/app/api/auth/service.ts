import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import {
  BCRYPT_SALT_ROUNDS,
  SESSION_DURATION_SECONDS,
} from '@/lib/constants'
import { prisma } from '@/lib/prisma'
import type {
  LoginFormValues,
  ProfileValues,
  SignupFormValues,
} from '@/lib/schema'

export class AuthServiceError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

function getJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new AuthServiceError('JWT_SECRET is not configured', 500)
  }

  return jwtSecret
}

function createSessionToken(user: {
  id: string
  email: string
  username: string
}) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username,
    },
    getJwtSecret(),
    { expiresIn: `${SESSION_DURATION_SECONDS}s` },
  )
}

function emptyToNull(value: string) {
  const trimmedValue = value.trim()

  return trimmedValue ? trimmedValue : null
}

export async function loginUser(values: LoginFormValues) {
  const normalizedEmail = values.email.toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      username: true,
      email: true,
      passwordHash: true,
    },
  })

  if (!user?.passwordHash) {
    throw new AuthServiceError('Invalid email or password', 401)
  }

  const isPasswordValid = await bcrypt.compare(values.password, user.passwordHash)

  if (!isPasswordValid) {
    throw new AuthServiceError('Invalid email or password', 401)
  }

  const token = createSessionToken(user)
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000)

  await prisma.session.upsert({
    where: {
      userId: user.id,
    },
    create: {
      userId: user.id,
      sessionToken: token,
      expiresAt,
    },
    update: {
      sessionToken: token,
      expiresAt,
    },
  })

  return token
}

export async function registerUser(values: SignupFormValues) {
  const normalizedEmail = values.email.toLowerCase()
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  })

  if (existingUser) {
    throw new AuthServiceError('Email is already registered', 409)
  }

  const passwordHash = await bcrypt.hash(values.password, BCRYPT_SALT_ROUNDS)
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000)

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: values.username,
          email: normalizedEmail,
          passwordHash,
          skills: [],
        },
        select: {
          id: true,
          username: true,
          email: true,
        },
      })
      const token = createSessionToken(user)

      await tx.session.create({
        data: {
          userId: user.id,
          sessionToken: token,
          expiresAt,
        },
      })

      return token
    })
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new AuthServiceError('Email is already registered', 409)
    }

    throw error
  }
}

export function deleteSessionByToken(token: string) {
  return prisma.session.deleteMany({
    where: {
      sessionToken: token,
    },
  })
}

export async function updateProfile(userId: string, values: ProfileValues) {
  try {
    return await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        username: values.username,
        email: values.email.toLowerCase(),
        linkedInUrl: emptyToNull(values.linkedInUrl),
        githubUrl: emptyToNull(values.githubUrl),
        portfolioUrl: emptyToNull(values.portfolioUrl),
        contactNumber: emptyToNull(values.contactNumber),
        skills: values.skills,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        linkedInUrl: true,
        githubUrl: true,
        portfolioUrl: true,
        contactNumber: true,
        skills: true,
      },
    })
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new AuthServiceError('Email is already registered', 409)
    }

    throw error
  }
}
