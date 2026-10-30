import { z } from 'zod';

// Regras dos formularios de cadastro e login, declaradas com Zod. Cada campo
// devolve a propria mensagem, para a tela mostrar embaixo do campo certo.
// O nome de exibicao tem a mesma trava da tabela profiles (check no SQL).
export const DISPLAY_NAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 72;

const email = z.string().trim().min(1, 'Informe o e-mail.').pipe(z.email('E-mail inválido. Exemplo: nome@dominio.com'));

const password = z.string()
  .min(1, 'Informe a senha.')
  .min(PASSWORD_MIN, `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`)
  .max(PASSWORD_MAX, `A senha pode ter no máximo ${PASSWORD_MAX} caracteres.`);

// Minusculo antes de validar: "David" e "david" sao a mesma conta.
const displayName = z.string().trim().toLowerCase()
  .min(1, 'Escolha um nome de exibição.')
  .regex(DISPLAY_NAME_PATTERN, 'Use de 3 a 20 letras minúsculas, números ou "_" (sem espaços nem acentos).');

// Quem tem conta antiga entra com o nome de usuario; quem criou agora, com o e-mail.
const identifier = z.string().trim().min(1, 'Informe o e-mail ou o usuário.');

export const loginSchema = z.object({
  identifier,
  password: z.string().min(1, 'Informe a senha.'),
});

export const registerSchema = z.object({
  email,
  displayName,
  password,
  confirmPassword: z.string().min(1, 'Repita a senha.'),
}).refine((values) => values.password === values.confirmPassword, {
  path: ['confirmPassword'],
  message: 'As senhas não são iguais.',
});

// Roda o esquema. Devolve { data } com os valores ja limpos (sem espacos, em
// minusculo) ou { errors } com uma mensagem por campo (a primeira de cada um).
export function validate(schema, values) {
  const result = schema.safeParse(values);
  if (result.success) return { data: result.data, errors: null };
  const errors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] ?? 'form';
    if (!(field in errors)) errors[field] = issue.message;
  }
  return { data: null, errors };
}
