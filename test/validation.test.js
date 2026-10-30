import test from 'node:test';
import assert from 'node:assert/strict';
import { loginSchema, registerSchema, validate } from '../src/utils/validation.js';

const valid = { email: ' Ana@Exemplo.com ', displayName: ' Ana_01 ', password: 'segredo1', confirmPassword: 'segredo1' };

test('zod: cadastro valido devolve os valores limpos (e-mail sem espacos, nome em minusculo)', () => {
  const { data, errors } = validate(registerSchema, valid);
  assert.equal(errors, null);
  assert.equal(data.email, 'Ana@Exemplo.com');
  assert.equal(data.displayName, 'ana_01');
});

test('zod: cada campo recebe a propria mensagem', () => {
  const { errors } = validate(registerSchema, { email: 'sem-arroba', displayName: 'a', password: '123', confirmPassword: '' });
  assert.match(errors.email, /E-mail inválido/);
  assert.match(errors.displayName, /3 a 20/);
  assert.match(errors.password, /pelo menos 6/);
  assert.match(errors.confirmPassword, /Repita/);
});

test('zod: campos vazios pedem o que falta', () => {
  const { errors } = validate(registerSchema, { email: '', displayName: '', password: '', confirmPassword: '' });
  assert.match(errors.email, /Informe o e-mail/);
  assert.match(errors.displayName, /Escolha/);
  assert.match(errors.password, /Informe a senha/);
});

test('zod: nome de exibicao recusa espaco, acento e simbolo, aceita _ e numero', () => {
  for (const bad of ['ana maria', 'joão', 'ana!', 'ab', 'a'.repeat(21)]) {
    assert.ok(validate(registerSchema, { ...valid, displayName: bad }).errors?.displayName, bad);
  }
  for (const good of ['ana', 'ana_99', 'ABC', 'a'.repeat(20)]) {
    assert.equal(validate(registerSchema, { ...valid, displayName: good }).errors, null, good);
  }
});

test('zod: senhas diferentes marcam so o campo de confirmacao', () => {
  const { errors } = validate(registerSchema, { ...valid, confirmPassword: 'outra123' });
  assert.deepEqual(Object.keys(errors), ['confirmPassword']);
  assert.match(errors.confirmPassword, /não são iguais/);
});

test('zod: login pede identificador e senha; aceita e-mail ou usuario antigo', () => {
  assert.equal(validate(loginSchema, { identifier: 'ana@exemplo.com', password: 'x' }).errors, null);
  assert.equal(validate(loginSchema, { identifier: 'ana_01', password: 'x' }).errors, null);
  const { errors } = validate(loginSchema, { identifier: '  ', password: '' });
  assert.match(errors.identifier, /e-mail ou o usuário/);
  assert.match(errors.password, /Informe a senha/);
});
