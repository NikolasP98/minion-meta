import { describe, expect, it } from 'vitest';
import {
  ageFromDob,
  canonicalSex,
  dniNameMatches,
  formatRegistryName,
  isDni8,
  nameTokens,
  parseDob,
  type PerudevsPerson,
} from './dni.js';

const person = (over: Partial<PerudevsPerson> = {}): PerudevsPerson => ({
  id: '60525600',
  nombres: 'NIKOLAS SEBASTIAN',
  apellido_paterno: 'PINON',
  apellido_materno: 'SARRIA',
  nombre_completo: 'NIKOLAS SEBASTIAN PINON SARRIA',
  genero: 'M',
  fecha_nacimiento: '12/11/1998',
  codigo_verificacion: '2',
  ...over,
});

describe('isDni8', () => {
  it('accepts exactly 8 digits', () => {
    expect(isDni8('60525600')).toBe(true);
    expect(isDni8('0952531')).toBe(false);
    expect(isDni8('123456789')).toBe(false);
    expect(isDni8('1234567a')).toBe(false);
    expect(isDni8(null)).toBe(false);
  });
});

describe('nameTokens', () => {
  it('normalizes accents, case, punctuation (Ñ folds to N like the registry does)', () => {
    expect(nameTokens('Piñón  Sarría, Nikolas')).toEqual(['PINON', 'SARRIA', 'NIKOLAS']);
  });
});

describe('dniNameMatches', () => {
  it('matches SUSII order (PATERNO MATERNO NOMBRES)', () => {
    expect(dniNameMatches('PINON SARRIA NIKOLAS SEBASTIAN', person())).toBe(true);
  });
  it('matches short party name that is a subset of the registry name', () => {
    expect(dniNameMatches('Nikolas Pinon', person())).toBe(true);
    expect(dniNameMatches('Carla', person({
      nombres: 'CARLA CRISTINA', apellido_paterno: 'SARRIA', apellido_materno: 'COLLANTES',
      nombre_completo: 'CARLA CRISTINA SARRIA COLLANTES',
    }))).toBe(true);
  });
  it('rejects a different person', () => {
    expect(dniNameMatches('MAZA LUCAS ROXANA ROCIO', person())).toBe(false);
    expect(dniNameMatches('', person())).toBe(false);
  });
});

describe('formatRegistryName', () => {
  it('builds FIRST SECOND LAST LAST2 from parts, not nombre_completo order', () => {
    expect(formatRegistryName(person())).toBe('NIKOLAS SEBASTIAN PINON SARRIA');
    expect(
      formatRegistryName({ nombres: 'CARLA CRISTINA', apellido_paterno: 'SARRIA', apellido_materno: 'COLLANTES' }),
    ).toBe('CARLA CRISTINA SARRIA COLLANTES');
  });
  it('collapses whitespace and drops missing parts', () => {
    expect(formatRegistryName({ nombres: 'ANA', apellido_paterno: 'ROJAS', apellido_materno: '' })).toBe('ANA ROJAS');
    expect(formatRegistryName({ nombres: '', apellido_paterno: '', apellido_materno: '' })).toBeNull();
  });
});

describe('canonicalSex', () => {
  it('keeps M/F canonical and rejects anything else', () => {
    expect(canonicalSex('M')).toBe('M');
    expect(canonicalSex('f')).toBe('F');
    expect(canonicalSex('Mujer')).toBeNull();
    expect(canonicalSex(null)).toBeNull();
  });
});

describe('parseDob / ageFromDob', () => {
  it('parses dd/mm/yyyy', () => {
    expect(parseDob('12/11/1998')).toBe('1998-11-12');
    expect(parseDob('bogus')).toBeNull();
  });
  it('computes age around birthdays', () => {
    const now = new Date('2026-07-15T12:00:00Z');
    expect(ageFromDob('1998-11-12', now)).toBe(27);
    expect(ageFromDob('1998-07-15', now)).toBe(28);
    expect(ageFromDob(null, now)).toBeNull();
  });
});
