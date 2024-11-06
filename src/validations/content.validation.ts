import Joi from 'joi';
import { ContentContainerTypes } from '../constants/AzureStorage.constants.js';

export const createContent = {
  query: Joi.object().keys({
    type: Joi.string().valid('file', 'link').required(),
    objectType: Joi.when('type', {
      // Changed from 'query.type' to 'type'
      is: 'file',
      then: Joi.string()
        .required()
        .valid(...Object.keys(ContentContainerTypes)),
      otherwise: Joi.forbidden()
    }),
    url: Joi.when('type', {
      // Changed from 'query.type' to 'type'
      is: 'link',
      then: Joi.string().uri().required(),
      otherwise: Joi.forbidden()
    })
  }),
  file: Joi.when('query.type', {
    is: 'file',
    then: Joi.object({
      fieldname: Joi.string().required(),
      originalname: Joi.string().required(),
      encoding: Joi.string().required(),
      mimetype: Joi.string().required(),
      size: Joi.number().required(),
      buffer: Joi.binary().required()
    }).required(),
    otherwise: Joi.forbidden()
  })
};

export const findContent = {
  params: Joi.object().keys({
    contentId: Joi.string().guid().required()
  }),
  query: Joi.object().keys({
    includeBinaryObject: Joi.boolean()
  })
};
