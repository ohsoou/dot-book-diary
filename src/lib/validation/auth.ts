import { z } from 'zod'

export const emailSchema = z.string().email('올바른 이메일 형식이 아니에요')

export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 8자 이상이어야 해요')
  .regex(/[a-zA-Z]/, '영문자를 포함해야 해요')
  .regex(/[0-9]/, '숫자를 포함해야 해요')

export const nicknameSchema = z
  .string()
  .min(1, '닉네임을 입력해 주세요')
  .max(30, '닉네임은 30자 이하여야 해요')
  .trim()
  .min(1, '닉네임을 입력해 주세요')

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nickname: nicknameSchema,
})

export type SignUpInput = z.infer<typeof signUpSchema>
