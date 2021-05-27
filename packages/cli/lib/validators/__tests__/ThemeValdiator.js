const fs = require('fs');
const path = require('path');

const ThemeValidator = require('../../validators/marketplaceValidators/theme/ThemeValidator');
const { VALIDATION_RESULT } = require('../../validators/constants');

jest.mock('fs');
jest.mock('path');

describe('validators/marketplaceValidators/theme/ThemeValidator', () => {
  it('returns error if no theme.json file exists', async () => {
    const validationErrors = ThemeValidator.validate('dirName', [
      'someFile.html',
    ]);
    expect(validationErrors.length).toBe(1);
    expect(validationErrors[0].result).toBe(VALIDATION_RESULT.FATAL);
  });

  it('returns error if theme.json file has invalid json', async () => {
    fs.readFileSync.mockReturnValue('{} bad json }');

    const validationErrors = ThemeValidator.validate('dirName', ['theme.json']);
    expect(validationErrors.length).toBe(1);
    expect(validationErrors[0].result).toBe(VALIDATION_RESULT.FATAL);
  });

  it('returns error if theme.json file is missing a label field', async () => {
    fs.readFileSync.mockReturnValue('{ "screenshot_path": "./relative/path" }');

    const validationErrors = ThemeValidator.validate('dirName', ['theme.json']);
    expect(validationErrors.length).toBe(1);
    expect(validationErrors[0].result).toBe(VALIDATION_RESULT.FATAL);
  });

  it('returns error if theme.json has screenshot path that is non-relative', async () => {
    fs.readFileSync.mockReturnValue(
      '{ "label": "yay", "screenshot_path": "/absolute/path" }'
    );

    const validationErrors = ThemeValidator.validate('dirName', ['theme.json']);
    expect(validationErrors.length).toBe(1);
    expect(validationErrors[0].result).toBe(VALIDATION_RESULT.FATAL);
  });

  it('returns error if theme.json has screenshot path that does not resolve', async () => {
    fs.readFileSync.mockReturnValue(
      '{ "label": "yay", "screenshot_path": "/absolute/path" }'
    );
    path.relative.mockReturnValue('theme.json');
    fs.existsSync.mockReturnValue(false);

    const validationErrors = ThemeValidator.validate('dirName', ['theme.json']);
    expect(validationErrors.length).toBe(1);
    expect(validationErrors[0].result).toBe(VALIDATION_RESULT.FATAL);
  });

  it('returns no error if theme.json file exists and has all required fields', async () => {
    fs.readFileSync.mockReturnValue(
      '{ "label": "yay", "screenshot_path": "./relative/path" }'
    );
    path.relative.mockReturnValue('theme.json');
    fs.existsSync.mockReturnValue(true);

    const validationErrors = ThemeValidator.validate('dirName', ['theme.json']);
    expect(validationErrors.length).toBe(0);
  });
});