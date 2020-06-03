import { isArray, isEqual } from 'lodash/fp';
import { isFunction, isRegExp, isString } from 'util';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deepDataMatcher(data: any, pattern: any, path = 'ROOT'): string[] {
  const errors = [] as string[];
  if (typeof pattern == 'object' && pattern && data) {
    // either object or array
    for (const key in pattern) {
      if (!`${key}`.startsWith('_')) {
        // ignore private properties
        const current = data[key];
        const should = pattern[key];
        const propertyPath = isArray(pattern) ? `${path}[${key}]` : `${path}.${key}`;
        if (isRegExp(should)) {
          (isString(current) && should.test(current)) ||
            errors.push(`${propertyPath} : ${JSON.stringify(current)} does not satisfy ${should} `);
        } else if (isFunction(should)) {
          should(current) ||
            errors.push(`${propertyPath} : ${JSON.stringify(current)} does not satisfy matcher ${should} `);
        } else if (isArray(should) && !isArray(current)) {
          errors.push(`${propertyPath} : ${JSON.stringify(current)} is not an array`);
        } else {
          if (isArray(should) && isArray(current) && should.length !== current.length) {
            errors.push(`${propertyPath} : ${JSON.stringify(current)} expected length ${should.length}`);
          }
          errors.push(...deepDataMatcher(current, should, propertyPath));
        }
      }
    }
  } else {
    isEqual(data, pattern) || errors.push(`${path} : ${JSON.stringify(data)}  expected: ${JSON.stringify(pattern)}`);
  }
  return errors;
}

export function isValidEthereumAddress(str: string) {
  return str && str.startsWith('0x') && str.length == '0x5cd0D270C30EDa5ADa6b45a5289AFF1D425759b3'.length;
}

export function isValidImageVersion(str: string) {
  return str && str.startsWith('v') && str.split('.').length == 3;
}

export function isValidTimeRef(str: string) {
  return str && parseInt(str) > 1400000000;
}

export function isValidBlock(str: string) {
  return str && parseInt(str) > 0;
}
