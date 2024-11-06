import Joi, { CustomHelpers } from 'joi';
import { FilterField, QueryField, ValidFieldType } from '../utils/helpers/parseFindAllQuery.js';

interface SemesterQueryParams {
  semesterId?: string;
  year?: number;
  month?: number;
  org?: string;
}

export const password: Joi.CustomValidator<string> = (value, helpers) => {
  if (value.length < 8) {
    return helpers.error('password must be at least 8 characters');
  }
  if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
    return helpers.error('password must contain at least 1 letter and 1 number');
  }
  // upper case lower case and special character atleaset one
  if (
    value.length < 8 ||
    !value.match(/[a-z]/) ||
    !value.match(/[A-Z]/) ||
    !value.match(/\d/) ||
    !value.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
  ) {
    return helpers.error(
      'Passwords should be a minimum of eight characters in length. Longer passwords are more secure and should contain upper and lower case characters, numbers, and special characters.'
    );
  }
  return value;
};

export const validateYearAndMonth = (
  value: SemesterQueryParams,
  helpers: CustomHelpers<SemesterQueryParams>
): SemesterQueryParams | Joi.ErrorReport => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const { year, month } = value;

  if (year && month) {
    if (year === currentYear) {
      // Allow only the current month and following months
      if (month < currentMonth) {
        return helpers.error(`Month must be ${currentMonth} or later for the current year`);
      }
    } else if (year > currentYear) {
      // If the year is in the future, any month from 1 to 12 is valid
      if (month < 1 || month > 12) {
        return helpers.error('Month must be between 1 and 12 for future years');
      }
    }
  }

  return value;
};

function getJoiTypeForFieldType<T extends ValidFieldType>(config: QueryField<T>) {
  let schema = Joi.string();

  switch (config.type) {
    case 'string':
      break;
    case 'number':
      schema = schema.custom((value, helpers) => {
        if (isNaN(Number(value))) {
          return helpers.error('any.invalid');
        }
        return value;
      }, 'parsable number validation');
      break;
    case 'boolean':
      schema = schema.lowercase().valid('true', 'false');
      break;
    case 'uuid':
      schema = schema.uuid();
      break;
    case 'date':
      schema = schema.custom((value, helpers) => {
        if (isNaN(Date.parse(value))) {
          return helpers.error('any.invalid');
        }
        return value;
      }, 'valid date validation');
      break;
    case 'dateRange':
      schema = Joi.string().custom((value, helpers) => {
        try {
          const dateArray = JSON.parse(value);

          if (!Array.isArray(dateArray) || dateArray.length !== 2) {
            return helpers.error(
              'Date range must be a stringified array containing exactly two dates'
            );
          }

          const [startDate, endDate] = dateArray.map((d) => new Date(d));

          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return helpers.error('Invalid date format in range');
          }

          if (startDate > endDate) {
            return helpers.error('Start date must be before or equal to end date');
          }

          return value;
        } catch (error) {
          return helpers.error('Invalid JSON format for date range');
        }
      }, 'valid date range validation');
      break;
  }

  if (config.validValues && config.validValues.length > 0) {
    schema = schema.valid(...config.validValues);
  }

  return schema;
}

export function genericFilterDefinitionWithTypeChecks(fieldConfigs: FilterField<ValidFieldType>[]) {
  const validFields = fieldConfigs.map((config) => config.field);

  return Joi.object().keys({
    searchKey: Joi.alternatives()
      .conditional('field', {
        switch: fieldConfigs.map((config) => ({
          is: config.field,
          then: getJoiTypeForFieldType(config)
        }))
      })
      .required(),
    field: Joi.string()
      .valid(...validFields)
      .required(),
    searchType: Joi.alternatives()
      .conditional('field', {
        switch: fieldConfigs.map((config) => ({
          is: config.field,
          then: config.searchTypes ? Joi.string().valid(...config.searchTypes) : Joi.string()
        }))
      })
      .required()
  });
}

export function genericFilterDefinition(validColumns: string[]) {
  return Joi.object().keys({
    searchKey: Joi.string().required(),
    field: Joi.string()
      .valid(...validColumns)
      .required(),
    searchType: Joi.string().valid('CONTAINS', 'STARTS_WITH', 'EXACT_MATCH').required()
  });
}

export function genericSortDefinition(validColumns: string[]) {
  return Joi.object().keys({
    field: Joi.string()
      .valid(...validColumns)
      .required(),
    order: Joi.string().valid('ASC', 'DESC').required()
  });
}
