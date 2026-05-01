import { expect, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

expect.extend(matchers);

// @testing-library/react auto-cleanup requires afterEach to be globally
// available. Since globals:true is not set, we wire it explicitly here.
afterEach(() => { cleanup(); });
